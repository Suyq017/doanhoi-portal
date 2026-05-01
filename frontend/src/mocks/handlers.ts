import { rest } from 'msw';
import { sampleReport, sampleActivity, sampleParticipants, sampleSummary, sampleClasses, sampleClass, sampleDepartments, sampleDepartment, sampleTemplates, sampleTemplate, sampleSystemConfig } from './fixtures';

// Sample payment campaign data
const samplePaymentCampaign = {
  id: 'campaign-1',
  name: 'Bộ nạp quỹ 2024',
  description: 'Bộ nạp quỹ sinh hoạt lớp 2024',
  organizationId: 'org-1',
  status: 'ACTIVE',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const sampleOrganization = {
  id: 'org-1',
  name: 'Đoàn HCMUT',
  code: 'DOAN_HCMUT',
  type: 'system',
  status: 'ACTIVE',
};

export const handlers = [
  // ---------- Student Reports ----------
  rest.get('/api/ctxh/reports/student/:studentCode', (_req, res, ctx) => {
    const { studentCode } = _req.params as { studentCode: string };
    if (studentCode === 'TEST123') return res(ctx.status(200), ctx.json(sampleReport));
    return res(ctx.status(404), ctx.json({ message: 'Not found' }));
  }),

  rest.get('/api/ctxh/reports/student/:studentCode/summary', (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json(sampleSummary));
  }),

  // Absolute backend origin (some services call full URLs)
  rest.get('http://localhost:9200/ctxh/reports/student/:studentCode', (_req, res, ctx) => {
    const { studentCode } = _req.params as { studentCode: string };
    if (studentCode === 'TEST123') return res(ctx.status(200), ctx.json(sampleReport));
    return res(ctx.status(404), ctx.json({ message: 'Not found' }));
  }),

  // ---------- Activities / Registration ----------
  // List activities (paginated stub)
  rest.get('/api/ctxh/activities', (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ data: [sampleActivity], total: 1, page: 1, limit: 10 }));
  }),

  rest.get('/api/ctxh/activities/:id', (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json(sampleActivity));
  }),

  // Participant list
  rest.get('/api/ctxh/activities/:id/participants', (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json(sampleParticipants));
  }),

  // Student self registration
  rest.post('/api/ctxh/activities/:id/register', (_req, res, ctx) => {
    const participation = { id: 'p-123', student_code: 'TEST123', status: 'PENDING' };
    return res(ctx.status(201), ctx.json(participation));
  }),

  rest.delete('/api/ctxh/activities/:id/register', (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ message: 'cancelled' }));
  }),

  // Add single student (manager flow)
  rest.post('/api/ctxh/activities/:id/participants', (_req, res, ctx) => {
    return res(ctx.status(201), ctx.json({ id: 'p-124', student_code: 'S001', status: 'REGISTERED' }));
  }),

  // Also accept absolute backend URLs for activities
  rest.get('http://localhost:9200/ctxh/activities', (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ data: [sampleActivity], total: 1, page: 1, limit: 10 }));
  }),

  rest.post('http://localhost:9200/ctxh/activities/:id/register', (_req, res, ctx) => {
    const participation = { id: 'p-123', student_code: 'TEST123', status: 'PENDING' };
    return res(ctx.status(201), ctx.json(participation));
  }),

  // ---------- Import / Batch endpoints ----------
  rest.post('/api/ctxh/activities/:id/participants/excel', (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ valid: true, imported: 10 }));
  }),

  rest.post('/api/ctxh/activities/:id/participants/batch', (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ total: 3, successful: 3 }));
  }),

  // ---------- Payment Campaigns ----------
  rest.get('/api/payments/campaigns', (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ 
      data: [samplePaymentCampaign], 
      total: 1, 
      page: 1, 
      limit: 10 
    }));
  }),

  rest.get('/api/payments/campaigns/:id', (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json(samplePaymentCampaign));
  }),

  rest.post('/api/payments/campaigns', (_req, res, ctx) => {
    return res(ctx.status(201), ctx.json(samplePaymentCampaign));
  }),

  rest.get('/api/payment-campaigns/accessible-organizations', (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json([sampleOrganization]));
  }),

  rest.get('http://localhost:9200/api/payment-campaigns/accessible-organizations', (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json([sampleOrganization]));
  }),

  rest.put('/api/payments/campaigns/:id', (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ ...samplePaymentCampaign, updatedAt: new Date().toISOString() }));
  }),

  rest.delete('/api/payments/campaigns/:id', (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ message: 'Deleted' }));
  }),

  // ---------- Organizations ----------
  rest.get('/api/organizations', (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ 
      data: [sampleOrganization], 
      total: 1, 
      page: 1, 
      limit: 10 
    }));
  }),

  rest.get('/api/organizations/:id', (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json(sampleOrganization));
  }),

  // ---------- Classes ----------
  rest.get('/api/classes', (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json({
      classes: sampleClasses,
      total: sampleClasses.length,
    }));
  }),

  rest.get('/api/classes/:id', (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json(sampleClass));
  }),

  rest.post('/api/classes', (_req, res, ctx) => {
    return res(ctx.status(201), ctx.json(sampleClass));
  }),

  rest.patch('/api/classes/:id', (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ ...sampleClass, updatedAt: new Date().toISOString() }));
  }),

  rest.delete('/api/classes/:id', (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ message: 'Deleted' }));
  }),

  // ---------- Departments ----------
  rest.get('/api/departments', (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json({
      departments: sampleDepartments,
      total: sampleDepartments.length,
    }));
  }),

  rest.get('/api/departments/:id', (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json(sampleDepartment));
  }),

  rest.post('/api/departments', (_req, res, ctx) => {
    return res(ctx.status(201), ctx.json(sampleDepartment));
  }),

  rest.patch('/api/departments/:id', (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ ...sampleDepartment, updatedAt: new Date().toISOString() }));
  }),

  rest.delete('/api/departments/:id', (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ message: 'Deleted' }));
  }),

  // ---------- Templates ----------
  rest.get('/api/templates', (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json({
      templates: sampleTemplates,
      total: sampleTemplates.length,
    }));
  }),

  rest.get('/api/templates/:id', (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json(sampleTemplate));
  }),

  rest.post('/api/templates', (_req, res, ctx) => {
    return res(ctx.status(201), ctx.json(sampleTemplate));
  }),

  rest.patch('/api/templates/:id', (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ ...sampleTemplate, updatedAt: new Date().toISOString() }));
  }),

  rest.delete('/api/templates/:id', (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ message: 'Deleted' }));
  }),

  // ---------- System Config ----------
  rest.get('/api/system-config/aws-s3', (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json(sampleSystemConfig));
  }),

  rest.post('/api/system-config/aws-s3', (_req, res, ctx) => {
    return res(ctx.status(201), ctx.json(sampleSystemConfig));
  }),

  rest.patch('/api/system-config/aws-s3/:id', (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ ...sampleSystemConfig, updatedAt: new Date().toISOString() }));
  }),

  rest.delete('/api/system-config/aws-s3/:id', (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ message: 'Deleted' }));
  }),

  // ---------- Fallback / health ----------
  rest.get('/api/health', (_req, res, ctx) => res(ctx.status(200), ctx.json({ status: 'ok' }))),
];
