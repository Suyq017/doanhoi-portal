// Script: excel-to-sql.ts
// Đọc file eva_datasheet.xlsx và sinh file SQL INSERT vào bảng ctxh_activity
//
// Cột Excel → cột DB:
//   Nội dung              → name  (& description)
//   Địa điểm (list)       → location
//   Loại hoạt động        → category_id  (keyword match)
//   Mã ctxh (prefix)      → organization_id
//   Thời gian thực hiện   → start_date, end_date  ("DD-MM-YYYY -> DD-MM-YYYY")
//   Ngày tạo              → created_at  ("DD/MM/YYYY")
//   Thời lượng (ngày)     → total_days

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

// ─── Cấu hình ────────────────────────────────────────────────────────────────

const INPUT_EXCEL  = path.join(__dirname, '../test/data/eva_datasheet.xlsx');
const OUTPUT_SQL   = path.join(__dirname, 'insert-ctxh-activities-from-excel.sql');

/** UUID của user "tạo mặc định" – thay bằng user thực nếu cần */
const DEFAULT_CREATED_BY = '9fb5a583-0d4d-4102-8bda-aaae7ab63a32';

// ─── Mapping tổ chức ─────────────────────────────────────────────────────────

const ORGANIZATION_MAP: Record<string, { id: string; name: string }> = {
  VP: { id: '406d98f1-cd10-4cb5-9615-c3ef00ee10f4', name: 'Liên chi đoàn VPĐTQT' },
  DD: { id: 'f34374fa-1258-4b67-9e35-3e47af7a6608', name: 'Liên chi đoàn Điện – Điện tử' },
  XD: { id: 'a0d863e3-7183-4df2-8fb8-1e48865827ed', name: 'Liên chi đoàn Xây Dựng' },
  GT: { id: 'a7a06a4d-4729-4596-b881-03f976a523cb', name: 'Liên chi đoàn Giao Thông' },
  CK: { id: 'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c', name: 'Liên chi đoàn Cơ khí' },
  MT: { id: '3f68f818-6ff1-49e0-80df-010b5ad2ba77', name: 'Liên chi đoàn KH-KTMT' },
  MO: { id: 'fbd641f1-736b-409c-a5eb-96c3ddf40378', name: 'Liên chi đoàn Môi trường' },
  UD: { id: 'c14f99bc-df51-4813-988d-032912c1e08a', name: 'Liên chi đoàn Khoa Học Ứng Dụng' },
  HC: { id: '5c20dc90-3f3c-4476-83f7-b7fa5762bbbe', name: 'Liên chi đoàn Hóa Học' },
  DC: { id: '888ab4d5-ba3f-453b-b6e3-2ea421dda6d0', name: 'Liên chi đoàn Địa chất – Dầu khí' },
  VL: { id: 'db51fdf8-b396-488d-9504-43207473f7ef', name: 'Liên chi đoàn Vật Liệu' },
  QL: { id: '69e5d561-dd4c-4230-863e-5f527ded5793', name: 'Liên chi đoàn Quản Lý CN' },
  BD: { id: '17568d1e-ba64-4941-bb0a-64b8f2f0e3f2', name: 'Liên chi đoàn Bảo dưỡng CN' },
};

const DEFAULT_ORG = { id: 'c6e1f42a-9b5f-426e-9b4b-0ae21551c873', name: 'Đoàn Trường' };

function resolveOrganization(maCtxh: string): { id: string; name: string } {
  const prefix = (maCtxh || '').slice(0, 2).toUpperCase();
  return ORGANIZATION_MAP[prefix] ?? DEFAULT_ORG;
}

// ─── Mapping danh mục (keyword → uuid) ───────────────────────────────────────

interface Category { id: string; name: string; keywords: string[] }

const CATEGORIES: Category[] = [
  {
    id: '9022ce7f-f8ed-4e8d-889f-c0d9bc18bab5',
    name: 'Hiến máu tình nguyện',
    keywords: ['hiến máu', 'hien mau'],
  },
  {
    id: '9022ce7f-f8ed-4e8d-889f-c0d9bc18bab5',
    name: 'Hiến máu tình nguyện',
    keywords: ['hiến máu'],
  },
  {
    id: 'b7718b9a-50ce-4857-8b2c-2234f4a0eb99',
    name: 'Chương trình Hội trại, ngày hội',
    keywords: ['hội trại', 'hoi trai', 'ngày hội', 'ngay hoi', 'camp'],
  },
  {
    id: '5c115914-72da-436b-9a95-9af0d15f4689',
    name: 'Đêm hội trăng rằm (Trung thu)',
    keywords: ['trăng rằm', 'trung thu', 'trang ram'],
  },
  {
    id: 'd2fb1996-70a9-44ff-bae0-2c482e32ef90',
    name: 'Các cuộc thi học thuật',
    keywords: ['học thuật', 'cuộc thi', 'hoc thuat', 'cuoc thi', 'olympic', 'khoa học', 'khoa hoc'],
  },
  {
    id: '876d9e97-8451-463e-86dd-2aae6c5ee7b7',
    name: 'Ngày hội việc làm',
    keywords: ['việc làm', 'viec lam', 'tuyển dụng', 'tuyen dung', 'job fair'],
  },
  {
    id: '7e5601c3-b1ac-465a-88d1-c66e42e0d857',
    name: 'Tình nguyện (mái ấm, làng trẻ, …)',
    keywords: ['tình nguyện', 'tinh nguyen', 'mái ấm', 'mai am', 'làng trẻ', 'lang tre', 'nhà mở', 'nha mo', 'khu điều dưỡng'],
  },
  {
    id: 'a4646e70-d12e-4ef7-8445-d9eae584e9d1',
    name: 'CTXH (dọn kho, PTN, môi trường…)',
    keywords: ['dọn', 'don ', 'vệ sinh', 've sinh', 'kho', 'phòng thí nghiệm', 'ptn', 'môi trường', 'moi truong', 'xưởng', 'xuong'],
  },
  {
    id: '8a1dd0d1-5d07-4d38-8a3c-18e94d8508bf',
    name: 'Khoa Học máy tính',
    keywords: ['máy tính', 'may tinh', 'miwai', 'ict', 'cntt', 'it '],
  },
  {
    id: '4e033597-c323-4dcc-9e26-62c7f9c62af0',
    name: 'Danh hiệu khen thưởng',
    keywords: ['khen thưởng', 'khen thuong', 'danh hiệu', 'danh hieu', 'tuyên dương', 'tuyen duong'],
  },
];

const DEFAULT_CATEGORY_ID = 'da771a1f-f92e-4e00-9160-e545c16c3796'; // Hoạt động khác

function resolveCategory(loaiHoatDong: string): string {
  const lower = (loaiHoatDong || '').toLowerCase();
  for (const cat of CATEGORIES) {
    if (cat.keywords.some((kw) => lower.includes(kw))) return cat.id;
  }
  return DEFAULT_CATEGORY_ID;
}

// ─── Helpers ngày tháng ───────────────────────────────────────────────────────

/**
 * Parse "DD-MM-YYYY" hoặc "DD/MM/YYYY" → "YYYY-MM-DD"
 * Trả về null nếu không parse được.
 */
function parseDate(raw: string | number | undefined): string | null {
  if (!raw) return null;
  const str = String(raw).trim();

  // Nếu là số serial Excel (ví dụ: 46069)
  if (/^\d{5}$/.test(str)) {
    const date = XLSX.SSF.parse_date_code(Number(str));
    if (date) {
      const y = date.y;
      const m = String(date.m).padStart(2, '0');
      const d = String(date.d).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  // DD-MM-YYYY hoặc DD/MM/YYYY
  const match = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (match) {
    const [, d, m, y] = match;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // YYYY-MM-DD (đã đúng định dạng)
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);

  return null;
}

/**
 * Parse "Thời gian thực hiện": "16-02-2025 -> 22-02-2025"
 * Trả về { start, end } với format YYYY-MM-DD.
 */
function parseDateRange(raw: string | undefined): { start: string | null; end: string | null } {
  if (!raw) return { start: null, end: null };
  const str = String(raw).trim();

  // Dạng "date -> date" hoặc "date - date" hoặc "date đến date"
  const sepMatch = str.match(/^(.+?)\s*(?:->|–|đến|den)\s*(.+)$/i);
  if (sepMatch) {
    return {
      start: parseDate(sepMatch[1].trim()),
      end:   parseDate(sepMatch[2].trim()),
    };
  }

  // Chỉ có một ngày
  const single = parseDate(str);
  return { start: single, end: single };
}

// ─── Escape SQL string ────────────────────────────────────────────────────────

function sqlStr(value: string | null | undefined, maxLen?: number): string {
  if (value === null || value === undefined || String(value).trim() === '') return 'NULL';
  let str = String(value);
  if (maxLen && str.length > maxLen) str = str.slice(0, maxLen);
  return "'" + str.replace(/'/g, "''") + "'";
}

function sqlUuid(uuid: string): string {
  return `'${uuid}'::uuid`;
}

function sqlTimestamp(dateStr: string | null): string {
  if (!dateStr) return 'NULL';
  return `'${dateStr}'::timestamp`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function generateSql(): void {
  if (!fs.existsSync(INPUT_EXCEL)) {
    console.error(`Không tìm thấy file: ${INPUT_EXCEL}`);
    process.exit(1);
  }

  console.log(`Đọc file Excel: ${INPUT_EXCEL}`);
  const workbook = XLSX.readFile(INPUT_EXCEL);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[];
  console.log(`Số dòng dữ liệu: ${rows.length}`);

  const lines: string[] = [];
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  lines.push(`-- Auto-generated SQL from eva_datasheet.xlsx`);
  lines.push(`-- Generated at: ${now}`);
  lines.push(`-- Total rows: ${rows.length}`);
  lines.push(`-- Created by: ${DEFAULT_CREATED_BY}`);
  lines.push('');
  // Xóa toàn bộ dữ liệu cũ trước khi insert mới
  lines.push('TRUNCATE TABLE ctxh_activity RESTART IDENTITY CASCADE;');
  lines.push('');

  let successCount = 0;
  let skipCount    = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    const maCtxh      = String(row['Mã ctxh']              || '').trim();
    const tenCtxh     = String(row['Tên CTXH']             || '').trim();
    const noiDung     = String(row['Nội dung']             || '').trim();
    const diaDiem     = String(row['Địa điểm (list)']      || '').trim();
    const loaiHD      = String(row['Loại hoạt động']       || '').trim();
    const thoiLuong   = row['Thời lượng (ngày)'];
    const ngayTao     = row['Ngày tạo'];
    const thoiGianTH  = String(row['Thời gian thực hiện']  || '').trim();

    // Bỏ qua dòng không có tên
    if (!tenCtxh) {
      console.warn(`  [Dòng ${i + 1}] Bỏ qua: không có Tên CTXH`);
      skipCount++;
      continue;
    }

    const org         = resolveOrganization(maCtxh);
    const categoryId  = resolveCategory(loaiHD);
    const { start, end } = parseDateRange(thoiGianTH);
    const createdAt   = parseDate(ngayTao) ?? now.slice(0, 10);
    const totalDays   = thoiLuong !== undefined && thoiLuong !== '' ? Number(thoiLuong) : 1;

    lines.push(`-- [${i + 1}/${rows.length}] ${maCtxh || 'N/A'} | ${org.name}`);
    lines.push(`INSERT INTO ctxh_activity (`);
    lines.push(`    id, name, description,`);
    lines.push(`    category_id, organization_id,`);
    lines.push(`    start_date, end_date, total_days, location,`);
    lines.push(`    status, created_by, created_at, updated_at`);
    lines.push(`) VALUES (`);
    lines.push(`    gen_random_uuid(),`);
    lines.push(`    ${sqlStr(tenCtxh, 255)},`);
    lines.push(`    ${sqlStr(noiDung)},`);
    lines.push(`    ${sqlUuid(categoryId)},`);
    lines.push(`    ${sqlUuid(org.id)},`);
    lines.push(`    ${sqlTimestamp(start)}, ${sqlTimestamp(end)},`);
    lines.push(`    ${isNaN(totalDays) ? 1 : totalDays},`);
    lines.push(`    ${sqlStr(diaDiem)},`);
    lines.push(`    'ACTIVE',`);
    lines.push(`    ${sqlUuid(DEFAULT_CREATED_BY)},`);
    lines.push(`    '${createdAt}'::timestamp,`);
    lines.push(`    NOW()`);
    lines.push(`);`);
    lines.push('');

    successCount++;
    console.log(`  [${i + 1}/${rows.length}] ✓ ${maCtxh || '(no code)'} — ${tenCtxh.slice(0, 60)}`);
  }

  // ── Thống kê sau khi insert ──────────────────────────────────────────────
  lines.push('');
  lines.push('-- ─── Thống kê sau khi insert ────────────────────────────────────────────────');
  lines.push(`SELECT`);
  lines.push(`    'Tổng số hoạt động vừa thêm:' AS description,`);
  lines.push(`    COUNT(*) AS count`);
  lines.push(`FROM ctxh_activity`);
  lines.push(`WHERE created_by = ${sqlUuid(DEFAULT_CREATED_BY)}`);
  lines.push(`  AND updated_at > NOW() - INTERVAL '5 minutes';`);
  lines.push('');
  lines.push(`SELECT`);
  lines.push(`    name, start_date, end_date, total_days, location, status, created_at`);
  lines.push(`FROM ctxh_activity`);
  lines.push(`WHERE created_by = ${sqlUuid(DEFAULT_CREATED_BY)}`);
  lines.push(`  AND updated_at > NOW() - INTERVAL '5 minutes'`);
  lines.push(`ORDER BY created_at DESC;`);

  fs.mkdirSync(path.dirname(OUTPUT_SQL), { recursive: true });
  fs.writeFileSync(OUTPUT_SQL, lines.join('\n'), 'utf-8');

  const sep = '='.repeat(70);
  console.log(`\n${sep}`);
  console.log(`HOÀN THÀNH SINH SQL`);
  console.log(sep);
  console.log(`Tổng dòng Excel đọc được  : ${rows.length}`);
  console.log(`INSERT thành công          : ${successCount}`);
  console.log(`Dòng bị bỏ qua             : ${skipCount}`);
  console.log(`File output                : ${OUTPUT_SQL}`);
  console.log(sep);
}

generateSql();
