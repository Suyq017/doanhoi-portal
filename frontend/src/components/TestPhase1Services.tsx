import { ExcelParserService } from '../shared/services/import-service/excelParserService';
import { ImportValidationService } from '../shared/services/import-service/importValidationService';
import { ExcelExportService } from '../shared/services/import-service/excelExportService';
import { UserImportData } from '../shared/types/userImport';

/**
 * Test component for Phase 1 services
 */
export function TestPhase1Services() {
  
  const testExcelParsing = async () => {
    console.log('=== Testing Excel Parsing Service ===');
    
    // Create a test file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        console.log('Parsing file:', file.name, 'Size:', file.size, 'bytes');
        
        const parser = new ExcelParserService();
        const result = await parser.parseUserImportFile(file);
        
        console.log('Parse successful!');
        console.log('Total records:', result.length);
        console.log('First 3 records:', result.slice(0, 3));
        
        // Test batch processing
        const batches = ExcelParserService.chunkArray(result, 200);
        console.log('Total batches (200 records each):', batches.length);
        
      } catch (error) {
        console.error('Parse error:', error);
      }
    };
    
    input.click();
  };

  const testValidation = async () => {
    console.log('=== Testing Validation Service ===');
    
    // Create test data
    const testData: UserImportData[] = [
      {
        code: 'SV001',
        familyName: 'Nguyen Van',
        givenName: 'An',
        email: 'nguyenvanan@example.com',
        phone: '0123456789',
        identityCard: '123456789012',
        birthDate: new Date('2000-01-01'),
        gender: 'NAM',
        userType: 'SINH_VIEN',
        className: 'KTPM2021',
        membershipStatus: 'doan_vien',
        trainingSystem: 'CQ',
        trainingLevel: 'DH',
        admissionYear: '2021',
        curriculumYear: '2021',
        password: 'password123'
      },
      {
        code: 'SV001', // Duplicate code - should error
        familyName: 'Tran Thi',
        givenName: 'Binh',
        email: 'invalid-email', // Invalid email - should error
        phone: '123', // Invalid phone - should error
        identityCard: '123',
        birthDate: new Date('1900-01-01'), // Too old - should error
        gender: 'NAM' as any, // Will be set to invalid in test
        userType: 'SINH_VIEN',
        className: '',
        membershipStatus: 'doan_vien',
        trainingSystem: 'CQ',
        trainingLevel: 'DH',
        admissionYear: '3000', // Invalid year - should error
        curriculumYear: '2021'
      },
      {
        code: '', // Missing required code - should error
        familyName: '', // Missing required name - should error
        givenName: '', // Missing required name - should error
        email: '',
        phone: '',
        identityCard: '',
        birthDate: undefined,
        gender: undefined,
        userType: 'SINH_VIEN',
        className: '',
        membershipStatus: undefined,
        trainingSystem: undefined,
        trainingLevel: undefined,
        admissionYear: undefined,
        curriculumYear: undefined
      }
    ];
    
    try {
      const validationService = new ImportValidationService();
      const result = await validationService.validateUserImportData(testData);
      
      console.log('Validation completed!');
      console.log('Is Valid:', result.isValid);
      console.log('Summary:', result.summary);
      console.log('Errors:', result.errors);
      console.log('Warnings:', result.warnings);
      
      if (result.errors.length > 0) {
        console.log('First error details:', result.errors[0]);
      }
      
    } catch (error) {
      console.error('Validation error:', error);
    }
  };

  const testExportTemplate = () => {
    console.log('=== Testing Export Template ===');
    
    try {
      ExcelExportService.createUserImportTemplate({
        filename: 'Test_Template.xlsx'
      });
      console.log('Template exported successfully!');
    } catch (error) {
      console.error('Export template error:', error);
    }
  };

  const testExportErrors = () => {
    console.log('=== Testing Export Validation Errors ===');
    
    const testErrors = [
      {
        row: 1,
        field: 'code',
        value: '',
        message: 'Mã số không được để trống',
        type: 'validation' as const
      },
      {
        row: 2,
        field: 'email',
        value: 'invalid-email',
        message: 'Email không đúng định dạng',
        type: 'business' as const
      }
    ];
    
    const testWarnings = [
      {
        row: 1,
        field: 'phone',
        value: undefined,
        message: 'Số điện thoại trống',
        type: 'validation' as const
      }
    ];
    
    try {
      ExcelExportService.exportValidationErrors(testErrors, testWarnings, {
        filename: 'Test_Validation_Errors.xlsx'
      });
      console.log('Validation errors exported successfully!');
    } catch (error) {
      console.error('Export errors error:', error);
    }
  };

  const runAllTests = async () => {
    console.log('=== Running All Phase 1 Tests ===');
    
    await testValidation();
    testExportTemplate();
    testExportErrors();
    
    console.log('=== All tests completed! ===');
    console.log('Click "Test Excel Parsing" to test with real Excel file');
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Phase 1 Services Testing</h2>
      
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={testExcelParsing}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Test Excel Parsing
          </button>
          
          <button
            onClick={testValidation}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            Test Validation
          </button>
          
          <button
            onClick={testExportTemplate}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
          >
            Test Export Template
          </button>
          
          <button
            onClick={testExportErrors}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
          >
            Test Export Errors
          </button>
        </div>
        
        <button
          onClick={runAllTests}
          className="w-full px-4 py-3 bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors font-semibold"
        >
          Run All Tests (except file parsing)
        </button>
      </div>
      
      <div className="mt-6 p-4 bg-gray-100 rounded">
        <h3 className="font-semibold mb-2">Test Results:</h3>
        <p className="text-sm text-gray-600">
          Open browser console (F12) to see test results and logs.
        </p>
      </div>
      
      <div className="mt-4 p-4 bg-blue-50 rounded">
        <h3 className="font-semibold mb-2 text-blue-800">Phase 1 Completed Services:</h3>
        <ul className="text-sm text-blue-600 space-y-1">
          <li>✅ ExcelParserService - Client-side Excel parsing with header mapping</li>
          <li>✅ ImportValidationService - Comprehensive data validation with yup</li>
          <li>✅ ExcelExportService - Template generation and error reporting</li>
          <li>✅ UserImportData types - Complete TypeScript interfaces</li>
        </ul>
      </div>
      
      <div className="mt-4 p-4 bg-yellow-50 rounded">
        <h3 className="font-semibold mb-2 text-yellow-800">Next Steps (Phase 2):</h3>
        <ul className="text-sm text-yellow-600 space-y-1">
          <li>🔄 Integrate services with existing ImportModal component</li>
          <li>🔄 Add client-side processing mode toggle</li>
          <li>🔄 Implement batch progress UI with 200-record chunks</li>
          <li>🔄 Create backend batch processing endpoint</li>
        </ul>
      </div>
    </div>
  );
}