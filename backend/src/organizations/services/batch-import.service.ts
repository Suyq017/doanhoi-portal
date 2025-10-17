import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner, In } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Organization } from '../../entities/organization.entity';
import { UserOrganization, UserOrgRole } from '../../entities/user-organization.entity';
import { OrganizationsService } from '../organizations.service';
import { MetricsService } from '../../metrics/metrics.service';

export interface OrganizationImportData {
    studentCode: string;
    classOrUnitCode?: string;
}

export interface BatchInfo {
    batchNumber: number;
    totalBatches: number;
    sessionId: string;
}

export interface ImportOptions {
    level: 2 | 3;
    organizationId?: string;
    skipDuplicates?: boolean;
    validateBusinessRules?: boolean;
}

export interface BatchResult {
    processed: number;
    successful: number;
    failed: number;
    errors: string[];
}

export interface SessionData {
    sessionId: string;
    totalProcessed: number;
    totalSuccessful: number;
    totalFailed: number;
    errors: string[];
    isComplete: boolean;
    startedAt: Date;
    completedAt?: Date;
}

export interface BatchImportResult {
    success: boolean;
    batchResult: BatchResult;
    sessionSummary: SessionData;
}

@Injectable()
export class OrganizationBatchImportService {
    private readonly logger = new Logger(OrganizationBatchImportService.name);
    private readonly sessionCache = new Map<string, SessionData>();
    private readonly SUB_BATCH_SIZE = 100; // Process in smaller chunks within transaction
    private readonly SESSION_TIMEOUT = 120 * 60 * 1000; // 120 minutes

    constructor(
        @InjectRepository(User)
        private readonly usersRepository: Repository<User>,
        @InjectRepository(Organization)
        private readonly organizationsRepository: Repository<Organization>,
        @InjectRepository(UserOrganization)
        private readonly userOrganizationsRepository: Repository<UserOrganization>,
        private readonly organizationsService: OrganizationsService,
        private readonly dataSource: DataSource,
        private readonly metricsService: MetricsService,
    ) {
        // Clean up expired sessions periodically
        setInterval(() => this.cleanupExpiredSessions(), 10 * 60 * 1000); // Every 10 minutes
    }

    /**
     * Process a batch of organization member imports
     */
    async processBatch(
        members: OrganizationImportData[],
        batchInfo: BatchInfo,
        options: ImportOptions
    ): Promise<BatchImportResult> {
        // Validate options
        this.validateOptions(options);

        // Initialize session if this is the first batch
        if (batchInfo.batchNumber === 1) {
            this.initializeSession(batchInfo.sessionId);

            // Start metrics tracking
            this.metricsService.startImportSession('organization');
            this.metricsService.setOrgImportBatchSize(this.SUB_BATCH_SIZE);
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Process batch in sub-batches to avoid timeout
            const batchResult: BatchResult = {
                processed: 0,
                successful: 0,
                failed: 0,
                errors: []
            };

            // Process members in smaller sub-batches within the transaction
            for (let i = 0; i < members.length; i += this.SUB_BATCH_SIZE) {
                const subBatch = members.slice(i, i + this.SUB_BATCH_SIZE);
                const subBatchResult = await this.processSubBatch(
                    subBatch,
                    queryRunner,
                    options,
                    batchResult.processed + i + 1 // Starting row number
                );

                batchResult.processed += subBatchResult.processed;
                batchResult.successful += subBatchResult.successful;
                batchResult.failed += subBatchResult.failed;
                batchResult.errors.push(...subBatchResult.errors);
            }

            await queryRunner.commitTransaction();
            this.logger.log(`Batch ${batchInfo.batchNumber}/${batchInfo.totalBatches} committed successfully`);

            // Update session progress
            await this.updateSessionProgress(batchInfo.sessionId, batchResult, batchInfo);

            // Get session summary
            const sessionSummary = this.getSessionSummary(batchInfo.sessionId);

            // Determine success
            const success = batchResult.successful > 0;

            // Check if this is the final batch
            if (batchInfo.batchNumber === batchInfo.totalBatches) {
                // End metrics tracking
                this.metricsService.endImportSession('organization');

                // Record final metrics
                const duration = (Date.now() - sessionSummary.startedAt.getTime()) / 1000;
                this.metricsService.recordImportSession(
                    'organization',
                    sessionSummary.totalSuccessful,
                    sessionSummary.totalFailed,
                    duration
                );
            }

            return {
                success,
                batchResult,
                sessionSummary
            };

        } catch (error) {
            await queryRunner.rollbackTransaction();
            this.logger.error(`Batch ${batchInfo.batchNumber}/${batchInfo.totalBatches} failed:`, error);

            // Update session with error
            const sessionData = this.sessionCache.get(batchInfo.sessionId);
            if (sessionData) {
                sessionData.errors.push(`Batch ${batchInfo.batchNumber} error: ${error.message}`);
                this.sessionCache.set(batchInfo.sessionId, sessionData);
            }

            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Validate import options
     */
    private validateOptions(options: ImportOptions): void {
        if (![2, 3].includes(options.level)) {
            throw new BadRequestException('Level phải là 2 hoặc 3');
        }

        if (options.level === 3 && !options.organizationId) {
            throw new BadRequestException('organizationId là bắt buộc cho Level 3');
        }
    }

    /**
     * Reset transaction after bulk operation failure
     */
    private async resetTransactionSafely(queryRunner: QueryRunner): Promise<void> {
        try {
            if (queryRunner.isTransactionActive) {
                await queryRunner.rollbackTransaction();
                this.logger.warn('Transaction rolled back due to bulk operation failure');
            }
        } catch (rollbackError) {
            this.logger.warn(`Transaction rollback warning (ignored): ${rollbackError.message}`);
        }

        // Start fresh transaction
        await queryRunner.startTransaction();
        this.logger.log('Fresh transaction started for individual processing');
    }

    /**
     * Process a sub-batch of members within a transaction using bulk insert
     */
    private async processSubBatch(
        members: OrganizationImportData[],
        queryRunner: QueryRunner,
        options: ImportOptions,
        startRowNumber: number
    ): Promise<BatchResult> {
        const result: BatchResult = {
            processed: 0,
            successful: 0,
            failed: 0,
            errors: []
        };

        const validMembers: Array<{
            memberData: OrganizationImportData;
            originalIndex: number;
            rowNumber: number;
        }> = [];

        // Step 1: Filter valid members (basic validation + duplicate check within batch)
        const seenCodes = new Set<string>();

        for (let i = 0; i < members.length; i++) {
            const member = members[i];
            const rowNumber = startRowNumber + i;
            let hasErrors = false;

            // Basic validation
            if (!member.studentCode || !member.studentCode.trim()) {
                result.failed++;
                const errorMessage = `Row ${rowNumber}: Missing student code`;
                result.errors.push(errorMessage);
                this.logger.warn(errorMessage);
                hasErrors = true;
            }

            if (options.level === 2 && (!member.classOrUnitCode || !member.classOrUnitCode.trim())) {
                result.failed++;
                const errorMessage = `Row ${rowNumber}: Missing class/unit code for Level 2`;
                result.errors.push(errorMessage);
                this.logger.warn(errorMessage);
                hasErrors = true;
            }

            // Check for duplicates within current batch
            if (member.studentCode && seenCodes.has(member.studentCode)) {
                result.failed++;
                const errorMessage = `Row ${rowNumber}: Duplicate student code in batch: ${member.studentCode}`;
                result.errors.push(errorMessage);
                this.logger.warn(errorMessage);
                hasErrors = true;
            } else if (member.studentCode) {
                seenCodes.add(member.studentCode);
            }

            if (!hasErrors) {
                validMembers.push({
                    memberData: member,
                    originalIndex: i,
                    rowNumber
                });
            }

            result.processed++;
        }

        // Step 2: Bulk operations
        if (validMembers.length > 0) {
            this.logger.log(`🔍 Processing sub-batch: ${validMembers.length} members`);

            try {
                // Bulk lookup users
                const studentCodes = validMembers.map(v => v.memberData.studentCode.trim());
                const users = await queryRunner.manager.find(User, {
                    where: { code: In(studentCodes) },
                    select: ['id', 'code']
                });

                const userMap = new Map(users.map(u => [u.code, u]));
                this.logger.log(`   👥 Found ${users.length}/${studentCodes.length} users in database`);

                // Determine target organizations for each member
                const memberTargets: Array<{
                    userId: string;
                    organizationId: string;
                    rowNumber: number;
                    memberData: OrganizationImportData;
                }> = [];

                if (options.level === 2) {
                    // Bulk lookup organizations by codes
                    const orgCodes = [...new Set(validMembers.map(v => v.memberData.classOrUnitCode?.trim()).filter(Boolean))];
                    const organizations = await queryRunner.manager.find(Organization, {
                        where: { code: In(orgCodes) },
                        select: ['id', 'code']
                    });

                    const orgMap = new Map(organizations.map(o => [o.code, o]));
                    this.logger.log(`   🏢 Found ${organizations.length}/${orgCodes.length} organizations`);

                    for (const v of validMembers) {
                        const user = userMap.get(v.memberData.studentCode.trim());
                        const org = orgMap.get(v.memberData.classOrUnitCode?.trim() || '');

                        if (!user) {
                            result.failed++;
                            result.errors.push(`Row ${v.rowNumber}: User ${v.memberData.studentCode} not found`);
                            continue;
                        }

                        if (!org) {
                            result.failed++;
                            result.errors.push(`Row ${v.rowNumber}: Organization ${v.memberData.classOrUnitCode} not found`);
                            continue;
                        }

                        memberTargets.push({
                            userId: user.id,
                            organizationId: org.id,
                            rowNumber: v.rowNumber,
                            memberData: v.memberData
                        });
                    }
                } else {
                    // Level 3: Use provided organizationId
                    const targetOrgId = options.organizationId!;

                    for (const v of validMembers) {
                        const user = userMap.get(v.memberData.studentCode.trim());

                        if (!user) {
                            result.failed++;
                            result.errors.push(`Row ${v.rowNumber}: User ${v.memberData.studentCode} not found`);
                            continue;
                        }

                        memberTargets.push({
                            userId: user.id,
                            organizationId: targetOrgId,
                            rowNumber: v.rowNumber,
                            memberData: v.memberData
                        });
                    }
                }

                // Bulk check existing memberships
                const userIds = memberTargets.map(m => m.userId);
                const orgIds = [...new Set(memberTargets.map(m => m.organizationId))];

                const existingMemberships = await queryRunner.manager.find(UserOrganization, {
                    where: orgIds.map(orgId => ({
                        userId: In(userIds),
                        organizationId: orgId
                    })),
                    select: ['userId', 'organizationId', 'isActive']
                });

                const existingMap = new Map(
                    existingMemberships.map(m => [`${m.userId}|${m.organizationId}`, m])
                );
                this.logger.log(`   ✓ ${existingMemberships.length} existing memberships found`);

                // Filter members to import
                const membersToImport: Array<{
                    userId: string;
                    organizationId: string;
                    rowNumber: number;
                    memberData: OrganizationImportData;
                    reactivate: boolean;
                    existingId?: string;
                }> = memberTargets
                    .map(m => {
                        const key = `${m.userId}|${m.organizationId}`;
                        const existing = existingMap.get(key);

                        if (existing) {
                            if (existing.isActive) {
                                if (options.skipDuplicates) {
                                    this.logger.log(`   ⊘ Skipping existing member: ${m.memberData.studentCode}`);
                                    return null;
                                } else {
                                    result.failed++;
                                    result.errors.push(`Row ${m.rowNumber}: User ${m.memberData.studentCode} is already a member`);
                                    return null;
                                }
                            } else {
                                // Will reactivate
                                return {
                                    ...m,
                                    reactivate: true,
                                    existingId: existing.id
                                };
                            }
                        }

                        return {
                            ...m,
                            reactivate: false
                        };
                    })
                    .filter((m): m is NonNullable<typeof m> => m !== null);

                this.logger.log(`   📝 Importing ${membersToImport.length} new/reactivated members`);

                // Bulk insert/update members
                if (membersToImport.length > 0) {
                    const newMemberships = membersToImport
                        .filter(m => !m.reactivate)
                        .map(m => queryRunner.manager.create(UserOrganization, {
                            userId: m.userId,
                            organizationId: m.organizationId,
                            role: UserOrgRole.MEMBER,
                            isActive: true,
                            joinedAt: new Date()
                        }));

                    if (newMemberships.length > 0) {
                        await queryRunner.manager.insert(UserOrganization, newMemberships);
                        this.logger.log(`   ✅ Bulk inserted ${newMemberships.length} members`);
                    }

                    // Reactivate inactive memberships
                    const reactivateMembers = membersToImport.filter(m => m.reactivate && m.existingId);
                    for (const m of reactivateMembers) {
                        if (m.existingId) {
                            await queryRunner.manager.update(UserOrganization, m.existingId, {
                                isActive: true,
                                joinedAt: new Date()
                            });
                        }
                    }
                    if (reactivateMembers.length > 0) {
                        this.logger.log(`   🔄 Reactivated ${reactivateMembers.length} memberships`);
                    }

                    result.successful += membersToImport.length;
                }

            } catch (bulkError) {
                // Handle bulk errors with fallback to individual processing
                this.logger.warn(`Bulk insert failed, falling back to individual processing: ${bulkError.message}`);

                // Reset transaction
                await this.resetTransactionSafely(queryRunner);

                // Process each member individually
                for (const { memberData, rowNumber } of validMembers) {
                    try {
                        await this.processMember(memberData, options, queryRunner);
                        result.successful++;
                    } catch (individualError) {
                        result.failed++;
                        result.errors.push(`Row ${rowNumber}: ${individualError.message}`);
                        this.logger.warn(`Row ${rowNumber}: ${individualError.message}`);
                    }
                }
            }
        }

        return result;
    }

    /**
     * Initialize a new import session
     */
    private initializeSession(sessionId: string): void {
        this.sessionCache.set(sessionId, {
            sessionId,
            totalProcessed: 0,
            totalSuccessful: 0,
            totalFailed: 0,
            errors: [],
            isComplete: false,
            startedAt: new Date()
        });
    }

    /**
     * Process a single member import (used for fallback)
     */
    private async processMember(
        memberData: OrganizationImportData,
        options: ImportOptions,
        queryRunner: QueryRunner
    ): Promise<void> {
        // Validate business rules if enabled
        if (options.validateBusinessRules) {
            this.validateMemberData(memberData, options);
        }

        // Find user by student code
        const user = await queryRunner.manager.findOne(User, {
            where: { code: memberData.studentCode }
        });

        if (!user) {
            throw new Error('Không tìm thấy sinh viên với mã số này');
        }

        // Determine target organization based on level
        let targetOrganizationId: string;

        if (options.level === 2) {
            // Level 2: Find organization by classOrUnitCode
            if (!memberData.classOrUnitCode) {
                throw new Error('Mã lớp/đơn vị là bắt buộc cho Level 2');
            }

            const organization = await queryRunner.manager.findOne(Organization, {
                where: { code: memberData.classOrUnitCode }
            });

            if (!organization) {
                throw new Error(`Không tìm thấy tổ chức với mã: ${memberData.classOrUnitCode}`);
            }

            targetOrganizationId = organization.id;
        } else {
            // Level 3: Use provided organizationId
            targetOrganizationId = options.organizationId!;

            // Verify organization exists
            const organization = await queryRunner.manager.findOne(Organization, {
                where: { id: targetOrganizationId }
            });

            if (!organization) {
                throw new Error('Tổ chức không tồn tại');
            }
        }

        // Check for existing membership
        const existingMembership = await queryRunner.manager.findOne(UserOrganization, {
            where: {
                userId: user.id,
                organizationId: targetOrganizationId
            }
        });

        if (existingMembership) {
            if (existingMembership.isActive) {
                if (options.skipDuplicates) {
                    // Skip silently
                    return;
                } else {
                    throw new Error('Sinh viên đã là thành viên của tổ chức');
                }
            } else {
                // Reactivate inactive membership
                existingMembership.isActive = true;
                existingMembership.joinedAt = new Date();
                await queryRunner.manager.save(UserOrganization, existingMembership);
                return;
            }
        }

        // Create new membership
        const newMembership = queryRunner.manager.create(UserOrganization, {
            userId: user.id,
            organizationId: targetOrganizationId,
            role: UserOrgRole.MEMBER,
            isActive: true,
            joinedAt: new Date()
        });

        await queryRunner.manager.save(UserOrganization, newMembership);
    }

    /**
     * Validate member data according to business rules
     */
    private validateMemberData(
        memberData: OrganizationImportData,
        options: ImportOptions
    ): void {
        if (!memberData.studentCode || !memberData.studentCode.trim()) {
            throw new Error('Mã số sinh viên không được để trống');
        }

        if (options.level === 2 && (!memberData.classOrUnitCode || !memberData.classOrUnitCode.trim())) {
            throw new Error('Mã lớp/đơn vị không được để trống cho Level 2');
        }

        // Additional validation rules can be added here
        if (memberData.studentCode.length < 3 || memberData.studentCode.length > 20) {
            throw new Error('Mã số sinh viên phải có độ dài từ 3-20 ký tự');
        }
    }

    /**
     * Update session progress with batch results
     */
    private async updateSessionProgress(
        sessionId: string,
        batchResult: BatchResult,
        batchInfo: BatchInfo
    ): Promise<void> {
        const sessionData = this.sessionCache.get(sessionId);

        if (!sessionData) {
            throw new NotFoundException('Session không tồn tại');
        }

        // Update session statistics
        sessionData.totalProcessed += batchResult.processed;
        sessionData.totalSuccessful += batchResult.successful;
        sessionData.totalFailed += batchResult.failed;

        // Add new errors (limit to prevent memory issues)
        if (batchResult.errors.length > 0) {
            sessionData.errors.push(...batchResult.errors.slice(0, 100)); // Keep max 100 errors
        }

        // Mark as complete if this is the last batch
        if (batchInfo.batchNumber === batchInfo.totalBatches) {
            sessionData.isComplete = true;
            sessionData.completedAt = new Date();
        }

        this.sessionCache.set(sessionId, sessionData);
    }

    /**
     * Get session summary
     */
    getSessionSummary(sessionId: string): SessionData {
        const sessionData = this.sessionCache.get(sessionId);

        if (!sessionData) {
            throw new NotFoundException('Session không tồn tại');
        }

        return sessionData;
    }

    /**
     * Clear old sessions (cleanup)
     */
    clearOldSessions(olderThanHours: number = 24): number {
        const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
        let cleared = 0;

        for (const [sessionId, sessionData] of this.sessionCache.entries()) {
            if (sessionData.startedAt < cutoffTime) {
                this.sessionCache.delete(sessionId);
                cleared++;
            }
        }

        return cleared;
    }

    /**
     * Clean up expired sessions (called periodically)
     */
    private cleanupExpiredSessions(): void {
        const now = Date.now();
        let cleared = 0;

        for (const [sessionId, session] of this.sessionCache.entries()) {
            if (now - session.startedAt.getTime() > this.SESSION_TIMEOUT) {
                this.sessionCache.delete(sessionId);
                cleared++;
            }
        }

        if (cleared > 0) {
            this.logger.log(`Cleaned up ${cleared} expired sessions`);
        }
    }

    /**
     * Bulk add members (optimized for large batches)
     */
    async bulkAddMembers(
        memberships: Array<{
            userId: string;
            organizationId: string;
            role: UserOrgRole;
            isActive: boolean;
        }>
    ): Promise<void> {
        // Filter out duplicates
        const existingMemberships = await this.userOrganizationsRepository.find({
            where: memberships.map(m => ({
                userId: m.userId,
                organizationId: m.organizationId
            }))
        });

        const existingKeys = new Set(
            existingMemberships.map(m => `${m.userId}|${m.organizationId}`)
        );

        const newMemberships = memberships
            .filter(m => !existingKeys.has(`${m.userId}|${m.organizationId}`))
            .map(m => this.userOrganizationsRepository.create({
                userId: m.userId,
                organizationId: m.organizationId,
                role: m.role,
                isActive: m.isActive
            }));

        if (newMemberships.length > 0) {
            // Use bulk insert for better performance
            await this.userOrganizationsRepository
                .createQueryBuilder()
                .insert()
                .into(UserOrganization)
                .values(newMemberships)
                .execute();
        }
    }
}
