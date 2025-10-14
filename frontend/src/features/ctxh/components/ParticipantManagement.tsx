import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Plus, Upload, Download, Search, Edit2, Trash2, FileSpreadsheet, X, ChevronDown } from 'lucide-react';
import { CtxhActivity, ParticipationResponse } from '../types';
import { activityService } from '../services';
import { userService } from '../../../shared/services/userService';
import { authService } from '../../auth/services/authService';
import { useToast } from '../../../shared/hooks';
import { Toast, ConfirmDialog, Pagination, ImportModal } from '../../../shared/components';
import { ImportModalConfig } from '../../../shared/types/import';
import { excelParserService, importValidationService, batchImportService } from '../services';

interface ParticipantManagementProps {
  activity: CtxhActivity;
  onRefresh?: () => void;
}

const ParticipantManagement: React.FC<ParticipantManagementProps> = ({
  activity,
  onRefresh
}) => {
  const { t } = useTranslation(['ctxh', 'common']);
  const [participants, setParticipants] = useState<ParticipationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudentCode, setNewStudentCode] = useState('');
  const [addingStudent, setAddingStudent] = useState(false);
  const [studentInfo, setStudentInfo] = useState<{name?: string, email?: string, alreadyParticipating?: boolean}>({});
  const [lookingUpStudent, setLookingUpStudent] = useState(false);
  const [participantsStudentInfo, setParticipantsStudentInfo] = useState<Record<string, {name?: string, email?: string}>>({});
  
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
  
  // Toast notifications
  const { toasts, hideToast, showSuccess, showError, showConfirm, confirmDialog } = useToast();

  // Format number to remove unnecessary decimal places
  const formatNumber = (num: number): string => {
    return num % 1 === 0 ? Math.floor(num).toString() : num.toString();
  };

  // Template URLs with authentication
  const [studentTemplateUrl, setStudentTemplateUrl] = useState<string>('');
  const [gradingTemplateUrl, setGradingTemplateUrl] = useState<string>('');

  // Generate authenticated template URLs
  useEffect(() => {
    const generateTemplateUrls = async () => {
      try {
        const token = authService.getAccessToken();
        
        // Generate student template URL
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

        // Generate grading template URL
        const gradingResponse = await fetch(`/api/ctxh/activities/${activity.id}/participants/grading-template`, {
          method: 'GET',
          headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        });
        
        if (gradingResponse.ok) {
          const gradingBlob = await gradingResponse.blob();
          const gradingUrl = window.URL.createObjectURL(gradingBlob);
          setGradingTemplateUrl(gradingUrl);
        }
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
        
        return batchImportService.createValidationResult(validationResult.data, validationResult);
      } catch (error) {
        console.error('Validation error:', error);
        throw new Error('Lỗi khi kiểm tra dữ liệu');
      }
    },
    
    // Client-side batch submission
    submitClientData: async (validData: any[], onProgress?: (progress: any) => void) => {
      try {
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
    },
    
    onError: (error) => {
      console.error('Student import error:', error);
      const errorMessage = error.message || 'Lỗi không xác định';
      showError(t('participant.importError', { message: errorMessage }));
    }
  });

  const getGradingImportConfig = (): ImportModalConfig => ({
    entityName: 'grading',
    // Use blob URL with authentication
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
        
        if (parseResult.errors.length > 0) {
          console.warn('Parse errors:', parseResult.errors);
        }
        
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
        
        return batchImportService.createValidationResult(validationResult.data, validationResult);
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
        throw new Error(error instanceof Error ? error.message : 'Lỗi khi chấm điểm');
      }
    },
    
    onSuccess: (result) => {
      const count = (result as any).sessionSummary?.totalSuccessful || 
                   (result as any).importedCount || 
                   (result as any).successful?.length || 
                   0;
      showSuccess(t('participant.gradingSuccess', { count }));
      loadParticipants();
    },
    
    onError: (error) => {
      console.error('Grading import error:', error);
      const errorMessage = error.message || 'Lỗi không xác định';
      showError(t('participant.gradingError', { message: errorMessage }));
    }
  });

  // Load participants
  useEffect(() => {
    loadParticipants();
  }, [activity.id]);

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

  const loadParticipants = async () => {
    try {
      setLoading(true);
      const response = await activityService.getParticipants(activity.id);
      // Debug: Log first participant to see status format
      if (response.length > 0 && process.env.NODE_ENV === 'development') {
        console.log('First participant status:', response[0].status);
      }
      setParticipants(Array.isArray(response) ? response : []);
      
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
        // Don't show error toast for this case
        console.log('No participants found for activity - this is normal for new activities');
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

  // Tra cứu thông tin sinh viên cho participants
  const lookupParticipantsInfo = async (participants: ParticipationResponse[]) => {
    const studentInfoMap: Record<string, {name?: string, email?: string}> = {};
    
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
    
    return 'N/A';
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

  // Pagination calculations
  const totalPages = Math.ceil(filteredParticipants.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedParticipants = filteredParticipants.slice(startIndex, endIndex);

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
      
      showSuccess(t('participant.individualGradingSuccess', { studentCode: gradingParticipant.student_code }));
      
      // Reset and close modal
      setShowGradingModal(false);
      setGradingParticipant(null);
      setGradingData({ actualDays: '', note: '' });
      
      // Refresh data
      loadParticipants();
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
      
      console.log('Bulk grading results:', results);
      
      if (results.successful && results.successful.length > 0) {
        showSuccess(t('participant.gradingSuccessMultiple', { count: results.successful.length }));
      }
      
      if (results.failed && results.failed.length > 0) {
        showError(t('participant.gradingFailedMultiple', { count: results.failed.length }));
      }
      
      // Refresh data
      loadParticipants();
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
      // Export current participants list as grading template
      const blob = await activityService.exportParticipants(activity.id);
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
      return new Date(dateString).toLocaleDateString('vi-VN');
    } catch {
      return 'Chưa xác định';
    }
  };

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden" style={{overflowX: 'hidden', maxWidth: '100%'}}>
      {/* Header Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
              <Users className="mr-3 h-6 w-6 text-blue-600 dark:text-blue-400" />
              {t('participant.title')}
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 flex items-center">
              <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-medium">
                {searchTerm ? (
                  <>
                    {filteredParticipants.length} / {participants.length} {t('activity.students')}
                    {filteredParticipants.length !== participants.length && (
                      <span className="ml-1 text-xs">({t('common:filtered')})</span>
                    )}
                  </>
                ) : (
                  `${participants.length} ${t('activity.students')}`
                )}
              </span>
            </p>
          </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Thêm sinh viên Dropdown - disable khi hoạt động không ACTIVE */}
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
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 overflow-hidden">
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

          {/* Chấm từ file */}
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

          {/* Xuất danh sách */}
          {participants.length > 0 && (
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

      {/* Search */}
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

      {/* Participants Table */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden max-w-full">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Đang tải danh sách sinh viên...</p>
          </div>
        ) : filteredParticipants.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              {searchTerm ? 'Không tìm thấy sinh viên nào' : 'Chưa có sinh viên tham gia'}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm ? t('participant.changeSearchKeyword') : t('participant.startByAddingStudents')}
            </p>
            {!searchTerm && activity.status === 'ACTIVE' && (
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
          </div>
        ) : (
          <>
            <div className="overflow-hidden max-w-full">
            <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('participant.studentName')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('participant.actualDays')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('participant.status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('participant.note')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('participant.joinDate')}
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">{t('common:fields.actions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedParticipants.map((participant) => (
                  <tr key={participant.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {getStudentName(participant)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {t('participant.studentCodeLabel')}: {participant.student_code || participant.student?.student_code || 'N/A'}
                        </div>
                        {getStudentEmail(participant) && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {getStudentEmail(participant)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {participant.actual_days ? `${formatNumber(participant.actual_days)} ${t('activity.days')}` : t('participant.notGraded')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        participant.status === 'COMPLETED' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                        participant.status === 'CANCELLED' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                        'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                      }`}>
                        {participant.status === 'COMPLETED' ? t('participant.statusOptions.completed') :
                         participant.status === 'CANCELLED' ? t('participant.statusOptions.cancelled') :
                         t('participant.statusOptions.registered')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                      {participant.note ? (
                        <div 
                          className="line-clamp-3 cursor-help" 
                          title={participant.note}
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            wordBreak: 'break-word'
                          }}
                        >
                          {participant.note}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(participant.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button 
                        onClick={() => {
                          if (activity.status === 'ACTIVE' || activity.status === 'COMPLETED') {
                            handleGradeParticipant(participant);
                          }
                        }}
                        disabled={activity.status !== 'ACTIVE' && activity.status !== 'COMPLETED'}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900 rounded disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        title={
                          (activity.status !== 'ACTIVE' && activity.status !== 'COMPLETED')
                            ? t('participant.gradingStatusRestriction', { status: activity.status })
                            : t('participant.gradeThisStudent')
                        }
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        {t('participant.grade')}
                      </button>
                      <button 
                        onClick={() => handleRemoveParticipant(participant)}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900 rounded"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        {t('common:actions.delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            total={filteredParticipants.length}
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

      {/* Add Student Modal */}
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
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 dark:border-blue-400 mr-2"></div>
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

      {/* ImportModal for Students */}
      {showStudentImportModal && (
        <ImportModal
          config={getStudentImportConfig()}
          isOpen={showStudentImportModal}
          onClose={() => setShowStudentImportModal(false)}
        />
      )}

      {/* ImportModal for Grading */}
      {showGradingImportModal && (
        <ImportModal
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
          <div key={toast.id} className="pointer-events-auto" style={{maxWidth: '100%', overflow: 'hidden'}}>
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
        onConfirm={confirmDialog.onConfirm || (() => {})}
        onCancel={confirmDialog.onCancel || (() => {})}
      />
    </div>
  );
};

export default ParticipantManagement;