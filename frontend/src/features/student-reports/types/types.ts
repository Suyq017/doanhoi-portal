// Student Reports Types

export enum ParticipationStatus {
  REGISTERED = 'REGISTERED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface ActivityParticipation {
  id: string;
  activity_id: string;
  activity_name: string;
  organization_name?: string;
  category_name?: string;
  start_date: string;
  end_date: string;
  total_days: number;
  actual_days: number | null;
  days_completed?: number; // Field từ API response
  status: ParticipationStatus;
  created_at: string;
  updated_at: string;
  note?: string;
  required_days?: number; // Field từ API response
  completed_date?: string; // Field từ API response
  is_qualified?: boolean; // Field từ API response
}

export interface StudentReport {
  student_id?: string | null;
  student_code: string;
  student_name?: string | null;
  student_email?: string | null;
  total_activities: number;
  total_days: number;
  completed_activities: number;
  cancelled_activities: number;
  activities: ActivityParticipation[];
  summary: {
    total_registered_days: number;
    total_completed_days: number;
    completion_rate: number;
    remaining_days_needed?: number;
  };
  // Thêm fields từ API response
  total_activities_participated?: number;
  total_days_completed?: number;
}

export interface StudentReportQueryParams {
  period?: 'all' | 'current_semester' | 'current_year' | 'custom';
  start_date?: string;
  end_date?: string;
  status?: ParticipationStatus;
  category_id?: string;
  organization_id?: string;
}

export interface ExportOptions {
  format: 'pdf' | 'excel';
  include_summary?: boolean;
  include_activities?: boolean;
  period?: StudentReportQueryParams['period'];
  start_date?: string;
  end_date?: string;
}

export interface DashboardSummary {
  total_activities: number;
  total_days: number;
  completed_activities: number;
  remaining_days_needed?: number;
  completion_percentage: number;
  recent_activities: ActivityParticipation[];
}