// Script: generate-testset.ts
// Sinh bộ golden dataset từ file eva_datasheet.xlsx để đánh giá chất lượng hệ thống RAG CTXH
//
// Tính năng:
// - Checkpoint/resume: lưu tiến độ sau mỗi row, chạy lại sẽ tiếp tục từ chỗ dừng
// - Retry với exponential backoff khi gọi API thất bại
// - Rate limiting: delay giữa các lần gọi API để tránh bị throttle
// - Derived metadata: tự động suy ra tổ chức và danh mục từ mã CTXH
// - Output chuẩn cho RAG evaluation

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// ─── Cấu hình ────────────────────────────────────────────────────────────────

const CONFIG = {
  model: 'gemini-2.5-flash',
  temperature: 0.7,
  /** Delay (ms) giữa 2 lần gọi API để tránh rate limit */
  requestDelayMs: 1500,
  /** Số lần retry tối đa khi gọi API thất bại */
  maxRetries: 3,
  /** Base delay (ms) cho exponential backoff */
  retryBaseDelayMs: 2000,
  /** Đường dẫn file Excel input */
  inputExcel: path.join(__dirname, '../test/data/eva_datasheet.xlsx'),
  /** Đường dẫn file JSON output (golden dataset) */
  outputJson: path.join(__dirname, '../test/data/golden_dataset.json'),
  /** Đường dẫn file checkpoint (để resume) */
  checkpointJson: path.join(__dirname, '../test/data/golden_dataset.checkpoint.json'),
};

// ─── Mapping tổ chức (prefix mã CTXH → tên & id) ────────────────────────────

const ORGANIZATION_MAP: Record<string, { id: string; name: string; code: string }> = {
  VP: { id: '406d98f1-cd10-4cb5-9615-c3ef00ee10f4', name: 'Liên chi đoàn Văn Phòng Đào Tạo Quốc Tế',         code: 'LIEN_CHI_DOAN_QT' },
  DD: { id: 'f34374fa-1258-4b67-9e35-3e47af7a6608', name: 'Liên chi đoàn Khoa Điện Điện tử',                  code: 'LIEN_CHI_DOAN_DD' },
  XD: { id: 'a0d863e3-7183-4df2-8fb8-1e48865827ed', name: 'Liên chi đoàn Khoa Kỹ Thuật Xây Dựng',             code: 'LIEN_CHI_DOAN_XD' },
  GT: { id: 'a7a06a4d-4729-4596-b881-03f976a523cb', name: 'Liên chi đoàn Khoa Kỹ Thuật Giao Thông',           code: 'LIEN_CHI_DOAN_GT' },
  CK: { id: 'd626a54e-5878-4fd6-829b-9fe3cf6d6f6c', name: 'Liên chi đoàn Khoa Cơ khí',                        code: 'LIEN_CHI_DOAN_CK' },
  MT: { id: '3f68f818-6ff1-49e0-80df-010b5ad2ba77', name: 'Liên chi đoàn Khoa Khoa học và Kỹ thuật Máy tính', code: 'LIEN_CHI_DOAN_MT' },
  MO: { id: 'fbd641f1-736b-409c-a5eb-96c3ddf40378', name: 'Liên chi đoàn Khoa Môi trường và Tài nguyên',      code: 'LIEN_CHI_DOAN_MO' },
  UD: { id: 'c14f99bc-df51-4813-988d-032912c1e08a', name: 'Liên chi đoàn Khoa Khoa Học Ứng Dụng',             code: 'LIEN_CHI_DOAN_UD' },
  HC: { id: '5c20dc90-3f3c-4476-83f7-b7fa5762bbbe', name: 'Liên chi đoàn Khoa Kỹ Thuật Hóa Học',             code: 'LIEN_CHI_DOAN_HC' },
  DC: { id: '888ab4d5-ba3f-453b-b6e3-2ea421dda6d0', name: 'Liên chi đoàn Khoa Kỹ thuật Địa chất và Dầu khí', code: 'LIEN_CHI_DOAN_DC' },
  VL: { id: 'db51fdf8-b396-488d-9504-43207473f7ef', name: 'Liên chi đoàn Khoa Công Nghệ Vật Liệu',            code: 'LIEN_CHI_DOAN_VL' },
  QL: { id: '69e5d561-dd4c-4230-863e-5f527ded5793', name: 'Liên chi đoàn Khoa Quản Lý Công Nghiệp',           code: 'LIEN_CHI_DOAN_QL' },
  BD: { id: '17568d1e-ba64-4941-bb0a-64b8f2f0e3f2', name: 'Liên chi đoàn Trung tâm Đào tạo Bảo dưỡng Công nghiệp', code: 'LIEN_CHI_DOAN_BD' },
};

const DEFAULT_ORGANIZATION = {
  id: 'c6e1f42a-9b5f-426e-9b4b-0ae21551c873',
  name: 'Đoàn Trường',
  code: 'DOAN_TRUONG',
};

/** Suy ra tổ chức từ prefix của mã CTXH */
function resolveOrganization(maCtxh: string) {
  if (!maCtxh) return DEFAULT_ORGANIZATION;
  const prefix = maCtxh.slice(0, 2).toUpperCase();
  return ORGANIZATION_MAP[prefix] ?? DEFAULT_ORGANIZATION;
}

// ─── Danh mục CTXH ───────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: '8a1dd0d1-5d07-4d38-8a3c-18e94d8508bf', name: 'Khoa Học máy tính' },
  { id: 'a4646e70-d12e-4ef7-8445-d9eae584e9d1', name: 'Hoạt động công tác xã hội (dọn kho, phòng thí nghiệm, môi trường….)' },
  { id: 'b7718b9a-50ce-4857-8b2c-2234f4a0eb99', name: 'Chương trình Hội trại, ngày hội' },
  { id: '5c115914-72da-436b-9a95-9af0d15f4689', name: 'Đêm hội trăng rằm (Trung thu)' },
  { id: 'd2fb1996-70a9-44ff-bae0-2c482e32ef90', name: 'Các cuộc thi học thuật (môi trường xanh, cơn lốc hóa học,…)' },
  { id: 'da771a1f-f92e-4e00-9160-e545c16c3796', name: 'Hoạt động khác' },
  { id: '876d9e97-8451-463e-86dd-2aae6c5ee7b7', name: 'Ngày hội việc làm' },
  { id: '9022ce7f-f8ed-4e8d-889f-c0d9bc18bab5', name: 'Hiến máu tình nguyện' },
  { id: '7e5601c3-b1ac-465a-88d1-c66e42e0d857', name: 'Hoạt động Công tác xã hội (tình nguyện) tại mái ấm, nhà mở, làng trẻ em, khu điều dưỡng cho người già…' },
  { id: '4e033597-c323-4dcc-9e26-62c7f9c62af0', name: 'Các danh hiệu tuyên dương khen thưởng sinh viên' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Gọi API với retry + exponential backoff */
async function invokeWithRetry(
  llm: ChatGoogleGenerativeAI,
  prompt: string,
  maxRetries = CONFIG.maxRetries,
): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await llm.invoke(prompt);
      return typeof res.content === 'string' ? res.content : JSON.stringify(res.content);
    } catch (err: any) {
      if (attempt === maxRetries) throw err;
      const delay = CONFIG.retryBaseDelayMs * Math.pow(2, attempt - 1);
      console.warn(`  ⚠ Attempt ${attempt} failed: ${err.message}. Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  throw new Error('Unreachable');
}

/** Parse JSON từ phản hồi LLM, loại bỏ markdown code fence nếu có */
function parseJsonResponse(raw: string): { question: string; ground_truth: string } {
  const cleaned = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
  const parsed = JSON.parse(cleaned);
  if (!parsed.question || !parsed.ground_truth) {
    throw new Error('Missing required fields: question or ground_truth');
  }
  return parsed as { question: string; ground_truth: string };
}

// ─── Prompt builder ──────────────────────────────────────────────────────────

function buildPrompt(row: Record<string, any>): string {
  const orgList = Object.entries(ORGANIZATION_MAP)
    .map(([prefix, o]) => `nếu mã CTXH bắt đầu bằng "${prefix}" thì thuộc về ${o.name}`)
    .join('\n');

  const orgTable = [
    DEFAULT_ORGANIZATION,
    ...Object.values(ORGANIZATION_MAP),
  ]
    .map((o) => `${o.id}, ${o.name}, ${o.code}`)
    .join('\n');

  const categoryTable = CATEGORIES.map((c) => `${c.id}, ${c.name}`).join('\n');

  return `
Bạn là một trợ lý sinh câu hỏi cho hệ thống quản lý hoạt động công tác xã hội sinh viên.

Dữ liệu hoạt động CTXH:
- Mã CTXH: ${row['Mã ctxh'] || 'N/A'}
- Tên CTXH: ${row['Tên CTXH'] || 'N/A'}
- Địa điểm: ${row['Địa điểm (list)'] || 'N/A'}
- Loại hoạt động: ${row['Loại hoạt động'] || 'N/A'}
- Nội dung: ${row['Nội dung'] || 'N/A'}
- Ngày tạo: ${row['Ngày tạo'] || 'N/A'}
- Thời gian thực hiện: ${row['Thời gian thực hiện'] || 'N/A'}
- Ngày Mod duyệt: ${row['Ngày Mod duyệt'] || 'N/A'}
- Ngày đề xuất: ${row['Ngày đề xuất'] || 'N/A'}
- Thời lượng (ngày): ${row['Thời lượng (ngày)'] || 'N/A'}

Hoạt động này thuộc về khoa/tổ chức nào? Quy tắc xác định từ prefix mã CTXH:
${orgList}
Nếu mã CTXH không bắt đầu bằng các prefix trên thì thuộc về Đoàn Trường.

Danh sách tổ chức (id | name | code):
${orgTable}

Hoạt động này thuộc danh mục nào? Danh sách danh mục (id | name):
${categoryTable}

Hãy tạo 1 câu hỏi TỰ NHIÊN và THỰC DỤNG mà sinh viên thực sự có thể hỏi về hoạt động CTXH này, kèm theo câu trả lời ngắn gọn, chính xác dựa hoàn toàn trên dữ liệu trên.

LƯU Ý QUAN TRỌNG:
- KHÔNG hỏi về mã CTXH (vd: "Hoạt động nào có mã BD25CTX0001?") vì sinh viên không biết mã
- Hỏi các câu hỏi THỰC DỤNG về: nội dung hoạt động, địa điểm, thời gian, thời lượng, loại hoạt động, tổ chức
- Câu hỏi phải tự nhiên như cách sinh viên nói chuyện thực tế
- Câu trả lời phải ngắn gọn, chỉ trả lời đúng câu hỏi, không thêm thông tin không liên quan

VÍ DỤ CÂU HỎI TỐT:
- "Có hoạt động hiến máu tình nguyện nào sắp diễn ra không?"
- "Hoạt động nào ở ĐHBK có nhiều ngày CTXH nhất?"
- "Hoạt động dọn vệ sinh môi trường nào đang mở đăng ký?"
- "Tháng này có hoạt động tình nguyện nào ở cơ sở 2 không?"
- "Hoạt động nào kéo dài 5 ngày trở lên?"
- "Có hoạt động hội trại nào trong tháng 3 không?"
- "Hoạt động CTXH nào được duyệt gần đây?"
- "Khoa Cơ khí có hoạt động CTXH nào đang diễn ra?"

Chỉ trả về JSON với format sau, không thêm bất kỳ nội dung nào khác:
{ "question": "câu hỏi tự nhiên và thực dụng", "ground_truth": "câu trả lời ngắn gọn" }
  `.trim();
}

// ─── Cấu trúc một phần tử trong golden dataset ───────────────────────────────

interface GoldenDatasetItem {
  /** Câu hỏi sinh viên có thể hỏi hệ thống RAG */
  question: string;
  /** Câu trả lời đúng (ground truth) để so sánh với câu trả lời của RAG */
  ground_truth: string;
  /** Metadata để trace kết quả về dữ liệu gốc khi đánh giá */
  metadata: {
    ma_ctxh: string;
    ten_ctxh: string;
    noi_dung: string;
    organization: { id: string; name: string; code: string };
    dia_diem: string;
    loai_hoat_dong: string;
    thoi_luong_ngay: string | number;
    thoi_gian_thuc_hien: string;
    ngay_mod_duyet: string;
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function generateTestSet() {
  // 1. Đọc Excel
  if (!fs.existsSync(CONFIG.inputExcel)) {
    console.error(`Không tìm thấy file input: ${CONFIG.inputExcel}`);
    process.exit(1);
  }

  console.log(`Đang đọc file: ${CONFIG.inputExcel}`);
  const workbook = XLSX.readFile(CONFIG.inputExcel);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[];
  console.log(`Đã đọc được ${data.length} dòng dữ liệu CTXH`);

  // 2. Load checkpoint nếu có (resume)
  let checkpoint: GoldenDatasetItem[] = [];
  if (fs.existsSync(CONFIG.checkpointJson)) {
    try {
      checkpoint = JSON.parse(fs.readFileSync(CONFIG.checkpointJson, 'utf-8'));
      console.log(`→ Tìm thấy checkpoint với ${checkpoint.length} mục. Tiếp tục từ dòng ${checkpoint.length + 1}.`);
    } catch {
      console.warn('→ Checkpoint bị lỗi, bắt đầu lại từ đầu.');
    }
  }

  const testSet: GoldenDatasetItem[] = [...checkpoint];
  const startIndex = testSet.length;

  // 3. Khởi tạo LLM
  const llm = new ChatGoogleGenerativeAI({
    model: CONFIG.model,
    temperature: CONFIG.temperature,
    apiKey: process.env.GEMINI_API_KEY,
  });

  let successCount = 0;
  let failCount = 0;

  // 4. Sinh câu hỏi cho từng dòng dữ liệu
  for (let i = startIndex; i < data.length; i++) {
    const row = data[i];
    const maCtxh = String(row['Mã ctxh'] || '');
    process.stdout.write(`[${i + 1}/${data.length}] Mã: ${maCtxh || 'N/A'} ... `);

    try {
      const prompt = buildPrompt(row);
      const rawResponse = await invokeWithRetry(llm, prompt);
      const qaPair = parseJsonResponse(rawResponse);

      const item: GoldenDatasetItem = {
        question: qaPair.question,
        ground_truth: qaPair.ground_truth,
        metadata: {
          ma_ctxh: maCtxh,
          ten_ctxh: String(row['Tên CTXH'] || ''),
          noi_dung: String(row['Nội dung'] || ''),
          organization: resolveOrganization(maCtxh),
          dia_diem: String(row['Địa điểm (list)'] || ''),
          loai_hoat_dong: String(row['Loại hoạt động'] || ''),
          thoi_luong_ngay: row['Thời lượng (ngày)'] ?? '',
          thoi_gian_thuc_hien: String(row['Thời gian thực hiện'] || ''),
          ngay_mod_duyet: String(row['Ngày Mod duyệt'] || ''),
        },
      };

      testSet.push(item);
      successCount++;
      console.log('✓');

      // Lưu checkpoint sau mỗi row thành công
      fs.writeFileSync(CONFIG.checkpointJson, JSON.stringify(testSet, null, 2), 'utf-8');
    } catch (err: any) {
      failCount++;
      console.log(`✗ (${err.message})`);
    }

    // Rate limiting: đợi trước lần gọi tiếp theo
    if (i < data.length - 1) {
      await sleep(CONFIG.requestDelayMs);
    }
  }

  // 5. Ghi file output cuối cùng
  fs.mkdirSync(path.dirname(CONFIG.outputJson), { recursive: true });
  fs.writeFileSync(CONFIG.outputJson, JSON.stringify(testSet, null, 2), 'utf-8');

  // 6. Xóa checkpoint sau khi hoàn thành
  if (fs.existsSync(CONFIG.checkpointJson)) {
    fs.unlinkSync(CONFIG.checkpointJson);
  }

  // 7. Thống kê
  const sep = '='.repeat(80);
  console.log(`\n${sep}`);
  console.log(`HOÀN THÀNH SINH GOLDEN DATASET`);
  console.log(sep);
  console.log(`Tổng dòng dữ liệu đầu vào : ${data.length}`);
  console.log(`Thành công                 : ${successCount}`);
  console.log(`Thất bại                   : ${failCount}`);
  console.log(`Tổng câu Q&A trong dataset : ${testSet.length}`);
  console.log(`File output                : ${CONFIG.outputJson}`);

  // Thống kê phân bố theo tổ chức
  const orgDist: Record<string, number> = {};
  for (const item of testSet) {
    const orgName = item.metadata.organization.name;
    orgDist[orgName] = (orgDist[orgName] ?? 0) + 1;
  }
  console.log(`\nPhân bố theo tổ chức:`);
  Object.entries(orgDist)
    .sort((a, b) => b[1] - a[1])
    .forEach(([org, count]) => console.log(`  ${count.toString().padStart(3)}  ${org}`));

  console.log(sep);
}

// Chạy script
generateTestSet().catch((err) => {
  console.error('Lỗi nghiêm trọng:', err);
  process.exit(1);
});
