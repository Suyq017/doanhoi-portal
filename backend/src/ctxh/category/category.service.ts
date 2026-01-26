import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull, Not } from "typeorm";
import { CtxhCategory } from "../../entities/ctxh-category.entity";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { CategoryResponseDto } from "./dto/category-response.dto";
import { plainToClass } from "class-transformer";

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(CtxhCategory)
    private categoryRepository: Repository<CtxhCategory>,
  ) {}

  async findAll(queryParams?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: CategoryResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  }> {
    // Set default values
    const page = Math.max(1, queryParams?.page || 1);
    const limit = Math.min(Math.max(1, queryParams?.limit || 10), 100); // Giới hạn max 100 items
    const skip = (page - 1) * limit;

    const queryBuilder = this.categoryRepository
      .createQueryBuilder("category")
      .leftJoin(
        "category.activities",
        "activities",
        "activities.deleted_at IS NULL",
      )
      .addSelect("COUNT(activities.id)", "activities_count")
      .where("category.deleted_at IS NULL")
      .groupBy("category.id");

    // Add search functionality
    if (queryParams?.search) {
      queryBuilder.andWhere(
        "(category.name ILIKE :search OR category.description ILIKE :search)",
        { search: `%${queryParams.search}%` },
      );
    }

    queryBuilder.orderBy("category.created_at", "DESC");

    // Get total count efficiently using getCount() instead of fetching all data
    const total = await queryBuilder.getCount();

    // Apply pagination
    queryBuilder.skip(skip).take(limit);
    const rawResults = await queryBuilder.getRawAndEntities();

    const data = rawResults.entities.map((category, index) => {
      const dto = plainToClass(CategoryResponseDto, category, {
        excludeExtraneousValues: true,
      });
      dto.activities_count =
        parseInt(rawResults.raw[index].activities_count) || 0;
      return dto;
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    };
  }

  async findOne(id: string): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository
      .createQueryBuilder("category")
      .leftJoin(
        "category.activities",
        "activities",
        "activities.deleted_at IS NULL",
      )
      .addSelect("COUNT(activities.id)", "activities_count")
      .where("category.id = :id", { id })
      .andWhere("category.deleted_at IS NULL")
      .groupBy("category.id")
      .getRawAndEntities();

    if (!category.entities.length) {
      throw new NotFoundException(`Danh mục với ID ${id} không tồn tại`);
    }

    const dto = plainToClass(CategoryResponseDto, category.entities[0], {
      excludeExtraneousValues: true,
    });
    dto.activities_count = parseInt(category.raw[0].activities_count) || 0;

    return dto;
  }

  async create(
    createCategoryDto: CreateCategoryDto,
    createdBy: string,
  ): Promise<CategoryResponseDto> {
    // Check if category name already exists (globally since no organization restriction)
    const existingCategory = await this.categoryRepository.findOne({
      where: {
        name: createCategoryDto.name,
        deleted_at: IsNull(),
      },
    });

    if (existingCategory) {
      throw new ConflictException(
        `Danh mục "${createCategoryDto.name}" đã tồn tại`,
      );
    }

    const category = this.categoryRepository.create({
      ...createCategoryDto,
      created_by: createdBy,
    });

    const savedCategory = await this.categoryRepository.save(category);
    return this.findOne(savedCategory.id);
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
    updatedBy: string,
  ): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository.findOne({
      where: { id, deleted_at: IsNull() },
    });

    if (!category) {
      throw new NotFoundException(`Danh mục với ID ${id} không tồn tại`);
    }

    // Check name uniqueness if name is being updated (globally since no organization restriction)
    if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
      const existingCategory = await this.categoryRepository.findOne({
        where: {
          name: updateCategoryDto.name,
          deleted_at: IsNull(),
          id: Not(id),
        },
      });

      if (existingCategory) {
        throw new ConflictException(
          `Danh mục "${updateCategoryDto.name}" đã tồn tại`,
        );
      }
    }

    // Update category
    await this.categoryRepository.update(id, {
      ...updateCategoryDto,
      updated_by: updatedBy,
      updated_at: new Date(),
    });

    return this.findOne(id);
  }

  async softDelete(id: string, deletedBy: string): Promise<void> {
    const category = await this.categoryRepository.findOne({
      where: { id, deleted_at: IsNull() },
    });

    if (!category) {
      throw new NotFoundException(`Danh mục với ID ${id} không tồn tại`);
    }

    // Check if category has active activities
    const activitiesCount = await this.categoryRepository.manager
      .createQueryBuilder()
      .from("ctxh_activity", "activities")
      .where("activities.category_id = :id", { id })
      .andWhere("activities.deleted_at IS NULL")
      .getCount();

    if (activitiesCount > 0) {
      throw new BadRequestException(
        "Không thể xóa danh mục đã có hoạt động. Vui lòng xóa tất cả hoạt động trước.",
      );
    }

    // Soft delete
    await this.categoryRepository.update(id, {
      deleted_by: deletedBy,
      deleted_at: new Date(),
    });
  }

  async restore(id: string): Promise<CategoryResponseDto> {
    // Tìm danh mục đã bị xóa mềm (bao gồm cả soft deleted records)
    const category = await this.categoryRepository
      .createQueryBuilder("category")
      .withDeleted() // Quan trọng: bao gồm cả records đã bị soft delete
      .where("category.id = :id", { id })
      .getOne();

    if (!category) {
      throw new NotFoundException(`Danh mục với ID ${id} không tồn tại`);
    }

    // Kiểm tra xem danh mục có thực sự bị xóa không
    if (!category.deleted_at) {
      throw new BadRequestException(`Danh mục với ID ${id} chưa bị xóa`);
    }

    // Kiểm tra xem có danh mục nào đang active với cùng tên không
    const existingCategory = await this.categoryRepository.findOne({
      where: {
        name: category.name,
        deleted_at: IsNull(),
      },
    });

    if (existingCategory) {
      throw new ConflictException(
        `Không thể khôi phục. Danh mục "${category.name}" đã tồn tại`,
      );
    }

    // Restore using TypeORM recover method
    await this.categoryRepository.recover({ id });

    // Bỏ deleted_by thủ công
    await this.categoryRepository.update(id, {
      deleted_by: null,
    });

    return this.findOne(id);
  }
}
