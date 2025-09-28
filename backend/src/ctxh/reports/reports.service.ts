import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { CtxhActivity } from '../../entities/ctxh-activity.entity';
import { CtxhCategory } from '../../entities/ctxh-category.entity';
import { CtxhParticipation, ParticipationStatus } from '../../entities/ctxh-participation.entity';
import { CtxhLimitConfig } from '../../entities/ctxh-limit-config.entity';
import { User } from '../../entities/user.entity';
import { StudentReportDto, ActivityReportItemDto } from './dto/student-report.dto';
import { OrganizationReportDto } from './dto/organization-report.dto';
import { SystemReportDto } from './dto/system-report.dto';
import { plainToClass } from 'class-transformer';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(CtxhActivity)
    private activityRepository: Repository<CtxhActivity>,
    @InjectRepository(CtxhCategory)
    private categoryRepository: Repository<CtxhCategory>,
    @InjectRepository(CtxhParticipation)
    private participationRepository: Repository<CtxhParticipation>,
    @InjectRepository(CtxhLimitConfig)
    private limitConfigRepository: Repository<CtxhLimitConfig>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getStudentReportByCode(studentCode: string): Promise<StudentReportDto> {
    // Get student's participations with manual joins to ensure data is loaded
    const participations = await this.participationRepository
      .createQueryBuilder('participation')
      .leftJoin('ctxh_activity', 'activity', 'participation.activity_id = activity.id AND activity.deleted_at IS NULL')
      .leftJoin('ctxh_category', 'category', 'activity.category_id = category.id AND category.deleted_at IS NULL')
      .select([
        'participation.*',
        'activity.id as activity_id',
        'activity.name as activity_name', 
        'activity.start_date as activity_start_date',
        'activity.end_date as activity_end_date',
        'activity.total_days as activity_total_days',
        'category.id as category_id',
        'category.name as category_name'
      ])
      .where('participation.student_code = :studentCode', { studentCode })
      .andWhere('participation.deleted_at IS NULL')
      .orderBy('activity.start_date', 'DESC')
      .getRawMany();

    // Debug: Log raw query results
    console.log('Raw query results:', participations);

    if (participations.length === 0) {
      // Check if student code exists in any participation
      const anyParticipation = await this.participationRepository.findOne({
        where: { student_code: studentCode }
      });
      
      if (!anyParticipation) {
        throw new NotFoundException(`Không tìm thấy sinh viên với mã số ${studentCode}`);
      }
    }

    // Calculate total days completed
    const completedParticipations = participations.filter(p => p.status === 'COMPLETED');
    const totalDaysCompleted = completedParticipations.reduce((sum, p) => sum + (p.actual_days || 0), 0);
    const totalActivities = participations.length;
    
    // Debug: Log participation data
    console.log('Participations found:', participations.map(p => ({
      activity_name: p.activity_name,
      category_name: p.category_name,
      actual_days: p.actual_days,
      status: p.status,
      updated_at: p.updated_at
    })));
    
    // Prepare activities data for the DTO format
    const activities = participations.map(p => ({
      activity_name: p.activity_name || '',
      category_name: p.category_name || '',
      days_completed: p.actual_days || 0,
      status: p.status,
      completed_date: p.status === 'COMPLETED' ? p.updated_at : undefined,
      created_at: p.created_at, // Add created_at for participation date
    }));

    // Debug: Log transformed activities
    console.log('Transformed activities:', activities);

    // Assuming required days is a fixed requirement (can be configured)
    const requiredDays = 15; // Standard CTXH requirement - updated to 15 days
    const isQualified = totalDaysCompleted >= requiredDays;

    return plainToClass(StudentReportDto, {
      student_id: null, // No student ID available
      student_code: studentCode,
      student_name: null, // No user data available
      student_email: null, // No user data available  
      total_days_completed: totalDaysCompleted,
      total_activities_participated: totalActivities,
      required_days: requiredDays,
      is_qualified: isQualified,
      activities,
    }, { excludeExtraneousValues: true });
  }

  // Keep old method for backward compatibility if needed
  async getStudentReport(studentId: string): Promise<StudentReportDto> {
    // Verify student exists
    const student = await this.userRepository.findOne({
      where: { id: studentId },
      select: ['id', 'code', 'fullName', 'email'],
    });

    if (!student) {
      throw new NotFoundException(`Sinh viên với ID ${studentId} không tồn tại`);
    }

    // Get student's participations
    const participations = await this.participationRepository
      .createQueryBuilder('participation')
      .leftJoinAndSelect('participation.activity', 'activity')
      .leftJoinAndSelect('activity.category', 'category')
      .where('participation.student_id = :studentId', { studentId })
      .andWhere('participation.deleted_at IS NULL')
      .andWhere('activity.deleted_at IS NULL')
      .getMany();

    // Calculate totals
    const totalDaysCompleted = participations
      .filter(p => p.status === ParticipationStatus.COMPLETED)
      .reduce((sum, p) => sum + (p.actual_days || 0), 0);

    const totalActivitiesParticipated = participations.length;

    // Get required days (assuming 20 as default, can be configured)
    const requiredDays = 20; // This should come from CtxhLimitConfig based on student's organization

    const isQualified = totalDaysCompleted >= requiredDays;

    // Format activities data
    const activities = participations.map(p => ({
      activity_name: p.activity?.name || '',
      category_name: p.activity?.category?.name || '',
      days_completed: p.actual_days || 0,
      status: p.status,
      completed_date: p.status === ParticipationStatus.COMPLETED ? p.updated_at : undefined,
    }));

    return plainToClass(StudentReportDto, {
      student_id: student.id,
      student_code: student.code,
      student_name: student.fullName,
      student_email: student.email,
      total_days_completed: totalDaysCompleted,
      total_activities_participated: totalActivitiesParticipated,
      required_days: requiredDays,
      is_qualified: isQualified,
      activities,
    }, { excludeExtraneousValues: true });
  }

  async getSystemReport(): Promise<SystemReportDto> {
    // Get total counts
    const totalCategories = await this.categoryRepository.count({
      where: { deleted_at: IsNull() }
    });

    const totalActivities = await this.activityRepository.count({
      where: { deleted_at: IsNull() }
    });

    const totalParticipations = await this.participationRepository.count({
      where: { deleted_at: IsNull() }
    });

    const totalCompletedParticipations = await this.participationRepository.count({
      where: { 
        status: ParticipationStatus.COMPLETED,
        deleted_at: IsNull() 
      }
    });

    // Get unique students count - using student_code instead of student_id
    const uniqueStudents = await this.participationRepository
      .createQueryBuilder('participation')
      .select('DISTINCT participation.student_code')
      .where('participation.deleted_at IS NULL')
      .getRawMany();

    const totalStudentsRegistered = uniqueStudents.length;

    // Calculate qualified students - using student_code
    const studentDays = await this.participationRepository
      .createQueryBuilder('participation')
      .select('participation.student_code', 'studentCode')
      .addSelect('SUM(participation.actual_days)', 'totalDays')
      .where('participation.status = :status', { status: ParticipationStatus.COMPLETED })
      .andWhere('participation.deleted_at IS NULL')
      .groupBy('participation.student_code')
      .getRawMany();

    const totalStudentsQualified = studentDays.filter(s => s.totalDays >= 15).length; // Updated to 15 days
    const overallQualificationRate = totalStudentsRegistered > 0 
      ? (totalStudentsQualified / totalStudentsRegistered) * 100 
      : 0;

    // Calculate total days allocated
    const totalDaysResult = await this.participationRepository
      .createQueryBuilder('participation')
      .select('SUM(participation.actual_days)', 'total')
      .where('participation.status = :status', { status: ParticipationStatus.COMPLETED })
      .andWhere('participation.deleted_at IS NULL')
      .getRawOne();

    const totalDaysAllocated = parseInt(totalDaysResult?.total || '0');

    // Categories summary - using raw SQL query to ensure proper results
    const categoriesSummary = await this.categoryRepository.query(`
      SELECT 
        c.id as category_id,
        c.name as category_name,
        COALESCE(COUNT(DISTINCT a.id), 0) as activities_count,
        COALESCE(COUNT(DISTINCT p.id), 0) as participants_count,
        COALESCE(SUM(CASE WHEN p.status = 'COMPLETED' THEN p.actual_days ELSE 0 END), 0) as total_days_allocated
      FROM ctxh_category c
      LEFT JOIN ctxh_activity a ON c.id = a.category_id AND a.deleted_at IS NULL
      LEFT JOIN ctxh_participation p ON a.id = p.activity_id AND p.deleted_at IS NULL
      WHERE c.deleted_at IS NULL
      GROUP BY c.id, c.name
      ORDER BY c.name
    `);

    // Monthly stats (simplified)
    const monthlyStats: any[] = []; // Would need complex query for time-based statistics

    return {
      total_categories: totalCategories,
      total_activities: totalActivities,
      total_participations: totalParticipations,
      total_completed_participations: totalCompletedParticipations,
      total_students_registered: totalStudentsRegistered,
      total_students_qualified: totalStudentsQualified,
      overall_qualification_rate: Math.round(overallQualificationRate * 100) / 100,
      total_days_allocated: totalDaysAllocated,
      categories_summary: categoriesSummary.map(c => ({
        category_id: c.category_id,
        category_name: c.category_name,
        activities_count: parseInt(c.activities_count || '0'),
        participants_count: parseInt(c.participants_count || '0'),
        total_days_allocated: parseInt(c.total_days_allocated || '0'),
      })),
      monthly_stats: monthlyStats,
    };
  }
}