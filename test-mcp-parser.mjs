import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

function parsePythonRepr(text) {
  if (!text || !text.trim().startsWith('[')) return [];
  let s = text.trim();
  s = s.replace(/UUID\('([^']*)'\)/g, '"$1"');
  s = s.replace(/Decimal\('([^']*)'\)/g, '$1');
  s = s.replace(/datetime\.datetime\(([^)]+)\)/g, (_, args) => {
    const parts = args.split(',').map(p => p.trim().padStart(2, '0'));
    return `"${parts[0]}-${parts[1]}-${parts[2]}T${parts[3] || '00'}:${parts[4] || '00'}:${parts[5] || '00'}"`;
  });
  s = s.replace(/datetime\.date\((\d+),\s*(\d+),\s*(\d+)\)/g, (_, y, m, d) =>
    `"${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}"`);
  s = s.replace(/\bTrue\b/g, 'true');
  s = s.replace(/\bFalse\b/g, 'false');
  s = s.replace(/\bNone\b/g, 'null');
  s = s.replace(/'((?:[^'\\]|\\.)*)'/g, (_, inner) =>
    '"' + inner.replace(/\\'/g, "'").replace(/"/g, '\\"') + '"');
  return JSON.parse(s);
}

const transport = new SSEClientTransport(new URL('http://localhost:8000/sse'));
const client = new Client({ name: 'test', version: '1.0.0' }, { capabilities: {} });
await client.connect(transport);

const today = '2026-04-22';
const result = await client.callTool({
  name: 'execute_sql',
  arguments: {
    sql: `SELECT ca.id, ca.name, ca.status, ca.start_date, ca.end_date, ca.location, ca.requires_approval, ca.max_participants FROM ctxh_activity ca LEFT JOIN organizations org ON org.id = ca.organization_id WHERE ca.deleted_at IS NULL AND ca.status IN ('ACTIVE','DRAFT') AND ca.end_date >= '${today}' ORDER BY ca.start_date ASC LIMIT 3`
  }
});

const raw = result.content[0].text;
console.log('=== RAW (first 200 chars) ===');
console.log(raw.slice(0, 200));
console.log('');

try {
  const rows = parsePythonRepr(raw);
  console.log(`=== PARSED: ${rows.length} rows ===`);
  console.log(JSON.stringify(rows[0], null, 2));
} catch (e) {
  console.error('PARSE ERROR:', e.message);
  console.log('Full raw:', raw);
}

await client.close();
