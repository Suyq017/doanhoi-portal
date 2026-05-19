import { Embeddings } from '@langchain/core/embeddings';
import { GoogleGenAI } from '@google/genai';

/**
 * Custom Embeddings wrapper using @google/genai library
 * Compatible with LangChain Embeddings interface for use with PGVectorStore
 */
export class GoogleGenAIEmbeddings extends Embeddings {
  private ai: GoogleGenAI;
  private model: string;
  private outputDimensionality: number;

  constructor(options: {
    apiKey: string;
    model?: string;
    outputDimensionality?: number;
  }) {
    super({});
    
    if (!options.apiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }

    this.ai = new GoogleGenAI({ apiKey: options.apiKey });
    this.model = options.model;
    this.outputDimensionality = options.outputDimensionality;
  }

  /**
   * Embed a single query string
   */
  async embedQuery(text: string): Promise<number[]> {
    try {
      console.log(`🔧 Requesting embedding with dimension: ${this.outputDimensionality}`);
      
      const response = await this.ai.models.embedContent({
        model: this.model,
        contents: text,
        config: {
          outputDimensionality: this.outputDimensionality,
        },
      });

      if (!response.embeddings || response.embeddings.length === 0) {
        throw new Error('No embeddings returned from API');
      }

      const embedding = response.embeddings[0].values;
      if (!embedding || embedding.length === 0) {
        throw new Error('Empty embedding values returned');
      }

      console.log(`✅ Received embedding dimension: ${embedding.length}`);
      return embedding;
    } catch (error) {
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  /**
   * Embed multiple documents
   */
  async embedDocuments(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    
    // Process in batches to avoid rate limiting
    for (const text of texts) {
      const embedding = await this.embedQuery(text);
      embeddings.push(embedding);
    }

    return embeddings;
  }
}
