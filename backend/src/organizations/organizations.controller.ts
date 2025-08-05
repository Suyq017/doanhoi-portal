import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseInterceptors, UploadedFile, Res, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { OrganizationsService } from './organizations.service';
import { OrganizationImportService } from './services/import.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { BulkRemoveMembersDto } from './dto/bulk-remove-members.dto';
import { OrganizationType } from '../entities/organization.entity';
import { UserOrgRole } from '../entities/user-organization.entity';

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationsController {
    constructor(
        private readonly organizationsService: OrganizationsService,
        private readonly importService: OrganizationImportService
    ) { }

    @Post()
    @ApiOperation({ summary: 'Tạo tổ chức mới' })
    @ApiResponse({ status: 201, description: 'Tổ chức đã được tạo thành công' })
    create(@Body() createOrganizationDto: CreateOrganizationDto) {
        return this.organizationsService.create(createOrganizationDto);
    }

    @Get()
    @ApiOperation({ summary: 'Lấy danh sách tổ chức' })
    @ApiResponse({ status: 200, description: 'Danh sách tổ chức' })
    findAll() {
        return this.organizationsService.findAll();
    }

    @Get('tree')
    @ApiOperation({ summary: 'Lấy cây tổ chức' })
    @ApiResponse({ status: 200, description: 'Cây tổ chức' })
    findTree() {
        return this.organizationsService.findTree();
    }

    @Get('stats')
    @ApiOperation({ summary: 'Lấy thống kê về tổ chức' })
    @ApiResponse({
        status: 200,
        description: 'Thống kê số lượng tổ chức và thành viên',
        schema: {
            type: 'object',
            properties: {
                doanCount: { type: 'number', description: 'Số lượng tổ chức Đoàn' },
                hoiCount: { type: 'number', description: 'Số lượng tổ chức Hội' },
                clbCount: { type: 'number', description: 'Số lượng Câu lạc bộ' },
                totalMembers: { type: 'number', description: 'Tổng số thành viên' }
            }
        }
    })
    getStats() {
        return this.organizationsService.getStats();
    }

    @Get('type/:type')
    @ApiOperation({ summary: 'Lấy tổ chức theo loại' })
    @ApiParam({ name: 'type', enum: OrganizationType })
    @ApiResponse({ status: 200, description: 'Danh sách tổ chức theo loại' })
    findByType(@Param('type') type: OrganizationType) {
        return this.organizationsService.findByType(type);
    }

    @Get(':id/children')
    @ApiOperation({ summary: 'Lấy danh sách tổ chức con trực tiếp' })
    @ApiParam({ name: 'id', description: 'ID của tổ chức cha' })
    @ApiResponse({ status: 200, description: 'Danh sách tổ chức con' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy tổ chức' })
    findChildren(@Param('id') id: string) {
        return this.organizationsService.findChildren(id);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Lấy thông tin chi tiết tổ chức' })
    @ApiResponse({ status: 200, description: 'Thông tin tổ chức' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy tổ chức' })
    findOne(@Param('id') id: string) {
        return this.organizationsService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Cập nhật thông tin tổ chức' })
    @ApiResponse({ status: 200, description: 'Tổ chức đã được cập nhật' })
    update(@Param('id') id: string, @Body() updateOrganizationDto: UpdateOrganizationDto) {
        return this.organizationsService.update(id, updateOrganizationDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Xóa tổ chức' })
    @ApiResponse({ status: 200, description: 'Tổ chức đã được xóa' })
    remove(@Param('id') id: string) {
        return this.organizationsService.remove(id);
    } @Post(':id/members/:userId')
    @ApiOperation({ summary: 'Thêm thành viên vào tổ chức' })
    @ApiResponse({ status: 201, description: 'Thành viên đã được thêm' })
    addMember(
        @Param('id') id: string,
        @Param('userId') userId: string,
        @Body('role') role: UserOrgRole = UserOrgRole.MEMBER
    ) {
        return this.organizationsService.addMember(id, userId, role);
    }

    @Post(':id/members/:userId/with-parents')
    @ApiOperation({ summary: 'Thêm thành viên vào tổ chức và tất cả tổ chức cha' })
    @ApiResponse({ status: 201, description: 'Thành viên đã được thêm vào tổ chức và các tổ chức cha' })
    addMemberWithParents(
        @Param('id') id: string,
        @Param('userId') userId: string,
        @Body('role') role: UserOrgRole = UserOrgRole.MEMBER
    ) {
        return this.organizationsService.addMemberWithParents(id, userId, role);
    } @Delete(':id/members/bulk-remove')
    @ApiOperation({ summary: 'Loại bỏ nhiều thành viên khỏi tổ chức cùng lúc' })
    @ApiResponse({ status: 200, description: 'Các thành viên đã được loại bỏ thành công' })
    @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
    @ApiResponse({ status: 404, description: 'Tổ chức hoặc một số thành viên không tồn tại' })
    async bulkRemoveMembers(
        @Param('id') organizationId: string,
        @Body() bulkRemoveMembersDto: BulkRemoveMembersDto
    ) {
        try {
            console.log('Controller bulkRemoveMembers called:', { organizationId, dto: bulkRemoveMembersDto });
            await this.organizationsService.bulkRemoveMembers(organizationId, bulkRemoveMembersDto.userIds);
            return {
                message: `Đã loại bỏ thành công ${bulkRemoveMembersDto.userIds.length} thành viên khỏi tổ chức`,
                removedCount: bulkRemoveMembersDto.userIds.length
            };
        } catch (error) {
            console.error('Error in bulkRemoveMembers controller:', error);
            throw error;
        }
    } @Delete(':id/members/:userId')
    @ApiOperation({ summary: 'Xóa thành viên khỏi tổ chức' })
    @ApiResponse({ status: 200, description: 'Thành viên đã được xóa' })
    removeMember(@Param('id') id: string, @Param('userId') userId: string) {
        return this.organizationsService.removeMember(id, userId);
    }

    @Delete(':id/members/:userId/safely')
    @ApiOperation({ summary: 'Xóa thành viên khỏi tổ chức một cách an toàn (kiểm tra tổ chức cha)' })
    @ApiResponse({ status: 200, description: 'Thành viên đã được xóa an toàn' })
    removeMemberSafely(@Param('id') id: string, @Param('userId') userId: string) {
        return this.organizationsService.removeMemberSafely(id, userId);
    }

    @Get(':id/members')
    @ApiOperation({ summary: 'Lấy danh sách thành viên của tổ chức' })
    @ApiResponse({ status: 200, description: 'Danh sách thành viên' })
    getMembers(@Param('id') id: string) {
        return this.organizationsService.getMembers(id);
    }

    @Get('by-type-code/:type/:code')
    @ApiOperation({ summary: 'Lấy tổ chức theo loại và mã' })
    @ApiParam({ name: 'type', description: 'Loại tổ chức' })
    @ApiParam({ name: 'code', description: 'Mã tổ chức' })
    @ApiResponse({ status: 200, description: 'Thông tin tổ chức' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy tổ chức' })
    getOrganizationByTypeAndCode(
        @Param('type') type: string,
        @Param('code') code: string
    ) {
        return this.organizationsService.getOrganizationByTypeAndCode(type, code);
    }


    @Post(':code_org/member/:code_user')
    @ApiOperation({ summary: 'Thêm thành viên vào tổ chức theo code' })
    @ApiParam({ name: 'code_org', description: 'Mã của tổ chức' })
    @ApiParam({ name: 'code_user', description: 'Mã của người dùng' })
    @ApiResponse({ status: 201, description: 'Thành viên đã được thêm vào tổ chức' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy tổ chức hoặc người dùng' })
    @ApiResponse({ status: 400, description: 'Người dùng đã là thành viên của tổ chức' })
    addMemberBySimpleCode(
        @Param('code_org') orgCode: string,
        @Param('code_user') userCode: string
    ) {
        return this.organizationsService.addMemberBySimpleCode(orgCode, userCode);
    }    // Import Members Endpoints
    @Post('members/import/upload')
    @ApiOperation({ summary: 'Upload file Excel để import thành viên' })
    @ApiConsumes('multipart/form-data')
    @ApiResponse({ status: 200, description: 'File đã được upload và xử lý thành công' })
    @ApiResponse({ status: 400, description: 'File không hợp lệ' })
    @UseInterceptors(FileInterceptor('file'))
    async uploadImportFile(
        @UploadedFile() file: Express.Multer.File,
        @Query('level') level: string = '3',
        @Query('organizationId') organizationId?: string
    ) {
        const levelNum = parseInt(level);
        if (![2, 3].includes(levelNum)) {
            throw new BadRequestException('Level phải là 2 hoặc 3');
        }
        return this.importService.uploadFile(file, organizationId, levelNum);
    }

    @Get('import/:sessionId/validate')
    @ApiOperation({ summary: 'Validate dữ liệu import' })
    @ApiResponse({ status: 200, description: 'Kết quả validation' })
    @ApiResponse({ status: 404, description: 'Session không tồn tại' })
    async validateImportData(@Param('sessionId') sessionId: string) {
        return this.importService.validateData(sessionId);
    }

    @Post('import/:sessionId/execute')
    @ApiOperation({ summary: 'Thực hiện import thành viên' })
    @ApiResponse({ status: 200, description: 'Kết quả import' })
    @ApiResponse({ status: 404, description: 'Session không tồn tại' })
    async executeImport(
        @Param('sessionId') sessionId: string,
        @Body() options?: { skipConflicts?: boolean }
    ) {
        return this.importService.executeImport(sessionId, options);
    }

    @Get('import/:sessionId/status')
    @ApiOperation({ summary: 'Lấy trạng thái import session' })
    @ApiResponse({ status: 200, description: 'Thông tin session' })
    @ApiResponse({ status: 404, description: 'Session không tồn tại' })
    async getImportStatus(@Param('sessionId') sessionId: string) {
        return this.importService.getSessionStatus(sessionId);
    }

    @Get('/template/:level')
    @ApiOperation({ summary: 'Tải file mẫu Excel cho import' })
    @ApiParam({ name: 'level', description: 'Cấp độ tổ chức' })
    @ApiResponse({ status: 200, description: 'File mẫu Excel' })
    async downloadTemplate(@Param('level') level: string, @Res() res: Response) {
        const levelNum = parseInt(level);

        const templateBuffer = await this.importService.generateTemplate(levelNum);
        const filename = `organizationsss_level${levelNum}_template.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(templateBuffer);
    }

}
