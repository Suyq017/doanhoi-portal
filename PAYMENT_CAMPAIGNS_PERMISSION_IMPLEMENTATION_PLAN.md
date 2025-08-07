# Kế hoạch Phân quyền cho Trang Quản lý Đóng phí - Chi tiết Implementation

## 📋 Tổng quan

File kế hoạch này chi tiết hóa việc bổ sung tính năng phân quyền cho trang quản lý đóng phí để:
- **Chỉ hiển thị payment campaigns** thuộc tổ chức mà user có quyền
- **Giới hạn combobox chọn tổ chức** khi tạo campaign theo quyền user
- **Super admin thấy tất cả**, các role khác chỉ thấy theo organizational context

## ✅ Đã hoàn thành

### 1. Permission System Integration
- ✅ **usePermissions Hook**: Đã thêm payment campaign permissions
- ✅ **PaymentCampaignsPage**: Đã thêm page-level access control và permission guards cho modals
- ✅ **PaymentCampaignList**: Đã thêm permission guards cho action buttons và conditional action column

### 2. Permission Methods Added
```typescript
// Đã thêm vào usePermissions hook:
canAccessPaymentCampaigns()           // Truy cập trang chính
canCreatePaymentCampaign()            // Tạo campaign mới
canViewPaymentCampaignDetails()       // Xem chi tiết
canUpdatePaymentCampaign()            // Cập nhật campaign
canDeletePaymentCampaign()            // Xóa campaign
canManagePaymentAssignments()         // Quản lý assignments
canViewPaymentReports()               // Xem báo cáo
canExportPaymentData()                // Xuất dữ liệu
isSuperAdmin()                        // Check super admin
```

## 🔄 Cần thực hiện tiếp

### Phase 1: Backend API Enhancement
**Mục tiêu**: Filter campaigns theo organizations mà user có quyền

#### 1.1. Payment Campaign Controller
```typescript
// backend/src/payment/controllers/payment-campaign.controller.ts

@Get()
@RequirePermissions('payment-campaigns.access')
async findAll(
  @Query('organizationId') organizationId?: string,
  @Query('status') status?: string,
  @Query('search') search?: string,
  @Query('startDate') startDate?: string,
  @Query('endDate') endDate?: string,
  @Query('page') page?: string,
  @Query('limit') limit?: string,
  @Request() req: any
) {
  const userId = req.user.id;
  const userRoles = await this.rolesService.getUserRoles(userId, organizationId);
  
  // Check if user is super admin
  const isSuperAdmin = userRoles.some(role => 
    role.role.name === 'super_admin' || 
    role.role.permissions.some(p => p.code === 'system.access_admin')
  );
  
  let accessibleOrgIds: string[] = [];
  
  if (isSuperAdmin) {
    // Super admin can see all campaigns
    accessibleOrgIds = []; // Empty means no filter
  } else {
    // Get organizations where user has payment permissions
    accessibleOrgIds = userRoles
      .filter(ur => ur.role.permissions.some(p => p.code.startsWith('payment-campaigns.')))
      .map(ur => ur.organizationId)
      .filter(Boolean);
  }

  return this.campaignService.findAll({
    organizationId,
    status: status as any,
    search,
    startDate,
    endDate,
    page: page ? parseInt(page) : undefined,
    limit: limit ? parseInt(limit) : undefined,
    accessibleOrgIds: isSuperAdmin ? undefined : accessibleOrgIds
  });
}
```

#### 1.2. Payment Campaign Service
```typescript
// backend/src/payment/services/payment-campaign.service.ts

async findAll(options?: {
  organizationId?: string;
  status?: PaymentCampaignStatus;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  accessibleOrgIds?: string[]; // New parameter
}): Promise<{ campaigns: PaymentCampaign[]; page: number; limit: number; total: number; totalPages: number }> {
  
  const { accessibleOrgIds, ...otherOptions } = options || {};
  
  // If accessibleOrgIds is provided, filter by those organizations
  if (accessibleOrgIds && accessibleOrgIds.length > 0) {
    const queryBuilder = this.campaignRepository.createQueryBuilder('campaign')
      .leftJoinAndSelect('campaign.organization', 'organization')
      .leftJoinAndSelect('campaign.createdByUser', 'createdByUser')
      .leftJoinAndSelect('campaign.feeLevels', 'feeLevels')
      .where('campaign.organizationId IN (:...orgIds)', { orgIds: accessibleOrgIds })
      .orderBy('campaign.createdAt', 'DESC');

    // Apply other filters...
    // (existing filter logic)

    const [campaigns, total] = await queryBuilder.getManyAndCount();
    // ... rest of pagination logic
  }
  
  // If no accessibleOrgIds restriction, use existing logic (for super admin)
  // ... existing implementation
}
```

#### 1.3. Accessible Organizations Endpoint
```typescript
// backend/src/payment/controllers/payment-campaign.controller.ts

@Get('accessible-organizations')
@RequirePermissions('payment-campaigns.access')
async getAccessibleOrganizations(@Request() req: any) {
  const userId = req.user.id;
  const userRoles = await this.rolesService.getUserRoles(userId);
  
  const isSuperAdmin = userRoles.some(role => 
    role.role.name === 'super_admin' || 
    role.role.permissions.some(p => p.code === 'system.access_admin')
  );
  
  if (isSuperAdmin) {
    // Return all organizations
    return this.organizationService.findAll();
  } else {
    // Return only organizations where user has payment permissions
    const accessibleOrgIds = userRoles
      .filter(ur => ur.role.permissions.some(p => p.code.startsWith('payment-campaigns.')))
      .map(ur => ur.organizationId)
      .filter(Boolean);
    
    return this.organizationService.findByIds(accessibleOrgIds);
  }
}
```

### Phase 2: PaymentCampaignForm Organization Filtering
**Mục tiêu**: Chỉ hiển thị các tổ chức mà user có quyền tạo campaign

#### 2.1. Cập nhật PaymentCampaignForm
```typescript
// frontend/src/features/fee-collection/components/admin/PaymentCampaignForm.tsx

import { usePermissions } from '../../../shared/hooks/usePermissions';
import { useAuth } from '../../../features/auth/context/AuthContext';

const PaymentCampaignForm: React.FC<PaymentCampaignFormProps> = ({
  campaign,
  mode,
  onSave,
  onCancel,
}) => {
  const permissions = usePermissions();
  const { user, userRoles } = useAuth();
  const [availableOrganizations, setAvailableOrganizations] = useState<Organization[]>([]);
  const [loadingOrganizations, setLoadingOrganizations] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrganizations = async () => {
    try {
      setLoadingOrganizations(true);
      setError(null);
      
      // Use the new API endpoint that automatically filters by permissions
      const response = await fetch('/api/payment-campaigns/accessible-organizations', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load organizations');
      }
      
      const organizations = await response.json();
      setAvailableOrganizations(organizations);
    } catch (err) {
      console.error('Error loading organizations:', err);
      setError('Không thể tải danh sách tổ chức');
    } finally {
      setLoadingOrganizations(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Organization Selection - Filtered by permissions */}
      <div>
        <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
          Tổ chức <span className="text-red-500">*</span>
        </label>
        <SearchableCombobox
          value={formData.organizationId}
          onChange={handleOrganizationSelect}
          options={availableOrganizations.map(org => ({
            value: org.id,
            label: org.name,
            displayName: org.name
          }))}
          placeholder="Chọn tổ chức..."
          disabled={mode === 'edit' || loadingOrganizations}
          className="w-full"
        />
        {loadingOrganizations && (
          <p className="mt-1 text-xs text-gray-500">
            Đang tải danh sách tổ chức...
          </p>
        )}
        {!permissions.isSuperAdmin() && availableOrganizations.length === 0 && !loadingOrganizations && (
          <p className="mt-1 text-xs text-orange-600">
            Bạn chưa có quyền tạo campaign cho tổ chức nào. Liên hệ quản trị viên để được cấp quyền.
          </p>
        )}
        {error && (
          <p className="mt-1 text-xs text-red-600">
            {error}
          </p>
        )}
      </div>
      
      {/* Rest of form fields... */}
    </form>
  );
};
```

### Phase 3: Service Layer Updates
**Mục tiêu**: Cập nhật frontend services để tự động filter theo permissions

#### 3.1. PaymentCampaignService Enhancement
```typescript
// frontend/src/shared/services/fee-collection-service/paymentCampaignService.ts

class PaymentCampaignService {
  // Get campaigns with automatic organization filtering
  async getPaymentCampaigns(filters: PaymentCampaignFilters = {}): Promise<PaginatedResponse<PaymentCampaign>> {
    const params = new URLSearchParams();

    // Apply filters - backend will handle organization filtering based on user permissions
    if (filters.organizationId) params.append('organizationId', filters.organizationId);
    if (filters.status) params.append('status', filters.status);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await fetch(`${API_BASE}/payment-campaigns?${params}`, {
      headers: this.getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch payment campaigns');
    }
    return response.json();
  }

  // Get user's accessible organizations for campaign creation
  async getAccessibleOrganizationsForCampaigns(): Promise<Organization[]> {
    const response = await fetch(`${API_BASE}/payment-campaigns/accessible-organizations`, {
      headers: this.getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch accessible organizations');
    }
    return response.json();
  }
}
```

### Phase 4: Hook Updates
**Mục tiêu**: Cập nhật hooks để tích hợp permissions

#### 4.1. usePaymentCampaigns Hook Enhancement
```typescript
// frontend/src/features/fee-collection/hooks/usePaymentCampaigns.ts

export const usePaymentCampaigns = (initialFilters: PaymentCampaignFilters = {}) => {
  const permissions = usePermissions();
  
  const loadCampaigns = async () => {
    // Check permission before loading
    if (!permissions.canAccessPaymentCampaigns()) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Không có quyền truy cập' 
      }));
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // Backend automatically filters by user's accessible organizations
      const response = await paymentCampaignService.getPaymentCampaigns(state.filters);
      
      setState(prev => ({
        ...prev,
        campaigns: response.campaigns,
        loading: false,
        pagination: {
          page: response.page,
          limit: response.limit,
          total: response.total,
          totalPages: response.totalPages
        }
      }));
    } catch (error) {
      setState(prev => ({ ...prev, loading: false, error: error.message }));
    }
  };

  return {
    ...state,
    loadCampaigns,
    permissions: {
      canCreate: permissions.canCreatePaymentCampaign(),
      canUpdate: permissions.canUpdatePaymentCampaign(),
      canDelete: permissions.canDeletePaymentCampaign(),
      canViewDetails: permissions.canViewPaymentCampaignDetails(),
    }
  };
};
```

### Phase 5: PaymentCampaignDetailPage Permission Guards
**Mục tiêu**: Bảo vệ trang chi tiết campaign

#### 5.1. PaymentCampaignDetailPage Guards
```typescript
// frontend/src/features/fee-collection/page/admin/PaymentCampaignDetailPage.tsx

const PaymentCampaignDetailPage: React.FC = () => {
  const permissions = usePermissions();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  // Check access when campaign loads
  useEffect(() => {
    if (campaign) {
      // Super admin has access to all campaigns
      if (permissions.isSuperAdmin()) {
        setHasAccess(true);
        return;
      }

      // Check if user has access to this campaign's organization
      const userOrgIds = userRoles
        .filter(ur => ur.role.permissions.some(p => p.code.startsWith('payment-campaigns.')))
        .map(ur => ur.organizationId)
        .filter(Boolean);
      
      const hasOrgAccess = userOrgIds.includes(campaign.organizationId);
      setHasAccess(hasOrgAccess);
    }
  }, [campaign, permissions, userRoles]);

  if (hasAccess === false) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Không có quyền truy cập
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Bạn không có quyền xem campaign này.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Action Buttons */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{campaign?.name}</h1>
        </div>
        
        <div className="flex space-x-2">
          <PermissionGuard permission="payment-campaigns.update">
            {campaign?.status === 'DRAFT' && (
              <button onClick={() => handleStatusChange('activate')}>
                Kích hoạt
              </button>
            )}
          </PermissionGuard>

          <PermissionGuard permission="payment-campaigns.delete">
            <button 
              onClick={handleDelete}
              className="text-red-600 hover:text-red-900"
            >
              Xóa
            </button>
          </PermissionGuard>
        </div>
      </div>

      {/* Campaign Details */}
      {permissions.canViewPaymentCampaignDetails() && (
        <div className="campaign-details">
          {/* Campaign info display */}
        </div>
      )}

      {/* Fee Levels Management */}
      <PermissionGuard permission="payment-campaigns.update">
        <PaymentFeeLevelManager campaignId={campaign.id} />
      </PermissionGuard>

      {/* Assignment Management */}
      <PermissionGuard permission="payment-campaigns.manage_assignments">
        <PaymentAssignmentManager campaignId={campaign.id} />
      </PermissionGuard>

      {/* Reports Section */}
      <PermissionGuard permission="payment-campaigns.view_reports">
        <PaymentReportsSection campaignId={campaign.id} />
      </PermissionGuard>
    </div>
  );
};
```

## 🧪 Testing Strategy

### 1. Permission Test Cases

#### Super Admin User
- ✅ Có thể xem tất cả payment campaigns từ mọi tổ chức
- ✅ Combobox tổ chức hiển thị tất cả organizations
- ✅ Có thể create, edit, delete bất kỳ campaign nào
- ✅ Tất cả action buttons hiển thị

#### Organization Admin
- ✅ Chỉ xem campaigns thuộc tổ chức của họ
- ✅ Combobox chỉ hiển thị tổ chức họ có quyền
- ✅ Có thể create, edit, delete campaigns trong scope
- ✅ Action buttons hiển thị đúng permissions

#### Manager Role
- ✅ Xem campaigns theo organizational scope
- ✅ Có thể create, view, edit campaigns
- ❌ Không thể delete campaigns
- ✅ Có thể manage assignments và view reports

#### Editor/Viewer Role
- ✅ Chỉ có thể xem (read-only)
- ❌ Không có nút Create
- ❌ Không có action buttons edit/delete
- ❌ Combobox tổ chức disabled

#### No Permissions User
- ❌ Không thể truy cập trang
- ❌ Hiển thị "Không có quyền truy cập"

### 2. Organization Filtering Tests

#### Multi-Organization User
- User có role ở nhiều organizations
- Payment campaigns từ tất cả orgs đều hiển thị
- Combobox hiển thị tất cả accessible orgs

#### Single Organization User  
- User chỉ có role ở 1 organization
- Chỉ campaigns của org đó hiển thị
- Combobox chỉ có 1 option

#### Hierarchical Organizations
- User có role ở parent org
- Có thể xem campaigns của child orgs (nếu có permission)
- Parent/child relationship được respect

## 📋 Implementation Checklist

### Phase 1: Backend (Priority: High)
- [ ] Cập nhật PaymentCampaignController với organization filtering
- [ ] Thêm PaymentCampaignService.findAll với accessibleOrgIds
- [ ] Tạo API endpoint /accessible-organizations
- [ ] Test API endpoints với các roles khác nhau

### Phase 2: PaymentCampaignForm (Priority: High)
- [ ] Cập nhật form để load accessible organizations
- [ ] Thêm error handling và loading states
- [ ] Test combobox filtering với super admin vs regular user
- [ ] Validate form submission với filtered orgs

### Phase 3: Service Layer (Priority: Medium)
- [ ] Cập nhật PaymentCampaignService methods
- [ ] Thêm getAccessibleOrganizationsForCampaigns method
- [ ] Test service layer với permissions
- [ ] Error handling và retry logic

### Phase 4: Detail Page (Priority: Medium)
- [ ] Thêm permission guards cho PaymentCampaignDetailPage
- [ ] Access control cho campaign viewing
- [ ] Permission-based action buttons
- [ ] Test tất cả permission combinations

### Phase 5: Hooks (Priority: Low)
- [ ] Cập nhật usePaymentCampaigns hook
- [ ] Thêm permission checks vào hook logic
- [ ] Consistent error handling
- [ ] Performance optimization

### Phase 6: Testing (Priority: High)
- [ ] Unit tests cho permission logic
- [ ] Integration tests cho API filtering
- [ ] E2E tests cho user workflows
- [ ] Performance testing với large datasets

## 🔧 Technical Notes

### Permission Constants
```typescript
// Đã có sẵn trong backend seeds:
export const PAYMENT_PERMISSIONS = {
    ACCESS: 'payment-campaigns.access',
    CREATE: 'payment-campaigns.create',
    READ: 'payment-campaigns.read',
    UPDATE: 'payment-campaigns.update',
    DELETE: 'payment-campaigns.delete',
    MANAGE_ASSIGNMENTS: 'payment-campaigns.manage_assignments',
    VIEW_REPORTS: 'payment-campaigns.view_reports',
    EXPORT: 'payment-campaigns.export',
} as const;
```

### Super Admin Detection
```typescript
// Method để detect super admin
const isSuperAdmin = () => {
  return hasPermission('system.access_admin') || 
         userRoles.some(role => role.role.name === 'super_admin');
};
```

### Organization Access Logic
```typescript
// Logic để lấy accessible org IDs
const getAccessibleOrgIds = (userRoles: UserRole[]) => {
  return userRoles
    .filter(ur => ur.role.permissions.some(p => p.code.startsWith('payment-campaigns.')))
    .map(ur => ur.organizationId)
    .filter(Boolean);
};
```

## 🚀 Rollout Strategy

### Week 1: Core Backend Implementation
- Implement backend API filtering
- Basic permission checks
- Test với super admin và single org user

### Week 2: Frontend Integration
- PaymentCampaignsPage và PaymentCampaignList updates
- PaymentCampaignForm organization filtering
- Basic testing

### Week 3: Advanced Features
- PaymentCampaignDetailPage permissions
- Hook enhancements
- Comprehensive testing

### Week 4: Polish & Production
- Performance optimization
- Bug fixes
- Documentation
- Production deployment

## 🔒 Security Considerations

1. **Double Validation**: Permission checking ở cả frontend và backend
2. **Organization Filtering**: Không thể bypass bằng cách manipulate request
3. **Role Hierarchy**: Respect organization hierarchy trong permissions
4. **Audit Trail**: Log tất cả permission checks và access attempts
5. **Rate Limiting**: Limit permission check requests

## 📚 Documentation

### API Documentation
- Cập nhật Swagger docs cho new endpoints
- Permission requirements cho mỗi endpoint
- Example requests/responses

### User Guide
- Hướng dẫn sử dụng cho từng role
- Permission matrix table
- Troubleshooting guide

### Developer Guide
- Permission system architecture
- Adding new permissions
- Testing guidelines

---

**Status**: ✅ Phase 1 Frontend Permissions - Completed  
**Next**: 🔄 Backend API Enhancement  
**Priority**: High - Core functionality for organization-based filtering
