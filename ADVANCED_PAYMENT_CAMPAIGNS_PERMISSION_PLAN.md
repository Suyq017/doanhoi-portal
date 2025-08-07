# Kế hoạch Nâng cao Phân quyền Trang Quản lý Đóng phí

## 📋 Tổng quan Yêu cầu

Bổ sung cơ chế phân quyền nâng cao cho trang quản lý đóng phí với các tính năng:

1. **Kiểm tra UserRole**: Xác định quyền của người dùng trong quản lý đóng phí
2. **Phân quyền theo Tổ chức**: Chỉ hiển thị danh sách các đợt thuộc về tổ chức mà user có quyền
3. **Phân quyền Chi tiết**: Kiểm tra quyền cụ thể cho từng hành động (tạo, xem, sửa, xóa)
4. **Hiển thị có điều kiện**: Ẩn/hiện các button action dựa trên quyền

## 🔍 Phân tích Hiện trạng

### ✅ Đã có sẵn:
- **Permission System**: Hoàn chỉnh với permissions.seed.ts đã định nghĩa đầy đủ payment-campaigns permissions
- **usePermissions Hook**: Đã có các method check permission cho payment campaigns
- **Permission Guards**: Đã có PermissionGuard component và RequirePermissions decorator
- **Basic UI Integration**: PaymentCampaignsPage đã có page-level access control

### ❌ Chưa có:
- **Organization-based Filtering**: Chưa filter campaigns theo organizations mà user có quyền
- **Advanced Role Checking**: Chưa có logic kiểm tra userRole và organization context chi tiết
- **Dynamic Organization List**: Chưa giới hạn organizations trong dropdown theo quyền user
- **Row-level Permissions**: Chưa kiểm tra quyền ở từng row trong bảng

## 🚀 Kế hoạch Thực hiện

### Phase 1: Backend Enhancement (Priority: High)

#### 1.1. Cập nhật Payment Campaign Controller
**File**: `backend/src/payment/controllers/payment-campaign.controller.ts`

```typescript
// Thêm logic filter campaigns theo organizations mà user có quyền
@Get()
@RequirePermissions('payment-campaigns.access')
async findAll(
  @Query() filters: PaymentCampaignFiltersDto,
  @Request() req: any
) {
  const userId = req.user.id;
  
  // Get accessible organization IDs for current user
  const accessibleOrgIds = await this.campaignService.getAccessibleOrganizations(userId);
  
  return this.campaignService.findAll({
    ...filters,
    accessibleOrgIds
  });
}

// Thêm endpoint lấy danh sách organizations user có quyền
@Get('accessible-organizations')
@RequirePermissions('payment-campaigns.access')
async getAccessibleOrganizations(@Request() req: any) {
  const userId = req.user.id;
  return this.campaignService.getAccessibleOrganizations(userId);
}
```

#### 1.2. Mở rộng Payment Campaign Service
**File**: `backend/src/payment/services/payment-campaign.service.ts`

```typescript
// Thêm method lấy organizations mà user có quyền
async getAccessibleOrganizations(userId: string): Promise<Organization[]> {
  // Logic kiểm tra role và permissions của user
  // Trả về danh sách organizations mà user có payment permissions
}

// Cập nhật findAll để filter theo accessible organizations
async findAll(options: PaymentCampaignFiltersDto & { accessibleOrgIds?: string[] }) {
  // Thêm WHERE clause filter theo accessibleOrgIds nếu không phải super admin
}
```

#### 1.3. Thêm Permission Checks cho CRUD Operations
**File**: `backend/src/payment/controllers/payment-campaign.controller.ts`

```typescript
@Post()
@RequirePermissions('payment-campaigns.create')
async create(@Body() createDto: CreatePaymentCampaignDto, @Request() req: any) {
  // Kiểm tra user có quyền create trong organization được chọn
  await this.validateOrganizationPermission(req.user.id, createDto.organizationId, 'create');
  return this.campaignService.create(createDto, req.user.id);
}

@Patch(':id')
@RequirePermissions('payment-campaigns.update')
async update(@Param('id') id: string, @Body() updateDto: UpdatePaymentCampaignDto, @Request() req: any) {
  // Kiểm tra user có quyền update campaign này
  await this.validateCampaignPermission(req.user.id, id, 'update');
  return this.campaignService.update(id, updateDto);
}

@Delete(':id')
@RequirePermissions('payment-campaigns.delete')
async remove(@Param('id') id: string, @Request() req: any) {
  // Kiểm tra user có quyền delete campaign này
  await this.validateCampaignPermission(req.user.id, id, 'delete');
  return this.campaignService.remove(id);
}
```

### Phase 2: Frontend Service Enhancement

#### 2.1. Cập nhật Fee Collection Service
**File**: `frontend/src/shared/services/fee-collection-service.ts`

```typescript
// Thêm method lấy accessible organizations
export const getAccessibleOrganizations = async (): Promise<Organization[]> => {
  const response = await api.get('/payment-campaigns/accessible-organizations');
  return response.data;
};

// Cập nhật getPaymentCampaigns để auto-filter theo user permissions
export const getPaymentCampaigns = async (filters?: PaymentCampaignFilters) => {
  // API sẽ tự động filter theo accessible organizations
  const response = await api.get('/payment-campaigns', { params: filters });
  return response.data;
};
```

#### 2.2. Mở rộng usePermissions Hook
**File**: `frontend/src/shared/hooks/usePermissions.ts`

```typescript
// Thêm methods kiểm tra quyền ở specific organization
canCreatePaymentCampaignInOrg: (orgId: string) => hasPermission('payment-campaigns.create', orgId),
canUpdatePaymentCampaignInOrg: (orgId: string) => hasPermission('payment-campaigns.update', orgId),
canDeletePaymentCampaignInOrg: (orgId: string) => hasPermission('payment-campaigns.delete', orgId),

// Thêm method lấy accessible organizations
getAccessibleOrganizations: () => {
  // Filter từ userRoles để lấy organizations mà user có payment permissions
  return auth.userRoles
    ?.filter(userRole => 
      userRole.role.permissions.some(p => p.code.startsWith('payment-campaigns.'))
    )
    .map(userRole => userRole.organization)
    .filter(Boolean) || [];
},
```

### Phase 3: UI Component Updates

#### 3.1. Cập nhật PaymentCampaignsPage
**File**: `frontend/src/features/fee-collection/page/admin/PaymentCampaignsPage.tsx`

```typescript
// Thêm state và logic load accessible organizations
const [accessibleOrganizations, setAccessibleOrganizations] = useState<Organization[]>([]);

useEffect(() => {
  const loadAccessibleOrganizations = async () => {
    try {
      const orgs = await feeCollectionService.getAccessibleOrganizations();
      setAccessibleOrganizations(orgs);
    } catch (error) {
      console.error('Failed to load accessible organizations:', error);
    }
  };
  
  if (permissions.canAccessPaymentCampaigns()) {
    loadAccessibleOrganizations();
  }
}, [permissions]);

// Pass accessible organizations to PaymentCampaignForm
<PaymentCampaignForm
  campaign={editingCampaign}
  mode="create"
  onSave={handleCampaignSaved}
  onCancel={handleCloseModals}
  accessibleOrganizations={accessibleOrganizations} // New prop
/>
```

#### 3.2. Cập nhật PaymentCampaignList
**File**: `frontend/src/features/fee-collection/components/admin/PaymentCampaignList.tsx`

```typescript
// Thêm row-level permission checks
const canEditCampaign = (campaign: PaymentCampaign) => {
  return permissions.canUpdatePaymentCampaignInOrg(campaign.organizationId);
};

const canDeleteCampaign = (campaign: PaymentCampaign) => {
  return permissions.canDeletePaymentCampaignInOrg(campaign.organizationId);
};

// Cập nhật render action buttons
<div className="flex space-x-2">
  <PermissionGuard permission="payment-campaigns.read">
    <button className="text-blue-600">
      <Eye className="w-4 h-4" />
    </button>
  </PermissionGuard>
  
  {canEditCampaign(campaign) && (
    <button 
      onClick={() => onEditCampaign?.(campaign)}
      className="text-green-600"
    >
      <Edit className="w-4 h-4" />
    </button>
  )}
  
  {canDeleteCampaign(campaign) && (
    <button 
      onClick={() => handleDelete(campaign.id)}
      className="text-red-600"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  )}
</div>
```

#### 3.3. Cập nhật PaymentCampaignForm
**File**: `frontend/src/features/fee-collection/components/admin/PaymentCampaignForm.tsx`

```typescript
interface PaymentCampaignFormProps {
  // ... existing props
  accessibleOrganizations?: Organization[]; // New prop
}

// Giới hạn dropdown organizations theo quyền
<select 
  value={formData.organizationId}
  onChange={(e) => setFormData({...formData, organizationId: e.target.value})}
>
  <option value="">Chọn tổ chức</option>
  {accessibleOrganizations?.map(org => (
    <option key={org.id} value={org.id}>{org.name}</option>
  ))}
</select>
```

### Phase 4: Advanced Features

#### 4.1. Role-based UI Customization
```typescript
// Thêm component hiển thị thông tin quyền user
const UserPermissionInfo = () => {
  const permissions = usePermissions();
  const accessibleOrgs = permissions.getAccessibleOrganizations();
  
  return (
    <div className="bg-blue-50 p-4 rounded-lg mb-6">
      <h3 className="font-semibold">Quyền của bạn:</h3>
      <ul className="list-disc list-inside">
        {permissions.canCreatePaymentCampaign() && <li>Tạo đợt đóng phí</li>}
        {permissions.canUpdatePaymentCampaign() && <li>Cập nhật đợt đóng phí</li>}
        {permissions.canDeletePaymentCampaign() && <li>Xóa đợt đóng phí</li>}
      </ul>
      <p className="mt-2">
        Tổ chức có quyền: {accessibleOrgs.map(org => org.name).join(', ')}
      </p>
    </div>
  );
};
```

#### 4.2. Audit Trail
```typescript
// Thêm logging cho các hành động có phân quyền
const auditLog = {
  action: 'payment_campaign_create',
  userId: user.id,
  organizationId: campaign.organizationId,
  resourceId: campaign.id,
  timestamp: new Date()
};
```

## 📅 Timeline Thực hiện

### Week 1: Backend Foundation
- [ ] Cập nhật Payment Campaign Controller với organization filtering
- [ ] Thêm getAccessibleOrganizations endpoint
- [ ] Cập nhật Payment Campaign Service với permission logic
- [ ] Test API endpoints

### Week 2: Frontend Integration  
- [ ] Cập nhật fee-collection-service
- [ ] Mở rộng usePermissions hook
- [ ] Cập nhật PaymentCampaignsPage component
- [ ] Test frontend integration

### Week 3: UI Enhancement
- [ ] Cập nhật PaymentCampaignList với row-level permissions
- [ ] Cập nhật PaymentCampaignForm với accessible organizations
- [ ] Thêm UserPermissionInfo component
- [ ] UI/UX testing

### Week 4: Testing & Polish
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Documentation update
- [ ] Bug fixes and polish

## 🧪 Test Cases

### Test Permission Scenarios:
1. **Super Admin**: Thấy tất cả campaigns từ mọi organization
2. **Organization Admin**: Chỉ thấy campaigns của organization đó
3. **Limited User**: Chỉ thấy campaigns có quyền read, không thấy create/edit/delete buttons
4. **Multi-Organization User**: Thấy campaigns từ tất cả organizations mà có quyền

### Test UI Scenarios:
1. **Create Button**: Chỉ hiện khi có quyền create ở ít nhất 1 organization
2. **Edit Button**: Chỉ hiện cho campaigns mà user có quyền edit
3. **Delete Button**: Chỉ hiện cho campaigns mà user có quyền delete  
4. **Organization Dropdown**: Chỉ hiện organizations mà user có quyền create

## 📝 Notes Quan trọng

1. **Backward Compatibility**: Đảm bảo không phá vỡ logic hiện tại
2. **Performance**: Cache user permissions để tránh query nhiều lần
3. **Security**: Luôn validate permissions ở backend, frontend chỉ là UI enhancement
4. **Error Handling**: Graceful degradation khi permission loading failed
5. **Logging**: Log tất cả permission checks cho audit purposes

## 🔗 Related Files

### Backend Files to Modify:
- `backend/src/payment/controllers/payment-campaign.controller.ts`
- `backend/src/payment/services/payment-campaign.service.ts`
- `backend/src/payment/dto/payment-campaign-filters.dto.ts`

### Frontend Files to Modify:
- `frontend/src/shared/services/fee-collection-service.ts`
- `frontend/src/shared/hooks/usePermissions.ts`
- `frontend/src/features/fee-collection/page/admin/PaymentCampaignsPage.tsx`
- `frontend/src/features/fee-collection/components/admin/PaymentCampaignList.tsx`
- `frontend/src/features/fee-collection/components/admin/PaymentCampaignForm.tsx`

### New Files to Create:
- `frontend/src/features/fee-collection/components/admin/UserPermissionInfo.tsx`
- `backend/src/payment/dto/accessible-organizations.dto.ts`

---

**Tác giả**: Development Team  
**Ngày tạo**: 7 tháng 8, 2025  
**Version**: 1.0  
**Status**: Ready for Implementation
