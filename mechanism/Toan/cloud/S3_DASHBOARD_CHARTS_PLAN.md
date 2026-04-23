# Kế hoạch bổ sung biểu đồ S3 vào Dashboard

## 1. Mục tiêu
Thêm các biểu đồ thống kê về việc sử dụng AWS S3 storage vào trang Dashboard, với cấu hình S3 lấy từ database.

## 2. Cấu trúc Database hiện tại
### Bảng: `aws_s3_config`
- `id`: UUID
- `organizationId`: UUID (FK to organizations)
- `bucketName`: string
- `region`: string
- `accessKeyId`: string (encrypted)
- `secretAccessKey`: string (encrypted)
- `isActive`: boolean
- `createdAt`: timestamp
- `updatedAt`: timestamp

## 3. Backend API cần bổ sung

### 3.1. Endpoint: `/api/dashboard/s3-stats`
**File**: `backend/src/dashboard/dashboard.controller.ts`

```typescript
@Get('s3-stats')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('dashboard.access')
async getS3Statistics(
  @CurrentUser() user: User,
  @Query('organizationId') organizationId?: string,
) {
  return this.dashboardService.getS3Statistics(user, organizationId);
}
```

### 3.2. Service Method: `getS3Statistics`
**File**: `backend/src/dashboard/dashboard.service.ts`

```typescript
async getS3Statistics(user: User, organizationId?: string) {
  // 1. Lấy S3 config từ database
  const s3Config = await this.awsS3ConfigService.getActiveConfig(
    organizationId || user.organizationId
  );

  if (!s3Config) {
    throw new NotFoundException('Không tìm thấy cấu hình S3');
  }

  // 2. Khởi tạo S3 client với config từ DB
  const s3Client = new S3Client({
    region: s3Config.region,
    credentials: {
      accessKeyId: s3Config.accessKeyId,
      secretAccessKey: s3Config.secretAccessKey,
    },
  });

  // 3. Lấy thống kê từ S3
  const stats = await this.calculateS3Stats(s3Client, s3Config.bucketName);

  return stats;
}

private async calculateS3Stats(s3Client: S3Client, bucketName: string) {
  // List all objects in bucket
  const listCommand = new ListObjectsV2Command({
    Bucket: bucketName,
  });
  
  const response = await s3Client.send(listCommand);
  const objects = response.Contents || [];

  // Phân loại theo folder/prefix
  const folderStats = {
    avatars: { count: 0, size: 0 },
    documents: { count: 0, size: 0 },
    images: { count: 0, size: 0 },
    others: { count: 0, size: 0 },
  };

  objects.forEach(obj => {
    const key = obj.Key || '';
    const size = obj.Size || 0;

    if (key.startsWith('avatars/')) {
      folderStats.avatars.count++;
      folderStats.avatars.size += size;
    } else if (key.startsWith('documents/')) {
      folderStats.documents.count++;
      folderStats.documents.size += size;
    } else if (key.startsWith('images/')) {
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

  return {
    bucketName,
    region: s3Config.region,
    totalFiles: totalCount,
    totalSize: totalSize,
    totalSizeFormatted: this.formatBytes(totalSize),
    folderStats: {
      avatars: {
        ...folderStats.avatars,
        sizeFormatted: this.formatBytes(folderStats.avatars.size),
        percentage: (folderStats.avatars.size / totalSize * 100).toFixed(2),
      },
      documents: {
        ...folderStats.documents,
        sizeFormatted: this.formatBytes(folderStats.documents.size),
        percentage: (folderStats.documents.size / totalSize * 100).toFixed(2),
      },
      images: {
        ...folderStats.images,
        sizeFormatted: this.formatBytes(folderStats.images.size),
        percentage: (folderStats.images.size / totalSize * 100).toFixed(2),
      },
      others: {
        ...folderStats.others,
        sizeFormatted: this.formatBytes(folderStats.others.size),
        percentage: (folderStats.others.size / totalSize * 100).toFixed(2),
      },
    },
    monthlyStats,
  };
}

private calculateMonthlyStats(objects: any[]) {
  const monthlyData = new Map<string, { count: number; size: number }>();

  objects.forEach(obj => {
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
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
```

## 4. Frontend Components

### 4.1. API Service
**File**: `frontend/src/shared/services/dashboard.service.ts`

```typescript
// Thêm interface
export interface S3Statistics {
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

// Thêm method
async getS3Statistics(organizationId?: string): Promise<S3Statistics> {
  const params = organizationId ? { organizationId } : {};
  const response = await api.get<S3Statistics>('/dashboard/s3-stats', { params });
  return response.data;
}
```

### 4.2. React Query Hook
**File**: `frontend/src/shared/hooks/queries/useDashboard.ts`

```typescript
export const useS3Statistics = (organizationId?: string) => {
  return useQuery({
    queryKey: ['s3-statistics', organizationId],
    queryFn: () => dashboardService.getS3Statistics(organizationId),
    staleTime: 5 * 60 * 1000, // 5 phút
    gcTime: 10 * 60 * 1000, // 10 phút
  });
};
```

### 4.3. S3 Storage Chart Component
**File mới**: `frontend/src/features/dashboard/components/S3StorageChart.tsx`

```typescript
import { Pie } from 'react-chartjs-2';
import { useS3Statistics } from '@/shared/hooks/queries/useDashboard';

interface S3StorageChartProps {
  organizationId?: string;
}

export const S3StorageChart: React.FC<S3StorageChartProps> = ({ organizationId }) => {
  const { data, isLoading, error } = useS3Statistics(organizationId);

  if (isLoading) {
    return <div className="animate-pulse">Đang tải...</div>;
  }

  if (error || !data) {
    return <div className="text-red-500">Không thể tải dữ liệu S3</div>;
  }

  const chartData = {
    labels: [
      `Avatars (${data.folderStats.avatars.percentage}%)`,
      `Documents (${data.folderStats.documents.percentage}%)`,
      `Images (${data.folderStats.images.percentage}%)`,
      `Others (${data.folderStats.others.percentage}%)`,
    ],
    datasets: [
      {
        label: 'Storage Usage',
        data: [
          data.folderStats.avatars.size,
          data.folderStats.documents.size,
          data.folderStats.images.size,
          data.folderStats.others.size,
        ],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',  // blue
          'rgba(16, 185, 129, 0.8)',  // green
          'rgba(245, 158, 11, 0.8)',  // yellow
          'rgba(156, 163, 175, 0.8)', // gray
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      title: {
        display: true,
        text: `S3 Storage Distribution - ${data.bucketName}`,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const formatted = formatBytes(value);
            return `${label}: ${formatted}`;
          },
        },
      },
    },
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Phân bổ dung lượng S3</h3>
        <p className="text-sm text-gray-500">
          Tổng: {data.totalSizeFormatted} ({data.totalFiles} files)
        </p>
        <p className="text-xs text-gray-400">
          Region: {data.region}
        </p>
      </div>
      <div style={{ height: '300px' }}>
        <Pie data={chartData} options={options} />
      </div>
      
      {/* Detail stats */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="border-l-4 border-blue-500 pl-2">
          <div className="font-medium">Avatars</div>
          <div className="text-gray-600">
            {data.folderStats.avatars.count} files • {data.folderStats.avatars.sizeFormatted}
          </div>
        </div>
        <div className="border-l-4 border-green-500 pl-2">
          <div className="font-medium">Documents</div>
          <div className="text-gray-600">
            {data.folderStats.documents.count} files • {data.folderStats.documents.sizeFormatted}
          </div>
        </div>
        <div className="border-l-4 border-yellow-500 pl-2">
          <div className="font-medium">Images</div>
          <div className="text-gray-600">
            {data.folderStats.images.count} files • {data.folderStats.images.sizeFormatted}
          </div>
        </div>
        <div className="border-l-4 border-gray-500 pl-2">
          <div className="font-medium">Others</div>
          <div className="text-gray-600">
            {data.folderStats.others.count} files • {data.folderStats.others.sizeFormatted}
          </div>
        </div>
      </div>
    </div>
  );
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
```

### 4.4. S3 Monthly Trend Chart
**File mới**: `frontend/src/features/dashboard/components/S3TrendChart.tsx`

```typescript
import { Line } from 'react-chartjs-2';
import { useS3Statistics } from '@/shared/hooks/queries/useDashboard';

interface S3TrendChartProps {
  organizationId?: string;
}

export const S3TrendChart: React.FC<S3TrendChartProps> = ({ organizationId }) => {
  const { data, isLoading, error } = useS3Statistics(organizationId);

  if (isLoading) {
    return <div className="animate-pulse">Đang tải...</div>;
  }

  if (error || !data) {
    return <div className="text-red-500">Không thể tải dữ liệu S3</div>;
  }

  const chartData = {
    labels: data.monthlyStats.map(stat => {
      const [year, month] = stat.month.split('-');
      return `${month}/${year}`;
    }),
    datasets: [
      {
        label: 'Storage Size (GB)',
        data: data.monthlyStats.map(stat => stat.size / (1024 * 1024 * 1024)), // Convert to GB
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.3,
        yAxisID: 'y',
      },
      {
        label: 'File Count',
        data: data.monthlyStats.map(stat => stat.count),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.3,
        yAxisID: 'y1',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'S3 Storage Trend (Last 12 Months)',
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Storage (GB)',
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'File Count',
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div style={{ height: '350px' }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};
```

### 4.5. Cập nhật Dashboard Page
**File**: `frontend/src/features/dashboard/pages/DashboardPage.tsx`

```typescript
// Thêm imports
import { S3StorageChart } from '../components/S3StorageChart';
import { S3TrendChart } from '../components/S3TrendChart';

// Trong component, thêm section mới:
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
  {/* S3 Storage Distribution */}
  <S3StorageChart organizationId={selectedOrganizationId} />
  
  {/* S3 Trend Chart */}
  <S3TrendChart organizationId={selectedOrganizationId} />
</div>
```

## 5. Dependencies cần thêm

### Backend
```json
// backend/package.json
{
  "@aws-sdk/client-s3": "^3.x.x" // Đã có sẵn
}
```

### Frontend
```json
// frontend/package.json
{
  "chart.js": "^4.x.x",
  "react-chartjs-2": "^5.x.x"
}
```

## 6. Cài đặt

```bash
# Frontend
cd frontend
npm install chart.js react-chartjs-2

# Backend - không cần cài thêm (đã có @aws-sdk/client-s3)
```

## 7. Setup Chart.js

**File mới**: `frontend/src/shared/config/chartjs.config.ts`

```typescript
import {
  Chart as ChartJS,
  ArcElement,
  LineElement,
  BarElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  ArcElement,
  LineElement,
  BarElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default ChartJS;
```

**Import vào**: `frontend/src/main.tsx`

```typescript
import './shared/config/chartjs.config';
```

## 8. Permissions

Permission đã có: `dashboard.access` - dùng cho cả S3 stats

## 9. Caching Strategy

- **Backend**: Không cache (data thay đổi realtime)
- **Frontend**: TanStack Query với:
  - `staleTime`: 5 phút (dữ liệu S3 không thay đổi liên tục)
  - `gcTime`: 10 phút
  - Manual refetch khi user cần

## 10. Error Handling

- S3 config không tồn tại → Hiện message "Chưa cấu hình S3"
- Credentials không hợp lệ → Hiện message "Không thể kết nối S3"
- Network error → Retry 3 lần với exponential backoff
- Không có quyền truy cập bucket → Message "Không có quyền truy cập"

## 11. Performance Considerations

- **Lazy load**: Chỉ load S3 stats khi user scroll đến section đó
- **Pagination**: Nếu bucket có >1000 objects, sử dụng pagination
- **Caching**: Cache kết quả S3 API call trong 5 phút
- **Background job**: Cân nhắc tạo cron job để tính toán stats định kỳ và lưu vào database

## 12. Triển khai theo thứ tự

1. ✅ Backend: Thêm S3 statistics endpoint
2. ✅ Backend: Implement service methods
3. ✅ Frontend: Cài đặt chart.js dependencies
4. ✅ Frontend: Setup Chart.js config
5. ✅ Frontend: Tạo API service methods
6. ✅ Frontend: Tạo React Query hooks
7. ✅ Frontend: Tạo S3StorageChart component
8. ✅ Frontend: Tạo S3TrendChart component
9. ✅ Frontend: Tích hợp vào DashboardPage
10. ✅ Testing: Test với real S3 data
11. ✅ Error handling và loading states
12. ✅ Performance optimization

## 13. Testing Checklist

- [ ] Backend API trả về đúng format
- [ ] S3 config được load từ database đúng organization
- [ ] Chart hiển thị đúng dữ liệu
- [ ] Loading states hoạt động
- [ ] Error handling hoạt động
- [ ] Cache hoạt động đúng
- [ ] Responsive trên mobile
- [ ] Performance với bucket lớn (>1000 files)

## 14. Lưu ý bảo mật

- ✅ S3 credentials được encrypt trong database (đã có sẵn)
- ✅ Chỉ show stats cho organization của user
- ✅ Validate permissions trước khi trả về data
- ✅ Không expose S3 credentials ra frontend
- ✅ Rate limiting cho S3 stats API
