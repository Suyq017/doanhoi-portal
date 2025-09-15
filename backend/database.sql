-- Tạo 2 tổ chức gốc
INSERT INTO organizations (name, description, type, code)
VALUES (
  'Đoàn Trường',
  'Đoàn Thanh niên Cộng sản Hồ Chí Minh trường',
  'doan_truong',
  'DOAN_TRUONG'
);

INSERT INTO organizations (name, description, type, code)
VALUES (
  'Sinh Viên', 
  'Hội Sinh viên Việt Nam trường',
  'hoi_sinh_vien_truong',
  'HOI_SINH_VIEN'
);

-- Tạo các tổ chức con cho Đoàn Trường
INSERT INTO organizations (name, description, type, code, "parentId")
SELECT
  'Đoàn Cơ sở Khoa CNTT',
  'Đoàn cơ sở khoa Công nghệ thông tin',
  'doan_co_so',
  'CNTT',
  id
FROM organizations
WHERE code = 'DOAN_TRUONG';

INSERT INTO organizations (name, description, type, code, "parentId")
SELECT
  'Chi Đoàn Lớp CC21',
  'Chi Đoàn Lớp CC21',
  'chi_doan',
  'CC21',
  id
FROM organizations
WHERE code = 'CNTT';

INSERT INTO organizations (name, description, type, code, "parentId")
SELECT
  'Chi Đoàn Lớp CC22',
  'Chi Đoàn Lớp CC22',
  'chi_doan',
  'CC22',
  id
FROM organizations
WHERE code = 'CNTT';

-- Tạo các tổ chức con cho Hội Sinh viên
INSERT INTO organizations (name, description, type, code, "parentId")
SELECT
  'Liên Chi Hội Khoa CNTT',
  'Liên Chi Hội Khoa Công nghệ Thông tin',
  'lien_chi_hoi',
  'LCH_CNTT',
  id
FROM organizations
WHERE code = 'HOI_SINH_VIEN';

INSERT INTO organizations (name, description, type, code, "parentId")
SELECT
  'Chi Hội Lớp CC21',
  'Chi Hội Sinh viên Lớp CC21',
  'chi_hoi',
  'CH_CC21',
  id
FROM organizations
WHERE code = 'LCH_CNTT';

INSERT INTO organizations (name, description, type, code, "parentId")
SELECT
  'Chi Hội Lớp CC22',
  'Chi Hội Sinh viên Lớp CC22',
  'chi_hoi',
  'CH_CC22',
  id
FROM organizations
WHERE code = 'LCH_CNTT';
  id
FROM organizations
WHERE code = 'HST';