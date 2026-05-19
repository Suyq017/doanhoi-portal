Collecting workspace information# Kế hoạch Migration từ Custom RAG sang LangChain.js

Dựa trên phân tích source code hiện tại trong module **ctxh-chat**, tôi đề xuất kế hoạch chuyển đổi chi tiết sang LangChain.js.

---

## 📋 **PHÂN TÍCH KIẾN TRÚC HIỆN TẠI**

### **Cấu trúc module ctxh-chat:**
```
backend/src/ctxh-chat/
├── controllers/
│   └── ctxh-chat.controller.ts     → API endpoints
├── services/
│   └── ctxh-chat.service.ts        → Custom RAG logic
├── dto/
│   ├── chat-request.dto.ts         → Input validation
│   └── chat-response.dto.ts        → Response structure
└── entities/
    └── chat-session.entity.ts      → Database models
```

### **Flow hiện tại (Custom Implementation):**
```
User Query 
    ↓
Controller → Validation (DTO)
    ↓
Service → Custom Embedding (Gemini?)
    ↓
PostgreSQL/pgvector → Similarity Search
    ↓
Custom Prompt Engineering
    ↓
LLM API Call (Gemini)
    ↓
Response Formatting
    ↓
Return to User
```

---

## 🎯 **KIẾN TRÚC MỚI VỚI LANGCHAIN.JS**

### **Flow với LangChain.js:**
```
User Query
    ↓
Controller (giữ nguyên)
    ↓
LangChain Service:
    ├── Document Loader
    ├── Text Splitter
    ├── Vector Store (pgvector)
    ├── Retriever
    ├── Prompt Template
    ├── LLM Chain
    └── Output Parser
    ↓
Response
```

---

## 🔧 **KẾ HOẠCH THAY ĐỔI CHI TIẾT**

### **Phase 1: Setup LangChain Infrastructure**

#### **1.1. Tạo LangChain Config Module**

**File mới: `backend/src/ctxh-chat/config/langchain.config.ts`**

```typescript
import { ConfigService } from '@nestjs/config';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';

export class LangChainConfig {
  static getLLM(configService: ConfigService) {
    return new ChatGoogleGenerativeAI({
      modelName: configService.get('RAG_CHAT_MODEL') || 'gemini-2.5-flash',
      apiKey: configService.get('GEMINI_API_KEY'),
      temperature: 0.7,
      maxOutputTokens: 1024,
    });
  }

  static getEmbeddings(configService: ConfigService) {
    return new GoogleGenerativeAIEmbeddings({
      apiKey: configService.get('GEMINI_API_KEY'),
      modelName: configService.get('RAG_EMBEDDING_MODEL') || 'gemini-embedding-004',
    });
  }

  static getVectorStoreConfig(configService: ConfigService) {
    return {
      host: configService.get('DB_HOST'),
      port: configService.get('DB_PORT'),
      database: configService.get('DB_NAME'),
      user: configService.get('DB_USERNAME'),
      password: configService.get('DB_PASSWORD'),
    };
  }
}
```

---

#### **1.2. Tạo Vector Store Service**

**File mới: vector-store.service.ts**

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { LangChainConfig } from '../config/langchain.config';

@Injectable()
export class VectorStoreService implements OnModuleInit {
  private vectorStore: PGVectorStore;
  private embeddings: GoogleGenerativeAIEmbeddings;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.embeddings = LangChainConfig.getEmbeddings(this.configService);
    
    const config = LangChainConfig.getVectorStoreConfig(this.configService);

    this.vectorStore = await PGVectorStore.initialize(
      this.embeddings,
      {
        postgresConnectionOptions: config,
        tableName: 'ctxh_embeddings',
        columns: {
          idColumnName: 'id',
          vectorColumnName: 'embedding',
          contentColumnName: 'content_text',
          metadataColumnName: 'metadata',
        },
      }
    );
  }

  async similaritySearch(query: string, k: number = 5) {
    return await this.vectorStore.similaritySearchWithScore(query, k);
  }

  async addDocuments(documents: any[]) {
    return await this.vectorStore.addDocuments(documents);
  }

  getRetriever(k: number = 5) {
    return this.vectorStore.asRetriever({
      k,
      searchType: 'similarity',
    });
  }
}
```

---

### **Phase 2: Refactor Core RAG Logic**

#### **2.1. Tạo Prompt Templates**

**File mới: `backend/src/ctxh-chat/prompts/ctxh-chat.prompts.ts`**

```typescript
import { PromptTemplate } from '@langchain/core/prompts';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';

export const CTXH_RAG_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `Bạn là trợ lý ảo chuyên tư vấn về các hoạt động Công tác xã hội (CTXH) tại Đại học Bách Khoa TP.HCM.

Nhiệm vụ:
- Phân tích câu hỏi của sinh viên về các hoạt động CTXH
- Sử dụng thông tin từ context được cung cấp để trả lời
- Trả lời bằng tiếng Việt, ngắn gọn, dễ hiểu
- Nếu có link đăng ký, hãy đính kèm trong câu trả lời
- Nếu không tìm thấy thông tin phù hợp, hãy trả lời không tìm thấy dữ liệu thay vì đoán mò

Context từ cơ sở dữ liệu:
{context}

Lịch sử hội thoại:
{chat_history}`,
  ],
  ['human', '{question}'],
]);

export const ACTIVITY_RECOMMENDATION_PROMPT = PromptTemplate.fromTemplate(
  `Dựa trên thông tin sau, hãy gợi ý các hoạt động CTXH phù hợp:

Nhu cầu sinh viên: {student_needs}
Thời gian khả dụng: {available_time}
Sở thích: {interests}

Danh sách hoạt động:
{activities}

Hãy giải thích tại sao các hoạt động này phù hợp và tổng số ngày CTXH có thể đạt được.`
);
```

---

#### **2.2. Refactor Main Service**

**File cần sửa: ctxh-chat.service.ts**

**Thay đổi chính:**

```typescript
// ===== BEFORE (Custom Implementation) =====
@Injectable()
export class CtxhChatService {
  async processMessage(message: string, sessionId?: string) {
    // 1. Custom embedding
    const embedding = await this.generateEmbedding(message);
    
    // 2. Manual pgvector query
    const similarActivities = await this.queryDatabase(embedding);
    
    // 3. Manual prompt construction
    const prompt = this.buildPrompt(message, similarActivities);
    
    // 4. Direct LLM API call
    const response = await this.callGeminiAPI(prompt);
    
    return this.formatResponse(response, similarActivities);
  }
}

// ===== AFTER (LangChain.js) =====
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { formatDocumentsAsString } from 'langchain/util/document';

@Injectable()
export class CtxhChatService {
  private ragChain: RunnableSequence;
  
  constructor(
    private configService: ConfigService,
    private vectorStoreService: VectorStoreService,
    private chatSessionService: ChatSessionService,
  ) {
    this.initializeRAGChain();
  }

  private initializeRAGChain() {
    const llm = LangChainConfig.getLLM(this.configService);
    const retriever = this.vectorStoreService.getRetriever(5);

    this.ragChain = RunnableSequence.from([
      {
        context: async (input: { question: string; chat_history: string }) => {
          const docs = await retriever.getRelevantDocuments(input.question);
          return formatDocumentsAsString(docs);
        },
        question: (input) => input.question,
        chat_history: (input) => input.chat_history,
      },
      CTXH_RAG_PROMPT,
      llm,
      new StringOutputParser(),
    ]);
  }

  async processMessage(
    message: string, 
    sessionId?: string
  ): Promise<ChatResponseDto> {
    const startTime = Date.now();

    // 1. Get chat history
    const chatHistory = sessionId 
      ? await this.chatSessionService.getHistory(sessionId)
      : '';

    // 2. Run RAG chain (LangChain handles everything)
    const response = await this.ragChain.invoke({
      question: message,
      chat_history: chatHistory,
    });

    // 3. Get sources separately for response metadata
    const retriever = this.vectorStoreService.getRetriever(5);
    const sourceDocs = await retriever.getRelevantDocuments(message);
    
    // 4. Format response
    return {
      sessionId: sessionId || this.generateSessionId(),
      response,
      sources: sourceDocs.map(doc => ({
        activityId: doc.metadata.activityId,
        activityName: doc.metadata.activityName,
        organizationName: doc.metadata.organizationName,
        similarityScore: doc.metadata.score,
      })),
      responseTime: Date.now() - startTime,
      timestamp: new Date(),
    };
  }
}
```

---

### **Phase 3: Advanced Features**

#### **3.1. Conversational Memory**

**File mới: `backend/src/ctxh-chat/services/memory.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { BufferMemory } from 'langchain/memory';
import { ChatMessageHistory } from 'langchain/stores/message/in_memory';

@Injectable()
export class ConversationMemoryService {
  private memories = new Map<string, BufferMemory>();

  getMemory(sessionId: string): BufferMemory {
    if (!this.memories.has(sessionId)) {
      this.memories.set(
        sessionId,
        new BufferMemory({
          chatHistory: new ChatMessageHistory(),
          returnMessages: true,
          memoryKey: 'chat_history',
        })
      );
    }
    return this.memories.get(sessionId);
  }

  async clearMemory(sessionId: string) {
    this.memories.delete(sessionId);
  }
}
```

**Update ctxh-chat.service.ts:**
```typescript
async processMessage(message: string, sessionId?: string) {
  const memory = this.memoryService.getMemory(sessionId);
  
  const conversationalChain = RunnableSequence.from([
    {
      context: /* retriever */,
      question: (input) => input.question,
      chat_history: async () => {
        const history = await memory.loadMemoryVariables({});
        return history.chat_history;
      },
    },
    CTXH_RAG_PROMPT,
    llm,
    new StringOutputParser(),
  ]);

  const response = await conversationalChain.invoke({ question: message });
  
  // Save to memory
  await memory.saveContext(
    { input: message },
    { output: response }
  );

  return response;
}
```

---

#### **3.2. Multi-Query Retriever**

**File: `backend/src/ctxh-chat/services/advanced-retriever.service.ts`**

```typescript
import { MultiQueryRetriever } from 'langchain/retrievers/multi_query';

@Injectable()
export class AdvancedRetrieverService {
  createMultiQueryRetriever(baseRetriever: any, llm: any) {
    return MultiQueryRetriever.fromLLM({
      llm,
      retriever: baseRetriever,
      queryCount: 3, // Generate 3 variations of query
    });
  }

  async hybridSearch(query: string) {
    // Combine semantic + keyword search
    const semanticResults = await this.vectorStoreService.similaritySearch(query);
    const keywordResults = await this.fullTextSearch(query);
    
    return this.mergeResults(semanticResults, keywordResults);
  }
}
```

---

### **Phase 4: Migration Database Schema**

#### **4.1. Update PostgreSQL Schema**

**File: `backend/src/migrations/xxx-add-langchain-vector-store.ts`**

```sql
-- Table đã tồn tại: ctxh_embeddings (từ entity CtxhEmbedding)
-- Cấu trúc hiện tại:
--   - id: UUID PRIMARY KEY
--   - activity_id: UUID (FK to ctxh_activity)
--   - content_text: TEXT
--   - embedding: vector(768)
--   - chunk_index: INTEGER
--   - metadata: JSONB
--   - created_at, updated_at: TIMESTAMP

-- Verify table structure
SELECT 
    column_name, 
    data_type,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'ctxh_embeddings'
ORDER BY ordinal_position;

-- Verify vector index exists
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'ctxh_embeddings';

-- Add HNSW index if not exists (better performance than IVFFlat)
CREATE INDEX IF NOT EXISTS idx_ctxh_embeddings_embedding_hnsw
ON ctxh_embeddings 
USING hnsw (embedding vector_cosine_ops);

-- KHÔNG CẦN migrate data vì table đã có sẵn với structure đúng
-- LangChain sẽ sử dụng table hiện tại với data đã có
```

---

### **Phase 5: Testing & Rollout**

#### **5.1. Feature Flag**

**File: `.env`**
```bash
USE_LANGCHAIN=false  # Start with false
```

**File: `ctxh-chat.service.ts`**
```typescript
async processMessage(message: string, sessionId?: string) {
  const useLangChain = this.configService.get('USE_LANGCHAIN') === 'true';
  
  if (useLangChain) {
    return this.processWithLangChain(message, sessionId);
  } else {
    return this.processWithLegacySystem(message, sessionId);
  }
}
```

---

## 📊 **SO SÁNH TRƯỚC/SAU**

| Aspect | Before (Custom) | After (LangChain.js) |
|--------|-----------------|----------------------|
| **Code Lines** | ~500 lines | ~200 lines |
| **Maintainability** | Custom logic | Standard patterns |
| **Features** | Basic RAG | Memory, Multi-query, Agents |
| **Testing** | Manual | Built-in LangSmith |
| **Scalability** | Limited | Easy to extend |
| **Error Handling** | Custom | Built-in retries |

---

## ✅ **MIGRATION CHECKLIST**

### **Week 1: Setup**
```
[ ] Install LangChain dependencies
[ ] Create config module
[ ] Setup vector store service
[ ] Write unit tests
```

### **Week 2: Core Migration**
```
[ ] Refactor ctxh-chat.service.ts
[ ] Implement prompt templates
[ ] Add conversation memory
[ ] Update DTOs if needed
```

### **Week 3: Advanced Features**
```
[ ] Add multi-query retriever
[ ] Implement hybrid search
[ ] Add LangSmith observability
[ ] Performance optimization
```

### **Week 4: Testing & Rollout**
```
[ ] Integration tests with Ragas
[ ] Load testing
[ ] Feature flag rollout (10% → 50% → 100%)
[ ] Monitor metrics
[ ] Remove legacy code
```

---

## 🚨 **RISKS & MITIGATION**

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking changes | High | Feature flag, parallel systems |
| Performance degradation | Medium | Benchmark before/after |
| LangChain API changes | Low | Pin versions, abstract layer |
| Cost increase (more LLM calls) | Medium | Caching, multi-query optimization |

---

## 📚 **REFERENCES**

1. **LangChain.js Docs**: https://js.langchain.com/docs/
2. **pgvector Integration**: https://js.langchain.com/docs/integrations/vectorstores/pgvector
3. **Gemini in LangChain**: https://js.langchain.com/docs/integrations/chat/google_generativeai

---

Bạn muốn tôi bắt đầu implement file nào trước? Hoặc giải thích chi tiết hơn về phần nào?