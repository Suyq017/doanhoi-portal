import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In, Not, IsNull } from "typeorm";
import { User, AuthProvider } from "../entities/user.entity";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { QueryUserDto } from "./dto/query-user.dto";
import { UserRoleAssignmentDto } from "./dto/user-role-assignment.dto";
import { RolesService } from "../roles/roles.service";
import { OrganizationsService } from "../organizations/organizations.service";
import * as bcrypt from "bcryptjs";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private rolesService: RolesService,
    private organizationsService: OrganizationsService,
  ) { }
  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if user with email or code already exists
    const existingUser = await this.usersRepository.findOne({
      where: [{ email: createUserDto.email }, { code: createUserDto.code }],
    });

    if (existingUser) {
      throw new BadRequestException(
        "User with this email or code already exists",
      );
    }

    // Hash password if provided
    const { roleId, organizationId, roles, roleAssignments, ...userData } =
      createUserDto;
    let userPassword: string = "";
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    } else {
      userPassword = this.generatePasswordFromEmail(userData.email);
      userData.password = await bcrypt.hash(userPassword, 10);
    }

    // Handle date conversion
    const userDataWithDates = {
      ...userData,
      birthDate: userData.birthDate ? new Date(userData.birthDate) : undefined,
    };

    const user = this.usersRepository.create(userDataWithDates);
    const savedUser = await this.usersRepository.save(user); // Handle organization membership (including parent organizations)
    if (organizationId && organizationId.trim() !== "") {
      try {
        await this.organizationsService.addMemberWithParents(
          organizationId,
          savedUser.id,
        );
      } catch (error) {
        console.warn("Failed to add user to organization:", error.message);
        // Don't throw error - user creation should succeed even if organization assignment fails
      }
    }

    // Handle role assignments - Priority order:
    // 1. New roleAssignments array (preferred)
    // 2. Legacy roles array + organizationId
    // 3. Legacy single roleId + organizationId

    if (
      roleAssignments &&
      Array.isArray(roleAssignments) &&
      roleAssignments.length > 0
    ) {
      // NEW: Handle multiple role-organization assignments
      await this.assignMultipleRoles(savedUser.id, roleAssignments);
    } else if (roles && Array.isArray(roles) && roles.length > 0) {
      // LEGACY: Handle multiple roles with single organization
      const cleanOrganizationId =
        organizationId && organizationId.trim() !== ""
          ? organizationId
          : undefined;
      for (const roleIdToAssign of roles) {
        if (roleIdToAssign && roleIdToAssign.trim() !== "") {
          await this.rolesService.assignUserRole(
            savedUser.id,
            roleIdToAssign,
            cleanOrganizationId,
          );
        }
      }
    } else if (roleId && roleId.trim() !== "") {
      // LEGACY: Single role assignment for backward compatibility
      const cleanOrganizationId =
        organizationId && organizationId.trim() !== ""
          ? organizationId
          : undefined;
      await this.rolesService.assignUserRole(
        savedUser.id,
        roleId,
        cleanOrganizationId,
      );
    }

    return savedUser;
  }

  async findAll(
    query: QueryUserDto,
  ): Promise<{ users: User[]; total: number }> {
    const { page = 1, limit = 10, search, userType, membershipStatus } = query;

    const queryBuilder = this.usersRepository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.managementDepartment", "managementDepartment")
      .leftJoinAndSelect("user.trainingDepartment", "trainingDepartment")
      .leftJoinAndSelect("user.class", "class");

    // Search filter
    if (search) {
      queryBuilder.andWhere(
        "(CONCAT(user.familyName, ' ', user.givenName) ILIKE :search OR user.email ILIKE :search OR user.code ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    // UserType filter
    if (userType) {
      queryBuilder.andWhere("user.userType = :userType", { userType });
    }

    // MembershipStatus filter
    if (membershipStatus) {
      queryBuilder.andWhere("user.membershipStatus = :membershipStatus", {
        membershipStatus,
      });
    }

    // Pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [users, total] = await queryBuilder.getManyAndCount();

    return { users, total };
  }
  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: [
        "managementDepartment",
        "trainingDepartment",
        "class",
        "organizations",
        "organizations.organization",
        "userRoles",
        "userRoles.role",
        "userRoles.role.permissions",
        "userRoles.organization",
      ],
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  /**
   * Find user by email (required by AuthService)
   */ async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      relations: [
        "managementDepartment",
        "trainingDepartment",
        "class",
        "organizations",
        "organizations.organization",
        "userRoles",
        "userRoles.role",
        "userRoles.role.permissions",
        "userRoles.organization",
      ],
    });
  }

  /**
   * Validate user password (required by AuthService)
   */
  async validatePassword(user: User, password: string): Promise<boolean> {
    if (!user.password) {
      return false;
    }
    return bcrypt.compare(password, user.password);
  }

  /**
   * Update user's refresh token (required by AuthService)
   */
  async updateRefreshToken(
    userId: string,
    refreshToken: string | null,
  ): Promise<void> {
    await this.usersRepository.update(userId, {
      refreshToken,
      lastLogin: refreshToken ? new Date() : undefined, // Update lastLogin when setting refresh token
    });
  }
  /**
   * Update user's Google ID (required by AuthService)
   */
  async updateGoogleId(userId: string, googleId: string): Promise<void> {
    await this.usersRepository.update(userId, {
      googleId,
      authProvider: AuthProvider.GOOGLE,
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    console.log("Updating user:", id, "with data:", updateUserDto);

    // Hash password if provided
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    // Extract role and organization data, and relationship IDs
    const { 
      roleId, 
      organizationId, 
      roles, 
      roleAssignments,
      classId,
      managementDepartmentId,
      trainingDepartmentId,
      ...userData 
    } = updateUserDto;

    console.log(
      "Extracted roles:",
      roles,
      "roleId:",
      roleId,
      "organizationId:",
      organizationId,
    );

    // Update basic user data
    Object.assign(user, userData);

    // Handle class assignment
    if (classId !== undefined) {
      if (classId && classId.trim() !== '') {
        user.class = { id: classId } as any;
      } else {
        user.class = null;
      }
    }

    // Handle management department assignment
    if (managementDepartmentId !== undefined) {
      if (managementDepartmentId && managementDepartmentId.trim() !== '') {
        user.managementDepartment = { id: managementDepartmentId } as any;
      } else {
        user.managementDepartment = null;
      }
    }

    // Handle training department assignment
    if (trainingDepartmentId !== undefined) {
      if (trainingDepartmentId && trainingDepartmentId.trim() !== '') {
        user.trainingDepartment = { id: trainingDepartmentId } as any;
      } else {
        user.trainingDepartment = null;
      }
    }

    const updatedUser = await this.usersRepository.save(user);    // Handle role assignment
    if (roles && Array.isArray(roles)) {
      console.log("Processing multiple roles assignment:", roles);
      // Handle multiple roles assignment (including empty array to remove all roles)
      const cleanOrganizationId =
        organizationId && organizationId.trim() !== ""
          ? organizationId
          : undefined;

      // Always remove existing role assignments for this user first
      console.log("Removing all existing user roles for user:", updatedUser.id);
      await this.rolesService.removeAllUserRoles(updatedUser.id);

      // Assign all provided roles (if any)
      if (roles.length > 0) {
        for (const roleIdToAssign of roles) {
          if (roleIdToAssign && roleIdToAssign.trim() !== "") {
            console.log(
              "Assigning role:",
              roleIdToAssign,
              "to user:",
              updatedUser.id,
              "in org:",
              cleanOrganizationId,
            );
            await this.rolesService.assignUserRole(
              updatedUser.id,
              roleIdToAssign,
              cleanOrganizationId,
            );
          }
        }
      } else {
        console.log("No roles to assign - all roles will be removed");
      }
    } else if (roleId && roleId.trim() !== "") {
      console.log("Processing single role assignment:", roleId);
      // Fallback to single role assignment for backward compatibility
      const cleanOrganizationId =
        organizationId && organizationId.trim() !== ""
          ? organizationId
          : undefined;
      // Also remove existing roles for single role assignment
      console.log("Removing all existing user roles for user:", updatedUser.id);
      await this.rolesService.removeAllUserRoles(updatedUser.id);
      console.log(
        "Assigning single role:",
        roleId,
        "to user:",
        updatedUser.id,
        "in org:",
        cleanOrganizationId,
      );
      await this.rolesService.assignUserRole(
        updatedUser.id,
        roleId,
        cleanOrganizationId,
      );
    } else {
      console.log("No roles provided - keeping existing roles");
    }

    console.log("User update completed");
    return updatedUser;
  }
  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }
  async removeMultiple(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) {
      throw new BadRequestException("No user IDs provided");
    }

    // Validate that all users exist
    const users = await this.usersRepository.find({
      where: { id: In(ids) },
    });

    if (users.length !== ids.length) {
      const foundIds = users.map((user) => user.id);
      const notFoundIds = ids.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(`Users not found: ${notFoundIds.join(", ")}`);
    }

    // Remove all users
    await this.usersRepository.remove(users);
  }

  async getUsersWithDefaultPassword(): Promise<{
    users: {
      id: string;
      familyName: string;
      givenName: string;
      email: string;
      hasEmailBasedPassword: boolean;
      emailBasedPassword?: string;
    }[];
    totalUsersWithEmailBasedPassword: number;
  }> {
    // Get all users with passwords
    const users = await this.usersRepository.find({
      select: ["id", "familyName", "givenName", "email", "password"],
      where: { password: Not(IsNull()) },
    });

    const usersWithStatus = [];

    for (const user of users) {
      try {
        // Generate expected email-based password
        const emailBasedPassword = this.generatePasswordFromEmail(user.email);

        // Check if user has email-based password
        const hasEmailBasedPassword = await bcrypt.compare(
          emailBasedPassword,
          user.password,
        );

        usersWithStatus.push({
          id: user.id,
          familyName: user.familyName,
          givenName: user.givenName,
          email: user.email,
          hasEmailBasedPassword,
          emailBasedPassword: hasEmailBasedPassword
            ? emailBasedPassword
            : undefined,
        });
      } catch (error) {
        // If password comparison fails, assume it's not email-based password
        usersWithStatus.push({
          id: user.id,
          familyName: user.familyName,
          givenName: user.givenName,
          email: user.email,
          hasEmailBasedPassword: false,
        });
      }
    }

    const totalUsersWithEmailBasedPassword = usersWithStatus.filter(
      (u) => u.hasEmailBasedPassword,
    ).length;

    return {
      users: usersWithStatus,
      totalUsersWithEmailBasedPassword,
    };
  }

  private generatePasswordFromEmail(email: string): string {
    // Generate password from email: take username part before @
    // Example: "nguyen.van.a@example.com" → "nguyenvana"
    // Example: "test@example.com" → "test"
    const username = email.split("@")[0];

    const password = username.replace(/\./g, "");

    return password;
  }

  /**
   * Assign multiple roles to a user with validation
   */
  private async assignMultipleRoles(
    userId: string,
    assignments: UserRoleAssignmentDto[],
  ): Promise<void> {
    // Validate assignments first
    await this.validateRoleAssignments(assignments);

    // Assign each role-organization pair
    for (const assignment of assignments) {
      const cleanOrganizationId =
        assignment.organizationId && assignment.organizationId.trim() !== ""
          ? assignment.organizationId
          : undefined;

      await this.rolesService.assignUserRole(
        userId,
        assignment.roleId,
        cleanOrganizationId,
      );
    }
  }

  /**
   * Validate role assignments for duplicates and existence
   */
  private async validateRoleAssignments(
    assignments: UserRoleAssignmentDto[],
  ): Promise<void> {
    if (!assignments || assignments.length === 0) {
      return;
    }

    // Check for duplicate role-organization pairs
    const duplicates = this.findDuplicateAssignments(assignments);
    if (duplicates.length > 0) {
      throw new BadRequestException(
        `Duplicate role-organization assignments found: ${duplicates.join(", ")}`,
      );
    }

    // Validate that roles and organizations exist
    for (const assignment of assignments) {
      // Check if role exists
      try {
        await this.rolesService.findOne(assignment.roleId);
      } catch (error) {
        throw new BadRequestException(
          `Role with ID ${assignment.roleId} not found`,
        );
      }

      // Check if organization exists (if provided)
      if (assignment.organizationId) {
        // TODO: Add organization validation when organizationService is available
        // For now, we'll trust the roleService.assignUserRole to handle this
      }
    }
  }

  /**
   * Find duplicate role-organization assignments
   */
  private findDuplicateAssignments(
    assignments: UserRoleAssignmentDto[],
  ): string[] {
    const seen = new Set<string>();
    const duplicates: string[] = [];

    for (const assignment of assignments) {
      const key = `${assignment.roleId}-${assignment.organizationId || "global"}`;
      if (seen.has(key)) {
        duplicates.push(
          `Role ${assignment.roleId} with Organization ${assignment.organizationId || "global"}`,
        );
      }
      seen.add(key);
    }

    return duplicates;
  }

  // Tìm kiếm chính xác theo mã số sinh viên
  async findByExactCode(code: string): Promise<User | null> {
    if (!code || !code.trim()) {
      return null;
    }

    return this.usersRepository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.managementDepartment", "managementDepartment")
      .leftJoinAndSelect("user.trainingDepartment", "trainingDepartment")
      .leftJoinAndSelect("user.class", "class")
      .where("user.code = :code", { code: code.trim() })
      .getOne();
  }
}
