import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { ValidationError, ImportBatch } from '../../types/userImport';

export interface ExportOptions {
  filename?: string;
  sheetName?: string;
  includeHeaders?: boolean;
}

export interface TemplateColumn {
  field: string;
  header: string;
  example?: string;
  required?: boolean;
  description?: string;
}

export class ExcelExportService {
  
  /**
   * Simplified template columns - only required fields + common optional fields
   */
  private static readonly USER_TEMPLATE_COLUMNS: TemplateColumn[] = [
    { field: 'code', header: 'Mã số SV/CB*', example: 'SV2021001', required: true, description: 'Mã số sinh viên hoặc cán bộ (bắt buộc)' },
    { field: 'familyName', header: 'Họ và tên lót*', example: 'Nguyễn Văn', required: true, description: 'Họ và tên đệm (bắt buộc)' },
    { field: 'givenName', header: 'Tên*', example: 'An', required: true, description: 'Tên (bắt buộc)' },
    { field: 'email', header: 'Email', example: 'nguyenvanan@example.com', required: false, description: 'Địa chỉ email' },
    { field: 'phone', header: 'Số điện thoại', example: '0123456789', required: false, description: 'Số điện thoại' },
    { field: 'className', header: 'Lớp', example: 'KTPM2021', required: false, description: 'Tên lớp' },
    { field: 'userType', header: 'Loại người dùng', example: 'SINH_VIEN', required: false, description: 'SINH_VIEN hoặc CAN_BO' }
  ];

  /**
   * Create Excel template for user import
   */
  static createUserImportTemplate(options: ExportOptions = {}): void {
    const { 
      filename = 'Mau_import_nguoi_dung.xlsx', 
      sheetName = 'Danh sách người dùng',
      includeHeaders = true 
    } = options;

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Create main data sheet
    const headers = this.USER_TEMPLATE_COLUMNS.map(col => col.header);
    const examples = this.USER_TEMPLATE_COLUMNS.map(col => col.example || '');
    
    const wsData = includeHeaders ? [headers, examples] : [examples];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    const colWidths = this.USER_TEMPLATE_COLUMNS.map(col => ({ wch: Math.max(col.header.length, 20) }));
    ws['!cols'] = colWidths;

    // Add data sheet
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Export file
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(blob, filename);
  }



  /**
   * Export validation errors to Excel
   */
  static exportValidationErrors(
    errors: ValidationError[], 
    warnings: ValidationError[] = [],
    options: ExportOptions = {}
  ): void {
    const { 
      filename = 'Loi_validation.xlsx'
    } = options;

    const wb = XLSX.utils.book_new();

    // Export errors
    if (errors.length > 0) {
      const errorData = [
        ['Dòng', 'Trường', 'Giá trị', 'Lỗi', 'Loại'],
        ...errors.map(error => [
          error.row,
          error.field,
          error.value?.toString() || '',
          error.message,
          error.type
        ])
      ];
      
      const errorWs = XLSX.utils.aoa_to_sheet(errorData);
      errorWs['!cols'] = [
        { wch: 10 }, // Row
        { wch: 20 }, // Field
        { wch: 30 }, // Value
        { wch: 60 }, // Message
        { wch: 15 }  // Type
      ];
      
      XLSX.utils.book_append_sheet(wb, errorWs, 'Lỗi');
    }

    // Export warnings
    if (warnings.length > 0) {
      const warningData = [
        ['Dòng', 'Trường', 'Giá trị', 'Cảnh báo', 'Loại'],
        ...warnings.map(warning => [
          warning.row,
          warning.field,
          warning.value?.toString() || '',
          warning.message,
          warning.type
        ])
      ];
      
      const warningWs = XLSX.utils.aoa_to_sheet(warningData);
      warningWs['!cols'] = [
        { wch: 10 }, // Row
        { wch: 20 }, // Field
        { wch: 30 }, // Value
        { wch: 60 }, // Message
        { wch: 15 }  // Type
      ];
      
      XLSX.utils.book_append_sheet(wb, warningWs, 'Cảnh báo');
    }

    // Create summary sheet
    const summaryData = [
      ['BÁO CÁO VALIDATION', ''],
      ['', ''],
      ['Tổng số lỗi:', errors.length.toString()],
      ['Tổng số cảnh báo:', warnings.length.toString()],
      ['', ''],
      ['CHI TIẾT LỖI THEO LOẠI', ''],
      ...this.getErrorSummaryByType(errors),
      ['', ''],
      ['CHI TIẾT CẢNH BÁO THEO LOẠI', ''],
      ...this.getErrorSummaryByType(warnings)
    ];

    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    summaryWs['!cols'] = [{ wch: 30 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Tổng quan');

    // Export file
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(blob, filename);
  }

  private static getErrorSummaryByType(errors: ValidationError[]): string[][] {
    const summary = new Map<string, number>();
    
    errors.forEach(error => {
      const key = `${error.type} - ${error.field}`;
      summary.set(key, (summary.get(key) || 0) + 1);
    });

    return Array.from(summary.entries()).map(([key, count]) => [key, count.toString()]);
  }

  /**
   * Export successful import results
   */
  static exportImportResults(
    batches: ImportBatch[],
    options: ExportOptions = {}
  ): void {
    const { 
      filename = 'Ket_qua_import.xlsx'
    } = options;

    const wb = XLSX.utils.book_new();

    // Create summary sheet
    const totalRecords = batches.reduce((sum, batch) => sum + batch.data.length, 0);
    const successfulBatches = batches.filter(batch => batch.status === 'completed').length;
    
    const summaryData = [
      ['BÁO CÁO KẾT QUẢ IMPORT', ''],
      ['', ''],
      ['Thời gian import:', new Date().toLocaleString('vi-VN')],
      ['Tổng số batch:', batches.length.toString()],
      ['Batch thành công:', successfulBatches.toString()],
      ['Batch thất bại:', (batches.length - successfulBatches).toString()],
      ['Tổng số bản ghi:', totalRecords.toString()],
      ['', ''],
      ['CHI TIẾT THEO BATCH', '']
    ];

    // Add batch details
    batches.forEach((batch, index) => {
      summaryData.push([
        `Batch ${index + 1}:`,
        `${batch.data.length} bản ghi - ${batch.status}`
      ]);
    });

    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    summaryWs['!cols'] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Tổng quan');

    // Export successful data
    const successfulData = batches
      .filter(batch => batch.status === 'completed')
      .flatMap(batch => batch.data);

    if (successfulData.length > 0) {
      const headers = ['Mã số', 'Họ tên', 'Email', 'Điện thoại', 'Lớp', 'Loại người dùng'];
      const dataRows = successfulData.map(user => [
        user.code,
        `${user.familyName} ${user.givenName}`,
        user.email || '',
        user.phone || '',
        user.className || '',
        user.userType || ''
      ]);

      const dataWs = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
      dataWs['!cols'] = [
        { wch: 15 }, // Code
        { wch: 30 }, // Full name
        { wch: 30 }, // Email
        { wch: 15 }, // Phone
        { wch: 15 }, // Class
        { wch: 15 }  // Department
      ];
      
      XLSX.utils.book_append_sheet(wb, dataWs, 'Dữ liệu thành công');
    }

    // Export file
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(blob, filename);
  }

  /**
   * Export data to Excel format
   */
  static exportData<T extends Record<string, any>>(
    data: T[],
    columns: { key: keyof T; header: string; width?: number }[],
    options: ExportOptions = {}
  ): void {
    const { 
      filename = 'Du_lieu_xuat.xlsx', 
      sheetName = 'Dữ liệu',
      includeHeaders = true 
    } = options;

    const wb = XLSX.utils.book_new();

    // Prepare data
    const headers = columns.map(col => col.header);
    const dataRows = data.map(item => 
      columns.map(col => item[col.key]?.toString() || '')
    );

    const wsData = includeHeaders ? [headers, ...dataRows] : dataRows;
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    const colWidths = columns.map(col => ({ wch: col.width || 20 }));
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Export file
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(blob, filename);
  }
}