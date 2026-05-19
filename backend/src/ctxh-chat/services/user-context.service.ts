import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';

/**
 * Provides user-specific context (department, org) for the RAG pipeline.
 * Keeps user-profile logic out of the RAG chain service.
 */
@Injectable()
export class UserContextService {
  private readonly logger = new Logger(UserContextService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * Returns the name of the user's training department (khoa đào tạo).
   * Used to automatically add an org filter when the student does not
   * explicitly mention a department in their query.
   *
   * @returns department name (e.g. "Khoa Khoa học & Kỹ thuật Máy tính") or null
   */
  async getTrainingDepartmentName(userId: string | undefined): Promise<string | null> {
    if (!userId) return null;

    try {
      const user = await this.userRepo.findOne({
        where: { id: userId },
        relations: ['trainingDepartment'],
      });

      const deptName = user?.trainingDepartment?.name ?? null;

      if (deptName) {
        this.logger.debug(`[UserContext] userId=${userId} -> dept="${deptName}"`);
      } else {
        this.logger.debug(`[UserContext] userId=${userId} -> no trainingDepartment`);
      }

      return deptName;
    } catch (error) {
      this.logger.error(`[UserContext] Failed to fetch dept for userId=${userId}`, error);
      return null;
    }
  }
}
