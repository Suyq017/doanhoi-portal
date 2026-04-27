import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LangChainRagChainService, RAGResponse } from '../langchain-rag-chain.service';
import { LangChainVectorStoreService } from '../langchain-vector-store.service';
import { LangChainMemoryService } from '../langchain-memory.service';
import { CtxhFilterExtractionService } from '../ctxh-filter-extraction.service';
import { createMockConfigService } from './mocks/config.service.mock';
import { createMockVectorStoreService, createMockDocument } from './mocks/vector-store.mock';
import { Document } from '@langchain/core/documents';

// Mock LangChain core modules
jest.mock('@langchain/core/runnables', () => ({
  RunnableSequence: {
    from: jest.fn().mockReturnValue({
      invoke: jest.fn().mockResolvedValue('Test RAG response'),
      stream: jest.fn().mockImplementation(async function* () {
        yield 'Streamed ';
        yield 'response ';
        yield 'chunk';
      }),
    }),
  },
  RunnablePassthrough: {
    assign: jest.fn().mockReturnValue({}),
  },
}));

jest.mock('@langchain/core/output_parsers', () => ({
  StringOutputParser: jest.fn().mockImplementation(() => ({})),
}));

// Mock LangChain Google GenAI
jest.mock('@langchain/google-genai', () => ({
  ChatGoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    invoke: jest.fn().mockResolvedValue({ content: 'AI response' }),
    stream: jest.fn().mockImplementation(async function* () {
      yield { content: 'Streamed ' };
      yield { content: 'response' };
    }),
  })),
}));

// Mock LangChainConfig
jest.mock('../../config/langchain.config', () => ({
  LangChainConfig: {
    getLLM: jest.fn().mockReturnValue({
      invoke: jest.fn().mockResolvedValue({ content: 'AI response' }),
    }),
    isUsingLocalModel: jest.fn().mockReturnValue(true),
    getRAGConfig: jest.fn().mockReturnValue({
      topK: 5,
      temperature: 0.7,
    }),
  },
}));

// Mock prompts
jest.mock('../../prompts/ctxh-chat.prompts', () => ({
  CTXH_RAG_PROMPT: {
    invoke: jest.fn(),
  },
  STANDALONE_QUESTION_PROMPT: {
    invoke: jest.fn(),
  },
}));

describe('LangChainRagChainService', () => {
  let service: LangChainRagChainService;
  let vectorStoreService: ReturnType<typeof createMockVectorStoreService>;
  let memoryService: Partial<LangChainMemoryService>;
  let filterExtractionService: {
    extractFilters: jest.Mock;
    resolveDateRange: jest.Mock;
    isEmpty: jest.Mock;
  };
  let mockConfigService: ReturnType<typeof createMockConfigService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    vectorStoreService = createMockVectorStoreService();
    mockConfigService = createMockConfigService();

    memoryService = {
      getMemory: jest.fn().mockResolvedValue({
        chatHistory: { getMessages: jest.fn().mockResolvedValue([]) },
      }),
      saveInteraction: jest.fn().mockResolvedValue(undefined),
      getFormattedHistory: jest.fn().mockResolvedValue(''),
      getMessages: jest.fn().mockResolvedValue([]),
      getSessionMetadata: jest.fn().mockReturnValue({ exists: true, turnCount: 0, lastAccessed: new Date() }),
    };

    filterExtractionService = {
      extractFilters: jest.fn().mockResolvedValue({}),
      resolveDateRange: jest.fn().mockImplementation((filters) => filters),
      isEmpty: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LangChainRagChainService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: LangChainVectorStoreService,
          useValue: vectorStoreService,
        },
        {
          provide: LangChainMemoryService,
          useValue: memoryService,
        },
        {
          provide: CtxhFilterExtractionService,
          useValue: filterExtractionService,
        },
      ],
    }).compile();

    service = module.get<LangChainRagChainService>(LangChainRagChainService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should initialize chains on module init', async () => {
      await service.onModuleInit();

      expect(service.isInitialized()).toBe(true);
    });

    it('should not reinitialize if already initialized', async () => {
      await service.onModuleInit();
      await service.onModuleInit();

      // LangChainConfig.getLLM should be called only once
      const { LangChainConfig } = require('../../config/langchain.config');
      expect(LangChainConfig.getLLM).toHaveBeenCalledTimes(1);
    });
  });

  describe('initializeChains', () => {
    it('should initialize LLM and chains', async () => {
      await service.initializeChains();

      expect(service.isInitialized()).toBe(true);
    });

    it('should check vector store initialization', async () => {
      vectorStoreService.isInitialized.mockReturnValue(false);

      await service.initializeChains();

      expect(vectorStoreService.initialize).toHaveBeenCalled();
    });
  });

  describe('invoke', () => {
    beforeEach(async () => {
      await service.initializeChains();
    });

    it('should invoke RAG chain with question', async () => {
      const question = 'What are the CTXH activities?';

      const result = await service.invoke(question);

      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
      expect(result.sources).toBeDefined();
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should invoke with session ID and save interaction', async () => {
      const sessionId = 'test-session';
      const question = 'Test question';

      const result = await service.invoke(question, sessionId);

      expect(result.sessionId).toBe(sessionId);
      expect(memoryService.saveInteraction).toHaveBeenCalledWith(
        sessionId,
        question,
        expect.any(String)
      );
    });

    it('should include chat history when session exists', async () => {
      const sessionId = 'session-with-history';
      const question = 'Tell me more';
      
      (memoryService.getFormattedHistory as jest.Mock).mockResolvedValue(
        'Sinh viên: Hello\nTrợ lý: Hi there!'
      );

      await service.invoke(question, sessionId);

      expect(memoryService.getFormattedHistory).toHaveBeenCalledWith(sessionId);
    });

    it('should skip history when includeHistory is false', async () => {
      const sessionId = 'session-no-history';
      const question = 'Test';

      await service.invoke(question, sessionId, { includeHistory: false });

      expect(memoryService.getFormattedHistory).not.toHaveBeenCalled();
    });

    it('should use MMR search when useMMR option is true', async () => {
      const question = 'Test MMR';

      await service.invoke(question, undefined, { useMMR: true });

      expect(vectorStoreService.maxMarginalRelevanceSearch).toHaveBeenCalled();
    });

    it('should use similarity search by default', async () => {
      const question = 'Test similarity';

      await service.invoke(question);

      expect(vectorStoreService.similaritySearchWithDateFilter).toHaveBeenCalled();
    });

    it('should return sources from search', async () => {
      const mockSources = [
        createMockDocument('Source 1'),
        createMockDocument('Source 2'),
      ];
      vectorStoreService.similaritySearchWithDateFilter.mockResolvedValue(mockSources);

      const result = await service.invoke('Test');

      expect(result.sources).toEqual(mockSources);
    });

    it('should measure response time', async () => {
      const startTime = Date.now();

      const result = await service.invoke('Test');

      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.responseTime).toBeLessThan(Date.now() - startTime + 1000);
    });
  });

  describe('stream', () => {
    beforeEach(async () => {
      await service.initializeChains();
    });

    it('should stream RAG response', async () => {
      const sessionId = 'stream-session';
      const question = 'Stream test';

      const chunks: string[] = [];
      const generator = service.stream(question, sessionId);

      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should save interaction after streaming completes', async () => {
      const sessionId = 'stream-save-session';
      const question = 'Stream test';

      const generator = service.stream(question, sessionId);
      
      // Consume all chunks
      for await (const _ of generator) {
        // Consume stream
      }

      expect(memoryService.saveInteraction).toHaveBeenCalled();
    });

    it('should include history when streaming with session', async () => {
      const sessionId = 'stream-history';
      const question = 'Test';
      
      (memoryService.getFormattedHistory as jest.Mock).mockResolvedValue('Previous history');

      const generator = service.stream(question, sessionId);
      for await (const _ of generator) {
        // Consume stream
      }

      expect(memoryService.getFormattedHistory).toHaveBeenCalledWith(sessionId);
    });
  });

  describe('getRetriever', () => {
    beforeEach(async () => {
      await service.initializeChains();
    });

    it('should return retriever from vector store', () => {
      const retriever = service.getRetriever();

      expect(retriever).toBeDefined();
      expect(vectorStoreService.getRetriever).toHaveBeenCalled();
    });

    it('should pass k parameter to vector store', () => {
      service.getRetriever(10);

      expect(vectorStoreService.getRetriever).toHaveBeenCalledWith(10);
    });
  });

  describe('isInitialized', () => {
    it('should return false before initialization', () => {
      expect(service.isInitialized()).toBe(false);
    });

    it('should return true after initialization', async () => {
      await service.initializeChains();

      expect(service.isInitialized()).toBe(true);
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await service.initializeChains();
    });

    it('should handle vector store search errors', async () => {
      vectorStoreService.similaritySearchWithDateFilter.mockRejectedValue(
        new Error('Search failed')
      );

      await expect(service.invoke('test')).rejects.toThrow('Search failed');
    });

    it('should handle memory service errors gracefully for getFormattedHistory', async () => {
      (memoryService.getFormattedHistory as jest.Mock).mockResolvedValue('');

      // Should work with empty history when getFormattedHistory returns empty
      const result = await service.invoke('test', 'session-id');
      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
    });
  });

  describe('auto-initialization', () => {
    it('should auto-initialize when invoke is called without prior init', async () => {
      expect(service.isInitialized()).toBe(false);

      await service.invoke('Test');

      expect(service.isInitialized()).toBe(true);
    });

    it('should auto-initialize when stream is called without prior init', async () => {
      expect(service.isInitialized()).toBe(false);

      const generator = service.stream('Test');
      for await (const _ of generator) {
        // Consume stream
      }

      expect(service.isInitialized()).toBe(true);
    });
  });
});
