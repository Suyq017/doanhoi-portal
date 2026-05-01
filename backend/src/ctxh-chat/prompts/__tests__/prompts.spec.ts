import { describe, it, expect } from '@jest/globals';

describe('CTXH Chat Prompts', () => {
  it('should import all prompt modules without errors', () => {
    // Verify prompts can be imported and contain expected exports
    const filterExtractionPrompt = require('../filter-extraction.prompt');
    expect(filterExtractionPrompt).toBeDefined();
    expect(filterExtractionPrompt.FILTER_EXTRACTION_PROMPT).toBeDefined();
  });

  it('should have filter extraction prompt object', () => {
    const filterExtractionPrompt = require('../filter-extraction.prompt');
    const prompt = filterExtractionPrompt.FILTER_EXTRACTION_PROMPT;
    
    expect(prompt).toBeDefined();
    expect(typeof prompt).toBe('object');
  });

  it('should export ChatPromptTemplate instances', () => {
    const filterExtractionPrompt = require('../filter-extraction.prompt');
    const prompt = filterExtractionPrompt.FILTER_EXTRACTION_PROMPT;
    
    // Verify it's a ChatPromptTemplate instance (has expected methods)
    expect(prompt).toBeDefined();
    expect(typeof prompt.format === 'function' || typeof prompt.invoke === 'function').toBe(true);
  });
});
