import React, { useState, useEffect } from 'react';
import { Users, Plus, Upload, Download, Search, Edit2, Trash2, FileSpreadsheet, X, ChevronDown } from 'lucide-react';
import { CtxhActivity, ParticipationResponse } from '../types';
import { activityService } from '../services';
import { userService } from '../../../shared/services/userService';
import { useToast } from '../../../shared/hooks';
import { Toast, ConfirmDialog, Pagination, ImportModal } from '../../../shared/components';
import { ImportModalConfig } from '../../../shared/types/import';
import { authService } from '../../auth/services/authService';

interface ParticipantManagementProps {
  activity: CtxhActivity;
  onRefresh?: () => void;
}

const ParticipantManagement: React.FC<ParticipantManagementProps> = ({
  activity,
  onRefresh
}) => {
  const [participants, setParticipants] = useState<ParticipationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudentCode, setNewStudentCode] = useState('');
  const [addingStudent, setAddingStudent] = useState(false);
  const [studentInfo, setStudentInfo] = useState<{name?: string, email?: string}>({});
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

  // Download template function
  const downloadStudentTemplate = async () => {
    try {
      const token = authService.getAccessToken();
      const response = await fetch(`/api/ctxh/activities/participants/template`, {
        method: 'GET',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to download template');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'participants_template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download template:', error);
      showError('Không thể tải file mẫu!');
    }
  };

  const downloadGradingTemplate = async () => {
    // Kiểm tra xem có participants không trước khi download
    if (participants.length === 0) {
      showError('Chưa có sinh viên nào tham gia hoạt động này. Vui lòng thêm sinh viên trước khi tải template chấm điểm!');
      return;
    }

    try {
      const token = authService.getAccessToken();
      const response = await fetch(`/api/ctxh/activities/${activity.id}/participants/grading-template`, {
        method: 'GET',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Download template error:', errorText);
        
        if (response.status === 404) {
          throw new Error('Hoạt động không tồn tại hoặc chưa có sinh viên tham gia');
        } else {
          throw new Error('Không thể tải template chấm điểm');
        }
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'grading_template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Failed to download template:', error);
      showError(error.message || 'Không thể tải file mẫu chấm điểm!');
    }
  };

  // ImportModal configurations
  const studentImportConfig: ImportModalConfig = {
    entityName: 'participants',
    title: 'Thêm sinh viên',
    downloadTemplate: downloadStudentTemplate,
    templateFileName: 'participants_template.xlsx',
    acceptedFileTypes: ['.xlsx', '.xls'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    instructions: [
      'Tải file mẫu Excel tại đây và điền đầy đủ thông tin các sinh viên',
      'Kiểm tra định dạng dữ liệu và đảm bảo không có lỗi',
      'Tải file lên để tiến hành thêm vào hệ thống'
    ],
    columns: [
      { key: 'MSSV', label: 'MSSV', required: true, type: 'text', width: '120px' },
      { key: 'Họ tên', label: 'Họ tên', required: true, type: 'text', width: '200px' },
      { key: 'Email', label: 'Email', required: false, type: 'email', width: '200px' }
    ],
    uploadFile: async (file: File) => {
      const token = authService.getAccessToken();
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`/api/ctxh/activities/${activity.id}/participants/upload`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: formData
      });
      return response.json();
    },
    validateServerData: async (sessionId: string) => {
      const token = authService.getAccessToken();
      const response = await fetch(`/api/ctxh/activities/import/${sessionId}/validate`, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      return response.json();
    },
    executeServerImport: async (sessionId: string, options?: { skipConflicts?: boolean }) => {
      const token = authService.getAccessToken();
      const response = await fetch(`/api/ctxh/activities/import/${sessionId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(options)
      });
      return response.json();
    },
    onSuccess: (result) => {
      showSuccess(`Đã thêm thành công ${result.importedCount} sinh viên`);
      loadParticipants();
      setShowStudentImportModal(false);
    },
    onError: (error) => {
      showError(`Lỗi import: ${error.message || 'Có lỗi xảy ra'}`);
    }
  };

  const gradingImportConfig: ImportModalConfig = {
    entityName: 'grading',
    title: 'Chấm điểm',
    downloadTemplate: downloadGradingTemplate,
    templateFileName: 'grading_template.xlsx',
    acceptedFileTypes: ['.xlsx', '.xls'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    instructions: [
      'Tải file mẫu Excel tại đây và điền đầy đủ thông tin chấm điểm',
      'Kiểm tra định dạng dữ liệu và đảm bảo không có lỗi',
      'Tải file lên để tiến hành cập nhật điểm cho sinh viên'
    ],
    columns: [
      { key: 'Mã số sinh viên', label: 'Mã số sinh viên', required: true, type: 'text', width: '150px' },
      { key: 'Họ tên', label: 'Họ tên', required: false, type: 'text', width: '200px' },
      { key: 'Số ngày CTXH', label: 'Số ngày CTXH', required: true, type: 'number', width: '120px' },
      { key: 'Ghi chú', label: 'Ghi chú', required: false, type: 'text', width: '200px' }
    ],
    uploadFile: async (file: File) => {
      const token = authService.getAccessToken();
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`/api/ctxh/activities/${activity.id}/participants/grading-upload`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Grading upload error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      return result;
    },
    validateServerData: async (sessionId: string) => {
      // Validating grading session
      
      if (!sessionId) {
        throw new Error('SessionId is undefined');
      }
      
      const token = authService.getAccessToken();
      const response = await fetch(`/api/ctxh/activities/import/${sessionId}/validate`, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Grading - Validate error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      return result;
    },
    executeServerImport: async (sessionId: string, options?: { skipConflicts?: boolean }) => {
      const token = authService.getAccessToken();
      const response = await fetch(`/api/ctxh/activities/import/${sessionId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(options)
      });
      return response.json();
    },
    onSuccess: (result) => {
      showSuccess(`Đã chấm điểm thành công cho ${result.importedCount} sinh viên`);
      loadParticipants();
      setShowGradingImportModal(false);
    },
    onError: (error) => {
      console.error('Grading error:', error);
      showError(`Lỗi chấm điểm: ${error.message || 'Có lỗi xảy ra'}`);
    }
  };

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
        // Activity not found or no participants yet
        // Không hiển thị toast lỗi cho trường hợp này
      } else if (error.response?.status === 403) {
        showError('Không có quyền truy cập!');
      } else if (error.response?.status >= 500) {
        // Chỉ hiển thị lỗi cho server errors
        showError('Có lỗi xảy ra khi tải danh sách sinh viên!');
      } else {
        // Các lỗi khác, log nhưng không hiển thị toast
        // Non-critical error loading participants
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
      const user = await userService.findByExactCode(studentCode.trim());
      
      if (user) {
        setStudentInfo({
          name: user.familyName + ' ' + user.givenName,
          email: user.email
        });
      } else {
        setStudentInfo({});
      }
    } catch (error) {
      // Could not fetch student info - non-critical error
      setStudentInfo({});
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
      showError('Vui lòng nhập mã số sinh viên!');
      return;
    }

    try {
      setAddingStudent(true);
      await activityService.addStudent(activity.id, {
        student_code: newStudentCode.trim()
      });
      
      showSuccess('Thêm sinh viên thành công!');
      setNewStudentCode('');
      setStudentInfo({});
      setShowAddStudentModal(false);
      loadParticipants();
      onRefresh?.();
    } catch (error: any) {
      console.error('Failed to add student:', error);
      
      // Improved error message handling
      let errorMessage = 'Có lỗi xảy ra khi thêm sinh viên!';
      
      if (error.message) {
        const message = error.message.toLowerCase();
        const studentCode = newStudentCode.trim();
        
        // Handle specific error cases from backend
        if (message.includes('đã tham gia hoạt động') || message.includes('already participated')) {
          errorMessage = `Sinh viên ${studentCode} đã tham gia hoạt động này`;
        } else if (message.includes('không tồn tại') || message.includes('not found')) {
          errorMessage = 'Hoạt động không tồn tại hoặc đã bị xóa';
        } else if (message.includes('trạng thái active') || message.includes('status')) {
          errorMessage = 'Chỉ có thể thêm sinh viên vào hoạt động có trạng thái ACTIVE';
        } else if (message.includes('không hợp lệ') || message.includes('invalid')) {
          errorMessage = `Mã số sinh viên "${studentCode}" không hợp lệ`;
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
      'Xóa sinh viên',
      `Bạn có chắc chắn muốn xóa

Mã sinh viên: ${participant.student_code || 'N/A'}`,
      {
        confirmText: 'Xóa',
        cancelText: 'Hủy',
        variant: 'danger'
      }
    );

    if (!confirmed) return;

    try {
      await activityService.removeParticipant(activity.id, participant.id);
      showSuccess('Đã xóa sinh viên khỏi hoạt động!');
      loadParticipants();
      onRefresh?.();
    } catch (error) {
      console.error('Failed to remove participant:', error);
      showError('Có lỗi xảy ra khi xóa sinh viên!');
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
      showError('Vui lòng nhập số ngày CTXH!');
      return;
    }

    const actualDays = parseInt(gradingData.actualDays);
    if (isNaN(actualDays) || actualDays < 0) {
      showError('Số ngày CTXH phải là số nguyên dương!');
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
      
      showSuccess(`Đã chấm điểm thành công cho sinh viên ${gradingParticipant.student_code}!`);
      
      // Reset and close modal
      setShowGradingModal(false);
      setGradingParticipant(null);
      setGradingData({ actualDays: '', note: '' });
      
      // Refresh data
      loadParticipants();
      onRefresh?.();
      
    } catch (error: any) {
      console.error('Failed to grade participant:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Có lỗi xảy ra khi chấm điểm!';
      showError(errorMessage);
    } finally {
      setGradingLoading(false);
    }
  };



  // Upload bulk grading Excel
  const handleBulkGrading = async () => {
    if (!bulkGradingFile) {
      showError('Vui lòng chọn file Excel chấm điểm!');
      return;
    }

    try {
      setBulkGradingLoading(true);
      const results = await activityService.gradeParticipantsFromExcel(activity.id, bulkGradingFile);
      
      console.log('Bulk grading results:', results);
      
      if (results.successful && results.successful.length > 0) {
        showSuccess(`Chấm điểm thành công ${results.successful.length} sinh viên!`);
      }
      
      if (results.failed && results.failed.length > 0) {
        showError(`${results.failed.length} sinh viên không thể chấm điểm.`);
      }
      
      // Refresh data
      loadParticipants();
      onRefresh?.();
      
    } catch (error) {
      console.error('Failed to bulk grade:', error);
      showError('Có lỗi xảy ra khi chấm điểm hàng loạt!');
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
      showError('Không thể tải mẫu chấm điểm!');
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
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 flex items-center">
              <Users className="mr-3 h-6 w-6 text-blue-600" />
              Quản lý sinh viên tham gia
            </h3>
            <p className="mt-2 text-sm text-gray-600 flex items-center">
              <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-800 font-medium">
                {searchTerm ? (
                  <>
                    {filteredParticipants.length} / {participants.length} sinh viên
                    {filteredParticipants.length !== participants.length && (
                      <span className="ml-1 text-xs">(đã lọc)</span>
                    )}
                  </>
                ) : (
                  `${participants.length} sinh viên`
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
              className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[140px]"
            >
              <Plus className="mr-2 h-4 w-4" />
              Thêm sinh viên
              <ChevronDown className="ml-2 h-4 w-4" />
            </button>
            
            {showAddStudentDropdown && activity.status === 'ACTIVE' && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowAddStudentModal(true);
                      setShowAddStudentDropdown(false);
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center transition-colors"
                  >
                    <Plus className="mr-3 h-4 w-4 text-gray-400" />
                    <div>
                      <div className="font-medium">Thêm từng sinh viên</div>
                      <div className="text-xs text-gray-500">Tạo sinh viên mới bằng form</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowStudentImportModal(true);
                      setShowAddStudentDropdown(false);
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center transition-colors"
                  >
                    <Upload className="mr-3 h-4 w-4 text-gray-400" />
                    <div>
                      <div className="font-medium">Thêm từ file</div>
                      <div className="text-xs text-gray-500">Thêm nhiều sinh viên từ file Excel</div>
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
              className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[120px]"
              title={
                participants.length === 0 
                  ? "Chưa có sinh viên tham gia" 
                  : (activity.status !== 'ACTIVE' && activity.status !== 'COMPLETED')
                    ? `Chỉ có thể chấm điểm khi hoạt động ở trạng thái ACTIVE hoặc COMPLETED (hiện tại: ${activity.status})`
                    : "Chấm điểm từ file Excel"
              }
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Chấm từ file
            </button>
          </div>

          {/* Xuất danh sách */}
          {participants.length > 0 && (
            <button
              onClick={handleExportParticipants}
              className="inline-flex items-center justify-center px-4 py-2.5 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors min-w-[130px]"
            >
              <Download className="mr-2 h-4 w-4" />
              Xuất danh sách
            </button>
          )}
        </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          type="text"
          placeholder="Tìm kiếm sinh viên..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm w-full"
        />
      </div>

      {/* Participants Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden max-w-full">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-sm text-gray-500">Đang tải danh sách sinh viên...</p>
          </div>
        ) : filteredParticipants.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {searchTerm ? 'Không tìm thấy sinh viên nào' : 'Chưa có sinh viên tham gia'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Thử thay đổi từ khóa tìm kiếm' : 'Bắt đầu bằng cách thêm sinh viên vào hoạt động.'}
            </p>
            {!searchTerm && activity.status === 'ACTIVE' && (
              <div className="mt-6">
                <button 
                  onClick={() => setShowAddStudentModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm sinh viên đầu tiên
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-hidden max-w-full">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sinh viên
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Số ngày thực tế
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ghi chú
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ngày tham gia
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Hành động</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedParticipants.map((participant) => (
                  <tr key={participant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {getStudentName(participant)}
                        </div>
                        <div className="text-sm text-gray-500">
                          MSSV: {participant.student_code || participant.student?.student_code || 'N/A'}
                        </div>
                        {getStudentEmail(participant) && (
                          <div className="text-sm text-gray-500">
                            {getStudentEmail(participant)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {participant.actual_days ? `${participant.actual_days} ngày` : 'Chưa chấm'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        participant.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        participant.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {participant.status === 'COMPLETED' ? 'Hoàn thành' :
                         participant.status === 'CANCELLED' ? 'Đã hủy' :
                         'Đang tham gia'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {participant.note || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        title={
                          (activity.status !== 'ACTIVE' && activity.status !== 'COMPLETED')
                            ? `Chỉ có thể chấm điểm khi hoạt động ở trạng thái ACTIVE hoặc COMPLETED (hiện tại: ${activity.status})`
                            : "Chấm điểm cho sinh viên này"
                        }
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Chấm điểm
                      </button>
                      <button 
                        onClick={() => handleRemoveParticipant(participant)}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-600 hover:text-red-900 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Xóa
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

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Plus className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Thêm sinh viên vào hoạt động
                    </h3>
                    <div className="mt-4">
                      <label htmlFor="student-code" className="block text-sm font-medium text-gray-700">
                        Mã số sinh viên
                      </label>
                      <input
                        type="text"
                        id="student-code"
                        value={newStudentCode}
                        onChange={(e) => setNewStudentCode(e.target.value)}
                        placeholder="VD: 2150001"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                        onKeyPress={(e) => e.key === 'Enter' && handleAddStudent()}
                      />
                      
                      {/* Student info display */}
                      {lookingUpStudent && (
                        <div className="mt-2 p-2 bg-gray-50 rounded-md">
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                            <span className="text-sm text-gray-600">Đang tra cứu thông tin sinh viên...</span>
                          </div>
                        </div>
                      )}
                      
                      {!lookingUpStudent && newStudentCode.trim() && studentInfo.name && (
                        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                          <div className="flex items-start">
                            <div className="text-green-600">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-green-800">
                                Tìm thấy sinh viên
                              </p>
                              <p className="text-sm text-green-700">
                                <strong>Họ tên:</strong> {studentInfo.name}
                              </p>
                              {studentInfo.email && (
                                <p className="text-sm text-green-700">
                                  <strong>Email:</strong> {studentInfo.email}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {!lookingUpStudent && newStudentCode.trim() && !studentInfo.name && (
                        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                          <div className="flex items-start">
                            <div className="text-yellow-600">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-yellow-800">
                                Không tìm thấy sinh viên
                              </p>
                              <p className="text-sm text-yellow-700">
                                Mã số sinh viên "{newStudentCode}" không có trong hệ thống. Bạn vẫn có thể thêm sinh viên này.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <p className="mt-1 text-sm text-gray-500">
                        Nhập mã số sinh viên để thêm vào hoạt động
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleAddStudent}
                  disabled={addingStudent || !newStudentCode.trim()}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {addingStudent ? 'Đang thêm...' : 'Thêm sinh viên'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddStudentModal(false);
                    setNewStudentCode('');
                    setStudentInfo({});
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Hủy
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
            className="bg-white rounded-lg p-6 w-full max-w-md"
            style={{
              maxWidth: '28rem',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Chấm điểm sinh viên
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
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Sinh viên:</strong> {gradingParticipant.student_code || 'N/A'} - {gradingParticipant.student?.full_name || 'N/A'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số ngày CTXH <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={gradingData.actualDays}
                  onChange={(e) => setGradingData(prev => ({ ...prev, actualDays: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nhập số ngày"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ghi chú
                </label>
                <textarea
                  value={gradingData.note}
                  onChange={(e) => setGradingData(prev => ({ ...prev, note: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Nhập ghi chú (tùy chọn)"
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
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmitGrading}
                disabled={!gradingData.actualDays || gradingLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {gradingLoading ? (
                  <span className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Đang chấm điểm...
                  </span>
                ) : (
                  'Chấm điểm'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Grading Modal */}
      {showBulkGradingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Nhập danh sách chấm điểm</h3>
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
                <h4 className="text-sm font-medium text-blue-800 mb-2">📋 Hướng dẫn nhập dữ liệu chấm điểm</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>1. Tải file mẫu Excel <button onClick={handleDownloadGradingTemplate} className="text-blue-600 underline hover:text-blue-800">tại đây</button> và điền đầy đủ thông tin chấm điểm</li>
                  <li>2. Kiểm tra định dạng dữ liệu và đảm bảo không có lỗi</li>
                  <li>3. Tải file lên để tiến hành cập nhật điểm</li>
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
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
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
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleBulkGrading}
                disabled={!bulkGradingFile || bulkGradingLoading}
                className="px-4 py-2 bg-green-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkGradingLoading ? (
                  <span className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Đang chấm điểm...
                  </span>
                ) : (
                  'Chấm điểm hàng loạt'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ImportModal for Students */}
      {showStudentImportModal && (
        <ImportModal
          config={studentImportConfig}
          isOpen={showStudentImportModal}
          onClose={() => setShowStudentImportModal(false)}
        />
      )}

      {/* ImportModal for Grading */}
      {showGradingImportModal && (
        <ImportModal
          config={gradingImportConfig}
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