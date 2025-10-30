import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import { UsersService } from '../users/users.service';
import { OrganizationsService } from '../organizations/organizations.service';

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
    type: 'user_created' | 'organization_created' | 'user_joined' | 'organization_updated';
    message: string;
    timestamp: string;
    category: 'doan' | 'hoi' | 'general';
}

export interface StorageStats {
    usedSpace: number;        // Bytes đã sử dụng
    totalSpace: number;       // Tổng dung lượng cho phép (cấu hình, ví dụ: 10GB)
    availableSpace: number;   // Dung lượng còn lại
    usagePercentage: number;  // Phần trăm sử dụng
    fileCount: number;        // Số lượng file
    // Bandwidth stats (bytes this month)
    bandwidthIn: number;      // Data transferred IN (uploads)
    bandwidthOut: number;     // Data transferred OUT (downloads)
    bandwidthLimit: number;   // Monthly bandwidth limit
    bandwidthUsagePercentage: number; // Bandwidth usage percentage
}

export interface TrendDataPoint {
    date: string;          // ISO date string
    storage: number;       // Bytes used
    bandwidthIn: number;   // Upload bytes
    bandwidthOut: number;  // Download bytes
    totalBandwidth: number; // bandwidthIn + bandwidthOut
}

export type TimeRange = 'week' | 'month' | 'year';

@Injectable()
export class DashboardService {
    private s3: AWS.S3;
    private bucket: string;
    private maxSpace: number; // bytes
    private bandwidthLimit: number; // monthly bandwidth limit in bytes

    constructor(
        private readonly usersService: UsersService,
        private readonly organizationsService: OrganizationsService,
        private configService: ConfigService
    ) {
        this.s3 = new AWS.S3({
            accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
            secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
            endpoint: this.configService.get<string>('AWS_S3_ENDPOINT'),
            s3ForcePathStyle: true,
            region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
        }); this.bucket = this.configService.get<string>('AWS_S3_BUCKET', '19429970-documents');
        // Cấu hình tổng dung lượng S3 (200GB)
        this.maxSpace = 200 * 1024 * 1024 * 1024; // 200GB
        // Cấu hình băng thông giới hạn hàng tháng (100GB)
        this.bandwidthLimit = 100 * 1024 * 1024 * 1024; // 100GB
    }

    async getDashboardStats(): Promise<DashboardStats> {
        // Get all users
        const allUsers = await this.usersService.findAll({ page: 1, limit: 10000 });
        const users = allUsers.users;

        // Simplified counts - không còn membership status
        const doanVienCount = 0;
        const hoiVienCount = 0;

        // Get all organizations
        const organizations = await this.organizationsService.findAll();

        // Calculate growth percentages based on previous month (simplified implementation)
        const previousMonthStats = await this.getPreviousMonthStats();

        return {
            totalUsers: allUsers.total,
            doanVienCount,
            hoiVienCount,
            organizationCount: organizations.length,
            totalUserGrowth: this.calculateGrowthPercentage(allUsers.total, previousMonthStats.totalUsers),
            doanVienGrowth: this.calculateGrowthPercentage(doanVienCount, previousMonthStats.doanVienCount),
            hoiVienGrowth: this.calculateGrowthPercentage(hoiVienCount, previousMonthStats.hoiVienCount),
            organizationGrowth: this.calculateGrowthPercentage(organizations.length, previousMonthStats.organizationCount),
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

        const activities: RecentActivity[] = [];        // Add recent user activities
        recentUsers.users.slice(0, 3).forEach((user, index) => {
            activities.push({
                id: `user-${user.id}`,
                type: 'user_created',
                message: `Thêm thành viên mới: ${user.familyName} ${user.givenName}`,
                timestamp: user.createdAt.toISOString(),
                category: 'general' // Simplified category
            });
        });

        // Sort by timestamp (newest first) and limit results
        return activities
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, limit);
    }

    private async getPreviousMonthStats() {
        // Simplified implementation - in real scenario, would query data from previous month
        // For now, return mock data showing some growth
        return {
            totalUsers: 1100,
            doanVienCount: 750,
            hoiVienCount: 600,
            organizationCount: 42
        };
    }

    private calculateGrowthPercentage(current: number, previous: number): string {
        if (previous === 0) return '+100%';
        const growth = ((current - previous) / previous) * 100;
        const sign = growth >= 0 ? '+' : '';
        return `${sign}${growth.toFixed(1)}%`;
    } async getStorageStats(): Promise<StorageStats> {
        try {
            console.log('Fetching storage stats from S3 bucket:', this.bucket);
            console.log('Max space configured:', this.maxSpace, 'bytes (', (this.maxSpace / (1024 * 1024 * 1024)).toFixed(1), 'GB)');

            // Lấy danh sách tất cả objects trong bucket
            let usedSpace = 0;
            let fileCount = 0;
            let continuationToken: string | undefined = undefined;

            do {
                const params: AWS.S3.ListObjectsV2Request = {
                    Bucket: this.bucket,
                    ContinuationToken: continuationToken,
                };

                console.log('Calling S3 listObjectsV2 with params:', params);
                const result = await this.s3.listObjectsV2(params).promise();
                console.log('S3 response received. Object count:', result.Contents?.length || 0);

                if (result.Contents) {
                    for (const obj of result.Contents) {
                        usedSpace += obj.Size || 0;
                    }
                    fileCount += result.Contents.length;
                }
                continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
            } while (continuationToken);

            const availableSpace = this.maxSpace - usedSpace;
            const usagePercentage = this.maxSpace > 0 ? Math.round((usedSpace / this.maxSpace) * 100) : 0;

            // Calculate bandwidth data (mock for now - real implementation would track uploads/downloads)
            const bandwidthStats = await this.getBandwidthStats(); const stats = {
                usedSpace,
                totalSpace: this.maxSpace,
                availableSpace: availableSpace > 0 ? availableSpace : 0,
                usagePercentage,
                fileCount,
                bandwidthIn: bandwidthStats.bandwidthIn,
                bandwidthOut: bandwidthStats.bandwidthOut,
                bandwidthLimit: this.bandwidthLimit,
                bandwidthUsagePercentage: bandwidthStats.bandwidthUsagePercentage,
            };

            console.log('Before return - this.maxSpace:', this.maxSpace);
            console.log('Before return - stats.totalSpace:', stats.totalSpace);
            console.log('Final storage stats:', JSON.stringify(stats, null, 2));
            return stats;
        } catch (error) {
            console.error('Error fetching storage stats:', error);
            // Return fallback data on error but log the actual error
            return {
                usedSpace: 0,
                totalSpace: this.maxSpace,
                availableSpace: this.maxSpace,
                usagePercentage: 0,
                fileCount: 0,
                bandwidthIn: 0,
                bandwidthOut: 0,
                bandwidthLimit: this.bandwidthLimit,
                bandwidthUsagePercentage: 0,
            };
        }
    }    /**
     * Get bandwidth statistics for all time (not just current month)
     * Note: This is a mock implementation. Real implementation would:
     * 1. Track uploads/downloads in database or logs
     * 2. Use CloudWatch metrics if available
     * 3. Store total bandwidth usage in database
     */
    private async getBandwidthStats(): Promise<{
        bandwidthIn: number;
        bandwidthOut: number;
        bandwidthUsagePercentage: number;
    }> {
        try {
            // Get all files from S3 to calculate total bandwidth
            const allFiles = await this.getS3FilesWithDates();

            // Calculate total bandwidth based on all uploads (IN)
            const totalBandwidthIn = allFiles.reduce((sum, file) => sum + file.size, 0);

            // Estimate downloads as 30% of total uploads (mock calculation)
            const totalBandwidthOut = Math.floor(totalBandwidthIn * 0.3);

            const totalBandwidthUsed = totalBandwidthIn + totalBandwidthOut;

            // For display purposes, we'll still show against monthly limit but it represents total usage
            const bandwidthUsagePercentage = this.bandwidthLimit > 0
                ? Math.round((totalBandwidthUsed / this.bandwidthLimit) * 100)
                : 0;

            console.log('Bandwidth stats calculated:', {
                totalBandwidthIn,
                totalBandwidthOut,
                totalBandwidthUsed,
                bandwidthUsagePercentage
            });

            return {
                bandwidthIn: totalBandwidthIn,
                bandwidthOut: totalBandwidthOut,
                bandwidthUsagePercentage: Math.min(bandwidthUsagePercentage, 100),
            };
        } catch (error) {
            console.error('Error calculating bandwidth stats:', error);
            return {
                bandwidthIn: 0,
                bandwidthOut: 0,
                bandwidthUsagePercentage: 0,
            };
        }
    }

    private async calculateStorageSize(): Promise<number> {
        try {
            let totalSize = 0;
            let continuationToken: string | undefined = undefined;

            do {
                const params: AWS.S3.ListObjectsV2Request = {
                    Bucket: this.bucket,
                    ContinuationToken: continuationToken,
                };

                const result = await this.s3.listObjectsV2(params).promise();

                if (result.Contents) {
                    for (const obj of result.Contents) {
                        totalSize += obj.Size || 0;
                    }
                }
                continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
            } while (continuationToken); return totalSize;
        } catch (error) {
            console.error('Error calculating storage size:', error);
            return 0;
        }
    }

    /**
     * Get S3 files with their upload dates
     */
    private async getS3FilesWithDates(): Promise<{ key: string, size: number, lastModified: Date }[]> {
        try {
            const files: { key: string, size: number, lastModified: Date }[] = [];
            let continuationToken: string | undefined = undefined;

            do {
                const params: AWS.S3.ListObjectsV2Request = {
                    Bucket: this.bucket,
                    ContinuationToken: continuationToken,
                };

                const result = await this.s3.listObjectsV2(params).promise();

                if (result.Contents) {
                    for (const obj of result.Contents) {
                        if (obj.Key && obj.Size && obj.LastModified) {
                            files.push({
                                key: obj.Key,
                                size: obj.Size,
                                lastModified: obj.LastModified
                            });
                        }
                    }
                }
                continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
            } while (continuationToken);

            console.log('S3 files found:', files.length, 'Latest file:', files[files.length - 1]);
            return files;
        } catch (error) {
            console.error('Error getting S3 files with dates:', error);
            return [];
        }
    }

    /**
     * Get storage usage trend data
     */    async getStorageTrend(timeRange: TimeRange): Promise<TrendDataPoint[]> {
        try {
            console.log(`Fetching storage trend for time range: ${timeRange}`);

            // Get current real storage stats from S3
            const currentStorageStats = await this.getStorageStats();

            // Generate trend data based on real current usage
            return this.generateTrendDataFromRealUsage(timeRange, currentStorageStats);
        } catch (error) {
            console.error('Error fetching storage trend:', error);
            return [];
        }
    }

    /**
     * Get bandwidth usage trend data
     */
    async getBandwidthTrend(timeRange: TimeRange): Promise<TrendDataPoint[]> {
        try {
            console.log(`Fetching bandwidth trend for time range: ${timeRange}`);

            // Get current real storage and bandwidth stats from S3
            const currentStorageStats = await this.getStorageStats();

            // Generate trend data based on real current usage
            return this.generateTrendDataFromRealUsage(timeRange, currentStorageStats);
        } catch (error) {
            console.error('Error fetching bandwidth trend:', error);
            return [];
        }
    }

    /**
     * Get combined storage and bandwidth trend data
     */
    async getCombinedTrend(timeRange: TimeRange): Promise<TrendDataPoint[]> {
        try {
            console.log(`Fetching combined trend for time range: ${timeRange}`);

            // Get current real storage stats from S3
            const currentStorageStats = await this.getStorageStats();

            return this.generateTrendDataFromRealUsage(timeRange, currentStorageStats);
        } catch (error) {
            console.error('Error fetching combined trend:', error);
            return [];
        }
    }    /**
     * Generate trend data based on real current S3 usage
     */
    private async generateTrendDataFromRealUsage(timeRange: TimeRange, currentStats: StorageStats): Promise<TrendDataPoint[]> {
        // Lấy danh sách files thực tế từ S3 để xác định ngày upload
        const filesInfo = await this.getS3FilesWithDates();

        // Nếu không có file nào, trả về empty array
        if (filesInfo.length === 0) {
            console.log('No files found in S3, returning empty trend data');
            return [];
        }

        // Group files by upload date (convert to Vietnam timezone UTC+7)
        const filesByDate = new Map<string, { totalSize: number; fileCount: number }>();

        filesInfo.forEach(file => {
            // Convert to Vietnam timezone (UTC+7)
            const vietnamDate = new Date(file.lastModified.getTime() + 7 * 60 * 60 * 1000);
            let dateKey: string;

            // Group by month for year view, by day for week/month view
            if (timeRange === 'year') {
                dateKey = vietnamDate.toISOString().substring(0, 7); // YYYY-MM (group by month)
            } else {
                dateKey = vietnamDate.toISOString().split('T')[0]; // YYYY-MM-DD (group by day)
            }

            if (!filesByDate.has(dateKey)) {
                filesByDate.set(dateKey, { totalSize: 0, fileCount: 0 });
            }

            const data = filesByDate.get(dateKey)!;
            data.totalSize += file.size;
            data.fileCount += 1;
        });

        console.log(`Files grouped by ${timeRange === 'year' ? 'month' : 'date'} (Vietnam timezone):`, Object.fromEntries(filesByDate));

        // Filter dates based on time range
        const now = new Date();
        const vietnamNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
        const cutoffDate = new Date(vietnamNow);

        switch (timeRange) {
            case 'week':
                cutoffDate.setDate(vietnamNow.getDate() - 7);
                break;
            case 'month':
                cutoffDate.setDate(vietnamNow.getDate() - 30);
                break;
            case 'year':
                cutoffDate.setFullYear(vietnamNow.getFullYear() - 1);
                break;
        }        // Convert to trend data points - ensure complete periods for each time range
        const data: TrendDataPoint[] = [];
        let cumulativeStorage = 0; if (timeRange === 'year') {
            // For year view: generate 12 months from January (month 1) to December (month 12) of current year
            const currentYear = vietnamNow.getFullYear();
            const currentMonth = vietnamNow.getMonth(); // 0-based (0 = January, 11 = December)

            // Generate 12 months: from January (index 0) to December (index 11) OR up to current month
            for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
                // If this month is in the future (haven't occurred yet), skip it
                if (monthIndex > currentMonth) {
                    break; // Stop at current month, don't show future months
                }

                // Create date key for this month (YYYY-MM)
                const monthKey = `${currentYear}-${String(monthIndex + 1).padStart(2, '0')}`;

                // Get data for this month (if exists)
                const monthData = filesByDate.get(monthKey) || { totalSize: 0, fileCount: 0 };

                // Update cumulative storage
                cumulativeStorage += monthData.totalSize;

                // Create date for first day of this month
                const monthDate = new Date(currentYear, monthIndex, 1);
                const vietnamMonthDate = new Date(monthDate.getTime() + 7 * 60 * 60 * 1000);

                // Calculate bandwidth (0 if no uploads in this month)
                const bandwidthIn = monthData.totalSize;
                const bandwidthOut = Math.floor(monthData.totalSize * 0.1);

                data.push({
                    date: vietnamMonthDate.toISOString(),
                    storage: cumulativeStorage,
                    bandwidthIn: bandwidthIn,
                    bandwidthOut: bandwidthOut,
                    totalBandwidth: bandwidthIn + bandwidthOut,
                });

                console.log(`Month ${monthKey}: files=${monthData.fileCount}, size=${monthData.totalSize}, cumulative=${cumulativeStorage}`);
            }
        } else if (timeRange === 'week') {
            // For week view: generate 7 days from Monday to Sunday of current week
            const currentDay = vietnamNow.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
            const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1; // Convert to days from Monday

            // Calculate Monday of current week
            const mondayOfWeek = new Date(vietnamNow);
            mondayOfWeek.setDate(vietnamNow.getDate() - daysFromMonday);
            mondayOfWeek.setHours(0, 0, 0, 0);

            // Generate 7 days: Monday to Sunday
            for (let i = 0; i < 7; i++) {
                const dayDate = new Date(mondayOfWeek);
                dayDate.setDate(mondayOfWeek.getDate() + i);

                // Create date key for this day (YYYY-MM-DD)
                const dayKey = dayDate.toISOString().split('T')[0];

                // Get data for this day (if exists)
                const dayData = filesByDate.get(dayKey) || { totalSize: 0, fileCount: 0 };

                // Update cumulative storage
                cumulativeStorage += dayData.totalSize;

                // Create Vietnam timezone date
                const vietnamDayDate = new Date(dayDate.getTime() + 7 * 60 * 60 * 1000);

                // Calculate bandwidth (0 if no uploads on this day)
                const bandwidthIn = dayData.totalSize;
                const bandwidthOut = Math.floor(dayData.totalSize * 0.1);

                data.push({
                    date: vietnamDayDate.toISOString(),
                    storage: cumulativeStorage,
                    bandwidthIn: bandwidthIn,
                    bandwidthOut: bandwidthOut,
                    totalBandwidth: bandwidthIn + bandwidthOut,
                });

                const dayNames = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
                const dayName = dayNames[dayDate.getDay()];
                console.log(`${dayName} ${dayKey}: files=${dayData.fileCount}, size=${dayData.totalSize}, cumulative=${cumulativeStorage}`);
            }
        } else {
            // For month view: generate days in current month from day 1 to current date (not future dates)
            // This ensures we only show days that have already occurred

            // Get first day of current month
            const firstDayOfMonth = new Date(vietnamNow.getFullYear(), vietnamNow.getMonth(), 1);
            firstDayOfMonth.setHours(0, 0, 0, 0);

            // Get current date (today)
            const currentDate = new Date(vietnamNow);
            currentDate.setHours(0, 0, 0, 0);

            // Calculate how many days from start of month to current date
            const currentDay = vietnamNow.getDate();

            // Generate days from day 1 to current day (don't include future dates)
            for (let i = 0; i < currentDay; i++) {
                const dayDate = new Date(firstDayOfMonth);
                dayDate.setDate(firstDayOfMonth.getDate() + i);

                // Create date key for this day (YYYY-MM-DD)
                const dayKey = dayDate.toISOString().split('T')[0];

                // Get data for this day (if exists)
                const dayData = filesByDate.get(dayKey) || { totalSize: 0, fileCount: 0 };

                // Update cumulative storage
                cumulativeStorage += dayData.totalSize;

                // Create Vietnam timezone date
                const vietnamDayDate = new Date(dayDate.getTime() + 7 * 60 * 60 * 1000);

                // Calculate bandwidth (0 if no uploads on this day)
                const bandwidthIn = dayData.totalSize;
                const bandwidthOut = Math.floor(dayData.totalSize * 0.1);

                data.push({
                    date: vietnamDayDate.toISOString(),
                    storage: cumulativeStorage,
                    bandwidthIn: bandwidthIn,
                    bandwidthOut: bandwidthOut,
                    totalBandwidth: bandwidthIn + bandwidthOut,
                });

                console.log(`Day ${dayKey} (${i + 1}/${currentDay}): files=${dayData.fileCount}, size=${dayData.totalSize}, cumulative=${cumulativeStorage}`);
            }
        }

        console.log('Generated trend data points:', data.length);
        console.log('Sample data points:', data.slice(0, 3));

        return data;
    }

    /**
     * Generate realistic mock trend data for demonstration (fallback only)
     */    private generateMockTrendData(timeRange: TimeRange, type: 'storage' | 'bandwidth' | 'combined'): TrendDataPoint[] {
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Set về đầu ngày
        const data: TrendDataPoint[] = [];

        // Get current storage stats as baseline
        const baseStorage = 50 * 1024 * 1024 * 1024; // 50GB baseline
        const baseBandwidthIn = 5 * 1024 * 1024 * 1024; // 5GB baseline
        const baseBandwidthOut = 3 * 1024 * 1024 * 1024; // 3GB baseline

        let points: number;
        let dateStep: (date: Date, index: number) => Date; switch (timeRange) {
            case 'week':
                points = 7;
                dateStep = (date, index) => {
                    // Calculate Monday of current week
                    const currentDay = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
                    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
                    const mondayOfWeek = new Date(date);
                    mondayOfWeek.setDate(date.getDate() - daysFromMonday);
                    mondayOfWeek.setHours(0, 0, 0, 0);

                    // Return Monday + index days (0 = Monday, 1 = Tuesday, ..., 6 = Sunday)
                    const newDate = new Date(mondayOfWeek);
                    newDate.setDate(mondayOfWeek.getDate() + index);
                    return newDate;
                };
                break; case 'month':
                // Calculate days from start of month to current date (don't include future dates)
                const currentDate = new Date(now);
                points = currentDate.getDate(); // Current day number (e.g., if today is 3/8 then points = 3)

                dateStep = (date, index) => {
                    // Start from day 1 of current month
                    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
                    const newDate = new Date(firstDayOfMonth);
                    newDate.setDate(1 + index); // index 0 = day 1, index 1 = day 2, etc.
                    newDate.setHours(0, 0, 0, 0);
                    return newDate;
                };
                break; case 'year':
                // Calculate months from January to current month (don't include future months)
                const currentDateForYear = new Date(now);
                points = currentDateForYear.getMonth() + 1; // Current month number (e.g., if today is August then points = 8)

                dateStep = (date, index) => {
                    // Start from January of current year
                    const newDate = new Date(date.getFullYear(), index, 1); // index 0 = January, index 1 = February, etc.
                    newDate.setHours(0, 0, 0, 0);
                    return newDate;
                };
                break;
        }

        for (let i = 0; i < points; i++) {
            const date = dateStep(now, i);

            // Generate realistic storage growth (gradual increase)
            const storageGrowthFactor = 1 + (i / points) * 0.3; // 30% growth over period
            const storageVariation = 0.95 + Math.random() * 0.1; // ±5% random variation
            const storage = Math.floor(baseStorage * storageGrowthFactor * storageVariation);

            // Generate realistic bandwidth usage (more volatile)
            const bandwidthVariation = 0.5 + Math.random() * 1.0; // ±50% variation
            const weekdayMultiplier = date.getDay() >= 1 && date.getDay() <= 5 ? 1.2 : 0.8; // Higher on weekdays

            const bandwidthIn = Math.floor(baseBandwidthIn * bandwidthVariation * weekdayMultiplier);
            const bandwidthOut = Math.floor(baseBandwidthOut * bandwidthVariation * weekdayMultiplier);

            data.push({
                date: date.toISOString(),
                storage,
                bandwidthIn,
                bandwidthOut,
                totalBandwidth: bandwidthIn + bandwidthOut,
            });
        }

        return data;
    }
}
