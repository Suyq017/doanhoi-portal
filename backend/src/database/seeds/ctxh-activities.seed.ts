import { DataSource } from "typeorm";
import { config } from "dotenv";
import { User } from "../../entities/user.entity";
import { Organization } from "../../entities/organization.entity";
import { UserOrganization } from "../../entities/user-organization.entity";
import { Department } from "../../entities/department.entity";
import { Class } from "../../entities/class.entity";
import { Permission } from "../../entities/permission.entity";
import { Role } from "../../entities/role.entity";
import { UserRole } from "../../entities/user-role.entity";
import { CtxhCategory } from "../../entities/ctxh-category.entity";
import { CtxhActivity, ActivityStatus } from "../../entities/ctxh-activity.entity";
import { CtxhParticipation } from "../../entities/ctxh-participation.entity";

config();

export const seedCtxhActivities = async (dataSource: DataSource) => {
  const userRepository = dataSource.getRepository(User);
  const orgRepository = dataSource.getRepository(Organization);
  const categoryRepository = dataSource.getRepository(CtxhCategory);
  const activityRepository = dataSource.getRepository(CtxhActivity);

  // Lấy admin user (created_by)
  const adminUser = await userRepository.findOne({
    where: { email: "admin@doanhoi.com" },
  });

  if (!adminUser) {
    throw new Error("Admin user not found. Run default-users seed first.");
  }

  // Lấy tổ chức DOAN_TRUONG
  const doanTruongOrg = await orgRepository.findOne({
    where: { code: "DOAN_TRUONG" },
  });

  if (!doanTruongOrg) {
    throw new Error("DOAN_TRUONG organization not found. Run default-users seed first.");
  }

  // Tạo hoặc lấy danh mục
  const categoryName = "Hoạt động công tác xã hội (dọn kho, phòng thí nghiệm, môi trường….)";
  let category = await categoryRepository.findOne({
    where: { name: categoryName },
  });

  if (!category) {
    category = categoryRepository.create({
      name: categoryName,
      description: "Các hoạt động công tác xã hội như dọn kho, phòng thí nghiệm, vệ sinh môi trường,...",
      created_by: adminUser.id,
    });
    await categoryRepository.save(category);
    console.log(`✅ Created category: ${categoryName}`);
  } else {
    console.log(`✅ Category already exists: ${categoryName}`);
  }

  // Dữ liệu 3 hoạt động
  const activitiesData = [
    {
      name: "HỖ TRỢ TỔ CHỨC BUỔI CHÀO MỪNG TÂN HỌC VIÊN CHƯƠNG TRÌNH IMP",
      description: "HỖ TRỢ TỔ CHỨC BUỔI CHÀO MỪNG TÂN HỌC VIÊN CHƯƠNG TRÌNH IMP",
      location: "Cơ sở 1",
    },
    {
      name: "THAM GIA VÀ TỔ CHỨC HOẠT ĐỘNG OYU WORKSHOP 2026 - \"SẮC VIỆT\"",
      description: "THAM GIA VÀ TỔ CHỨC HOẠT ĐỘNG OYU WORKSHOP 2026 - \"SẮC VIỆT\"",
      location: "Cơ sở 1",
    },
    {
      name: "THAM DỰ HỘI THẢO KHOA HỌC SINH VIÊN, LĨNH VỰC ĐIỆN TOÁN ĐÁM MÂY, ĐIỆN TOÁN LƯỢNG TỬ, DỮ LIỆU LỚN",
      description: "THAM DỰ HỘI THẢO KHOA HỌC SINH VIÊN, LĨNH VỰC ĐIỆN TOÁN ĐÁM MÂY, ĐIỆN TOÁN LƯỢNG TỬ, DỮ LIỆU LỚN",
      location: "Cơ sở 1",
    },
  ];

  const startDate = new Date("2026-04-20T00:00:00.000Z");
  const endDate = new Date("2026-04-30T23:59:59.000Z");

  for (const activityData of activitiesData) {
    const existing = await activityRepository.findOne({
      where: { name: activityData.name },
    });

    if (!existing) {
      const activity = activityRepository.create({
        name: activityData.name,
        description: activityData.description,
        category_id: category.id,
        organization_id: doanTruongOrg.id,
        location: activityData.location,
        start_date: startDate,
        end_date: endDate,
        status: ActivityStatus.ACTIVE,
        requires_approval: false,
        created_by: adminUser.id,
      });

      await activityRepository.save(activity);
      console.log(`✅ Created activity: ${activityData.name}`);
    } else {
      console.log(`⏭️  Activity already exists: ${activityData.name}`);
    }
  }

  console.log("\n🎉 CTXH activities seeding completed!");
};

// Standalone runner
const run = async () => {
  const dataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [
      User,
      Organization,
      UserOrganization,
      Department,
      Class,
      Permission,
      Role,
      UserRole,
      CtxhCategory,
      CtxhActivity,
      CtxhParticipation,
    ],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log("Database connection established");

    await seedCtxhActivities(dataSource);
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
};

// Run if called directly
if (require.main === module) {
  run();
}
