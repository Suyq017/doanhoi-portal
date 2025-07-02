const XLSX = require('xlsx');
const fs = require('fs');

// Test organization template generation exactly
function testOrganizationTemplate() {
    console.log('🧪 Testing Organization Excel Template Generation...');
    
    try {
        // Test Level 3 template (simpler case)
        const templateData = [
            ['Mã số sinh viên'],
            ['2052001'],
            ['2052002'],
            ['2052003']
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(templateData);
        
        // Set column widths
        worksheet['!cols'] = [
            { width: 25 }  // Mã số sinh viên
        ];

        // Set header style (bold)
        for (let i = 0; i < templateData[0].length; i++) {
            const cellRef = XLSX.utils.encode_cell({ c: i, r: 0 });
            if (worksheet[cellRef]) {
                worksheet[cellRef].s = { font: { bold: true } };
            }
        }

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Organization_Members');

        // Generate buffer exactly like the fixed code
        const buffer = Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));

        // Save test file
        fs.writeFileSync('./test_organization_template.xlsx', buffer);
        
        console.log('✅ Template generated successfully!');
        console.log('📁 File size:', buffer.length, 'bytes');
        console.log('💾 Saved as: test_organization_template.xlsx');
        
        // Try to read it back to verify
        const testWorkbook = XLSX.readFile('./test_organization_template.xlsx');
        console.log('✅ File can be read back successfully!');
        console.log('📊 Sheets:', testWorkbook.SheetNames);
        
        return true;
    } catch (error) {
        console.error('❌ Error:', error.message);
        return false;
    }
}

// Run the test
const success = testOrganizationTemplate();
process.exit(success ? 0 : 1);
