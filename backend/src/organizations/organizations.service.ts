import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository, Like, In } from 'typeorm';
import { Organization, OrganizationType } from '../entities/organization.entity';
import { UserOrganization, UserOrgRole } from '../entities/user-organization.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

// Interface cho Organization có thêm memberCount và hasChildren
type OrganizationWithExtras = Organization & {
  memberCount: number;
  hasChildren?: boolean;
};

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private organizationsRepository: TreeRepository<Organization>,
    @InjectRepository(UserOrganization)
    private userOrganizationsRepository: Repository<UserOrganization>,
  ) { }

  async create(createOrganizationDto: CreateOrganizationDto): Promise<Organization> {
    const { parentId, ...orgData } = createOrganizationDto;

    let parent = null;
    if (parentId) {
      parent = await this.organizationsRepository.findOne({ where: { id: parentId } });
      if (!parent) {
        throw new NotFoundException('Parent organization not found');
      }
    }

    const organization = this.organizationsRepository.create({
      ...orgData,
      parent,
    });

    return this.organizationsRepository.save(organization);
  }

  async findAll(): Promise<Organization[]> {
    return this.organizationsRepository.find({
      relations: ['parent', 'children'],
      order: { name: 'ASC' }
    });
  } async findTree(): Promise<OrganizationWithExtras[]> {
    // 1. Lấy cấu trúc cây tổ chức
    const organizations = await this.organizationsRepository.findTrees();

    // 2. Lấy số lượng thành viên cho mỗi tổ chức
    const orgIds = this.getAllOrganizationIds(organizations);
    const memberCountsMap = await this.getMemberCountsMap(orgIds);

    // 3. Thêm memberCount và hasChildren vào mỗi tổ chức
    return this.addMemberCountsToTree(organizations, memberCountsMap);
  }

  // Hàm lấy tất cả ID của tổ chức trong cây
  private getAllOrganizationIds(organizations: Organization[]): string[] {
    const ids: string[] = [];

    const extractIds = (orgs: Organization[]) => {
      for (const org of orgs) {
        ids.push(org.id);
        if (org.children && org.children.length > 0) {
          extractIds(org.children);
        }
      }
    };

    extractIds(organizations);
    return ids;
  }

  // Lấy map chứa số lượng thành viên cho mỗi tổ chức
  private async getMemberCountsMap(organizationIds: string[]): Promise<Map<string, number>> {
    if (organizationIds.length === 0) return new Map();

    // Query để đếm số lượng thành viên cho mỗi tổ chức
    const results = await this.userOrganizationsRepository
      .createQueryBuilder('uo')
      .select('uo.organizationId', 'orgId')
      .addSelect('COUNT(DISTINCT uo.userId)', 'count')
      .where('uo.organizationId IN (:...ids)', { ids: organizationIds })
      .groupBy('uo.organizationId')
      .getRawMany();

    // Tạo map từ kết quả
    const memberCountsMap = new Map<string, number>();
    for (const result of results) {
      memberCountsMap.set(result.orgId, parseInt(result.count, 10));
    }

    return memberCountsMap;
  }  // Thêm memberCount vào cây tổ chức
  private addMemberCountsToTree(
    organizations: Organization[],
    memberCountsMap: Map<string, number>
  ): OrganizationWithExtras[] {
    return organizations.map(org => {
      const memberCount = memberCountsMap.get(org.id) || 0;

      // Đệ quy cho children
      const children = org.children && org.children.length > 0
        ? this.addMemberCountsToTree(org.children, memberCountsMap)
        : []; const result = {
          ...org,
          memberCount,
          children: children as any,
          hasChildren: children.length > 0 // Thêm flag hasChildren
        } as OrganizationWithExtras;

      return result;
    });
  }


  async findByType(type: OrganizationType): Promise<Organization[]> {
    return this.organizationsRepository.find({
      where: { type },
      relations: ['parent', 'children'],
      order: { name: 'ASC' }
    });
  } async getAccessibleOrganizations(userId: string): Promise<Organization[]> {
    try {
      console.log(`[OrganizationsService] Getting organizations with payment-campaigns.create permission for user: ${userId}`);

      // Validate userId
      if (!userId) {
        console.error('[OrganizationsService] Invalid userId provided');
        throw new BadRequestException('Invalid user ID');
      }      // Check if user is super admin (has global system.access_admin permission)
      const superAdminQuery = `
        SELECT ur.id
        FROM user_roles ur
        JOIN roles r ON ur."roleId" = r.id
        JOIN role_permissions rp ON r.id = rp."roleId"
        JOIN permissions p ON rp."permissionId" = p.id
        WHERE ur."userId" = $1 
        AND ur."organizationId" IS NULL
        AND ur."isActive" = true
        AND (p.code = 'system.access_admin' OR r.name = 'super_admin')
        AND p."isActive" = true
        LIMIT 1
      `;

      const superAdminResult = await this.organizationsRepository.query(superAdminQuery, [userId]);

      if (superAdminResult.length > 0) {
        console.log(`[OrganizationsService] User ${userId} is super admin, returning all organizations`);        // Super admin can see all organizations
        return this.organizationsRepository.find({
          where: { isActive: true },
          order: { name: 'ASC' }
        });
      }      // Query for organizations where user has payment-campaigns.create permission
      const accessibleOrgsQuery = `
        SELECT DISTINCT o.id, o.name, o.code, o.type, o."parentId", o."createdAt", o."updatedAt", o."isActive"
        FROM user_roles ur
        JOIN roles r ON ur."roleId" = r.id
        JOIN role_permissions rp ON r.id = rp."roleId"
        JOIN permissions p ON rp."permissionId" = p.id
        JOIN organizations o ON ur."organizationId" = o.id
        WHERE ur."userId" = $1 
        AND ur."isActive" = true
        AND p.code = 'payment-campaigns.create'
        AND p."isActive" = true
        AND o."isActive" = true
        ORDER BY o.name ASC
      `;

      const accessibleOrganizations = await this.organizationsRepository.query(accessibleOrgsQuery, [userId]);

      console.log(`[OrganizationsService] Found ${accessibleOrganizations.length} organizations with payment-campaigns.create permission for user ${userId}`);      // Convert query results to Organization entities
      const organizationIds = accessibleOrganizations.map(row => row.id);

      if (organizationIds.length === 0) {
        return [];
      }      // Fetch full Organization entities with relations
      const organizations = await this.organizationsRepository.find({
        where: { id: In(organizationIds) },
        relations: ['parent'],
        order: { name: 'ASC' }
      });

      return organizations;
    } catch (error) {
      console.error('[OrganizationsService] Error getting accessible organizations:', error);
      throw error;
    }
  }

  async findOne(id: string): Promise<Organization> {
    const organization = await this.organizationsRepository.findOne({
      where: { id },
      relations: ['parent', 'children', 'members', 'members.user']
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async update(id: string, updateOrganizationDto: UpdateOrganizationDto): Promise<Organization> {
    const organization = await this.findOne(id);

    const { parentId, ...updateData } = updateOrganizationDto;

    if (parentId !== undefined) {
      if (parentId) {
        const parent = await this.organizationsRepository.findOne({ where: { id: parentId } });
        if (!parent) {
          throw new NotFoundException('Parent organization not found');
        }
        organization.parent = parent;
      } else {
        organization.parent = null;
      }
    }

    Object.assign(organization, updateData);
    return this.organizationsRepository.save(organization);
  }

  async remove(id: string): Promise<void> {
    const organization = await this.findOne(id);

    // Check if organization has children
    if (organization.children && organization.children.length > 0) {
      throw new BadRequestException('Cannot delete organization with child organizations');
    }

    await this.organizationsRepository.remove(organization);
  }
  async addMember(organizationId: string, userId: string, role: UserOrgRole = UserOrgRole.MEMBER): Promise<UserOrganization> {
    // Check if user is already a member
    const existingMembership = await this.userOrganizationsRepository.findOne({
      where: { organizationId, userId }
    });

    if (existingMembership) {
      throw new BadRequestException('User is already a member of this organization');
    }

    const membership = this.userOrganizationsRepository.create({
      organizationId,
      userId,
      role,
    });

    return this.userOrganizationsRepository.save(membership);
  }

  async addMemberWithParents(organizationId: string, userId: string, role: UserOrgRole = UserOrgRole.MEMBER): Promise<UserOrganization[]> {
    // Get the organization with all its ancestors
    const organization = await this.organizationsRepository.findOne({
      where: { id: organizationId },
      relations: ['parent']
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Get all ancestor organizations (including the target organization)
    const ancestorIds = await this.getAncestorIds(organizationId);
    ancestorIds.push(organizationId); // Include the target organization itself

    const memberships: UserOrganization[] = [];

    // Add user to each ancestor organization if not already a member
    for (const ancestorId of ancestorIds) {
      try {
        const membership = await this.addMember(ancestorId, userId, role);
        memberships.push(membership);
      } catch (error) {
        // If user is already a member, skip this organization
        if (error.message.includes('already a member')) {
          console.log(`User ${userId} is already a member of organization ${ancestorId}`);
          continue;
        }
        throw error;
      }
    }

    return memberships;
  }

  private async getAncestorIds(organizationId: string): Promise<string[]> {
    const ancestorIds: string[] = [];
    let currentId = organizationId;

    while (currentId) {
      const org = await this.organizationsRepository.findOne({
        where: { id: currentId },
        relations: ['parent']
      });

      if (!org) break;

      if (org.parent) {
        ancestorIds.push(org.parent.id);
        currentId = org.parent.id;
      } else {
        break;
      }
    }

    return ancestorIds;
  } async removeMember(organizationId: string, userId: string): Promise<void> {
    const membership = await this.userOrganizationsRepository.findOne({
      where: { organizationId, userId }
    });

    if (membership) {
      await this.userOrganizationsRepository.remove(membership);
    }

    const children = await this.organizationsRepository.find({
      where: { parent: { id: organizationId } }
    });

    for (const child of children) {
      await this.removeMember(child.id, userId);
    }
  }

  async removeMemberSafely(organizationId: string, userId: string): Promise<void> {
    // Get the organization being removed from
    const organization = await this.organizationsRepository.findOne({
      where: { id: organizationId },
      relations: ['parent']
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Remove user from this specific organization
    const membership = await this.userOrganizationsRepository.findOne({
      where: { organizationId, userId }
    });

    if (membership) {
      await this.userOrganizationsRepository.remove(membership);
    }

    // Remove user from all child organizations (they shouldn't be in child orgs if not in parent)
    const children = await this.organizationsRepository.find({
      where: { parent: { id: organizationId } }
    });

    for (const child of children) {
      await this.removeMemberSafely(child.id, userId);
    }

    // Check if user should be removed from parent organizations
    // Only remove from parent if user is not a member of any other child organizations
    if (organization.parent) {
      await this.checkAndRemoveFromParent(organization.parent.id, userId);
    }
  }

  private async checkAndRemoveFromParent(parentOrgId: string, userId: string): Promise<void> {
    // Get all child organizations of the parent
    const childOrganizations = await this.organizationsRepository.find({
      where: { parent: { id: parentOrgId } }
    });

    // Check if user is still a member of any child organization
    const remainingMemberships = await this.userOrganizationsRepository.find({
      where: {
        userId,
        organizationId: In(childOrganizations.map(child => child.id))
      }
    });

    // If user is not a member of any child organization, remove from parent
    if (remainingMemberships.length === 0) {
      const parentMembership = await this.userOrganizationsRepository.findOne({
        where: { organizationId: parentOrgId, userId }
      });

      if (parentMembership) {
        await this.userOrganizationsRepository.remove(parentMembership);

        // Recursively check grandparent
        const parentOrg = await this.organizationsRepository.findOne({
          where: { id: parentOrgId },
          relations: ['parent']
        });

        if (parentOrg && parentOrg.parent) {
          await this.checkAndRemoveFromParent(parentOrg.parent.id, userId);
        }
      }
    }
  } async bulkRemoveMembers(organizationId: string, userIds: string[]): Promise<void> {
    console.log('Starting bulkRemoveMembers:', { organizationId, userIds });

    if (!userIds || userIds.length === 0) {
      throw new BadRequestException('No user IDs provided');
    }

    // Check if organization exists
    const organization = await this.findOne(organizationId);
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Remove each user from the organization and all its children
    for (const userId of userIds) {
      await this.removeMember(organizationId, userId);
    }

    console.log('Completed bulkRemoveMembers for organization:', organizationId);
  }

  async getMembers(
    organizationId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ members: UserOrganization[], total: number, page: number, limit: number, totalPages: number }> {
    const offset = (page - 1) * limit;

    const [members, total] = await this.userOrganizationsRepository.findAndCount({
      where: { organizationId },
      relations: ['user'],
      order: { joinedAt: 'DESC' },
      take: limit,
      skip: offset
    });

    const totalPages = Math.ceil(total / limit);

    return {
      members,
      total,
      page, limit,
      totalPages
    };
  }

  // Lấy danh sách tổ chức con trực tiếp
  async findChildren(id: string): Promise<OrganizationWithExtras[]> {
    const organization = await this.organizationsRepository.findOne({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Chỉ lấy direct children (con trực tiếp), không lấy cấu trúc cây sâu hơn
    const children = await this.organizationsRepository.find({
      where: { parent: { id } },
      order: { name: 'ASC' }
    });

    // Nếu không có children, trả về mảng rỗng
    if (children.length === 0) {
      return [];
    }

    // Lấy tất cả ID của các tổ chức con
    const childrenIds = children.map(child => child.id);

    // Lấy số lượng thành viên cho mỗi tổ chức con
    const memberCountsMap = await this.getMemberCountsMap(childrenIds);

    // Kiểm tra mỗi child có children hay không
    const childrenWithHasChildren = await Promise.all(
      children.map(async (child) => {
        // Đếm số lượng con của child này
        const childrenCount = await this.organizationsRepository.count({
          where: { parent: { id: child.id } }
        }); const result = {
          ...child,
          memberCount: memberCountsMap.get(child.id) || 0,
          children: childrenCount > 0 ? [] as any : undefined, // Nếu có children thì set mảng rỗng, không thì undefined
          hasChildren: childrenCount > 0 // Thêm flag hasChildren
        } as OrganizationWithExtras;

        return result;
      })
    );

    return childrenWithHasChildren;
  }

  async getStats(): Promise<{
    doanStats: {
      total: number,
      doanTruong: number,
      doanCoSo: number,
      chiDoan: number,
      members: { total: number, doanTruong: number, doanCoSo: number, chiDoan: number }
    };
    hoiStats: {
      total: number,
      hoiSinhVienTruong: number,
      lienChiHoi: number,
      chiHoi: number,
      members: { total: number, hoiSinhVienTruong: number, lienChiHoi: number, chiHoi: number }
    };
    clbStats: {
      total: number,
      clbTruong: number,
      clbKhoa: number,
      members: { total: number, clbTruong: number, clbKhoa: number }
    };
    totalMembers: number;
  }> {
    // Đếm số lượng tổ chức theo loại (phần bên ngoài)
    const orgCountsResult = await this.organizationsRepository
      .createQueryBuilder('org')
      .select([
        'COUNT(CASE WHEN org.type = :doanTruong THEN 1 END) as "doanTruong"',
        'COUNT(CASE WHEN org.type = :doanCoSo THEN 1 END) as "doanCoSo"',
        'COUNT(CASE WHEN org.type = :chiDoan THEN 1 END) as "chiDoan"',
        'COUNT(CASE WHEN org.type = :hoiSinhVienTruong THEN 1 END) as "hoiSinhVienTruong"',
        'COUNT(CASE WHEN org.type = :lienChiHoi THEN 1 END) as "lienChiHoi"',
        'COUNT(CASE WHEN org.type = :chiHoi THEN 1 END) as "chiHoi"',
        'COUNT(CASE WHEN org.type = :clbTruong THEN 1 END) as "clbTruong"',
        'COUNT(CASE WHEN org.type = :clbKhoa THEN 1 END) as "clbKhoa"'
      ])
      .setParameters({
        doanTruong: OrganizationType.DOAN_TRUONG,
        doanCoSo: OrganizationType.DOAN_CO_SO,
        chiDoan: OrganizationType.CHI_DOAN,
        hoiSinhVienTruong: OrganizationType.HOI_SINH_VIEN_TRUONG,
        lienChiHoi: OrganizationType.LIEN_CHI_HOI,
        chiHoi: OrganizationType.CHI_HOI,
        clbTruong: OrganizationType.CLB_TRUONG,
        clbKhoa: OrganizationType.CLB_KHOA
      })
      .getRawOne();

    // Đếm số lượng thành viên trong từng loại tổ chức (phần members)
    const memberCountsResult = await this.userOrganizationsRepository
      .createQueryBuilder('uo')
      .innerJoin('uo.organization', 'org')
      .select([
        'COUNT(DISTINCT uo.userId) as "totalMembers"',
        'COUNT(DISTINCT CASE WHEN org.type = :doanTruong THEN uo.userId END) as "doanTruongMembers"',
        'COUNT(DISTINCT CASE WHEN org.type = :doanCoSo THEN uo.userId END) as "doanCoSoMembers"',
        'COUNT(DISTINCT CASE WHEN org.type = :chiDoan THEN uo.userId END) as "chiDoanMembers"',
        'COUNT(DISTINCT CASE WHEN org.type IN (:doanTruong, :doanCoSo, :chiDoan) THEN uo.userId END) as "totalDoanMembers"',

        'COUNT(DISTINCT CASE WHEN org.type = :hoiSinhVienTruong THEN uo.userId END) as "hoiSinhVienTruongMembers"',
        'COUNT(DISTINCT CASE WHEN org.type = :lienChiHoi THEN uo.userId END) as "lienChiHoiMembers"',
        'COUNT(DISTINCT CASE WHEN org.type = :chiHoi THEN uo.userId END) as "chiHoiMembers"',
        'COUNT(DISTINCT CASE WHEN org.type IN (:hoiSinhVienTruong, :lienChiHoi, :chiHoi) THEN uo.userId END) as "totalHoiMembers"',

        'COUNT(DISTINCT CASE WHEN org.type = :clbTruong THEN uo.userId END) as "clbTruongMembers"',
        'COUNT(DISTINCT CASE WHEN org.type = :clbKhoa THEN uo.userId END) as "clbKhoaMembers"',
        'COUNT(DISTINCT CASE WHEN org.type IN (:clbTruong, :clbKhoa) THEN uo.userId END) as "totalClbMembers"'
      ])
      .setParameters({
        doanTruong: OrganizationType.DOAN_TRUONG,
        doanCoSo: OrganizationType.DOAN_CO_SO,
        chiDoan: OrganizationType.CHI_DOAN,
        hoiSinhVienTruong: OrganizationType.HOI_SINH_VIEN_TRUONG,
        lienChiHoi: OrganizationType.LIEN_CHI_HOI,
        chiHoi: OrganizationType.CHI_HOI,
        clbTruong: OrganizationType.CLB_TRUONG,
        clbKhoa: OrganizationType.CLB_KHOA
      })
      .getRawOne();

    // Chuyển đổi kết quả số lượng tổ chức sang số
    const doanTruong = parseInt(orgCountsResult.doanTruong, 10) || 0;
    const doanCoSo = parseInt(orgCountsResult.doanCoSo, 10) || 0;
    const chiDoan = parseInt(orgCountsResult.chiDoan, 10) || 0;
    const hoiSinhVienTruong = parseInt(orgCountsResult.hoiSinhVienTruong, 10) || 0;
    const lienChiHoi = parseInt(orgCountsResult.lienChiHoi, 10) || 0;
    const chiHoi = parseInt(orgCountsResult.chiHoi, 10) || 0;
    const clbTruong = parseInt(orgCountsResult.clbTruong, 10) || 0;
    const clbKhoa = parseInt(orgCountsResult.clbKhoa, 10) || 0;

    // Chuyển đổi kết quả số lượng thành viên sang số
    const doanTruongMembers = parseInt(memberCountsResult.doanTruongMembers, 10) || 0;
    const doanCoSoMembers = parseInt(memberCountsResult.doanCoSoMembers, 10) || 0;
    const chiDoanMembers = parseInt(memberCountsResult.chiDoanMembers, 10) || 0;
    const totalDoanMembers = parseInt(memberCountsResult.totalDoanMembers, 10) || 0;

    const hoiSinhVienTruongMembers = parseInt(memberCountsResult.hoiSinhVienTruongMembers, 10) || 0;
    const lienChiHoiMembers = parseInt(memberCountsResult.lienChiHoiMembers, 10) || 0;
    const chiHoiMembers = parseInt(memberCountsResult.chiHoiMembers, 10) || 0;
    const totalHoiMembers = parseInt(memberCountsResult.totalHoiMembers, 10) || 0;

    const clbTruongMembers = parseInt(memberCountsResult.clbTruongMembers, 10) || 0;
    const clbKhoaMembers = parseInt(memberCountsResult.clbKhoaMembers, 10) || 0;
    const totalClbMembers = parseInt(memberCountsResult.totalClbMembers, 10) || 0;

    const totalMembers = parseInt(memberCountsResult.totalMembers, 10) || 0;

    return {
      doanStats: {
        // Số lượng tổ chức
        total: doanTruong + doanCoSo + chiDoan,
        doanTruong,
        doanCoSo,
        chiDoan,
        // Số lượng thành viên
        members: {
          total: totalDoanMembers,
          doanTruong: doanTruongMembers,
          doanCoSo: doanCoSoMembers,
          chiDoan: chiDoanMembers
        }
      },
      hoiStats: {
        // Số lượng tổ chức
        total: hoiSinhVienTruong + lienChiHoi + chiHoi,
        hoiSinhVienTruong,
        lienChiHoi,
        chiHoi,
        // Số lượng thành viên
        members: {
          total: totalHoiMembers,
          hoiSinhVienTruong: hoiSinhVienTruongMembers,
          lienChiHoi: lienChiHoiMembers,
          chiHoi: chiHoiMembers
        }
      },
      clbStats: {
        // Số lượng tổ chức
        total: clbTruong + clbKhoa,
        clbTruong,
        clbKhoa,
        // Số lượng thành viên
        members: {
          total: totalClbMembers,
          clbTruong: clbTruongMembers,
          clbKhoa: clbKhoaMembers
        }
      },
      totalMembers
    };
  }
  async getOrganizationByTypeAndCode(type: string, code: string): Promise<OrganizationWithExtras> {
    const organization = await this.organizationsRepository.findOne({
      where: {
        type: type as OrganizationType,
        code
      },
      relations: ['parent', 'children']
    });

    if (!organization) {
      throw new NotFoundException(`Organization with type ${type} and code ${code} not found`);
    }

    // Lấy tất cả ID cần tính memberCount (tổ chức hiện tại và các children)
    const orgIds = [organization.id];
    if (organization.children && organization.children.length > 0) {
      organization.children.forEach(child => orgIds.push(child.id));
    }

    // Lấy số lượng thành viên cho tổ chức hiện tại và các children
    const memberCountMap = await this.getMemberCountsMap(orgIds);    // Thêm memberCount và hasChildren vào organization và các children
    const result = {
      ...organization,
      memberCount: memberCountMap.get(organization.id) || 0,
      hasChildren: organization.children && organization.children.length > 0
    } as OrganizationWithExtras;

    // Thêm memberCount và hasChildren cho children nếu có
    if (result.children && result.children.length > 0) {
      // Lấy thông tin hasChildren cho từng child
      const childrenWithHasChildren = await Promise.all(
        result.children.map(async (child) => {
          const childrenCount = await this.organizationsRepository.count({
            where: { parent: { id: child.id } }
          }); const childResult = {
            ...child,
            memberCount: memberCountMap.get(child.id) || 0,
            hasChildren: childrenCount > 0
          } as OrganizationWithExtras;

          return childResult;
        })
      );

      result.children = childrenWithHasChildren as any;
    }

    return result;
  }

  async addMemberBySimpleCode(
    orgCode: string,
    userCode: string
  ): Promise<{ message: string, memberships: UserOrganization[] }> {
    // Tìm tổ chức theo code với quan hệ parent
    const organization = await this.organizationsRepository.findOne({
      where: { code: orgCode },
      relations: ['parent']
    });

    if (!organization) {
      throw new NotFoundException(`Organization with code ${orgCode} not found`);
    }

    // Tìm user theo code
    const userRepository = this.organizationsRepository.manager.getRepository('User');
    const user = await userRepository.findOne({
      where: { code: userCode }
    });

    if (!user) {
      throw new NotFoundException(`User with code ${userCode} not found`);
    }

    // Kiểm tra xem người dùng đã là thành viên của tổ chức này chưa
    const existingMembership = await this.userOrganizationsRepository.findOne({
      where: {
        organizationId: organization.id,
        userId: user.id
      }
    });

    // Nếu đã là thành viên, trả về lỗi BadRequestException
    if (existingMembership) {
      throw new BadRequestException(`User ${userCode} is already a member of organization ${orgCode}`);
    }

    // Danh sách tất cả các tổ chức cần thêm thành viên (tổ chức hiện tại + tất cả tổ chức cha)
    const allOrgs: Organization[] = [organization];

    // Tìm tất cả tổ chức cha
    let parentOrg = organization.parent;
    while (parentOrg) {
      allOrgs.push(parentOrg);
      // Lấy tổ chức cha tiếp theo
      parentOrg = await this.organizationsRepository.findOne({
        where: { id: parentOrg.id },
        relations: ['parent']
      });
      parentOrg = parentOrg?.parent;
    }

    // Danh sách memberships đã tạo
    const createdMemberships: UserOrganization[] = [];

    // Danh sách tổ chức mà người dùng đã là thành viên
    const existingOrgs: string[] = [];

    // Thêm thành viên vào tất cả tổ chức
    for (const org of allOrgs) {
      // Kiểm tra xem đã là thành viên chưa
      const membershipExists = await this.userOrganizationsRepository.findOne({
        where: {
          organizationId: org.id,
          userId: user.id
        }
      });

      // Nếu đã là thành viên, thêm vào danh sách tổ chức đã tồn tại
      if (membershipExists) {
        existingOrgs.push(org.name || org.code);
      } else {
        // Nếu chưa là thành viên, thêm vào
        const membership = this.userOrganizationsRepository.create({
          organizationId: org.id,
          userId: user.id,
          role: UserOrgRole.MEMBER
        });
        const savedMembership = await this.userOrganizationsRepository.save(membership);
        createdMemberships.push(savedMembership);
      }
    }

    let message = `User ${userCode} has been added to organization ${orgCode}`;

    // Nếu đã thêm vào các tổ chức cha
    if (createdMemberships.length > 1) {
      message += ` and ${createdMemberships.length - 1} parent organizations`;
    }

    // Nếu có tổ chức mà người dùng đã là thành viên
    if (existingOrgs.length > 0) {
      message += `. Note: User was already a member of: ${existingOrgs.join(', ')}`;
    }

    return {
      message,
      memberships: createdMemberships
    };
  }

}
