# Translations needed for the multi-role assignment feature

## Add to frontend/public/locales/vi/users.json:

```json
{
  "labels": {
    "roleAssignment": "Gán vai trò",
    "roleAssignments": "Vai trò và tổ chức",
    "valid": "hợp lệ",
    "tips": "Mẹo"
  },
  "descriptions": {
    "roleAssignments": "Gán nhiều vai trò cho người dùng trong các tổ chức khác nhau"
  },
  "actions": {
    "addRoleAssignment": "Thêm vai trò mới"
  },
  "validation": {
    "atLeastOneRole": "Phải gán ít nhất một vai trò cho người dùng",
    "assignmentRequiredRole": "Vai trò thứ {{index}}: Chưa chọn vai trò",
    "duplicateAssignment": "Vai trò thứ {{index}}: Trùng lặp với assignment khác"
  },
  "messages": {
    "roleInOrganization": "Vai trò trong tổ chức cụ thể",
    "globalRole": "Vai trò toàn hệ thống",
    "maxAssignmentsReached": "Đã đạt tối đa {{max}} vai trò"
  },
  "tips": {
    "multipleRoles": "Bạn có thể gán nhiều vai trò khác nhau cho các tổ chức khác nhau",
    "organizationOptional": "Tổ chức là tùy chọn - bỏ trống để áp dụng toàn hệ thống",
    "duplicatesDetected": "Hệ thống sẽ tự động phát hiện và ngăn các assignment trùng lặp"
  }
}
```

## Add to frontend/public/locales/en/users.json:

```json
{
  "labels": {
    "roleAssignment": "Role Assignment",
    "roleAssignments": "Roles and Organizations", 
    "valid": "valid",
    "tips": "Tips"
  },
  "descriptions": {
    "roleAssignments": "Assign multiple roles to user across different organizations"
  },
  "actions": {
    "addRoleAssignment": "Add New Role"
  },
  "validation": {
    "atLeastOneRole": "Must assign at least one role to the user",
    "assignmentRequiredRole": "Assignment {{index}}: Role is required",
    "duplicateAssignment": "Assignment {{index}}: Duplicates another assignment"
  },
  "messages": {
    "roleInOrganization": "Role in specific organization",
    "globalRole": "System-wide role",
    "maxAssignmentsReached": "Maximum {{max}} roles reached"
  },
  "tips": {
    "multipleRoles": "You can assign different roles to different organizations",
    "organizationOptional": "Organization is optional - leave blank for system-wide role",
    "duplicatesDetected": "System will automatically detect and prevent duplicate assignments"
  }
}
```
