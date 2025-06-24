import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository } from 'typeorm';
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
  ) {}

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
    return this.organizationsRepository.findTrees();
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

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    await this.userOrganizationsRepository.remove(membership);
  }

  async getMembers(organizationId: string): Promise<UserOrganization[]> {
    return this.userOrganizationsRepository.find({
      where: { organizationId },
      relations: ['user'],
      order: { joinedAt: 'DESC' }
    });
  }
}
