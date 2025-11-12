import i18n from '../../i18n';

/**
 * Error message codes from backend
 */
export const BackendErrorCodes = {
  // Template errors
  TEMPLATE_NOT_FOUND: 'TEMPLATE_NOT_FOUND',
  TEMPLATE_ONLY_DOCX: 'TEMPLATE_ONLY_DOCX',
  TEMPLATE_FILE_REQUIRED: 'TEMPLATE_FILE_REQUIRED',
  TEMPLATE_NAME_REQUIRED: 'TEMPLATE_NAME_REQUIRED',

  // Submission errors
  SUBMISSION_NOT_FOUND: 'SUBMISSION_NOT_FOUND',
  SUBMISSION_ONLY_UPDATE_DRAFT: 'SUBMISSION_ONLY_UPDATE_DRAFT',
  SUBMISSION_ALREADY_COMPLETED: 'SUBMISSION_ALREADY_COMPLETED',
  SUBMISSION_NOT_COMPLETED: 'SUBMISSION_NOT_COMPLETED',
  SUBMISSION_OUTPUT_NOT_FOUND: 'SUBMISSION_OUTPUT_NOT_FOUND',
} as const;

/**
 * Map backend error codes to translation keys
 */
const errorCodeToTranslationKey: Record<string, string> = {
  // Template errors
  TEMPLATE_NOT_FOUND: 'templates:errors.templateNotFound',
  TEMPLATE_ONLY_DOCX: 'templates:upload.onlyDocx',
  TEMPLATE_FILE_REQUIRED: 'templates:upload.selectFile',
  TEMPLATE_NAME_REQUIRED: 'templates:upload.enterName',
  TEMPLATE_HAS_SUBMISSIONS: 'templates:errors.templateHasSubmissions',

  // Submission errors
  SUBMISSION_NOT_FOUND: 'templates:errors.submissionNotFound',
  SUBMISSION_ONLY_UPDATE_DRAFT: 'templates:errors.onlyUpdateDraft',
  SUBMISSION_ALREADY_COMPLETED: 'templates:errors.alreadyCompleted',
  SUBMISSION_NOT_COMPLETED: 'templates:errors.notCompleted',
  SUBMISSION_OUTPUT_NOT_FOUND: 'templates:errors.outputNotFound',

  // Success messages
  TEMPLATE_DELETED: 'templates:messages.deleteSuccess',
  TEMPLATE_UPLOADED: 'templates:messages.uploadSuccess',
  TEMPLATE_UPDATED: 'templates:messages.configSaved',
  SUBMISSION_CREATED: 'templates:messages.submitSuccess',
  SUBMISSION_UPDATED: 'templates:messages.editSuccess',
  SUBMISSION_DELETED: 'templates:messages.deleteSuccess',
};

/**
 * Translate backend error message to localized string
 * @param errorMessage - Error message from backend (could be error code or message)
 * @returns Translated error message
 */
export function translateError(errorMessage: string): string {
  // Check if the error message is a known error code
  if (errorCodeToTranslationKey[errorMessage]) {
    return i18n.t(errorCodeToTranslationKey[errorMessage]);
  }

  // If not a known error code, return the original message
  return errorMessage;
}

/**
 * Extract and translate error from Axios error response
 * @param error - Axios error object
 * @param fallbackKey - Fallback translation key if error cannot be extracted
 * @returns Translated error message
 */
export function translateApiError(error: any, fallbackKey?: string): string {
  // Try to extract error message from various possible locations
  const errorMessage =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    (fallbackKey ? i18n.t(fallbackKey) : i18n.t('common:messages.error.unknown'));

  return translateError(errorMessage);
}
