# PHẦN 2: XỬ LÝ TRUY VẤN & SINH VĂN BẢN (INFERENCE) - KẾ HOẠCH CHI TIẾT

*Ngày lập: 26/11/2025*
*Dựa trên nghiên cứu Context7 về LangChain.js và best practices*

## 📋 TỔNG QUAN PHASE 2

**Mục tiêu chính:** Xây dựng hệ thống RAG chatbot hoàn chỉnh để trả lời câu hỏi về CTXH activities

**Timeline:** 2-3 tuần (14-21 ngày)

**Deliverables:**
- ✅ Vector retrieval system với similarity search
- ✅ Conversational agent với memory management
- ✅ REST API endpoints cho chat functionality
- ✅ Response formatting với source attribution
- ✅ Session management và conversation history
- ✅ Rate limiting và authentication guards

---

## 🏗️ KIẾN TRÚC TỔNG QUAN

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  User Question  │    │   Embedding      │    │ Vector Similarity│
│     Input       │───▶│    Service       │───▶│     Search      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Formatted       │◀───│   Response       │◀───│  LLM + Context  │
│   Response      │    │   Formatter      │    │   Generation    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                       ┌──────────────────┐    ┌─────────────────┐
                       │  Conversation    │    │   Retrieved     │
                       │    Manager       │    │   Documents     │
                       └──────────────────┘    └─────────────────┘
```

---

## 🔍 BƯỚC 7: THIẾT LẬP BACKEND AGENT

### 📝 Module Architecture
**File:** `backend/src/ctxh-chat/ctxh-chat.module.ts`

**Enhanced Dependencies từ Context7 Research:**
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

// LangChain Core
import { ChatOpenAI } from '@langchain/openai';
import { OpenAIEmbeddings } from '@langchain/openai';
import { createRetrieverTool } from '@langchain/classic/tools/retriever';

// Entities & Services
import { CtxhEmbedding } from '../entities/ctxh-embedding.entity';
import { CtxhActivity } from '../entities/ctxh-activity.entity';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forFeature([CtxhEmbedding, CtxhActivity]),
  ],
  controllers: [CtxhChatController],
  providers: [
    // Core Services
    CtxhChatService,
    CtxhRetrievalService,
    ConversationService,
    ResponseFormatterService,
    
    // Utilities
    EmbeddingService, // Reused from Phase 1
    
    // LangChain Configuration
    {
      provide: 'CHAT_MODEL',
      useFactory: (configService: ConfigService) => new ChatOpenAI({
        apiKey: configService.get('OPENAI_API_KEY'),
        model: configService.get('RAG_CHAT_MODEL', 'gpt-3.5-turbo'),
        temperature: 0.1,
      }),
      inject: [ConfigService],
    },
    {
      provide: 'EMBEDDING_MODEL',
      useFactory: (configService: ConfigService) => new OpenAIEmbeddings({
        apiKey: configService.get('OPENAI_API_KEY'),
        model: configService.get('RAG_EMBEDDING_MODEL', 'text-embedding-3-small'),
        dimensions: 1536,
      }),
      inject: [ConfigService],
    },
  ],
  exports: [CtxhChatService, CtxhRetrievalService],
})
export class CtxhChatModule {}
```

### 🎯 Implementation Strategy

#### 7.1. DTOs Definition
```typescript
// chat-request.dto.ts
export class ChatRequestDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
}

// chat-response.dto.ts
export class ChatResponseDto {
  @IsString()
  sessionId: string;

  @IsString()
  response: string;

  @IsArray()
  sources: SourceDto[];

  @IsNumber()
  responseTime: number;

  @IsDate()
  timestamp: Date;
}

export class SourceDto {
  @IsUUID()
  activityId: string;

  @IsString()
  activityName: string;

  @IsString()
  organizationName: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  similarityScore: number;
}
```

---

## 🔎 BƯỚC 8: CTXH RETRIEVAL SERVICE

### 📝 Service Overview
**File:** `backend/src/ctxh-chat/services/ctxh-retrieval.service.ts`

**Dựa trên Context7 LangChain.js patterns:**

### 🎯 Implementation Details

#### 8.1. Vector Similarity Search với pgVector
```typescript
@Injectable()
export class CtxhRetrievalService {
  constructor(
    @InjectRepository(CtxhEmbedding)
    private embeddingRepository: Repository<CtxhEmbedding>,
    
    @Inject('EMBEDDING_MODEL')
    private embeddingModel: OpenAIEmbeddings,
    
    private configService: ConfigService,
  ) {}

  async retrieveRelevantDocuments(
    query: string,
    options: RetrievalOptions = {}
  ): Promise<RetrievalResult> {
    const startTime = Date.now();
    
    // Step 1: Generate query embedding
    const queryEmbedding = await this.embeddingModel.embedQuery(query);
    
    // Step 2: Perform similarity search
    const {
      k = this.configService.get('RAG_TOP_K', 5),
      similarityThreshold = this.configService.get('RAG_SIMILARITY_THRESHOLD', 0.7),
      filters = {}
    } = options;
    
    const searchResults = await this.performVectorSearch(
      queryEmbedding,
      k,
      similarityThreshold,
      filters
    );
    
    // Step 3: Post-process and rank results
    const processedResults = await this.postProcessResults(searchResults, query);
    
    return {
      documents: processedResults,
      totalResults: searchResults.length,
      retrievalTime: Date.now() - startTime,
      query,
    };
  }

  private async performVectorSearch(
    queryEmbedding: number[],
    k: number,
    threshold: number,
    filters: RetrievalFilters
  ): Promise<VectorSearchResult[]> {
    let queryBuilder = this.embeddingRepository
      .createQueryBuilder('embedding')
      .leftJoinAndSelect('embedding.activity', 'activity')
      .leftJoinAndSelect('activity.category', 'category') 
      .leftJoinAndSelect('activity.organization', 'organization')
      .select([
        'embedding.id',
        'embedding.content_text',
        'embedding.metadata',
        'activity.id',
        'activity.name',
        'activity.description',
        'activity.location',
        'activity.start_date',
        'activity.end_date',
        'activity.total_days',
        'activity.status',
        'category.name',
        'organization.name',
        `(1 - (embedding.embedding <=> '[${queryEmbedding.join(',')}]')) as similarity_score`
      ])
      .where(`1 - (embedding.embedding <=> '[${queryEmbedding.join(',')}]') >= :threshold`, {
        threshold
      })
      .orderBy('similarity_score', 'DESC')
      .limit(k);

    // Apply filters
    if (filters.organizationId) {
      queryBuilder = queryBuilder.andWhere('activity.organization_id = :orgId', {
        orgId: filters.organizationId
      });
    }

    if (filters.status) {
      queryBuilder = queryBuilder.andWhere('activity.status IN (:...statuses)', {
        statuses: filters.status
      });
    }

    if (filters.dateRange) {
      const { startDate, endDate } = filters.dateRange;
      queryBuilder = queryBuilder
        .andWhere('activity.start_date >= :startDate', { startDate })
        .andWhere('activity.end_date <= :endDate', { endDate });
    }

    return queryBuilder.getRawMany();
  }
}
```

#### 8.2. MMR (Maximum Marginal Relevance) Implementation  
**Inspired by Context7 documentation patterns:**

```typescript
private async postProcessResults(
  results: VectorSearchResult[],
  originalQuery: string
): Promise<ProcessedDocument[]> {
  // Implement MMR for result diversification
  const mmrResults = this.applyMMR(results, {
    lambda: 0.5, // Balance between relevance and diversity
    diversityWeight: 0.3
  });
  
  return mmrResults.map(result => ({
    content: result.content_text,
    metadata: {
      activityId: result.activity_id,
      activityName: result.activity_name,
      categoryName: result.category_name,
      organizationName: result.organization_name,
      location: result.activity_location,
      startDate: result.activity_start_date,
      endDate: result.activity_end_date,
      totalDays: result.activity_total_days,
      status: result.activity_status,
    },
    similarityScore: result.similarity_score,
    source: `ctxh_activity:${result.activity_id}`
  }));
}

private applyMMR(
  results: VectorSearchResult[],
  options: MMROptions
): VectorSearchResult[] {
  if (results.length <= 1) return results;
  
  const selected: VectorSearchResult[] = [];
  const candidates = [...results];
  
  // Select first document (highest similarity)
  selected.push(candidates.shift()!);
  
  while (candidates.length > 0 && selected.length < options.maxResults) {
    let bestCandidate: VectorSearchResult | null = null;
    let bestScore = -1;
    let bestIndex = -1;
    
    candidates.forEach((candidate, index) => {
      // Calculate MMR score
      const relevanceScore = candidate.similarity_score;
      const diversityScore = this.calculateDiversityScore(candidate, selected);
      
      const mmrScore = options.lambda * relevanceScore - 
                      (1 - options.lambda) * diversityScore;
      
      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestCandidate = candidate;
        bestIndex = index;
      }
    });
    
    if (bestCandidate) {
      selected.push(bestCandidate);
      candidates.splice(bestIndex, 1);
    }
  }
  
  return selected;
}
```

### ⚙️ Configuration
```typescript
interface RetrievalOptions {
  k?: number; // Number of documents to retrieve
  similarityThreshold?: number; // Minimum similarity score
  filters?: RetrievalFilters;
  useMMR?: boolean; // Enable Maximum Marginal Relevance
  mmrOptions?: MMROptions;
}

interface RetrievalFilters {
  organizationId?: string;
  status?: ActivityStatus[];
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  categories?: string[];
}
```

---

## 💬 BƯỚC 9: CONVERSATION SERVICE

### 📝 Service Overview
**File:** `backend/src/ctxh-chat/services/conversation.service.ts`

**Based on Context7 LangChain.js Memory Management patterns:**

### 🎯 Implementation Details

#### 9.1. Redis-based Conversation History
```typescript
@Injectable()
export class ConversationService {
  private redis: Redis;
  
  constructor(
    @Inject('REDIS_CLIENT')
    private redisClient: Redis,
    private configService: ConfigService,
  ) {
    this.redis = redisClient;
  }

  async getOrCreateSession(
    userId?: string,
    sessionId?: string
  ): Promise<ConversationSession> {
    const finalSessionId = sessionId || this.generateSessionId();
    const cacheKey = `conversation:${finalSessionId}`;
    
    try {
      const existingSession = await this.redis.get(cacheKey);
      
      if (existingSession) {
        const session = JSON.parse(existingSession) as ConversationSession;
        
        // Update last active timestamp
        session.metadata.lastActive = new Date();
        await this.saveSession(session);
        
        return session;
      }
      
      // Create new session
      const newSession: ConversationSession = {
        sessionId: finalSessionId,
        userId: userId || 'anonymous',
        messages: [],
        metadata: {
          startTime: new Date(),
          lastActive: new Date(),
          turnCount: 0,
          totalTokens: 0,
        },
        context: {
          recentTopics: [],
          userPreferences: {},
        }
      };
      
      await this.saveSession(newSession);
      return newSession;
      
    } catch (error) {
      this.logger.error('Failed to get/create session:', error);
      throw new ConversationError('Session management failed', error);
    }
  }

  async addMessage(
    sessionId: string,
    message: ConversationMessage
  ): Promise<ConversationSession> {
    const session = await this.getOrCreateSession(undefined, sessionId);
    
    // Add new message
    session.messages.push({
      ...message,
      timestamp: new Date(),
    });
    
    // Update metadata
    session.metadata.lastActive = new Date();
    session.metadata.turnCount += message.role === 'user' ? 1 : 0;
    session.metadata.totalTokens += this.estimateTokens(message.content);
    
    // Manage conversation window
    await this.manageConversationWindow(session);
    
    await this.saveSession(session);
    return session;
  }
}
```

#### 9.2. Context Window Management với Summarization
**Following Context7 summarizationMiddleware patterns:**

```typescript
private async manageConversationWindow(
  session: ConversationSession
): Promise<void> {
  const maxMessages = this.configService.get('MAX_CONVERSATION_HISTORY', 20);
  const maxTokens = this.configService.get('MAX_CONVERSATION_TOKENS', 4000);
  
  // Check if we need to truncate
  if (session.messages.length > maxMessages || 
      session.metadata.totalTokens > maxTokens) {
    
    await this.summarizeAndTruncate(session);
  }
}

private async summarizeAndTruncate(
  session: ConversationSession
): Promise<void> {
  const messagesToKeep = this.configService.get('MESSAGES_TO_KEEP', 10);
  const messagesToSummarize = session.messages.slice(0, -messagesToKeep);
  
  if (messagesToSummarize.length > 0) {
    // Use OpenAI to summarize old messages
    const summaryPrompt = this.buildSummaryPrompt(messagesToSummarize);
    const summary = await this.generateSummary(summaryPrompt);
    
    // Replace old messages with summary
    session.messages = [
      {
        role: 'system',
        content: `Tóm tắt cuộc trò chuyện trước: ${summary}`,
        timestamp: new Date(),
        metadata: { type: 'summary' }
      },
      ...session.messages.slice(-messagesToKeep)
    ];
    
    // Recalculate token count
    session.metadata.totalTokens = session.messages.reduce(
      (total, msg) => total + this.estimateTokens(msg.content), 0
    );
  }
}

private buildSummaryPrompt(messages: ConversationMessage[]): string {
  const conversation = messages
    .filter(msg => msg.role !== 'system')
    .map(msg => `${msg.role === 'user' ? 'Sinh viên' : 'Trợ lý'}: ${msg.content}`)
    .join('\n');
    
  return `
Hãy tóm tắt cuộc trò chuyện sau về các hoạt động CTXH một cách ngắn gọn và chính xác:

${conversation}

Tóm tắt nên bao gồm:
- Các chủ đề chính được thảo luận
- Thông tin CTXH quan trọng được cung cấp
- Bối cảnh cần thiết cho cuộc trò chuyện tiếp theo

Tóm tắt (tối đa 200 từ):`;
}
```

### ⚙️ Session Management Configuration
```typescript
interface ConversationSession {
  sessionId: string;
  userId: string;
  messages: ConversationMessage[];
  metadata: SessionMetadata;
  context: SessionContext;
}

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    sources?: string[];
    type?: 'summary' | 'query' | 'response';
    processingTime?: number;
  };
}

interface SessionMetadata {
  startTime: Date;
  lastActive: Date;
  turnCount: number;
  totalTokens: number;
}

interface SessionContext {
  recentTopics: string[];
  userPreferences: Record<string, any>;
}
```

---

## 🤖 BƯỚC 10: CHAT AGENT SERVICE

### 📝 Service Overview  
**File:** `backend/src/ctxh-chat/services/ctxh-chat.service.ts`

**Based on Context7 LangChain.js Agent patterns:**

### 🎯 Implementation Details

#### 10.1. Retrieval-Augmented Chat Agent
```typescript
@Injectable()
export class CtxhChatService {
  private retrieverTool: any;
  
  constructor(
    @Inject('CHAT_MODEL')
    private chatModel: ChatOpenAI,
    
    private retrievalService: CtxhRetrievalService,
    private conversationService: ConversationService,
    private responseFormatter: ResponseFormatterService,
    private configService: ConfigService,
  ) {
    this.initializeRetrieverTool();
  }

  private initializeRetrieverTool() {
    // Create retriever tool following Context7 patterns
    this.retrieverTool = createRetrieverTool(
      {
        invoke: async (query: string) => {
          const results = await this.retrievalService.retrieveRelevantDocuments(query);
          return results.documents;
        }
      },
      {
        name: 'ctxh_retriever',
        description: `
Công cụ tìm kiếm thông tin về các hoạt động Công tác xã hội (CTXH).
Sử dụng công cụ này để trả lời câu hỏi về:
- Thông tin hoạt động CTXH cụ thể
- Lịch trình và thời gian các hoạt động  
- Địa điểm tổ chức hoạt động
- Số ngày CTXH được cấp
- Danh mục và tổ chức thực hiện
        `.trim(),
      }
    );
  }

  async processMessage(
    message: string,
    sessionId?: string,
    userId?: string
  ): Promise<ChatResponse> {
    const startTime = Date.now();
    
    try {
      // Get or create conversation session
      const session = await this.conversationService.getOrCreateSession(
        userId,
        sessionId
      );

      // Add user message to session
      await this.conversationService.addMessage(session.sessionId, {
        role: 'user',
        content: message,
        timestamp: new Date(),
      });

      // Build conversation context
      const conversationHistory = this.buildConversationHistory(session);
      
      // Generate response using LangChain agent
      const agentResponse = await this.generateAgentResponse(
        message,
        conversationHistory
      );

      // Add assistant response to session
      await this.conversationService.addMessage(session.sessionId, {
        role: 'assistant', 
        content: agentResponse.content,
        timestamp: new Date(),
        metadata: {
          sources: agentResponse.sources?.map(s => s.source) || [],
          processingTime: Date.now() - startTime,
        }
      });

      // Format final response
      const formattedResponse = await this.responseFormatter.formatResponse(
        agentResponse,
        { includeSourceLinks: true }
      );

      return {
        sessionId: session.sessionId,
        response: formattedResponse.content,
        sources: formattedResponse.sources,
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error('Chat processing failed:', error);
      return this.handleChatError(error, sessionId);
    }
  }
}
```

#### 10.2. System Prompt Engineering
**Following Context7 dynamic prompt patterns:**

```typescript
private buildSystemPrompt(context?: SessionContext): string {
  const basePrompt = `
Bạn là trợ lý ảo chuyên tư vấn về các hoạt động Công tác xã hội (CTXH) cho sinh viên.

NHIỆM VỤ CHÍNH:
1. Trả lời câu hỏi về các hoạt động CTXH một cách chính xác và chi tiết
2. Cung cấp thông tin cụ thể về thời gian, địa điểm, số ngày CTXH
3. Gợi ý các hoạt động phù hợp với nhu cầu sinh viên  
4. Hướng dẫn quy trình tham gia hoạt động CTXH

QUY TẮC QUAN TRỌNG:
- CHỈ sử dụng thông tin từ công cụ tìm kiếm được cung cấp
- Nếu không tìm thấy thông tin, hãy thông báo rõ ràng
- Luôn trích dẫn nguồn thông tin khi cung cấp chi tiết cụ thể
- Sử dụng ngôn ngữ thân thiện, dễ hiểu cho sinh viên
- Ưu tiên các hoạt động có status ACTIVE hoặc sắp diễn ra

ĐỊNH DẠNG PHẢN HỒI:
- Câu trả lời trực tiếp và ngắn gọn
- Thông tin chi tiết được tổ chức rõ ràng
- Đề xuất hành động tiếp theo nếu phù hợp
  `;

  // Dynamic context adjustments
  let dynamicPrompt = basePrompt;
  
  if (context?.recentTopics?.length > 0) {
    dynamicPrompt += `\n\nCÁC CHỦ ĐỀ ĐÃ THẢO LUẬN: ${context.recentTopics.join(', ')}`;
  }

  return dynamicPrompt;
}

private async generateAgentResponse(
  userMessage: string,
  conversationHistory: ConversationMessage[]
): Promise<AgentResponse> {
  // Retrieve relevant documents
  const retrievalResults = await this.retrievalService.retrieveRelevantDocuments(
    userMessage,
    { k: 3, useMMR: true }
  );

  // Build context from retrieved documents
  const contextDocs = retrievalResults.documents
    .map(doc => `
Hoạt động: ${doc.metadata.activityName}
Tổ chức: ${doc.metadata.organizationName}  
Thời gian: ${doc.metadata.startDate} - ${doc.metadata.endDate}
Ngày CTXH: ${doc.metadata.totalDays} ngày
Địa điểm: ${doc.metadata.location}
Mô tả: ${doc.content}
---`)
    .join('\n');

  // Build conversation messages for LLM
  const messages = [
    { role: 'system', content: this.buildSystemPrompt() },
    ...conversationHistory.slice(-6), // Keep recent context
    {
      role: 'user',
      content: `
Câu hỏi: ${userMessage}

Thông tin CTXH liên quan:
${contextDocs}

Hãy trả lời dựa trên thông tin được cung cấp ở trên.`
    }
  ];

  // Generate response using OpenAI
  const response = await this.chatModel.invoke(messages);

  return {
    content: response.content,
    sources: retrievalResults.documents,
    retrievalTime: retrievalResults.retrievalTime,
  };
}
```

### ⚙️ Configuration
```typescript
interface ChatResponse {
  sessionId: string;
  response: string; 
  sources: SourceInfo[];
  responseTime: number;
  timestamp: Date;
}

interface AgentResponse {
  content: string;
  sources: ProcessedDocument[];
  retrievalTime: number;
}

interface ChatOptions {
  maxResponseTokens?: number;
  temperature?: number;
  includeSourceLinks?: boolean;
  enableFollowUpSuggestions?: boolean;
}
```

---

## 📡 BƯỚC 11: API ENDPOINTS

### 📝 Controller Overview
**File:** `backend/src/ctxh-chat/controllers/ctxh-chat.controller.ts`

### 🎯 Implementation Details

#### 11.1. Chat Message Endpoint
```typescript
@Controller('api/ctxh-chat')
@UseGuards(AuthGuard)
export class CtxhChatController {
  constructor(
    private ctxhChatService: CtxhChatService,
    private conversationService: ConversationService,
  ) {}

  @Post('message')
  @UseInterceptors(RateLimitInterceptor)
  @ApiOperation({ summary: 'Send a message to CTXH chat agent' })
  @ApiResponse({ status: 200, description: 'Chat response generated successfully' })
  async sendMessage(
    @Body() chatRequest: ChatRequestDto,
    @Req() request: any,
  ): Promise<ChatResponseDto> {
    const userId = request.user?.id;
    
    const response = await this.ctxhChatService.processMessage(
      chatRequest.message,
      chatRequest.sessionId,
      userId
    );

    return response;
  }

  @Get('history/:sessionId')
  @ApiOperation({ summary: 'Get conversation history' })
  async getHistory(
    @Param('sessionId') sessionId: string,
    @Query('limit') limit: number = 50,
    @Req() request: any,
  ): Promise<ConversationHistoryDto> {
    const userId = request.user?.id;
    
    const session = await this.conversationService.getSession(sessionId);
    
    // Verify user access to session
    if (session.userId !== userId && !request.user.isAdmin) {
      throw new ForbiddenException('Access denied to this conversation');
    }

    return {
      sessionId: session.sessionId,
      messages: session.messages.slice(-limit),
      metadata: session.metadata,
    };
  }

  @Delete('session/:sessionId')
  @ApiOperation({ summary: 'Clear conversation session' })
  async clearSession(
    @Param('sessionId') sessionId: string,
    @Req() request: any,
  ): Promise<{ message: string }> {
    const userId = request.user?.id;
    
    await this.conversationService.clearSession(sessionId, userId);
    
    return { message: 'Session cleared successfully' };
  }

  @Post('feedback')
  @ApiOperation({ summary: 'Provide feedback on chat response' })
  async provideFeedback(
    @Body() feedback: ChatFeedbackDto,
    @Req() request: any,
  ): Promise<{ message: string }> {
    // Implementation for feedback collection
    // This data can be used to improve the system later
    
    return { message: 'Feedback recorded successfully' };
  }
}
```

#### 11.2. Streaming Response Endpoint  
**Following Context7 streaming patterns:**

```typescript
@Post('stream')
@Sse()
@ApiOperation({ summary: 'Stream chat response in real-time' })
async streamMessage(
  @Body() chatRequest: ChatRequestDto,
  @Req() request: any,
): Promise<Observable<MessageEvent>> {
  const userId = request.user?.id;

  return new Observable(observer => {
    this.processStreamingMessage(
      chatRequest.message,
      chatRequest.sessionId,
      userId,
      observer
    );
  });
}

private async processStreamingMessage(
  message: string,
  sessionId: string,
  userId: string,
  observer: Observer<MessageEvent>
) {
  try {
    // Send initial acknowledgment
    observer.next({ 
      data: JSON.stringify({ type: 'start', message: 'Processing your question...' }) 
    });

    // Retrieve documents
    observer.next({ 
      data: JSON.stringify({ type: 'status', message: 'Searching relevant information...' }) 
    });
    
    const retrievalResults = await this.ctxhChatService.retrieveDocuments(message);
    
    observer.next({ 
      data: JSON.stringify({ 
        type: 'documents_found', 
        count: retrievalResults.documents.length 
      }) 
    });

    // Generate streaming response
    observer.next({ 
      data: JSON.stringify({ type: 'status', message: 'Generating response...' }) 
    });
    
    const responseStream = await this.ctxhChatService.streamResponse(
      message,
      sessionId,
      userId,
      retrievalResults
    );

    // Stream response chunks
    for await (const chunk of responseStream) {
      observer.next({
        data: JSON.stringify({ 
          type: 'content_chunk', 
          content: chunk 
        })
      });
    }

    // Send completion
    observer.next({ 
      data: JSON.stringify({ 
        type: 'complete',
        sources: retrievalResults.documents.map(doc => ({
          activityName: doc.metadata.activityName,
          organizationName: doc.metadata.organizationName,
          similarityScore: doc.similarityScore,
        }))
      }) 
    });

    observer.complete();

  } catch (error) {
    observer.next({
      data: JSON.stringify({ 
        type: 'error', 
        message: 'An error occurred while processing your request' 
      })
    });
    observer.error(error);
  }
}
```

---

## 📝 BƯỚC 12: RESPONSE ENHANCEMENT

### 📝 Service Overview
**File:** `backend/src/ctxh-chat/services/response-formatter.service.ts`

### 🎯 Implementation Details

#### 12.1. Response Formatting với Source Attribution
```typescript
@Injectable()
export class ResponseFormatterService {
  
  async formatResponse(
    agentResponse: AgentResponse,
    options: FormattingOptions = {}
  ): Promise<FormattedResponse> {
    
    const {
      includeSourceLinks = true,
      enableMarkdown = true,
      addFollowUpSuggestions = true,
    } = options;

    let formattedContent = agentResponse.content;

    // Format markdown if enabled
    if (enableMarkdown) {
      formattedContent = this.enhanceMarkdownFormatting(formattedContent);
    }

    // Build sources information
    const sources = await this.buildSourcesInfo(
      agentResponse.sources,
      includeSourceLinks
    );

    // Generate follow-up suggestions
    const followUpSuggestions = addFollowUpSuggestions
      ? await this.generateFollowUpSuggestions(agentResponse)
      : [];

    return {
      content: formattedContent,
      sources,
      followUpSuggestions,
      metadata: {
        responseType: this.determineResponseType(agentResponse),
        confidence: this.calculateConfidenceScore(agentResponse),
        processingTime: agentResponse.retrievalTime,
      }
    };
  }

  private enhanceMarkdownFormatting(content: string): string {
    return content
      // Highlight important information
      .replace(/(\d+\s+ngày\s+CTXH)/gi, '**$1**')
      .replace(/(Địa điểm:\s*[^\n]+)/gi, '📍 **$1**')  
      .replace(/(Thời gian:\s*[^\n]+)/gi, '⏰ **$1**')
      .replace(/(Tổ chức:\s*[^\n]+)/gi, '🏢 **$1**')
      // Format dates nicely
      .replace(/(\d{2}\/\d{2}\/\d{4})/g, '`$1`');
  }

  private async buildSourcesInfo(
    documents: ProcessedDocument[],
    includeLinks: boolean
  ): Promise<SourceInfo[]> {
    return documents.map(doc => ({
      activityId: doc.metadata.activityId,
      activityName: doc.metadata.activityName,
      organizationName: doc.metadata.organizationName,
      categoryName: doc.metadata.categoryName,
      similarityScore: Math.round(doc.similarityScore * 100) / 100,
      link: includeLinks 
        ? `/activities/${doc.metadata.activityId}` 
        : undefined,
    }));
  }

  private async generateFollowUpSuggestions(
    agentResponse: AgentResponse
  ): Promise<string[]> {
    const suggestions = [];
    
    // Analyze response content to suggest relevant follow-ups
    const sources = agentResponse.sources;
    
    if (sources.length > 0) {
      const mainActivity = sources[0];
      
      suggestions.push(
        `Làm thế nào để đăng ký tham gia hoạt động "${mainActivity.metadata.activityName}"?`,
        `Có những hoạt động CTXH nào khác của ${mainActivity.metadata.organizationName}?`,
      );
      
      // Check for similar activities in the same category
      const category = mainActivity.metadata.categoryName;
      if (category) {
        suggestions.push(`Tìm thêm hoạt động CTXH thuộc danh mục "${category}"`);
      }
    }
    
    // Add general helpful suggestions
    suggestions.push(
      'Các hoạt động CTXH nào đang mở đăng ký?',
      'Quy trình tham gia hoạt động CTXH như thế nào?'
    );

    return suggestions.slice(0, 3); // Return top 3 suggestions
  }

  private determineResponseType(response: AgentResponse): ResponseType {
    const content = response.content.toLowerCase();
    
    if (content.includes('không tìm thấy') || content.includes('không có thông tin')) {
      return 'no_results';
    }
    
    if (response.sources.length === 1) {
      return 'single_activity';
    }
    
    if (response.sources.length > 1) {
      return 'multiple_activities';
    }
    
    return 'general_info';
  }

  private calculateConfidenceScore(response: AgentResponse): number {
    if (response.sources.length === 0) return 0;
    
    const avgSimilarity = response.sources.reduce(
      (sum, doc) => sum + doc.similarityScore, 0
    ) / response.sources.length;
    
    // Normalize to 0-100 scale
    return Math.round(avgSimilarity * 100);
  }
}
```

#### 12.2. Fallback Response Handler
```typescript
private generateFallbackResponse(query: string): FormattedResponse {
  const fallbackSuggestions = [
    'Các hoạt động CTXH nào đang được tổ chức?',
    'Tôi cần bao nhiêu ngày CTXH để tốt nghiệp?',
    'Làm thế nào để tìm hoạt động CTXH phù hợp?',
    'Quy trình đăng ký tham gia CTXH ra sao?',
  ];

  return {
    content: `
Xin lỗi, tôi không tìm thấy thông tin cụ thể về "${query}". 

Có thể bạn quan tâm đến các câu hỏi sau:
${fallbackSuggestions.map(q => `• ${q}`).join('\n')}

Hoặc bạn có thể liên hệ trực tiếp với phòng Công tác Sinh viên để được hỗ trợ tốt nhất.
    `,
    sources: [],
    followUpSuggestions: fallbackSuggestions,
    metadata: {
      responseType: 'fallback',
      confidence: 0,
      processingTime: 0,
    }
  };
}
```

---

## 🔒 GUARDS & MIDDLEWARE

### 📝 Rate Limiting Implementation
```typescript
@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private redis: Redis;

  constructor(@Inject('REDIS_CLIENT') redisClient: Redis) {
    this.redis = redisClient;
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id || request.ip;
    
    const rateLimitKey = `rate_limit:${userId}`;
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 30; // 30 requests per minute

    const current = await this.redis.incr(rateLimitKey);
    
    if (current === 1) {
      await this.redis.expire(rateLimitKey, Math.ceil(windowMs / 1000));
    }

    if (current > maxRequests) {
      throw new TooManyRequestsException(
        'Rate limit exceeded. Please try again later.'
      );
    }

    return next.handle();
  }
}
```

---

## 🗓️ TIMELINE CHI TIẾT

### Phase 2A: Retrieval & Agent Core (Ngày 1-7)  
**Day 1-2:**
- ✅ CtxhRetrievalService with vector similarity search
- ✅ MMR implementation for result diversification  
- ✅ Performance optimization for pgVector queries

**Day 3-4:**
- ✅ ConversationService với Redis session management
- ✅ Context window management với summarization
- ✅ Memory leak prevention

**Day 5-7:**
- ✅ CtxhChatService with LangChain agent integration
- ✅ System prompt engineering and testing
- ✅ Retriever tool configuration

### Phase 2B: API & Enhancement (Ngày 8-14)
**Day 8-10:**
- ✅ REST API endpoints implementation
- ✅ Streaming response functionality
- ✅ Request/response validation

**Day 11-12:**
- ✅ ResponseFormatterService with markdown enhancement
- ✅ Source attribution and follow-up suggestions
- ✅ Fallback response handling

**Day 13-14:**
- ✅ Rate limiting and security guards  
- ✅ Error handling and monitoring
- ✅ API documentation completion

### Phase 2C: Integration & Testing (Ngày 15-21)
**Day 15-17:**
- ✅ End-to-end integration testing
- ✅ Performance benchmarking
- ✅ Load testing with concurrent users

**Day 18-19:**
- ✅ User acceptance testing
- ✅ Response quality evaluation
- ✅ Prompt optimization based on feedback

**Day 20-21:**
- ✅ Production deployment preparation
- ✅ Monitoring and alerting setup
- ✅ Documentation and training materials

---

## 🎯 ACCEPTANCE CRITERIA

### ✅ Functional Requirements
- [ ] Vector similarity search với <100ms response time
- [ ] Conversation memory across sessions  
- [ ] Source attribution cho mọi response
- [ ] Rate limiting 30 req/min per user
- [ ] Streaming response support
- [ ] Fallback responses cho edge cases

### ✅ Quality Requirements
- [ ] Response accuracy >85% based on human evaluation
- [ ] System uptime >99.9%
- [ ] API response time <2 seconds (95th percentile)
- [ ] Proper error handling cho mọi scenarios
- [ ] Comprehensive logging và monitoring
- [ ] Security compliance (authentication, authorization)

### ✅ Performance Requirements
- [ ] Concurrent user support: 100+ simultaneous sessions
- [ ] Memory usage <2GB cho average load
- [ ] Database query optimization với proper indexes
- [ ] Redis session storage với TTL management
- [ ] OpenAI API rate limiting compliance
- [ ] Graceful degradation under high load

---

## 🚨 RISKS & MITIGATION

### Risk 1: OpenAI API Rate Limits & Costs
**Mitigation:**
- Implement request queuing và batching
- Use cheaper models for non-critical operations
- Cache common responses trong Redis
- Monitor API usage với alerts

### Risk 2: Response Quality & Hallucination
**Mitigation:**
- Strict prompt engineering với source constraints
- Confidence scoring cho responses
- Human-in-the-loop evaluation system
- Fallback responses cho low-confidence cases

### Risk 3: Session Management Scaling
**Mitigation:**
- Redis Cluster configuration for high availability
- Session data compression
- Automatic cleanup của expired sessions
- Load balancing across multiple Redis instances

---

## 📚 HANDOFF REQUIREMENTS

**Phase 2 → Phase 3 Dependencies:**
1. ✅ All API endpoints functional và documented
2. ✅ Response quality meets acceptance criteria  
3. ✅ Performance benchmarks achieved
4. ✅ Security testing completed
5. ✅ Integration tests passing
6. ✅ Monitoring và alerting operational

**Documentation Deliverables:**
- API reference documentation
- System architecture diagrams
- Performance optimization guide
- Troubleshooting runbook
- User guide cho frontend integration

**Success Metrics for Handoff:**
- API uptime >99% trong 48h continuous testing
- Average response quality score >8/10
- Zero critical security vulnerabilities
- Memory usage stable under load testing
- All automated tests passing

---

*📌 Kế hoạch này được thiết kế dựa trên best practices từ LangChain.js ecosystem và production RAG implementations, đảm bảo scalability, reliability và user experience tốt nhất cho CTXH chatbot system.*
