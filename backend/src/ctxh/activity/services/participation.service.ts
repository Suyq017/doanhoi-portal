import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { CtxhParticipation, ParticipationStatus } from '../../../entities/ctxh-participation.entity';
import { CtxhActivity, ActivityStatus } from '../../../entities/ctxh-activity.entity';
import { User } from '../../../entities/user.entity';
import { ParticipationResponseDto } from '../dto/participation-response.dto';
import { plainToClass } from 'class-transformer';

@Injectable()
export class ParticipationService {
  constructor(
    @InjectRepository(CtxhParticipation)
    private participationRepository: Repository<CtxhParticipation>,
    @InjectRepository(CtxhActivity)
    private activityRepository: Repository<CtxhActivity>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findByActivity(activityId: string): Promise<ParticipationResponseDto[]> {
    const participations = await this.participationRepository
      .createQueryBuilder('participation')
      .where('participation.activity_id = :activityId', { activityId })
      .andWhere('participation.deleted_at IS NULL')
      .orderBy('participation.created_at', 'DESC')
      .getMany();

    // Get unique student codes
    const studentCodes = [...new Set(participations.map(p => p.student_code))];
    
    // Create lookup map
    const userMap = new Map();
    
    // Only load user info if there are student codes
    if (studentCodes.length > 0) {
      const users = await this.userRepository
        .createQueryBuilder('user')
        .where('user.code IN (:...codes)', { codes: studentCodes })
        .getMany();
      
      users.forEach(user => {
        userMap.set(user.code, user);
      });
    }

    return participations.map(p => {
      const user = userMap.get(p.student_code);
      return plainToClass(ParticipationResponseDto, {
        ...p,
        student_code: p.student_code,
        student: {
          id: user?.id || null,
          student_code: p.student_code,
          full_name: user?.familyName && user?.givenName 
            ? `${user.familyName} ${user.givenName}`.trim()
            : null,
          email: user?.email || null,
        }
      }, { excludeExtraneousValues: true });
    });
  }

  async addStudent(
    activityId: string, 
    studentCode: string, 
    createdBy: string
  ): Promise<ParticipationResponseDto> {
    // Validate activity exists and is not deleted
    const activity = await this.activityRepository.findOne({
      where: { id: activityId, deleted_at: IsNull() },
    });

    if (!activity) {
      throw new NotFoundException(`Hoạt động với ID ${activityId} không tồn tại`);
    }

    // Check if activity status is ACTIVE - only allow adding students to ACTIVE activities
    if (activity.status !== ActivityStatus.ACTIVE) {
      throw new BadRequestException(
        `Chỉ có thể thêm sinh viên vào hoạt động có trạng thái ACTIVE. Trạng thái hiện tại: ${activity.status}`
      );
    }

    // BACKEND VALIDATION: Check if student exists in users table
    const user = await this.userRepository.findOne({
      where: { code: studentCode },
      select: ['id', 'code', 'familyName', 'givenName', 'email']
    });

    if (!user) {
      throw new BadRequestException(
        `Không tìm thấy sinh viên với mã số ${studentCode} trong hệ thống`
      );
    }

    // Check if student code already participated in this activity
    const existingParticipation = await this.participationRepository.findOne({
      where: {
        activity_id: activityId,
        student_code: studentCode,
        deleted_at: IsNull(),
      },
    });

    if (existingParticipation) {
      throw new BadRequestException(
        `Sinh viên ${studentCode} đã tham gia hoạt động này`
      );
    }

    // Create participation with validated user information
    const participation = this.participationRepository.create({
      activity_id: activityId,
      student_code: studentCode,
      student_id: user.id, // Now we have the user ID
      status: ParticipationStatus.REGISTERED,
      created_by: createdBy,
    });

    const savedParticipation = await this.participationRepository.save(participation);

    return plainToClass(ParticipationResponseDto, {
      ...savedParticipation,
      student_code: studentCode,
      student: {
        id: user.id,
        student_code: studentCode,
        full_name: `${user.familyName} ${user.givenName}`.trim(),
        email: user.email,
      }
    }, { excludeExtraneousValues: true });
  }

  async addMultipleStudents(
    activityId: string,
    studentCodes: string[],
    createdBy: string
  ): Promise<{
    successful: ParticipationResponseDto[];
    failed: { studentCode: string; error: string }[];
  }> {
    // Pre-validate activity once to avoid repeating validation for each student
    const activity = await this.activityRepository.findOne({
      where: { id: activityId, deleted_at: IsNull() },
    });

    if (!activity) {
      throw new NotFoundException(`Hoạt động với ID ${activityId} không tồn tại`);
    }

    if (activity.status !== ActivityStatus.ACTIVE) {
      throw new BadRequestException(
        `Chỉ có thể thêm sinh viên vào hoạt động có trạng thái ACTIVE. Trạng thái hiện tại: ${activity.status}`
      );
    }

    const successful: ParticipationResponseDto[] = [];
    const failed: { studentCode: string; error: string }[] = [];

    // Get existing participations for this activity to avoid duplicate queries
    const existingParticipations = await this.participationRepository.find({
      where: {
        activity_id: activityId,
        deleted_at: IsNull(),
      },
      select: ['student_code'],
    });

    const existingStudentCodes = new Set(
      existingParticipations.map(p => p.student_code).filter(Boolean)
    );

    for (const studentCode of studentCodes) {
      try {
        // Check for duplicates using our pre-loaded set
        if (existingStudentCodes.has(studentCode)) {
          failed.push({
            studentCode,
            error: `Sinh viên ${studentCode} đã tham gia hoạt động này`,
          });
          continue;
        }

        // BACKEND VALIDATION: Check if student exists in users table
        const user = await this.userRepository.findOne({
          where: { code: studentCode },
          select: ['id', 'code', 'familyName', 'givenName', 'email']
        });

        if (!user) {
          failed.push({
            studentCode,
            error: `Không tìm thấy sinh viên với mã số ${studentCode} trong hệ thống`,
          });
          continue;
        }

        // Create participation with validated user information
        const participation = this.participationRepository.create({
          activity_id: activityId,
          student_code: studentCode,
          student_id: user.id, // Now we have the user ID
          status: ParticipationStatus.REGISTERED,
          created_by: createdBy,
        });

        const savedParticipation = await this.participationRepository.save(participation);

        const participationResponse = plainToClass(ParticipationResponseDto, {
          ...savedParticipation,
          student_code: studentCode,
          student: {
            id: user.id,
            student_code: studentCode,
            full_name: `${user.familyName} ${user.givenName}`.trim(),
            email: user.email,
          }
        }, { excludeExtraneousValues: true });

        successful.push(participationResponse);
        
        // Add to existing set to prevent duplicates within the same batch
        existingStudentCodes.add(studentCode);

      } catch (error) {
        failed.push({
          studentCode,
          error: error.message,
        });
      }
    }

    return { successful, failed };
  }

  async gradeParticipation(
    participationId: string,
    actualDays: number,
    note: string,
    gradedBy: string
  ): Promise<ParticipationResponseDto> {
    const participation = await this.participationRepository.findOne({
      where: { id: participationId, deleted_at: IsNull() },
    });

    if (!participation) {
      throw new NotFoundException(`Participation với ID ${participationId} không tồn tại`);
    }

    // Update participation
    await this.participationRepository.update(participationId, {
      actual_days: actualDays,
      note,
      graded_by: gradedBy,
      status: ParticipationStatus.COMPLETED,
      updated_by: gradedBy,
      updated_at: new Date(),
    });

    // Fetch updated participation
    const updatedParticipation = await this.participationRepository.findOne({
      where: { id: participationId },
    });

    return plainToClass(ParticipationResponseDto, {
      ...updatedParticipation,
      student_code: updatedParticipation.student_code, // Map student_code to root level
      student: {
        id: updatedParticipation.student_id,
        student_code: updatedParticipation.student_code,
        full_name: null, // No user data available
        email: null, // No user data available
      }
    }, { excludeExtraneousValues: true });
  }

  async removeParticipant(
    participationId: string,
    deletedBy: string
  ): Promise<void> {
    const participation = await this.participationRepository.findOne({
      where: { id: participationId, deleted_at: IsNull() },
    });

    if (!participation) {
      throw new NotFoundException(`Participation với ID ${participationId} không tồn tại`);
    }

    // Soft delete
    await this.participationRepository.update(participationId, {
      deleted_by: deletedBy,
      deleted_at: new Date(),
    });
  }

  async bulkGradeFromExcel(
    activityId: string,
    gradingData: { studentCode: string; actualDays: number; note: string; }[],
    gradedBy: string
  ): Promise<{
    successful: { studentCode: string; message: string; }[];
    failed: { studentCode: string; error: string; }[];
  }> {
    const successful: { studentCode: string; message: string; }[] = [];
    const failed: { studentCode: string; error: string; }[] = [];

    // Validate activity exists
    const activity = await this.activityRepository.findOne({
      where: { id: activityId, deleted_at: IsNull() },
    });

    if (!activity) {
      throw new NotFoundException(`Hoạt động với ID ${activityId} không tồn tại`);
    }

    // Process each grading record
    for (const data of gradingData) {
      try {
        // Find participation by activity_id and student_code
        const participation = await this.participationRepository.findOne({
          where: {
            activity_id: activityId,
            student_code: data.studentCode,
            deleted_at: IsNull(),
          },
        });

        if (!participation) {
          failed.push({
            studentCode: data.studentCode,
            error: `Sinh viên ${data.studentCode} không tham gia hoạt động này`,
          });
          continue;
        }

        // Update participation with grading info
        await this.participationRepository.update(participation.id, {
          actual_days: data.actualDays,
          note: data.note,
          graded_by: gradedBy,
          status: ParticipationStatus.COMPLETED,
          updated_by: gradedBy,
          updated_at: new Date(),
        });

        successful.push({
          studentCode: data.studentCode,
          message: `Đã chấm ${data.actualDays} ngày CTXH`,
        });

      } catch (error) {
        failed.push({
          studentCode: data.studentCode,
          error: error.message || 'Lỗi không xác định',
        });
      }
    }

    return { successful, failed };
  }
}