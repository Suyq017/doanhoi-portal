import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOllama } from '@langchain/ollama';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';

/**
 * Universal LLM Service
 * Supports seamless switching between Ollama (local) and Gemini (cloud) LLMs
 * Toggle via USE_LOCAL_MODEL environment variable
 */
@Injectable()
export class UniversalLLMService implements OnModuleInit {
  private readonly logger = new Logger(UniversalLLMService.name);
  private llm: BaseChatModel;
  private readonly useLocalModel: boolean;
  private modelName: string;

  constructor(private readonly configService: ConfigService) {
    this.useLocalModel =
      this.configService.get('USE_LOCAL_MODEL') === 'true';
  }

  async onModuleInit(): Promise<void> {
    await this.initializeLLM();
  }

  /**
   * Initialize LLM based on configuration
   */
  private async initializeLLM(): Promise<void> {
    if (this.useLocalModel) {
      await this.initializeOllamaLLM();
    } else {
      await this.initializeGeminiLLM();
    }
  }

  /**
   * Initialize Ollama Qwen2.5:7b LLM (local)
   */
  private async initializeOllamaLLM(): Promise<void> {
    const baseUrl = this.configService.get(
      'OLLAMA_BASE_URL',
    );
    this.modelName = this.configService.get('OLLAMA_LLM_MODEL');
    const numCtx = parseInt(
      this.configService.get('OLLAMA_NUM_CTX'),
      10,
    );
    const temperature = parseFloat(
      this.configService.get('RAG_TEMPERATURE'),
    );

    this.llm = new ChatOllama({
      baseUrl,
      model: this.modelName,
      temperature,
      numCtx,
    }) as unknown as BaseChatModel;

    this.logger.log(
      `✅ Using LOCAL Ollama LLM: ${this.modelName} at ${baseUrl}`,
    );
  }

  /**
   * Initialize Gemini LLM (cloud)
   */
  private async initializeGeminiLLM(): Promise<void> {
    const apiKey = this.configService.get('GEMINI_API_KEY');
    this.modelName = this.configService.get('GEMINI_MODEL');
    const temperature = parseFloat(
      this.configService.get('RAG_TEMPERATURE'),
    );
    const maxOutputTokens = parseInt(
      this.configService.get('RAG_MAX_OUTPUT_TOKENS'),
      10,
    );

    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY is required when USE_LOCAL_MODEL is false',
      );
    }

    this.llm = new ChatGoogleGenerativeAI({
      apiKey,
      model: this.modelName,
      temperature,
      maxOutputTokens,
    });

    this.logger.log(`✅ Using GEMINI LLM: ${this.modelName}`);
  }

  /**
   * Get the LLM instance
   */
  getLLM(): BaseChatModel {
    return this.llm;
  }

  /**
   * Get the model name
   */
  getModelName(): string {
    return this.modelName;
  }

  /**
   * Check if using local model (Ollama)
   */
  isUsingLocalModel(): boolean {
    return this.useLocalModel;
  }

  /**
   * Health check for LLM service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.llm.invoke('Say "OK" if you are working.');
      const isValid = response && response.content;
      
      if (isValid) {
        this.logger.log('LLM health check passed');
      }
      
      return !!isValid;
    } catch (error) {
      this.logger.error('LLM health check failed', error);
      return false;
    }
  }
}
