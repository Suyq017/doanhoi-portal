import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository, Like, In } from 'typeorm';
import { Organization, OrganizationType } from '../entities/organization.entity';
import { UserOrganization, UserRole } from '../entities/user-organization.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

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
  }

  async findTree(): Promise<Organization[]> {
    // 1. Lấy cấu trúc cây tổ chức
    const organizations = await this.organizationsRepository.findTrees();

    // 2. Lấy số lượng thành viên cho mỗi tổ chức
    const orgIds = this.getAllOrganizationIds(organizations);
    const memberCountsMap = await this.getMemberCountsMap(orgIds);

    // 3. Thêm memberCount vào mỗi tổ chức
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
  }

  // Thêm memberCount vào cây tổ chức
  private addMemberCountsToTree(
    organizations: Organization[],
    memberCountsMap: Map<string, number>
  ): Organization[] {
    return organizations.map(org => {
      const memberCount = memberCountsMap.get(org.id) || 0;

      // Đệ quy cho children
      const children = org.children && org.children.length > 0
        ? this.addMemberCountsToTree(org.children, memberCountsMap)
        : [];

      return {
        ...org,
        slug: org.slug, // Ensure slug is included
        memberCount,
        children
      } as Organization & { memberCount: number };
    });
  }


  async findByType(type: OrganizationType): Promise<Organization[]> {
    return this.organizationsRepository.find({
      where: { type },
      relations: ['parent', 'children'],
      order: { name: 'ASC' }
    });
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

  async addMember(organizationId: string, userId: string, role: UserRole = UserRole.MEMBER): Promise<UserOrganization> {
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
  async removeMember(organizationId: string, userId: string): Promise<void> {
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
  async bulkRemoveMembers(organizationId: string, userIds: string[]): Promise<void> {

    if (!userIds || userIds.length === 0) {
      throw new BadRequestException('No user IDs provided');
    }

    // Check if organization exists
    const organization = await this.findOne(organizationId);
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Find all memberships
    const memberships = await this.userOrganizationsRepository.find({
      where: {
        organizationId,
        userId: In(userIds)
      }
    });

    if (memberships.length !== userIds.length) {
      const foundUserIds = memberships.map(m => m.userId);
      const notFoundUserIds = userIds.filter(id => !foundUserIds.includes(id));
      throw new NotFoundException(`Memberships not found for users: ${notFoundUserIds.join(', ')}`);
    }

    // Remove all memberships
    await this.userOrganizationsRepository.remove(memberships);
  }

  async getMembers(organizationId: string): Promise<UserOrganization[]> {
    return this.userOrganizationsRepository.find({
      where: { organizationId },
      relations: ['user'],
      order: { joinedAt: 'DESC' }
    });
  }
  // Lấy danh sách tổ chức con trực tiếp
  async findChildren(id: string): Promise<Organization[]> {
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

    // Thêm memberCount vào mỗi tổ chức con
    return children.map(child => {
      return {
        ...child,
        memberCount: memberCountsMap.get(child.id) || 0
      } as Organization & { memberCount: number };
    });
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

  async getOrganizationByTypeAndCode(type: string, code: string): Promise<Organization> {
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
    const memberCountMap = await this.getMemberCountsMap(orgIds);

    // Thêm memberCount vào organization và các children
    const result = {
      ...organization,
      memberCount: memberCountMap.get(organization.id) || 0
    } as Organization & { memberCount: number };

    // Thêm memberCount cho children nếu có
    if (result.children && result.children.length > 0) {
      result.children = result.children.map(child => ({
        ...child,
        memberCount: memberCountMap.get(child.id) || 0
      })) as any;
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
          role: UserRole.MEMBER
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
