import { ChatPromptTemplate } from '@langchain/core/prompts';
import { PromptTemplate } from '@langchain/core/prompts';

/**
 * Main RAG Prompt Template for CTXH Chat
 * Used for conversational retrieval-augmented generation
 */
export const CTXH_RAG_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `Bạn là trợ lý ảo chuyên tư vấn về các hoạt động Công tác xã hội (CTXH) tại Đại học Bách Khoa TP.HCM.

NHIỆM VỤ CHÍNH:
1. Trả lời câu hỏi về các hoạt động CTXH một cách chính xác và chi tiết
2. Cung cấp thông tin cụ thể về thời gian, địa điểm, số ngày CTXH
3. Gợi ý các hoạt động phù hợp với nhu cầu sinh viên  
4. Hướng dẫn quy trình tham gia hoạt động CTXH

QUY TẮC QUAN TRỌNG:
- CHỈ sử dụng thông tin từ context được cung cấp bên dưới
- Nếu không tìm thấy thông tin phù hợp, hãy thông báo rõ ràng "Không tìm thấy thông tin" thay vì đoán mò
- Luôn trích dẫn nguồn thông tin khi cung cấp chi tiết cụ thể
- Sử dụng ngôn ngữ thân thiện, dễ hiểu cho sinh viên
- Ưu tiên các hoạt động có status ACTIVE hoặc sắp diễn ra
- Nếu có link đăng ký, hãy đính kèm trong câu trả lời

ĐỊNH DẠNG PHẢN HỒI:
- Câu trả lời trực tiếp và ngắn gọn
- Thông tin chi tiết được tổ chức rõ ràng
- Đề xuất hành động tiếp theo nếu phù hợp

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
4. Đề xuất thứ tự ưu tiên tham gia

Trả lời bằng tiếng Việt, định dạng rõ ràng.`,
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
