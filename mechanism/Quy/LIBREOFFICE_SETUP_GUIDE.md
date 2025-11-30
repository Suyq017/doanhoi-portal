# LibreOffice PDF Conversion - Setup Guide

## ✅ Đã Implement

### 1. Backend Changes
- ✅ Created `PdfConverterService` - Service chuyên convert DOCX to PDF
- ✅ Updated `SubmissionsService` - Sử dụng PdfConverterService thay vì @jsreport/office
- ✅ Added to `TemplatesModule` - Register PdfConverterService
- ✅ Updated `Dockerfile.prod` - Cài LibreOffice trong Docker image
- ✅ Added health check endpoint - `/submissions/health/libreoffice`

### 2. Frontend Changes
- ✅ Updated locales - Đổi text "của bạn" thành "của người tạo"

## 🚀 Cách Test

### Development (Local Machine)

#### Windows:
```powershell
# 1. Cài LibreOffice
# Download từ: https://www.libreoffice.org/download/download/
# Hoặc dùng Chocolatey:
choco install libreoffice

# 2. Thêm vào PATH (nếu chưa có)
$env:PATH += ";C:\Program Files\LibreOffice\program"

# 3. Test LibreOffice
libreoffice --version

# 4. Khởi động backend
cd backend
npm run start:dev
```

#### macOS:
```bash
# 1. Cài LibreOffice
brew install --cask libreoffice

# 2. Test
/Applications/LibreOffice.app/Contents/MacOS/soffice --version

# 3. Khởi động backend
cd backend
npm run start:dev
```

#### Linux:
```bash
# 1. Cài LibreOffice
sudo apt-get update
sudo apt-get install -y libreoffice

# 2. Test
libreoffice --version

# 3. Khởi động backend
cd backend
npm run start:dev
```

### Production (Docker)

```bash
# 1. Build Docker image với LibreOffice
cd backend
docker build -f Dockerfile.prod -t doanhoi-backend:latest .

# 2. Run container
docker run -p 9200:9200 doanhoi-backend:latest

# 3. Check LibreOffice trong container
docker exec -it <container_id> libreoffice --version
```

## 🧪 Test Endpoints

### 1. Check LibreOffice Health
```bash
# GET /api/submissions/health/libreoffice
curl http://localhost:9200/api/submissions/health/libreoffice

# Expected Response:
{
  "available": true,
  "version": "LibreOffice 7.x.x.x",
  "message": "LibreOffice is installed and ready"
}
```

### 2. Test PDF Preview
```bash
# Bước 1: Tạo submission
POST /api/submissions
{
  "templateId": "...",
  "formData": {...}
}

# Bước 2: Submit để generate DOCX
POST /api/submissions/:id/submit

# Bước 3: Preview PDF
GET /api/submissions/:id/preview-pdf
# Browser sẽ hiển thị PDF inline
```

### 3. Test trong Frontend
1. Đăng nhập vào hệ thống
2. Vào Templates → My Submissions
3. Click vào icon "Preview" (mắt) của một submission đã hoàn thành
4. Modal sẽ mở và hiển thị PDF preview

## 📋 Troubleshooting

### Lỗi: "LibreOffice not found"

**Development:**
```bash
# Windows - Thêm vào PATH
setx PATH "%PATH%;C:\Program Files\LibreOffice\program"

# macOS/Linux - Tạo symlink
sudo ln -s /Applications/LibreOffice.app/Contents/MacOS/soffice /usr/local/bin/libreoffice
```

**Docker:**
```bash
# Kiểm tra LibreOffice trong container
docker exec -it <container_id> sh
libreoffice --version
```

### Lỗi: "Conversion timeout"

Tăng timeout trong `pdf-converter.service.ts`:
```typescript
await execAsync(convertCommand, {
  timeout: 120000, // Tăng lên 2 phút
});
```

### Lỗi: "Permission denied"

**Trong Docker:**
```dockerfile
# Thêm vào Dockerfile.prod
RUN mkdir -p /tmp && chmod 777 /tmp
```

**Development:**
```bash
# Linux/macOS
chmod 755 /tmp
```

### Lỗi: "Cannot write to /tmp"

Check quyền ghi /tmp folder:
```bash
# Linux/macOS
ls -la /tmp

# Windows
echo %TEMP%
```

## 🔍 Monitoring & Logs

### Check Logs
```bash
# Development
# Logs sẽ hiển thị trong console với prefix [PdfConverterService]

# Docker
docker logs <container_id> | grep PdfConverter
```

### Log Messages
- ✅ `Starting DOCX to PDF conversion` - Bắt đầu convert
- ✅ `Successfully converted DOCX to PDF` - Convert thành công
- ❌ `LibreOffice not found` - Chưa cài LibreOffice
- ❌ `Failed to generate PDF` - Lỗi conversion
- ⚠️ `Failed to cleanup temp file` - Lỗi dọn dẹp (không quan trọng)

## 📊 Performance

### Conversion Time
- Small file (<1MB): ~2-5 seconds
- Medium file (1-5MB): ~5-10 seconds
- Large file (>5MB): ~10-30 seconds

### Memory Usage
- LibreOffice process: ~150-300MB RAM
- Temp files: Tự động cleanup sau mỗi conversion

### Optimization Tips
1. **Add caching**: Cache PDF đã convert để tránh convert lại
2. **Queue system**: Xử lý conversion theo queue cho nhiều requests
3. **Parallel processing**: Giới hạn số conversion đồng thời

## 🎯 Next Steps

### Optional Improvements:

1. **Add PDF Caching**
```typescript
// Cache PDF trong S3 để không phải convert lại
async convertToPdf(id: string): Promise<Buffer> {
  const cachedPdfUrl = await this.checkPdfCache(id);
  if (cachedPdfUrl) {
    return this.downloadFromS3(cachedPdfUrl);
  }
  
  const pdfBuffer = await this.convert(...);
  await this.cachePdfToS3(id, pdfBuffer);
  return pdfBuffer;
}
```

2. **Add Queue System**
```bash
npm install @nestjs/bull bull
```

3. **Add Progress Tracking**
```typescript
// WebSocket để track conversion progress
@WebSocketGateway()
export class ConversionGateway {
  @SubscribeMessage('conversion-progress')
  handleProgress(client: Socket, data: any) {
    // Emit progress updates
  }
}
```

## 📝 Summary

### Development Setup:
1. ✅ Cài LibreOffice trên máy local
2. ✅ Chạy `npm run start:dev`
3. ✅ Test endpoint health check
4. ✅ Test preview trong UI

### Production Deployment:
1. ✅ Build Docker image với LibreOffice
2. ✅ Deploy container
3. ✅ Verify health check
4. ✅ Monitor logs

### Current Status:
- ✅ Code implemented
- ✅ Dockerfile updated
- ⏳ **Cần test trên local machine**
- ⏳ **Cần test trong Docker**
