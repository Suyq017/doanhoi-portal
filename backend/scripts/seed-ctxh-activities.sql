-- ============================================================
-- SEED: 20 Hoạt động Công tác xã hội (CTXH)
-- Created: 27/04/2026
-- Sử dụng: docker exec <postgres-container> psql -U postgres -d doanhoi -f /path/to/seed-ctxh-activities.sql
-- ============================================================

-- Variables (IDs thực tế trong DB)
-- created_by  : f00c3e13-bc1a-4b5c-a7ec-548874680f82 (admin@doanhoi.com)
-- org_doan    : b8d0e38a-419b-4408-b6ae-6246b87e99a3 (Đoàn Trường)
-- org_hoi     : dfb380cc-41df-4173-a987-9400df49c1ca (Hội Sinh viên)

-- ============================================================
-- BƯỚC 1: Tạo thêm categories
-- ============================================================

INSERT INTO ctxh_category (id, name, description, created_by, created_at, updated_at)
VALUES
(
    'a1000001-0000-0000-0000-000000000001'::uuid,
    'Hoạt động Tình nguyện',
    'Các hoạt động tình nguyện hỗ trợ cộng đồng, trường học và xã hội',
    'f00c3e13-bc1a-4b5c-a7ec-548874680f82'::uuid,
    NOW(), NOW()
),
(
    'a1000001-0000-0000-0000-000000000002'::uuid,
    'Hiến máu nhân đạo',
    'Các chiến dịch hiến máu tình nguyện vì người bệnh',
    'f00c3e13-bc1a-4b5c-a7ec-548874680f82'::uuid,
    NOW(), NOW()
),
(
    'a1000001-0000-0000-0000-000000000003'::uuid,
    'Bảo vệ môi trường',
    'Hoạt động vệ sinh, trồng cây, bảo vệ môi trường sống',
    'f00c3e13-bc1a-4b5c-a7ec-548874680f82'::uuid,
    NOW(), NOW()
),
(
    'a1000001-0000-0000-0000-000000000004'::uuid,
    'Hỗ trợ cộng đồng',
    'Hỗ trợ người yếu thế, trẻ em, người cao tuổi, vùng khó khăn',
    'f00c3e13-bc1a-4b5c-a7ec-548874680f82'::uuid,
    NOW(), NOW()
),
(
    'a1000001-0000-0000-0000-000000000005'::uuid,
    'Văn hóa - Thể thao',
    'Các hoạt động văn hóa, nghệ thuật, thể thao gây quỹ từ thiện',
    'f00c3e13-bc1a-4b5c-a7ec-548874680f82'::uuid,
    NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- BƯỚC 2: Insert 20 hoạt động CTXH
-- Phân loại:
--   - 5 COMPLETED (đã kết thúc, tháng 1-3/2026)
--   - 9 ACTIVE    (đang diễn ra hoặc sắp kết thúc, tháng 4/2026)
--   - 6 DRAFT     (lên kế hoạch, tháng 5-7/2026)
-- ============================================================

INSERT INTO ctxh_activity (
    id, name, description,
    category_id, organization_id,
    start_date, end_date, total_days,
    location, status, requires_approval, max_participants,
    created_by, created_at, updated_at
) VALUES

-- ── COMPLETED (5 hoạt động đã kết thúc) ─────────────────────────────────────

-- 1
(
    gen_random_uuid(),
    'Hiến máu nhân đạo tháng 1/2026',
    'Chiến dịch hiến máu tình nguyện lần thứ nhất năm 2026 tại ĐHBK TP.HCM. '
    'Mỗi đơn vị máu có thể cứu sống 3 người bệnh. Hãy cùng chung tay vì cộng đồng!',
    'a1000001-0000-0000-0000-000000000002'::uuid,
    'b8d0e38a-419b-4408-b6ae-6246b87e99a3'::uuid,
    '2026-01-15 07:30:00', '2026-01-15 16:30:00', 1,
    'Hội trường B4, Cơ sở 1, 268 Lý Thường Kiệt, Q.10',
    'COMPLETED', false, 200,
    'f00c3e13-bc1a-4b5c-a7ec-548874680f82'::uuid, NOW(), NOW()
),

-- 2
(
    gen_random_uuid(),
    'Dọn vệ sinh khu dân cư phường Linh Trung',
    'Tình nguyện dọn dẹp vệ sinh môi trường tại khu dân cư phường Linh Trung, '
    'Thủ Đức nhân dịp đầu năm mới 2026. Hoạt động do Hội Sinh viên trường phối hợp '
    'với UBND phường tổ chức.',
    'a1000001-0000-0000-0000-000000000003'::uuid,
    'dfb380cc-41df-4173-a987-9400df49c1ca'::uuid,
    '2026-01-22 07:00:00', '2026-01-22 11:30:00', 0.5,
    'Phường Linh Trung, TP. Thủ Đức',
    'COMPLETED', false, 80,
    'f00c3e13-bc1a-4b5c-a7ec-548874680f82'::uuid, NOW(), NOW()
),

-- 3
(
    gen_random_uuid(),
    'Tình nguyện hỗ trợ trường Tiểu học Linh Trung',
    'Sinh viên tình nguyện sơn sửa phòng học, tổng vệ sinh khuôn viên và '
    'tặng dụng cụ học tập cho học sinh khó khăn tại trường Tiểu học Linh Trung. '
    'Tổng giá trị quà tặng: 15 triệu đồng.',
    'a1000001-0000-0000-0000-000000000004'::uuid,
    'b8d0e38a-419b-4408-b6ae-6246b87e99a3'::uuid,
    '2026-02-08 07:00:00', '2026-02-09 17:00:00', 2,
    'Trường Tiểu học Linh Trung, TP. Thủ Đức',
    'COMPLETED', false, 60,
    'f00c3e13-bc1a-4b5c-a7ec-548874680f82'::uuid, NOW(), NOW()
),

-- 4
(
    gen_random_uuid(),
    'Trồng cây xanh khuôn viên cơ sở 2',
    'Chiến dịch trồng 200 cây xanh tại khuôn viên cơ sở 2 ĐHBK TP.HCM nhân '
    'Ngày Quốc tế Cây xanh. Mỗi sinh viên tham gia được nhận 1 cây con về nhà '
    'trồng tiếp.',
    'a1000001-0000-0000-0000-000000000003'::uuid,
    'dfb380cc-41df-4173-a987-9400df49c1ca'::uuid,
    '2026-03-01 07:00:00', '2026-03-01 11:00:00', 0.5,
    'Khuôn viên Cơ sở 2, Đường N6, Khu Công nghệ cao, TP. Thủ Đức',
    'COMPLETED', false, 100,
    'f00c3e13-bc1a-4b5c-a7ec-548874680f82'::uuid, NOW(), NOW()
),

-- 5
(
    gen_random_uuid(),
    'Hỗ trợ sinh viên tân sinh viên đăng ký học phần HK232',
    'Đội ngũ tình nguyện viên hỗ trợ sinh viên năm nhất đăng ký học phần học kỳ 2 '
    'năm học 2023-2024, giải đáp thắc mắc về chương trình đào tạo và quy trình '
    'tại phòng Đào tạo.',
    'a1000001-0000-0000-0000-000000000001'::uuid,
    'b8d0e38a-419b-4408-b6ae-6246b87e99a3'::uuid,
    '2026-03-10 08:00:00', '2026-03-14 17:00:00', 1,
    'Văn phòng Đoàn - Hội, Cơ sở 1, ĐHBK TP.HCM',
    'COMPLETED', false, 30,
    'f00c3e13-bc1a-4b5c-a7ec-548874680f82'::uuid, NOW(), NOW()
),

-- ── ACTIVE (9 hoạt động đang diễn ra / sắp kết thúc) ────────────────────────

-- 6
(
    gen_random_uuid(),
    'Hiến máu nhân đạo tháng 4/2026',
    'Chiến dịch hiến máu tình nguyện lần thứ hai năm 2026. Mục tiêu thu 300 đơn vị '
    'máu để cung cấp cho bệnh viện Chợ Rẫy và Bệnh viện Ung Bướu TP.HCM. '
    'Mỗi người hiến máu được khám sức khỏe miễn phí và nhận quà tặng.',
    'a1000001-0000-0000-0000-000000000002'::uuid,
    'b8d0e38a-419b-4408-b6ae-6246b87e99a3'::uuid,
    '2026-04-25 07:30:00', '2026-04-25 16:30:00', 1,
    'Hội trường A3, Cơ sở 1, 268 Lý Thường Kiệt, Q.10',
    'ACTIVE', true, 300,
    'f00c3e13-bc1a-4b5c-a7ec-548874680f82'::uuid, NOW(), NOW()
),

-- 7
(
    gen_random_uuid(),
    'Chiến dịch Mùa hè Xanh 2026 - Đợt 1',
    'Sinh viên tình nguyện xuống các địa bàn khó khăn tại tỉnh Bình Phước để '
    'hỗ trợ xây dựng công trình, dạy học cho trẻ em, khám chữa bệnh miễn phí '
    'và tổ chức các hoạt động vui chơi. Thời gian: 10 ngày.',
    'a1000001-0000-0000-0000-000000000001'::uuid,
    'dfb380cc-41df-4173-a987-9400df49c1ca'::uuid,
    '2026-04-20 06:00:00', '2026-04-30 20:00:00', 3,
    'Huyện Phú Riềng, tỉnh Bình Phước',
    'ACTIVE', true, 50,
    'f00c3e13-bc1a-4b5c-a7ec-548874680f82'::uuid, NOW(), NOW()
),

-- 8
(
    gen_random_uuid(),
    'Dọn vệ sinh bãi biển Cần Giờ',
    'Chiến dịch thu gom rác thải ven biển tại khu du lịch Cần Giờ, kết hợp '
    'trồng thêm 100 cây ngập mặn để bảo vệ hệ sinh thái rừng ngập mặn. '
    'Di chuyển bằng xe buýt tập trung từ trường lúc 5:30.',
    'a1000001-0000-0000-0000-000000000003'::uuid,
    'b8d0e38a-419b-4408-b6ae-6246b87e99a3'::uuid,
    '2026-04-26 05:30:00', '2026-04-26 18:00:00', 1,
    'Bãi biển Cần Giờ, Huyện Cần Giờ, TP.HCM',
    'ACTIVE', false, 120,
    'f00c3e13-bc1a-4b5c-a7ec-548874680f82'::uuid, NOW(), NOW()
),

-- 9
(
    gen_random_uuid(),
    'Hỗ trợ người cao tuổi tại Trung tâm Dưỡng lão Thị Nghè',
    'Thăm hỏi, chăm sóc sức khỏe, tặng quà và tổ chức văn nghệ cho các cụ '
    'tại Trung tâm Bảo trợ người cao tuổi Thị Nghè nhân dịp tháng 4. '
    'Mang lại niềm vui và sự ấm áp cho các cụ neo đơn.',
    'a1000001-0000-0000-0000-000000000004'::uuid,
    'dfb380cc-41df-4173-a987-9400df49c1ca'::uuid,
    '2026-04-27 08:00:00', '2026-04-27 15:00:00', 1,
    'Trung tâm Bảo trợ Người cao tuổi Thị Nghè, Q. Bình Thạnh',
    'ACTIVE', false, 40,
    'f00c3e13-bc1a-4b5c-a7ec-548874680f82'::uuid, NOW(), NOW()
),

-- 10
(
    gen_random_uuid(),
    'Đêm nhạc từ thiện "Giai điệu Yêu thương" 2026',
    'Đêm nhạc do sinh viên ĐHBK biểu diễn, gây quỹ hỗ trợ học bổng cho '
    'sinh viên hoàn cảnh khó khăn. Dự kiến quyên góp 50 triệu đồng. '
    'Vé vào cửa: 50.000đ (toàn bộ dành cho quỹ học bổng).',
    'a1000001-0000-0000-0000-000000000005'::uuid,
    'b8d0e38a-419b-4408-b6ae-6246b87e99a3'::uuid,
    '2026-04-29 18:00:00', '2026-04-29 21:30:00', 0.5,
    'Hội trường lớn, Cơ sở 1, ĐHBK TP.HCM',
    'ACTIVE', false, 500,
    'f00c3e13-bc1a-4b5c-a7ec-548874680f82'::uuid, NOW(), NOW()
),

-- 11
(
    gen_random_uuid(),
    'Giải bóng đá mini gây quỹ từ thiện "Hòa nhịp Xanh"',
    'Giải bóng đá mini 5 người dành cho sinh viên ĐHBK TP.HCM. '
    'Phí đăng ký 300.000đ/đội (toàn bộ dùng mua dụng cụ học tập tặng '
    'trẻ em khó khăn). Giải thưởng: Cúp + áo thi đấu.',
    'a1000001-0000-0000-0000-000000000005'::uuid,
    'dfb380cc-41df-4173-a987-9400df49c1ca'::uuid,
    '2026-04-28 06:00:00', '2026-04-28 17:00:00', 1,
    'Sân bóng đá Cơ sở 2, ĐHBK TP.HCM',
    'ACTIVE', true, 150,
    'f00c3e13-bc1a-4b5c-a7ec-548874680f82'::uuid, NOW(), NOW()
),

-- 12
(
    gen_random_uuid(),
    'Tình nguyện dạy kỹ năng tin học cho trẻ em vùng ngoại ô',
    'Sinh viên tình nguyện dạy tin học cơ bản (Word, Excel, Internet) cho '
    '50 trẻ em từ 10-15 tuổi tại xã Phước Kiển, Nhà Bè. Mỗi buổi học 3 giờ, '
    'kéo dài trong 4 tuần (mỗi tuần 2 buổi cuối tuần).',
    'a1000001-0000-0000-0000-000000000004'::uuid,
    'b8d0e38a-419b-4408-b6ae-6246b87e99a3'::uuid,
    '2026-04-05 08:00:00', '2026-04-30 11:00:00', 2,
    'Trường THCS Phước Kiển, Huyện Nhà Bè',
    'ACTIVE', true, 20,
    'f00c3e13-bc1a-4b5c-a7ec-548874680f82'::uuid, NOW(), NOW()
),

-- 13
(
    gen_random_uuid(),
    'Chiến dịch Hoa Phượng Đỏ 2026 - Khám sức khỏe miễn phí',
    'Phối hợp với Trung tâm Y tế Thủ Đức tổ chức khám sức khỏe miễn phí '
    '(đường huyết, huyết áp, thị lực, nha khoa) cho người dân lao động nghèo. '
    'Sinh viên y khoa tham gia hỗ trợ chuyên môn dưới sự giám sát bác sĩ.',
    'a1000001-0000-0000-0000-000000000001'::uuid,
    'dfb380cc-41df-4173-a987-9400df49c1ca'::uuid,
    '2026-04-20 07:30:00', '2026-05-10 17:00:00', 1.5,
    'UBND Phường Linh Xuân, TP. Thủ Đức',
    'ACTIVE', true, 60,
    'f00c3e13-bc1a-4b5c-a7ec-548874680f82'::uuid, NOW(), NOW()
),

-- 14
(
    gen_random_uuid(),
    'Hỗ trợ tổ chức Ngày hội Tuyển sinh 2026',
    'Sinh viên tình nguyện hỗ trợ công tác tổ chức Ngày hội Tuyển sinh ĐHBK TP.HCM '
    '2026: đón tiếp, hướng dẫn, tư vấn xét tuyển, hỗ trợ đăng ký và giải đáp thắc '
    'mắc cho học sinh phổ thông và phụ huynh.',
    'a1000001-0000-0000-0000-000000000001'::uuid,
    'b8d0e38a-419b-4408-b6ae-6246b87e99a3'::uuid,
    '2026-04-30 06:30:00', '2026-04-30 17:30:00', 1,
    'Cơ sở 1 và Cơ sở 2, ĐHBK TP.HCM',
    'ACTIVE', false, 200,
    'f00c3e13-bc1a-4b5c-a7ec-548874680f82'::uuid, NOW(), NOW()
),

-- ── DRAFT (6 hoạt động đang lên kế hoạch) ───────────────────────────────────

-- 15
(
    gen_random_uuid(),
    'Hiến máu nhân đạo tháng 6/2026',
    'Chiến dịch hiến máu tình nguyện lần thứ ba năm 2026. Dự kiến thu 350 đơn vị '
    'máu, phối hợp với Viện Huyết học - Truyền máu Trung ương TP.HCM.',
    'a1000001-0000-0000-0000-000000000002'::uuid,
    'b8d0e38a-419b-4408-b6ae-6246b87e99a3'::uuid,
    '2026-06-14 07:30:00', '2026-06-14 16:30:00', 1,
    'Hội trường B4, Cơ sở 1, 268 Lý Thường Kiệt, Q.10',
    'DRAFT', true, 350,
    'f00c3e13-bc1a-4b5c-a7ec-548874680f82'::uuid, NOW(), NOW()
),

-- 16
(
    gen_random_uuid(),
    'Nhặt rác và làm sạch sông Sài Gòn đoạn Bình Thạnh',
    'Hoạt động thu gom rác trên mặt nước và hai bên bờ sông Sài Gòn đoạn qua '
    'quận Bình Thạnh, nhằm nâng cao ý thức bảo vệ nguồn nước và môi trường '
    'đô thị. Sử dụng thuyền kayak và lưới thu gom.',
    'a1000001-0000-0000-0000-000000000003'::uuid,
    'dfb380cc-41df-4173-a987-9400df49c1ca'::uuid,
    '2026-05-17 06:00:00', '2026-05-17 12:00:00', 0.5,
    'Bến thuyền Bình Quới, Q. Bình Thạnh',
    'DRAFT', false, 80,
    'f00c3e13-bc1a-4b5c-a7ec-548874680f82'::uuid, NOW(), NOW()
),

-- 17
(
    gen_random_uuid(),
    'Chiến dịch Mùa hè Xanh 2026 - Đợt 2',
    'Đợt 2 chiến dịch Mùa hè Xanh tại tỉnh Trà Vinh. Nội dung: xây dựng '
    '5 cầu nông thôn, sửa chữa 20 nhà tình thương, tổ chức lớp học hè cho '
    '200 trẻ em. Thời gian: 15 ngày.',
    'a1000001-0000-0000-0000-000000000001'::uuid,
    'dfb380cc-41df-4173-a987-9400df49c1ca'::uuid,
    '2026-06-28 06:00:00', '2026-07-12 20:00:00', 3,
    'Huyện Châu Thành, tỉnh Trà Vinh',
    'DRAFT', true, 60,
    'f00c3e13-bc1a-4b5c-a7ec-548874680f82'::uuid, NOW(), NOW()
),

-- 18
(
    gen_random_uuid(),
    'Ngày hội Tình nguyện cộng đồng ĐHBK 2026',
    'Ngày hội tập trung toàn bộ các CLB-Đội-Nhóm tình nguyện trong trường '
    'tổ chức các gian hàng hoạt động: khám bệnh miễn phí, dạy kỹ năng sống, '
    'phát quà từ thiện, biểu diễn nghệ thuật. Mở cửa tự do cho người dân khu vực.',
    'a1000001-0000-0000-0000-000000000004'::uuid,
    'b8d0e38a-419b-4408-b6ae-6246b87e99a3'::uuid,
    '2026-05-25 07:00:00', '2026-05-25 17:00:00', 1,
    'Sân trung tâm, Cơ sở 2, ĐHBK TP.HCM',
    'DRAFT', true, 500,
    'f00c3e13-bc1a-4b5c-a7ec-548874680f82'::uuid, NOW(), NOW()
),

-- 19
(
    gen_random_uuid(),
    'Tình nguyện Mùa thi - Hỗ trợ sinh viên ôn tập HK231',
    'Sinh viên khóa trên tổ chức các buổi ôn tập miễn phí cho sinh viên năm '
    'nhất và năm hai trước kỳ thi cuối kỳ. Các môn: Giải tích, Đại số, Vật lý, '
    'Lập trình cơ bản. Mỗi buổi 3 tiếng, tổ chức tại phòng học trống.',
    'a1000001-0000-0000-0000-000000000001'::uuid,
    'dfb380cc-41df-4173-a987-9400df49c1ca'::uuid,
    '2026-05-18 17:00:00', '2026-06-07 20:00:00', 1,
    'Các phòng học, Cơ sở 1 và Cơ sở 2, ĐHBK TP.HCM',
    'DRAFT', false, 100,
    'f00c3e13-bc1a-4b5c-a7ec-548874680f82'::uuid, NOW(), NOW()
),

-- 20
(
    gen_random_uuid(),
    'Dạy kỹ năng sống cho trẻ em mồ côi tại Mái ấm Thiên Ân',
    'Sinh viên tình nguyện phối hợp cùng chuyên gia tâm lý tổ chức các buổi '
    'dạy kỹ năng sống (giao tiếp, quản lý cảm xúc, định hướng nghề nghiệp) '
    'cho 30 trẻ em từ 12-18 tuổi tại mái ấm Thiên Ân, Q.12. '
    'Kết hợp tặng quà và tổ chức bữa tiệc sinh nhật chung.',
    'a1000001-0000-0000-0000-000000000004'::uuid,
    'b8d0e38a-419b-4408-b6ae-6246b87e99a3'::uuid,
    '2026-05-10 08:00:00', '2026-05-10 16:00:00', 1,
    'Mái ấm Thiên Ân, 235 Tô Ký, P. Trung Mỹ Tây, Q.12',
    'DRAFT', false, 25,
    'f00c3e13-bc1a-4b5c-a7ec-548874680f82'::uuid, NOW(), NOW()
);

-- ============================================================
-- KIỂM TRA KẾT QUẢ
-- ============================================================

SELECT
    ca.name AS "Tên hoạt động",
    cat.name AS "Danh mục",
    org.name AS "Tổ chức",
    ca.status AS "Trạng thái",
    ca.total_days AS "Số ngày",
    ca.requires_approval AS "Cần duyệt",
    ca.max_participants AS "SL tối đa"
FROM ctxh_activity ca
LEFT JOIN ctxh_category cat ON cat.id = ca.category_id
LEFT JOIN organizations org ON org.id = ca.organization_id
WHERE ca.deleted_at IS NULL
ORDER BY ca.created_at DESC
LIMIT 25;
