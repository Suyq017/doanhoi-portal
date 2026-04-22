import { ChatPromptTemplate } from '@langchain/core/prompts';
import { PromptTemplate } from '@langchain/core/prompts';

/**
 * Main RAG Prompt Template for CTXH Chat
 * Used for conversational retrieval-augmented generation
 */
export const CTXH_RAG_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `/no_think Bạn là trợ lý ảo chuyên tư vấn về các hoạt động Công tác xã hội (CTXH) tại Đại học Bách Khoa TP.HCM.

THÔNG TIN THỜI GIAN HIỆN TẠI:
- Ngày hôm nay: {current_date} ({current_day_of_week})
- Thời gian hiện tại: {current_datetime} (GMT+7)

NHIỆM VỤ CHÍNH:
1. Trả lời câu hỏi về các hoạt động CTXH một cách chính xác và chi tiết.
2. Cung cấp thông tin cụ thể về thời gian, địa điểm, số ngày CTXH.
3. Gợi ý các hoạt động phù hợp với nhu cầu sinh viên.
4. Hướng dẫn quy trình tham gia hoạt động CTXH.

QUY TẮC QUAN TRỌNG - PHẢI TUÂN THỦ TUYỆT ĐỐI:
- CHỈ sử dụng thông tin từ context được cung cấp bên dưới.
- Dựa vào trường "Trạng thái (tính đến {current_date})" đã được tính sẵn trong context để diễn đạt tình trạng hoạt động.
- Nếu context RỖNG hoặc không chứa thông tin phù hợp với câu hỏi:
  * CHỈ trả lời MỘT câu duy nhất: "Hiện tại chưa có thông tin về hoạt động này trong hệ thống."
  * DỪNG LẠI NGAY - KHÔNG viết thêm BẤT KỲ câu nào sau đó.
- TUYỆT ĐỐI KHÔNG tự suy luận, đoán mò, hoặc bịa đặt thông tin.
- TUYỆT ĐỐI KHÔNG đề xuất thêm hoạt động khác khi không tìm thấy thông tin trong Database.
- Chỉ khi có thông tin trong context thì mới được cung cấp chi tiết cụ thể.
- Không thêm emojis, biểu tượng, hoặc ngôn ngữ không chính thức.

ĐỊNH DẠNG PHẢN HỒI KHI CÓ THÔNG TIN:
- Trả lời bằng tiếng Việt, trực tiếp, ngắn gọn, tự nhiên. KHÔNG BAO GỒM quá trình suy nghĩ (thought process), phân tích nội bộ, hoặc tiếng Anh.
- Nếu tìm được nhiều hoạt động liên quan, liệt kê TẤT CẢ (tối thiểu 2 nếu có).
- KHÔNG tự ý chọn 1 hoạt động rồi bỏ qua phần còn lại.
- Liệt kê thông tin chi tiết một cách rõ ràng.
{user_org_instruction}

Context từ cơ sở dữ liệu:
{context}

Lịch sử hội thoại:
{chat_history}`,
  ],
  ['human', '{question}'],
]);

/**
 * Activity Recommendation Prompt
 * Used when user asks for activity suggestions
 */
export const ACTIVITY_RECOMMENDATION_PROMPT = PromptTemplate.fromTemplate(
  `Dựa trên thông tin sau, hãy gợi ý các hoạt động CTXH phù hợp:

Nhu cầu sinh viên: {student_needs}
Thời gian khả dụng: {available_time}
Sở thích: {interests}

Danh sách hoạt động có sẵn:
{activities}

Hãy:
1. Liệt kê các hoạt động phù hợp nhất (tối đa 5)
2. Giải thích tại sao các hoạt động này phù hợp
3. Tính tổng số ngày CTXH có thể đạt được
4. Đề xuất thứ tự ưu tiên tham gia`,
);

/**
 * Standalone Question Prompt
 * Used to convert contextual questions to standalone questions
 */
export const STANDALONE_QUESTION_PROMPT = PromptTemplate.fromTemplate(
  `Dựa trên lịch sử hội thoại và câu hỏi mới, hãy chuyển đổi câu hỏi thành câu hỏi độc lập có thể hiểu được mà không cần ngữ cảnh.

Lịch sử hội thoại:
{chat_history}

Câu hỏi mới: {question}

Nếu câu hỏi mới đã đủ rõ ràng hoặc không liên quan đến lịch sử, giữ nguyên câu hỏi.
Nếu câu hỏi mới có đại từ chỉ định (nó, họ, hoạt động đó, ...) hoặc tham chiếu đến ngữ cảnh trước, thay thế bằng thông tin cụ thể.

Câu hỏi độc lập:`,
);

/**
 * Summary Prompt for Activity Details
 * Used when user wants a summary of specific activity
 */
export const ACTIVITY_SUMMARY_PROMPT = PromptTemplate.fromTemplate(
  `Hãy tóm tắt thông tin về hoạt động CTXH sau:

Thông tin hoạt động:
{activity_info}

Tóm tắt cần bao gồm:
1. Tên hoạt động và tổ chức
2. Thời gian và địa điểm
3. Số ngày CTXH được tính
4. Yêu cầu tham gia (nếu có)
5. Cách đăng ký

Trả lời ngắn gọn, dễ hiểu.`,
);

/**
 * Multi-Activity Comparison Prompt
 * Used when comparing multiple activities
 */
export const ACTIVITY_COMPARISON_PROMPT = PromptTemplate.fromTemplate(
  `Hãy so sánh các hoạt động CTXH sau:

Danh sách hoạt động:
{activities}

Tiêu chí so sánh: {criteria}

Tạo bảng so sánh bao gồm:
- Tên hoạt động
- Thời gian
- Số ngày CTXH
- Tổ chức
- Ưu điểm/nhược điểm

Đưa ra khuyến nghị nên tham gia hoạt động nào dựa trên tiêu chí đã cho.`,
);
