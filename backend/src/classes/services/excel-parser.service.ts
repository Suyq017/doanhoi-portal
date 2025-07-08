import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

export interface ClassImportData {
  name: string;
  code?: string;
  year?: number;
  departmentCode?: string;
  isActive?: boolean;
  _rowIndex?: number;
}

@Injectable()
export class ExcelParserService {
  private readonly expectedHeaders = ['tên lớp', 'mã lớp', 'năm học', 'mã đơn vị'];
  private readonly requiredHeaders = ['tên lớp'];

  async parseExcelFile(buffer: Buffer): Promise<ClassImportData[]> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      
      if (!sheetName) {
        throw new BadRequestException('Excel file must contain at least one sheet');
      }

      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (jsonData.length === 0) {
        throw new BadRequestException('Excel file is empty');
      }

      const headers = jsonData[0] as string[];
      this.validateHeaders(headers);

      const dataRows = jsonData.slice(1);
      return dataRows.map((row: any, index) => this.mapRowData(row as any[], headers, index));
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to parse Excel file: ' + error.message);
    }
  }

  validateHeaders(headers: string[]): boolean {
    const normalizedHeaders = headers.map(h => h?.toString().toLowerCase().trim());
    
    // Check required headers
    for (const required of this.requiredHeaders) {
      if (!normalizedHeaders.includes(required.toLowerCase())) {
        throw new BadRequestException(`Missing required column: ${required}`);
      }
    }

    return true;
  }

  private mapRowData(row: any[], headers: string[], rowIndex: number): ClassImportData {
    const data: Partial<ClassImportData> = {
      _rowIndex: rowIndex,
      name: '', // Default value
      isActive: true // Mặc định là active vì không có cột này trong template
    };

    headers.forEach((header, index) => {
      const normalizedHeader = header?.toString().toLowerCase().trim();
      const cellValue = row[index];

      switch (normalizedHeader) {
        case 'tên lớp':
          data.name = cellValue?.toString().trim() || '';
          break;
        case 'mã lớp':
          data.code = cellValue?.toString().trim() || undefined;
          break;
        case 'năm học':
          data.year = this.parseYear(cellValue);
          break;
        case 'mã đơn vị':
          data.departmentCode = cellValue?.toString().trim() || undefined;
          break;
        case 'isactive':
          data.isActive = this.parseBoolean(cellValue);
          break;
      }
    });

    return data as ClassImportData;
  }

  private parseYear(value: any): number | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    
    const yearValue = parseInt(value.toString());
    if (isNaN(yearValue) || yearValue < 2000 || yearValue > 2100) {
      return undefined;
    }
    
    return yearValue;
  }

  private parseBoolean(value: any): boolean {
    if (value === undefined || value === null || value === '') {
      return true; // Default to active
    }
    
    const strValue = value.toString().toLowerCase().trim();
    return strValue === 'true' || strValue === '1' || strValue === 'yes' || strValue === 'active';
  }

  async generateTemplate(): Promise<Buffer> {
    const templateData = [
      ['Tên lớp', 'Mã lớp', 'Năm học', 'Mã đơn vị'],
      ['Tin học A', 'TH-A', '2024', 'CNTT'],
      ['Toán học B', 'TOAN-B', '2024', 'TOAN'],
      ['Vật lý C', 'VL-C', '2023', 'VL']
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    
    // Set column widths
    worksheet['!cols'] = [
      { width: 25 }, // Tên lớp
      { width: 15 }, // Mã lớp
      { width: 10 }, // Năm học
      { width: 20 }  // Mã đơn vị
    ];

    // Set header style (bold)
    for (let i = 0; i < templateData[0].length; i++) {
      const cellRef = XLSX.utils.encode_cell({ c: i, r: 0 });
      if (worksheet[cellRef]) {
        worksheet[cellRef].s = { font: { bold: true } };
      }
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Classes');

    return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
  }
}
