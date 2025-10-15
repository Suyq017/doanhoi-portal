import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Organization } from '../../entities/organization.entity';
import { UserOrganization, UserOrgRole } from '../../entities/user-organization.entity';
import { OrganizationsService } from '../organizations.service';

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
    private readonly sessionCache = new Map<string, SessionData>();

    constructor(
        @InjectRepository(User)
        private readonly usersRepository: Repository<User>,
        @InjectRepository(Organization)
        private readonly organizationsRepository: Repository<Organization>,
        @InjectRepository(UserOrganization)
        private readonly userOrganizationsRepository: Repository<UserOrganization>,
        private readonly organizationsService: OrganizationsService,
    ) { }

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
        }

        let successful = 0;
        let failed = 0;
        const errors: string[] = [];

        // Process each member in the batch
        for (const memberData of members) {
            try {
                await this.processMember(memberData, options);
                successful++;
            } catch (error) {
                failed++;
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                errors.push(`${memberData.studentCode}: ${errorMessage}`);
            }
        }

        // Update session progress
        const batchResult: BatchResult = {
            processed: members.length,
            successful,
            failed,
            errors
        };

        await this.updateSessionProgress(batchInfo.sessionId, batchResult, batchInfo);

        // Get session summary
        const sessionSummary = this.getSessionSummary(batchInfo.sessionId);

        return {
            success: failed === 0,
            batchResult,
            sessionSummary
        };
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
     * Process a single member import
     */
    private async processMember(
        memberData: OrganizationImportData,
        options: ImportOptions
    ): Promise<void> {
        // Validate business rules if enabled
        if (options.validateBusinessRules) {
            this.validateMemberData(memberData, options);
        }

        // Find user by student code
        const user = await this.usersRepository.findOne({
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

            const organization = await this.organizationsRepository.findOne({
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
            const organization = await this.organizationsRepository.findOne({
                where: { id: targetOrganizationId }
            });

            if (!organization) {
                throw new Error('Tổ chức không tồn tại');
            }
        }

        // Check for existing membership
        const existingMembership = await this.userOrganizationsRepository.findOne({
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
                await this.userOrganizationsRepository.save(existingMembership);
                return;
            }
        }

        // Create new membership
        const newMembership = this.userOrganizationsRepository.create({
            userId: user.id,
            organizationId: targetOrganizationId,
            role: UserOrgRole.MEMBER,
            isActive: true
        });

        await this.userOrganizationsRepository.save(newMembership);
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
