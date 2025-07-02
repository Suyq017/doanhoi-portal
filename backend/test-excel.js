import * as XLSX from 'xlsx';
import * as fs from 'fs';

// Test Excel generation function similar to organization template
function testExcelGeneration() {
    console.log('Testing Excel generation...');
    
    try {
        // Test Level 2 template
        const level2Data = [
            ['Mã số sinh viên', 'Mã lớp/đơn vị'],
            ['2052001', 'KTPM01'],
            ['2052002', 'KTPM02'],
            ['2052003', 'KTPM01']
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(level2Data);
        
        // Set column widths
        worksheet['!cols'] = [
            { width: 20 },
            { width: 20 }
        ];

        // Set header style (bold)
        for (let i = 0; i < level2Data[0].length; i++) {
            const cellRef = XLSX.utils.encode_cell({ c: i, r: 0 });
            if (worksheet[cellRef]) {
                worksheet[cellRef].s = { font: { bold: true } };
            }
        }

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

        // Generate buffer exactly like department does
        const buffer = Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));

        // Save to test file
        fs.writeFileSync('test_template.xlsx', buffer);
        console.log('✅ Excel file generated successfully! Size:', buffer.length, 'bytes');
        console.log('✅ Test file saved as test_template.xlsx');
        
    } catch (error) {
        console.error('❌ Error generating Excel:', error);
    }
}

// Run test
testExcelGeneration();
