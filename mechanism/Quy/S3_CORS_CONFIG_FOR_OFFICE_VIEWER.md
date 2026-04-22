# Config S3 CORS cho Office Online Viewer

## Vấn đề
Office Online Viewer (`view.officeapps.live.com`) không thể truy cập file DOCX từ S3 bucket vì:
1. CORS chưa được config
2. Bucket chưa cho phép public read

## Giải pháp

### Option 1: Config CORS (Recommended)
Cho phép Office Viewer truy cập mà không cần public toàn bộ bucket.

#### Bước 1: Tạo CORS Policy JSON

```json
[
  {
    "AllowedOrigins": [
      "https://view.officeapps.live.com",
      "https://excel.officeapps.live.com",
      "https://powerpoint.officeapps.live.com",
      "https://word-view.officeapps.live.com"
    ],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag",
      "Content-Type",
      "Content-Length"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

#### Bước 2: Apply CORS vào S3 Bucket

**Sử dụng AWS CLI:**
```bash
# Tạo file cors-config.json với nội dung trên
aws s3api put-bucket-cors \
  --bucket 19429970-documents \
  --cors-configuration file://cors-config.json \
  --endpoint-url https://s3-hcm5-r1.longvan.net
```

**Hoặc qua Web Console:**
1. Vào S3 bucket dashboard
2. Chọn bucket `19429970-documents`
3. Tab **Permissions** → **CORS configuration**
4. Paste JSON config ở trên
5. Save

#### Bước 3: Verify CORS

```bash
# Test CORS header
curl -H "Origin: https://view.officeapps.live.com" \
     -H "Access-Control-Request-Method: GET" \
     -I \
     https://s3-hcm5-r1.longvan.net/19429970-documents/submissions/test.docx
```

### Option 2: Public Read Access (Easier but less secure)

#### Bucket Policy cho public read:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::19429970-documents/submissions/*"
    }
  ]
}
```

**Apply:**
```bash
aws s3api put-bucket-policy \
  --bucket 19429970-documents \
  --policy file://bucket-policy.json \
  --endpoint-url https://s3-hcm5-r1.longvan.net
```

### Option 3: Presigned URLs (Most Secure)

Không cần config bucket, tạo temporary URL có signature.

**Update backend code:**

```typescript
// Install package
npm install @aws-sdk/s3-request-presigner

// In submissions.service.ts
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

async getPublicUrl(id: string, userId: string): Promise<{ url: string; fileName: string }> {
  const submission = await this.submissionRepository.findOne({
    where: { id, userId },
  });

  if (!submission) {
    throw new NotFoundException(ErrorMessages.SUBMISSION_NOT_FOUND);
  }

  if (submission.status !== SubmissionStatus.COMPLETED) {
    throw new BadRequestException(ErrorMessages.SUBMISSION_NOT_COMPLETED);
  }

  if (!submission.outputFileUrl) {
    throw new NotFoundException(ErrorMessages.SUBMISSION_OUTPUT_NOT_FOUND);
  }

  try {
    if (!this.s3Client || !this.s3Config) {
      throw new InternalServerErrorException('S3 configuration not available');
    }

    const key = submission.outputFileUrl.split('.com/')[1];
    
    // Create presigned URL (valid for 1 hour)
    const command = new GetObjectCommand({
      Bucket: this.s3Config.bucketName,
      Key: key,
    });
    
    const presignedUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 3600, // 1 hour
    });
    
    return {
      url: presignedUrl,
      fileName: submission.outputFileName || 'document.docx'
    };
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw new InternalServerErrorException('Failed to generate presigned URL');
  }
}
```

## Testing

### Test 1: CORS Headers
```bash
curl -v -H "Origin: https://view.officeapps.live.com" \
  https://s3-hcm5-r1.longvan.net/19429970-documents/submissions/df1dab8b-e112-4ddf-9826-aa86455f5241/1762924812311_NCS-01_Phieu%20dang%20ky%20NCS_V2_20251112_052012.docx
```

Expected headers:
```
Access-Control-Allow-Origin: https://view.officeapps.live.com
Access-Control-Allow-Methods: GET, HEAD
Access-Control-Expose-Headers: ETag, Content-Type, Content-Length
```

### Test 2: Office Viewer
URL format:
```
https://view.officeapps.live.com/op/embed.aspx?src=<ENCODED_S3_URL>
```

## Recommendation

**For Development:** Option 2 (Public Read) - Đơn giản nhất
**For Production:** Option 3 (Presigned URLs) - An toàn nhất

## Next Steps

1. ✅ Chọn 1 trong 3 options
2. ✅ Apply config vào S3
3. ✅ Test CORS headers
4. ✅ Test Office Viewer trong browser
5. ✅ Nếu dùng Option 3, cài package và update code

## Current Status
- ✅ Code đã sẵn sàng
- ⏳ **Cần config S3 bucket**
- ✅ UI fallback với download đã hoạt động
