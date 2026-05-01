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
