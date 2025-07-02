# Classes Import Implementation - Testing Guide

## Backend Implementation Status ✅

### Services Created:
1. **ExcelParserService** - Parse Excel files and generate templates
2. **ImportValidationService** - Validate class data with business rules
3. **ImportSessionService** - Manage import sessions and cache
4. **ImportService** - Orchestrate import workflow

### Controller Updated:
- Added 5 new import endpoints to ClassesController
- Integrated with ImportService

### Module Updated:
- Registered all import services in ClassesModule

## Frontend Implementation Status ✅

### ClassService Updated:
- Added server-side import methods
- Added import type definitions
- Backward compatibility maintained

### ClassesPage Updated:
- Added import configuration with server-side processing
- Enabled import option in dropdown
- Integrated ImportModal component

## API Endpoints Available:

```
GET  /classes/template                    - Download Excel template
POST /classes/import/upload               - Upload Excel file  
GET  /classes/import/:sessionId/validate  - Validate import data
POST /classes/import/:sessionId/execute   - Execute import
GET  /classes/import/:sessionId/status    - Get import status
```

## Excel Template Structure:

| Column | Required | Type | Description |
|--------|----------|------|-------------|
| name | Yes | Text | Class name (max 100 chars) |
| code | No | Text | Class code (optional) |
| year | No | Number | Academic year (2000-2100) |
| departmentCode | No | Text | Department code for lookup |
| isActive | No | Boolean | Active status (default: true) |

## Validation Rules:

### Required Fields:
- **name**: Required, max 100 characters

### Uniqueness:
- **name + year**: Must be unique combination

### Department Lookup:
- **departmentCode**: Must exist in database if provided

### Data Types:
- **year**: Valid year format (YYYY)
- **isActive**: Boolean values (true/false, 1/0, yes/no, active/inactive)

## Testing Steps:

### 1. Backend Testing:
```bash
cd backend
npm run start:dev
```

Test endpoints with Postman or curl:
```bash
# Download template
GET http://localhost:9200/classes/template

# Upload file
POST http://localhost:9200/classes/import/upload
# Form-data: file = your_excel_file.xlsx

# Validate data  
GET http://localhost:9200/classes/import/{sessionId}/validate

# Execute import
POST http://localhost:9200/classes/import/{sessionId}/execute
# Body: {"skipConflicts": true}
```

### 2. Frontend Testing:
```bash
cd frontend  
npm run dev
```

Navigate to Classes page and test:
1. Click dropdown "Thêm" button
2. Select "Import từ file Excel"
3. Download template
4. Fill sample data
5. Upload and import

## Sample Excel Data:

| name | code | year | departmentCode | isActive |
|------|------|------|----------------|----------|
| Computer Science A | CS-A | 2024 | TECH | true |
| Mathematics B | MATH-B | 2024 | MATH | true |
| Physics C | PHY-C | 2023 | SCI | false |

## Features Implemented:

✅ **Server-side Excel parsing**  
✅ **Data validation with business rules**  
✅ **Duplicate detection** (name + year)  
✅ **Conflict resolution** (skip conflicts option)  
✅ **Department lookup** by code  
✅ **Session management** (30-minute timeout)  
✅ **Progress tracking** and detailed results  
✅ **Error handling** with user-friendly messages  
✅ **Template generation** with sample data  
✅ **Frontend integration** with ImportModal  

## Next Steps:

1. Test with real data
2. Add translation keys for import messages
3. Performance testing with large files
4. Error scenario testing
5. User experience improvements

## Known Limitations:

- Class entity doesn't have 'code' field in database (validation adjusted)
- Import data includes 'code' field for template compatibility
- Department lookup requires existing department codes
- Session cleanup runs manually (consider cron job)
