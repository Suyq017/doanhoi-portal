import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from '../entities/department.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { QueryDepartmentDto } from './dto/query-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private departmentsRepository: Repository<Department>,
  ) { }

  async create(createDepartmentDto: CreateDepartmentDto): Promise<Department> {
    // Check if department with same name or code already exists
    const existingDepartment = await this.departmentsRepository.findOne({
      where: [
        { name: createDepartmentDto.name },
        ...(createDepartmentDto.code ? [{ code: createDepartmentDto.code }] : [])
      ]
    });

    if (existingDepartment) {
      throw new BadRequestException('Department with this name or code already exists');
    }

    const department = this.departmentsRepository.create(createDepartmentDto);
    return this.departmentsRepository.save(department);
  }

  async findAll(query: QueryDepartmentDto): Promise<{ departments: Department[], total: number }> {
    const { page = 1, limit = 10, search, isActive } = query;

    const queryBuilder = this.departmentsRepository.createQueryBuilder('department');

    // Search filter
    if (search) {
      queryBuilder.andWhere(
        '(department.name ILIKE :search OR department.code ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Active status filter
    if (isActive !== undefined) {
      queryBuilder.andWhere('department.isActive = :isActive', { isActive });
    }

    // Order by created date desc
    queryBuilder.orderBy('department.createdAt', 'DESC');

    // Pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [departments, total] = await queryBuilder.getManyAndCount();

    return { departments, total };
  }

  async findOne(id: string): Promise<Department> {
    // First get department basic info
    const department = await this.departmentsRepository.findOne({
      where: { id }
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    // Then get user counts in separate optimized queries
    const [managementUserCount, trainingUserCount] = await Promise.all([
      this.departmentsRepository
        .createQueryBuilder('department')
        .leftJoin('department.managementUsers', 'managementUser')
        .select('COUNT(managementUser.id)', 'count')
        .where('department.id = :id', { id })
        .getRawOne()
        .then(result => parseInt(result.count, 10)),

      this.departmentsRepository
        .createQueryBuilder('department')
        .leftJoin('department.trainingUsers', 'trainingUser')
        .select('COUNT(trainingUser.id)', 'count')
        .where('department.id = :id', { id })
        .getRawOne()
        .then(result => parseInt(result.count, 10))
    ]);

    // Attach counts to department
    (department as any).managementUserCount = managementUserCount;
    (department as any).trainingUserCount = trainingUserCount;

    return department;
  }

  async update(id: string, updateDepartmentDto: UpdateDepartmentDto): Promise<Department> {
    const department = await this.findOne(id);

    // Check if department with same name or code already exists (excluding current)
    if (updateDepartmentDto.name || updateDepartmentDto.code) {
      const existingDepartment = await this.departmentsRepository.findOne({
        where: [
          ...(updateDepartmentDto.name ? [{ name: updateDepartmentDto.name }] : []),
          ...(updateDepartmentDto.code ? [{ code: updateDepartmentDto.code }] : [])
        ]
      });

      if (existingDepartment && existingDepartment.id !== id) {
        throw new BadRequestException('Department with this name or code already exists');
      }
    }

    Object.assign(department, updateDepartmentDto);
    return this.departmentsRepository.save(department);
  }

  async remove(id: string): Promise<void> {
    const department = await this.findOne(id);

    // Check if department has users using counts
    const hasUsers = (department as any).managementUserCount > 0 || (department as any).trainingUserCount > 0;
    if (hasUsers) {
      throw new BadRequestException('Cannot delete department with associated users');
    }

    await this.departmentsRepository.remove(department);
  }

  async bulkRemove(ids: string[]): Promise<{ deleted: number; errors: Array<{ id: string; error: string }> }> {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('No department IDs provided');
    }

    const errors: Array<{ id: string; error: string }> = [];
    let deleted = 0;

    for (const id of ids) {
      try {
        // Use findOne which now returns department with user counts
        const department = await this.findOne(id);

        // Check if department has users using counts
        const hasUsers = (department as any).managementUserCount > 0 || (department as any).trainingUserCount > 0;
        if (hasUsers) {
          errors.push({ id, error: 'Cannot delete department with associated users' });
          continue;
        }

        await this.departmentsRepository.remove(department);
        deleted++;
      } catch (error) {
        if (error instanceof NotFoundException) {
          errors.push({ id, error: 'Department not found' });
        } else {
          errors.push({ id, error: error.message || 'Unknown error occurred' });
        }
      }
    }

    return {
      deleted,
      errors
    };
  }

  /**
   * Validate department codes existence
   * @param codes - Array of department codes to validate
   * @returns Object with valid and invalid codes
   */
  async validateDepartmentCodes(codes: string[]): Promise<{
    validCodes: string[];
    invalidCodes: string[];
  }> {
    if (!codes || codes.length === 0) {
      return { validCodes: [], invalidCodes: [] };
    }

    // Get unique codes (case-insensitive)
    const uniqueCodes = [...new Set(codes.map(code => code.toUpperCase()))];

    // Find departments with these codes
    const departments = await this.departmentsRepository
      .createQueryBuilder('department')
      .where('UPPER(department.code) IN (:...codes)', { codes: uniqueCodes })
      .getMany();

    // Create set of found codes
    const foundCodesSet = new Set(
      departments.map(dept => dept.code.toUpperCase())
    );

    // Separate valid and invalid codes
    const validCodes: string[] = [];
    const invalidCodes: string[] = [];

    for (const code of codes) {
      const upperCode = code.toUpperCase();
      if (foundCodesSet.has(upperCode)) {
        validCodes.push(code);
      } else {
        invalidCodes.push(code);
      }
    }

    return { validCodes, invalidCodes };
  }
}
