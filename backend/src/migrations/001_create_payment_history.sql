-- Migration script để thay thế Payment Transactions thành Payment History
-- Tạo bảng payment_history mới với cấu trúc đơn giản hơn

-- Tạo bảng payment_history mới
CREATE TABLE payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'CANCELLED', 'EXPIRED')),
  order_code BIGINT UNIQUE NOT NULL,
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assignment_id) REFERENCES payment_assignments(id) ON DELETE CASCADE
);

-- Tạo indexes để tối ưu hiệu suất
CREATE INDEX idx_payment_history_assignment_id ON payment_history(assignment_id);
CREATE INDEX idx_payment_history_order_code ON payment_history(order_code);
CREATE INDEX idx_payment_history_status ON payment_history(status);
CREATE INDEX idx_payment_history_created_at ON payment_history(created_at);

-- Migrate dữ liệu từ payment_transactions (nếu cần)
-- Chỉ migrate những transaction có orderCode và assignment
INSERT INTO payment_history (assignment_id, amount, status, order_code, paid_at, created_at)
SELECT 
  "assignmentId" as assignment_id,
  amount,
  CASE 
    WHEN status = 'PENDING' THEN 'PENDING'
    WHEN status = 'PAID' THEN 'PAID'
    WHEN status = 'FAILED' THEN 'CANCELLED'
    WHEN status = 'CANCELLED' THEN 'CANCELLED'
    ELSE 'PENDING'
  END as status,
  "payosOrderCode" as order_code,
  "paidAt" as paid_at,
  "createdAt" as created_at
FROM payment_transactions 
WHERE "payosOrderCode" IS NOT NULL 
  AND "assignmentId" IS NOT NULL
ON CONFLICT (order_code) DO NOTHING; -- Tránh duplicate orderCode

-- Backup bảng cũ trước khi xóa (optional)
-- CREATE TABLE payment_transactions_backup AS SELECT * FROM payment_transactions;

-- Sau khi test thành công, có thể drop bảng cũ:
-- DROP TABLE payment_transactions;

-- Thêm comment để ghi chú
COMMENT ON TABLE payment_history IS 'Simplified payment tracking table replacing payment_transactions';
COMMENT ON COLUMN payment_history.order_code IS 'Unique order code from PayOS';
COMMENT ON COLUMN payment_history.assignment_id IS 'Reference to payment assignment';
