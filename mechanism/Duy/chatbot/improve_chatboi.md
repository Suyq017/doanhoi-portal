Hướng dẫn cải thiện AI Chatbot CTXH — Đoàn Hội Portal
Mục tiêu: Giúp AI trợ lý Đoàn Hội trả lời linh hoạt, chính xác, chuyên nghiệp hơn — đặc biệt với các câu hỏi tổng quát mà hiện tại chatbot đang trả lời sai hoặc cứng nhắc.

1. Phân tích vấn đề hiện tại
1.1 Triệu chứng
Câu hỏi
Kết quả
Đáng lẽ phải trả lời
"Hoạt động CTXH nào sẽ diễn ra trong tương lai?"
"Hiện tại chưa có thông tin..."
Liệt kê tất cả hoạt động upcoming/ongoing
"Liệt kê cho tui các hoạt động sẽ diễn ra"
"Hiện tại chưa có thông tin..."
Liệt kê tất cả hoạt động upcoming
"Có hoạt động nào đang mở không?"
Có thể trả lời đúng
✅ Đúng vì "đang mở" nằm trong bảng ánh xạ
"Có hoạt động nào về JobFair CSE không?"
Trả lời đúng
✅ Đúng vì tìm theo keyword tên cụ thể

1.2 Nguyên nhân gốc rễ
Có 5 nguyên nhân chính gây ra vấn đề, được xếp theo mức độ nghiêm trọng:
🔴 P0 — Bảng ánh xạ trạng thái thiếu từ đồng nghĩa tiếng Việt
File: backend/src/ctxh-chat/prompts/filter-extraction.prompt.ts (line 22-23)
Hiện tại:
• "đang diễn ra / đang có / hiện tại / đang mở / đang tổ chức / hôm nay" → ongoing
• "sắp tới / sắp diễn ra / sắp có / sắp mở / tới đây" → upcoming
• "đã kết thúc / đã qua / đã diễn ra / trước đây / đã hết" → ended


Thiếu các cụm từ phổ biến:
"sẽ diễn ra" / "sẽ tổ chức" / "sẽ có" / "sẽ mở" → upcoming ❌ THIẾU
"trong tương lai" / "sắp tới đây" / "trong thời gian tới" → upcoming ❌ THIẾU
"tuần tới" / "tháng tới" / "năm tới" → upcoming ❌ THIẾU
"còn mở đăng ký" / "đang tuyển" / "đang nhận đăng ký" → ongoing ❌ THIẾU
🔴 P0 — RAG prompt quá nghiêm ngặt khi context rỗng
File: backend/src/ctxh-chat/prompts/ctxh-chat.prompts.ts (line 24-27)
- Nếu context RỖNG hoặc không chứa thông tin phù hợp với câu hỏi:
  * CHỈ trả lời MỘT câu duy nhất: "Hiện tại chưa có thông tin về hoạt động này trong hệ thống."
  * DỪNG LẠI NGAY - KHÔNG viết thêm BẤT KỲ câu nào sau đó.


Vấn đề: Khi context thực sự có hoạt động nhưng retrieval lỗi (do filter thiếu keyword), prompt này ép AI trả lời "chưa có thông tin" — kết quả sai hoàn toàn.
🟡 P1 — Retrieval Verifier không áp dụng status filter cho fallback search
File: backend/src/ctxh-chat/services/langchain-rag-chain.service.ts
Khi primary search trả 0 kết quả → Verifier đề xuất fallback query → nhưng fallback search vẫn dùng statusFilter='all' → không lọc theo status mà user yêu cầu.
🟡 P1 — Follow-up suggestions cứng nhắc, lặp lại
File: backend/src/ctxh-chat/controllers/ctxh-chat.controller.ts
Follow-up suggestions hiện tại dựa trên keyword matching đơn giản trong response text. Dẫn đến:
Suggestions lặp lại giống nhau cho nhiều câu hỏi
Không contextual (không biết user vừa hỏi gì)
Mất tự nhiên: "Cho tôi biết thêm chi tiết về hoạt động này" xuất hiện khi không có hoạt động nào
🟢 P2 — Tool selector không xử lý tốt câu hỏi tổng quát
Câu hỏi "liệt kê tất cả hoạt động" → filter rỗng → search_semantic hoặc search_diverse → kết quả phụ thuộc vào embedding similarity → có thể miss hoạt động quan trọng.

2. Giải pháp đề xuất
2.1 Mở rộng bảng ánh xạ trạng thái (Filter Extraction Prompt)
File cần sửa: backend/src/ctxh-chat/prompts/filter-extraction.prompt.ts
Thay section BẢNG ÁNH XẠ TRẠNG THÁI thành:
═══════════════════════════════════════
 BẢNG ÁNH XẠ TRẠNG THÁI (status)
═══════════════════════════════════════

Nhóm "ongoing" (đang diễn ra):
  đang diễn ra, đang có, hiện tại, đang mở, đang tổ chức, hôm nay,
  đang hoạt động, còn mở, đang nhận đăng ký, đang tuyển, còn tuyển,
  hiện nay, hiện giờ, bây giờ, đang tiến hành

Nhóm "upcoming" (sắp diễn ra):
  sắp tới, sắp diễn ra, sắp có, sắp mở, tới đây, sắp tổ chức,
  sẽ diễn ra, sẽ tổ chức, sẽ có, sẽ mở, trong tương lai,
  trong thời gian tới, sắp tới đây, tuần tới, tháng tới, năm tới,
  chuẩn bị diễn ra, chuẩn bị mở, chưa bắt đầu, chưa diễn ra

Nhóm "ended" (đã kết thúc):
  đã kết thúc, đã qua, đã diễn ra, trước đây, đã hết,
  đã hoàn thành, đã xong, đã đóng, hết hạn, đã hủy

QUY TẮC BỔ SUNG:
• Nếu user nói "trong tương lai" hoặc "sẽ..." → upcoming
• Nếu user nói "liệt kê tất cả" / "có gì" (không chỉ rõ thời gian) → KHÔNG set status (trả object rỗng)
• Nếu user nói "còn đăng ký được không" → status: ["ongoing", "upcoming"]


2.2 Cải thiện RAG Prompt — Bớt cứng nhắc, thêm hướng dẫn khi "gần đúng"
File cần sửa: backend/src/ctxh-chat/prompts/ctxh-chat.prompts.ts
Thay đoạn QUY TẮC QUAN TRỌNG thành:
QUY TẮC QUAN TRỌNG - PHẢI TUÂN THỦ TUYỆT ĐỐI:
- CHỈ sử dụng thông tin từ context được cung cấp bên dưới.
- Dựa vào trường "Trạng thái (tính đến {current_date})" đã được tính sẵn trong context để diễn đạt tình trạng hoạt động.
- TUYỆT ĐỐI KHÔNG tự suy luận, đoán mò, hoặc bịa đặt thông tin.

XỬ LÝ KHI CONTEXT RỖNG HOẶC KHÔNG PHÙ HỢP:
- Nếu context RỖNG hoặc không chứa thông tin phù hợp:
  * Trả lời tự nhiên: "Hiện tại mình chưa tìm thấy hoạt động nào phù hợp với yêu cầu của bạn trong hệ thống."
  * GỢI Ý cho user thử lại: "Bạn có thể thử hỏi cụ thể hơn, ví dụ tên hoạt động, khoa/đoàn tổ chức, hoặc khoảng thời gian cụ thể nhé!"
  * KHÔNG liệt kê hoạt động nào cả. KHÔNG bịa thông tin.
- Nếu context có hoạt động nhưng KHÔNG hoàn toàn khớp câu hỏi:
  * Trình bày các hoạt động có trong context và ghi rõ "Đây là những hoạt động gần nhất mình tìm được."
  * Để user tự đánh giá.

PHONG CÁCH TRẢ LỜI:
- Xưng "mình", gọi user là "bạn" — thân thiện, tự nhiên, gần gũi sinh viên.
- Trả lời trực tiếp, ngắn gọn nhưng đầy đủ. KHÔNG BAO GỒM quá trình suy nghĩ.
- Sử dụng emoji nhẹ nhàng khi phù hợp (📌, 📅, 📍, ✅) để dễ đọc.
- Nếu tìm được nhiều hoạt động, liệt kê TẤT CẢ (tối thiểu 2 nếu có).
- KHÔNG tự ý chọn 1 hoạt động rồi bỏ qua phần còn lại.


2.3 Cải thiện Router Agent — Nhận diện linh hoạt hơn
File cần sửa: backend/src/ctxh-chat/prompts/router-agent.prompt.ts
Thêm vào section RAG_QUERY:
RAG_QUERY — Câu hỏi về hoạt động CTXH trong database.
  Nhận biết khi hỏi về: tên hoạt động, thời gian, địa điểm, số ngày CTXH,
  tổ chức, trạng thái (đang diễn ra / sắp tới / đã qua / sẽ có / trong tương lai),
  so sánh các hoạt động, yêu cầu tham gia, liệt kê, tìm kiếm.
  Ví dụ:
  • "Có hoạt động hiến máu nào đang mở không?"                → RAG_QUERY
  • "Hoạt động tình nguyện của khoa Máy tính tháng 3"         → RAG_QUERY
  • "CTXH nào diễn ra tại KTX khu B?"                         → RAG_QUERY
  • "Còn bao nhiêu ngày để đăng ký?"                          → RAG_QUERY
  • "Liệt kê cho tui các hoạt động sẽ diễn ra"               → RAG_QUERY  ← THÊM
  • "Có hoạt động nào trong tương lai không?"                  → RAG_QUERY  ← THÊM
  • "Tháng này có CTXH gì?"                                   → RAG_QUERY  ← THÊM
  • "Hoạt động nào còn đăng ký được?"                         → RAG_QUERY  ← THÊM


2.4 Cải thiện Retrieval Verifier — Fallback thông minh hơn
File cần sửa: backend/src/ctxh-chat/prompts/retrieval-verifier.prompt.ts
Thêm ví dụ cho câu hỏi tổng quát:
• Câu hỏi: "Liệt kê các hoạt động sẽ diễn ra"
  → supplementQuery: "hoạt động CTXH"
  (Lý do: câu gốc quá chung, bỏ hết filter, chỉ giữ chủ đề CTXH để semantic search rộng)

• Câu hỏi: "Có hoạt động nào trong tương lai không?"
  → supplementQuery: "hoạt động CTXH tình nguyện"


2.5 Cải thiện Tool Selector — Xử lý câu hỏi liệt kê
File cần sửa: backend/src/ctxh-chat/prompts/tool-selector.prompt.ts
Cập nhật quy tắc chọn tool:
QUY TẮC CHỌN TOOL:
• search_with_filters  → Câu hỏi có ít nhất 1 tiêu chí cụ thể (thời gian / địa điểm / danh mục / tổ chức / trạng thái)
                         VÀ CẢ câu hỏi có từ chỉ thời gian: "sẽ diễn ra", "sắp tới", "tương lai", "tháng này", "đang mở"
• search_diverse       → Câu hỏi muốn xem NHIỀU / ĐA DẠNG / LIỆT KÊ TẤT CẢ hoạt động, KHÔNG giới hạn loại
                         Ví dụ: "liệt kê tất cả", "có những hoạt động gì", "cho tui xem hết"
• search_semantic      → Tất cả trường hợp còn lại (câu hỏi về 1 hoạt động cụ thể theo tên, không có tiêu chí lọc rõ)


2.6 Follow-up Suggestions thông minh hơn
File cần sửa: backend/src/ctxh-chat/controllers/ctxh-chat.controller.ts
Nguyên tắc mới cho generateFollowUpSuggestions():
// Thay vì keyword matching thô, dùng các rules dựa trên intent + context:

// 1. Khi có hoạt động trong response:
//    → "Đăng ký hoạt động [tên]"
//    → "Có hoạt động nào khác trong tháng này không?"
//    → "[tên hoạt động] yêu cầu gì để tham gia?"

// 2. Khi KHÔNG tìm thấy hoạt động:
//    → "Hoạt động CTXH nào đang mở đăng ký?"
//    → "Hoạt động của [khoa user] sắp tới?"
//    → "Tôi cần bao nhiêu ngày CTXH?"

// 3. Khi vừa đăng ký xong:
//    → "Kiểm tra trạng thái đăng ký của tôi"
//    → "Có hoạt động nào khác tôi có thể tham gia?"

// 4. KHÔNG BAO GIỜ gợi ý:
//    → "Cho tôi biết thêm chi tiết" khi không có hoạt động nào
//    → Gợi ý trùng với câu hỏi user vừa hỏi



3. Cải thiện phong cách trợ lý AI
3.1 Persona & Tone
Chatbot hiện tại trả lời khá máy móc. Cần điều chỉnh persona:
Hiện tại:
"Có hoạt động Đi JobFair CSE đang diễn ra:
Hoạt động: Đi JobFair
Tổ chức: Đoàn Trường
..."


Nên là:
"📌 Mình tìm thấy 1 hoạt động phù hợp nè!

**Đi JobFair CSE**
🏢 Đoàn Trường ĐHBK
📅 20/04 – 29/04/2026 (đang diễn ra)
📍 Bách Khoa Cơ Sở 1, Quận 5
⏱️ 0.5 ngày CTXH
✅ Còn nhận đăng ký

Bạn muốn mình đăng ký cho bạn không?"


Nguyên tắc phong cách:
Aspect
Hiện tại
Nên chuyển sang
Xưng hô
Không xưng gì / "Trợ lý"
"Mình" - "bạn"
Tone
Formal, máy móc
Thân thiện, tự nhiên, gần gũi SV
Format
Plain text liệt kê
Markdown + emoji nhẹ
Khi không tìm thấy
"Hiện tại chưa có thông tin về hoạt động này" (cụt lủn)
"Mình chưa tìm thấy... Bạn thử hỏi cụ thể hơn nhé!"
Khi có kết quả
Dump raw data
Highlight key info, gợi ý action tiếp theo

3.2 Xử lý các pattern câu hỏi phổ biến
Sinh viên thường hỏi theo các pattern sau. AI cần xử lý tốt từng loại:
Pattern 1: Câu hỏi tổng quát (liệt kê)
"Liệt kê hoạt động CTXH" / "Có gì sắp tới?" / "Hoạt động nào còn mở?"


→ Hành vi mong muốn: Dùng search_diverse hoặc search_with_filters(status=upcoming/ongoing), liệt kê TẤT CẢ kết quả.
Pattern 2: Câu hỏi cụ thể theo tên
"Có hoạt động JobFair không?" / "Thông tin về chiến dịch Mùa hè xanh"


→ Hành vi mong muốn: search_semantic với keyword tên, trả chi tiết 1 hoạt động.
Pattern 3: Câu hỏi theo tiêu chí
"Hoạt động của khoa CSE tháng này" / "CTXH ở cơ sở 1 sắp tới"


→ Hành vi mong muốn: search_with_filters với org + date/status filters.
Pattern 4: Câu hỏi so sánh / quyết định
"Nên tham gia hoạt động nào?" / "Hoạt động nào nhiều ngày CTXH nhất?"


→ Hành vi mong muốn: Retrieve nhiều hoạt động, so sánh và gợi ý.
Pattern 5: Câu hỏi quy trình
"Làm sao đăng ký CTXH?" / "Quy trình tham gia như thế nào?"


→ Hành vi mong muốn: Trả lời dựa trên knowledge base. Nếu không có → hướng dẫn chung flow đăng ký trên hệ thống.
Pattern 6: Câu hỏi cá nhân
"Tôi đã đăng ký hoạt động nào?" / "Điểm CTXH hiện tại của tôi?"


→ Hành vi mong muốn: Cần integrate user data. Hiện chưa hỗ trợ → trả lời rõ ràng "Mình chưa có tính năng này, bạn kiểm tra trên trang cá nhân nhé."

4. Cải thiện pipeline kỹ thuật
4.1 Xử lý câu hỏi tổng quát trong RAG Chain
File: backend/src/ctxh-chat/services/langchain-rag-chain.service.ts
Khi extractedFilters rỗng VÀ câu hỏi mang tính liệt kê/tổng quát, thay vì search semantic thuần (dễ miss), nên:
// Pseudo-code cho logic mới:
if (this.filterExtractionService.isEmpty(filters)) {
  // Kiểm tra xem câu hỏi có mang tính liệt kê không
  const isListQuery = this.isListingQuery(rewrittenQuestion);
  
  if (isListQuery) {
    // Sử dụng search_diverse với topK cao hơn để cover nhiều hoạt động
    docs = await this.vectorStoreService.maxMarginalRelevanceSearch(
      rewrittenQuestion,
      topK * 2,  // Lấy nhiều hơn để filter sau
      currentDate,
    );
  } else {
    // Giữ nguyên semantic search cho câu hỏi cụ thể
    docs = await this.vectorStoreService.similaritySearchWithDateFilter(...);
  }
}


Nhận diện "listing query":
private isListingQuery(question: string): boolean {
  const listingPatterns = [
    /liệt kê/i, /tất cả/i, /có gì/i, /có những/i, /danh sách/i,
    /cho.*(xem|biết).*hết/i, /bao nhiêu hoạt động/i, /những hoạt động/i,
  ];
  return listingPatterns.some(p => p.test(question));
}


4.2 Status inference khi filter rỗng nhưng câu hỏi ngụ ý thời gian
Khi filter extraction trả rỗng nhưng câu hỏi có "sẽ", "tương lai", "sắp", etc. → nên fallback infer status:
// Trong selectAndExecuteTool() hoặc retrieveDocuments():
if (this.filterExtractionService.isEmpty(filters)) {
  const inferredStatus = this.inferStatusFromQuestion(rewrittenQuestion);
  if (inferredStatus) {
    // Dùng date-based filter thay vì metadata filter
    docs = await this.vectorStoreService.similaritySearchWithDateFilter(
      rewrittenQuestion, topK, currentDate, inferredStatus
    );
  }
}

private inferStatusFromQuestion(q: string): 'upcoming' | 'ongoing' | 'all' | null {
  const upcomingPatterns = /sẽ|tương lai|sắp|chuẩn bị|chưa bắt đầu|tuần tới|tháng tới/i;
  const ongoingPatterns = /đang|hiện tại|hiện nay|bây giờ|hôm nay/i;
  if (upcomingPatterns.test(q)) return 'upcoming';
  if (ongoingPatterns.test(q)) return 'ongoing';
  return null;
}


4.3 Mở rộng metadata trong vector embeddings
File: backend/src/ctxh-chat/services/ctxh-vector-sync.service.ts hoặc ingestion service
Hiện tại metadata trong embeddings có:
activityId, activityName, organizationName
startDate, endDate, location, status, totalDays
Cần thêm:
requiresApproval — cần cho feature inline registration
maxParticipants — để AI có thể nói "còn X slot"
categoryName — để filter theo danh mục
Khi thêm metadata mới, cần re-embed toàn bộ activities.

5. Cải thiện trải nghiệm người dùng (UX)
5.1 Initial suggestions thông minh hơn
File: frontend/src/features/ctxh-chat/components/ChatbotPopup.tsx
Hiện tại:
const suggestions = [
  'Hoạt động CTXH sắp diễn ra?',
  'Điểm CTXH hiện tại của tôi?',
  'Cách đăng ký?',
];


Nên dynamic theo context:
// Gợi ý dựa theo thời gian thực:
const now = new Date();
const month = now.getMonth() + 1;

const suggestions = [
  `Hoạt động CTXH tháng ${month} có gì?`,
  'Hoạt động nào đang mở đăng ký?',
  'Mình cần bao nhiêu ngày CTXH?',
  'Hướng dẫn đăng ký hoạt động',
];


5.2 Greeting response ấn tượng hơn
Hiện tại response cho GREETING intent:
(Cần kiểm tra nội dung cụ thể trong code)
Nên là:
Xin chào! 👋 Mình là trợ lý AI của Đoàn Hội ĐHBK TP.HCM.

Mình có thể giúp bạn:
📌 Tìm hoạt động CTXH đang mở / sắp diễn ra
📝 Đăng ký tham gia hoạt động trực tiếp
📊 Xem thông tin chi tiết về hoạt động
❓ Giải đáp thắc mắc về quy trình CTXH

Bạn muốn hỏi gì nè? 😊


5.3 CHITCHAT response lịch sự hơn
Hiện tại: Có thể quá cụt lủn.
Nên là:
Câu hỏi này nằm ngoài chuyên môn của mình rồi 😅
Mình chỉ hỗ trợ về hoạt động Công tác xã hội (CTXH) tại ĐHBK thôi nha.

Bạn có thể hỏi mình về:
• Hoạt động CTXH đang mở / sắp tới
• Cách đăng ký tham gia
• Thông tin chi tiết hoạt động

Thử hỏi mình về CTXH nhé! 💪



6. Checklist implement theo thứ tự ưu tiên
Phase 1: Sửa lỗi critical (P0) — Fix ngay
 Mở rộng bảng ánh xạ status trong filter-extraction.prompt.ts (thêm "sẽ diễn ra", "tương lai", "tuần tới"...)
 Sửa RAG prompt trong ctxh-chat.prompts.ts (bớt cứng nhắc khi context rỗng, thêm gợi ý)
 Thêm ví dụ mới vào Router Agent cho câu hỏi tổng quát
 Test lại với các câu hỏi ở bảng triệu chứng
Phase 2: Cải thiện retrieval (P1)
 Thêm status inference fallback khi filter extraction trả rỗng
 Cải thiện Retrieval Verifier thêm ví dụ cho câu hỏi tổng quát
 Cập nhật Tool Selector rules cho listing queries
 Thêm listing query detection trong RAG chain service
Phase 3: UX & tone
 Cập nhật phong cách trả lời — xưng "mình", format đẹp hơn
 Cải thiện GREETING response — đầy đủ khả năng
 Cải thiện CHITCHAT response — lịch sự, gợi ý chuyển hướng
 Dynamic initial suggestions trong ChatbotPopup
 Cải thiện follow-up suggestions logic
Phase 4: Metadata & long-term
 Thêm metadata (requiresApproval, maxParticipants, categoryName) vào embeddings
 Re-embed toàn bộ activities sau khi thêm metadata
 Monitoring — log câu hỏi + intent + results để phát hiện pattern lỗi mới

7. Tham khảo — Best practices RAG đã áp dụng
Kỹ thuật
Đã có
Cần cải thiện
Query rewriting (Router Agent)
✅
Thêm ví dụ cho câu tổng quát
Intent classification
✅
Thêm pattern nhận diện
Metadata filtering
✅
Mở rộng synonym mapping
Retrieve-then-verify
✅
Verifier fallback cần status filter
Org injection (user context)
✅
OK
Session memory (multi-turn)
✅
OK
Graceful degradation
✅
Sửa response khi context rỗng
MMR (diversity search)
✅
Dùng cho listing queries
HyDE (hypothetical doc)
❌
Cân nhắc cho tương lai
Re-ranking
❌
Cân nhắc khi scale lên
Embedding fine-tuning
❌
Cân nhắc cho domain-specific