# Database Migration Guide

## Tổng quan
Migration này thêm 2 cột vào bảng `users` để lưu số ngày CTXH và đảm bảo bảng `ctxh_activities` lưu timestamp cho start_date và end_date.

## Thay đổi

### 1. Bảng `users`
- Thêm cột `ctxh_days` (DECIMAL(5,1)): Tổng số ngày CTXH hiện tại
- Thêm cột `ctxh_days_old_system` (DECIMAL(5,1)): Số ngày CTXH từ hệ thống cũ
- Tạo indexes cho 2 cột mới

### 2. Bảng `ctxh_activities`
- Đảm bảo `start_date` và `end_date` là TIMESTAMP WITH TIME ZONE
- Migration sẽ tự động convert nếu hiện tại là DATE

## Các bước thực hiện

### Development (Local)

#### Option 1: Sử dụng TypeORM synchronize (Khuyến nghị cho dev)
TypeORM đã config `synchronize: true` trong development, nên chỉ cần:

```bash
# 1. Đảm bảo PostgreSQL đang chạy
docker-compose up -d postgres

# 2. Chạy ứng dụng - TypeORM sẽ tự động sync schema
npm run start:dev

# hoặc build lại schema
npm run db:create-schema
```

#### Option 2: Chạy migration thủ công (An toàn hơn)
```bash
# 1. Đảm bảo PostgreSQL đang chạy
docker-compose up -d postgres

# 2. Chạy migration
npm run migrate:ctxh-updates

# 3. Restart backend nếu đang chạy
npm run start:dev
```

### Production

**QUAN TRỌNG**: Trên production phải chạy migration trước khi deploy code mới!

```bash
# 1. Backup database trước khi migration
docker-compose exec doanhoi-postgres-prod pg_dump -U postgres doanhoi > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Chạy migration
cd backend
npm run migrate:ctxh-updates

# 3. Verify migration thành công
# Kiểm tra log output phải thấy "✅ Migration completed successfully!"

# 4. Deploy code mới
git pull
docker-compose -f docker-compose.prod.yml up -d --build
```

## Rollback (Nếu cần)

Nếu có vấn đề với migration, rollback bằng cách:

```bash
# 1. Restore từ backup
docker-compose exec -T doanhoi-postgres-prod psql -U postgres doanhoi < backup_file.sql

# 2. Hoặc xóa các cột đã thêm thủ công:
docker-compose exec doanhoi-postgres-prod psql -U postgres doanhoi -c "
  ALTER TABLE users DROP COLUMN IF EXISTS ctxh_days;
  ALTER TABLE users DROP COLUMN IF EXISTS ctxh_days_old_system;
"
```

## Kiểm tra Migration đã chạy thành công

```bash
# Kết nối vào database
docker-compose exec doanhoi-postgres-prod psql -U postgres doanhoi

# Kiểm tra cột mới trong users
\d users

# Kiểm tra kiểu dữ liệu của ctxh_activities
\d ctxh_activities

# Hoặc dùng query
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users' AND column_name IN ('ctxh_days', 'ctxh_days_old_system');

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'ctxh_activities' AND column_name IN ('start_date', 'end_date');
```

## Notes

1. **Development**: TypeORM `synchronize: true` sẽ tự động sync schema, nhưng không an toàn cho production
2. **Production**: Luôn chạy migration thủ công trước khi deploy
3. **Backup**: Luôn backup database trước khi chạy migration trên production
4. **Testing**: Test migration trên môi trường staging trước khi production
5. **Indexes**: Migration đã tạo indexes cho performance tốt hơn khi query

## Workflow khi push code lên production

1. **Local**: Test kỹ các thay đổi
2. **Commit & Push**: 
   ```bash
   git add .
   git commit -m "feat: add CTXH tracking columns to users table"
   git push
   ```
3. **Production Server**:
   ```bash
   # SSH vào server
   ssh user@production-server
   
   # Navigate to project
   cd /path/to/doanhoi-portal
   
   # Backup database
   docker-compose exec doanhoi-postgres-prod pg_dump -U postgres doanhoi > backup_$(date +%Y%m%d_%H%M%S).sql
   
   # Pull code mới
   git pull
   
   # Chạy migration (nếu cần)
   cd backend
   npm run migrate:ctxh-updates
   
   # Build và restart containers
   cd ..
   docker-compose -f docker-compose.prod.yml up -d --build
   
   # Kiểm tra logs
   docker-compose -f docker-compose.prod.yml logs -f backend
   ```

## Troubleshooting

### Migration báo lỗi "column already exists"
Có thể TypeORM đã tự sync rồi. Không sao, migration có `IF NOT EXISTS` nên safe.

### Migration báo lỗi connection
Kiểm tra:
- PostgreSQL container có đang chạy không
- Environment variables trong .env đúng chưa
- Port có bị conflict không

### Data bị mất sau migration
Restore từ backup:
```bash
docker-compose exec -T doanhoi-postgres-prod psql -U postgres doanhoi < backup_file.sql
```
