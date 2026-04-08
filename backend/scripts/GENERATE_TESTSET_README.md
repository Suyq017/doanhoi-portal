# Generate Test Set Script

Script để tự động sinh bộ câu hỏi (test set) từ file Excel sử dụng LLM.

## Yêu cầu

1. **Ollama** đã được cài đặt và đang chạy
2. **Model qwen2.5:7b** đã được pull:
   ```bash
   ollama pull qwen2.5:7b
   ```

3. **Dependencies** cần thiết:
   - `@langchain/ollama`
   - `xlsx`

## Cài đặt dependencies

```bash
npm install @langchain/ollama xlsx
# hoặc
yarn add @langchain/ollama xlsx
```

## Cách sử dụng

### 1. Chạy script

```bash
cd backend
ts-node scripts/generate-testset.ts
```

### 2. Output

Script sẽ:
- Đọc file `test/data/eva_datasheet.xlsx`
- Lấy 50 dòng đầu tiên
- Sinh câu hỏi và câu trả lời cho mỗi dòng bằng LLM
- Lưu kết quả vào `test/data/golden_dataset.json`

### 3. Định dạng output

```json
[
  {
    "question": "Câu hỏi được sinh tự động",
    "ground_truth": "Câu trả lời tương ứng",
    "source_data": {
      // Dữ liệu gốc từ Excel
    }
  }
]
```

## Tùy chỉnh

### Thay đổi số lượng dòng xử lý

Trong file `generate-testset.ts`, dòng 16:
```typescript
const data = XLSX.utils.sheet_to_json(sheet).slice(0, 50); // Thay đổi 50 thành số khác
```

### Thay đổi model LLM

Trong file `generate-testset.ts`, dòng 7:
```typescript
const llm = new ChatOllama({ model: "qwen2.5:7b", temperature: 0.7 });
// Có thể đổi thành: llama3.2, gemma2, mistral, v.v.
```

### Thay đổi prompt

Chỉnh sửa biến `prompt` trong file để thay đổi cách LLM sinh câu hỏi.

## Lưu ý

- **Thời gian chạy**: Script có thể chạy khá lâu (vài phút đến vài chục phút) tùy thuộc vào:
  - Số lượng dòng cần xử lý
  - Tốc độ của máy
  - Model LLM được sử dụng
  
- **Lỗi parse JSON**: Một số response từ LLM có thể không đúng format JSON, script sẽ tự động bỏ qua những dòng này

- **Ollama phải đang chạy**: Đảm bảo Ollama service đang chạy trước khi thực thi script

## Troubleshooting

### Lỗi: "Cannot connect to Ollama"
```bash
# Kiểm tra Ollama đang chạy
ollama list

# Khởi động Ollama (nếu chưa chạy)
ollama serve
```

### Lỗi: "Model not found"
```bash
# Pull model về
ollama pull qwen2.5:7b
```

### Lỗi: "File not found"
Đảm bảo file `eva_datasheet.xlsx` có trong thư mục `backend/test/data/`
