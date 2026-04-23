import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { LangChainConfig } from '../config/langchain.config';

/**
 * Universal LLM Service
 * Supports seamless switching between Ollama (local) and Gemini (cloud) LLMs
 * Toggle via USE_LOCAL_MODEL_LLM environment variable
 * LLM creation is delegated to LangChainConfig — configure the chatbot there.
 */
@Injectable()
export class UniversalLLMService implements OnModuleInit {
  private readonly logger = new Logger(UniversalLLMService.name);
  private llm: BaseChatModel;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    this.llm = LangChainConfig.getLLM(this.configService);
    const modelName = LangChainConfig.getModelName(this.configService);
    const modelType = LangChainConfig.isUsingLocalLLM(this.configService)
      ? `LOCAL Ollama: ${modelName}`
      : `CLOUD: ${modelName}`;
    this.logger.log(`✅ Using ${modelType}`);
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
    return LangChainConfig.getModelName(this.configService);
  }

  /**
   * Check if using local model (Ollama)
   */
  isUsingLocalModel(): boolean {
    return LangChainConfig.isUsingLocalLLM(this.configService);
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
