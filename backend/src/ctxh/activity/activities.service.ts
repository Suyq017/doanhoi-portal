import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull } from "typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { CtxhActivity } from "../../entities/ctxh-activity.entity";
import { CtxhCategory } from "../../entities/ctxh-category.entity";
import {
  CtxhLimitConfig,
  LimitConfigStatus,
} from "../../entities/ctxh-limit-config.entity";
import { Organization } from "../../entities/organization.entity";
import { CreateActivityDto } from "./dto/create-activity.dto";
import { UpdateActivityDto } from "./dto/update-activity.dto";
import { ActivityResponseDto } from "./dto/activity-response.dto";
import { OrganizationsService } from "../../organizations/organizations.service";
import {
  ActivityCreatedEvent,
  ActivityUpdatedEvent,
  ActivityDeletedEvent,
  ActivityRestoredEvent,
  ActivityStatusChangedEvent,
  ACTIVITY_EVENTS,
} from "./events/activity.events";

interface FindAllOptions {
  page: number;
  limit: number;
  category_id?: string;
  organization_id?: string;
  status?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
  user_id?: string;
}

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectRepository(CtxhActivity)
    private activityRepository: Repository<CtxhActivity>,
    @InjectRepository(CtxhCategory)
    private categoryRepository: Repository<CtxhCategory>,
    @InjectRepository(CtxhLimitConfig)
    private limitConfigRepository: Repository<CtxhLimitConfig>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    private organizationsService: OrganizationsService,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async create(
    createActivityDto: CreateActivityDto,
    createdBy: string,
  ): Promise<ActivityResponseDto> {
    // 1. Validate organization access
    const hasAccess = await this.validateUserOrganizationAccess(
      createdBy,
      createActivityDto.organization_id,
    );

    if (!hasAccess) {
      throw new BadRequestException(
        "Bạn không có quyền tạo hoạt động cho tổ chức này",
      );
    }

    // Validate category exists
    const category = await this.categoryRepository.findOne({
      where: { id: createActivityDto.category_id, deleted_at: IsNull() },
    });

    if (!category) {
      throw new NotFoundException(
        `Danh mục với ID ${createActivityDto.category_id} không tồn tại`,
      );
    }

    // Check for duplicate activity name in the same category
    const existingActivity = await this.activityRepository.findOne({
      where: {
        name: createActivityDto.name,
        category_id: createActivityDto.category_id,
        deleted_at: IsNull(),
      },
    });

    if (existingActivity) {
      throw new ConflictException(
        `Hoạt động "${createActivityDto.name}" đã tồn tại trong danh mục này`,
      );
    }

    // Check organization day limit if total_days is provided and status is ACTIVE
    if (createActivityDto.total_days && createActivityDto.status === "ACTIVE") {
      const limitConfig = await this.limitConfigRepository.findOne({
        where: {
          organization_id: createActivityDto.organization_id,
          status: LimitConfigStatus.ACTIVE,
          deleted_at: IsNull(),
        },
      });

      if (limitConfig && createActivityDto.total_days > limitConfig.max_days) {
        throw new BadRequestException(
          `Tổng số ngày hoạt động (${createActivityDto.total_days}) vượt quá giới hạn cho phép (${limitConfig.max_days} ngày)`,
        );
      }
    }

    const activity = this.activityRepository.create({
      ...createActivityDto,
      created_by: createdBy,
    });

    const savedActivity = await this.activityRepository.save(activity);

    // 🔥 Emit event — CtxhVectorSyncService sẽ đẩy job embedding vào BullMQ
    this.eventEmitter.emit(
      ACTIVITY_EVENTS.CREATED,
      new ActivityCreatedEvent(savedActivity.id, savedActivity.name, createdBy),
    );

    return this.findOne(savedActivity.id);
  }

  async findAll(options: FindAllOptions) {
    // Set default values
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(Math.max(1, options.limit || 10), 100); // Giới hạn max 100 items
    const {
      category_id,
      organization_id,
      status,
      search,
      start_date,
      end_date,
      user_id,
    } = options;

    const skip = (page - 1) * limit;

    const queryBuilder = this.activityRepository
      .createQueryBuilder("activity")
      .leftJoinAndSelect("activity.category", "category")
      .leftJoinAndSelect("activity.organization", "organization")
      .where("activity.deleted_at IS NULL")
      .orderBy("activity.created_at", "DESC");

    // Check if user has global CTXH activities view permission
    if (user_id) {
      // First check if user is super admin or has global ctxh.activities.view permission
      const globalPermissionQuery = `
        SELECT ur.id
        FROM user_roles ur
        JOIN roles r ON ur."roleId" = r.id
        JOIN role_permissions rp ON r.id = rp."roleId"
        JOIN permissions p ON rp."permissionId" = p.id
        WHERE ur."userId" = $1 
        AND ur."organizationId" IS NULL
        AND ur."isActive" = true
        AND (p.code = 'ctxh.activities.view' OR p.code = 'system.access_admin' OR r.name = 'super_admin')
        AND p."isActive" = true
        LIMIT 1
      `;

      const globalPermissionResult = await this.organizationRepository.query(
        globalPermissionQuery,
        [user_id],
      );

      if (globalPermissionResult.length > 0) {
        console.log(
          "[DEBUG] User has global CTXH view permission, no organization filter applied",
        );
        // User has global permission, no need to filter by organizations
      } else {
        // User doesn't have global permission, filter by accessible organizations
        const accessibleOrgs =
          await this.organizationsService.getCtxhActivityViewableOrganizations(
            user_id,
          );
        const accessibleOrgIds = accessibleOrgs.map((org) => org.id);

        console.log("[DEBUG] User accessible organizations:", {
          userId: user_id,
          accessibleOrgs: accessibleOrgs.length,
          orgIds: accessibleOrgIds,
        });

        if (accessibleOrgIds.length > 0) {
          // Get all children organizations using recursive CTE (Common Table Expression)
          // This is more reliable than closure table and works natively in PostgreSQL
          const childrenQuery = `
          WITH RECURSIVE org_tree AS (
            -- Base case: start with accessible organizations
            SELECT id, "parentId"
            FROM organizations
            WHERE id IN (${accessibleOrgIds.map((_, i) => `$${i + 1}`).join(",")})
            
            UNION ALL
            
            -- Recursive case: get children
            SELECT o.id, o."parentId"
            FROM organizations o
            INNER JOIN org_tree ot ON o."parentId" = ot.id
          )
          SELECT DISTINCT id FROM org_tree
        `;

          const childrenResult = await this.organizationRepository.query(
            childrenQuery,
            accessibleOrgIds,
          );

          // Extract org IDs from query result
          const allAccessibleOrgIds = childrenResult.map((row: any) => row.id);

          console.log("[DEBUG] Organization filter results:", {
            userId: user_id,
            parentOrgs: accessibleOrgIds.length,
            totalAccessible: allAccessibleOrgIds.length,
            allAccessibleIds: allAccessibleOrgIds,
          });

          queryBuilder.andWhere("activity.organization_id IN (:...orgIds)", {
            orgIds: allAccessibleOrgIds,
          });
        } else {
          // User has no accessible organizations, return empty result
          console.log(
            "[ActivitiesService] User has no accessible organizations",
          );
          queryBuilder.andWhere("1 = 0"); // Always false condition
        }
      }
    }

    // Filter by category_id if provided
    if (category_id) {
      queryBuilder.andWhere("activity.category_id = :category_id", {
        category_id,
      });
    }

    // Filter by specific organization_id if provided (must be within accessible orgs)
    if (organization_id) {
      queryBuilder.andWhere("activity.organization_id = :organization_id", {
        organization_id,
      });
    }

    // Filter by status if provided
    if (status) {
      queryBuilder.andWhere("activity.status = :status", { status });
    }

    // Filter by search term if provided (search in name and description)
    if (search && search.trim()) {
      queryBuilder.andWhere(
        "(LOWER(activity.name) LIKE LOWER(:search) OR LOWER(activity.description) LIKE LOWER(:search))",
        { search: `%${search.trim()}%` },
      );
    }

    // Filter by date range if provided
    // Activity overlaps with the filter date range if:
    // 1. Activity starts before filter ends AND activity ends after filter starts
    // 2. OR activity has no end date but starts within the range
    if (start_date || end_date) {
      console.log("🔍 Date filtering - Start:", start_date, "End:", end_date);

      if (start_date && end_date) {
        // Both dates provided - activity must overlap with the range
        console.log(
          "📅 Applying date range filter: activity must overlap with",
          start_date,
          "to",
          end_date,
        );
        queryBuilder.andWhere(
          "(activity.start_date <= :end_date AND (activity.end_date IS NULL OR activity.end_date >= :start_date))",
          { start_date, end_date },
        );
      } else if (start_date) {
        // Only start date - activity must end after or on this date, or have no end date
        console.log(
          "📅 Applying start date filter: activity must end after",
          start_date,
        );
        queryBuilder.andWhere(
          "(activity.end_date IS NULL OR activity.end_date >= :start_date)",
          { start_date },
        );
      } else if (end_date) {
        // Only end date - activity must start before or on this date
        console.log(
          "📅 Applying end date filter: activity must start before",
          end_date,
        );
        queryBuilder.andWhere("activity.start_date <= :end_date", { end_date });
      }
    }

    const [activities, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    // Debug: Log the first activity to see what data we're getting
    if (activities.length > 0) {
      console.log("First activity raw data:", {
        id: activities[0].id,
        name: activities[0].name,
        organization_id: activities[0].organization_id,
        organization: activities[0].organization,
        category_id: activities[0].category_id,
        category: activities[0].category,
      });

      // Check if the organization exists in the database
      if (activities[0].organization_id) {
        const orgExists = await this.organizationRepository.findOne({
          where: { id: activities[0].organization_id },
        });
        console.log("Organization exists in DB:", !!orgExists, orgExists?.name);
      }

      // Check if the category exists in the database
      if (activities[0].category_id) {
        const catExists = await this.categoryRepository.findOne({
          where: { id: activities[0].category_id, deleted_at: IsNull() },
        });
        console.log("Category exists in DB:", !!catExists, catExists?.name);
      }
    }

    // Manual population of organization and category names if JOIN failed
    const enrichedActivities = await Promise.all(
      activities.map(async (activity) => {
        console.log("Activity organization before:", activity.organization);
        console.log("Activity organization_id:", activity.organization_id);
        console.log("Organization checks:", {
          exists: !!activity.organization,
          hasName: !!activity.organization?.name,
          keysLength: activity.organization
            ? Object.keys(activity.organization).length
            : "null",
          jsonString: JSON.stringify(activity.organization),
          jsonEquals: JSON.stringify(activity.organization) === "{}",
        });

        // If organization is empty object or doesn't have name, and organization_id exists, fetch it manually
        if (
          activity.organization_id &&
          (!activity.organization ||
            !activity.organization.name ||
            Object.keys(activity.organization).length === 0 ||
            JSON.stringify(activity.organization) === "{}")
        ) {
          console.log(
            "Manually fetching organization for:",
            activity.organization_id,
          );
          const org = await this.organizationRepository.findOne({
            where: { id: activity.organization_id },
            select: ["id", "name"],
          });
          console.log("Fetched organization:", org);
          if (org) {
            activity.organization = { id: org.id, name: org.name } as any;
            console.log("Set activity.organization to:", activity.organization);
          }
        }

        // If category is empty object or doesn't have name, and category_id exists, fetch it manually
        console.log("Activity category before:", activity.category);
        console.log("Activity category_id:", activity.category_id);
        console.log("Category checks:", {
          exists: !!activity.category,
          hasName: !!activity.category?.name,
          keysLength: activity.category
            ? Object.keys(activity.category).length
            : "null",
          jsonString: JSON.stringify(activity.category),
          jsonEquals: JSON.stringify(activity.category) === "{}",
        });

        if (
          activity.category_id &&
          (!activity.category ||
            !activity.category.name ||
            Object.keys(activity.category).length === 0 ||
            JSON.stringify(activity.category) === "{}")
        ) {
          console.log("Manually fetching category for:", activity.category_id);
          const cat = await this.categoryRepository.findOne({
            where: { id: activity.category_id, deleted_at: IsNull() },
            select: ["id", "name"],
          });
          console.log("Fetched category:", cat);
          if (cat) {
            activity.category = { id: cat.id, name: cat.name } as any;
            console.log("Set activity.category to:", activity.category);
          }
        }

        return activity;
      }),
    );

    console.log(
      "Final enriched activities before DTO transform:",
      JSON.stringify(enrichedActivities[0], null, 2),
    );

    // Instead of using plainToClass with excludeExtraneousValues, manually map the data
    const data = enrichedActivities.map((activity) => ({
      id: activity.id,
      name: activity.name,
      description: activity.description,
      location: activity.location, // Add location field
      category_id: activity.category_id,
      category: activity.category,
      organization_id: activity.organization_id,
      organization: activity.organization,
      start_date: activity.start_date,
      end_date: activity.end_date,
      total_days: activity.total_days,
      status: activity.status,
      created_by: activity.created_by,
      created_at: activity.created_at,
      updated_by: activity.updated_by,
      updated_at: activity.updated_at,
    }));

    console.log("Final manual mapped data:", JSON.stringify(data[0], null, 2));

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

  async findOne(id: string): Promise<ActivityResponseDto> {
    const activity = await this.activityRepository
      .createQueryBuilder("activity")
      .leftJoinAndSelect("activity.category", "category")
      .leftJoinAndSelect("activity.organization", "organization")
      .where("activity.id = :id", { id })
      .andWhere("activity.deleted_at IS NULL")
      .getOne();

    if (!activity) {
      throw new NotFoundException(`Hoạt động với ID ${id} không tồn tại`);
    }

    // Manual population if JOIN failed or returned empty objects
    if (
      activity.organization_id &&
      (!activity.organization ||
        !activity.organization.name ||
        Object.keys(activity.organization).length === 0 ||
        JSON.stringify(activity.organization) === "{}")
    ) {
      console.log(
        "Manually fetching organization for activity:",
        activity.organization_id,
      );
      const org = await this.organizationRepository.findOne({
        where: { id: activity.organization_id },
        select: ["id", "name"],
      });
      console.log("Fetched organization:", org);
      if (org) {
        activity.organization = { id: org.id, name: org.name } as any;
        console.log("Set activity.organization to:", activity.organization);
      }
    }

    if (
      activity.category_id &&
      (!activity.category ||
        !activity.category.name ||
        Object.keys(activity.category).length === 0 ||
        JSON.stringify(activity.category) === "{}")
    ) {
      console.log(
        "Manually fetching category for activity:",
        activity.category_id,
      );
      const cat = await this.categoryRepository.findOne({
        where: { id: activity.category_id, deleted_at: IsNull() },
        select: ["id", "name"],
      });
      console.log("Fetched category:", cat);
      if (cat) {
        activity.category = { id: cat.id, name: cat.name } as any;
        console.log("Set activity.category to:", activity.category);
      }
    }

    // Manual mapping to preserve manually populated data
    return {
      id: activity.id,
      name: activity.name,
      description: activity.description,
      location: activity.location, // Add location field
      category_id: activity.category_id,
      category: activity.category,
      organization_id: activity.organization_id,
      organization: activity.organization,
      start_date: activity.start_date,
      end_date: activity.end_date,
      total_days: activity.total_days,
      status: activity.status,
      created_by: activity.created_by,
      created_at: activity.created_at,
      updated_by: activity.updated_by,
      updated_at: activity.updated_at,
    } as ActivityResponseDto;
  }

  async update(
    id: string,
    updateActivityDto: UpdateActivityDto,
    updatedBy: string,
  ): Promise<ActivityResponseDto> {
    const activity = await this.activityRepository.findOne({
      where: { id, deleted_at: IsNull() },
    });

    if (!activity) {
      throw new NotFoundException(`Hoạt động với ID ${id} không tồn tại`);
    }

    // Validate category if provided
    if (updateActivityDto.category_id) {
      const category = await this.categoryRepository.findOne({
        where: { id: updateActivityDto.category_id, deleted_at: IsNull() },
      });

      if (!category) {
        throw new NotFoundException(
          `Danh mục với ID ${updateActivityDto.category_id} không tồn tại`,
        );
      }
    }

    // Check for duplicate name if name or category is being updated
    if (updateActivityDto.name || updateActivityDto.category_id) {
      const checkName = updateActivityDto.name || activity.name;
      const checkCategoryId =
        updateActivityDto.category_id || activity.category_id;

      const existingActivity = await this.activityRepository.findOne({
        where: {
          name: checkName,
          category_id: checkCategoryId,
          deleted_at: IsNull(),
        },
      });

      if (existingActivity && existingActivity.id !== id) {
        throw new ConflictException(
          `Hoạt động "${checkName}" đã tồn tại trong danh mục này`,
        );
      }
    }

    // Check organization day limit if total_days is being updated and status is ACTIVE
    const finalTotalDays = updateActivityDto.total_days ?? activity.total_days;
    const finalStatus = updateActivityDto.status ?? activity.status;
    const finalOrgId =
      updateActivityDto.organization_id ?? activity.organization_id;

    if (finalTotalDays && finalStatus === "ACTIVE") {
      const limitConfig = await this.limitConfigRepository.findOne({
        where: {
          organization_id: finalOrgId,
          status: LimitConfigStatus.ACTIVE,
          deleted_at: IsNull(),
        },
      });

      if (limitConfig && finalTotalDays > limitConfig.max_days) {
        throw new BadRequestException(
          `Tổng số ngày hoạt động (${finalTotalDays}) vượt quá giới hạn cho phép (${limitConfig.max_days} ngày)`,
        );
      }
    }

    // Lưu trạng thái cũ trước khi update để phát hiện status_changed
    const oldStatus = activity.status;
    const changedFields = Object.keys(updateActivityDto);

    await this.activityRepository.update(id, {
      ...updateActivityDto,
      updated_by: updatedBy,
      updated_at: new Date(),
    });

    // 🔥 Emit STATUS_CHANGED nếu status thay đổi
    if (updateActivityDto.status && updateActivityDto.status !== oldStatus) {
      this.eventEmitter.emit(
        ACTIVITY_EVENTS.STATUS_CHANGED,
        new ActivityStatusChangedEvent(id, activity.name, oldStatus, updateActivityDto.status),
      );
    }

    // 🔥 Emit UPDATED nếu có field nội dung thay đổi
    if (changedFields.length > 0) {
      this.eventEmitter.emit(
        ACTIVITY_EVENTS.UPDATED,
        new ActivityUpdatedEvent(id, activity.name, changedFields, updatedBy),
      );
    }

    return this.findOne(id);
  }

  async remove(id: string, deletedBy: string): Promise<{ message: string }> {
    const activity = await this.activityRepository.findOne({
      where: { id, deleted_at: IsNull() },
      relations: ["participations"],
    });

    if (!activity) {
      throw new NotFoundException(`Hoạt động với ID ${id} không tồn tại`);
    }

    // Check if activity has participants
    const activeParticipations =
      activity.participations?.filter((p) => !p.deleted_at) || [];
    if (activeParticipations.length > 0) {
      throw new ConflictException(
        `Không thể xóa hoạt động này vì đang có ${activeParticipations.length} sinh viên tham gia. Vui lòng xóa tất cả sinh viên tham gia trước khi xóa hoạt động.`,
      );
    }

    await this.activityRepository.update(id, {
      deleted_by: deletedBy,
      deleted_at: new Date(),
    });

    // 🔥 Emit event — xóa vector embedding khỏi store
    this.eventEmitter.emit(
      ACTIVITY_EVENTS.DELETED,
      new ActivityDeletedEvent(id, activity.name, deletedBy),
    );

    return { message: "Xóa hoạt động thành công" };
  }

  async restore(id: string, updatedBy: string): Promise<ActivityResponseDto> {
    const activity = await this.activityRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!activity) {
      throw new NotFoundException(`Hoạt động với ID ${id} không tồn tại`);
    }

    if (!activity.deleted_at) {
      throw new ConflictException(`Hoạt động với ID ${id} chưa bị xóa`);
    }

    // Check for duplicate name when restoring
    const existingActivity = await this.activityRepository.findOne({
      where: {
        name: activity.name,
        organization_id: activity.organization_id,
        deleted_at: IsNull(),
      },
    });

    if (existingActivity) {
      throw new ConflictException(
        `Không thể khôi phục vì hoạt động "${activity.name}" đã tồn tại trong tổ chức này`,
      );
    }

    await this.activityRepository.update(id, {
      deleted_by: null,
      deleted_at: null,
      updated_by: updatedBy,
      updated_at: new Date(),
    });

    // 🔥 Emit event — re-embed activity đã phục hồi
    this.eventEmitter.emit(
      ACTIVITY_EVENTS.RESTORED,
      new ActivityRestoredEvent(id, activity.name, updatedBy),
    );

    return this.findOne(id);
  }

  /**
   * Validate if user has permission to create activities for an organization
   */
  private async validateUserOrganizationAccess(
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    // Check if user has ctxh.activities.create permission for this organization
    const query = `
      WITH RECURSIVE org_ancestors AS (
        -- Base case: start with the target organization
        SELECT id, "parentId"
        FROM organizations
        WHERE id = $2
        
        UNION ALL
        
        -- Recursive case: get parent organizations
        SELECT o.id, o."parentId"
        FROM organizations o
        INNER JOIN org_ancestors oa ON o.id = oa."parentId"
      )
      SELECT ur.id
      FROM user_roles ur
      JOIN roles r ON ur."roleId" = r.id
      JOIN role_permissions rp ON r.id = rp."roleId"
      JOIN permissions p ON rp."permissionId" = p.id
      WHERE ur."userId" = $1 
      AND ur."isActive" = true
      AND p.code = 'ctxh.activities.create'
      AND p."isActive" = true
      AND (
        -- Super admin (no org restriction)
        ur."organizationId" IS NULL
        OR 
        -- Has permission for this specific org or any ancestor org
        ur."organizationId" IN (SELECT id FROM org_ancestors)
      )
      LIMIT 1
    `;

    const result = await this.activityRepository.query(query, [
      userId,
      organizationId,
    ]);
    return result.length > 0;
  }
}
