import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Class } from '../entities/class.entity';
import { Department } from '../entities/department.entity';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { QueryClassDto } from './dto/query-class.dto';

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(Class)
    private classesRepository: Repository<Class>,
    @InjectRepository(Department)
    private departmentsRepository: Repository<Department>,
  ) {}

  async create(createClassDto: CreateClassDto): Promise<Class> {
    // Check if class with same name already exists
    const existingClass = await this.classesRepository.findOne({
      where: { name: createClassDto.name }
    });

    if (existingClass) {
      throw new BadRequestException('Class with this name already exists');
    }

    // Validate department if provided
    if (createClassDto.departmentId) {
      const department = await this.departmentsRepository.findOne({
        where: { id: createClassDto.departmentId }
      });
      if (!department) {
        throw new BadRequestException('Department not found');
      }
    }

    const classEntity = this.classesRepository.create(createClassDto);
    return this.classesRepository.save(classEntity);
  }

  async findAll(query: QueryClassDto): Promise<{ classes: Class[], total: number }> {
    const { page = 1, limit = 10, search, year, departmentId, isActive } = query;
    
    const queryBuilder = this.classesRepository.createQueryBuilder('class')
      .leftJoinAndSelect('class.department', 'department')
      .leftJoinAndSelect('class.students', 'students');

    // Search functionality
    if (search) {
      queryBuilder.where('class.name ILIKE :search', {
        search: `%${search}%`
      });
    }

    // Filter by year
    if (year !== undefined) {
      queryBuilder.andWhere('class.year = :year', { year });
    }

    // Filter by department
    if (departmentId) {
      queryBuilder.andWhere('class.departmentId = :departmentId', { departmentId });
    }

    // Filter by active status
    if (isActive !== undefined) {
      queryBuilder.andWhere('class.isActive = :isActive', { isActive });
    }

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Order by created date
    queryBuilder.orderBy('class.createdAt', 'DESC');

    const [classes, total] = await queryBuilder.getManyAndCount();

    return { classes, total };
  }

  async findOne(id: string): Promise<Class> {
    const classEntity = await this.classesRepository.findOne({
      where: { id },
      relations: ['department', 'students']
    });

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    return classEntity;
  }

  async update(id: string, updateClassDto: UpdateClassDto): Promise<Class> {
    const classEntity = await this.findOne(id);

    // Check for duplicate name if updating
    if (updateClassDto.name) {
      const existingClass = await this.classesRepository.findOne({
        where: { name: updateClassDto.name }
      });

      if (existingClass && existingClass.id !== id) {
        throw new BadRequestException('Class with this name already exists');
      }
    }

    // Validate department if provided
    if (updateClassDto.departmentId) {
      const department = await this.departmentsRepository.findOne({
        where: { id: updateClassDto.departmentId }
      });
      if (!department) {
        throw new BadRequestException('Department not found');
      }
    }

    Object.assign(classEntity, updateClassDto);
    return this.classesRepository.save(classEntity);
  }

  async remove(id: string): Promise<void> {
    const classEntity = await this.classesRepository.findOne({
      where: { id },
      relations: ['students']
    });

    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }

    // Check if class has students
    if (classEntity.students && classEntity.students.length > 0) {
      throw new BadRequestException('Cannot delete class with students. Please move students first.');
    }

    await this.classesRepository.remove(classEntity);
  }
}
