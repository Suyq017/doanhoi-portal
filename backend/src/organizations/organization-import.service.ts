import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import { Organization } from '../entities/organization.entity';
import { User } from '../entities/user.entity';
import { UserOrganization, UserRole } from '../entities/user-organization.entity';
import { ImportMemberDto, ImportMembersDto } from './dto/import-members.dto';

export interface ImportSession {
    sessionId: string;
    organizationId: string;
    data: ImportMemberDto[];
    validationResults: ImportValidationResult[];
    createdAt: Date;
}

export interface ImportValidationResult {
    rowIndex: number;
    data: ImportMemberDto;
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

export interface ImportExecutionResult {
    total: number;
    successful: number;
    failed: number;
    errors: Array<{
        rowIndex: number;
        data: ImportMemberDto;
        error: string;
    }>;
}

@Injectable()
export class OrganizationImportService {
    private importSessions = new Map<string, ImportSession>();

    constructor(
        @InjectRepository(Organization)
        private organizationsRepository: Repository<Organization>,
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        @InjectRepository(UserOrganization)
        private userOrganizationsRepository: Repository<UserOrganization>,
    ) { }

    async processUploadedFile(
        file: Express.Multer.File,
        organizationId: string,
        level: number
    ): Promise<{ sessionId: string; previewData: ImportMemberDto[] }> {
        // Validate file format
        if (!file.originalname.match(/\.(xlsx|xls)$/)) {
            throw new BadRequestException('Chỉ chấp nhận file Excel (.xlsx, .xls)');
        }

        // Validate organization exists
        const organization = await this.organizationsRepository.findOne({
            where: { id: organizationId }
        });
        if (!organization) {
            throw new NotFoundException('Không tìm thấy tổ chức');
        }

        try {
            // Parse Excel file with better options
            const workbook = XLSX.read(file.buffer, {
                type: 'buffer',
                cellText: false,
                cellDates: true
            });

            const sheetName = workbook.SheetNames[0];
            if (!sheetName) {
                throw new BadRequestException('File Excel không có sheet nào');
            }

            const worksheet = workbook.Sheets[sheetName];

            // Convert to JSON with specific options
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                header: 1,  // Use first row as header
                defval: '',  // Default value for empty cells
                raw: false   // Convert all values to strings
            });

            if (jsonData.length <= 1) {
                throw new BadRequestException('File Excel không có dữ liệu (chỉ có header hoặc rỗng)');
            }

            // Get headers from first row
            const headers = jsonData[0] as string[];
            const dataRows = jsonData.slice(1); // Skip header row

            // Map data based on level
            const importData: ImportMemberDto[] = [];
            for (let i = 0; i < dataRows.length; i++) {
                const row = dataRows[i] as any[];

                if (level === 2) {
                    // Level 2: cần mã sinh viên và mã lớp/đơn vị
                    let studentCodeIndex = headers.findIndex(h =>
                        h && (h.includes('sinh viên') || h.includes('Student') || h.includes('studentCode'))
                    );
                    let classCodeIndex = headers.findIndex(h =>
                        h && (h.includes('lớp') || h.includes('đơn vị') || h.includes('Class') || h.includes('classOrUnitCode'))
                    );

                    if (studentCodeIndex === -1) studentCodeIndex = 0; // Default to first column
                    if (classCodeIndex === -1) classCodeIndex = 1;   // Default to second column

                    const studentCode = row[studentCodeIndex];
                    const classOrUnitCode = row[classCodeIndex];

                    if (studentCode && String(studentCode).trim()) {
                        importData.push({
                            studentCode: String(studentCode).trim(),
                            classOrUnitCode: classOrUnitCode ? String(classOrUnitCode).trim() : undefined
                        });
                    }
                } else if (level === 3) {
                    // Level 3: chỉ cần mã sinh viên
                    let studentCodeIndex = headers.findIndex(h =>
                        h && (h.includes('sinh viên') || h.includes('Student') || h.includes('studentCode'))
                    );

                    if (studentCodeIndex === -1) studentCodeIndex = 0; // Default to first column

                    const studentCode = row[studentCodeIndex];

                    if (studentCode && String(studentCode).trim()) {
                        importData.push({
                            studentCode: String(studentCode).trim()
                        });
                    }
                }
            }

            if (importData.length === 0) {
                throw new BadRequestException('Không tìm thấy dữ liệu hợp lệ trong file');
            }

            // Create session
            const sessionId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const session: ImportSession = {
                sessionId,
                organizationId,
                data: importData,
                validationResults: [],
                createdAt: new Date()
            };

            this.importSessions.set(sessionId, session);

            // Return preview data (first 5 rows)
            const previewData = importData.slice(0, 5);

            return { sessionId, previewData };
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException(`Không thể xử lý file Excel: ${error.message}`);
        }
    }

    async validateImportData(sessionId: string): Promise<ImportValidationResult[]> {
        const session = this.importSessions.get(sessionId);
        if (!session) {
            throw new NotFoundException('Session không tồn tại hoặc đã hết hạn');
        }

        const validationResults: ImportValidationResult[] = [];

        for (let i = 0; i < session.data.length; i++) {
            const memberData = session.data[i];
            const result: ImportValidationResult = {
                rowIndex: i + 1,
                data: memberData,
                isValid: true,
                errors: [],
                warnings: []
            };

            // Validate student code
            if (!memberData.studentCode || memberData.studentCode.trim() === '') {
                result.errors.push('Mã số sinh viên không được để trống');
                result.isValid = false;
            } else {
                // Check if user exists
                const user = await this.usersRepository.findOne({
                    where: { code: memberData.studentCode }
                });
                if (!user) {
                    result.errors.push(`Không tìm thấy sinh viên với mã: ${memberData.studentCode}`);
                    result.isValid = false;
                } else {
                    // Check if user is already member
                    const existingMember = await this.userOrganizationsRepository.findOne({
                        where: {
                            userId: user.id,
                            organizationId: session.organizationId
                        }
                    });
                    if (existingMember) {
                        result.warnings.push(`Sinh viên ${memberData.studentCode} đã là thành viên của tổ chức`);
                    }
                }
            }

            validationResults.push(result);
        }

        // Update session with validation results
        session.validationResults = validationResults;
        this.importSessions.set(sessionId, session);

        return validationResults;
    }

    async executeImport(sessionId: string, skipErrors: boolean = false): Promise<ImportExecutionResult> {
        const session = this.importSessions.get(sessionId);
        if (!session) {
            throw new NotFoundException('Session không tồn tại hoặc đã hết hạn');
        }

        if (session.validationResults.length === 0) {
            throw new BadRequestException('Dữ liệu chưa được validate. Vui lòng validate trước khi import');
        }

        const result: ImportExecutionResult = {
            total: session.data.length,
            successful: 0,
            failed: 0,
            errors: []
        };

        const validRecords = skipErrors
            ? session.validationResults.filter(r => r.isValid)
            : session.validationResults;

        if (!skipErrors) {
            const invalidRecords = session.validationResults.filter(r => !r.isValid);
            if (invalidRecords.length > 0) {
                throw new BadRequestException(`Có ${invalidRecords.length} dòng dữ liệu không hợp lệ. Vui lòng sửa lỗi hoặc chọn "Bỏ qua lỗi"`);
            }
        }

        // Execute import for valid records
        for (const validationResult of validRecords) {
            try {
                const memberData = validationResult.data;

                // Find user
                const user = await this.usersRepository.findOne({
                    where: { code: memberData.studentCode }
                });

                if (!user) {
                    result.failed++;
                    result.errors.push({
                        rowIndex: validationResult.rowIndex,
                        data: memberData,
                        error: `Không tìm thấy sinh viên với mã: ${memberData.studentCode}`
                    });
                    continue;
                }

                // Check if already member
                const existingMember = await this.userOrganizationsRepository.findOne({
                    where: {
                        userId: user.id,
                        organizationId: session.organizationId
                    }
                });

                if (existingMember) {
                    // Skip if already member
                    result.successful++;
                    continue;
                }

                // Add member
                const userOrganization = this.userOrganizationsRepository.create({
                    userId: user.id,
                    organizationId: session.organizationId,
                    role: UserRole.MEMBER,
                    joinedAt: new Date()
                });

                await this.userOrganizationsRepository.save(userOrganization);
                result.successful++;

            } catch (error) {
                result.failed++;
                result.errors.push({
                    rowIndex: validationResult.rowIndex,
                    data: validationResult.data,
                    error: error.message || 'Lỗi không xác định'
                });
            }
        }

        // Clean up session
        this.importSessions.delete(sessionId);

        return result;
    }

    generateTemplate(level: number): Buffer {
        let templateData: string[][];
        if (level === 2) {
            // 2 cột: Mã số lớp, Mã số sinh viên
            templateData = [
                ['Mã số lớp', 'Mã số sinh viên'],
                ['KTPM01', '2052001'],
                ['KTPM02', '2052002'],
                ['CNTT01', '2052003']
            ];
        } else if (level === 3) {
            // 1 cột: Mã số sinh viên
            templateData = [
                ['Mã số sinh viên'],
                ['2052001'],
                ['2052002'],
                ['2052003']
            ];
        } else {
            throw new BadRequestException('Level phải là 2 hoặc 3');
        }

        const worksheet = XLSX.utils.aoa_to_sheet(templateData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
        return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
    }
    // Clean up expired sessions (call this periodically)
    cleanupExpiredSessions() {
        const now = new Date();
        const expiredTime = 30 * 60 * 1000; // 30 minutes

        for (const [sessionId, session] of this.importSessions.entries()) {
            if (now.getTime() - session.createdAt.getTime() > expiredTime) {
                this.importSessions.delete(sessionId);
            }
        }
    }
}
