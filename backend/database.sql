INSERT INTO organizations (name, description, type, code)
VALUES (
  'Đoàn Trường ĐHBK',
  'Đoàn Thanh niên Trường Đại học Bách khoa',
  'doan_truong',
  'DHBK'
);

INSERT INTO organizations (name, description, type, code, "parentId")
SELECT
  'Đoàn Cơ sở Khoa CNTT',
  'Đoàn cơ sở khoa Công nghệ thông tin',
  'doan_co_so',
  'CNTT',
  id
FROM organizations
WHERE code = 'DHBK';

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

INSERT INTO organizations (name, description, type, code)
VALUES (
  'Hội Sinh viên Trường',
  'Hội Sinh viên Trường ĐHBK',
  'hoi_sinh_vien_truong',
  'HST'
);

INSERT INTO organizations (name, description, type, code, "parentId")
SELECT
  'Liên Chi Hội Khoa CNTT',
  'Liên Chi Hội Khoa Công nghệ Thông tin',
  'lien_chi_hoi',
  'LCHCNTT',
  id
FROM organizations
WHERE code = 'HST';