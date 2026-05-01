// Main Module
export { CtxhModule } from "./ctxh.module";

// Sub Modules
export { CategoryModule } from "./category/category.module";
export { ActivitiesModule } from "./activity/activities.module";
export { LimitConfigModule } from "./limit-config/limit-config.module";
export { ReportsModule } from "./reports/reports.module";

// Services
export { CategoryService } from "./category/category.service";
export { ActivitiesService } from "./activity/activities.service";
export { ParticipationService } from "./activity/services/participation.service";
export { LimitConfigService } from "./limit-config/limit-config.service";
export { ReportsService } from "./reports/reports.service";

// DTOs - Category
export { CreateCategoryDto } from "./category/dto/create-category.dto";
export { UpdateCategoryDto } from "./category/dto/update-category.dto";
export { CategoryResponseDto } from "./category/dto/category-response.dto";

// DTOs - Activity
export { CreateActivityDto } from "./activity/dto/create-activity.dto";
export { UpdateActivityDto } from "./activity/dto/update-activity.dto";
export { ActivityResponseDto } from "./activity/dto/activity-response.dto";
export { AddStudentDto } from "./activity/dto/add-student.dto";
export { GradeParticipantsDto } from "./activity/dto/grade-participants.dto";
export { ParticipationResponseDto } from "./activity/dto/participation-response.dto";

// DTOs - Limit Config
export { CreateLimitConfigDto } from "./limit-config/dto/create-limit-config.dto";
export { UpdateLimitConfigDto } from "./limit-config/dto/update-limit-config.dto";
export { LimitConfigResponseDto } from "./limit-config/dto/limit-config-response.dto";

// DTOs - Reports
export { StudentReportDto } from "./reports/dto/student-report.dto";
export { OrganizationReportDto } from "./reports/dto/organization-report.dto";
export { SystemReportDto } from "./reports/dto/system-report.dto";
