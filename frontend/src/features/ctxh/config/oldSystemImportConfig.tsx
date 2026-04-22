import * as XLSX from 'xlsx';
import { ImportModalConfig, ClientValidationResult, ClientImportResult, ProgressInfo, ValidationError } from '@/shared/types/import';
import { ctxhImportApi } from '../api/import';
import { OldSystemCtxhRecord } from '../types/import';

/**
 * Parse Excel file for CTXH old system import
 * Expected format: MSSV | Số ngày
 */
const parseCtxhOldSystemFile = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<OldSystemCtxhRecord[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        onProgress?.(30);
        
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        onProgress?.(60);
        
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<any>(firstSheet, { header: 1 });

        onProgress?.(80);

        // Auto-detect if first row is header or data
        let startRow = 0;
        if (jsonData.length > 0) {
          const firstRow = jsonData[0];
          const firstCell = String(firstRow[0] || '').trim().toLowerCase();
          
          // Check if first row looks like a header
          // Headers usually contain text like "mssv", "mã số", "sinh viên", "số ngày", etc.
          const headerKeywords = ['mssv', 'mã số', 'sinh viên', 'code', 'student'];
          const isHeader = headerKeywords.some(keyword => firstCell.includes(keyword)) ||
                          !/^\d{7,10}$/.test(firstCell); // If not a valid student code, likely a header
          
          // Only skip first row if it's actually a header
          startRow = isHeader ? 1 : 0;
        }

        // Parse data (skip header row if detected)
        const records: OldSystemCtxhRecord[] = [];
        for (let i = startRow; i < jsonData.length; i++) {
          const row = jsonData[i];
          
          // Skip empty rows
          if (!row[0] && row[1] === undefined) {
            continue;
          }

          records.push({
            studentCode: String(row[0] || '').trim(),
            days: row[1] !== undefined ? Number(row[1]) : 0,
          });
        }

        onProgress?.(100);
        resolve(records);
      } catch (error) {
        reject(new Error('Lỗi khi đọc file Excel. Vui lòng kiểm tra định dạng file.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Không thể đọc file. Vui lòng thử lại.'));
    };

    reader.readAsArrayBuffer(file);
  });
};

/**
 * Validate CTXH old system records with backend API
 * Now checks if students exist in database before import
 */
const validateCtxhOldSystemData = async (
  data: OldSystemCtxhRecord[],
  onProgress?: (progress: { current: number; total: number; percentage: number }) => void
): Promise<ClientValidationResult> => {
  const VALIDATION_CHUNK_SIZE = 500; // Validate 500 records at a time
  
  try {
    // If data is small enough, validate in one request
    if (data.length <= VALIDATION_CHUNK_SIZE) {
      onProgress?.({
        current: 0,
        total: 1,
        percentage: 0
      });

      // Client-side format validation first
      const clientErrors: ValidationError[] = [];
      const seenStudentCodes = new Set<string>();

      for (let i = 0; i < data.length; i++) {
        const record = data[i];
        const rowNumber = i + 2;
        let hasError = false;

        // Validate student code format
        if (!record.studentCode) {
          clientErrors.push({
            row: rowNumber,
            column: 'MSSV',
            message: 'MSSV không được để trống',
            severity: 'error'
          });
          hasError = true;
        } else if (!/^\d{7,10}$/.test(record.studentCode)) {
          clientErrors.push({
            row: rowNumber,
            column: 'MSSV',
            message: 'MSSV phải có 7-10 chữ số',
            severity: 'error'
          });
          hasError = true;
        }

        // Validate days
        if (record.days === undefined || record.days === null || isNaN(record.days)) {
          clientErrors.push({
            row: rowNumber,
            column: 'Số ngày',
            message: 'Số ngày không hợp lệ',
            severity: 'error'
          });
          hasError = true;
        } else if (record.days < 0) {
          clientErrors.push({
            row: rowNumber,
            column: 'Số ngày',
            message: 'Số ngày phải là số dương',
            severity: 'error'
          });
          hasError = true;
        }

        // Check for duplicates in file
        if (!hasError && record.studentCode && seenStudentCodes.has(record.studentCode)) {
          clientErrors.push({
            row: rowNumber,
            column: 'MSSV',
            message: `MSSV "${record.studentCode}" bị trùng lặp trong file`,
            severity: 'error'
          });
        } else if (record.studentCode) {
          seenStudentCodes.add(record.studentCode);
        }
      }

      // If there are client-side errors, return immediately
      if (clientErrors.length > 0) {
        return {
          isValid: false,
          data: [],
          errors: clientErrors,
          warnings: [],
          summary: {
            total: data.length,
            valid: 0,
            invalid: clientErrors.length,
            duplicates: 0
          }
        };
      }

      // Call backend to validate with database
      const result = await ctxhImportApi.validateOldSystem({ records: data });

      onProgress?.({
        current: 1,
        total: 1,
        percentage: 100
      });

      return {
        isValid: result.isValid,
        data: result.isValid ? data : [],
        errors: result.errors,
        warnings: result.warnings,
        summary: {
          total: result.total,
          valid: result.valid,
          invalid: result.invalid,
          duplicates: 0
        }
      };
    }

    // Split data into chunks for large datasets
    const chunks: OldSystemCtxhRecord[][] = [];
    for (let i = 0; i < data.length; i += VALIDATION_CHUNK_SIZE) {
      chunks.push(data.slice(i, i + VALIDATION_CHUNK_SIZE));
    }

    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationError[] = [];
    let totalValid = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkStartIndex = i * VALIDATION_CHUNK_SIZE;
      const currentBatch = i + 1;

      onProgress?.({
        current: currentBatch,
        total: chunks.length,
        percentage: Math.round((currentBatch / chunks.length) * 100)
      });

      try {
        const result = await ctxhImportApi.validateOldSystem({ records: chunk });

        // Adjust row numbers for errors/warnings
        const adjustedErrors = result.errors.map(error => ({
          ...error,
          row: error.row + chunkStartIndex
        }));

        const adjustedWarnings = result.warnings.map(warning => ({
          ...warning,
          row: warning.row + chunkStartIndex
        }));

        allErrors.push(...adjustedErrors);
        allWarnings.push(...adjustedWarnings);
        totalValid += result.valid;
      } catch (error) {
        console.error(`Validation chunk ${i + 1} failed:`, error);
        allErrors.push({
          row: chunkStartIndex + 2,
          column: 'Hệ thống',
          message: `Lỗi validate batch ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error'
        });
      }
    }

    onProgress?.({
      current: chunks.length,
      total: chunks.length,
      percentage: 100
    });

    return {
      isValid: allErrors.length === 0,
      data: allErrors.length === 0 ? data : [],
      errors: allErrors,
      warnings: allWarnings,
      summary: {
        total: data.length,
        valid: totalValid,
        invalid: allErrors.length,
        duplicates: 0
      }
    };
  } catch (error) {
    console.error('Validation failed:', error);
    return {
      isValid: false,
      data: [],
      errors: [{
        row: 0,
        column: 'Hệ thống',
        message: `Lỗi validation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      }],
      warnings: [],
      summary: {
        total: data.length,
        valid: 0,
        invalid: data.length,
        duplicates: 0
      }
    };
  }
};

/**
 * Submit CTXH old system import with batch processing and retry logic
 */
const submitCtxhOldSystemData = async (
  data: OldSystemCtxhRecord[],
  onProgress?: (progress: ProgressInfo) => void
): Promise<ClientImportResult> => {
  const BATCH_SIZE = 200;
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;
  
  const totalRecords = data.length;
  const batches: OldSystemCtxhRecord[][] = [];
  
  // Split data into batches
  for (let i = 0; i < totalRecords; i += BATCH_SIZE) {
    batches.push(data.slice(i, i + BATCH_SIZE));
  }
  
  const totalBatches = batches.length;
  let processedRecords = 0;
  let totalSuccessful = 0;
  let totalFailed = 0;
  const allErrors: string[] = [];
  
  // Process each batch
  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const batch = batches[batchIndex];
    const currentBatch = batchIndex + 1;
    
    // Retry logic for this batch
    const processBatch = async (retryCount = 0): Promise<void> => {
      try {
        // Notify progress
        onProgress?.({
          currentBatch,
          totalBatches,
          processedRecords,
          totalRecords,
          percentage: Math.round((processedRecords / totalRecords) * 100),
          currentOperation: 'importing'
        });
        
        // Call API for this batch
        const result = await ctxhImportApi.importOldSystem({ records: batch });
        
        // Accumulate results
        totalSuccessful += result.successful;
        totalFailed += result.failed;
        processedRecords += batch.length;
        allErrors.push(...result.errors);
        
        // Update progress
        onProgress?.({
          currentBatch,
          totalBatches,
          processedRecords,
          totalRecords,
          percentage: Math.round((processedRecords / totalRecords) * 100),
          currentOperation: 'importing'
        });
      } catch (error: any) {
        // Retry logic
        if (retryCount < MAX_RETRIES) {
          const delay = RETRY_DELAY * Math.pow(2, retryCount);
          await new Promise(resolve => setTimeout(resolve, delay));
          return processBatch(retryCount + 1);
        }
        
        // Max retries reached - mark all records in this batch as failed
        totalFailed += batch.length;
        processedRecords += batch.length;
        allErrors.push(`Batch ${currentBatch}: ${error.message || 'Có lỗi xảy ra'}`);
      }
    };
    
    await processBatch();
  }
  
  // Return final result
  return {
    success: totalFailed === 0,
    sessionSummary: {
      totalProcessed: totalRecords,
      totalSuccessful,
      totalFailed,
      isComplete: true
    },
    errors: allErrors
  };
};

/**
 * Download template file
 */
const downloadCtxhOldSystemTemplate = () => {
  const template = [
    ['MSSV', 'Số ngày'],
    ['2211234', 15],
    ['2211235', 20.5],
    ['2211236', 10],
  ];

  const ws = XLSX.utils.aoa_to_sheet(template);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, 'ctxh_old_system_template.xlsx');
};

/**
 * CTXH Old System Import Configuration
 */
export const ctxhOldSystemImportConfig: ImportModalConfig = {
  // File handling
  templateFileName: 'ctxh_old_system_template.xlsx',
  downloadTemplate: downloadCtxhOldSystemTemplate,
  acceptedFileTypes: ['.xlsx', '.xls'],
  maxFileSize: 5 * 1024 * 1024, // 5MB

  // Client-side processing
  useClientSideProcessing: true,
  enableBatchProcessing: true, // Enable batch for large files
  batchSize: 200, // Process 200 records per batch (14k records = 70 batches)

  // Processing functions
  parseFile: parseCtxhOldSystemFile,
  validateClientData: validateCtxhOldSystemData,
  submitClientData: submitCtxhOldSystemData,

  // UI Configuration
  entityName: 'ctxh-import',
  previewRowCount: 10,
  allowPartialImport: false,

  columns: [
    {
      key: 'studentCode',
      label: 'MSSV',
      required: true,
      type: 'text',
      width: '40%'
    },
    {
      key: 'days',
      label: 'Số ngày',
      required: true,
      type: 'number',
      width: '60%'
    }
  ]
};

// Export template download function
export { downloadCtxhOldSystemTemplate };
