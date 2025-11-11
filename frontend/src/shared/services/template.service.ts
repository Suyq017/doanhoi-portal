import { apiClient } from './apiClient';
import type {
  Template,
  TemplateSubmission,
  CreateTemplateDto,
  UpdateTemplateDto,
  ConfigureFieldsDto,
  CreateSubmissionDto,
  UpdateSubmissionDto,
} from '../types/template.types';

const TEMPLATES_BASE = '/templates';
const SUBMISSIONS_BASE = '/submissions';

// ============================================
// TEMPLATE APIs
// ============================================

/**
 * Get all templates (shared for all users)
 */
export const getAllTemplates = async (status?: string): Promise<Template[]> => {
  const query = status ? `?status=${status}` : '';
  return apiClient.get<Template[]>(`${TEMPLATES_BASE}${query}`);
};

/**
 * Get template by ID
 */
export const getTemplateById = async (id: string): Promise<Template> => {
  return apiClient.get<Template>(`${TEMPLATES_BASE}/${id}`);
};

/**
 * Upload new template
 */
export const uploadTemplate = async (
  file: File,
  data: CreateTemplateDto
): Promise<Template> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', data.name);
  if (data.description) formData.append('description', data.description);
  if (data.organizationId) formData.append('organizationId', data.organizationId);

  return apiClient.uploadFile<Template>(`${TEMPLATES_BASE}/upload`, formData);
};

/**
 * Parse template file to extract fields (without saving)
 */
export const parseTemplateFile = async (file: File): Promise<{ placeholders: string[] }> => {
  const formData = new FormData();
  formData.append('file', file);

  return apiClient.uploadFile<{ placeholders: string[] }>(
    `${TEMPLATES_BASE}/parse`,
    formData
  );
};

/**
 * Update template
 */
export const updateTemplate = async (
  id: string,
  data: UpdateTemplateDto
): Promise<Template> => {
  return apiClient.put<Template>(`${TEMPLATES_BASE}/${id}`, data);
};

/**
 * Configure fields for template
 */
export const configureFields = async (
  id: string,
  data: ConfigureFieldsDto
): Promise<Template> => {
  return apiClient.put<Template>(
    `${TEMPLATES_BASE}/${id}/configure-fields`,
    data
  );
};

/**
 * Delete template
 */
export const deleteTemplate = async (id: string): Promise<void> => {
  await apiClient.delete(`${TEMPLATES_BASE}/${id}`);
};

// ============================================
// SUBMISSION APIs
// ============================================

/**
 * Create new submission (draft)
 */
export const createSubmission = async (
  data: CreateSubmissionDto
): Promise<TemplateSubmission> => {
  return apiClient.post<TemplateSubmission>(SUBMISSIONS_BASE, data);
};

/**
 * Update submission (save draft)
 */
export const updateSubmission = async (
  id: string,
  data: UpdateSubmissionDto
): Promise<TemplateSubmission> => {
  return apiClient.put<TemplateSubmission>(`${SUBMISSIONS_BASE}/${id}`, data);
};

/**
 * Submit and generate document
 */
export const submitSubmission = async (id: string): Promise<TemplateSubmission> => {
  return apiClient.post<TemplateSubmission>(`${SUBMISSIONS_BASE}/${id}/submit`);
};

/**
 * Get submission by ID
 */
export const getSubmissionById = async (id: string): Promise<TemplateSubmission> => {
  return apiClient.get<TemplateSubmission>(`${SUBMISSIONS_BASE}/${id}`);
};

/**
 * Get current user's submissions
 */
export const getMySubmissions = async (
  templateId?: string
): Promise<TemplateSubmission[]> => {
  const query = templateId ? `?templateId=${templateId}` : '';
  return apiClient.get<TemplateSubmission[]>(`${SUBMISSIONS_BASE}/my-submissions${query}`);
};

/**
 * Get all submissions (admin)
 */
export const getAllSubmissions = async (
  templateId?: string
): Promise<TemplateSubmission[]> => {
  const query = templateId ? `?templateId=${templateId}` : '';
  return apiClient.get<TemplateSubmission[]>(`${SUBMISSIONS_BASE}/all${query}`);
};

/**
 * Download submission file
 */
export const downloadSubmissionFile = async (id: string): Promise<Blob> => {
  return apiClient.downloadBlob(`${SUBMISSIONS_BASE}/${id}/download`);
};

/**
 * Delete submission (draft only)
 */
export const deleteSubmission = async (id: string): Promise<void> => {
  await apiClient.delete(`${SUBMISSIONS_BASE}/${id}`);
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Download file helper
 */
export const downloadFile = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
