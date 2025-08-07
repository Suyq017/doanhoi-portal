# Kế hoạch Phân quyền cho Trang Quản lý Đóng phí (Payment Campaigns)

## Tổng quan yêu cầu

Bổ sung tính năng phân quyền cho trang quản lý đóng phí để:
- Chỉ hiển thị payment campaigns thuộc tổ chức mà user có quyền
- Giới hạn combobox chọn tổ chức khi tạo campaign theo quyền user
- Super admin thấy tất cả, các role khác chỉ thấy theo organizational context

## Phân tích cấu trúc hiện tại

### 1. Payment Permissions đã có
```typescript
// Backend permissions (đã seed)
'payment-campaigns.access'      // Truy cập trang quản lý payment campaigns
'payment-campaigns.create'      // Tạo payment campaign mới
'payment-campaigns.read'        // Xem chi tiết payment campaigns
'payment-campaigns.update'      // Cập nhật payment campaigns
'payment-campaigns.delete'      // Xóa payment campaigns
'payment-campaigns.manage_assignments'  // Quản lý gán thanh toán
'payment-campaigns.view_reports'        // Xem báo cáo
'payment-campaigns.export'              // Xuất dữ liệu
```

### 2. Role Assignments hiện tại
- **super_admin**: Tất cả payment permissions + system-wide access
- **admin**: Tất cả payment permissions + organization scope
- **manager**: Limited payment permissions (access, create, read, update, manage_assignments, view_reports)
- **editor**: Chỉ read permission
- **viewer**: Chỉ read permission

### 3. Files cần chỉnh sửa
```
PaymentCampaignsPage.tsx           // Main page component
PaymentCampaignList.tsx            // List component  
PaymentCampaignForm.tsx            // Create/Edit form
PaymentCampaignDetailPage.tsx      // Detail page
paymentCampaignService.ts          // API service
usePaymentCampaigns.ts             // Hooks
```

## Kế hoạch thực hiện chi tiết

### Phase 1: Permission System Integration

#### 1.1. Cập nhật Permission Constants
```typescript
// frontend/src/shared/constants/permissions.ts
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

#### 1.2. Thêm Payment Permissions vào usePermissions Hook
```typescript
// frontend/src/shared/hooks/usePermissions.ts
export const usePermissions = () => {
  const { hasPermission, hasAnyPermission, currentOrganizationId } = useAuth();

  return {
    // ...existing permissions...
    
    // Payment campaigns permissions
    canAccessPaymentCampaigns: () => hasPermission('payment-campaigns.access', currentOrganizationId),
    canCreatePaymentCampaign: () => hasPermission('payment-campaigns.create', currentOrganizationId),
    canViewPaymentCampaignDetails: () => hasPermission('payment-campaigns.read', currentOrganizationId),
    canUpdatePaymentCampaign: () => hasPermission('payment-campaigns.update', currentOrganizationId),
    canDeletePaymentCampaign: () => hasPermission('payment-campaigns.delete', currentOrganizationId),
    canManagePaymentAssignments: () => hasPermission('payment-campaigns.manage_assignments', currentOrganizationId),
    canViewPaymentReports: () => hasPermission('payment-campaigns.view_reports', currentOrganizationId),
    canExportPaymentData: () => hasPermission('payment-campaigns.export', currentOrganizationId),
    
    // Check if user is super admin (system-wide access)
    isSuperAdmin: () => hasPermission('system.access_admin') || userRoles.some(role => role.name === 'super_admin'),
  };
};
```

### Phase 2: Organization-based Filtering

#### 2.1. Backend API Enhancement
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

#### 2.2. Payment Campaign Service Update
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

### Phase 3: Frontend Permission Integration

#### 3.1. PaymentCampaignsPage Permission Guards
```typescript
// frontend/src/features/fee-collection/page/admin/PaymentCampaignsPage.tsx

import { usePermissions } from '../../../shared/hooks/usePermissions';
import { PermissionGuard } from '../../../shared/components/PermissionGuard';

export const PaymentCampaignsPage = () => {
  const permissions = usePermissions();

  // Page-level access control
  if (!permissions.canAccessPaymentCampaigns()) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Không có quyền truy cập
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Bạn không có quyền truy cập trang quản lý đóng phí.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Quản Lý Thu Phí
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Quản lý các đợt thu phí của hội
            </p>
          </div>
          
          {/* Create Button - Only show if user has permission */}
          <PermissionGuard permission="payment-campaigns.create">
            <div className="mt-4 sm:mt-0">
              <button
                onClick={handleCreateCampaign}
                className="flex items-center gap-2 px-4 py-2 text-white transition-colors rounded-md bg-doan-500 hover:bg-doan-600"
              >
                <Plus className="w-4 h-4" />
                Tạo Đợt Mới
              </button>
            </div>
          </PermissionGuard>
        </div>

        {/* Payment Campaign List Component */}
        <PaymentCampaignList 
          organizations={organizations} 
          onEditCampaign={handleEditCampaign}
          refreshTrigger={refreshTrigger}
        />
      </div>

      {/* Create/Edit Modals - Permission guarded */}
      <PermissionGuard permission="payment-campaigns.create">
        {showCreateModal && (
          // ... create modal JSX
        )}
      </PermissionGuard>

      <PermissionGuard permission="payment-campaigns.update">
        {showEditModal && editingCampaign && (
          // ... edit modal JSX
        )}
      </PermissionGuard>
    </>
  );
};
```

#### 3.2. PaymentCampaignList Permission-based Actions
```typescript
// frontend/src/features/fee-collection/components/admin/PaymentCampaignList.tsx

interface PaymentCampaignListProps {
  organizations: Organization[];
  onEditCampaign?: (campaign: PaymentCampaign) => void;
  refreshTrigger?: number;
}

const PaymentCampaignList: React.FC<PaymentCampaignListProps> = ({
  organizations,
  onEditCampaign,
  refreshTrigger,
}) => {
  const permissions = usePermissions();

  // Only show action column if user has any action permissions
  const showActionColumn = permissions.canViewPaymentCampaignDetails() || 
                           permissions.canUpdatePaymentCampaign() || 
                           permissions.canDeletePaymentCampaign();

  return (
    <div className="bg-white shadow rounded-lg dark:bg-gray-800">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th>Tên chiến dịch</th>
            <th>Tổ chức</th>
            <th>Thời gian</th>
            <th>Trạng thái</th>
            {showActionColumn && <th>Thao tác</th>}
          </tr>
        </thead>
        <tbody>
          {campaigns.map((campaign) => (
            <tr key={campaign.id}>
              <td>{campaign.name}</td>
              <td>{campaign.organization?.name}</td>
              <td>{/* date range */}</td>
              <td>{/* status badge */}</td>
              
              {/* Actions Column - Permission controlled */}
              {showActionColumn && (
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    
                    <PermissionGuard permission="payment-campaigns.read">
                      <Link
                        to={`/admin/payment-campaigns/${campaign.id}`}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </PermissionGuard>
                    
                    <PermissionGuard permission="payment-campaigns.update">
                      <button
                        onClick={() => onEditCampaign?.(campaign)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Chỉnh sửa"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </PermissionGuard>
                    
                    <PermissionGuard permission="payment-campaigns.delete">
                      <button
                        onClick={() => handleDelete(campaign.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </PermissionGuard>

                    {/* Status change actions based on campaign status and permissions */}
                    {campaign.status === 'DRAFT' && (
                      <PermissionGuard permission="payment-campaigns.update">
                        <button
                          onClick={() => handleStatusChange(campaign.id, 'activate')}
                          title="Kích hoạt"
                        >
                          <PlayCircle className="w-4 h-4" />
                        </button>
                      </PermissionGuard>
                    )}

                    {campaign.status === 'ACTIVE' && (
                      <PermissionGuard permission="payment-campaigns.update">
                        <button
                          onClick={() => handleStatusChange(campaign.id, 'complete')}
                          title="Hoàn thành"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      </PermissionGuard>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

#### 3.3. PaymentCampaignForm Organization Filtering
```typescript
// frontend/src/features/fee-collection/components/admin/PaymentCampaignForm.tsx

const PaymentCampaignForm: React.FC<PaymentCampaignFormProps> = ({
  campaign,
  mode,
  onSave,
  onCancel,
}) => {
  const permissions = usePermissions();
  const { user, userRoles } = useAuth();
  const [availableOrganizations, setAvailableOrganizations] = useState<Organization[]>([]);

  const loadOrganizations = async () => {
    try {
      setLoadingOrganizations(true);
      const allOrgs = await organizationService.getOrganizations();
      
      // Filter organizations based on user permissions
      let filteredOrgs: Organization[] = [];
      
      if (permissions.isSuperAdmin()) {
        // Super admin can see all organizations
        filteredOrgs = allOrgs;
      } else {
        // Filter by organizations where user has payment permissions
        const userOrgIds = userRoles
          .filter(ur => ur.role.permissions.some(p => p.code.startsWith('payment-campaigns.')))
          .map(ur => ur.organizationId)
          .filter(Boolean);
        
        filteredOrgs = allOrgs.filter(org => userOrgIds.includes(org.id));
      }
      
      // Format organizations for searchable combobox
      const formattedOrgs = filteredOrgs.map(org => ({
        ...org,
        displayName: org.name
      }));
      
      setAvailableOrganizations(formattedOrgs);
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
            label: org.displayName
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
      </div>
      
      {/* Rest of form fields... */}
    </form>
  );
};
```

### Phase 4: Detail Page Permissions

#### 4.1. PaymentCampaignDetailPage Guards
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

      {/* Campaign Details - Permission controlled sections */}
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

### Phase 5: Service Layer Updates

#### 5.1. Frontend Service Enhancement
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

### Phase 6: Hook Updates

#### 6.1. usePaymentCampaigns Hook Enhancement
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

## Testing Strategy

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

## Implementation Timeline

### Week 1: Core Permission Integration
- [ ] Cập nhật usePermissions hook với payment permissions
- [ ] Thêm PermissionGuard components vào PaymentCampaignsPage
- [ ] Backend API filtering enhancement
- [ ] Basic permission testing

### Week 2: Organization Filtering
- [ ] PaymentCampaignForm organization filtering
- [ ] PaymentCampaignList permission-based actions
- [ ] Service layer updates
- [ ] Advanced filtering logic

### Week 3: Detail Page & Polish
- [ ] PaymentCampaignDetailPage permission guards
- [ ] Hook updates và error handling
- [ ] Comprehensive testing
- [ ] UI/UX improvements

### Week 4: Testing & Documentation
- [ ] Permission test scenarios
- [ ] Integration testing
- [ ] Performance optimization
- [ ] Documentation updates

## Migration Notes

### Backward Compatibility
- Existing payment campaigns không bị ảnh hưởng
- Users không có proper permissions sẽ thấy "access denied" thay vì error
- API endpoints tương thích với clients cũ

### Data Validation
- Ensure tất cả existing users có proper role assignments
- Validate payment permissions trong database seed
- Check organization hierarchy integrity

### Security Considerations  
- Permission checking ở cả frontend và backend
- Organization filtering không thể bypass
- Audit trail cho permission changes
- Rate limiting cho permission checks

## Dependencies

### Required Components
- PermissionGuard component (có sẵn)
- usePermissions hook (cần cập nhật)
- Organization context (có sẵn)
- Role-based routing (có sẵn)

### Backend Dependencies
- Payment permissions đã được seed
- User roles đã được setup
- Organization hierarchy stable
- Permission guard decorators available

### Frontend Dependencies
- Auth context with user roles
- Permission constants defined
- Error handling components
- Loading states components

---

## Notes

1. **Performance**: Permission checks sẽ được cache trong AuthContext
2. **UX**: Loading states và error messages cần consistent
3. **Security**: Double validation (frontend + backend) cho tất cả operations
4. **Scalability**: Architecture hỗ trợ thêm permissions trong tương lai
5. **Testing**: Comprehensive test coverage cho tất cả permission scenarios
