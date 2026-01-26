import { Injectable, NotFoundException } from "@nestjs/common";
import { UsersService } from "../users/users.service";
import { OrganizationsService } from "../organizations/organizations.service";
import { AwsS3ConfigService } from "../aws-config/aws-s3-config.service";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

interface DashboardStats {
  totalUsers: number;
  doanVienCount: number;
  hoiVienCount: number;
  organizationCount: number;
  totalUserGrowth: string;
  doanVienGrowth: string;
  hoiVienGrowth: string;
  organizationGrowth: string;
}

interface OrganizationStats {
  doanOrganizations: number;
  hoiOrganizations: number;
  clubOrganizations: number;
  totalMembers: number;
}

interface RecentActivity {
  id: string;
  type:
    | "user_created"
    | "organization_created"
    | "user_joined"
    | "organization_updated";
  message: string;
  timestamp: string;
  category: "doan" | "hoi" | "general";
}

interface FolderStat {
  count: number;
  size: number;
  sizeFormatted: string;
  percentage: string;
}

interface MonthlyS3Stat {
  month: string;
  count: number;
  size: number;
  sizeFormatted: string;
}

interface S3Statistics {
  bucketName: string;
  region: string;
  totalFiles: number;
  totalSize: number;
  totalSizeFormatted: string;
  folderStats: {
    avatars: FolderStat;
    documents: FolderStat;
    images: FolderStat;
    others: FolderStat;
  };
  monthlyStats: MonthlyS3Stat[];
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly usersService: UsersService,
    private readonly organizationsService: OrganizationsService,
    private readonly awsS3ConfigService: AwsS3ConfigService,
  ) {}

  async getDashboardStats(): Promise<DashboardStats> {
    // Get all users with membership status
    const allUsers = await this.usersService.findAll({ page: 1, limit: 10000 });
    const users = allUsers.users;

    const doanVienCount = users.filter(
      (u) =>
        u.membershipStatus === "doan_vien" || u.membershipStatus === "both",
    ).length;

    const hoiVienCount = users.filter(
      (u) => u.membershipStatus === "hoi_vien" || u.membershipStatus === "both",
    ).length;

    // Get all organizations
    const organizations = await this.organizationsService.findAll();

    // Calculate growth percentages based on previous month (simplified implementation)
    const previousMonthStats = await this.getPreviousMonthStats();

    return {
      totalUsers: allUsers.total,
      doanVienCount,
      hoiVienCount,
      organizationCount: organizations.length,
      totalUserGrowth: this.calculateGrowthPercentage(
        allUsers.total,
        previousMonthStats.totalUsers,
      ),
      doanVienGrowth: this.calculateGrowthPercentage(
        doanVienCount,
        previousMonthStats.doanVienCount,
      ),
      hoiVienGrowth: this.calculateGrowthPercentage(
        hoiVienCount,
        previousMonthStats.hoiVienCount,
      ),
      organizationGrowth: this.calculateGrowthPercentage(
        organizations.length,
        previousMonthStats.organizationCount,
      ),
    };
  }

  async getOrganizationStats(): Promise<OrganizationStats> {
    const organizations = await this.organizationsService.findAll();

    const doanOrganizations = organizations.filter((org) =>
      org.type.includes("doan"),
    ).length;

    const hoiOrganizations = organizations.filter((org) =>
      org.type.includes("hoi"),
    ).length;

    const clubOrganizations = organizations.filter((org) =>
      org.type.includes("clb"),
    ).length;

    // Get total members
    const allUsers = await this.usersService.findAll({ page: 1, limit: 10000 });

    return {
      doanOrganizations,
      hoiOrganizations,
      clubOrganizations,
      totalMembers: allUsers.total,
    };
  }

  async getRecentActivities(limit: number = 5): Promise<RecentActivity[]> {
    // Get recent users (created in last 30 days)
    const recentUsers = await this.usersService.findAll({
      page: 1,
      limit: 10,
      // TODO: Add date filtering when available in usersService
    });

    // Get recent organizations (created in last 30 days)
    const recentOrganizations = await this.organizationsService.findAll();

    const activities: RecentActivity[] = [];

    // Add recent user activities
    recentUsers.users.slice(0, 3).forEach((user, _index) => {
      activities.push({
        id: `user-${user.id}`,
        type: "user_created",
        message: `Thêm thành viên mới: ${user.familyName} ${user.givenName}`,
        timestamp: user.createdAt.toISOString(),
        category: user.membershipStatus.includes("doan") ? "doan" : "hoi",
      });
    });

    // Add recent organization activities
    recentOrganizations.slice(0, 2).forEach((org) => {
      activities.push({
        id: `org-${org.id}`,
        type: "organization_created",
        message: `Tạo mới tổ chức: ${org.name}`,
        timestamp: org.createdAt.toISOString(),
        category: org.type.includes("doan") ? "doan" : "hoi",
      });
    });

    // Sort by timestamp (newest first) and limit results
    return activities
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, limit);
  }

  private async getPreviousMonthStats() {
    // Simplified implementation - in real scenario, would query data from previous month
    // For now, return mock data showing some growth
    return {
      totalUsers: 1100,
      doanVienCount: 750,
      hoiVienCount: 600,
      organizationCount: 42,
    };
  }

  private calculateGrowthPercentage(current: number, previous: number): string {
    if (previous === 0) return "+100%";
    const growth = ((current - previous) / previous) * 100;
    const sign = growth >= 0 ? "+" : "";
    return `${sign}${growth.toFixed(1)}%`;
  }

  async getS3Statistics(): Promise<S3Statistics | null> {
    try {
      // 1. Lấy S3 config từ database
      const s3Config = await this.awsS3ConfigService.getActiveConfig();

      if (!s3Config) {
        console.log("No active S3 config found");
        return null;
      }

      console.log("S3 Config loaded:", {
        bucket: s3Config.s3Bucket,
        region: s3Config.region,
        endpoint: s3Config.s3Endpoint,
        accessKeyId: s3Config.accessKeyId?.substring(0, 10) + "...",
      });

      // 2. Khởi tạo S3 client với config từ DB
      const s3ClientConfig: any = {
        region: s3Config.region,
        credentials: {
          accessKeyId: s3Config.accessKeyId,
          secretAccessKey: s3Config.secretAccessKey,
        },
      };

      // Add custom endpoint if provided (for S3-compatible services like MinIO, Longvan, etc.)
      if (s3Config.s3Endpoint) {
        s3ClientConfig.endpoint = s3Config.s3Endpoint;
        s3ClientConfig.forcePathStyle = true; // Required for custom endpoints
        console.log("Using custom S3 endpoint:", s3Config.s3Endpoint);
      }

      const s3Client = new S3Client(s3ClientConfig);

      // 3. Lấy thống kê từ S3
      const stats = await this.calculateS3Stats(
        s3Client,
        s3Config.s3Bucket,
        s3Config.region,
      );

      return stats;
    } catch (error) {
      console.error("Error getting S3 statistics:", {
        message: error.message,
        name: error.name,
        code: error.code,
        stack: error.stack,
      });
      // Return null on error instead of throwing
      return null;
    }
  }

  private async calculateS3Stats(
    s3Client: S3Client,
    bucketName: string,
    region: string,
  ): Promise<S3Statistics> {
    try {
      console.log(
        `Fetching S3 stats for bucket: ${bucketName}, region: ${region}`,
      );

      // List all objects in bucket
      const listCommand = new ListObjectsV2Command({
        Bucket: bucketName,
      });

      const response = await s3Client.send(listCommand);
      console.log(
        `S3 response received, objects count: ${response.Contents?.length || 0}`,
      );
      const objects = response.Contents || [];

      // Phân loại theo folder/prefix
      const folderStats = {
        avatars: { count: 0, size: 0 },
        documents: { count: 0, size: 0 },
        images: { count: 0, size: 0 },
        others: { count: 0, size: 0 },
      };

      objects.forEach((obj) => {
        const key = obj.Key || "";
        const size = obj.Size || 0;

        if (key.startsWith("avatars/")) {
          folderStats.avatars.count++;
          folderStats.avatars.size += size;
        } else if (key.startsWith("documents/")) {
          folderStats.documents.count++;
          folderStats.documents.size += size;
        } else if (key.startsWith("images/")) {
          folderStats.images.count++;
          folderStats.images.size += size;
        } else {
          folderStats.others.count++;
          folderStats.others.size += size;
        }
      });

      const totalSize = objects.reduce((sum, obj) => sum + (obj.Size || 0), 0);
      const totalCount = objects.length;

      // Lấy thống kê theo tháng (dựa vào LastModified)
      const monthlyStats = this.calculateMonthlyStats(objects);

      // Tránh chia cho 0
      const safeTotalSize = totalSize || 1;

      return {
        bucketName,
        region,
        totalFiles: totalCount,
        totalSize: totalSize,
        totalSizeFormatted: this.formatBytes(totalSize),
        folderStats: {
          avatars: {
            ...folderStats.avatars,
            sizeFormatted: this.formatBytes(folderStats.avatars.size),
            percentage: (
              (folderStats.avatars.size / safeTotalSize) *
              100
            ).toFixed(2),
          },
          documents: {
            ...folderStats.documents,
            sizeFormatted: this.formatBytes(folderStats.documents.size),
            percentage: (
              (folderStats.documents.size / safeTotalSize) *
              100
            ).toFixed(2),
          },
          images: {
            ...folderStats.images,
            sizeFormatted: this.formatBytes(folderStats.images.size),
            percentage: (
              (folderStats.images.size / safeTotalSize) *
              100
            ).toFixed(2),
          },
          others: {
            ...folderStats.others,
            sizeFormatted: this.formatBytes(folderStats.others.size),
            percentage: (
              (folderStats.others.size / safeTotalSize) *
              100
            ).toFixed(2),
          },
        },
        monthlyStats,
      };
    } catch (error) {
      console.error("S3 stats calculation error:", {
        message: error.message,
        name: error.name,
        stack: error.stack,
        code: error.$metadata?.httpStatusCode || error.code,
      });
      throw new NotFoundException(
        `Không thể lấy thống kê S3: ${error.name} - ${error.message}`,
      );
    }
  }

  private calculateMonthlyStats(objects: any[]): MonthlyS3Stat[] {
    const monthlyData = new Map<string, { count: number; size: number }>();

    objects.forEach((obj) => {
      if (obj.LastModified) {
        const month = obj.LastModified.toISOString().substring(0, 7); // YYYY-MM
        const existing = monthlyData.get(month) || { count: 0, size: 0 };
        monthlyData.set(month, {
          count: existing.count + 1,
          size: existing.size + (obj.Size || 0),
        });
      }
    });

    // Convert to array and sort by month
    return Array.from(monthlyData.entries())
      .map(([month, data]) => ({
        month,
        count: data.count,
        size: data.size,
        sizeFormatted: this.formatBytes(data.size),
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Lấy 12 tháng gần nhất
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}
