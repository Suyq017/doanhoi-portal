import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Plus, Upload, Download, Search, Edit2, FileSpreadsheet, X, ChevronDown, Check, XCircle } from 'lucide-react';
import { CtxhActivity, ParticipationResponse } from '../types';
import { activityService } from '../services';
import { userService } from '../../../shared/services/userService';
import { authService } from '../../auth/services/authService';
import { useToast } from '../../../shared/hooks';
import { Toast, ConfirmDialog, Pagination } from '../../../shared/components';
import { ImportModalConfig } from '../../../shared/types/import';
import SimpleImportModal from './SimpleImportModal';
import { excelParserService, importValidationService, batchImportService } from '../services';
import { useCtxhPermissions } from '../hooks';

interface ParticipantManagementProps {
  activity: CtxhActivity;
  participants: ParticipationResponse[];
  onRefresh?: () => void;
}

const ParticipantManagement: React.FC<ParticipantManagementProps> = ({
  activity,
  participants: initialParticipants,
  onRefresh
}) => {
  const { t } = useTranslation(['ctxh', 'common']);
  const ctxhPermissions = useCtxhPermissions();
  const [participants, setParticipants] = useState<ParticipationResponse[]>(initialParticipants);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudentCode, setNewStudentCode] = useState('');
  const [addingStudent, setAddingStudent] = useState(false);
  const [studentInfo, setStudentInfo] = useState<{ name?: string, email?: string, alreadyParticipating?: boolean }>({});
  const [lookingUpStudent, setLookingUpStudent] = useState(false);
  const [participantsStudentInfo, setParticipantsStudentInfo] = useState<Record<string, { name?: string, email?: string }>>({});
  const [pendingParticipants, setPendingParticipants] = useState<ParticipationResponse[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [registeringSelf, setRegisteringSelf] = useState(false);
  const [cancellingSelf, setCancellingSelf] = useState(false);
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());
  const [selectedPendingIds, setSelectedPendingIds] = useState<Set<string>>(new Set());

  // Grading states
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [gradingParticipant, setGradingParticipant] = useState<ParticipationResponse | null>(null);
  const [gradingData, setGradingData] = useState({ actualDays: '', note: '' });
  const [gradingLoading, setGradingLoading] = useState(false);
  const [showBulkGradingModal, setShowBulkGradingModal] = useState(false);
  const [bulkGradingFile, setBulkGradingFile] = useState<File | null>(null);
  const [bulkGradingLoading, setBulkGradingLoading] = useState(false);

  // Dropdown states
  const [showAddStudentDropdown, setShowAddStudentDropdown] = useState(false);

  // ImportModal states
  const [showStudentImportModal, setShowStudentImportModal] = useState(false);
  const [showGradingImportModal, setShowGradingImportModal] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Tab state
  const [activeTab, setActiveTab] = useState<'approved' | 'pending'>('approved');

  // Toast notifications
  const { toasts, hideToast, showSuccess, showError, showConfirm, confirmDialog } = useToast();
  const currentUser = authService.getUser();

  // Permission check - early
  const canManageParticipants = ctxhPermissions.activities.manage_participants;
  const requiresApproval = Boolean(activity.requiresApproval ?? (activity as any).requires_approval);

  // Format number to remove unnecessary decimal places
  const formatNumber = (num: number): string => {
    return num % 1 === 0 ? Math.floor(num).toString() : num.toString();
  };

  // Template URLs with authentication
  const [studentTemplateUrl, setStudentTemplateUrl] = useState<string>('');
  const [gradingTemplateUrl, setGradingTemplateUrl] = useState<string>('');

  // Function to generate fresh grading template URL
  const generateGradingTemplateUrl = async (): Promise<string> => {
    try {
      const token = authService.getAccessToken();
      const response = await fetch(`/api/ctxh/activities/${activity.id}/participants/grading-template`, {
        method: 'GET',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        return window.URL.createObjectURL(blob);
      }
    } catch (error) {
      console.error('Failed to generate grading template URL:', error);
    }
    return '';
  };

  // Generate authenticated template URLs
  useEffect(() => {
    const generateTemplateUrls = async () => {
      try {
        const token = authService.getAccessToken();

        // Generate student template URL (this is static and doesn't change)
        const studentResponse = await fetch('/api/ctxh/activities/participants/template', {
          method: 'GET',
          headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        });

        if (studentResponse.ok) {
          const studentBlob = await studentResponse.blob();
          const studentUrl = window.URL.createObjectURL(studentBlob);
          setStudentTemplateUrl(studentUrl);
        }

        // Generate initial grading template URL
        const gradingUrl = await generateGradingTemplateUrl();
        setGradingTemplateUrl(gradingUrl);
      } catch (error) {
        console.error('Failed to generate template URLs:', error);
      }
    };

    generateTemplateUrls();

    // Cleanup blob URLs on unmount
    return () => {
      if (studentTemplateUrl) {
        window.URL.revokeObjectURL(studentTemplateUrl);
      }
      if (gradingTemplateUrl) {
        window.URL.revokeObjectURL(gradingTemplateUrl);
      }
    };
  }, [activity.id]);

  // Refresh grading template URL after participants change
  const refreshGradingTemplate = async () => {
    if (gradingTemplateUrl) {
      window.URL.revokeObjectURL(gradingTemplateUrl);
    }
    const newUrl = await generateGradingTemplateUrl();
    setGradingTemplateUrl(newUrl);
  };

  // ImportModal configurations - NEW: Using client-side processing
  const getStudentImportConfig = (): ImportModalConfig => ({
    entityName: 'participants',
    // Use blob URL with authentication
    templateUrl: studentTemplateUrl,
    templateFileName: 'participants_template.xlsx',
    acceptedFileTypes: ['.xlsx', '.xls'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    useClientSideProcessing: true,
    batchSize: 50, // Smaller batch size for CTXH

    columns: [
      { key: 'studentCode', label: t('participant.studentCodeLabel'), required: true, type: 'text', width: '150px' },
      { key: 'name', label: t('common:fields.name'), required: false, type: 'text', width: '200px' },
      { key: 'email', label: t('common:fields.email'), required: false, type: 'email', width: '200px' }
    ],

    // Client-side file parsing
    parseFile: async (file: File, onProgress?: (progress: number) => void) => {
      try {
        const parseResult = await excelParserService.parseParticipantFile(file, onProgress);

        if (parseResult.errors.length > 0) {
          console.warn('Parse errors:', parseResult.errors);
        }

        return parseResult.data;
      } catch (error) {
        console.error('Parse error:', error);
        throw new Error(error instanceof Error ? error.message : 'Lỗi khi đọc file Excel');
      }
    },

    // Client-side validation
    validateClientData: async (data: any[]) => {
      try {
        const validationResult = await importValidationService.validateParticipantData(
          data,
          participants // Pass existing participants to check for duplicates
        );

        const localizeParticipantImportMessage = (message: string): string => {
          if (!message) return message;

          const duplicateMatchVi = message.match(/^Mã số sinh viên\s+(.+?)\s+bị trùng lặp trong file import$/i);
          if (duplicateMatchVi) {
            return t('participant.importErrors.duplicateInFile', { studentCode: duplicateMatchVi[1] });
          }

          const duplicateMatchEn = message.match(/^Student code\s+(.+?)\s+is duplicated in import file$/i);
          if (duplicateMatchEn) {
            return t('participant.importErrors.duplicateInFile', { studentCode: duplicateMatchEn[1] });
          }

          const alreadyMatchVi = message.match(/^Sinh viên\s+(.+?)\s+đã tham gia hoạt động này$/i)
            || message.match(/^Sinh viên\s+(.+?)\s+đã tham gia hoạt động$/i);
          if (alreadyMatchVi) {
            return t('participant.importErrors.alreadyParticipating', { studentCode: alreadyMatchVi[1] });
          }

          const alreadyMatchEn = message.match(/^Student\s+(.+?)\s+has already participated in this activity$/i)
            || message.match(/^Student\s+(.+?)\s+already joined this activity$/i);
          if (alreadyMatchEn) {
            return t('participant.importErrors.alreadyParticipating', { studentCode: alreadyMatchEn[1] });
          }

          const notFoundMatchVi = message.match(/^Không tìm thấy sinh viên với mã số\s+(.+)$/i);
          if (notFoundMatchVi) {
            return t('participant.importErrors.studentNotFoundByCode', { studentCode: notFoundMatchVi[1] });
          }

          const notFoundMatchEn = message.match(/^Student not found with code:?\s+(.+)$/i);
          if (notFoundMatchEn) {
            return t('participant.importErrors.studentNotFoundByCode', { studentCode: notFoundMatchEn[1] });
          }

          const lookupErrorVi = message.match(/^Lỗi khi tra cứu thông tin sinh viên\s+(.+)$/i);
          if (lookupErrorVi) {
            return t('participant.importErrors.lookupFailedByCode', { studentCode: lookupErrorVi[1] });
          }

          const lookupErrorEn = message.match(/^Error while looking up student information\s+(.+)$/i);
          if (lookupErrorEn) {
            return t('participant.importErrors.lookupFailedByCode', { studentCode: lookupErrorEn[1] });
          }

          const invalidEmailVi = message.match(/^Định dạng email không hợp lệ:\s+(.+)$/i);
          if (invalidEmailVi) {
            return t('participant.importErrors.invalidEmailFormat', { email: invalidEmailVi[1] });
          }

          const invalidEmailEn = message.match(/^Invalid email format:\s+(.+)$/i);
          if (invalidEmailEn) {
            return t('participant.importErrors.invalidEmailFormat', { email: invalidEmailEn[1] });
          }

          return message;
        };

        const normalizedValidationResult = {
          ...validationResult,
          errors: (validationResult.errors || []).map((error: any) => ({
            ...error,
            message: localizeParticipantImportMessage(error.message),
          })),
          warnings: (validationResult.warnings || []).map((warning: any) => ({
            ...warning,
            message: localizeParticipantImportMessage(warning.message),
          })),
          data: (validationResult.data || []).map((item: any) => ({
            ...item,
            _errorMessage: item._errorMessage ? localizeParticipantImportMessage(item._errorMessage) : item._errorMessage,
          })),
        };

        // Enforce max participants at preview step so import cannot proceed when exceeding capacity.
        if (activity.maxParticipants !== null && activity.maxParticipants !== undefined) {
          const remainingSlots = activity.maxParticipants - approvedParticipantsCount;
          const validCount = normalizedValidationResult.validData.length;

          if (remainingSlots <= 0 || validCount > remainingSlots) {
            const capacityMessage = remainingSlots <= 0
              ? t('participant.registerDisabledCapacity')
              : t('participant.registerDisabledCapacityWithRemaining', { remaining: remainingSlots });

            const dataWithCapacityError = normalizedValidationResult.data.map((item: any) => {
              if (item._hasError) {
                return item;
              }
              return {
                ...item,
                _hasError: true,
                _errorMessage: capacityMessage,
              };
            });

            return batchImportService.createValidationResult(dataWithCapacityError as any[], {
              ...normalizedValidationResult,
              data: dataWithCapacityError,
              validData: [],
              invalidData: dataWithCapacityError,
              errors: [
                ...(normalizedValidationResult.errors || []),
                {
                  row: 1,
                  field: 'studentCode',
                  value: null,
                  message: capacityMessage,
                  type: 'conflict',
                },
              ],
              summary: {
                ...normalizedValidationResult.summary,
                valid: 0,
                invalid: dataWithCapacityError.length,
              },
            });
          }
        }

        return batchImportService.createValidationResult(normalizedValidationResult.data, normalizedValidationResult);
      } catch (error) {
        console.error('Validation error:', error);
        throw new Error('Lỗi khi kiểm tra dữ liệu');
      }
    },

    // Client-side batch submission
    submitClientData: async (validData: any[], onProgress?: (progress: any) => void) => {
      try {
        if (activity.maxParticipants !== null && activity.maxParticipants !== undefined) {
          const remainingSlots = activity.maxParticipants - approvedParticipantsCount;
          if (remainingSlots <= 0) {
            throw new Error(t('participant.registerDisabledCapacity'));
          }
          if (validData.length > remainingSlots) {
            throw new Error(t('participant.registerDisabledCapacityWithRemaining', { remaining: remainingSlots }));
          }
        }

        const result = await batchImportService.submitParticipantBatches(
          activity.id,  // Don't convert UUID to number!
          validData,
          onProgress
        );

        return {
          success: result.success,
          sessionSummary: result.sessionSummary,
          errors: result.errors,
          message: result.message
        };
      } catch (error) {
        console.error('Submission error:', error);
        throw new Error(error instanceof Error ? error.message : 'Lỗi khi import dữ liệu');
      }
    },

    onSuccess: (result) => {
      // Handle both old and new result structures
      const count = (result as any).sessionSummary?.totalSuccessful ||
        (result as any).importedCount ||
        (result as any).successful?.length ||
        0;
      showSuccess(t('participant.importSuccess', { count }));
      loadParticipants();
      // Refresh grading template after importing students
      refreshGradingTemplate();
    },

    onError: (error) => {
      console.error('Student import error:', error);
      const errorMessage = error.message || 'Lỗi không xác định';
      showError(t('participant.importError', { message: errorMessage }));
    }
  });

  const getGradingImportConfig = (): ImportModalConfig => ({
    entityName: 'grading',
    // Use current grading template URL
    templateUrl: gradingTemplateUrl,
    templateFileName: 'grading_template.xlsx',
    acceptedFileTypes: ['.xlsx', '.xls'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    useClientSideProcessing: true,
    batchSize: 50, // Smaller batch size for CTXH
    columns: [
      { key: 'studentCode', label: t('participant.studentCodeLabel'), required: true, type: 'text', width: '150px' },
      { key: 'name', label: t('common:fields.name'), required: false, type: 'text', width: '200px' },
      { key: 'actualDays', label: t('participant.communityServiceDays'), required: true, type: 'number', width: '120px' },
      { key: 'note', label: t('participant.note'), required: false, type: 'text', width: '200px' }
    ],

    // Client-side file parsing for grading
    parseFile: async (file: File, onProgress?: (progress: number) => void) => {
      try {
        const parseResult = await excelParserService.parseGradingFile(file, onProgress);

        // Store parse errors to pass to validation later
        (parseResult.data as any)._parseErrors = parseResult.errors;

        return parseResult.data;
      } catch (error) {
        console.error('Parse error:', error);
        throw new Error(error instanceof Error ? error.message : 'Lỗi khi đọc file Excel');
      }
    },

    // Client-side validation for grading
    validateClientData: async (data: any[]) => {
      try {
        const validationResult = await importValidationService.validateGradingData(
          data,
          participants, // Pass existing participants
          activity.totalDays // Pass activity total days for validation
        );

        // Pass the original data (all records) and validation result
        // Note: validation result already includes parse errors, so no need to pass them separately
        return batchImportService.createValidationResult(data, validationResult);
      } catch (error) {
        console.error('Validation error:', error);
        throw new Error('Lỗi khi kiểm tra dữ liệu');
      }
    },

    // Client-side batch submission for grading
    submitClientData: async (validData: any[], onProgress?: (progress: any) => void) => {
      try {
        const result = await batchImportService.submitGradingBatches(
          activity.id,  // Don't convert UUID to number!
          validData,
          onProgress
        );

        return {
          success: result.success,
          sessionSummary: result.sessionSummary,
          errors: result.errors,
          message: result.message
        };
      } catch (error) {
        console.error('Submission error:', error);
        throw new Error(error instanceof Error ? error.message : 'Lỗi khi chấm ngày CTXH');
      }
    },

    onSuccess: (result) => {
      const count = (result as any).sessionSummary?.totalSuccessful ||
        (result as any).importedCount ||
        (result as any).successful?.length ||
        0;
      showSuccess(t('participant.gradingSuccess', { count }));
      loadParticipants();
      // Refresh grading template after grading import
      refreshGradingTemplate();
    },

    onError: (error) => {
      console.error('Grading import error:', error);
      const errorMessage = error.message || 'Lỗi không xác định';
      showError(t('participant.gradingError', { message: errorMessage }));
    }
  });

  // Sync participants with prop changes
  useEffect(() => {
    setParticipants(initialParticipants);
  }, [initialParticipants]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setShowAddStudentDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showGradingModal) {
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = '0px'; // Prevent jump
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [showGradingModal]);

  // Load pending participants - comes before loadParticipants since it's called by useEffect
  const loadPendingParticipants = async () => {
    try {
      setPendingLoading(true);
      const response = await activityService.getPendingParticipants(activity.id);
      setPendingParticipants(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Failed to load pending participants:', error);
      setPendingParticipants([]);
    } finally {
      setPendingLoading(false);
    }
  };

  const loadParticipants = async () => {
    try {
      setLoading(true);
      const response = await activityService.getParticipants(activity.id);
      setParticipants(Array.isArray(response) ? response : []);

      // Always load pending participants if activity requires approval
      if (requiresApproval) {
        await loadPendingParticipants();
      } else {
        setPendingParticipants([]);
      }

      // Tra cứu thông tin sinh viên cho những participant chưa có tên
      const participantsNeedingLookup = response.filter((p: ParticipationResponse) =>
        !p.student?.full_name && p.student_code
      );

      if (participantsNeedingLookup.length > 0) {
        // Looking up student info for participants without names
        await lookupParticipantsInfo(participantsNeedingLookup);
      }
    } catch (error: any) {
      console.error('Failed to load participants:', error);

      // Chỉ hiển thị lỗi khi thực sự có lỗi nghiêm trọng
      if (error.response?.status === 404) {
        // Activity not found or no participants yet - This is normal for new activities
      } else if (error.response?.status === 403) {
        showError(t('common:messages.error.noPermission'));
      } else if (error.response?.status >= 500) {
        // Only show error for server errors
        showError(t('participant.loadParticipantsError'));
      } else if (error.message && !error.message.includes('404')) {
        // Only show error if it's not a 404-related message
        console.warn('Non-critical error loading participants:', error.message);
      }
      setParticipants([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSelf = async () => {
    const confirmed = await showConfirm(
      t('participant.registerConfirmTitle') || 'Xác nhận đăng ký hoạt động',
      t('participant.registerConfirmMessage') || 'Bạn có chắc muốn đăng ký tham gia hoạt động này? Lưu ý: sau khi được duyệt hoặc đã tham gia, bạn sẽ không thể hủy đăng ký.',
      {
        confirmText: t('participant.registerButton') || t('common:actions.confirm'),
        cancelText: t('common:actions.cancel'),
        variant: 'info',
      }
    );

    if (!confirmed) return;

    try {
      setRegisteringSelf(true);
      await activityService.registerSelf(activity.id);
      showSuccess(t('participant.registerSuccess'));
      await loadParticipants();
      onRefresh?.();
    } catch (error: any) {
      showError(error?.message || t('participant.registerError'));
    } finally {
      setRegisteringSelf(false);
    }
  };

  const handleCancelSelfRegistration = async () => {
    const confirmed = await showConfirm(
      t('participant.cancelPendingTitle'),
      t('participant.cancelPendingConfirmMessage'),
      {
        confirmText: t('common:actions.confirm'),
        cancelText: t('common:actions.cancel'),
        variant: 'danger',
      }
    );

    if (!confirmed) return;

    try {
      setCancellingSelf(true);
      await activityService.cancelSelfRegistration(activity.id);
      showSuccess(t('participant.cancelPendingSuccess'));
      await loadParticipants();
      onRefresh?.();
    } catch (error: any) {
      showError(error?.message || t('participant.cancelPendingError'));
    } finally {
      setCancellingSelf(false);
    }
  };

  const handleApprovePending = async (participation: ParticipationResponse) => {
    try {
      setApprovingIds(prev => new Set(prev).add(participation.id));
      await activityService.approveParticipant(activity.id, participation.id);
      showSuccess(t('participant.approveOneSuccess'));
      await loadParticipants();
      onRefresh?.();
    } catch (error: any) {
      showError(error?.message || t('participant.approveOneError'));
    } finally {
      setApprovingIds(prev => {
        const next = new Set(prev);
        next.delete(participation.id);
        return next;
      });
    }
  };

  // Handle reject pending participant
  const handleRejectPending = async (participation: ParticipationResponse) => {
    const confirmed = await showConfirm(
      t('participant.rejectTitle') || 'Từ chối đơn đăng ký',
      t('participant.rejectConfirmMessage', { studentCode: participation.student_code }) || `Bạn có chắc muốn từ chối đơn đăng ký của sinh viên ${participation.student_code} không?`,
      {
        confirmText: t('common:actions.reject') || 'Từ chối',
        cancelText: t('common:actions.cancel'),
        variant: 'danger',
      }
    );

    if (!confirmed) return;

    try {
      setApprovingIds(prev => new Set(prev).add(participation.id));
      // Reject pending registration by removing the participation record
      await activityService.removeParticipant(activity.id, participation.id);
      showSuccess(t('participant.rejectSuccess') || 'Đã từ chối đơn đăng ký');
      await loadParticipants();
      onRefresh?.();
    } catch (error: any) {
      showError(error?.message || (t('participant.rejectError') || 'Không thể từ chối đơn đăng ký'));
    } finally {
      setApprovingIds(prev => {
        const next = new Set(prev);
        next.delete(participation.id);
        return next;
      });
    }
  };

  // Tra cứu thông tin sinh viên cho participants
  const lookupParticipantsInfo = async (participants: ParticipationResponse[]) => {
    const studentInfoMap: Record<string, { name?: string, email?: string }> = {};

    for (const participant of participants) {
      if (participant.student_code) {
        try {
          const user = await userService.findByExactCode(participant.student_code);

          if (user) {
            studentInfoMap[participant.student_code] = {
              name: user.familyName + ' ' + user.givenName,
              email: user.email
            };
          }
        } catch (error) {
          // Could not fetch student info - non-critical
        }
      }
    }

    setParticipantsStudentInfo(studentInfoMap);
  };

  // Helper function để lấy tên sinh viên
  const getStudentName = (participant: ParticipationResponse): string => {
    // Ưu tiên lấy từ dữ liệu gốc
    if (participant.student?.full_name) {
      return participant.student.full_name;
    }

    // Nếu không có, tra cứu từ cache
    if (participant.student_code && participantsStudentInfo[participant.student_code]?.name) {
      return participantsStudentInfo[participant.student_code].name!;
    }

    return t('participant.studentNotFound');
  };

  // Helper function để kiểm tra sinh viên có tồn tại
  const isStudentValid = (participant: ParticipationResponse): boolean => {
    return !!(participant.student?.full_name ||
      (participant.student_code && participantsStudentInfo[participant.student_code]?.name));
  };

  // Helper function để lấy email sinh viên
  const getStudentEmail = (participant: ParticipationResponse): string | null => {
    // Ưu tiên lấy từ dữ liệu gốc
    if (participant.student?.email) {
      return participant.student.email;
    }

    // Nếu không có, tra cứu từ cache
    if (participant.student_code && participantsStudentInfo[participant.student_code]?.email) {
      return participantsStudentInfo[participant.student_code].email!;
    }

    return null;
  };

  // Filter participants by search term
  const filteredParticipants = participants.filter(participant => {
    const searchLower = searchTerm.toLowerCase();

    // Search by student code
    if (participant.student_code && participant.student_code.toLowerCase().includes(searchLower)) {
      return true;
    }

    // Search by student name from original data
    if (participant.student?.full_name && participant.student.full_name.toLowerCase().includes(searchLower)) {
      return true;
    }

    // Search by student name from cache
    const cachedName = participant.student_code && participantsStudentInfo[participant.student_code]?.name;
    if (cachedName && cachedName.toLowerCase().includes(searchLower)) {
      return true;
    }

    // Search by email from original data
    if (participant.student?.email && participant.student.email.toLowerCase().includes(searchLower)) {
      return true;
    }

    // Search by email from cache
    const cachedEmail = participant.student_code && participantsStudentInfo[participant.student_code]?.email;
    if (cachedEmail && cachedEmail.toLowerCase().includes(searchLower)) {
      return true;
    }

    return false;
  });

  // For approved tab: exclude PENDING participants if activity requires approval
  const filteredApprovedParticipants = filteredParticipants.filter(participant => {
    if (requiresApproval && participant.status === 'PENDING') {
      return false;
    }
    return true;
  });

  // For pending tab: use the separate API response if available (for managers),
  // otherwise filter from the main participants list (for students)
  const effectivePendingParticipants = canManageParticipants
    ? (pendingParticipants.length > 0 ? pendingParticipants : participants.filter(p => p.status === 'PENDING'))
    : participants.filter(p => p.status === 'PENDING');

  const approvedLikeStatuses = ['APPROVED', 'REGISTERED', 'COMPLETED'];
  const approvedParticipantsCount = participants.filter(
    (p) => p.status && approvedLikeStatuses.includes(p.status),
  ).length;

  const selfParticipation = participants.find(
    (p) =>
      (currentUser?.id && p.student_id === currentUser.id) ||
      (currentUser?.code && p.student_code === currentUser.code),
  );

  const isSelfPending = selfParticipation?.status === 'PENDING';
  const isSelfAlreadyApprovedLike = !!selfParticipation && approvedLikeStatuses.includes(selfParticipation.status || '');
  const isSelfCancelled = selfParticipation?.status === 'CANCELLED';
  const isActivityActive = activity.status === 'ACTIVE';
  const isAtCapacity = activity.maxParticipants !== null
    && activity.maxParticipants !== undefined
    && approvedParticipantsCount >= activity.maxParticipants;

  // Pagination calculations - use filtered approved participants for approved tab
  const paginationList = (activeTab === 'approved' || !requiresApproval)
    ? filteredApprovedParticipants
    : filteredParticipants;
  const totalPages = Math.ceil(paginationList.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedParticipants = paginationList.slice(startIndex, endIndex);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Student lookup function
  const lookupStudent = async (studentCode: string) => {
    if (!studentCode.trim()) {
      setStudentInfo({});
      return;
    }

    try {
      setLookingUpStudent(true);

      // Check if student already participating in this activity
      const isAlreadyParticipating = participants.some(p =>
        p.student_code === studentCode.trim()
      );

      if (isAlreadyParticipating) {
        setStudentInfo({
          alreadyParticipating: true
        });
        return;
      }

      const user = await userService.findByExactCode(studentCode.trim());

      if (user) {
        setStudentInfo({
          name: user.familyName + ' ' + user.givenName,
          email: user.email,
          alreadyParticipating: false
        });
      } else {
        setStudentInfo({
          alreadyParticipating: false
        });
      }
    } catch (error) {
      // Could not fetch student info - non-critical error
      setStudentInfo({
        alreadyParticipating: false
      });
    } finally {
      setLookingUpStudent(false);
    }
  };

  // Lookup student when code changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (newStudentCode && showAddStudentModal) {
        lookupStudent(newStudentCode);
      } else {
        setStudentInfo({});
      }
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timeoutId);
  }, [newStudentCode, showAddStudentModal]);

  // Add student manually
  const handleAddStudent = async () => {
    if (!newStudentCode.trim()) {
      showError(t('participant.studentCodeRequired'));
      return;
    }

    if (isAtCapacity) {
      showError(t('participant.registerDisabledCapacity'));
      return;
    }

    try {
      setAddingStudent(true);
      await activityService.addStudent(activity.id, {
        student_code: newStudentCode.trim()
      });

      showSuccess(t('participant.addStudentSuccess'));
      setNewStudentCode('');
      setStudentInfo({});
      setShowAddStudentModal(false);
      loadParticipants();
      // Refresh grading template after adding student
      refreshGradingTemplate();
      onRefresh?.();
    } catch (error: any) {
      console.error('Failed to add student:', error);

      // Improved error message handling
      let errorMessage = t('participant.addStudentError');

      if (error.message) {
        const message = error.message.toLowerCase();
        const studentCode = newStudentCode.trim();

        // Handle specific error cases from backend
        if (message.includes('đã tham gia hoạt động') || message.includes('already participated')) {
          errorMessage = t('participant.studentAlreadyParticipated', { studentCode });
        } else if (message.includes('không tìm thấy sinh viên') || message.includes('student not found')) {
          errorMessage = t('participant.studentNotFoundWithCode', { studentCode });
        } else if (message.includes('hoạt động') && (message.includes('không tồn tại') || message.includes('not found'))) {
          errorMessage = t('participant.activityNotFound');
        } else if (message.includes('trạng thái active') || message.includes('status')) {
          errorMessage = t('participant.addStudentActiveOnly');
        } else if (message.includes('số ngày ctxh vượt quá giới hạn') || message.includes('ctxh vượt quá') || message.includes('exceed') || message.includes('maximum')) {
          errorMessage = t('participant.ctxhDaysExceeded');
        } else if (message.includes('vượt quá') || message.includes('exceed')) {
          errorMessage = t('participant.exceedsMaxDays');
        } else if (message.includes('không hợp lệ') || message.includes('invalid')) {
          errorMessage = t('participant.invalidStudentCode', { studentCode });
        } else {
          // Use the exact error message from backend if it's in Vietnamese
          errorMessage = error.message;
        }
      }

      showError(errorMessage);
    } finally {
      setAddingStudent(false);
    }
  };

  // Remove participant
  const handleRemoveParticipant = async (participant: ParticipationResponse) => {
    const confirmed = await showConfirm(
      t('participant.deleteStudent'),
      t('participant.deleteConfirmMessage', { studentCode: participant.student_code || 'N/A' }),
      {
        confirmText: t('common:actions.delete'),
        cancelText: t('common:actions.cancel'),
        variant: 'danger'
      }
    );

    if (!confirmed) return;

    try {
      await activityService.removeParticipant(activity.id, participant.id);
      showSuccess(t('participant.removeStudentSuccess'));
      loadParticipants();
      // Refresh grading template after removing student
      refreshGradingTemplate();
      onRefresh?.();
    } catch (error) {
      console.error('Failed to remove participant:', error);
      showError(t('participant.removeStudentError'));
    }
  };

  // Handle manual grading
  const handleGradeParticipant = (participant: ParticipationResponse) => {
    setGradingParticipant(participant);
    setGradingData({
      actualDays: participant.actual_days?.toString() || '',
      note: participant.note || ''
    });
    setShowGradingModal(true);
  };

  // Submit manual grading
  const handleSubmitGrading = async () => {
    if (!gradingParticipant || !gradingData.actualDays) {
      showError(t('participant.daysRequired'));
      return;
    }

    const actualDays = parseFloat(gradingData.actualDays);
    if (isNaN(actualDays) || actualDays < 0) {
      showError(t('participant.positiveNumberRequired'));
      return;
    }

    try {
      setGradingLoading(true);

      const gradeData = {
        participants: [{
          participation_id: gradingParticipant.id,
          actual_days: actualDays,
          note: gradingData.note
        }]
      };

      await activityService.gradeParticipants(activity.id, gradeData);

      showSuccess(t('grading.individualGradingSuccess', { studentCode: gradingParticipant.student_code }));

      // Reset and close modal
      setShowGradingModal(false);
      setGradingParticipant(null);
      setGradingData({ actualDays: '', note: '' });

      // Refresh data
      loadParticipants();
      // Refresh grading template after grading
      refreshGradingTemplate();
      onRefresh?.();

    } catch (error: any) {
      console.error('Failed to grade participant:', error);

      let errorMessage = t('participant.gradingErrorGeneral');
      const backendMessage = error.response?.data?.message || error.message;

      if (backendMessage) {
        const message = backendMessage.toLowerCase();
        if (message.includes('số ngày ctxh vượt quá giới hạn') || message.includes('ctxh vượt quá')) {
          errorMessage = t('participant.ctxhDaysExceeded');
        } else if (message.includes('vượt quá giới hạn') || message.includes('exceed')) {
          errorMessage = t('participant.exceedsMaxDays');
        } else {
          errorMessage = backendMessage;
        }
      }

      showError(errorMessage);
    } finally {
      setGradingLoading(false);
    }
  };



  // Upload bulk grading Excel
  const handleBulkGrading = async () => {
    if (!bulkGradingFile) {
      showError(t('participant.selectGradingFile'));
      return;
    }

    try {
      setBulkGradingLoading(true);
      const results = await activityService.gradeParticipantsFromExcel(activity.id, bulkGradingFile);

      if (results.successful && results.successful.length > 0) {
        showSuccess(t('participant.gradingSuccessMultiple', { count: results.successful.length }));
      }

      if (results.failed && results.failed.length > 0) {
        showError(t('participant.gradingFailedMultiple', { count: results.failed.length }));
      }

      // Refresh data
      loadParticipants();
      // Refresh grading template after bulk grading
      refreshGradingTemplate();
      onRefresh?.();

    } catch (error) {
      console.error('Failed to bulk grade:', error);
      showError(t('participant.bulkGradingError'));
    } finally {
      setBulkGradingLoading(false);
    }
  };



  // Download grading template
  const handleDownloadGradingTemplate = async () => {
    try {
      // Refresh template to get latest participants data
      await refreshGradingTemplate();

      const token = authService.getAccessToken();

      // Call API to get fresh grading template with current participants
      const response = await fetch(`/api/ctxh/activities/${activity.id}/participants/grading-template`, {
        method: 'GET',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch grading template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mau-cham-diem-${activity.name.replace(/[^a-zA-Z0-9]/g, '-')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download grading template:', error);
      showError(t('participant.templateDownloadFailure'));
    }
  };

  // Export participants for grading
  const handleExportParticipants = async () => {
    try {
      const blob = await activityService.exportParticipants(activity.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Create safe filename without Vietnamese characters
      const safeActivityName = activity.name
        .normalize('NFD') // Decompose Vietnamese characters
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/đ/g, 'd').replace(/Đ/g, 'D') // Handle đ/Đ specifically
        .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .toLowerCase();

      link.download = `danh-sach-${safeActivityName}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export participants:', error);
      showError('Không thể xuất danh sách!');
    }
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Chưa xác định';
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${day}/${month}`;
    } catch {
      return 'Chưa xác định';
    }
  };

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden" style={{ overflowX: 'hidden', maxWidth: '100%' }}>
      {/* Header Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
              <Users className="mr-3 h-6 w-6 text-blue-600 dark:text-blue-400" />
              {t('participant.title')}
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 flex flex-col gap-2">
              <span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 text-blue-900 dark:text-blue-100 font-semibold border border-blue-200 dark:border-blue-700 shadow-sm w-fit">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                {searchTerm ? (
                  <>
                    {filteredParticipants.length} / {participants.length} {t('activity.students')}
                    {filteredParticipants.length !== participants.length && (
                      <span className="ml-1 text-xs font-normal">({t('common:filtered')})</span>
                    )}
                  </>
                ) : (
                  `${participants.length} ${t('activity.students')}`
                )}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!canManageParticipants && (
              <>
                {!isSelfPending && !isSelfAlreadyApprovedLike && !isSelfCancelled && (
                  <button
                    onClick={handleRegisterSelf}
                    disabled={registeringSelf || !isActivityActive || isAtCapacity}
                    className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[160px]"
                    title={
                      !isActivityActive
                        ? t('participant.registerDisabledInactive')
                        : isAtCapacity
                          ? t('participant.registerDisabledCapacity')
                          : t('participant.registerButton')
                    }
                  >
                    {registeringSelf ? t('common:states.processing') : t('participant.registerButton')}
                  </button>
                )}

                {isSelfPending && (
                  <button
                    onClick={handleCancelSelfRegistration}
                    disabled={cancellingSelf}
                    className="inline-flex items-center justify-center px-4 py-2.5 border border-red-300 text-sm font-medium rounded-lg text-red-800 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[160px]"
                  >
                    {cancellingSelf ? t('common:states.processing') : t('participant.cancelPendingButton')}
                  </button>
                )}

                {isSelfAlreadyApprovedLike && (
                  <span className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg bg-green-50 text-green-700 border border-green-200">
                    {t('participant.registeredStateApproved')}
                  </span>
                )}

                {isSelfCancelled && (
                  <span className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 border border-gray-300">
                    {t('participant.registeredStateCancelled')}
                  </span>
                )}
              </>
            )}

            {/* Thêm sinh viên Dropdown - disable khi hoạt động không ACTIVE hoặc không có quyền */}
            {canManageParticipants && (
              <div className="relative dropdown-container">
                <button
                  onClick={() => {
                    if (activity.status === 'ACTIVE') {
                      setShowAddStudentDropdown(!showAddStudentDropdown);
                    }
                  }}
                  disabled={activity.status !== 'ACTIVE'}
                  className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[140px]"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t('participant.addStudent')}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </button>

                {showAddStudentDropdown && activity.status === 'ACTIVE' && (
                  <div className="absolute mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden"
                    style={{
                      width: '15rem',
                      maxWidth: 'calc(100vw - 3rem)',
                      right: '-3rem'
                    }}>
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setShowAddStudentModal(true);
                          setShowAddStudentDropdown(false);
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center transition-colors"
                      >
                        <Plus className="mr-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <div>
                          <div className="font-medium">{t('participant.addIndividualStudent')}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{t('participant.addIndividualStudentDesc')}</div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setShowStudentImportModal(true);
                          setShowAddStudentDropdown(false);
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center transition-colors"
                      >
                        <Upload className="mr-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <div>
                          <div className="font-medium">{t('participant.addFromFile')}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{t('participant.addFromFileDesc')}</div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Chấm từ file */}
            {canManageParticipants && (
              <div className="relative dropdown-container">
                <button
                  onClick={() => {
                    if (participants.length > 0 && (activity.status === 'ACTIVE' || activity.status === 'COMPLETED')) {
                      setShowGradingImportModal(true);
                    }
                  }}
                  disabled={participants.length === 0 || (activity.status !== 'ACTIVE' && activity.status !== 'COMPLETED')}
                  className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[120px]"
                  title={
                    participants.length === 0
                      ? "Chưa có sinh viên tham gia"
                      : (activity.status !== 'ACTIVE' && activity.status !== 'COMPLETED')
                        ? t('participant.gradingStatusRestriction', { status: activity.status })
                        : t('participant.gradeFromExcel')
                  }
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  {t('participant.gradeFromFile')}
                </button>
              </div>
            )}

            {/* Xuất danh sách */}
            {participants.length > 0 && ctxhPermissions.reports.export && (
              <button
                onClick={handleExportParticipants}
                className="inline-flex items-center justify-center px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800 transition-colors min-w-[130px]"
              >
                <Download className="mr-2 h-4 w-4" />
                {t('participant.exportList')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Header - Only show if requiresApproval */}
      {requiresApproval && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden max-w-full border-b border-gray-200 dark:border-gray-700">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                setActiveTab('approved');
                setSearchTerm('');
              }}
              className={`flex-1 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'approved'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {t('participant.tabApproved')} (
                {activity.maxParticipants 
                  ? `${approvedParticipantsCount}/${activity.maxParticipants}`
                  : participants.filter(p => p.status !== 'PENDING').length
                }
              )
            </button>
            <button
              onClick={() => {
                setActiveTab('pending');
                setSearchTerm('');
              }}
              className={`flex-1 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'pending'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {t('participant.tabPending')} ({effectivePendingParticipants.length})
            </button>
          </div>
        </div>
      )}

      {/* Search - Only show on approved tab or always if no requiresApproval */}
      {(activeTab === 'approved' || !requiresApproval) && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
          <input
            type="text"
            placeholder="Tìm kiếm sinh viên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>
      )}

      {/* Participants Table - Show on approved tab or always if no requiresApproval */}
      {(activeTab === 'approved' || !requiresApproval) && (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden max-w-full">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 dark:border-gray-600 border-t-doan-500 dark:border-t-doan-400"></div>
          </div>
        ) : filteredApprovedParticipants.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              {searchTerm ? 'Không tìm thấy sinh viên nào' : 'Chưa có sinh viên tham gia'}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm ? t('participant.changeSearchKeyword') : t('participant.startByAddingStudents')}
            </p>
            {!searchTerm && activity.status === 'ACTIVE' && canManageParticipants && (
              <div className="mt-6">
                <button
                  onClick={() => setShowAddStudentModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t('participant.addFirstStudent')}
                </button>
              </div>
            )}

            {!searchTerm && activity.status === 'ACTIVE' && !canManageParticipants && !isSelfPending && !isSelfAlreadyApprovedLike && !isSelfCancelled && (
              <div className="mt-6">
                <button
                  onClick={handleRegisterSelf}
                  disabled={registeringSelf || isAtCapacity}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {registeringSelf ? t('common:states.processing') : t('participant.registerButton')}
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto max-w-full">
              <table className={`w-full divide-y divide-gray-200 dark:divide-gray-700 ${canManageParticipants ? 'min-w-[800px]' : ''}`}>
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('participant.studentName')}
                    </th>
                    {canManageParticipants && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t('participant.actualDays')}
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('participant.status')}
                    </th>
                    {canManageParticipants && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t('participant.note')}
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('participant.joinDate')}
                    </th>
                    {canManageParticipants && (
                      <th className="relative px-6 py-3">
                        <span className="sr-only">{t('common:fields.actions')}</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedParticipants.map((participant) => (
                    <tr key={participant.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${!isStudentValid(participant) ? 'bg-red-50 dark:bg-red-900/20' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <div className={`text-sm font-medium break-words ${isStudentValid(participant) ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'}`}>
                            {getStudentName(participant)}
                            {!isStudentValid(participant) && (
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                {t('participant.invalidStudent')}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 break-words">
                            {t('participant.studentCodeLabel')}: {participant.student_code || participant.student?.student_code || 'N/A'}
                          </div>
                          {getStudentEmail(participant) && (
                            <div className="text-sm text-gray-500 dark:text-gray-400 break-words">
                              {getStudentEmail(participant)}
                            </div>
                          )}
                        </div>
                      </td>
                      {canManageParticipants && (
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900 dark:text-white">
                            {participant.actual_days ? `${formatNumber(participant.actual_days)} ${t('activity.days')}` : t('participant.notGraded')}
                          </span>
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${participant.status === 'COMPLETED' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                          participant.status === 'APPROVED' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
                            participant.status === 'PENDING' ? 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200' :
                          participant.status === 'CANCELLED' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                            'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                          }`}>
                          {participant.status === 'COMPLETED' ? t('participant.statusOptions.completed') :
                            participant.status === 'APPROVED' ? t('participant.statusOptions.approved') :
                              participant.status === 'PENDING' ? t('participant.statusOptions.pending') :
                            participant.status === 'CANCELLED' ? t('participant.statusOptions.cancelled') :
                              t('participant.statusOptions.registered')}
                        </span>
                      </td>
                      {canManageParticipants && (
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          <div className="max-w-xs">
                            {participant.note ? (
                              <div className="break-words" title={participant.note}>
                                {participant.note}
                              </div>
                            ) : (
                              '-'
                            )}
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(participant.created_at)}
                      </td>
                      {canManageParticipants && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          {(activity.status === 'ACTIVE' || activity.status === 'COMPLETED') && participant.status !== 'PENDING' && participant.status !== 'CANCELLED' && (
                            <button
                              onClick={() => handleGradeParticipant(participant)}
                              title="Chấm ngày CTXH"
                              className="inline-flex items-center justify-center p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 rounded transition-colors"
                            >
                              <Edit2 className="h-5 w-5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveParticipant(participant)}
                            title="Xóa"
                            className="inline-flex items-center justify-center p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 rounded transition-colors"
                          >
                            <XCircle className="h-5 w-5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              total={paginationList.length}
              limit={itemsPerPage}
              onPageChange={(page) => setCurrentPage(page)}
              onLimitChange={(newLimit) => {
                setItemsPerPage(newLimit);
                setCurrentPage(1); // Reset to first page when changing items per page
              }}
              showLimitSelector={true}
            />
          </>
        )}
      </div>
      )}

      {/* Pending Approvals Tab */}
      {activeTab === 'pending' && requiresApproval && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden max-w-full">
          {pendingLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 dark:border-gray-600 border-t-doan-500 dark:border-t-doan-400"></div>
            </div>
          ) : effectivePendingParticipants.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                {t('participant.noPendingApprovals')}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('participant.allStudentsApproved')}
              </p>
            </div>
          ) : (
            <>
              {/* Pending Participants List */}
              <div className="overflow-x-auto max-w-full">
                <table className={`w-full divide-y divide-gray-200 dark:divide-gray-700 ${canManageParticipants ? 'min-w-[800px]' : ''}`}>
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      {canManageParticipants && (
                        <th className="px-6 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedPendingIds.size === effectivePendingParticipants.length && effectivePendingParticipants.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPendingIds(new Set(effectivePendingParticipants.map(p => p.id)));
                              } else {
                                setSelectedPendingIds(new Set());
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 cursor-pointer"
                          />
                        </th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t('participant.studentName')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t('participant.joinDate')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {t('participant.status')}
                      </th>
                      {canManageParticipants && (
                        <th className="relative px-6 py-3">
                          <span className="sr-only">Actions</span>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {effectivePendingParticipants.map((participant) => (
                      <tr key={participant.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        {canManageParticipants && (
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedPendingIds.has(participant.id)}
                              onChange={(e) => {
                                const newSelected = new Set(selectedPendingIds);
                                if (e.target.checked) {
                                  newSelected.add(participant.id);
                                } else {
                                  newSelected.delete(participant.id);
                                }
                                setSelectedPendingIds(newSelected);
                              }}
                              className="rounded border-gray-300 text-blue-600 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="px-6 py-4">
                          <div className="max-w-xs">
                            <div className="text-sm font-medium text-gray-900 dark:text-white break-words">
                              {participant.student?.full_name || participant.student_code || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 break-words">
                              {t('participant.studentCodeLabel')}: {participant.student_code || 'N/A'}
                            </div>
                            {participant.student?.email && (
                              <div className="text-sm text-gray-500 dark:text-gray-400 break-words">
                                {participant.student.email}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900 dark:text-white">
                            {formatDate(participant.created_at)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                            {t('participant.statusOptions.pending')}
                          </span>
                        </td>
                        {canManageParticipants && (
                          <td className="px-6 py-4 text-right text-sm font-medium space-x-2">
                            <button
                              onClick={() => handleApprovePending(participant)}
                              disabled={approvingIds.has(participant.id)}
                              title="Duyệt"
                              className="inline-flex items-center justify-center p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <Check className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleRejectPending(participant)}
                              disabled={approvingIds.has(participant.id)}
                              title="Từ chối"
                              className="inline-flex items-center justify-center p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <XCircle className="h-5 w-5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-black bg-opacity-50" aria-hidden="true" onClick={() => {
              setShowAddStudentModal(false);
              setNewStudentCode('');
              setStudentInfo({});
            }}></div>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 sm:mx-0 sm:h-10 sm:w-10">
                    <Plus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                      {t('participant.addStudentToActivity')}
                    </h3>
                    <div className="mt-4">
                      <label htmlFor="student-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('participant.studentCodeLabel')}
                      </label>
                      <input
                        type="text"
                        id="student-code"
                        value={newStudentCode}
                        onChange={(e) => setNewStudentCode(e.target.value)}
                        placeholder={t('participant.studentCodePlaceholder')}
                        className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                        onKeyPress={(e) => e.key === 'Enter' && handleAddStudent()}
                      />

                      {/* Student info display */}
                      {lookingUpStudent && (
                        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-200 dark:border-gray-600 border-t-doan-500 dark:border-t-doan-400 mr-2"></div>
                            <span className="text-sm text-gray-600 dark:text-gray-300">{t('participant.lookingUpStudent')}</span>
                          </div>
                        </div>
                      )}

                      {!lookingUpStudent && newStudentCode.trim() && studentInfo.name && (
                        <div className="mt-2 p-3 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-md">
                          <div className="flex items-start">
                            <div className="text-green-600 dark:text-green-400">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                                {t('participant.studentFound')}
                              </p>
                              <p className="text-sm text-green-700 dark:text-green-300">
                                <strong>Họ tên:</strong> {studentInfo.name}
                              </p>
                              {studentInfo.email && (
                                <p className="text-sm text-green-700 dark:text-green-300">
                                  <strong>Email:</strong> {studentInfo.email}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {!lookingUpStudent && newStudentCode.trim() && studentInfo.alreadyParticipating && (
                        <div className="mt-2 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md">
                          <div className="flex items-start">
                            <div className="text-red-600 dark:text-red-400">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                                {t('participant.studentAlreadyParticipating')}
                              </p>
                              <p className="text-sm text-red-700 dark:text-red-300">
                                {t('participant.studentAlreadyParticipated', { studentCode: newStudentCode })}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {!lookingUpStudent && newStudentCode.trim() && !studentInfo.name && !studentInfo.alreadyParticipating && (
                        <div className="mt-2 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md">
                          <div className="flex items-start">
                            <div className="text-red-600 dark:text-red-400">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                                {t('participant.studentNotFound')}
                              </p>
                              <p className="text-sm text-red-700 dark:text-red-300">
                                {t('participant.studentCodeNotFound', { studentCode: newStudentCode })}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleAddStudent}
                  disabled={addingStudent || !newStudentCode.trim() || (!studentInfo.name && !!newStudentCode.trim() && !lookingUpStudent) || studentInfo.alreadyParticipating}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {addingStudent ? t('common:states.adding') : t('participant.addStudent')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddStudentModal(false);
                    setNewStudentCode('');
                    setStudentInfo({});
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  {t('common:actions.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Grading Modal */}
      {showGradingModal && gradingParticipant && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 50,
            margin: 0,
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md"
            style={{
              maxWidth: '28rem',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('participant.gradeStudent')}
              </h3>
              <button
                onClick={() => {
                  setShowGradingModal(false);
                  setGradingParticipant(null);
                  setGradingData({ actualDays: '', note: '' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  <strong>{t('participant.studentLabel')}:</strong> {gradingParticipant.student_code || 'N/A'} - {gradingParticipant.student?.full_name || 'N/A'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('participant.communityServiceDays')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={gradingData.actualDays}
                  onChange={(e) => setGradingData(prev => ({ ...prev, actualDays: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder={t('participant.actualDaysPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('participant.note')}
                </label>
                <textarea
                  value={gradingData.note}
                  onChange={(e) => setGradingData(prev => ({ ...prev, note: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={3}
                  placeholder={t('participant.notePlaceholder')}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowGradingModal(false);
                  setGradingParticipant(null);
                  setGradingData({ actualDays: '', note: '' });
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md"
              >
                {t('common:actions.cancel')}
              </button>
              <button
                onClick={handleSubmitGrading}
                disabled={!gradingData.actualDays || gradingLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {gradingLoading ? (
                  <span className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t('common:states.grading')}
                  </span>
                ) : (
                  t('participant.grade')
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Grading Modal */}
      {showBulkGradingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('participant.enterGradingList')}</h3>
              <button
                onClick={() => {
                  setShowBulkGradingModal(false);
                  setBulkGradingFile(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-center mb-6 space-x-8">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full text-sm font-medium">
                  1
                </div>
                <span className="ml-2 text-sm font-medium text-blue-600">Tải file</span>
              </div>
              <div className="flex items-center">
                <div className="flex items-center justify-center w-8 h-8 bg-gray-300 text-gray-500 rounded-full text-sm font-medium">
                  2
                </div>
                <span className="ml-2 text-sm text-gray-500">Xem trước</span>
              </div>
              <div className="flex items-center">
                <div className="flex items-center justify-center w-8 h-8 bg-gray-300 text-gray-500 rounded-full text-sm font-medium">
                  3
                </div>
                <span className="ml-2 text-sm text-gray-500">Import</span>
              </div>
              <div className="flex items-center">
                <div className="flex items-center justify-center w-8 h-8 bg-gray-300 text-gray-500 rounded-full text-sm font-medium">
                  4
                </div>
                <span className="ml-2 text-sm text-gray-500">Kết quả</span>
              </div>
            </div>

            <div className="space-y-4">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2">📋 {t('participant.gradingDataGuide')}</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>1. {t('participant.downloadTemplateInstruction')} <button onClick={handleDownloadGradingTemplate} className="text-blue-600 underline hover:text-blue-800">{t('common:downloadHere')}</button></li>
                  <li>2. {t('participant.checkDataFormat')}</li>
                  <li>3. {t('participant.uploadFileToUpdate')}</li>
                </ul>
              </div>

              {/* File Upload */}
              <div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => setBulkGradingFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="bulk-grading-file"
                  />
                  <div className="flex flex-col items-center space-y-3">
                    <Upload className="h-12 w-12 text-gray-400" />
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">Kéo thả file vào đây</h4>
                      <p className="text-sm text-gray-500 mb-4">
                        Định dạng hỗ trợ: .xlsx, .xls<br />
                        Kích thước tối đa: 5.0MB
                      </p>
                      <label
                        htmlFor="bulk-grading-file"
                        className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Chọn file từ máy tính
                      </label>
                    </div>
                    {bulkGradingFile && (
                      <div className="mt-3 text-sm text-green-600 font-medium">
                        📄 {bulkGradingFile.name}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => {
                  setShowBulkGradingModal(false);
                  setBulkGradingFile(null);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800"
              >
                Hủy
              </button>
              <button
                onClick={handleBulkGrading}
                disabled={!bulkGradingFile || bulkGradingLoading}
                className="px-4 py-2 bg-green-600 dark:bg-green-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-green-700 dark:hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkGradingLoading ? (
                  <span className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t('common:states.grading')}
                  </span>
                ) : (
                  t('participant.bulkGrade')
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SimpleImportModal for Students */}
      {showStudentImportModal && (
        <SimpleImportModal
          config={getStudentImportConfig()}
          isOpen={showStudentImportModal}
          onClose={() => setShowStudentImportModal(false)}
        />
      )}

      {/* SimpleImportModal for Grading */}
      {showGradingImportModal && (
        <SimpleImportModal
          config={getGradingImportConfig()}
          isOpen={showGradingImportModal}
          onClose={() => setShowGradingImportModal(false)}
        />
      )}

      {/* Toast Notifications */}
      <div
        className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none"
        style={{
          maxWidth: '300px',
          right: '1rem',
          top: '1rem',
          position: 'fixed',
          zIndex: 9999
        }}
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto" style={{ maxWidth: '100%', overflow: 'hidden' }}>
            <Toast
              type={toast.type}
              message={toast.message}
              duration={toast.duration}
              onClose={() => hideToast(toast.id)}
            />
          </div>
        ))}
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm || (() => { })}
        onCancel={confirmDialog.onCancel || (() => { })}
      />
    </div>
  );
};

export default ParticipantManagement;