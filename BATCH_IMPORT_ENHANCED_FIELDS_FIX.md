# Batch Import Enhanced Fields Fix

## Vấn đề
Các field mới trong User entity không được ánh xạ (map) đúng cách trong BatchImportService, dẫn đến việc các thông tin như `identityCard`, `birthDate`, `gender`, `admissionYear`, `curriculumYear`, `facultyCode`, `trainingSystem`, `trainingLevel` không được lưu khi thực hiện batch import.

## Nguyên nhân
1. `ResolvedUserData` interface thiếu các field mới
2. Method `convertToResolvedUserData` không map các field mới từ `UserImportDto`
3. Method `importUserWithImportService` không set các field mới cho User entity khi tạo user mới

## Giải pháp thực hiện

### 1. Cập nhật ResolvedUserData interface
```typescript
interface ResolvedUserData {
  // ... existing fields
  // New fields for enhanced import system
  identityCard?: string;
  birthDate?: string;
  gender?: string;
  admissionYear?: string;
  curriculumYear?: string;
  facultyCode?: string;
  trainingSystem?: string;
  trainingLevel?: string;
}
```

### 2. Cập nhật convertToResolvedUserData method
Thêm mapping các field mới từ `UserImportDto` sang `ResolvedUserData`:
```typescript
const resolvedData: ResolvedUserData = {
  // ... existing fields
  // New fields for enhanced import system
  identityCard: userData.identityCard,
  birthDate: userData.birthDate,
  gender: userData.gender,
  admissionYear: userData.admissionYear,
  curriculumYear: userData.curriculumYear,
  facultyCode: userData.facultyCode,
  trainingSystem: userData.trainingSystem,
  trainingLevel: userData.trainingLevel
};
```

### 3. Cập nhật importUserWithImportService method
Thêm logic để set các field mới cho User entity với proper validation và enum mapping:
```typescript
// Set new fields for enhanced import system
if (userData.identityCard) {
  user.identityCard = userData.identityCard;
}

if (userData.birthDate) {
  user.birthDate = new Date(userData.birthDate);
}

if (userData.gender) {
  user.gender = userData.gender.toUpperCase() === 'NAM' ? Gender.NAM : Gender.NU;
}

if (userData.admissionYear) {
  user.admissionYear = userData.admissionYear;
}

if (userData.curriculumYear) {
  user.curriculumYear = userData.curriculumYear;
}

if (userData.facultyCode) {
  user.facultyCode = userData.facultyCode;
}

if (userData.trainingSystem) {
  const trainingSystemValue = userData.trainingSystem.toUpperCase();
  if (Object.values(TrainingSystem).includes(trainingSystemValue as TrainingSystem)) {
    user.trainingSystem = trainingSystemValue as TrainingSystem;
  }
}

if (userData.trainingLevel) {
  const trainingLevelValue = userData.trainingLevel.toUpperCase();
  if (Object.values(TrainingLevel).includes(trainingLevelValue as TrainingLevel)) {
    user.trainingLevel = trainingLevelValue as TrainingLevel;
  }
}
```

## Các field được hỗ trợ

### 1. identityCard
- Type: `string`
- Description: Số chứng minh nhân dân/căn cước công dân
- Validation: Optional

### 2. birthDate
- Type: `Date`
- Description: Ngày sinh
- Format: ISO date string (YYYY-MM-DD)
- Validation: Optional, converted to Date object

### 3. gender
- Type: `Gender` enum
- Values: `NAM` | `NU`
- Description: Giới tính
- Validation: Optional, case-insensitive input

### 4. admissionYear
- Type: `string`
- Description: Năm nhập học
- Example: "2023"
- Validation: Optional

### 5. curriculumYear
- Type: `string`
- Description: Năm chương trình đào tạo
- Example: "2023"
- Validation: Optional

### 6. facultyCode
- Type: `string`
- Description: Mã khoa
- Example: "CNTT", "CT", "QT"
- Validation: Optional

### 7. trainingSystem
- Type: `TrainingSystem` enum
- Values: `VLVH` | `CQ` | `QT` | `DTTX`
- Description: Hệ đào tạo
  - VLVH: Vừa làm Vừa học
  - CQ: Chính quy
  - QT: Quốc tế
  - DTTX: Đào tạo từ xa
- Validation: Optional, case-insensitive input

### 8. trainingLevel
- Type: `TrainingLevel` enum
- Values: `DH` (Đại học)
- Description: Bậc đào tạo
- Validation: Optional, case-insensitive input

## Tương thích ngược
- Method `updateExistingUser` đã có sẵn logic xử lý các field này
- UserImportDto đã có định nghĩa các field này
- User entity đã có các column và enum tương ứng

## Kết quả
Sau khi cập nhật, BatchImportService sẽ có feature parity hoàn toàn với ImportService trong việc xử lý các field mở rộng, đảm bảo tất cả thông tin chi tiết của user được lưu trữ đúng cách trong cả hai mode import.

## Test cases
1. Import với đầy đủ các field mới
2. Import với một số field mới (partial update)
3. Import với enum values khác case (NAM/nam/Nam)
4. Import với invalid enum values (should be ignored)
5. Import với invalid date format (should handle gracefully)