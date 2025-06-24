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
  ) {}

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
    const department = await this.departmentsRepository.findOne({
      where: { id },
      relations: ['managementUsers', 'trainingUsers']
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

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
    
    // Check if department has users
    const hasUsers = department.managementUsers?.length > 0 || department.trainingUsers?.length > 0;
    if (hasUsers) {
      throw new BadRequestException('Cannot delete department with associated users');
    }

    await this.departmentsRepository.remove(department);
  }
}
