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

        // Parse data (skip header row)
        const records: OldSystemCtxhRecord[] = [];
        for (let i = 1; i < jsonData.length; i++) {
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
 * Validate CTXH old system records
 */
const validateCtxhOldSystemData = async (
  data: OldSystemCtxhRecord[],
  onProgress?: (progress: { current: number; total: number; percentage: number }) => void
): Promise<ClientValidationResult> => {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const validRecords: OldSystemCtxhRecord[] = [];
  const seenStudentCodes = new Set<string>();

  for (let i = 0; i < data.length; i++) {
    const record = data[i];
    const rowNumber = i + 2; // +2 because Excel is 1-indexed and we skip header

    // Update progress
    if (onProgress && i % 10 === 0) {
      onProgress({
        current: i + 1,
        total: data.length,
        percentage: Math.round(((i + 1) / data.length) * 100)
      });
    }

    let hasError = false;

    // Validate student code
    if (!record.studentCode) {
      errors.push({
        row: rowNumber,
        column: 'MSSV',
        message: 'MSSV không được để trống',
        severity: 'error'
      });
      hasError = true;
    } else if (!/^\d{7,10}$/.test(record.studentCode)) {
      errors.push({
        row: rowNumber,
        column: 'MSSV',
        message: 'MSSV phải có 7-10 chữ số',
        severity: 'error'
      });
      hasError = true;
    }

    // Validate days
    if (record.days === undefined || record.days === null || isNaN(record.days)) {
      errors.push({
        row: rowNumber,
        column: 'Số ngày',
        message: 'Số ngày không hợp lệ',
        severity: 'error'
      });
      hasError = true;
    } else if (record.days < 0) {
      errors.push({
        row: rowNumber,
        column: 'Số ngày',
        message: 'Số ngày phải là số dương',
        severity: 'error'
      });
      hasError = true;
    } else if (record.days > 365) {
      warnings.push({
        row: rowNumber,
        column: 'Số ngày',
        message: 'Số ngày lớn hơn 365 (có thể không hợp lệ)',
        severity: 'warning'
      });
    }

    // Check for decimal precision (should be 0.5 increments)
    if (!hasError && record.days % 0.5 !== 0) {
      warnings.push({
        row: rowNumber,
        column: 'Số ngày',
        message: 'Số ngày nên là bội số của 0.5 (ví dụ: 0.5, 1, 1.5, 2, ...)',
        severity: 'warning'
      });
    }

    // Check for duplicates
    if (record.studentCode && seenStudentCodes.has(record.studentCode)) {
      warnings.push({
        row: rowNumber,
        column: 'MSSV',
        message: `MSSV "${record.studentCode}" bị trùng lặp trong file`,
        severity: 'warning'
      });
    } else if (record.studentCode) {
      seenStudentCodes.add(record.studentCode);
    }

    if (!hasError) {
      validRecords.push(record);
    }
  }

  // Final progress
  onProgress?.({
    current: data.length,
    total: data.length,
    percentage: 100
  });

  return {
    isValid: errors.length === 0,
    data: validRecords,
    errors,
    warnings,
    summary: {
      total: data.length,
      valid: validRecords.length,
      invalid: errors.length,
      duplicates: Array.from(seenStudentCodes).length < data.length ? data.length - Array.from(seenStudentCodes).length : 0
    }
  };
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
