import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { RolesService } from "./roles.service";
import {
  CreateRoleDto,
  UpdateRoleDto,
  QueryRoleDto,
  GrantRolesDto,
} from "./dto";

@ApiTags("roles")
@Controller("roles")
export class RolesController {
  constructor(private readonly rolesService: RolesService) { }

  @Get()
  @ApiOperation({ summary: "Get all roles" })
  async getAllRoles(@Query() query: QueryRoleDto) {
    return this.rolesService.findAll(query);
  }

  @Get("available")
  @ApiOperation({ summary: "Get available roles for assignment" })
  async getAvailableRoles() {
    return this.rolesService.getAllRoles();
  }

  @Get("available-permissions")
  @ApiOperation({ summary: "Get all available permissions for role creation" })
  async getAvailablePermissions() {
    return this.rolesService.getAvailablePermissions();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get role by ID" })
  async getRoleById(@Param("id") id: string) {
    return this.rolesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "Create new role" })
  async createRole(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create(createRoleDto);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update role" })
  async updateRole(
    @Param("id") id: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    return this.rolesService.update(id, updateRoleDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete role" })
  async deleteRole(@Param("id") id: string) {
    return this.rolesService.remove(id);
  }

  @Delete()
  @ApiOperation({ summary: "Bulk delete roles" })
  async bulkDeleteRoles(@Body() body: { ids: string[] }) {
    return this.rolesService.bulkDelete(body.ids);
  }

  @Get("user/:userId")
  @ApiOperation({ summary: "Get user roles" })
  async getUserRoles(
    @Param("userId") userId: string,
    @Query("organizationId") organizationId?: string,
  ) {
    return this.rolesService.getUserRoles(userId, organizationId);
  }

  @Post("assign")
  @ApiOperation({ summary: "Assign role to user" })
  async assignUserRole(
    @Body()
    assignRoleDto: {
      userId: string;
      roleId: string;
      organizationId?: string;
    },
  ) {
    return this.rolesService.assignUserRole(
      assignRoleDto.userId,
      assignRoleDto.roleId,
      assignRoleDto.organizationId,
    );
  }

  @Post("seed-defaults")
  @ApiOperation({ summary: "Seed default roles and permissions" })
  async seedDefaults() {
    await this.rolesService.seedDefaultRoles();
    return { message: "Default roles and permissions seeded successfully" };
  }
  @Post("grant-roles")
  @ApiOperation({ summary: "Grant multiple roles to user with organizations" })
  @ApiResponse({ status: 201, description: "Roles granted successfully" })
  @ApiResponse({
    status: 400,
    description: "Invalid role assignments or duplicate assignments",
  })
  async grantRolesToUser(@Body() grantRolesDto: GrantRolesDto) {
    return this.rolesService.grantRolesToUser(
      grantRolesDto.userId,
      grantRolesDto.roleAssignments,
    );
  }
}
