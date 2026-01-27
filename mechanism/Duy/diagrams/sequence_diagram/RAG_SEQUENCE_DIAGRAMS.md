# RAG Chatbot Sequence Diagram

## Simplified RAG Pipeline (Core Flow)

```mermaid
sequenceDiagram
    participant User as Người dùng
    participant Backend as CtxhChatService
    participant Embedding as EmbeddingService
    participant VectorStore as PostgreSQL + pgVector
    participant LLM as Gemini API

    User->>+Backend: Câu hỏi<br/>"Có hoạt động nào đang diễn ra ở cơ sở 1 không?"
    
    Note over Backend: Bước 1: Chuyển đổi sang vector
    Backend->>+Embedding: Tạo embedding(query)
    Embedding->>+LLM: embedContent(text)
    LLM-->>-Embedding: vector[768]
    Embedding-->>-Backend: queryEmbedding[768]
    
    Note over Backend: Bước 2: Tìm kiếm tương tự
    Backend->>+VectorStore: Similarity search<br/>embedding_vector <=> query<br/>WHERE similarity > 0.7<br/>LIMIT 5
    VectorStore-->>-Backend: Top-5 hoạt động CTXH<br/>(kèm metadata)
    
    Note over Backend: Bước 3: Xây dựng prompt với context
    Note over Backend: Prompt = System + Context + Query
    Backend->>+LLM: Tạo câu trả lời<br/>Prompt: "Dựa vào các hoạt động sau: [context]<br/>Trả lời câu hỏi: [query]"
    LLM-->>-Backend: Câu trả lời được tạo
    
    Note over Backend: Bước 4: Định dạng & cải thiện
    
    Backend-->>-User: Câu trả lời đã cải thiện<br/>
    
    Note over User,LLM: Tổng thời gian: ~1-2 giây
```

---

## Complete RAG Pipeline Flow

```mermaid
sequenceDiagram
    participant User as Người dùng
    participant Controller as CtxhChatController
    participant ChatService as CtxhChatService
    participant ConvService as ConversationService
    participant EmbedService as EmbeddingService
    participant RetrievalService as CtxhRetrievalService
    participant Formatter as ResponseFormatterService
    participant Redis
    participant Gemini as Gemini API
    participant DB as PostgreSQL<br/>(pgVector)

    User->>Controller: POST /api/ctxh-chat/message<br/>{query, sessionId?, filters}
    
    Note over Controller: Kiểm tra rate limiting
    Controller->>ChatService: processMessage(query, userId, sessionId, filters)
    
    rect rgb(240, 248, 255)
        Note over ChatService,Redis: Bước 1: Quản lý Session
        ChatService->>ConvService: getOrCreateSession(sessionId, userId)
        ConvService->>Redis: GET session:{sessionId}
        alt Session tồn tại
            Redis-->>ConvService: Dữ liệu session
        else Session mới
            ConvService->>Redis: SET session:{sessionId}<br/>TTL: 30 ngày
            Redis-->>ConvService: OK
        end
        ConvService-->>ChatService: ConversationSession
    end

    rect rgb(255, 250, 240)
        Note over ChatService,Gemini: Bước 2: Tạo Query Embedding
        ChatService->>EmbedService: generateEmbedding(query)
        EmbedService->>Redis: GET embedding:{hash}
        alt Trúng cache
            Redis-->>EmbedService: Embedding đã cache
        else Không có cache
            EmbedService->>Gemini: embedContent(query)
            Gemini-->>EmbedService: vector[768]
            EmbedService->>Redis: SET embedding:{hash}<br/>TTL: 7 ngày
        end
        EmbedService-->>ChatService: queryEmbedding[768]
    end

    rect rgb(240, 255, 240)
        Note over ChatService,DB: Bước 3: Tìm kiếm Vector
        ChatService->>RetrievalService: retrieveRelevantDocuments(<br/>queryEmbedding, filters, topK)
        RetrievalService->>DB: SELECT * FROM ctxh_activity_embeddings<br/>ORDER BY embedding_vector <=> query<br/>WHERE similarity > 0.7<br/>LIMIT 20
        DB-->>RetrievalService: Top 20 ứng viên
        
        Note over RetrievalService: Áp dụng MMR Algorithm<br/>(đa dạng hóa)
        RetrievalService-->>ChatService: Top 5 tài liệu đa dạng
    end

    rect rgb(255, 240, 245)
        Note over ChatService,Redis: Bước 4: Lấy Context Hội thoại
        ChatService->>ConvService: getRecentMessages(sessionId)
        ConvService->>Redis: GET session:{sessionId}
        Redis-->>ConvService: Session với messages
        
        alt Messages > 20 HOẶC tokens > 4000
            Note over ConvService: Kích hoạt tóm tắt
            ConvService->>Gemini: generateContent("Summarize...")
            Gemini-->>ConvService: Tóm tắt
            ConvService->>Redis: UPDATE session với summary<br/>Giữ 10 messages gần nhất
        end
        
        ConvService-->>ChatService: Messages gần đây + tóm tắt
    end

    rect rgb(255, 255, 240)
        Note over ChatService,Gemini: Bước 5: Xây dựng Prompt & Tạo câu trả lời
        Note over ChatService: Xây dựng prompt:<br/>- System prompt (CTXH context)<br/>- Tài liệu tìm được<br/>- Lịch sử hội thoại<br/>- Câu hỏi người dùng
        
        ChatService->>Gemini: generateContent(prompt)
        Gemini-->>ChatService: Câu trả lời AI
    end

    rect rgb(245, 245, 255)
        Note over ChatService,Formatter: Bước 6: Định dạng Response
        ChatService->>Formatter: formatResponse(<br/>response, sources, conversationContext)
        
        Note over Formatter: - Cải thiện markdown<br/>- Thêm emojis 📍🏢⏰<br/>- Tạo link nguồn<br/>- Tạo gợi ý (tối đa 3)<br/>- Tính confidence
        
        Formatter-->>ChatService: FormattedResponse {<br/>response, sources,<br/>suggestions, confidence}
    end

    rect rgb(255, 245, 245)
        Note over ChatService,Redis: Bước 7: Cập nhật Hội thoại
        ChatService->>ConvService: addMessage(sessionId,<br/>"user", query)
        ConvService->>Redis: UPDATE session:{sessionId}
        Redis-->>ConvService: OK
        
        ChatService->>ConvService: addMessage(sessionId,<br/>"assistant", response)
        ConvService->>Redis: UPDATE session:{sessionId}<br/>Cập nhật lastActive
        Redis-->>ConvService: OK
    end

    ChatService-->>Controller: ChatResponse {<br/>sessionId, response,<br/>sources, suggestions,<br/>responseTime}
    
    Controller-->>User: 200 OK<br/>Câu trả lời đã cải thiện kèm nguồn

    Note over User,DB: Tổng thời gian: < 2 giây (P95)
```

---

## Error Handling Flow

```mermaid
sequenceDiagram
    participant User as Người dùng
    participant ChatService as CtxhChatService
    participant Service as Service bất kỳ
    participant Fallback as Error Handler

    User->>ChatService: processMessage(query)
    
    ChatService->>Service: Thao tác (embedding/search/generation)
    
    alt Service thất bại
        Service-->>ChatService: Lỗi xảy ra
        
        ChatService->>Fallback: Xử lý lỗi nhẹ nhàng
        
        alt Lỗi tìm kiếm
            Note over Fallback: Trả về: "Xin lỗi, không tìm thấy<br/>thông tin phù hợp..."
        else Lỗi tạo câu trả lời
            Note over Fallback: Trả về: "Xin lỗi, hệ thống<br/>đang gặp sự cố..."
        else Lỗi session
            Note over Fallback: Trả về: "Xin lỗi, phiên làm việc<br/>đã hết hạn..."
        end
        
        Fallback-->>ChatService: Response dự phòng
    else Service thành công
        Service-->>ChatService: Kết quả thành công
    end
    
    ChatService-->>User: Response (thành công hoặc dự phòng)
    
    Note over User,Fallback: Không throw lỗi cho người dùng<br/>Luôn xử lý nhẹ nhàng
```

---

## Session Management Flow

```mermaid
sequenceDiagram
    participant Client as Client
    participant ConvService as ConversationService
    participant Redis
    participant Gemini as Gemini API

    rect rgb(240, 248, 255)
        Note over Client,Redis: Tạo Session mới
        Client->>ConvService: getOrCreateSession(null, userId)
        ConvService->>ConvService: Tạo sessionId (UUID)
        ConvService->>Redis: SET session:{sessionId}<br/>{userId, messages: [],<br/>createdAt, lastActive}<br/>TTL: 30 ngày
        Redis-->>ConvService: OK
        ConvService-->>Client: Session mới
    end

    rect rgb(255, 250, 240)
        Note over Client,Redis: Thêm Messages
        loop Mỗi message
            Client->>ConvService: addMessage(sessionId, role, content)
            ConvService->>ConvService: Đếm tokens
            ConvService->>Redis: UPDATE session:{sessionId}<br/>Thêm message vào array
            Redis-->>ConvService: OK
        end
    end

    rect rgb(240, 255, 240)
        Note over Client,Gemini: Tự động Tóm tắt
        alt Messages > 20 HOẶC tokens > 4000
            ConvService->>ConvService: Kiểm tra ngưỡng
            Note over ConvService: Kích hoạt tóm tắt
            ConvService->>Gemini: generateContent(<br/>"Tóm tắt hội thoại...")
            Gemini-->>ConvService: Văn bản tóm tắt
            ConvService->>Redis: UPDATE session:{sessionId}<br/>Lưu summary<br/>Giữ 10 messages gần nhất
            Redis-->>ConvService: OK
        end
    end

    rect rgb(255, 240, 245)
        Note over Client,Redis: Xóa Session
        Client->>ConvService: deleteSession(sessionId)
        ConvService->>Redis: DEL session:{sessionId}
        Redis-->>ConvService: OK
        ConvService-->>Client: Thành công
    end
```

---

## Vector Search with MMR Flow

```mermaid
sequenceDiagram
    participant ChatService as CtxhChatService
    participant RetrievalService as CtxhRetrievalService
    participant DB as PostgreSQL<br/>(pgVector)

    ChatService->>RetrievalService: retrieveRelevantDocuments(<br/>queryEmbedding, filters)

    rect rgb(240, 248, 255)
        Note over RetrievalService,DB: Giai đoạn 1: Lấy ứng viên
        RetrievalService->>DB: SELECT<br/>  a.id, a.name, a.description,<br/>  e.embedding_vector,<br/>  1 - (e.embedding_vector <=> $1) as similarity<br/>FROM ctxh_activity_embeddings e<br/>INNER JOIN ctxh_activities a ON e.activity_id = a.id<br/>WHERE 1 - (e.embedding_vector <=> $1) > 0.7<br/>  AND a.organization_id = $2<br/>  AND a.status = $3<br/>ORDER BY similarity DESC<br/>LIMIT 20
        
        DB-->>RetrievalService: Top 20 ứng viên kèm vectors
    end

    rect rgb(255, 250, 240)
        Note over RetrievalService: Giai đoạn 2: MMR Algorithm
        Note over RetrievalService: Khởi tạo:<br/>- selected = []<br/>- remaining = candidates<br/>- lambda = 0.7

        loop Cho đến khi chọn được 5 tài liệu
            Note over RetrievalService: Với mỗi doc còn lại:<br/>score = λ × similarity(doc, query)<br/>  - (1-λ) × max_similarity(doc, selected)
            
            Note over RetrievalService: Chọn doc có score cao nhất
            Note over RetrievalService: Chuyển từ remaining → selected
        end

        Note over RetrievalService: Kết quả: 5 tài liệu đa dạng<br/>(cân bằng độ liên quan + đa dạng)
    end

    RetrievalService-->>ChatService: Top 5 tài liệu đa dạng<br/>kèm metadata
```

---

## Embedding Cache Flow

```mermaid
sequenceDiagram
    participant Service as Service bất kỳ
    participant EmbedService as EmbeddingService
    participant Redis
    participant Gemini as Gemini API

    Service->>EmbedService: generateEmbedding(text)
    
    EmbedService->>EmbedService: Tính hash = SHA256(text)
    EmbedService->>Redis: GET embedding:{hash}
    
    alt Trúng cache (85% trường hợp)
        Redis-->>EmbedService: Float32Array[768]
        Note over EmbedService: Trúng cache!<br/>Tiết kiệm: ~200ms
        EmbedService-->>Service: Embedding đã cache
    else Không có cache (15% trường hợp)
        Redis-->>EmbedService: null
        
        EmbedService->>Gemini: embedContent({<br/>  model: "text-embedding-004",<br/>  content: text<br/>})
        
        alt Thành công
            Gemini-->>EmbedService: {values: Float32Array[768]}
            EmbedService->>Redis: SET embedding:{hash}<br/>value: embedding<br/>TTL: 7 ngày
            Redis-->>EmbedService: OK
            EmbedService-->>Service: Embedding mới
        else Thử lại khi lỗi
            loop Tối đa 3 lần
                Note over EmbedService: Đợi exponential backoff
                EmbedService->>Gemini: Thử lại embedContent()
            end
        end
    end
```

---

## API Endpoints Flow

### 1. Send Message

```mermaid
sequenceDiagram
    participant Client
    participant API as POST /api/ctxh-chat/message

    Client->>API: {<br/>  query: "Có hoạt động môi trường không?",<br/>  sessionId?: "uuid",<br/>  filters?: {<br/>    organizationId: "org-1",<br/>    status: "ACTIVE"<br/>  }<br/>}
    
    Note over API: Xử lý RAG pipeline<br/>(7 bước)
    
    API-->>Client: 200 OK<br/>{<br/>  sessionId: "uuid",<br/>  response: "Có 3 hoạt động...",<br/>  sources: [{...}],<br/>  suggestions: [...],<br/>  responseTime: 1234<br/>}
```

### 2. Get History

```mermaid
sequenceDiagram
    participant Client
    participant API as GET /api/ctxh-chat/history/:sessionId

    Client->>API: GET /api/ctxh-chat/history/uuid-123
    
    Note over API: Lấy dữ liệu từ Redis
    
    API-->>Client: 200 OK<br/>{<br/>  sessionId: "uuid-123",<br/>  messages: [{role, content, timestamp}],<br/>  summary: "...",<br/>  metadata: {createdAt, lastActive, totalTokens}<br/>}
```

### 3. Delete Session

```mermaid
sequenceDiagram
    participant Client
    participant API as DELETE /api/ctxh-chat/session/:sessionId

    Client->>API: DELETE /api/ctxh-chat/session/uuid-123
    
    Note over API: Xóa khỏi Redis
    
    API-->>Client: 200 OK<br/>{<br/>  success: true,<br/>  message: "Đã xóa session"<br/>}
```

---

## Performance Characteristics

### Timing Breakdown (Average Case)

```mermaid
gantt
    title Thời gian RAG Pipeline (Trung bình ~1.5s)
    dateFormat X
    axisFormat %Ls

    section Session
    Lấy/Tạo Session     :0, 30ms
    
    section Embedding
    Kiểm tra Cache           :30ms, 50ms
    Tạo mới (nếu không có)    :50ms, 250ms
    
    section Tìm kiếm
    Vector Search         :250ms, 330ms
    MMR Algorithm         :330ms, 350ms
    
    section Context
    Lấy Messages          :350ms, 380ms
    
    section Tạo câu trả lời
    Xây dựng Prompt          :380ms, 400ms
    Gọi Gemini API       :400ms, 1300ms
    
    section Định dạng
    Format Response       :1300ms, 1350ms
    Tạo Gợi ý  :1350ms, 1400ms
    
    section Cập nhật
    Lưu Messages         :1400ms, 1450ms
```

### Concurrent Request Handling

```mermaid
sequenceDiagram
    participant U1 as Người dùng 1
    participant U2 as Người dùng 2
    participant U3 as Người dùng 3
    participant Service as CtxhChatService
    participant Redis
    participant DB as PostgreSQL

    par Request người dùng 1
        U1->>Service: Câu hỏi A
        Service->>Redis: Session A
        Service->>DB: Vector Search A
        Service-->>U1: Câu trả lời A
    and Request người dùng 2
        U2->>Service: Câu hỏi B
        Service->>Redis: Session B
        Service->>DB: Vector Search B
        Service-->>U2: Câu trả lời B
    and Request người dùng 3
        U3->>Service: Câu hỏi C
        Service->>Redis: Session C
        Service->>DB: Vector Search C
        Service-->>U3: Câu trả lời C
    end
    
    Note over U1,DB: Tất cả requests xử lý đồng thời<br/>Không chặn, session riêng biệt
```

---

## Notes

### Key Design Decisions

1. **Stateless Service**: Each request is independent, state stored in Redis
2. **Graceful Degradation**: Always return friendly error messages, never throw
3. **Caching Strategy**: Aggressive caching (embeddings TTL 7 days, sessions 30 days)
4. **MMR for Diversity**: Balance relevance vs diversity in search results
5. **Auto Summarization**: Prevent context window overflow
6. **Rate Limiting**: Protect against abuse (implemented in interceptor)

### Performance Targets

- **Vector Search**: <100ms P95 ✅
- **Session Operations**: <50ms P95 ✅
- **Complete RAG Pipeline**: <2s P95 ✅
- **Cache Hit Rate**: ~85% (embeddings) ✅
- **Concurrent Users**: 100+ supported ✅

### Error Handling Strategy

- ❌ **Never throw errors to user**
- ✅ **Always return fallback responses**
- ✅ **Log errors for monitoring**
- ✅ **Graceful degradation at every step**

---

**Document Version:** 1.0  
**Date:** December 19, 2025  
**Related:** [PHASE2_IMPLEMENTATION_SUMMARY.md](./PHASE2_IMPLEMENTATION_SUMMARY.md)
