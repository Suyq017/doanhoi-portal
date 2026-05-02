-- Auto-generated SQL from eva_datasheet.xlsx
-- Generated at: 2026-05-01 08:50:44
-- Total rows: 162
-- Created by: 9fb5a583-0d4d-4102-8bda-aaae7ab63a32

TRUNCATE TABLE ctxh_activity RESTART IDENTITY CASCADE;

-- [1/162] BD25CTX0001 | Liên chi đoàn Bảo dưỡng CN
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '[BDCN] DỌN XƯỞNG SAU TẾT',
    '[BDCN] DỌN XƯỞNG SAU TẾT',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    '17568d1e-ba64-4941-bb0a-64b8f2f0e3f2'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    5,
    'ĐHBK',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-02-09'::timestamp,
    NOW()
);

-- [2/162] BD25CTX0002 | Liên chi đoàn Bảo dưỡng CN
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '[BDCN] HỖ TRỢ LỄ TỐT NGHIỆP 5/5/2026',
    '[BDCN] HỖ TRỢ LỄ TỐT NGHIỆP 5/5/2026',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    '17568d1e-ba64-4941-bb0a-64b8f2f0e3f2'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'ĐHBK',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-05-05'::timestamp,
    NOW()
);

-- [3/162] BD25HTR0001 | Liên chi đoàn Bảo dưỡng CN
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '[BDCN] CTV TVTS 5/5/2026',
    '[BDCN] CTV TVTS 5/5/2026',
    'b7718b9a-50ce-4857-8b2c-2234f4a0eb99'::uuid,
    '17568d1e-ba64-4941-bb0a-64b8f2f0e3f2'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'ĐHBK',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-03-09'::timestamp,
    NOW()
);

-- [4/162] BD25HTR0002 | Liên chi đoàn Bảo dưỡng CN
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'CTV TVTS 5/5/2026',
    'CTV TVTS 5/5/2026',
    'b7718b9a-50ce-4857-8b2c-2234f4a0eb99'::uuid,
    '17568d1e-ba64-4941-bb0a-64b8f2f0e3f2'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'DHBK',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-03-31'::timestamp,
    NOW()
);

-- [5/162] BD25HTR0003 | Liên chi đoàn Bảo dưỡng CN
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '[BDCN] HỖ TRỢ TVTS 5/5/2026',
    '[BDCN] HỖ TRỢ TVTS 5/5/2026',
    'b7718b9a-50ce-4857-8b2c-2234f4a0eb99'::uuid,
    '17568d1e-ba64-4941-bb0a-64b8f2f0e3f2'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'ĐHBK',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-07-18'::timestamp,
    NOW()
);

-- [6/162] BD25HTR0004 | Liên chi đoàn Bảo dưỡng CN
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '[BDCN] HỖ TRỢ TVTS 5/5/2026',
    '[BDCN] HỖ TRỢ TVTS 5/5/2026',
    'b7718b9a-50ce-4857-8b2c-2234f4a0eb99'::uuid,
    '17568d1e-ba64-4941-bb0a-64b8f2f0e3f2'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'ĐHBK',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-07-18'::timestamp,
    NOW()
);

-- [7/162] CK25CTX0001 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'CỘNG TÁC VIÊN HỖ TRỢ TỔ CHỨC HỘI THẢO GIỚI THIỆU CHƯƠNG TRÌNH DAIKIN NEXTGEN',
    'CỘNG TÁC VIÊN HỖ TRỢ TỔ CHỨC HỘI THẢO GIỚI THIỆU CHƯƠNG TRÌNH DAIKIN NEXTGEN',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'Trường Đại học Bách Khoa Cơ sở Lý Thường Kiệt',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-01-04'::timestamp,
    NOW()
);

-- [8/162] CK25CTX0002 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'CTV HỖ TRỢ VPĐ KHOA CƠ KHÍ',
    'CTV HỖ TRỢ VPĐ KHOA CƠ KHÍ',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    7,
    'Trường Đại học Bách Khoa Cơ sở Lý Thường Kiệt',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-01-24'::timestamp,
    NOW()
);

-- [9/162] CK25CTX0003 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'CỘNG TÁC VIÊN HỖ TRỢ DỌN DẸP BỘ MÔN CÔNG NGHỆ NHIỆT LẠNH 11 12',
    'CỘNG TÁC VIÊN HỖ TRỢ DỌN DẸP BỘ MÔN CÔNG NGHỆ NHIỆT LẠNH 11 12',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    2,
    'Trường Đại học Bách Khoa Cơ sở Lý Thường Kiệt',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-01-25'::timestamp,
    NOW()
);

-- [10/162] CK25CTX0004 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'CỘNG TÁC VIÊN HỖ TRỢ TỔ CHỨC SỰ KIỆN LỄ BÀN GIAO PHÒNG THÍ NGHIỆM GIẢI PHÁP HVAC VÀ HỘI THẢO ĐÀO TẠO HVAC VÀ GIỚI THIỆU FRESHER PROGRAM TỪ CÔNG TY PANASONIC',
    'CỘNG TÁC VIÊN HỖ TRỢ TỔ CHỨC SỰ KIỆN LỄ BÀN GIAO PHÒNG THÍ NGHIỆM GIẢI PHÁP HVAC VÀ HỘI THẢO ĐÀO TẠO HVAC VÀ GIỚI THIỆU FRESHER PROGRAM TỪ CÔNG TY PANASONIC',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'CỘNG TÁC VIÊN HỖ TRỢ TỔ CHỨC SỰ KIỆN LỄ BÀN GIAO PHÒNG THÍ NGHIỆM GIẢI PHÁP HVAC VÀ HỘI THẢO ĐÀO TẠO HVAC VÀ GIỚI THIỆU FRESHER PROGRAM TỪ CÔNG TY PANASONIC',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-01-25'::timestamp,
    NOW()
);

-- [11/162] CK25CTX0005 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'CTV HỖ TRỢ VĂN NGHỆ NGÀY HỘI KỸ THUẬT 2026',
    'CTV HỖ TRỢ VĂN NGHỆ NGÀY HỘI KỸ THUẬT 2026',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'Tòa B11, 268 Lý Thường Kiệt, Phường 14, Quận 10, Thành phố Hồ Chí Minh',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-02-04'::timestamp,
    NOW()
);

-- [12/162] CK25CTX0006 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'CTV HỖ TRỢ DỌN DẸP PHÒNG BỘ MÔN Kỹ thuật Hệ thống Công nghiệp',
    '* Thời gian: 14 giờ - 17 giờ, Thứ Hai ngày 5/5/2026.
* Địa điểm: Phòng Bộ môn Kỹ thuật Hệ thống Công nghiệp, Trường Đại học Bách Khoa ĐHQG-HCM, cơ sở Lý Thường Kiệt.',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'Phòng Bộ môn Kỹ thuật Hệ thống Công nghiệp, Trường Đại học Bách Khoa ĐHQG-HCM, cơ sở Lý Thường Kiệt',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-02-17'::timestamp,
    NOW()
);

-- [13/162] CK25CTX0007 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'CTV HỖ TRỢ DỌN DẸP PHÒNG THÍ NGHIỆM 710H1 VÀ TỔ CHỨC LỄ NHẬN TÀI TRỢ TỪ CÔNG TY TNHH JABIL VIỆT NAM',
    '* Thời gian: 13h00-17h00, ngày5/5/2026
* Địa điểm: H1-710, Trường Đại học Bách khoa, cơ sở Dĩ An.',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'H1-710, Trường Đại học Bách khoa, cơ sở Dĩ An.',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-02-24'::timestamp,
    NOW()
);

-- [14/162] CK25CTX0008 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'CTV HỖ TRỢ DỌN DẸP, SẮP XẾP PHÒNG BỘ MÔN KTHTCN CS DĨ AN',
    '* Thời gian: 07 giờ - 11 giờ, Thứ Hai ngày 5/5/2026
* Địa điểm: Phòng Bộ môn Kỹ thuật Hệ thống Công nghiệp (407 H1), Trường Đại học Bách Khoa ĐHQG-HCM, cơ sở Dĩ An.',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'Phòng Bộ môn Kỹ thuật Hệ thống Công nghiệp (407 H1), Trường Đại học Bách Khoa ĐHQG-HCM, cơ sở Dĩ An',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-02-27'::timestamp,
    NOW()
);

-- [15/162] CK25CTX0009 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'CTV THAM GIA DỌN VỆ SINH PHÒNG THÍ NGHIỆM THIẾT KẾ VÀ GIA CÔNG TIÊN TIẾN',
    'CTV THAM GIA DỌN VỆ SINH PHÒNG THÍ NGHIỆM THIẾT KẾ VÀ GIA CÔNG TIÊN TIẾN',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    2,
    'Trường Đại học Bách Khoa Cơ sở Lý Thường Kiệt',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-03-07'::timestamp,
    NOW()
);

-- [16/162] CK25CTX0010 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Dọn vệ sinh PTN 201-C1 và 201X-C1',
    'Dọn vệ sinh PTN 201-C1 và 201X-C1',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'PTN 201-C1 và 201X-C1, cơ sở Lý Thường Kiệt',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-03-23'::timestamp,
    NOW()
);

-- [17/162] CK25CTX0011 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Hỗ trợ dọn dẹp PTN Đo lường - Khoa Cơ khí',
    'Dọn dẹp PTN Đo lường 202 B11 từ 25/4 đến 27/4',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    3,
    '202 B11, cơ sở Lý Thường Kiệt',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-04-08'::timestamp,
    NOW()
);

-- [18/162] CK25CTX0012 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Làm vệ sinh, sắp xếp, vận chuyển máy móc trang thiết bị PTN bộ môn Chế Tạo Máy',
    'Làm vệ sinh, sắp xếp, vận chuyển máy móc trang thiết bị PTN bộ môn Chế Tạo Máy',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    2,
    '104C1, Cơ sở Lý Thường Kiệt',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-05-15'::timestamp,
    NOW()
);

-- [19/162] CK25CTX0013 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Dọn vệ sinh xưởng C1 vào ngày 20 tháng 04 năm 2026',
    'Dọn vệ sinh xưởng C1 vào ngày 20 tháng 04 năm 2026',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'cơ sở Lý Thường Kiệt, quận 10, Tp. Hồ Chí Minh',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-07-10'::timestamp,
    NOW()
);

-- [20/162] CK25CTX0014 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'CTV DỌN VỆ SINH VĂN PHÒNG ĐOÀN THANH NIÊN - LIÊN CHI HỘI SINH VIÊN KHOA CƠ KHÍ',
    'CTV DỌN VỆ SINH VĂN PHÒNG ĐOÀN THANH NIÊN - LIÊN CHI HỘI SINH VIÊN KHOA CƠ KHÍ',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    2,
    'cơ sở Lý Thường Kiệt, quận 10, Tp. Hồ Chí Minh',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-07-14'::timestamp,
    NOW()
);

-- [21/162] CK25CTX0015 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Tân Trang Bộ Môn Công Nghệ Nhiệt Lạnh (Tòa nhà B5) - Đợt 2',
    'Tân Trang Bộ Môn Công Nghệ Nhiệt Lạnh (Tòa nhà B5) - Đợt 2
Thời gian: từ Thứ Hai (5/5/2026) tới hết Chủ Nhật (5/5/2026) với mỗi ngày bắt đầu từ 09h00 tới 18h00',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    4,
    'cơ sở Lý Thường Kiệt, quận 10, Tp. Hồ Chí Minh',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-08-04'::timestamp,
    NOW()
);

-- [22/162] CK25CTX0016 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Tân Trang Bộ Môn Công Nghệ Nhiệt Lạnh (Tòa nhà B5) - Đợt 1',
    'Tân Trang Bộ Môn Công Nghệ Nhiệt Lạnh (Tòa nhà B5) - Đợt 1
Thời gian: từ Chủ Nhật (26/04/2026) tới hết Thứ Tư (29/04/2026) với mỗi ngày bắt đầu từ 09h00 tới 18h00',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    4,
    'cơ sở Lý Thường Kiệt, quận 10, Tp. Hồ Chí Minh',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-08-04'::timestamp,
    NOW()
);

-- [23/162] CK25CTX0017 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Dọn vệ sinh PTN 201-C1 và 201X-C1',
    'Thời gian: 8h-11h ngày 5/5/2026
Địa điểm: Phòng 201-C1 và 201X-C1
Đơn vị tổ chức: BM Kỹ thuật Hệ thống Công nghiệp',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'cơ sở 1, P. Diên Hồng',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-08-05'::timestamp,
    NOW()
);

-- [24/162] CK25CTX0018 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Vệ sinh PTN công nghệ thiết kế và gia công tiên tiến Khoa Cơ khí',
    'Thời gian: 13h -17h, chủ nhật ngày 5/5/2026
Địa điểm: Trường ĐH Bách Khoa - Cơ Sở 1- Phòng thí nghiệm thiết kế và gia công tiên tiến.',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'cơ sở 1, P. Diên Hồng',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-08-07'::timestamp,
    NOW()
);

-- [25/162] CK25CTX0019 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Sắp xếp, vận chuyển bàn ghế của PTN bộ môn Chế Tạo Máy và PTN Thủy lực (Trung Tâm Bảo dưỡng công nghiệp)',
    'Sắp xếp, vận chuyển bàn ghế của PTN bộ môn Chế Tạo Máy và PTN Thủy lực (Trung Tâm Bảo dưỡng công nghiệp)
Thời gian: 8h00-16h00 ngày 5/5/2026
Địa điểm: 104C1, Cơ sở 1',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'cơ sở 1, P. Diên Hồng',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-08-07'::timestamp,
    NOW()
);

-- [26/162] CK25CTX0020 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Sắp xếp, vận chuyển máy móc trang thiết bị PTN bộ môn Chế Tạo Máy',
    'Tên hoạt động: Sắp xếp, vận chuyển máy móc trang thiết bị PTN bộ môn Chế Tạo Máy
Thời gian: 8h00-16h00 ngày 5/5/2026
Địa điểm: 104C1, Cơ sở 1',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'cơ sở 1, P. Diên Hồng',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-08-07'::timestamp,
    NOW()
);

-- [27/162] CK25CTX0021 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Dọn vệ sinh PTN 201-C1 và 201X-C1',
    'Thời gian: 8h-12h ngày 5/5/2026
Địa điểm: Phòng 201-C1 và 201X-C1
Đơn vị tổ chức: BM Kỹ thuật Hệ thống Công nghiệp',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'cơ sở 1, P. Diên Hồng',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-08-07'::timestamp,
    NOW()
);

-- [28/162] CK25CTX0022 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'CỘNG TÁC VIÊN DỌN DẸP PHÒNG 103C1',
    '1. Địa điểm: phòng 103 xưởng C1 trường Đại học Bách khoa Thành phố Hồ Chí Minh - cơ sở 1
2. Giám sát chính: Lê Phước Hòa
3. Thông tin liên lạc: 0389923266
4. Ngày hoạt động: 5/5/2026',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'cơ sở 1, P. Diên Hồng',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-08-08'::timestamp,
    NOW()
);

-- [29/162] CK25CTX0023 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'DỌN DẸP VỆ SINH VĂN PHÒNG SAU CHIẾN DỊCH MÙA HÈ XANH 2026',
    'Thời gian: 8h-16h30 thứ 6 ngày 24/4/2026
Địa điểm: 104 B11 - cơ sở 1
Đơn vị tổ chức: Ban Chấp hành Liên Chi hội Sinh viên khoa Cơ khí',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'cơ sở 1, P. Diên Hồng',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-08-08'::timestamp,
    NOW()
);

-- [30/162] CK25CTX0024 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'HỖ TRỢ DI DỜI PHÒNG THÍ NGHIỆM 104C1 KHOA CƠ KHÍ',
    '1. Địa điểm: xưởng C1 trường Đại học Bách khoa Thành phố Hồ Chí Minh - cơ sở 1
2. Giám sát chính: Lê Phước Hòa
3. Thông tin liên lạc: 0389923266
4. Ngày hoạt động: 5/5/2026',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'cơ sở 1, P. Diên Hồng',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-08-11'::timestamp,
    NOW()
);

-- [31/162] CK25CTX0025 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'DỌN DẸP XƯỞNG C3',
    'Tên hoạt động: Dọn dẹp xưởng C3
Thời gian: 8h-5/5/2026
Địa điểm: C3
Đơn vị tổ chức: Bộ môn Máy Xây dựng và Nâng chuyển',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'cơ sở 1, P. Diên Hồng',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-08-12'::timestamp,
    NOW()
);

-- [32/162] CK25CTX0026 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'TỔ CHỨC DỌN VỆ SINH VĂN PHÒNG ĐOÀN THANH NIÊN - LIÊN CHI HỘI SINH VIÊN KHOA CƠ KHÍ',
    'TỔ CHỨC DỌN VỆ SINH VĂN PHÒNG ĐOÀN THANH NIÊN - LIÊN CHI HỘI SINH VIÊN KHOA CƠ KHÍ',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'cơ sở 1, P. Diên Hồng',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-08-18'::timestamp,
    NOW()
);

-- [33/162] CK25CTX0027 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'HỖ TRỢ XƯỞNG C1 ngày 5/5/2026',
    'hỗ trợ dọn dẹp, sắp xếp xưởng',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'cơ sở 1, P. Diên Hồng',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-08-21'::timestamp,
    NOW()
);

-- [34/162] CK25CTX0028 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'SẮP XẾP BÀN, GHẾ KHU VỰC HÀNH LANG XƯỞNG C1, TÒA B11 NGÀY 5/5/2026',
    'hành lang xưởng C1, hành lang tòa B11 trường Đại học Bách khoa Thành phố Hồ Chí Minh - cơ sở 1',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'cơ sở 1, P. Diên Hồng',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-08-21'::timestamp,
    NOW()
);

-- [35/162] CK25CTX0029 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'HỖ TRỢ DI DỜI PHÒNG THÍ NGHIỆM NGÀY 5/5/2026',
    'xưởng C1 trường Đại học Bách khoa Thành phố Hồ Chí Minh - cơ sở 1',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'cơ sở 1, P. Diên Hồng',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-08-21'::timestamp,
    NOW()
);

-- [36/162] CK25CTX0030 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'HỖ TRỢ XƯỞNG C1 NGÀY 5/5/2026',
    'HỖ TRỢ XƯỞNG C1 NGÀY 5/5/2026',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'cơ sở 1, P. Diên Hồng',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-08-26'::timestamp,
    NOW()
);

-- [37/162] CK25CTX0031 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'HỖ TRỢ BỘ MÔN KỸ THUẬT HỆ THỐNG CÔNG NGHIỆP 22 - 24 -25/4/2026',
    '1. Địa điểm: phòng 101 tòa B11 Trường Đại học Bách khoa - ĐHQG-HCM - cơ sở 1
2. Ngày hoạt động: 22 - 24 - 25/4/2026',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    3,
    'cơ sở 1, P. Diên Hồng',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-09-01'::timestamp,
    NOW()
);

-- [38/162] CK25CTX0032 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'CÁC HOẠT ĐỘNG DI DỜI THIẾT BỊ VÀ DỌN DẸP PHÒNG THÍ NGHIỆM THUỘC KHOA CƠ KHÍ NGÀY 5/5/2026',
    '"Bao gồm:
1/ Hỗ trợ sắp xếp PTN thủy lực
2/ Hỗ trợ Bộ môn KT Dệt may di dời máy
3/ Hỗ trợ di dời máy ở xưởng C1"',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'cơ sở 1, P. Diên Hồng',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-09-24'::timestamp,
    NOW()
);

-- [39/162] CK25CTX0033 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'HỖ TRỢ BỘ MÔN KỸ THUẬT DỆT MAY DI DỜI MÁY 5/5/2026',
    'Địa điểm: Phòng 102-B11 trường Đại học Bách khoa Thành phố Hồ Chí Minh - cơ sở 1',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'cơ sở 1, P. Diên Hồng',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-09-26'::timestamp,
    NOW()
);

-- [40/162] CK25CTX0034 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'CTV hỗ trợ di dời máy xưởng hàn sang C1',
    'CTV hỗ trợ di dời máy xưởng hàn sang C1',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'cơ sở 1, P. Diên Hồng',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-10-06'::timestamp,
    NOW()
);

-- [41/162] CK25CTX0035 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'HỖ TRỢ BỘ MÔN KỸ THUẬT HỆ THỐNG CÔNG NGHIỆP 5/5/2026',
    'HỖ TRỢ BỘ MÔN KỸ THUẬT HỆ THỐNG CÔNG NGHIỆP 5/5/2026',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'phòng 101 tòa B11 trường Đại học Bách khoa Thành phố Hồ Chí Minh - cơ sở 1',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-10-06'::timestamp,
    NOW()
);

-- [42/162] CK25CTX0036 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'VỆ SINH PHÒNG THÍ NGHIỆM THIẾT KẾ VÀ GIA CÔNG TIÊN TIẾN 5/5/2026',
    '9h -15h, thứ Hai ngày 5/5/2026',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'cơ sở 1, P. Diên Hồng',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-10-07'::timestamp,
    NOW()
);

-- [43/162] CK25CTX0037 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Tham gia Tổng vệ sinh Xưởng thực hành Dệt May ngày 5/5/2026',
    'Tên hoạt động: Tham gia Tổng vệ sinh Xưởng thực hành Dệt May ngày 5/5/2026
Thời gian: 08g30 - 14g30, ngày 5/5/2026
Địa điểm: Xưởng thực hành dệt may (P102-B11), Trường Đại học Bách khoa (cơ sở 268 Lý Thường Kiệt)
Đơn vị tổ chức: Bộ môn Kỹ thuật Dệt may, Khoa Cơ khí
Người phụ trách (kèm SĐT): Thầy Võ Đình Khải (0344919404)',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'cơ sở 1, P. Diên Hồng',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-10-13'::timestamp,
    NOW()
);

-- [44/162] CK25CTX0038 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'HỖ TRỢ BỘ MÔN KỸ THUẬT HỆ THỐNG CÔNG NGHIỆP THÁNG 4/2026',
    'HỖ TRỢ BỘ MÔN KỸ THUẬT HỆ THỐNG CÔNG NGHIỆP tháng 4.2026 (sáng và chiều)
có di chuyển nặng nhọc (thùng đồ án, luận văn)',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    3,
    'cơ sở 1, P. Diên Hồng',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-10-17'::timestamp,
    NOW()
);

-- [45/162] CK25CTX0039 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Cộng tác viên Di dời máy móc thí nghiệm sửa chửa Xưởng Thực hành Dệt May 5/5/2026',
    'Thời gian: 08g00 - 12g00, ngày 5/5/2026
Địa điểm: Xưởng thực hành dệt may (P102-B11), Trường Đại học Bách khoa (cơ sở 268 Lý Thường Kiệt)',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'cơ sở 1, P. Diên Hồng',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-11-29'::timestamp,
    NOW()
);

-- [46/162] CK25CTX0040 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'HỖ TRỢ BỘ MÔN KỸ THUẬT HỆ THỐNG CÔNG NGHIỆP THÁNG 4/2026',
    'đợt cập nhật bổ sung các bạn còn lại',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    3,
    'cơ sở 1, P. Diên Hồng',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-12-02'::timestamp,
    NOW()
);

-- [47/162] CK25CTX0041 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'TNV HỖ TRỢ BỘ MÔN THIẾT KẾ MÁY DI DỜI BÀN GHẾ',
    'TNV tham gia hỗ trợ Bộ môn Thiết kế máy di dời bàn ghế ngày 5/5/2026',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'cơ sở 1, P. Diên Hồng',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-12-19'::timestamp,
    NOW()
);

-- [48/162] CK25CTX0042 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'TNV HỖ TRỢ DỌN DẸP, SẮP XẾP BỘ MÔN KTHTCN CS2 - 5/5/2026',
    'TNV tham gia hỗ trợ Bộ môn dọn dẹp, sắp xếp PTN ở Cơ sở 2, tạo môi trường sạch sẽ, an toàn cho việc học và nâng cao nhận thức về lao động',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'cơ sở 2, P. Đông Hòa',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-12-19'::timestamp,
    NOW()
);

-- [49/162] CK25CTX0043 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'TNV THAM GIA HỖ TRỢ DI DỜI, SẮP XẾP THIẾT BỊ Ở XƯỞNG CƠ KHÍ C1 NGÀY 20 - 21/4/2026',
    'TNV tham gia hỗ trợ xưởng C1 di dời, sắp xếp thiết bị trong các ngày 20, 21/4/2026',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    2,
    'cơ sở 1, P. Diên Hồng',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-12-27'::timestamp,
    NOW()
);

-- [50/162] CK25DHT0002 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'TỔ CHỨC HOẠT ĐỘNG TRUNG THU 2026 TẠI TRƯỜNG TIỂU HỌC DƯƠNG VĂN LỊCH - XÃ HIỆP PHƯỚC - TP.HCM NGÀY 5/5/2026',
    '“TÔ TRĂNG VÀNG – VẼ HẠNH PHÚC” 2026',
    '5c115914-72da-436b-9a95-9af0d15f4689'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    2,
    'cơ sở 1, P. Diên Hồng',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-11-27'::timestamp,
    NOW()
);

-- [51/162] CK25HTH0001 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'TỔ CHỨC CUỘC THI "MECHANICAL ENGINEERING ROBOT CONTEST" 2026 - LỄ PHÁT ĐỘNG',
    'TỔ CHỨC CUỘC THI "MECHANICAL ENGINEERING ROBOT CONTEST" 2026 - LỄ PHÁT ĐỘNG',
    'd2fb1996-70a9-44ff-bae0-2c482e32ef90'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'cơ sở 1, P. Diên Hồng',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-08-18'::timestamp,
    NOW()
);

-- [52/162] CK25HTH0002 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'TỔ CHỨC CUỘC THI "MECHANICAL ENGINEERING ROBOT CONTEST" 2026 - WORKSHOP ROBOT 1',
    'TỔ CHỨC CUỘC THI "MECHANICAL ENGINEERING ROBOT CONTEST" 2026 - WORKSHOP ROBOT 1',
    'd2fb1996-70a9-44ff-bae0-2c482e32ef90'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'cơ sở 1, P. Diên Hồng',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-08-18'::timestamp,
    NOW()
);

-- [53/162] CK25HTH0003 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'TỔ CHỨC CUỘC THI "MECHANICAL ENGINEERING ROBOT CONTEST" 2026 - WORKSHOP ROBOT 2',
    'TỔ CHỨC CUỘC THI "MECHANICAL ENGINEERING ROBOT CONTEST" 2026 - WORKSHOP ROBOT 2',
    'd2fb1996-70a9-44ff-bae0-2c482e32ef90'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'cơ sở 2, P. Đông Hòa',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-08-18'::timestamp,
    NOW()
);

-- [54/162] CK25HTH0004 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'TỔ CHỨC CUỘC THI "MECHANICAL ENGINEERING ROBOT CONTEST" 2026 - VÒNG SƠ LOẠI',
    'TỔ CHỨC CUỘC THI "MECHANICAL ENGINEERING ROBOT CONTEST" 2026 - VÒNG SƠ LOẠI',
    'd2fb1996-70a9-44ff-bae0-2c482e32ef90'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'cơ sở 2, P. Đông Hòa',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-08-18'::timestamp,
    NOW()
);

-- [55/162] CK25HTH0005 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'TỔ CHỨC CUỘC THI "MECHANICAL ENGINEERING ROBOT CONTEST" 2026 - VÒNG BẢNG',
    'TỔ CHỨC CUỘC THI "MECHANICAL ENGINEERING ROBOT CONTEST" 2026 - VÒNG BẢNG',
    'd2fb1996-70a9-44ff-bae0-2c482e32ef90'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'Địa điểm: Trung tâm hội chợ và Triễn lãm Sài Gòn (SECC)',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-08-18'::timestamp,
    NOW()
);

-- [56/162] CK25HTH0006 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'TỔ CHỨC CUỘC THI "MECHANICAL ENGINEERING ROBOT CONTEST" 2026 - VÒNG BÁN KẾT VÀ CHUNG KẾT',
    'TỔ CHỨC CUỘC THI "MECHANICAL ENGINEERING ROBOT CONTEST" 2026 - VÒNG BÁN KẾT VÀ CHUNG KẾT',
    'd2fb1996-70a9-44ff-bae0-2c482e32ef90'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'Địa điểm: Trung tâm hội chợ và Triễn lãm Sài Gòn (SECC)',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-08-18'::timestamp,
    NOW()
);

-- [57/162] CK25HTH0007 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'CTV hỗ trợ tổ chức Hội thảo “Dệt may 4.0: Hành trình tối ưu quy trình và nâng cao chất lượng bền vững”',
    'bao gồm:
- hỗ trợ tổ chức, lễ tân – hậu cần, điều phối chương trình ngày 5/5/2026
- hỗ trợ hậu cần, kỹ thuật, chuẩn bị sân khấu – trang thiết bị, điều phối chương trình chung kết ngày 5/5/2026',
    'd2fb1996-70a9-44ff-bae0-2c482e32ef90'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    2,
    'cơ sở 1, P. Diên Hồng',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-12-11'::timestamp,
    NOW()
);

-- [58/162] CK25HTR0001 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'CTV HỖ TRỢ SÂN CHƠI KHOA HỌC',
    'CTV HỖ TRỢ SÂN CHƠI KHOA HỌC',
    'b7718b9a-50ce-4857-8b2c-2234f4a0eb99'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    2,
    'Trường Đại học Bách Khoa Cơ sở Lý Thường Kiệt',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-01-04'::timestamp,
    NOW()
);

-- [59/162] CK25HTR0002 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'CTV HỖ TRỢ HẬU CẦN TỔ CHỨC HỘI TRẠI',
    'CTV HỖ TRỢ HẬU CẦN TỔ CHỨC HỘI TRẠI',
    'b7718b9a-50ce-4857-8b2c-2234f4a0eb99'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    5,
    'Trường Đại học Bách Khoa Cơ sở Lý Thường Kiệt',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-01-05'::timestamp,
    NOW()
);

-- [60/162] CK25HTR0003 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'CTV HỖ TRỢ TỔ CHỨC WORKSHOP BUỔI 1 VÀ BUỔI 2',
    'CTV HỖ TRỢ TỔ CHỨC WORKSHOP BUỔI 1 VÀ BUỔI 2',
    'b7718b9a-50ce-4857-8b2c-2234f4a0eb99'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    2,
    'Trường Đại học Bách Khoa Cơ sở Dĩ An',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-01-05'::timestamp,
    NOW()
);

-- [61/162] CK25HTR0004 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Cộng tác viên hỗ trợ Vòng chung kết Cuộc thi “Vòng đời mới cho sản phẩm tái chế”',
    'Cộng tác viên hỗ trợ Vòng chung kết Cuộc thi
“Vòng đời mới cho sản phẩm tái chế”',
    'b7718b9a-50ce-4857-8b2c-2234f4a0eb99'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'Trường Đại học Bách Khoa Cơ sở Lý Thường Kiệt',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-01-24'::timestamp,
    NOW()
);

-- [62/162] CK25HTR0005 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Cộng tác viên hỗ trợ Lễ trao học bổng Nguyễn Văn Lân',
    'Cộng tác viên hỗ trợ Lễ trao học bổng Nguyễn Văn Lân',
    'b7718b9a-50ce-4857-8b2c-2234f4a0eb99'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'Trường Đại học Bách Khoa Cơ sở Lý Thường Kiệt',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-01-24'::timestamp,
    NOW()
);

-- [63/162] CK25HTR0006 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'CTV HỖ TRỢ HỘI NGHỊ ICRESM 2024 HỘI TRƯỜNG B4',
    'CTV HỖ TRỢ HỘI NGHỊ ICRESM 2026 HỘI TRƯỜNG B4',
    'b7718b9a-50ce-4857-8b2c-2234f4a0eb99'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    3,
    'Trường Đại học Bách Khoa Cơ sở Lý Thường Kiệt',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-01-25'::timestamp,
    NOW()
);

-- [64/162] CK25HTR0007 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'CỘNG TÁC VIÊN HỖ TRỢ TỔ CHỨC GIẢI CẦU LÔNG HRE BADMINTON LẦN 2 NĂM 2026',
    'CỘNG TÁC VIÊN HỖ TRỢ TỔ CHỨC GIẢI CẦU LÔNG HRE BADMINTON LẦN 2 NĂM 2026',
    'b7718b9a-50ce-4857-8b2c-2234f4a0eb99'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    2,
    'Trường Đại học Bách Khoa Cơ sở Lý Thường Kiệt',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-01-26'::timestamp,
    NOW()
);

-- [65/162] CK25HTR0008 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'CTV HỖ TRỢ HỘI NGHỊ HỘI THẢO QUỐC TẾ LOGISTICS VÀ QUẢN LÝ CHUỖI CUNG ỨNG HCMUT-KMOU LẦN 3 - NĂM 2026',
    'CTV HỖ TRỢ HỘI NGHỊ HỘI THẢO QUỐC TẾ LOGISTICS VÀ QUẢN LÝ CHUỖI CUNG ỨNG HCMUT-KMOU LẦN 3 - NĂM 2026',
    'b7718b9a-50ce-4857-8b2c-2234f4a0eb99'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    4,
    'Trường Đại học Bách Khoa Cơ sở Lý Thường Kiệt',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-02-11'::timestamp,
    NOW()
);

-- [66/162] CK25HTR0009 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'CTV HỖ TRỢ TỔ CHỨC PORT MANAGEMENT IN MODERN AGE: A LOGISTICS PERSPECTIVE',
    'CTV HỖ TRỢ TỔ CHỨC PORT MANAGEMENT IN MODERN AGE: A LOGISTICS PERSPECTIVE',
    'b7718b9a-50ce-4857-8b2c-2234f4a0eb99'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    2,
    'Trường Đại học Bách Khoa Cơ sở Lý Thường Kiệt',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-02-12'::timestamp,
    NOW()
);

-- [67/162] CK25HTR0010 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'CỘNG TÁC VIÊN HỖ TRỢ TỔ CHỨC HỘI THẢO "DR ENERGY RECOVERY VENTILATOR", TRAO TẶNG THIẾT BỊ VÀ HỌC BỔNG DR FAN',
    'CỘNG TÁC VIÊN HỖ TRỢ TỔ CHỨC HỘI THẢO "DR ENERGY RECOVERY VENTILATOR", TRAO TẶNG THIẾT BỊ VÀ HỌC BỔNG DR FAN',
    'b7718b9a-50ce-4857-8b2c-2234f4a0eb99'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'Trường Đại học Bách Khoa Cơ sở Lý Thường Kiệt',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-02-24'::timestamp,
    NOW()
);

-- [68/162] CK25HTR0011 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Sinh viên tham gia chương trình BK Youth Awards - khoa Cơ khí',
    'Sinh viên tham gia chương trình BK Youth Awards - khoa Cơ khí',
    'b7718b9a-50ce-4857-8b2c-2234f4a0eb99'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'Trường Đại học Bách Khoa Cơ sở Lý Thường Kiệt',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-02-24'::timestamp,
    NOW()
);

-- [69/162] CK25HTR0012 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'SV CƠ KHÍ THAM DỰ LỄ KHỞI ĐỘNG THÁNG THANH NIÊN 5/5/2026',
    '- Thời gian: 07g30 - 10g00 ngày 20/04/2026 (thứ Hai).
- Địa điểm: Hội trường B4 – Trường Đại học Bách khoa – ĐHQG-HCM – cơ sở Lý Thường Kiệt.',
    'b7718b9a-50ce-4857-8b2c-2234f4a0eb99'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'Hội trường B4 – Trường Đại học Bách khoa – ĐHQG-HCM – cơ sở Lý Thường Kiệt',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-03-04'::timestamp,
    NOW()
);

-- [70/162] CK25HTR0013 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'CỘNG TÁC VIÊN HỖ TRỢ BỘ MÔN CÔNG NGHỆ NHIỆT LẠNH TẠI NGÀY HỘI TƯ VẤN TUYỂN SINH 2026',
    'CỘNG TÁC VIÊN HỖ TRỢ BỘ MÔN CÔNG NGHỆ NHIỆT LẠNH TẠI NGÀY HỘI TƯ VẤN TUYỂN SINH 2026',
    'b7718b9a-50ce-4857-8b2c-2234f4a0eb99'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    2,
    'Trường Đại học Bách Khoa Cơ sở Lý Thường Kiệt',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-03-07'::timestamp,
    NOW()
);

-- [71/162] CK25HTR0014 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'CỘNG TÁC VIÊN HỖ TRỢ TỔ CHỨC HỘI THẢO "CÁC GIẢI PHÁP LÀM SẠCH KHÔNG KHÍ" VÀ LỄ TRAO HỌC BỔNG AIR FILTECH',
    'CỘNG TÁC VIÊN HỖ TRỢ TỔ CHỨC HỘI THẢO "CÁC GIẢI PHÁP LÀM SẠCH KHÔNG KHÍ" VÀ LỄ TRAO HỌC BỔNG AIR FILTECH',
    'b7718b9a-50ce-4857-8b2c-2234f4a0eb99'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'Trường Đại học Bách Khoa Cơ sở Lý Thường Kiệt',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-03-07'::timestamp,
    NOW()
);

-- [72/162] CK25HTR0015 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'TẾT SINH VIÊN KHOA CƠ KHÍ “MẦM XUÂN”.',
    'Từ 18h00 đến 21h00 ngày 5/5/2026.
Phòng 114 tòa BK.B6, Trường Đại học Bách khoa - ĐHQG HCM, cơ sở Dĩ An.
Đội Xung Kích Khoa Cơ Khí - CK GEAR Team.',
    'b7718b9a-50ce-4857-8b2c-2234f4a0eb99'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    2,
    'Phòng 114 tòa BK.B6, Trường Đại học Bách khoa - ĐHQG HCM, cơ sở Dĩ An.',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-03-13'::timestamp,
    NOW()
);

-- [73/162] CK25HTR0016 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'HOẠT ĐỘNG ĐÓN TÂN SINH VIÊN NHÓM NGÀNH KTHTCN 2026',
    'chuỗi hoạt động chào mừng tân sinh viên nhóm ngành KTHTCN khóa 2026',
    'b7718b9a-50ce-4857-8b2c-2234f4a0eb99'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    2,
    'cơ sở Dĩ An, Bình Dương',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-03-23'::timestamp,
    NOW()
);

-- [74/162] CK25HTR0017 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'HỖ TRỢ TỔ CHỨC BK FAMILY DAY 2026',
    '1. Địa điểm: Cơ sở Lý Thường Kiệt
2. Ngày hoạt động: 5/5/2026
3. Công việc: Chuẩn bị vật tư, đứng trạm trò chơi, tổ chức các trò chơi cho các bé.',
    'b7718b9a-50ce-4857-8b2c-2234f4a0eb99'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    3,
    'cơ sở Lý Thường Kiệt, quận 10, Tp. Hồ Chí Minh',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-08-21'::timestamp,
    NOW()
);

-- [75/162] CK25KKK0001 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'HỖ TRỢ HỘI NGHỊ SINH VIÊN KHOA CƠ KHÍ 2025 - 2026',
    'Sinh viên tham gia hỗ trợ tổ chức Hội nghị SV cấp khoa năm học 2025-2026 cùng với BCH Đoàn Khoa Cơ khí
Sáng ngày 5/5/2026, Hội trường A5',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'Hội trường A5 - Cơ sở Lý Thường Kiệt',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-03-26'::timestamp,
    NOW()
);

-- [76/162] CK25KKK0002 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'SINH VIÊN CƠ KHÍ THAM GIA NGÀY ĐOÀN VIÊN 2026',
    '- Thời gian: 07g30 - 11g30 ngày 5/5/2026 (thứ Hai).
- Địa điểm: Hội trường B4 – Trường Đại học Bách khoa – ĐHQG-HCM – cơ sở Lý Thường Kiệt.
(Căn cứ Kế hoạch số 07-KH/ĐTN ngày 10/3/2026 của Ban Thường vụ Đoàn Trường Đại học Bách khoa)',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'Hội trường B4 – Trường Đại học Bách khoa – ĐHQG-HCM – cơ sở Lý Thường Kiệt.',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-04-03'::timestamp,
    NOW()
);

-- [77/162] CK25KKK0003 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'TỔ CÔNG TÁC HỖ TRỢ TỔ CHỨC HỘI NGHỊ SINH VIÊN KHOA CƠ KHÍ NH 2025 - 2026',
    'Tổ Công tác trực thuộc Ban Chấp hành Đoàn - Hội Khoa Cơ khí, nhiệm vụ hỗ trợ BCN Khoa tổ chức Hội nghị sinh viên',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'Hội trường A5 - Cơ sở Lý Thường Kiệt',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-04-04'::timestamp,
    NOW()
);

-- [78/162] CK25KKK0004 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Hỗ Trợ Tổ Chức Hội Thảo Van Lạnh Công Nghiệp Parker Hannifin 5/5/2026',
    'Tên hoạt động: Hội thảo Van lạnh Công nghiệp Parker Hannifin
Thời gian: chuẩn bị (13h00 - 17h00, Thứ Hai, 5/5/2026) và diễn ra (07h30 - 12h00, Thứ Sáu, 24/04/2025)
Địa điểm: Hội trường B11, Khoa Cơ khí, Trường Đại học Bách khoa - DHQG-HCM
Đơn vị tổ chức: Bộ môn Công nghệ Nhiệt lạnh, Khoa Cơ khí, Trường Đại học Bách khoa - DHQG-HCM
Người phụ trách (kèm SĐT): Ngô Tấn Hoàng Khoa 0395449864',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'Hội trường B11, Khoa Cơ khí, Trường Đại học Bách khoa - DHQG-HCM',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-04-08'::timestamp,
    NOW()
);

-- [79/162] CK25KKK0005 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'CTV HỖ TRỢ CHƯƠNG TRÌNH KỶ NIỆM 26 NĂM THÀNH LẬP BỘ MÔN KTHTCN',
    'CTV hỗ trợ hậu cần, tiết mục văn nghệ, media, truyền thông',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    2,
    'Hội trường B4 – Trường Đại học Bách khoa – ĐHQG-HCM – cơ sở Lý Thường Kiệt',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-04-15'::timestamp,
    NOW()
);

-- [80/162] CK25KKK0006 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'BTC CHƯƠNG TRÌNH KỶ NIỆM 26 NĂM THÀNH LẬP BỘ MÔN KTHTCN',
    'BTC quản lý các phần việc của chương trình',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'Hội trường B4 – Trường Đại học Bách khoa – ĐHQG-HCM – cơ sở Lý Thường Kiệt',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-04-15'::timestamp,
    NOW()
);

-- [81/162] CK25KKK0007 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Hỗ Trợ Đón Đoàn HS Các Trường THPT Đến Tham Quan Trường Đại Học Bách Khoa - DHQG-HCM Vào Ngày 22.04 và 24.04',
    'Hỗ Trợ Đón Đoàn Học Sinh Các Trường THPT Đến Tham Quan Trường Đại Học Bách Khoa - DHQG-HCM Vào Ngày 22.04 và 24.04',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'cơ sở Lý Thường Kiệt, quận 10, Tp. Hồ Chí Minh',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-04-17'::timestamp,
    NOW()
);

-- [82/162] CK25KKK0008 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Sinh Viên Tham Gia Hỗ Trợ Tổ Chức Hội Thảo Panasonic Fresher Program 2026 5/5/2026',
    'Sinh Viên Tham Gia Hỗ Trợ Tổ Chức Hội Thảo Panasonic Fresher Program 2026 5/5/2026',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'cơ sở Lý Thường Kiệt, quận 10, Tp. Hồ Chí Minh',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-05-05'::timestamp,
    NOW()
);

-- [83/162] CK25KKK0009 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'TỔ CHỨC WORKSHOP “LEAN FUNDAMENTAL"',
    'WORKSHOP “LEAN FUNDAMENTAL" được tổ chức vào 5/5/2026',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'cơ sở Dĩ An, Bình Dương',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-05-06'::timestamp,
    NOW()
);

-- [84/162] CK25KKK0010 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Hỗ Trợ Tổ Chức Lễ Trao Học Bổng Thành An E&T và Giới Thiệu Sản Phẩm Quạt Elta Fans và AHU Huber&Ranner',
    'Hỗ Trợ Tổ Chức Lễ Trao Học Bổng Thành An E&T và Giới Thiệu Sản Phẩm Quạt Elta Fans và AHU Huber&Ranner',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'cơ sở Lý Thường Kiệt, quận 10, Tp. Hồ Chí Minh',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-05-09'::timestamp,
    NOW()
);

-- [85/162] CK25KKK0011 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'CTV LỄ TỐT NGHIỆP KHOA CƠ KHÍ 4-2026',
    'CTV LỄ TỐT NGHIỆP KHOA CƠ KHÍ 4-2025 (Quản lý bởi Tổ Công tác của BCH Đoàn - Hội khoa Cơ khí)',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'cơ sở Lý Thường Kiệt, quận 10, Tp. Hồ Chí Minh',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-05-13'::timestamp,
    NOW()
);

-- [86/162] CK25KKK0012 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'TỔ CÔNG TÁC NGHIỆP VỤ SỔ ĐOÀN VIÊN - KHOA CƠ KHÍ - ĐỢT TN 04/2026',
    'TỔ CÔNG TÁC NGHIỆP VỤ SỔ ĐOÀN VIÊN - KHOA CƠ KHÍ - ĐỢT TN 04/2026',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'cơ sở Lý Thường Kiệt, quận 10, Tp. Hồ Chí Minh',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-05-16'::timestamp,
    NOW()
);

-- [87/162] CK25KKK0013 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'ĐOÀN VIÊN - THANH NIÊN THAM GIA TREO CỜ TỔ QUỐC HƯỞNG ỨNG 50 NĂM GIẢI PHÓNG MIỀN NAM - THỐNG NHẤT ĐẤT NƯỚC',
    'ĐOÀN VIÊN - THANH NIÊN THAM GIA TREO CỜ TỔ QUỐC HƯỞNG ỨNG 50 NĂM GIẢI PHÓNG MIỀN NAM - THỐNG NHẤT ĐẤT NƯỚC',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    3,
    'cơ sở Lý Thường Kiệt, quận 10, Tp. Hồ Chí Minh',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-05-17'::timestamp,
    NOW()
);

-- [88/162] CK25KKK0014 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'TỔ TRUYỀN THÔNG VÀ TUYỂN QUÂN CDTN MHX 2026 KHOA CƠ KHÍ - LẦN 1',
    'TỔ TRUYỀN THÔNG VÀ TUYỂN QUÂN CDTN MHX 2026 KHOA CƠ KHÍ - LẦN 1',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'cơ sở Lý Thường Kiệt, quận 10, Tp. Hồ Chí Minh',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-05-22'::timestamp,
    NOW()
);

-- [89/162] CK25KKK0015 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'CTV hỗ trợ Lễ Trao học bổng của CLB Tennis CSV khoa Cơ khí cho SV khoa Cơ khí ngày 5/5/2026',
    'CTV hỗ trợ Lễ Trao học bổng của CLB Tennis CSV khoa Cơ khí cho SV khoa Cơ khí ngày 5/5/2026',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'cơ sở Lý Thường Kiệt, quận 10, Tp. Hồ Chí Minh',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-05-23'::timestamp,
    NOW()
);

-- [90/162] CK25KKK0016 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'TỔ CÔNG TÁC LỄ TỐT NGHIỆP KHOA CƠ KHÍ 2026',
    'TỔ CÔNG TÁC LỄ TỐT NGHIỆP KHOA CƠ KHÍ 2026 của BCH Đoàn - Hội khoa Cơ khí',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'cơ sở Lý Thường Kiệt',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-07-03'::timestamp,
    NOW()
);

-- [91/162] CK25KKK0017 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'SINH VIÊN THAM GIA JOB FAIR KHOA CƠ KHÍ 2026 - NHÓM 7',
    'SINH VIÊN THAM GIA JOB FAIR KHOA CƠ KHÍ 2026 - NHÓM 7',
    'b7718b9a-50ce-4857-8b2c-2234f4a0eb99'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'cơ sở Lý Thường Kiệt',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-07-07'::timestamp,
    NOW()
);

-- [92/162] CK25KKK0018 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'CTV CUỘC THI "MECHANICAL ENGINEERING ROBOT CONTEST" 2026 - VÒNG SƠ LOẠI',
    'CTV CUỘC THI "MECHANICAL ENGINEERING ROBOT CONTEST" 2026 - VÒNG SƠ LOẠI',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'cơ sở Dĩ An, Bình Dương',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-07-08'::timestamp,
    NOW()
);

-- [93/162] CK25KKK0019 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'TỔ CHỨC HOẠT ĐỘNG MOCK INTERVIEW 6 - CLB IE CONNECT',
    'TỔ CHỨC HOẠT ĐỘNG MOCK INTERVIEW 6 - CLB IE CONNECT',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    2,
    'cơ sở Lý Thường Kiệt, quận 10, Tp. Hồ Chí Minh',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-07-08'::timestamp,
    NOW()
);

-- [94/162] CK25KKK0020 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'TỔ CHỨC TƯ VẤN PHÂN NGÀNH ISE K24 - CLB IE CONNECT',
    'TỔ CHỨC TƯ VẤN PHÂN NGÀNH ISE K24 - CLB IE CONNECT',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    2,
    'cơ sở Dĩ An, Bình Dương',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-07-08'::timestamp,
    NOW()
);

-- [95/162] CK25KKK0021 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Hỗ Trợ Công Tác Kiểm Định AQAS Cho Ngành Kỹ Thuật Nhiệt',
    'Hỗ Trợ Công Tác Kiểm Định AQAS Cho Ngành Kỹ Thuật Nhiệt
từ Thứ Hai (4/5/2026) tới hết Năm (7/4/2026) với mỗi ngày bắt đầu từ 07h00 tới 18h00',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    4,
    'cơ sở Lý Thường Kiệt, quận 10, Tp. Hồ Chí Minh',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-08-04'::timestamp,
    NOW()
);

-- [96/162] CK25KKK0022 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'TỔ CHỨC PHÁT HÀNH CHUỖI VIDEO TIẾNG ANH "PLEC GO GO"',
    'Phát hành 3 video trực tuyến trên fanpage từ ngày 20 tháng 04 năm 2026 đến ngày 23 tháng 04 năm 2026.',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    3,
    'cơ sở Lý Thường Kiệt, quận 10, Tp. Hồ Chí Minh',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-08-21'::timestamp,
    NOW()
);

-- [97/162] CK25KKK0023 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'HỖ TRỢ THƯỜNG TRỰC ĐOÀN - HỘI KHOA CƠ KHÍ NGÀY 5/5/2026',
    'Tên hoạt động: HỖ TRỢ THƯỜNG TRỰC ĐOÀN - HỘI KHOA CƠ KHÍ NGÀY 5/5/2026
Thời gian: từ 8g30 đến 17g30 ngày 5/5/2026
Địa điểm: Văn phòng Đoàn TN - LCH SV khoa Cơ khí, 104-B11, CS1
Đơn vị tổ chức: Thường trực Đoàn - Hội khoa Cơ khí
Người phụ trách (kèm SĐT): Huỳnh Hữu Đức (Bí thư Đoàn khoa trực tiếp phụ trách)',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'cơ sở 1, P. Diên Hồng',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-09-03'::timestamp,
    NOW()
);

-- [98/162] CK25KKK0024 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'HỖ TRỢ CÔNG TÁC VĂN PHÒNG ĐOÀN TN - LIÊN CHI HỘI SV KHOA CƠ KHÍ TỪ NGÀY 20/4 ĐẾN 25/4/2026',
    'hỗ trợ công tác chuẩn bị lễ đón tsv, lễ trao học bổng, công tác văn thư - lưu trữ - kiểm đếm văn phòng',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    6,
    'cơ sở 1, P. Diên Hồng',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-09-10'::timestamp,
    NOW()
);

-- [99/162] CK25KKK0025 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'THAM GIA TỔ CHỨC LỄ ĐÓN TÂN SINH K2026 VÀ LỄ TRAO HỌC BỔNG KHOA CƠ KHÍ 5/5/2026',
    'THAM GIA TỔ CHỨC LỄ ĐÓN TÂN SINH K2025 VÀ LỄ TRAO HỌC BỔNG KHOA CƠ KHÍ 5/5/2026: chuẩn bị, triển khai, tiến hành ở HT A5, kỹ thuật - truyền thông',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    4,
    'cơ sở 1, P. Diên Hồng',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-09-23'::timestamp,
    NOW()
);

-- [100/162] SV25HMT0002 | Hội sinh viên
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'TNV THAM GIA HIẾN MÁU TÌNH NGUYỆN 05.2026',
    'TNV THAM GIA HIẾN MÁU TÌNH NGUYỆN 05.2026',
    '9022ce7f-f8ed-4e8d-889f-c0d9bc18bab5'::uuid,
    '19d3c9d4-af62-4660-bac8-1f0fc87bbe5f'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'ĐHBK',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-02-06'::timestamp,
    NOW()
);

-- [101/162] GT25CTX0006 | Liên chi đoàn Giao Thông
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '[GT] CTV HỖ TRỢ DỌN DẸP PHÒNG BỘ MÔN HÀNG KHÔNG',
    '[GT] CTV HỖ TRỢ DỌN DẸP PHÒNG BỘ MÔN HÀNG KHÔNG',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'a7a06a4d-4729-4596-b881-03f976a523cb'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'Lab Hàng không - Lab Tàu thủy',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-01-17'::timestamp,
    NOW()
);

-- [102/162] GT25CTX0007 | Liên chi đoàn Giao Thông
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '[GT] CTV HỖ TRỢ ĐÓN ĐOÀN HỌC SINH',
    '[GT] CTV HỖ TRỢ ĐÓN ĐOÀN HỌC SINH',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'a7a06a4d-4729-4596-b881-03f976a523cb'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    2,
    'Tòa C5',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-01-17'::timestamp,
    NOW()
);

-- [103/162] GT25CTX0008 | Liên chi đoàn Giao Thông
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '[GT] HỖ TRỢ SỰ KIỆN CỦA KHOA',
    'Hỗ trợ Lễ tiếp nhận động cơ từ Công ty TNHH Việt Nam Suzuki',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'a7a06a4d-4729-4596-b881-03f976a523cb'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    3,
    'Hội trường C5, trường Đại học Bách khoa, ĐHQG-HCM, cơ sở Lý Thường Kiệt',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-04-01'::timestamp,
    NOW()
);

-- [104/162] CT25KKK0059 | Đoàn Trường
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'CTV LỄ VINH DANH TÀI NĂNG LƯƠNG VĂN CAN LẦN THỨ 11 VÀ PHÁT ĐỘNG GIẢI THƯỞNG LẦN THỨ 12',
    'CTV LỄ VINH DANH TÀI NĂNG LƯƠNG VĂN CAN LẦN THỨ 11 VÀ PHÁT ĐỘNG GIẢI THƯỞNG LẦN THỨ 12',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    'c6e1f42a-9b5f-426e-9b4b-0ae21551c873'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'Hội trường 17, lầu 1, Văn phòng 2 – Bộ Giáo dục và Đào tạo',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2026-01-06'::timestamp,
    NOW()
);

-- [105/162] DD25KKK0013 | Liên chi đoàn Điện – Điện tử
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '[FEEE] - TRỌNG TÀI HỖ TRỢ HỘI THAO KHOA ĐIỆN - ĐIỆN TỬ 2025',
    '[FEEE] - TRỌNG TÀI HỖ TRỢ HỘI THAO KHOA ĐIỆN - ĐIỆN TỬ 2025',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    'f34374fa-1258-4b67-9e35-3e47af7a6608'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    8,
    'Đại Học Bách Khoa TPHCM - Thành Phố Dĩ An, Tỉnh Bình Dương',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-11-22'::timestamp,
    NOW()
);

-- [106/162] DD25KKK0014 | Liên chi đoàn Điện – Điện tử
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '[FEEE] - HỖ TRỢ CÔNG TÁC HỒ SƠ PHÒNG TRÀO SINH VIÊN 5 TỐT CÁC CẤP NĂM HỌC 2025-2026',
    '[FEEE] - HỖ TRỢ CÔNG TÁC HỒ SƠ PHÒNG TRÀO SINH VIÊN 5 TỐT CÁC CẤP NĂM HỌC 2025-2026',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    'f34374fa-1258-4b67-9e35-3e47af7a6608'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    8,
    'Đại Học Bách Khoa TPHCM - Thành Phố Dĩ An, Tỉnh Bình Dương',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-11-26'::timestamp,
    NOW()
);

-- [107/162] DD25KKK0015 | Liên chi đoàn Điện – Điện tử
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '[FEEE] - HOẠT ĐỘNG CTV tham gia Lễ ra quân hoạt động Môi trường xanh',
    '[FEEE] - HOẠT ĐỘNG CTV tham gia Lễ ra quân hoạt động Môi trường xanh',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    'f34374fa-1258-4b67-9e35-3e47af7a6608'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    2,
    'Đại Học Bách Khoa TPHCM - 268, Đường Lý Thường Kiệt, Phường 14, Quận 10, Thành Phố Hồ Chí Minh',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-12-05'::timestamp,
    NOW()
);

-- [108/162] DD25KKK0016 | Liên chi đoàn Điện – Điện tử
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '[FEEE] - HOẠT ĐỘNG HỖ TRỢ DEE GAMES 2025',
    '[FEEE] - HOẠT ĐỘNG HỖ TRỢ DEE GAMES 2025',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    'f34374fa-1258-4b67-9e35-3e47af7a6608'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    8,
    'Đại Học Bách Khoa TPHCM - 268, Đường Lý Thường Kiệt, Phường 14, Quận 10, Thành Phố Hồ Chí Minh',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-12-05'::timestamp,
    NOW()
);

-- [109/162] DD25KKK0017 | Liên chi đoàn Điện – Điện tử
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '[FEEE] - HOẠT ĐỘNG HỖ TRỢ DEEGAMES 2025',
    '[FEEE] - HOẠT ĐỘNG HỖ TRỢ DEEGAMES 2025',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    'f34374fa-1258-4b67-9e35-3e47af7a6608'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    8,
    'Đại Học Bách Khoa TPHCM - 268, Đường Lý Thường Kiệt, Phường 14, Quận 10, Thành Phố Hồ Chí Minh',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-12-05'::timestamp,
    NOW()
);

-- [110/162] DD25KKK0018 | Liên chi đoàn Điện – Điện tử
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '[FEEE] - TUYỂN SINH VIÊN THAM DỰ CHƯƠNG TRÌNH GẶP GỠ CÁN BỘ ĐOÀN VÀ ĐẢNG VIÊN TRẺ KHÓA K25',
    '[FEEE] - TUYỂN SINH VIÊN THAM DỰ CHƯƠNG TRÌNH GẶP GỠ CÁN BỘ ĐOÀN VÀ ĐẢNG VIÊN TRẺ KHÓA K25',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    'f34374fa-1258-4b67-9e35-3e47af7a6608'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    2,
    'Đại Học Bách Khoa TPHCM - 268, Đường Lý Thường Kiệt, Phường 14, Quận 10, Thành Phố Hồ Chí Minh',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-12-05'::timestamp,
    NOW()
);

-- [111/162] DD25KKK0019 | Liên chi đoàn Điện – Điện tử
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '[FEEE] - CTV HỖ TRỢ LỄ TỐT NGHIỆP THÁNG 11 2025',
    '[FEEE] - CTV HỖ TRỢ LỄ TỐT NGHIỆP THÁNG 11 2025',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    'f34374fa-1258-4b67-9e35-3e47af7a6608'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    8,
    'Đại Học Bách Khoa TPHCM - 268, Đường Lý Thường Kiệt, Phường 14, Quận 10, Thành Phố Hồ Chí Minh',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-12-17'::timestamp,
    NOW()
);

-- [112/162] CT25KKK0040 | Đoàn Trường
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'TNV HO TRO PHAT HO SO CHO PHONG CTSV THANG 9 - 10.2025',
    'TNV HO TRO PHAT HO SO CHO PHONG CTSV THANG 9 - 10.2025',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    'c6e1f42a-9b5f-426e-9b4b-0ae21551c873'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'TRUONG DAI HOC BACH KHOA_CS1',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-10-22'::timestamp,
    NOW()
);

-- [113/162] CT25KKK0041 | Đoàn Trường
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'TNV Hỗ trợ công tác sinh viên',
    'Hỗ t ro phát giấy chứng nhận sinh viên',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    'c6e1f42a-9b5f-426e-9b4b-0ae21551c873'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    3,
    'Bách Khoa CS1',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-10-31'::timestamp,
    NOW()
);

-- [114/162] HC25CTX0036 | Liên chi đoàn Hóa Học
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '[HH] Dọn PTN Hoá Phân tích 207 B2 tháng 4/2025',
    '[HH] Dọn PTN Hoá Phân tích 207 B2 tháng 4/2025',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    '5c20dc90-3f3c-4476-83f7-b7fa5762bbbe'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    2,
    'Cơ sở Lý Thường Kiệt',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-06-09'::timestamp,
    NOW()
);

-- [115/162] HC25CTX0002 | Liên chi đoàn Hóa Học
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '[HH] Dọn PTN Hoá Vô cơ 213 B2 tháng 12/2024',
    '[HH] Dọn PTN Hoá Vô cơ 213 B2 tháng 12/2024',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    '5c20dc90-3f3c-4476-83f7-b7fa5762bbbe'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    2,
    'Cơ sở Lý Thường Kiệt',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-01-20'::timestamp,
    NOW()
);

-- [116/162] QT25CTX0054 | Đoàn Trường
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'BTC HỘI THẢO SỨC KHỎE TOÀN DIỆN HEALTH AND WELLNESS WORKSHOP',
    'BTC HỘI THẢO SỨC KHỎE TOÀN DIỆN HEALTH AND WELLNESS WORKSHOP',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'c6e1f42a-9b5f-426e-9b4b-0ae21551c873'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    4,
    'CS LTK',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-07-02'::timestamp,
    NOW()
);

-- [117/162] QT25CTX0055 | Đoàn Trường
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'BTC OSA PODCAST: WHISPERS OF ETERNITY',
    'BTC OSA PODCAST: WHISPERS OF ETERNITY',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'c6e1f42a-9b5f-426e-9b4b-0ae21551c873'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    3,
    'CS LTK',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-07-02'::timestamp,
    NOW()
);

-- [118/162] QT25CTX0056 | Đoàn Trường
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'BTC WORKSHOP YONKOMA',
    'BTC WORKSHOP YONKOMA',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'c6e1f42a-9b5f-426e-9b4b-0ae21551c873'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    4,
    'CS LTK',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-07-02'::timestamp,
    NOW()
);

-- [119/162] QT25CTX0057 | Đoàn Trường
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'BTC INTERNATIONAL CONNECTION FESTIVAL',
    'BTC INTERNATIONAL CONNECTION FESTIVAL',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'c6e1f42a-9b5f-426e-9b4b-0ae21551c873'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    4,
    'CS LTK',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-07-02'::timestamp,
    NOW()
);

-- [120/162] QT25CTX0058 | Đoàn Trường
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'BTC HOẠT ĐỘNG ƯỚC MƠ TUỔI THƠ MÙA 2 - 2025',
    'BTC HOẠT ĐỘNG ƯỚC MƠ TUỔI THƠ MÙA 2 - 2025',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'c6e1f42a-9b5f-426e-9b4b-0ae21551c873'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    4,
    'CS LTK',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-07-02'::timestamp,
    NOW()
);

-- [121/162] QT25CTX0059 | Đoàn Trường
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'CTV HỖ TRỢ HẬU CẦN HOẠT ĐỘNG THĂM QUÂN MÙA HÈ XANH 2025',
    'CTV HỖ TRỢ HẬU CẦN HOẠT ĐỘNG THĂM QUÂN MÙA HÈ XANH 2025',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'c6e1f42a-9b5f-426e-9b4b-0ae21551c873'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    4,
    'CS LTK',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-07-02'::timestamp,
    NOW()
);

-- [122/162] QT25CTX0060 | Đoàn Trường
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'CTV HOẠT ĐỘNG TRAO ĐỔI VĂN HÓA THÁNG 6/2025',
    'CTV HOẠT ĐỘNG TRAO ĐỔI VĂN HÓA THÁNG 6/2025',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'c6e1f42a-9b5f-426e-9b4b-0ae21551c873'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    4,
    'CS LTK',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-07-02'::timestamp,
    NOW()
);

-- [123/162] QT26CTX0001 | Đoàn Trường
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'CTV HỖ TRỢ CÁC HOẠT ĐỘNG TRAO ĐỔI VĂN HÓA - 12/2025',
    'CTV HỖ TRỢ CÁC HOẠT ĐỘNG TRAO ĐỔI VĂN HÓA - 12/2025',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'c6e1f42a-9b5f-426e-9b4b-0ae21551c873'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    4,
    'CS 1: LTK',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-12-12'::timestamp,
    NOW()
);

-- [124/162] QT26CTX0002 | Đoàn Trường
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'HỖ TRỢ TỔ CHỨC HỘI TRẠI TRUYỀN THỐNG OISP CAMP 2025',
    'HỖ TRỢ TỔ CHỨC HỘI TRẠI TRUYỀN THỐNG OISP CAMP 2025',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'c6e1f42a-9b5f-426e-9b4b-0ae21551c873'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    4,
    'CS 1: LTK',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-12-26'::timestamp,
    NOW()
);

-- [125/162] QT26CTX0003 | Đoàn Trường
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'CTV HỖ TRỢ CÁC CÔNG TÁC HẬU CẦN CỦA VPĐTQT - 12/2025',
    'CTV HỖ TRỢ CÁC CÔNG TÁC HẬU CẦN CỦA VPĐTQT - 12/2025',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'c6e1f42a-9b5f-426e-9b4b-0ae21551c873'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    3,
    'CS 1: LTK',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-12-26'::timestamp,
    NOW()
);

-- [126/162] QT26CTX0004 | Đoàn Trường
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'TỔ CHỨC VÀ THAM GIA CHƯƠNG TRÌNH CHÀO ĐÓN TÂN SINH VIÊN M.O.V.E 2025',
    'TỔ CHỨC VÀ THAM GIA CHƯƠNG TRÌNH CHÀO ĐÓN TÂN SINH VIÊN M.O.V.E 2025',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'c6e1f42a-9b5f-426e-9b4b-0ae21551c873'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    4,
    'CS 1: LTK',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-12-29'::timestamp,
    NOW()
);

-- [127/162] QT26CTX0005 | Đoàn Trường
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'THAM DỰ HỘI THẢO KHOA HỌC SINH VIÊN, LĨNH VỰC ĐIỆN TOÁN ĐÁM MÂY, ĐIỆN TOÁN LƯỢNG TỬ, DỮ LIỆU LỚN - 30/10/2025',
    'THAM DỰ HỘI THẢO KHOA HỌC SINH VIÊN, LĨNH VỰC ĐIỆN TOÁN ĐÁM MÂY, ĐIỆN TOÁN LƯỢNG TỬ, DỮ LIỆU LỚN - 30/10/2025',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'c6e1f42a-9b5f-426e-9b4b-0ae21551c873'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'CS 1',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2026-01-06'::timestamp,
    NOW()
);

-- [128/162] QT26CTX0006 | Đoàn Trường
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Tham dự Hội nghị khoa học và công nghệ lần thứ 19: “Công nghệ chiến lược – kết nối trí tuệ - Kiến tạo đổi mới” - 21/11/2025',
    'Tham dự Hội nghị khoa học và công nghệ lần thứ 19: “Công nghệ chiến lược – kết nối trí tuệ - Kiến tạo đổi mới” - 21/11/2025',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'c6e1f42a-9b5f-426e-9b4b-0ae21551c873'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'CS 1',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2026-01-06'::timestamp,
    NOW()
);

-- [129/162] QT26CTX0007 | Đoàn Trường
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'CTV HỖ TRỢ ĐĂNG KÝ MÔN HỌC HK2 NH 2025-2026 (HK252)',
    'CTV HỖ TRỢ ĐĂNG KÝ MÔN HỌC HK2 NH 2025-2026 (HK252)',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'c6e1f42a-9b5f-426e-9b4b-0ae21551c873'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    4,
    'CS 1',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2026-01-06'::timestamp,
    NOW()
);

-- [130/162] QT26CTX0008 | Đoàn Trường
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'THAM GIA VÀ TỔ CHỨC HOẠT ĐỘNG OYU WORKSHOP 2026 - "SẮC VIỆT" (31/12/2025)',
    'THAM GIA VÀ TỔ CHỨC HOẠT ĐỘNG OYU WORKSHOP 2026 - "SẮC VIỆT" (31/12/2025)',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'c6e1f42a-9b5f-426e-9b4b-0ae21551c873'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    4,
    'CS 1',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2026-01-13'::timestamp,
    NOW()
);

-- [131/162] QT26CTX0009 | Đoàn Trường
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'HỖ TRỢ TỔ CHỨC BUỔI CHÀO MỪNG TÂN HỌC VIÊN CHƯƠNG TRÌNH IMP KHÓA 2025 - 10/01/2026',
    'HỖ TRỢ TỔ CHỨC BUỔI CHÀO MỪNG TÂN HỌC VIÊN CHƯƠNG TRÌNH IMP KHÓA 2025 - 10/01/2026',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'c6e1f42a-9b5f-426e-9b4b-0ae21551c873'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    2,
    'CS 1',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2026-01-13'::timestamp,
    NOW()
);

-- [132/162] SV25KKK0117 | Hội sinh viên
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'TNV HỖ TRỢ HỘI DIỄN VĂN NGHỆ 7.2025',
    'TNV HỖ TRỢ HỘI DIỄN VĂN NGHỆ 7.2025',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    '19d3c9d4-af62-4660-bac8-1f0fc87bbe5f'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'ĐHBK',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-07-25'::timestamp,
    NOW()
);

-- [133/162] SV25KKK0118 | Hội sinh viên
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'TNV HỖ TRỢ HỘI DIỄN VĂN NGHỆ 7.2025 - 2',
    'TNV HỖ TRỢ HỘI DIỄN VĂN NGHỆ 7.2025 - 2',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    '19d3c9d4-af62-4660-bac8-1f0fc87bbe5f'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'ĐHBK',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-07-25'::timestamp,
    NOW()
);

-- [134/162] SV25KKK0119 | Hội sinh viên
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'TNV HỖ TRỢ HỘI DIỄN VĂN NGHỆ 7.2025 - 2',
    'TNV HỖ TRỢ HỘI DIỄN VĂN NGHỆ 7.2025 - 2',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    '19d3c9d4-af62-4660-bac8-1f0fc87bbe5f'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'ĐHBK',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-07-25'::timestamp,
    NOW()
);

-- [135/162] SV25KKK0120 | Hội sinh viên
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'TNV HỖ TRỢ PHÂN PHÁT, THU GOM LỄ PHỤC TỐT NGHIỆP 4.2025',
    'TNV HỖ TRỢ PHÂN PHÁT, THU GOM LỄ PHỤC TỐT NGHIỆP 4.2025',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    '19d3c9d4-af62-4660-bac8-1f0fc87bbe5f'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'ĐHBK',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-07-25'::timestamp,
    NOW()
);

-- [136/162] SV25KKK0121 | Hội sinh viên
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'TNV HỖ TRỢ TRẠM Y TẾ 7.2025',
    'TNV HỖ TRỢ TRẠM Y TẾ 7.2025',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    '19d3c9d4-af62-4660-bac8-1f0fc87bbe5f'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'ĐHBK',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-07-25'::timestamp,
    NOW()
);

-- [137/162] TN25KKK0096 | Đoàn Trường
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'TNV HỖ TRỢ LỄ BẾ MẠC BKCUP 4.2025',
    'TNV HỖ TRỢ LỄ BẾ MẠC BKCUP 4.2025',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    'c6e1f42a-9b5f-426e-9b4b-0ae21551c873'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'ĐHBK',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-05-21'::timestamp,
    NOW()
);

-- [138/162] TN25KKK0095 | Đoàn Trường
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'TNV HỖ TRỢ PHÒNG THÍ NGHIỆM 5.2025',
    'TNV HỖ TRỢ PHÒNG THÍ NGHIỆM 5.2025',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    'c6e1f42a-9b5f-426e-9b4b-0ae21551c873'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'ĐHBK',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-05-21'::timestamp,
    NOW()
);

-- [139/162] TN25KKK0094 | Đoàn Trường
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'TNV HỖ TRỢ VP ĐOÀN TRƯỜNG 5.2025',
    'TNV HỖ TRỢ VP ĐOÀN TRƯỜNG 5.2025',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    'c6e1f42a-9b5f-426e-9b4b-0ae21551c873'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'ĐHBK',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-05-20'::timestamp,
    NOW()
);

-- [140/162] TN25KKK0153 | Đoàn Trường
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'TNV HỖ TRỢ DỌN DẸP PTN KỸ THUẬT MỸ PHẨM 6.2025',
    'TNV HỖ TRỢ DỌN DẸP PTN KỸ THUẬT MỸ PHẨM 6.2025',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    'c6e1f42a-9b5f-426e-9b4b-0ae21551c873'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'ĐHBK',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-06-30'::timestamp,
    NOW()
);

-- [141/162] TN25KKK0154 | Đoàn Trường
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'TNV THAM GIA HỖ TRỢ CHƯƠNG TRÌNH GIẤC MƠ DU HỌC NĂM 2025',
    'TNV THAM GIA HỖ TRỢ CHƯƠNG TRÌNH GIẤC MƠ DU HỌC NĂM 2025',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    'c6e1f42a-9b5f-426e-9b4b-0ae21551c873'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'ĐHBK',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-06-30'::timestamp,
    NOW()
);

-- [142/162] XD25CTX0011 | Liên chi đoàn Xây Dựng
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '[XD] HOẠT ĐỘNG HỖ TRỢ ĐOÀN KHOA KTXD THÁNG 09/2025',
    'Hỗ trợ Đoàn khoa KTXD trong tháng 09 năm 2025.
Mọi thắc mắc vui lòng liên hệ: Nhật Thuận (Zalo: 0393873106)
Đây là chuỗi hoạt động hỗ trợ đoàn khoa KTXD trong tháng 09 các bạn theo dõi Fanpage Facebook Ban Công Tác Xã Hội - Khoa Kỹ Thuật Xây DựngLink fanpage: https://www.facebook.com/profile.php?id=100068133033425',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'a0d863e3-7183-4df2-8fb8-1e48865827ed'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    5,
    'Trường Đại học Bách khoa - ĐHQG-HCM, Cơ sở Lý Thường Kiệt',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-09-23'::timestamp,
    NOW()
);

-- [143/162] XD25CTX0012 | Liên chi đoàn Xây Dựng
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '[XD] HOẠT ĐỘNG HỖ TRỢ ĐOÀN KHOA KTXD THÁNG 10/2025',
    'Hỗ trợ Đoàn khoa KTXD trong tháng 10 năm 2025.
Mọi thắc mắc vui lòng liên hệ: Nhật Thuận (Zalo: 0393873106)Đây là chuỗi hoạt động hỗ trợ đoàn khoa KTXD trong tháng 10 các bạn theo dõi Fanpage Facebook Ban Công Tác Xã Hội - Khoa Kỹ Thuật Xây Dựng
Link fanpage: https://www.facebook.com/profile.php?id=100068133033425',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'a0d863e3-7183-4df2-8fb8-1e48865827ed'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    6,
    'Trường Đại học Bách khoa - ĐHQG-HCM, Cơ sở Lý Thường Kiệt',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-10-17'::timestamp,
    NOW()
);

-- [144/162] XD25CTX0013 | Liên chi đoàn Xây Dựng
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '[XD] HOẠT ĐỘNG HỖ TRỢ ĐOÀN KHOA KTXD THÁNG 11/2025',
    'Hỗ trợ Đoàn khoa KTXD trong tháng 11 năm 2025.
Mọi thắc mắc vui lòng liên hệ: Hữu Danh (Zalo: 0328355041)
Đây là chuỗi hoạt động hỗ trợ đoàn khoa KTXD trong tháng 11 các bạn theo dõi Fanpage Facebook Ban Công Tác Xã Hội - Khoa Kỹ Thuật Xây Dựng
Link fanpage: https://www.facebook.com/profile.php?id=100068133033425',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'a0d863e3-7183-4df2-8fb8-1e48865827ed'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    6,
    'Trường Đại học Bách khoa - ĐHQG-HCM, Cơ sở Lý Thường Kiệt',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-12-01'::timestamp,
    NOW()
);

-- [145/162] XD25CTX0014 | Liên chi đoàn Xây Dựng
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '[XD] HOẠT ĐỘNG HỖ TRỢ ĐOÀN KHOA KTXD THÁNG 11/2025 BỔ SUNG',
    'Hỗ trợ Đoàn khoa KTXD trong tháng 11 năm 2025.
Mọi thắc mắc vui lòng liên hệ: Hữu Danh (Zalo: 0328355041)
Đây là chuỗi hoạt động hỗ trợ đoàn khoa KTXD trong tháng 11 các bạn theo dõi Fanpage Facebook Ban Công Tác Xã Hội - Khoa Kỹ Thuật Xây Dựng
Link fanpage: https://www.facebook.com/profile.php?id=100068133033425',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'a0d863e3-7183-4df2-8fb8-1e48865827ed'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    6,
    'Trường Đại học Bách khoa - ĐHQG-HCM, Cơ sở Lý Thường Kiệt',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-12-01'::timestamp,
    NOW()
);

-- [146/162] XD25HTR0001 | Liên chi đoàn Xây Dựng
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '[XD] TỔ CHỨC LỚP ÔN TẬP KHOA KTXD THÁNG 12/2024',
    'Tổ chức lớp ôn tập khoa KTXD trong tháng 12 năm 2024.
Mọi thắc mắc vui lòng liên hệ: Hữu Danh (Zalo: 0328355041)
Link fanpage: https://www.facebook.com/profile.php?id=100068133033425',
    'b7718b9a-50ce-4857-8b2c-2234f4a0eb99'::uuid,
    'a0d863e3-7183-4df2-8fb8-1e48865827ed'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    4,
    'Trường ĐH Bách Khoa Tp. Hồ Chí Minh, cơ sở Lý Thường Kiệt',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-01-06'::timestamp,
    NOW()
);

-- [147/162] XD26CTX0001 | Liên chi đoàn Xây Dựng
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '[XD] HOẠT ĐỘNG HỖ TRỢ ĐOÀN KHOA KTXD THÁNG 12/2025',
    'Hỗ trợ Đoàn khoa KTXD trong tháng 12 năm 2025.
Mọi thắc mắc vui lòng liên hệ: Hữu Danh (Zalo: 0328355041)
Đây là chuỗi hoạt động hỗ trợ đoàn khoa KTXD trong tháng 12 các bạn theo dõi Fanpage Facebook Ban Công Tác Xã Hội - Khoa Kỹ Thuật Xây Dựng
Link fanpage: https://www.facebook.com/profile.php?id=100068133033425',
    'a4646e70-d12e-4ef7-8445-d9eae584e9d1'::uuid,
    'a0d863e3-7183-4df2-8fb8-1e48865827ed'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    6,
    'Trường Đại học Bách khoa - ĐHQG-HCM, Cơ sở Lý Thường Kiệt',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2026-01-03'::timestamp,
    NOW()
);

-- [148/162] XD26HTR0001 | Liên chi đoàn Xây Dựng
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '[XD] CTV THƯỜNG TRỰC ĐOÀN - HỘI KHOA KTXD THÁNG 09-10/2025',
    'Cập nhật CTXH cho Tổ CTV Thường trực khoa KTXD tháng 09-10/2025
Mọi thắc mắc vui lòng liên hệ: Nguyễn Hữu Danh (0328355041)',
    'b7718b9a-50ce-4857-8b2c-2234f4a0eb99'::uuid,
    'a0d863e3-7183-4df2-8fb8-1e48865827ed'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    4,
    'Trường Đại học Bách khoa - ĐHQG-HCM, Cơ sở Lý Thường Kiệt',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2026-01-06'::timestamp,
    NOW()
);

-- [149/162] XD26HTR0002 | Liên chi đoàn Xây Dựng
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '[XD] CTV THƯỜNG TRỰC ĐOÀN - HỘI KHOA KTXD THÁNG 11-12/2025',
    'Cập nhật CTXH cho Tổ CTV Thường trực khoa KTXD tháng 09-10/2025
Mọi thắc mắc vui lòng liên hệ: Nguyễn Hữu Danh (0328355041)',
    'b7718b9a-50ce-4857-8b2c-2234f4a0eb99'::uuid,
    'a0d863e3-7183-4df2-8fb8-1e48865827ed'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    4,
    'Trường Đại học Bách khoa - ĐHQG-HCM, Cơ sở Lý Thường Kiệt',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2026-01-06'::timestamp,
    NOW()
);

-- [150/162] SV25HMT0002 | Hội sinh viên
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'TNV THAM GIA HIẾN MÁU TÌNH NGUYỆN 01.2025',
    'TNV THAM GIA HIẾN MÁU TÌNH NGUYỆN 01.2025',
    '9022ce7f-f8ed-4e8d-889f-c0d9bc18bab5'::uuid,
    '19d3c9d4-af62-4660-bac8-1f0fc87bbe5f'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'ĐHBK',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-02-06'::timestamp,
    NOW()
);

-- [151/162] CK25MAI0003 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'CTXH tại Cơ sở Bảo trợ xã hội Cô nhi Thiên Bình',
    'Địa điểm: Số 138 ấp Thiên Bình, xã Tam Phước, TP Biên Hòa, tỉnh Đồng Nai.
Nội dung hoạt động: Dọn dẹp vệ sinh tại phòng sơ sinh, dạy học, hỗ trợ công việc nhà bếp…
Phương tiện: Bắt buộc di chuyển bằng xe buýt đã được Đội thuê - tập trung tại cổng KTX khu A lúc 6h30 và đi theo sự hướng dẫn của người giám sát, thu lệ phí di chuyển 50k/người.',
    '7e5601c3-b1ac-465a-88d1-c66e42e0d857'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'Số 138 ấp Thiên Bình, xã Tam Phước, TP Biên Hòa, tỉnh Đồng Nai.',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-03-09'::timestamp,
    NOW()
);

-- [152/162] CK25MAI0004 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'CTXH TẠI TRUNG TÂM BẢO TRỢ XÃ HỘI CÔ NHI THIÊN BÌNH - T2/2025',
    'Địa điểm: Số 138 ấp Thiên Bình, xã Tam Phước, TP Biên Hòa, tỉnh Đồng Nai.
Nội dung hoạt động: Dọn dẹp vệ sinh tại phòng sơ sinh, dạy học, hỗ trợ công việc nhà bếp…',
    '7e5601c3-b1ac-465a-88d1-c66e42e0d857'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'Số 138 ấp Thiên Bình, xã Tam Phước, TP Biên Hòa, tỉnh Đồng Nai',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-03-16'::timestamp,
    NOW()
);

-- [153/162] CK25MAI0005 | Liên chi đoàn Cơ khí
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'CTXH TẠI TRUNG TÂM NHÂN ĐẠO QUÊ HƯƠNG - T2/2025',
    'Địa điểm: 1210 ĐT743A, Khu phố Tân Long, Phường Tân Đông Hiệp, Thành phố Dĩ An, Bình Dương.
Nội dung hoạt động: Dọn dẹp vệ sinh, khuân vác đồ đạc , cải tạo khuôn viên, phụ bếp, chăm sóc trẻ nhỏ, dạy học, vui chơi cùng các em,…',
    '7e5601c3-b1ac-465a-88d1-c66e42e0d857'::uuid,
    'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    '1210 ĐT743A, Khu phố Tân Long, Phường Tân Đông Hiệp, Thành phố Dĩ An, Bình Dương',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-03-16'::timestamp,
    NOW()
);

-- [154/162] QL25DKT0001 | Liên chi đoàn Quản Lý CN
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'SIM-PHONY OF VERSE',
    'SIM-PHONY OF VERSE',
    '4e033597-c323-4dcc-9e26-62c7f9c62af0'::uuid,
    '69e5d561-dd4c-4230-863e-5f527ded5793'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    4,
    'Nhà văn hóa sinh viên ĐHQG',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-10-27'::timestamp,
    NOW()
);

-- [155/162] QL25DKT0002 | Liên chi đoàn Quản Lý CN
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'HỖ TRỢ HỘI THẢO AI APPLICATION IN HEALTHCARE',
    'HỖ TRỢ HỘI THẢO AI APPLICATION IN HEALTHCARE',
    '4e033597-c323-4dcc-9e26-62c7f9c62af0'::uuid,
    '69e5d561-dd4c-4230-863e-5f527ded5793'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    2,
    'Hội trường C5 - CS1',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-10-27'::timestamp,
    NOW()
);

-- [156/162] QL25DKT0003 | Liên chi đoàn Quản Lý CN
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Tham gia Hội thảo Khoa học sinh viên, lĩnh vực “Điện toán đám mây, điện toán lượng tử và dữ liệu lớn”',
    'Tham gia Hội thảo Khoa học sinh viên, lĩnh vực “Điện toán đám mây, điện toán lượng tử và dữ liệu lớn”',
    '4e033597-c323-4dcc-9e26-62c7f9c62af0'::uuid,
    '69e5d561-dd4c-4230-863e-5f527ded5793'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'CS1',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-11-05'::timestamp,
    NOW()
);

-- [157/162] SV25HMT0037 | Hội sinh viên
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'TNV THAM GIA HIẾN MÁU TÌNH NGUYỆN 10.2025',
    'TNV THAM GIA HIẾN MÁU TÌNH NGUYỆN 10.2025',
    '9022ce7f-f8ed-4e8d-889f-c0d9bc18bab5'::uuid,
    '19d3c9d4-af62-4660-bac8-1f0fc87bbe5f'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'ĐHBK',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-10-25'::timestamp,
    NOW()
);

-- [158/162] SV25KKK0080 | Hội sinh viên
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'TNV HỖ TRỢ CHƯƠNG TRÌNH SÁCH CŨ TRI THỨC MỚI NĂM 2025',
    'TNV HỖ TRỢ CHƯƠNG TRÌNH SÁCH CŨ TRI THỨC MỚI NĂM 2025',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    '19d3c9d4-af62-4660-bac8-1f0fc87bbe5f'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'ĐHBK',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-06-06'::timestamp,
    NOW()
);

-- [159/162] SV25KKK0237 | Hội sinh viên
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'TNV THAM GIA CỔ VŨ ĐỘI BÓNG ĐÁ CATP THUỘC KHUÔN KHỔ VÒNG 9 LPBANK V.LEAGUE 1',
    'TNV THAM GIA CỔ VŨ ĐỘI BÓNG ĐÁ CATP THUỘC KHUÔN KHỔ VÒNG 9 LPBANK V.LEAGUE 1',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    '19d3c9d4-af62-4660-bac8-1f0fc87bbe5f'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'Sân vận động Thống Nhất',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-11-15'::timestamp,
    NOW()
);

-- [160/162] SV25KKK0253 | Hội sinh viên
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '[HSV] TNV HỖ TRỢ THAM GIA CHƯƠNG TRÌNH "VINH DANH THỦ KHOA" 21/11',
    '[HSV] TNV HỖ TRỢ THAM GIA CHƯƠNG TRÌNH "VINH DANH THỦ KHOA" 21/11',
    'da771a1f-f92e-4e00-9160-e545c16c3796'::uuid,
    '19d3c9d4-af62-4660-bac8-1f0fc87bbe5f'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    1,
    'TP. Hồ Chí Minh',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-11-30'::timestamp,
    NOW()
);

-- [161/162] MT25NHV0001 | Liên chi đoàn KH-KTMT
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '[MT] CTV HỖ TRỢ NGÀY HỘI VIỆC LÀM KHOA KH&KTMT - JOB FAIR',
    '[MT] CTV HỖ TRỢ NGÀY HỘI VIỆC LÀM KHOA KH&KTMT - JOB FAIR',
    'b7718b9a-50ce-4857-8b2c-2234f4a0eb99'::uuid,
    '3f68f818-6ff1-49e0-80df-010b5ad2ba77'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    4,
    'ĐHBK',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-04-02'::timestamp,
    NOW()
);

-- [162/162] QL25HTR0015 | Liên chi đoàn Quản Lý CN
INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days, location,
    status, created_by, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    'Show quân sự 22/3',
    'Show quân sự 5/5',
    'b7718b9a-50ce-4857-8b2c-2234f4a0eb99'::uuid,
    '69e5d561-dd4c-4230-863e-5f527ded5793'::uuid,
    '2026-04-30'::timestamp, '2026-05-10'::timestamp,
    2,
    '286- Lý Thường Kiệt, Phường 14, Quận 10,TP. Hồ Chí Minh',
    'ACTIVE',
    '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid,
    '2025-04-16'::timestamp,
    NOW()
);


-- ─── Thống kê sau khi insert ────────────────────────────────────────────────
SELECT
    'Tổng số hoạt động vừa thêm:' AS description,
    COUNT(*) AS count
FROM ctxh_activity
WHERE created_by = '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid
  AND updated_at > NOW() - INTERVAL '5 minutes';

SELECT
    name, start_date, end_date, total_days, location, status, created_at
FROM ctxh_activity
WHERE created_by = '9fb5a583-0d4d-4102-8bda-aaae7ab63a32'::uuid
  AND updated_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;