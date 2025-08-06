# 🎯 USERS ICON LOGIC OPTIONS

## Current Issue
Users icon biến mất khi eye icon hiển thị do logic conflict.

## 3 Options để fix:

### Option 1: Always Clickable Users Icon ✅ (CURRENT)
```typescript
const shouldMakeUsersClickable = () => {
    return !!org.code; // Always clickable if org has code
};
```
**Result**: Users icon luôn clickable, cho phép user xem members dù có eye icon

### Option 2: Conditional Clickable Users Icon
```typescript 
const shouldMakeUsersClickable = () => {
    return !shouldShowDetailLink() && org.code; // Original logic
};

// But also show static users count when eye icon exists:
{shouldShowDetailLink() && org.code ? (
    <div className="flex items-center text-sm text-gray-500">
        <Users className="w-4 h-4 mr-1" />
        {getStatCount()}
    </div>
) : shouldMakeUsersClickable() ? (
    <Link to={createMembersPath(org.type, org.code)}>
        <Users className="w-4 h-4 mr-1" />
        {getStatCount()}
    </Link>
) : (
    <div className="flex items-center text-sm text-gray-500">
        <Users className="w-4 h-4 mr-1" />
        {getStatCount()}
    </div>
)}
```
**Result**: Users icon clickable chỉ khi không có eye icon, static khi có eye icon

### Option 3: Always Static Users Icon
```typescript
// Remove shouldMakeUsersClickable logic entirely
<div className="flex items-center text-sm text-gray-500">
    <Users className="w-4 h-4 mr-1" />
    {getStatCount()}
</div>
```
**Result**: Users icon luôn static, chỉ hiển thị số lượng

## Recommendation: Option 1 ✅
- User-friendly: Cho phép access members từ organization tree
- Consistent: Users icon luôn có behavior giống nhau
- No confusion: Logic đơn giản, dễ hiểu

## Current Status: ✅ FIXED with Option 1
Users icon sẽ luôn hiển thị và clickable nếu org có code.
