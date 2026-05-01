-- Script để kiểm tra cấu hình S3 trong database

-- Xem cấu hình S3 hiện tại
SELECT 
    id,
    access_key_id,
    LEFT(secret_access_key, 10) || '...' as secret_key_preview,
    region,
    s3_bucket,
    s3_endpoint,
    is_active,
    created_at,
    updated_at
FROM aws_s3_configs
ORDER BY created_at DESC;

-- Kiểm tra config active
SELECT 
    id,
    s3_bucket,
    s3_endpoint,
    region,
    is_active
FROM aws_s3_configs
WHERE is_active = true;
