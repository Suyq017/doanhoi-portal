import * as XLSX from 'xlsx';
import { WorkBook } from 'xlsx';

/**
 * Interface for class import data
 */
export interface ClassImportData {
    name: string;              // Tên lớp (required)
    year?: number;             // Năm học (optional)
    departmentCode?: string;   // Mã khoa (optional)
}

/**
 * Service for parsing Excel files containing class import data
 */
export class ClassExcelParserService {
    private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    /**
     * Parse an Excel file and extract class import data
     * @param file - The Excel file to parse
     * @param onProgress - Optional callback for progress updates
     * @returns Array of class import data
     */
    async parseClassImportFile(
        file: File,
        onProgress?: (progress: number) => void
    ): Promise<ClassImportData[]> {
        // Validate file before processing
        this.validateFileType(file);
        this.validateFileSize(file);

        // Read and parse the Excel file
        const workbook = await this.readExcelFile(file);
        const rawData = this.parseExcelToJson(workbook);

        // Process data in chunks with progress updates
        return this.processInChunks(rawData, onProgress);
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
     * Process Excel data in chunks with progress reporting
     */
    private processInChunks(
        rawData: any[],
        onProgress?: (progress: number) => void
    ): ClassImportData[] {
        const result: ClassImportData[] = [];
        const totalRows = rawData.length - 1; // Exclude header row

        // Skip header row (index 0)
        for (let i = 1; i < rawData.length; i++) {
            const row = rawData[i];

            // Skip empty rows
            if (this.isEmptyRow(row)) {
                continue;
            }

            // Map row to class data
            const mappedData = this.mapRowToClassData(row, i + 1);
            if (mappedData) {
                result.push(mappedData);
            }

            // Report progress every 100 rows
            if (onProgress && i % 100 === 0) {
                const progress = (i / totalRows) * 100;
                onProgress(progress);
            }
        }

        // Final progress report
        if (onProgress) {
            onProgress(100);
        }

        return result;
    }

    /**
     * Map Excel row to ClassImportData
     * Template structure: Tên lớp | Năm | Mã khoa
     */
    private mapRowToClassData(row: any[], rowNumber: number): ClassImportData | null {
        try {
            return {
                name: this.normalizeName(row[0]),
                year: this.normalizeYear(row[1]),
                departmentCode: this.normalizeDepartmentCode(row[2])
            };
        } catch (error) {
            console.warn(`Skipping row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return null;
        }
    }

    /**
     * Normalize class name
     */
    private normalizeName(name: any): string {
        if (name === null || name === undefined || name === '') {
            return '';
        }
        return String(name).trim();
    }

    /**
     * Normalize year
     */
    private normalizeYear(year: any): number | undefined {
        if (year === null || year === undefined || year === '' || year === '*') {
            return undefined;
        }

        const yearNum = parseInt(String(year), 10);
        if (isNaN(yearNum)) {
            return undefined;
        }

        return yearNum;
    }

    /**
     * Normalize department code
     */
    private normalizeDepartmentCode(code: any): string | undefined {
        if (code === null || code === undefined || code === '' || code === '*') {
            return undefined;
        }
        return String(code).trim().toUpperCase();
    }

    /**
     * Check if a row is empty
     */
    private isEmptyRow(row: any[]): boolean {
        if (!row || row.length === 0) {
            return true;
        }

        return row.every(cell => {
            if (cell === null || cell === undefined || cell === '') {
                return true;
            }
            return String(cell).trim() === '';
        });
    }
}
