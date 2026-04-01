import { DataSource } from "typeorm";
import {
  Permission,
  PermissionContext,
} from "../../entities/permission.entity";

export const seedPermissions = async (dataSource: DataSource) => {
  const permissionRepository = dataSource.getRepository(Permission);

  const permissions = [
    // Dashboard permissions
    {
      code: "dashboard.access",
      name: "Truy cập Dashboard",
      description: "Cho phép truy cập trang tổng quan",
      category: "dashboard",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 1,
    },

    // Users permissions
    {
      code: "users.access",
      name: "Truy cập quản lý người dùng",
      description: "Cho phép truy cập trang quản lý người dùng",
      category: "users",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 10,
    },
    {
      code: "users.create",
      name: "Tạo người dùng",
      description: "Cho phép tạo người dùng mới",
      category: "users",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 11,
    },
    {
      code: "users.view_details",
      name: "Xem chi tiết người dùng",
      description: "Cho phép xem thông tin chi tiết người dùng",
      category: "users",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 12,
    },
    {
      code: "users.update",
      name: "Cập nhật người dùng",
      description: "Cho phép cập nhật thông tin người dùng",
      category: "users",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 13,
    },
    {
      code: "users.delete",
      name: "Xóa người dùng",
      description: "Cho phép xóa người dùng",
      category: "users",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 14,
    },
    {
      code: "users.export",
      name: "Xuất danh sách người dùng",
      description: "Cho phép xuất danh sách người dùng",
      category: "users",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 15,
    },

    // Organizations permissions
    {
      code: "organizations.access",
      name: "Truy cập quản lý tổ chức",
      description: "Cho phép truy cập trang quản lý tổ chức",
      category: "organizations",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 20,
    },
    {
      code: "organizations.create",
      name: "Tạo tổ chức",
      description: "Cho phép tạo tổ chức mới",
      category: "organizations",
      context: PermissionContext.SYSTEM,
      sortOrder: 21,
    },
    {
      code: "organizations.view_member_count",
      name: "Xem số lượng thành viên tổ chức",
      description: "Cho phép xem số lượng thành viên trong tổ chức",
      category: "organizations",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 22,
    },
    {
      code: "organizations.access_children",
      name: "Truy cập tổ chức con",
      description: "Cho phép truy cập các tổ chức con",
      category: "organizations",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 23,
    },
    {
      code: "organizations.update",
      name: "Cập nhật tổ chức",
      description: "Cho phép cập nhật thông tin tổ chức",
      category: "organizations",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 24,
    },
    {
      code: "organizations.delete",
      name: "Xóa tổ chức",
      description: "Cho phép xóa tổ chức",
      category: "organizations",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 25,
    },
    {
      code: "organizations.add_member",
      name: "Thêm thành viên vào tổ chức",
      description: "Cho phép thêm thành viên vào tổ chức",
      category: "organizations",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 26,
    },
    {
      code: "organizations.remove_member",
      name: "Xóa thành viên khỏi tổ chức",
      description: "Cho phép xóa thành viên khỏi tổ chức",
      category: "organizations",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 27,
    },

    // Departments permissions
    {
      code: "departments.access",
      name: "Truy cập quản lý phòng ban",
      description: "Cho phép truy cập trang quản lý phòng ban",
      category: "departments",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 30,
    },
    {
      code: "departments.create",
      name: "Tạo phòng ban",
      description: "Cho phép tạo phòng ban mới",
      category: "departments",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 31,
    },
    {
      code: "departments.view_details",
      name: "Xem chi tiết phòng ban",
      description: "Cho phép xem thông tin chi tiết phòng ban",
      category: "departments",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 32,
    },
    {
      code: "departments.update",
      name: "Cập nhật phòng ban",
      description: "Cho phép cập nhật thông tin phòng ban",
      category: "departments",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 33,
    },
    {
      code: "departments.delete",
      name: "Xóa phòng ban",
      description: "Cho phép xóa phòng ban",
      category: "departments",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 34,
    },

    // Classes permissions
    {
      code: "classes.access",
      name: "Truy cập quản lý lớp học",
      description: "Cho phép truy cập trang quản lý lớp học",
      category: "classes",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 40,
    },
    {
      code: "classes.create",
      name: "Tạo lớp học",
      description: "Cho phép tạo lớp học mới",
      category: "classes",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 41,
    },
    {
      code: "classes.view_details",
      name: "Xem chi tiết lớp học",
      description: "Cho phép xem thông tin chi tiết lớp học",
      category: "classes",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 42,
    },
    {
      code: "classes.update",
      name: "Cập nhật lớp học",
      description: "Cho phép cập nhật thông tin lớp học",
      category: "classes",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 43,
    },
    {
      code: "classes.delete",
      name: "Xóa lớp học",
      description: "Cho phép xóa lớp học",
      category: "classes",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 44,
    }, // Permissions management
    {
      code: "permissions.access",
      name: "Truy cập quản lý quyền",
      description: "Cho phép truy cập trang quản lý quyền",
      category: "permissions",
      context: PermissionContext.SYSTEM,
      sortOrder: 50,
    },
    {
      code: "permissions.create",
      name: "Tạo role/quyền",
      description: "Cho phép tạo role và quyền mới",
      category: "permissions",
      context: PermissionContext.SYSTEM,
      sortOrder: 51,
    },
    {
      code: "permissions.update",
      name: "Cập nhật role/quyền",
      description: "Cho phép cập nhật role và quyền",
      category: "permissions",
      context: PermissionContext.SYSTEM,
      sortOrder: 52,
    },
    {
      code: "permissions.delete",
      name: "Xóa role/quyền",
      description: "Cho phép xóa role và quyền",
      category: "permissions",
      context: PermissionContext.SYSTEM,
      sortOrder: 53,
    },
    {
      code: "permissions.view_details",
      name: "Xem chi tiết role/quyền",
      description: "Cho phép xem thông tin chi tiết role và quyền",
      category: "permissions",
      context: PermissionContext.SYSTEM,
      sortOrder: 54,
    },

    // System Config permissions
    {
      code: "system-config.access",
      name: "Truy cập cấu hình hệ thống",
      description: "Cho phép truy cập trang cấu hình hệ thống",
      category: "system-config",
      context: PermissionContext.SYSTEM,
      sortOrder: 55,
    },

    // Payment Campaign permissions
    {
      code: "payment-campaigns.access",
      name: "Truy cập quản lý đóng phí",
      description: "Cho phép truy cập trang quản lý chiến dịch đóng phí",
      category: "payments",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 60,
    },
    {
      code: "payment-campaigns.create",
      name: "Tạo chiến dịch đóng phí",
      description: "Cho phép tạo chiến dịch đóng phí mới",
      category: "payments",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 61,
    },
    {
      code: "payment-campaigns.read",
      name: "Xem thông tin chiến dịch đóng phí",
      description: "Cho phép xem thông tin chi tiết chiến dịch đóng phí",
      category: "payments",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 62,
    },
    {
      code: "payment-campaigns.update",
      name: "Cập nhật chiến dịch đóng phí",
      description: "Cho phép cập nhật thông tin chiến dịch đóng phí",
      category: "payments",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 63,
    },
    {
      code: "payment-campaigns.delete",
      name: "Xóa chiến dịch đóng phí",
      description: "Cho phép xóa chiến dịch đóng phí",
      category: "payments",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 64,
    },
    {
      code: "payment-campaigns.manage_assignments",
      name: "Quản lý phân công đóng phí",
      description: "Cho phép phân công và quản lý đối tượng đóng phí",
      category: "payments",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 65,
    },
    {
      code: "payment-campaigns.view_reports",
      name: "Xem báo cáo đóng phí",
      description: "Cho phép xem báo cáo và thống kê đóng phí",
      category: "payments",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 66,
    },
    {
      code: "payment-campaigns.export",
      name: "Xuất báo cáo đóng phí",
      description: "Cho phép xuất báo cáo đóng phí",
      category: "payments",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 67,
    },

    // My Payments permissions (for individual users)
    {
      code: "my-payments.access",
      name: "Truy cập trang đóng phí của tôi",
      description:
        "Cho phép truy cập trang xem các khoản phí được phân công cho mình",
      category: "my-payments",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 70,
    },

    // CTXH permissions
    {
      code: "ctxh.access",
      name: "Truy cập quản lý CTXH",
      description: "Cho phép truy cập module quản lý công tác xã hội",
      category: "ctxh",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 80,
    },
    {
      code: "ctxh.categories.view",
      name: "Xem danh mục CTXH",
      description: "Cho phép xem danh mục hoạt động CTXH",
      category: "ctxh",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 81,
    },
    {
      code: "ctxh.categories.create",
      name: "Tạo danh mục CTXH",
      description: "Cho phép tạo danh mục hoạt động CTXH mới",
      category: "ctxh",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 82,
    },
    {
      code: "ctxh.categories.update",
      name: "Cập nhật danh mục CTXH",
      description: "Cho phép chỉnh sửa danh mục hoạt động CTXH",
      category: "ctxh",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 83,
    },
    {
      code: "ctxh.categories.delete",
      name: "Xóa danh mục CTXH",
      description: "Cho phép xóa danh mục hoạt động CTXH",
      category: "ctxh",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 84,
    },
    {
      code: "ctxh.activities.view",
      name: "Xem hoạt động CTXH",
      description: "Cho phép xem hoạt động CTXH",
      category: "ctxh",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 85,
    },
    {
      code: "ctxh.activities.create",
      name: "Tạo hoạt động CTXH",
      description: "Cho phép tạo hoạt động CTXH mới",
      category: "ctxh",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 86,
    },
    {
      code: "ctxh.activities.update",
      name: "Cập nhật hoạt động CTXH",
      description: "Cho phép chỉnh sửa hoạt động CTXH",
      category: "ctxh",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 87,
    },
    {
      code: "ctxh.activities.delete",
      name: "Xóa hoạt động CTXH",
      description: "Cho phép xóa hoạt động CTXH",
      category: "ctxh",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 88,
    },
    {
      code: "ctxh.activities.manage_participants",
      name: "Quản lý người tham gia CTXH",
      description: "Cho phép quản lý người tham gia hoạt động CTXH",
      category: "ctxh",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 89,
    },
    {
      code: "ctxh.reports.export",
      name: "Xuất báo cáo CTXH",
      description: "Cho phép xuất báo cáo hoạt động CTXH",
      category: "ctxh",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 91,
    },
    {
      code: "ctxh.config.manage",
      name: "Quản lý cấu hình CTXH",
      description: "Cho phép quản lý cấu hình giới hạn CTXH",
      category: "ctxh",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 92,
    },
    {
      code: "ctxh.import.old_system",
      name: "Nhập ngày CTXH từ hệ thống cũ",
      description: "Nhập dữ liệu CTXH từ hệ thống cũ",
      category: "ctxh",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 93,
    },

    // Template permissions
    {
      code: "templates.access",
      name: "Xem trang Biểu mẫu",
      description: "Cho phép truy cập trang Biểu mẫu để điền và nộp form",
      category: "templates",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 100,
    },
    {
      code: "templates.admin.access",
      name: "Xem trang Quản lý biểu mẫu",
      description: "Cho phép truy cập trang Quản lý biểu mẫu",
      category: "templates",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 101,
    },
    {
      code: "templates.manage",
      name: "Quản lý biểu mẫu",
      description:
        "Cho phép tạo, sửa, xóa biểu mẫu trong trang Quản lý biểu mẫu",
      category: "templates",
      context: PermissionContext.ORGANIZATION,
      sortOrder: 102,
    },
  ];

  for (const permissionData of permissions) {
    const existingPermission = await permissionRepository.findOne({
      where: { code: permissionData.code },
    });

    if (!existingPermission) {
      const permission = permissionRepository.create(permissionData);
      await permissionRepository.save(permission);
      console.log(`✅ Created permission: ${permissionData.code}`);
    } else {
      // Update existing permission with new data
      await permissionRepository.update(
        { code: permissionData.code },
        {
          name: permissionData.name,
          description: permissionData.description,
          category: permissionData.category,
          context: permissionData.context,
          sortOrder: permissionData.sortOrder,
        },
      );
      console.log(`🔄 Updated permission: ${permissionData.code}`);
    }
  }

  console.log("✅ Permissions seeding completed!");
};
