import { describe, expect, it } from '@jest/globals';

describe('All CTXH prompt modules', () => {
  it('should import prompt templates and constants', () => {
    const ctxhAgent = require('../ctxh-agent.prompt');
    const ctxhChat = require('../ctxh-chat.prompts');
    const filterExtraction = require('../filter-extraction.prompt');
    const followUp = require('../follow-up-suggestions.prompt');
    const retrievalVerifier = require('../retrieval-verifier.prompt');
    const routerAgent = require('../router-agent.prompt');
    const staffAgent = require('../staff-agent.prompt');
    const toolSelector = require('../tool-selector.prompt');
    const index = require('../index');

    expect(ctxhAgent.CTXH_AGENT_PROMPT).toBeDefined();
    expect(ctxhChat.CTXH_RAG_PROMPT).toBeDefined();
    expect(filterExtraction.FILTER_EXTRACTION_PROMPT).toBeDefined();
    expect(followUp.FOLLOW_UP_SUGGESTIONS_PROMPT).toBeDefined();
    expect(retrievalVerifier.RETRIEVAL_VERIFIER_PROMPT).toBeDefined();
    expect(routerAgent.ROUTER_AGENT_PROMPT).toBeDefined();
    expect(typeof staffAgent.STAFF_AGENT_SYSTEM_PROMPT).toBe('function');
    expect(toolSelector.TOOL_SELECTOR_PROMPT).toBeDefined();
    expect(index).toBeDefined();
  });

  it('should build staff prompt without cached activities', () => {
    const staffAgent = require('../staff-agent.prompt');

    const content = staffAgent.STAFF_AGENT_SYSTEM_PROMPT('2026-04-30');

    expect(typeof content).toBe('string');
    expect(content).toContain('Ngày hiện tại: 2026-04-30');
    expect(content).not.toContain('HOẠT ĐỘNG CHỜ DUYỆT');
  });

  it('should build staff prompt with cached activities', () => {
    const staffAgent = require('../staff-agent.prompt');

    const content = staffAgent.STAFF_AGENT_SYSTEM_PROMPT('2026-04-30', [
      {
        activity_id: 'act-1',
        activity_name: 'CTXH Mua he xanh',
        organization_name: 'Doan Truong',
        pending_count: 12,
      },
    ]);

    expect(content).toContain('HOẠT ĐỘNG CHỜ DUYỆT');
    expect(content).toContain('act-1');
    expect(content).toContain('CTXH Mua he xanh');
  });
});
