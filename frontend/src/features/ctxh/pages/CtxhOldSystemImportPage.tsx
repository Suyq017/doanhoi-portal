import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import {
  FileUp,
  Download,
  Upload,
  X,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { ctxhImportApi } from '../api/import';
import { OldSystemCtxhRecord, ImportOldSystemCtxhResult } from '../types/import';

export const CtxhOldSystemImportPage = () => {
  const { t } = useTranslation('ctxh-import');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportOldSystemCtxhResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && isExcelFile(droppedFile)) {
      setFile(droppedFile);
      setImportResult(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && isExcelFile(selectedFile)) {
      setFile(selectedFile);
      setImportResult(null);
    }
  };

  const isExcelFile = (file: File) => {
    return (
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.xls') ||
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel'
    );
  };

  const parseExcelFile = async (file: File): Promise<OldSystemCtxhRecord[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json<any>(firstSheet, { header: 1 });

          // Skip header row
          const records: OldSystemCtxhRecord[] = [];
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (row[0] && row[1] !== undefined) {
              records.push({
                studentCode: String(row[0]).trim(),
                days: Number(row[1]),
              });
            }
          }

          resolve(records);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleImport = async () => {
    if (!file) {
      alert(t('messages.selectFile'));
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const records = await parseExcelFile(file);
      
      if (records.length === 0) {
        alert(t('messages.invalidFormat'));
        return;
      }

      const result = await ctxhImportApi.importOldSystem({ records });
      setImportResult(result);
    } catch (error) {
      console.error('Import error:', error);
      alert(t('messages.importError'));
    } finally {
      setIsImporting(false);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const template = [
      ['MSSV', 'Số ngày'],
      ['2211234', 15],
      ['2211235', 20],
    ];

    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'ctxh_old_system_template.xlsx');
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-gray-600 mt-2">{t('description')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Upload & Instructions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upload Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <FileUp className="w-5 h-5" />
                {t('uploadSection.title')}
              </h2>
              <p className="text-sm text-gray-600 mt-1">{t('uploadSection.description')}</p>
            </div>

            <div className="space-y-4">
              {/* Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                  transition-colors duration-200
                  ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-500'}
                `}
              >
                <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-sm text-gray-600">{t('uploadSection.dropzone')}</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Selected File */}
              {file && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      handleRemoveFile();
                    }}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Import Button */}
              <button
                onClick={handleImport}
                disabled={!file || isImporting}
                className={`
                  w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2
                  ${!file || isImporting 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'}
                  transition-colors
                `}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('messages.importing')}
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    {t('importButton')}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Import Results */}
          {importResult && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                {importResult.failed === 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                )}
                {t('results.title')}
              </h2>

              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${importResult.failed === 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <p className={importResult.failed === 0 ? 'text-green-800' : 'text-red-800'}>
                    {importResult.message}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <p className="text-sm text-gray-600">{t('results.total')}</p>
                    <p className="text-2xl font-bold">{importResult.total}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <p className="text-sm text-green-700">{t('results.successful')}</p>
                    <p className="text-2xl font-bold text-green-600">{importResult.successful}</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg text-center">
                    <p className="text-sm text-red-700">{t('results.failed')}</p>
                    <p className="text-2xl font-bold text-red-600">{importResult.failed}</p>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">{t('results.errors')}</h4>
                    <div className="bg-red-50 p-4 rounded-lg max-h-60 overflow-y-auto">
                      <ul className="space-y-1 text-sm text-red-800">
                        {importResult.errors.map((error, idx) => (
                          <li key={idx}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Template & Instructions */}
        <div className="space-y-6">
          {/* Template Download */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Download className="w-5 h-5" />
                {t('templateSection.title')}
              </h2>
              <p className="text-sm text-gray-600 mt-1">{t('templateSection.description')}</p>
            </div>
            <button
              onClick={downloadTemplate}
              className="w-full py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              {t('templateSection.downloadButton')}
            </button>
          </div>

          {/* Instructions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">{t('instructions.title')}</h2>
            <div className="space-y-4">
              <ol className="space-y-2 list-decimal list-inside text-sm">
                <li>{t('instructions.step1')}</li>
                <li>{t('instructions.step2')}</li>
                <li>{t('instructions.step3')}</li>
              </ol>

              <div className="border-t pt-4">
                <h4 className="font-medium text-sm mb-2">{t('instructions.notes')}</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• {t('instructions.note1')}</li>
                  <li>• {t('instructions.note2')}</li>
                  <li>• {t('instructions.note3')}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
