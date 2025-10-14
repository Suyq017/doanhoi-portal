import React from 'react';
import { StudentReport } from '../types';

interface StudentReportCardProps {
  report: StudentReport;
  className?: string;
}

export const StudentReportCard: React.FC<StudentReportCardProps> = ({ 
  report, 
  className = '' 
}) => {
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {report.student_name || report.student_code}
        </h3>
        <p className="text-sm text-gray-600">{report.student_email}</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-blue-50 p-3 rounded">
          <p className="text-sm text-blue-600 font-medium">Tổng hoạt động</p>
          <p className="text-2xl font-bold text-blue-800">{report.total_activities}</p>
        </div>
        <div className="bg-green-50 p-3 rounded">
          <p className="text-sm text-green-600 font-medium">Hoàn thành</p>
          <p className="text-2xl font-bold text-green-800">{report.completed_activities}</p>
        </div>
      </div>
      
      <div className="border-t pt-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Tiến độ hoàn thành</span>
          <span className="font-semibold">{report.summary.completion_rate}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div 
            className="bg-blue-600 h-2 rounded-full" 
            style={{ width: `${report.summary.completion_rate}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default StudentReportCard;