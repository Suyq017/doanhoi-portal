import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { GoogleGenAI } from '@google/genai';

import { GoogleGenAIEmbeddings } from '../google-genai-embeddings';

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      embedContent: jest.fn(),
    },
  })),
}));

describe('GoogleGenAIEmbeddings', () => {
  let consoleLogSpy: any;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  it('should require an API key', () => {
    expect(() => new GoogleGenAIEmbeddings({ apiKey: '' })).toThrow('GEMINI_API_KEY is required');
  });

  it('should embed a query with the configured model and dimensionality', async () => {
    const embeddings = new GoogleGenAIEmbeddings({
      apiKey: 'test-api-key',
      model: 'text-embedding-004',
      outputDimensionality: 768,
    });

    const googleClient = (GoogleGenAI as unknown as jest.Mock).mock.results[0].value as {
      models: {
        embedContent: jest.Mock;
      };
    };

    (googleClient.models.embedContent as any).mockResolvedValue({
      embeddings: [{ values: [0.1, 0.2, 0.3] }],
    });

    await expect(embeddings.embedQuery('xin chào')).resolves.toEqual([0.1, 0.2, 0.3]);
    expect(googleClient.models.embedContent).toHaveBeenCalledWith({
      model: 'text-embedding-004',
      contents: 'xin chào',
      config: {
        outputDimensionality: 768,
      },
    });
  });

  it('should reject empty embedding responses', async () => {
    const embeddings = new GoogleGenAIEmbeddings({
      apiKey: 'test-api-key',
      model: 'text-embedding-004',
      outputDimensionality: 768,
    });

    const googleClient = (GoogleGenAI as unknown as jest.Mock).mock.results[0].value as {
      models: {
        embedContent: jest.Mock;
      };
    };

    (googleClient.models.embedContent as any).mockResolvedValue({ embeddings: [] });

    await expect(embeddings.embedQuery('fallback')).rejects.toThrow(
      'Failed to generate embedding: No embeddings returned from API',
    );
  });

  it('should embed multiple documents sequentially', async () => {
    const embeddings = new GoogleGenAIEmbeddings({
      apiKey: 'test-api-key',
      model: 'text-embedding-004',
      outputDimensionality: 256,
    });

    const googleClient = (GoogleGenAI as unknown as jest.Mock).mock.results[0].value as {
      models: {
        embedContent: jest.Mock;
      };
    };

    (googleClient.models.embedContent as any)
      .mockResolvedValueOnce({ embeddings: [{ values: [1, 2] }] })
      .mockResolvedValueOnce({ embeddings: [{ values: [3, 4] }] });

    await expect(embeddings.embedDocuments(['alpha', 'beta'])).resolves.toEqual([
      [1, 2],
      [3, 4],
    ]);
    expect(googleClient.models.embedContent).toHaveBeenCalledTimes(2);
  });

  it('should wrap API errors', async () => {
    const embeddings = new GoogleGenAIEmbeddings({
      apiKey: 'test-api-key',
      model: 'text-embedding-004',
      outputDimensionality: 768,
    });

    const googleClient = (GoogleGenAI as unknown as jest.Mock).mock.results[0].value as {
      models: {
        embedContent: jest.Mock;
      };
    };

    (googleClient.models.embedContent as any).mockRejectedValue(new Error('network down'));

    await expect(embeddings.embedQuery('problem')).rejects.toThrow(
      'Failed to generate embedding: network down',
    );
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });
});