-- Insert AWS S3 Configuration for Template System
-- Sử dụng credentials từ .env

INSERT INTO aws_s3_configs (
  id,
  access_key_id,
  secret_access_key,
  region,
  s3_bucket,
  s3_endpoint,
  is_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'M0PR2NYXN2BH0QM87P0W',                    -- Access Key từ .env
  'hZDJi8M9wDOGMOBQB1oMDS0kzGpOXGHuyuivXv7e', -- Secret Key từ .env
  'hcm5-r1',                                  -- Region Long Vân
  '19429970-documents',                       -- Bucket từ .env
  'https://s3-hcm5-r1.longvan.net',          -- Endpoint Long Vân
  true,                                       -- Kích hoạt
  NOW(),
  NOW()
);

-- Verify config đã tạo
SELECT 
  id,
  LEFT(access_key_id, 10) || '...' as access_key_preview,
  region,
  s3_bucket,
  s3_endpoint,
  is_active,
  created_at
FROM aws_s3_configs 
WHERE is_active = true;
