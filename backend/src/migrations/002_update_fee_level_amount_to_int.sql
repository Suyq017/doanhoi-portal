-- Migration script để thay đổi amount từ decimal sang integer
-- trong bảng payment_fee_levels

-- Backup data trước khi modify (optional)
-- CREATE TABLE payment_fee_levels_backup AS SELECT * FROM payment_fee_levels;

-- Update column type from decimal to integer
-- Lưu ý: Sẽ truncate phần thập phân nếu có
ALTER TABLE payment_fee_levels 
ALTER COLUMN amount TYPE INTEGER USING amount::INTEGER;

-- Verify the change
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'payment_fee_levels' AND column_name = 'amount';
