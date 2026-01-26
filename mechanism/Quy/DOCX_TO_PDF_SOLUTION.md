# DOCX to PDF Conversion Solution

## Hiện trạng
- ✅ Đã tạo được file DOCX và lưu trên S3
- ✅ Frontend đã có `DocumentPreviewModal` với iframe để render PDF
- ✅ Backend đã có endpoint `/submissions/:id/preview-pdf`
- ❌ `@jsreport/office` chưa được setup đúng (cần LibreOffice)

## Vấn đề với @jsreport/office
Package `@jsreport/office` yêu cầu:
1. LibreOffice hoặc MS Office phải được cài đặt trên server
2. Hoặc phải chạy jsreport server riêng với Docker
3. Không thể dùng trực tiếp như code hiện tại

## Các giải pháp khả thi

### Giải pháp 1: LibreOffice CLI (Recommended cho Production)
**Ưu điểm:**
- Chất lượng conversion tốt nhất
- Giữ nguyên format Word
- Free và open source

**Nhược điểm:**
- Cần cài LibreOffice trên server
- Tốn resources

**Implementation:**
```typescript
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

async convertToPdf(docxBuffer: Buffer): Promise<Buffer> {
  const tmpDir = '/tmp';
  const inputPath = path.join(tmpDir, `input-${Date.now()}.docx`);
  const outputDir = path.join(tmpDir, 'output');
  
  // Write DOCX to temp file
  fs.writeFileSync(inputPath, docxBuffer);
  
  // Convert using LibreOffice
  await execAsync(
    `libreoffice --headless --convert-to pdf --outdir ${outputDir} ${inputPath}`
  );
  
  // Read PDF result
  const outputPath = inputPath.replace('.docx', '.pdf');
  const pdfBuffer = fs.readFileSync(outputPath);
  
  // Cleanup
  fs.unlinkSync(inputPath);
  fs.unlinkSync(outputPath);
  
  return pdfBuffer;
}
```

**Dockerfile:**
```dockerfile
# Install LibreOffice
RUN apt-get update && \
    apt-get install -y libreoffice && \
    apt-get clean
```

### Giải pháp 2: Cloudmersive API (Recommended cho Development)
**Ưu điểm:**
- Không cần cài gì thêm
- API đơn giản
- Free tier: 800 calls/month

**Nhược điểm:**
- Phụ thuộc vào service bên ngoài
- Có giới hạn rate limit

**Implementation:**
```typescript
import axios from 'axios';

async convertToPdf(docxBuffer: Buffer): Promise<Buffer> {
  const response = await axios.post(
    'https://api.cloudmersive.com/convert/autodetect/to/pdf',
    docxBuffer,
    {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Apikey': process.env.CLOUDMERSIVE_API_KEY
      },
      responseType: 'arraybuffer'
    }
  );
  
  return Buffer.from(response.data);
}
```

### Giải pháp 3: pdf-lib + mammoth (Convert via HTML)
**Ưu điểm:**
- Pure Node.js, không cần external dependencies
- Đã có pdf-lib trong package.json

**Nhược điểm:**
- Mất format phức tạp
- Chỉ phù hợp với document đơn giản

**Implementation:**
```typescript
import mammoth from 'mammoth'; // Need to install
import { PDFDocument } from 'pdf-lib';

async convertToPdf(docxBuffer: Buffer): Promise<Buffer> {
  // Convert DOCX to HTML
  const result = await mammoth.convertToHtml({ buffer: docxBuffer });
  const html = result.value;
  
  // Use puppeteer or html-pdf to convert HTML to PDF
  // This requires additional setup
}
```

### Giải pháp 4: Google Drive API
**Ưu điểm:**
- Free
- Conversion chất lượng cao

**Nhược điểm:**
- Phức tạp setup OAuth
- Phụ thuộc vào Google

### Giải pháp 5: Frontend-only Preview (docx-preview)
**Ưu điểm:**
- Không cần backend processing
- npm package: `docx-preview`

**Nhược điểm:**
- Render không hoàn hảo
- Không phải PDF thực sự

## Recommendation

### Cho Development/Testing ngay:
**Sử dụng docx-preview trên frontend**
```bash
cd frontend
npm install docx-preview
```

### Cho Production:
**Option A: LibreOffice (Best quality)**
- Setup LibreOffice trong Docker
- Chi phí: Server resources

**Option B: Cloudmersive API**
- Free tier: 800 conversions/month
- Paid plan: $0.05/conversion

## Next Steps

1. **Immediate (Development):**
   - Implement frontend docx-preview
   - Keep download DOCX working

2. **Production Ready:**
   - Setup LibreOffice in Docker
   - Add PDF caching to reduce conversions
   - Add conversion queue for large files

## File Structure Changes Needed

```
backend/
  src/
    submissions/
      services/
        pdf-converter.service.ts  // New service
      submissions.service.ts       // Use PDFConverterService
      
frontend/
  src/
    features/
      templates/
        components/
          user/
            DocxPreviewModal.tsx   // New component using docx-preview
            DocumentPreviewModal.tsx // Keep for PDF
```
