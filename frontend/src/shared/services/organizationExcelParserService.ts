import * as XLSX from 'xlsx';
import { WorkBook } from 'xlsx';
import { OrganizationImportData } from '../types/organization';

/**
 * Service for parsing Excel files containing organization member import data
 * Supports both Level 2 (with classOrUnitCode) and Level 3 (studentCode only) imports
 */
export class OrganizationExcelParserService {
    private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    /**
     * Parse an Excel file and extract organization import data
     * @param file - The Excel file to parse
     * @param level - Organization level (2 or 3)
     * @param onProgress - Optional callback for progress updates
     * @returns Array of organization import data
     */
    async parseOrganizationImportFile(
        file: File,
        level: 2 | 3,
        onProgress?: (progress: number) => void
    ): Promise<OrganizationImportData[]> {
        // Validate file before processing
        this.validateFileType(file);
        this.validateFileSize(file);

        // Read and parse the Excel file
        const workbook = await this.readExcelFile(file);
        const rawData = this.parseExcelToJson(workbook);

        // Process data in chunks with progress updates
        return this.processInChunks(rawData, level, onProgress);
    }

    /**
     * Validate that the file is an Excel file
     */
    private validateFileType(file: File): void {
        const allowedTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
        ];

        if (!allowedTypes.includes(file.type) &&
            !file.name.endsWith('.xlsx') &&
            !file.name.endsWith('.xls')) {
            throw new Error('Chỉ chấp nhận file Excel (.xlsx, .xls)');
        }
    }

    /**
     * Validate file size
     */
    private validateFileSize(file: File): void {
        if (file.size > this.MAX_FILE_SIZE) {
            throw new Error(`File quá lớn. Kích thước tối đa là ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`);
        }
    }

    /**
     * Read Excel file and return workbook
     */
    private async readExcelFile(file: File): Promise<WorkBook> {
        try {
            const buffer = await file.arrayBuffer();
            return XLSX.read(buffer, {
                type: 'array',
                cellDates: true,
                cellNF: false,
                cellText: false
            });
        } catch (error) {
            throw new Error(`Không thể đọc file Excel: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Parse Excel workbook to JSON array
     */
    private parseExcelToJson(workbook: WorkBook): any[] {
        if (!workbook.SheetNames.length) {
            throw new Error('File Excel không có sheet nào');
        }

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        if (!worksheet) {
            throw new Error('Không thể đọc sheet đầu tiên của file Excel');
        }

        // Parse to JSON with header row
        const data = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: '',
            blankrows: false
        });

        if (!data || data.length < 2) {
            throw new Error('File Excel không có dữ liệu hoặc chỉ có header');
        }

        return data as any[];
    }

    /**
     * Process raw data in chunks and map to OrganizationImportData
     */
    private processInChunks(
        rawData: any[],
        level: 2 | 3,
        onProgress?: (progress: number) => void
    ): OrganizationImportData[] {
        const result: OrganizationImportData[] = [];
        const totalRows = rawData.length - 1; // Exclude header

        // Skip header row (index 0)
        for (let i = 1; i < rawData.length; i++) {
            const row = rawData[i];

            // Skip empty rows
            if (this.isEmptyRow(row)) {
                continue;
            }

            // Map row to organization import data
            const mappedData = this.mapRowToOrganizationData(row, level, i + 1);
            if (mappedData) {
                result.push(mappedData);
            }

            // Report progress every 100 rows
            if (onProgress && i % 100 === 0) {
                const progress = Math.min((i / totalRows) * 100, 100);
                onProgress(progress);
            }
        }

        // Final progress update
        if (onProgress) {
            onProgress(100);
        }

        if (result.length === 0) {
            throw new Error('Không có dữ liệu hợp lệ trong file Excel');
        }

        return result;
    }

    /**
     * Map a single row to OrganizationImportData based on level
     */
    private mapRowToOrganizationData(
        row: any[],
        level: 2 | 3,
        rowNumber: number
    ): OrganizationImportData | null {
        try {
            if (level === 2) {
                // Level 2 requires both studentCode and classOrUnitCode
                const studentCode = this.normalizeStudentCode(row[0]);
                const classOrUnitCode = this.normalizeCode(row[1]);

                // Both fields must be present for Level 2
                if (!studentCode && !classOrUnitCode) {
                    return null; // Skip completely empty rows
                }

                return {
                    studentCode,
                    classOrUnitCode
                };
            } else {
                // Level 3 only requires studentCode
                const studentCode = this.normalizeStudentCode(row[0]);

                if (!studentCode) {
                    return null; // Skip empty rows
                }

                return {
                    studentCode
                };
            }
        } catch (error) {
            console.warn(`Warning: Could not parse row ${rowNumber}:`, error);
            return null;
        }
    }

    /**
     * Normalize student code (uppercase, trim)
     */
    private normalizeStudentCode(code: any): string {
        if (!code) return '';

        let normalized = String(code).trim();

        // Remove any whitespace
        normalized = normalized.replace(/\s+/g, '');

        // Convert to uppercase
        normalized = normalized.toUpperCase();

        return normalized;
    }

    /**
     * Normalize general code (trim)
     */
    private normalizeCode(code: any): string {
        if (!code) return '';

        let normalized = String(code).trim();

        // Remove extra whitespace
        normalized = normalized.replace(/\s+/g, ' ');

        return normalized;
    }

    /**
     * Check if a row is empty
     */
    private isEmptyRow(row: any[]): boolean {
        if (!row || row.length === 0) return true;

        return row.every(cell => {
            if (cell === null || cell === undefined) return true;
            const cellStr = String(cell).trim();
            return cellStr === '' || cellStr === 'undefined' || cellStr === 'null';
        });
    }

    /**
     * Get expected column headers based on level
     */
    getExpectedHeaders(level: 2 | 3): string[] {
        if (level === 2) {
            return ['Mã số sinh viên', 'Mã lớp/đơn vị'];
        } else {
            return ['Mã số sinh viên'];
        }
    }

    /**
     * Validate Excel headers
     */
    validateHeaders(workbook: WorkBook, level: 2 | 3): boolean {
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!data || data.length === 0) return false;

        const headers = data[0] as string[];

        // Check if we have at least the required columns
        if (level === 2) {
            return headers.length >= 2;
        } else {
            return headers.length >= 1;
        }
    }
}

// Export singleton instance
export const organizationExcelParserService = new OrganizationExcelParserService();
