// Script: generate-testset.ts
// Sinh bộ câu hỏi từ file eva_datasheet.xlsx
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  temperature: 0.7,
  apiKey: process.env.GEMINI_API_KEY,
});

async function generateTestSet() {
  try {
    // 1. Đọc Excel từ thư mục test/data
    const excelPath = path.join(__dirname, '../test/data/eva_datasheet.xlsx');
    console.log(`Đang đọc file: ${excelPath}`);
    
    const workbook = XLSX.readFile(excelPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    // sheet_to_json tự động lấy dòng đầu làm header, không cần slice(1)
    const data = XLSX.utils.sheet_to_json(sheet); // Đọc tất cả 100 dòng dữ liệu CTXH
    
    console.log(`Đã đọc được ${data.length} dòng dữ liệu CTXH`);
    
    const testSet = [];

    // 2. Loop và sinh câu hỏi
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      console.log(`Đang xử lý dòng ${i + 1}/${data.length}...`);
      
      const prompt = `
Bạn là một trợ lý sinh câu hỏi cho hệ thống quản lý hoạt động công tác xã hội sinh viên.

Dữ liệu hoạt động CTXH:
- Mã CTXH: ${row['Mã ctxh'] || 'N/A'}
- Địa điểm: ${row['Địa điểm (list)'] || 'N/A'}
- Loại hoạt động: ${row['Loại hoạt động'] || 'N/A'}
- Nội dung: ${row['Nội dung'] || 'N/A'}
- Ngày tạo: ${row['Ngày tạo'] || 'N/A'}
- Thời gian thực hiện: ${row['Thời gian thực hiện'] || 'N/A'}
- Ngày Mod duyệt: ${row['Ngày Mod duyệt'] || 'N/A'}
- Ngày đề xuất: ${row['Ngày đề xuất'] || 'N/A'}
- Thời lượng (ngày): ${row['Thời lượng (ngày)'] || 'N/A'}

Hãy tạo 1 câu hỏi TỰ NHIÊN và THỰC DỤNG mà sinh viên thực sự có thể hỏi về hoạt động CTXH này, kèm theo câu trả lời ngắn gọn.

LƯU Ý QUAN TRỌNG:
- KHÔNG hỏi về mã CTXH (vd: "Hoạt động nào có mã BD25CTX0001?") vì sinh viên không biết mã
- Hỏi các câu hỏi THỰC DỤNG về: nội dung hoạt động, địa điểm, thời gian, thời lượng, loại hoạt động
- Câu hỏi phải tự nhiên như cách sinh viên nói chuyện thực tế

VÍ DỤ CÂU HỎI TỐT:
- "Có hoạt động hiến máu nào sắp diễn ra không?"
- "Hoạt động nào ở ĐHBK có nhiều ngày CTXH nhất?"
- "Hoạt động dọn vệ sinh môi trường nào đang mở đăng ký?"
- "Tháng này có hoạt động tình nguyện nào ở cơ sở 2 không?"
- "Hoạt động nào kéo dài 5 ngày trở lên?"
- "Có hoạt động hội trại nào trong tháng 3 không?"
- "Hoạt động CTXH nào được duyệt gần đây?"

Chỉ trả về JSON với format: { "question": "câu hỏi tự nhiên và thực dụng", "ground_truth": "câu trả lời ngắn gọn" }
      `;
      
      try {
        // Gọi LLM sinh câu hỏi (Bước này chạy hơi lâu, kiên nhẫn)
        const res = await llm.invoke(prompt);
        const content = typeof res.content === 'string' ? res.content : JSON.stringify(res.content);
        
        // Loại bỏ markdown code block nếu có
        const cleanContent = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        
        // Thử parse JSON
        const qaPair = JSON.parse(cleanContent);
        
        // Validate có đủ fields không
        if (!qaPair.question || !qaPair.ground_truth) {
          throw new Error('Missing required fields: question or ground_truth');
        }
        
        testSet.push({
          question: qaPair.question,
          ground_truth: qaPair.ground_truth,
          source_data: {
            'Mã ctxh': row['Mã ctxh'],
            'Địa điểm (list)': row['Địa điểm (list)'],
            'Loại hoạt động': row['Loại hoạt động'],
            'Nội dung': row['Nội dung'],
            'Ngày tạo': row['Ngày tạo'],
            'Thời gian thực hiện': row['Thời gian thực hiện'],
            'Ngày Mod duyệt': row['Ngày Mod duyệt'],
            'Ngày đề xuất': row['Ngày đề xuất'],
            'Thời lượng (ngày)': row['Thời lượng (ngày)']
          }
        });
        console.log(`✓ Đã tạo câu hỏi cho dòng ${i + 1}`);
      } catch (e) {
        console.log(`✗ Lỗi ở dòng ${i + 1}: ${e.message}`);
        console.log(`  Mã CTXH: ${row['Mã ctxh'] || 'N/A'}`);
      }
    }

    // 3. Lưu file vào thư mục test/data
    const outputPath = path.join(__dirname, '../test/data/golden_dataset.json');
    fs.writeFileSync(outputPath, JSON.stringify(testSet, null, 2));
    
    console.log("\n" + "=".repeat(100));
    console.log(`✓ Đã tạo xong bộ câu hỏi!`);
    console.log(`✓ Tổng số câu hỏi: ${testSet.length}`);
    console.log(`✓ File output: ${outputPath}`);
    console.log("=".repeat(100));
  } catch (error) {
    console.error("Lỗi khi tạo test set:", error);
    process.exit(1);
  }
}

// Chạy script
generateTestSet();
