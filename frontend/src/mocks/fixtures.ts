export const sampleReport = {
  student_code: 'TEST123',
  student_name: 'Nguyen Van Test',
  student_email: 'test@hcmut.edu',
  total_days_completed: 12,
  activities: [
    {
      id: 1,
      activity_name: 'Blood Donation',
      category_name: 'Volunteering',
      days_completed: 1,
      status: 'COMPLETED',
      completed_date: '2026-03-01',
      note: 'Donated blood at campus drive'
    }
  ]
};

export const sampleSummary = { total_days_completed: 12 };

export const sampleActivity = {
  id: 'a-1',
  title: 'Blood Donation',
  activity_name: 'Blood Donation',
  category_name: 'Volunteering',
  start_date: '2026-03-01',
  end_date: '2026-03-01',
  total_days: 1,
  requires_approval: false,
};

export const sampleParticipants = [
  { id: 'p-1', student_code: 'TEST123', status: 'COMPLETED', days_completed: 1 },
  { id: 'p-2', student_code: 'S002', status: 'REGISTERED', days_completed: 0 }
];

// Classes fixtures
export const sampleClass = {
  id: 'class-1',
  name: 'Lớp 10A1',
  code: 'L10A1',
  year: 2024,
  department: { id: 'dept-1', name: 'Ban Đoàn', code: 'DEPT_DOAN' },
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

export const sampleClasses = [
  sampleClass,
  {
    id: 'class-2',
    name: 'Lớp 10A2',
    code: 'L10A2',
    year: 2024,
    department: { id: 'dept-1', name: 'Ban Đoàn', code: 'DEPT_DOAN' },
    isActive: true,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  }
];

// Departments fixtures
export const sampleDepartment = {
  id: 'dept-1',
  name: 'Ban Đoàn',
  code: 'DEPT_DOAN',
  description: 'Department of Communist Youth Union',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

export const sampleDepartments = [
  sampleDepartment,
  {
    id: 'dept-2',
    name: 'Ban Hành Chính',
    code: 'DEPT_ADMIN',
    description: 'Administration Department',
    isActive: true,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  }
];

// Templates fixtures
export const sampleTemplate = {
  id: 'template-1',
  name: 'Mẫu báo cáo hoạt động',
  code: 'TEMPLATE_REPORT',
  status: 'ACTIVE',
  version: 1,
  description: 'Template for activity reports',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

export const sampleTemplates = [
  sampleTemplate,
  {
    id: 'template-2',
    name: 'Mẫu tờ rơi',
    code: 'TEMPLATE_FLYER',
    status: 'ACTIVE',
    version: 1,
    description: 'Template for flyers',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  }
];

// System Config fixtures
export const sampleSystemConfig = {
  id: 'config-1',
  accessKeyId: 'AKIA123456789EXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY',
  region: 'us-east-1',
  s3Bucket: 'doanhoi-portal',
  s3Endpoint: 'https://s3.amazonaws.com',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};
