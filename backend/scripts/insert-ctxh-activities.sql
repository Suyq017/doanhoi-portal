-- Script để thêm dữ liệu CTXH hoạt động vào database
-- Created: 27/12/2025
-- Organization: LIEN_CHI_DOAN_MT (3f68f818-6ff1-49e0-80df-010b5ad2ba77)
-- Created by: User ID 9fb5a583-0d4d-4102-8bda-aaae7ab63a32

-- Bước 1: Tạo category mặc định nếu chưa có (Hoạt động Tình nguyện)
INSERT INTO ctxh_category (id, name, description, created_by, created_at, updated_at)
VALUES (
    '8a1dd0d1-5d07-4d38-8a3c-18e94d8508bf'::uuid,
    'Hoạt động Tình nguyện',
    'Các hoạt động tình nguyện hỗ trợ cộng đồng, trường học và xã hội',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Bước 2: Insert các hoạt động CTXH
-- Lưu ý: 
-- - status = 'ACTIVE'
-- - organization_id = 3f68f818-6ff1-49e0-80df-010b5ad2ba77 (LIEN_CHI_DOAN_MT)
-- - category_id = 8a1dd0d1-5d07-4d38-8a3c-18e94d8508bf (Hoạt động Tình nguyện)
-- - created_by = 9fb5a583-0d4d-4102-8bda-aaae7ab63a32
-- - start_date và end_date được set là cùng một ngày (ước tính từ mã hoạt động)
-- - total_days = Ngày CTXH từ bảng dữ liệu

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
-- 1. MT23CTX0018 - Tháng 09/2023
(
    gen_random_uuid(),
    '[MT] TÌNH NGUYỆN VIÊN HỖ TRỢ CÔNG TÁC CỦA KHOA (TRỰC PTSV, VỆ SINH CÁC PHÒNG THÍ NGHIỆM, VĂN PHÒNG ĐOÀN KHOA) THÁNG 09/2023',
    'Tình nguyện viên hỗ trợ công tác của khoa bao gồm: trực phòng tư vấn sinh viên, vệ sinh các phòng thí nghiệm và văn phòng Đoàn khoa trong tháng 09/2023',
    '8a1dd0d1-5d07-4d38-8a3c-18e94d8508bf'::uuid,
    '3f68f818-6ff1-49e0-80df-010b5ad2ba77'::uuid,
    '2023-09-15'::timestamp,
    '2023-09-15'::timestamp,
    0.5,
    'Khoa Máy Tính, ĐHBK TP.HCM Cơ sở 2',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    NOW(),
    NOW()
),

-- 2. MT23CTX0022 - Tháng 11/2023
(
    gen_random_uuid(),
    '[MT] TÌNH NGUYỆN VIÊN HỖ TRỢ CÔNG TÁC CỦA KHOA (TRỰC PTSV, VỆ SINH CÁC PHÒNG THÍ NGHIỆM, VĂN PHÒNG ĐOÀN KHOA) THÁNG 11/2023',
    'Tình nguyện viên hỗ trợ công tác của khoa bao gồm: trực phòng tư vấn sinh viên, vệ sinh các phòng thí nghiệm và văn phòng Đoàn khoa trong tháng 11/2023',
    '8a1dd0d1-5d07-4d38-8a3c-18e94d8508bf'::uuid,
    '3f68f818-6ff1-49e0-80df-010b5ad2ba77'::uuid,
    '2023-11-15'::timestamp,
    '2023-11-15'::timestamp,
    1.0,
    'Khoa Máy Tính, ĐHBK TP.HCM cơ sở 2',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    NOW(),
    NOW()
),

-- 3. MT24CTX0003 - Tháng 04/2024
(
    gen_random_uuid(),
    '[MT] TÌNH NGUYỆN VIÊN HỖ TRỢ CÔNG TÁC CỦA KHOA (TRỰC PTSV, VỆ SINH CÁC PHÒNG THÍ NGHIỆM, VĂN PHÒNG ĐOÀN KHOA) THÁNG 04/2024',
    'Tình nguyện viên hỗ trợ công tác của khoa bao gồm: trực phòng tư vấn sinh viên, vệ sinh các phòng thí nghiệm và văn phòng Đoàn khoa trong tháng 04/2024',
    '8a1dd0d1-5d07-4d38-8a3c-18e94d8508bf'::uuid,
    '3f68f818-6ff1-49e0-80df-010b5ad2ba77'::uuid,
    '2024-04-15'::timestamp,
    '2024-04-15'::timestamp,
    0.5,
    'Khoa Máy Tính, ĐHBK TP.HCM  cơ sở 2',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    NOW(),
    NOW()
),

-- 4. MT24CTX0006 - UPRACE 2024
(
    gen_random_uuid(),
    'TNV THAM GIA ĐƯỜNG CHẠY VÌ CỘNG ĐỒNG UPRACE 2024 - Đợt 3',
    'Tình nguyện viên tham gia sự kiện Đường chạy vì cộng đồng UPRACE 2024 - Đợt 3, góp phần lan tỏa tinh thần thể thao và vì cộng đồng',
    '8a1dd0d1-5d07-4d38-8a3c-18e94d8508bf'::uuid,
    '3f68f818-6ff1-49e0-80df-010b5ad2ba77'::uuid,
    '2024-05-20'::timestamp,
    '2024-05-20'::timestamp,
    2.5,
    'Đại học Quốc gia TP.HCM Cơ sở Thủ Đức',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    NOW(),
    NOW()
),

-- 5. QG22KKK0016 - Thứ 7 tình nguyện KTX HK221
(
    gen_random_uuid(),
    'KTX ĐHQG - TNV THAM GIA THỰC HIỆN NGÀY THỨ 7 TÌNH NGUYỆN TẠI KTX ĐHQG - HK221',
    'Tình nguyện viên tham gia thực hiện ngày Thứ 7 tình nguyện tại Ký túc xá ĐHQG trong học kỳ 2 năm học 2021-2022',
    '8a1dd0d1-5d07-4d38-8a3c-18e94d8508bf'::uuid,
    '3f68f818-6ff1-49e0-80df-010b5ad2ba77'::uuid,
    '2022-03-12'::timestamp,
    '2022-03-12'::timestamp,
    0.5,
    'Ký túc xá khu B ĐHQG TP.HCM',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    NOW(),
    NOW()
),

-- 6. SV24HMT0028 - Hiến máu 10/2024
(
    gen_random_uuid(),
    '[ĐHBK] TNV THAM GIA HIẾN MÁU TÌNH NGUYỆN 10.2024',
    'Tình nguyện viên tham gia chương trình Hiến máu tình nguyện do Đoàn Trường ĐHBK tổ chức vào tháng 10/2024',
    '8a1dd0d1-5d07-4d38-8a3c-18e94d8508bf'::uuid,
    '3f68f818-6ff1-49e0-80df-010b5ad2ba77'::uuid,
    '2024-10-15'::timestamp,
    '2024-10-15'::timestamp,
    1.0,
    'Đại học Bách Khoa TP.HCM cơ sở 2',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    NOW(),
    NOW()
),

-- 7. SV24KKK0268 - BKFC 2023
(
    gen_random_uuid(),
    'TNV THAM GIA CHƯƠNG TRÌNH BKFC 2023',
    'Tình nguyện viên tham gia chương trình Bách Khoa Future Challenge (BKFC) 2023 - cuộc thi khởi nghiệp cho sinh viên',
    '8a1dd0d1-5d07-4d38-8a3c-18e94d8508bf'::uuid,
    '3f68f818-6ff1-49e0-80df-010b5ad2ba77'::uuid,
    '2023-11-10'::timestamp,
    '2023-11-12'::timestamp,
    2.5,
    'Đại học Bách Khoa TP.HCM cơ sở 2',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    NOW(),
    NOW()
),

-- 8. SV24KKK0459 - BKFC - Tôi yêu Bách Khoa 2024
(
    gen_random_uuid(),
    'TNV THAM GIA HỖ TRỢ HOẠT ĐỘNG BKFC - TÔI YÊU BÁCH KHOA NĂM 2024',
    'Tình nguyện viên hỗ trợ các hoạt động trong chương trình BKFC - Tôi yêu Bách Khoa năm 2024',
    '8a1dd0d1-5d07-4d38-8a3c-18e94d8508bf'::uuid,
    '3f68f818-6ff1-49e0-80df-010b5ad2ba77'::uuid,
    '2024-09-15'::timestamp,
    '2024-09-15'::timestamp,
    1.5,
    'Đại học Bách Khoa TP.HCM cơ sở thủ đức',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    NOW(),
    NOW()
),

-- 9. SV24KKK0494 - Tập huấn PCCC KTX 2024
(
    gen_random_uuid(),
    'TNV THAM GIA HỖ TRỢ HOẠT ĐỘNG TẬP HUẤN PCCC TẠI KTX ĐHQG-HCM NĂM 2024',
    'Tình nguyện viên hỗ trợ hoạt động tập huấn Phòng cháy chữa cháy (PCCC) tại Ký túc xá ĐHQG TP.HCM năm 2024',
    '8a1dd0d1-5d07-4d38-8a3c-18e94d8508bf'::uuid,
    '3f68f818-6ff1-49e0-80df-010b5ad2ba77'::uuid,
    '2024-11-20'::timestamp,
    '2024-11-20'::timestamp,
    0.5,
    'Ký túc xá Khu B ĐHQG TP.HCM',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    NOW(),
    NOW()
),

-- 10. SV25HMT0014 - Hiến máu 04/2025
(
    gen_random_uuid(),
    '[ĐHBK] TNV THAM GIA HIẾN MÁU TÌNH NGUYỆN 04.2025',
    'Tình nguyện viên tham gia chương trình Hiến máu tình nguyện do Đoàn Trường ĐHBK tổ chức vào tháng 04/2025',
    '8a1dd0d1-5d07-4d38-8a3c-18e94d8508bf'::uuid,
    '3f68f818-6ff1-49e0-80df-010b5ad2ba77'::uuid,
    '2025-04-15'::timestamp,
    '2025-04-15'::timestamp,
    1.0,
    'Đại học Bách Khoa TP.HCM cơ sở 2',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    NOW(),
    NOW()
),

-- 11. SV25KKK0135 - Tuyên truyền PCCC 1-5/2025
(
    gen_random_uuid(),
    'TNV HỖ TRỢ TUYÊN TRUYỀN PCCC TẠI KTX ĐHQG-HCM 1-5.2025',
    'Tình nguyện viên hỗ trợ công tác tuyên truyền Phòng cháy chữa cháy (PCCC) tại Ký túc xá ĐHQG TP.HCM từ tháng 1 đến tháng 5 năm 2025',
    '8a1dd0d1-5d07-4d38-8a3c-18e94d8508bf'::uuid,
    '3f68f818-6ff1-49e0-80df-010b5ad2ba77'::uuid,
    '2025-01-15'::timestamp,
    '2025-05-15'::timestamp,
    1.0,
    'Ký túc xá ĐHQG TP.HCM khu B',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    NOW(),
    NOW()
),

-- 12. SV25KKK0136 - Vệ sinh cảnh quan KTX 1-6/2025
(
    gen_random_uuid(),
    'TNV HỖ TRỢ VỆ SINH, CHĂM SÓC CẢNH QUAN TẠI KTX ĐHQG-HCM 1-6.2025',
    'Tình nguyện viên hỗ trợ vệ sinh và chăm sóc cảnh quan tại Ký túc xá ĐHQG TP.HCM từ tháng 1 đến tháng 6 năm 2025',
    '8a1dd0d1-5d07-4d38-8a3c-18e94d8508bf'::uuid,
    '3f68f818-6ff1-49e0-80df-010b5ad2ba77'::uuid,
    '2025-01-15'::timestamp,
    '2025-06-15'::timestamp,
    0.5,
    'Ký túc xá ĐHQG TP.HCM khu B',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    NOW(),
    NOW()
);

-- Thống kê sau khi insert
SELECT 
    'Tổng số hoạt động đã thêm:' as description,
    COUNT(*) as count
FROM ctxh_activity
WHERE organization_id = '3f68f818-6ff1-49e0-80df-010b5ad2ba77'::uuid
    AND created_by = '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid
    AND status = 'ACTIVE';

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
ORDER BY start_date DESC;
