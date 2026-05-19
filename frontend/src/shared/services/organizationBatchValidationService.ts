import axios from 'axios';
import type { ValidationError, ValidationResult } from './organizationImportValidationService';

const API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL || '/api';

export interface OrganizationMemberData {
  studentCode: string;
  classOrUnitCode?: string;
}

// Re-export types for convenience
export type { ValidationError, ValidationResult };

/**
 * Service for batch validation of organization members using backend API
 * Splits large datasets into chunks and validates using optimized backend queries
 */
export class OrganizationBatchValidationService {
  private readonly VALIDATION_CHUNK_SIZE = 500; // Match backend batch size

  /**
   * Validate organization member data using backend API with chunking
   * @param data - Array of member data to validate
   * @param organizationId - Target organization ID (optional for Level 2)
   * @param level - Organization level (2 or 3)
   * @param onProgress - Progress callback
   * @returns Validation result
   */
  async validateMembers(
    data: OrganizationMemberData[],
    organizationId: string | undefined,
    level: 2 | 3,
    onProgress?: (progress: { current: number; total: number; percentage: number }) => void
  ): Promise<ValidationResult> {
    try {
      console.log(`[OrganizationValidation] Starting validation for ${data.length} members...`);

      // If data is small enough, send in one request
      if (data.length <= this.VALIDATION_CHUNK_SIZE) {
        onProgress?.({ current: 0, total: 1, percentage: 0 });

        const result = await this.validateSingleChunk(data, organizationId, level);

        onProgress?.({ current: 1, total: 1, percentage: 100 });

        return result;
      }

      // Split data into chunks
      const chunks = this.chunkArray(data, this.VALIDATION_CHUNK_SIZE);
      const totalChunks = chunks.length;
      console.log(`[OrganizationValidation] Split into ${totalChunks} chunks`);

      // Validate each chunk and merge results
      const allErrors: ValidationError[] = [];
      const allWarnings: ValidationError[] = [];
      let totalValid = 0;
      let totalInvalid = 0;
      let totalConflicts = 0;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkStartIndex = i * this.VALIDATION_CHUNK_SIZE;
        const currentBatch = i + 1;

        // Update progress
        const progressPercentage = Math.round((currentBatch / totalChunks) * 100);
        onProgress?.({
          current: currentBatch,
          total: totalChunks,
          percentage: progressPercentage
        });

        try {
          const chunkResult = await this.validateSingleChunk(chunk, organizationId, level);

          // Adjust row numbers for chunk offset
          const adjustedErrors = (chunkResult.errors || []).map(error => ({
            ...error,
            row: error.row + chunkStartIndex
          }));

          const adjustedWarnings = (chunkResult.warnings || []).map(warning => ({
            ...warning,
            row: warning.row + chunkStartIndex
          }));

          allErrors.push(...adjustedErrors);
          allWarnings.push(...adjustedWarnings);

          // Accumulate summary
          totalValid += chunkResult.summary?.valid || 0;
          totalInvalid += chunkResult.summary?.invalid || 0;
          totalConflicts += chunkResult.summary?.duplicates || 0;

          console.log(`[OrganizationValidation] Chunk ${currentBatch}/${totalChunks} completed`);
        } catch (chunkError) {
          console.error(`[OrganizationValidation] Chunk ${currentBatch} failed:`, chunkError);
          // Mark entire chunk as invalid
          totalInvalid += chunk.length;

          // Add generic errors for this chunk
          for (let j = 0; j < chunk.length; j++) {
            allErrors.push({
              row: chunkStartIndex + j + 2, // +2 for Excel row number
              field: 'general',
              value: null,
              message: `Validation failed: ${chunkError instanceof Error ? chunkError.message : 'Unknown error'}`,
              type: 'error'
            });
          }
        }
      }

      console.log(`[OrganizationValidation] Completed: ${totalValid} valid, ${totalInvalid} invalid`);

      return {
        isValid: totalValid > 0 && totalInvalid === 0,
        errors: allErrors,
        warnings: allWarnings,
        summary: {
          total: data.length,
          valid: totalValid,
          invalid: totalInvalid,
          duplicates: totalConflicts
        }
      };
    } catch (error) {
      console.error('[OrganizationValidation] Batch validation failed:', error);
      throw new Error(
        `Batch validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validate a single chunk using backend API
   * @param chunk - Data chunk to validate
   * @param organizationId - Target organization ID (optional for Level 2)
   * @param level - Organization level
   * @returns Validation result for this chunk
   */
  private async validateSingleChunk(
    chunk: OrganizationMemberData[],
    organizationId: string | undefined,
    level: 2 | 3
  ): Promise<ValidationResult> {
    try {
      // Backend response format
      interface BackendValidationError {
        row: number;
        column: string;
        message: string;
        severity: 'error' | 'warning';
      }

      interface BackendValidationResult {
        isValid: boolean;
        data: any[];
        errors: BackendValidationError[];
        warnings: BackendValidationError[];
        summary: {
          total: number;
          valid: number;
          invalid: number;
          conflicts: number;
        };
      }

      const response = await axios.post<BackendValidationResult>(
        `${API_BASE_URL}/organizations/members/validate`,
        {
          data: chunk,
          organizationId,
          level
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        }
      );

      // Convert backend format to frontend format
      const backendResult = response.data;

      // Map backend errors to frontend format
      const errors: ValidationError[] = backendResult.errors.map(err => ({
        row: err.row,
        field: err.column,
        value: null, // Backend doesn't return value
        message: err.message,
        type: err.severity as 'error' | 'warning'
      }));

      const warnings: ValidationError[] = backendResult.warnings.map(warn => ({
        row: warn.row,
        field: warn.column,
        value: null,
        message: warn.message,
        type: warn.severity as 'error' | 'warning'
      }));

      return {
        isValid: backendResult.isValid,
        errors,
        warnings,
        summary: {
          total: backendResult.summary.total,
          valid: backendResult.summary.valid,
          invalid: backendResult.summary.invalid,
          duplicates: backendResult.summary.conflicts // Map conflicts to duplicates
        }
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        throw new Error(`Validation API error: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Split array into chunks
   * @param array - Array to split
   * @param chunkSize - Size of each chunk
   * @returns Array of chunks
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

// Export singleton instance
export const organizationBatchValidationService = new OrganizationBatchValidationService();
