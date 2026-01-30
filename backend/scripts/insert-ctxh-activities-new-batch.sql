-- Script để thêm 2 hoạt động CTXH mới (Batch 2)
-- Created: 06/01/2026
-- Organization: LIEN_CHI_DOAN_MT (3f68f818-6ff1-49e0-80df-010b5ad2ba77)
-- Created by: User ID 9fb5a583-0d4d-4102-8bda-aaae7ab63a32

-- Insert 2 hoạt động CTXH mới
INSERT INTO ctxh_activity (
    id, 
    name, 
    description,
    category_id, 
    organization_id, 
    start_date, 
    end_date, 
    total_days, 
    location,
    status, 
    created_by, 
    created_at, 
    updated_at
) VALUES

-- 1. Hội nghị MIWAI 2025
(
    gen_random_uuid(),
    '[QUAN TRỌNG] [CTXH] - CTV THAM GIA HỘI NGHỊ MIWAI 2025',
    'Tham gia Hội nghị Quốc tế Đa ngành về Trí tuệ Nhân tạo lần thứ 18 (MIWAI 2025). 
    
Quyền lợi:
- CTXH: 0.5 ngày/buổi (Tham gia đủ 2 buổi được cộng thêm 0.5 ngày. Tối đa 1.5 ngày)
- ĐRL (Chỉ áp dụng cho SV khoa KH-KTMT): 5 điểm/buổi (Tham gia đủ 2 buổi được cộng thêm 5 điểm. Tối đa 15 điểm)

Hình thức đăng ký: Sử dụng mail trường, điền vào sheet:
https://docs.google.com/.../1dugkgNd.../edit...

Lưu ý:
- Mỗi sinh viên KHÔNG được đăng ký nhiều hơn 1 ca Sáng hoặc 1 ca Chiều
- Sinh viên đăng ký thành công sẽ nhận được email xác nhận
- SV được xác nhận đăng ký mà bận việc đột xuất không thể tham gia làm việc thì phải tìm người khác thay thế
- Sau khi hoàn thành công việc, SV phải theo dõi cập nhật ngày CTXH trên sàn hoạt động ngoại khóa',
    '8a1dd0d1-5d07-4d38-8a3c-18e94d8508bf'::uuid,
    '3f68f818-6ff1-49e0-80df-010b5ad2ba77'::uuid,
    '2025-12-03'::timestamp,
    '2025-12-03'::timestamp,
    1.5,
    'Trường Đại học Bách khoa - ĐHQG-HCM, cơ sở 1 (Lý Thường Kiệt)',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    NOW(),
    NOW()
),

-- 2. Lễ bế mạc Diễn đàn Tri thức trẻ ĐHQG-HCM
(
    gen_random_uuid(),
    'TUYỂN TNV HỖ TRỢ LỄ BẾ MẠC DIỄN ĐÀN TRI THỨC TRẺ ĐHQG-HCM',
    'Tình nguyện viên hỗ trợ Lễ bế mạc Diễn đàn Tri thức trẻ ĐHQG-HCM.

Thời gian: 13:10 - 17:00 ngày 25/12/2025
Trang phục: Áo VNU/logo BK, quần dài, lịch sự (tuân thủ đúng trang phục)
Quyền lợi: 0.5 ngày CTXH

Link đăng ký:
https://forms.gle/MmYBdE3qw2iSrVXCA

Lưu ý:
- BTC sẽ khóa link đăng ký khi đủ số lượng TNV và gửi email mời vào nhóm zalo trước 09:00 sáng ngày 25/12/2025
- SV được xác nhận đăng ký mà bận việc đột xuất không thể tham gia làm việc thì phải tìm người khác thay thế
- SV được xác nhận đăng ký mà không tham gia làm việc đúng tiến độ sẽ bị để tên vào danh sách đen
- Sau khi hoàn thành công việc, SV phải theo dõi cập nhật ngày CTXH trên sàn hoạt động ngoại khóa',
    '8a1dd0d1-5d07-4d38-8a3c-18e94d8508bf'::uuid,
    '3f68f818-6ff1-49e0-80df-010b5ad2ba77'::uuid,
    '2025-12-25 13:10:00'::timestamp,
    '2025-12-25 17:00:00'::timestamp,
    0.5,
    'Hội trường BKA - Đại học Bách Khoa TP.HCM cơ sở 1',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    NOW(),
    NOW()
);

-- Thống kê sau khi insert
SELECT 
    'Tổng số hoạt động mới đã thêm:' as description,
    COUNT(*) as count
FROM ctxh_activity
WHERE organization_id = '3f68f818-6ff1-49e0-80df-010b5ad2ba77'::uuid
    AND created_by = '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid
    AND status = 'ACTIVE'
    AND created_at > NOW() - INTERVAL '1 minute';

-- Hiển thị danh sách các hoạt động vừa thêm
SELECT 
    name,
    start_date,
    end_date,
    total_days,
    location,
    status,
    created_at
FROM ctxh_activity
WHERE organization_id = '3f68f818-6ff1-49e0-80df-010b5ad2ba77'::uuid
    AND created_by = '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid
    AND status = 'ACTIVE'
    AND created_at > NOW() - INTERVAL '1 minute'
ORDER BY start_date DESC;
