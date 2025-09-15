# 🏭 Production Database Reset Guide

## 📋 Scripts Available

### 🔥 **Production Scripts**
- `reset-database-prod.sh` - Reset hoàn toàn production database
- `quick-reset-db-prod.sh` - Reset nhanh production database  
- `debug-db.sh --prod` - Debug production database issues

### 🔧 **Development Scripts**  
- `reset-database.ps1` - Windows reset script
- `quick-reset-db.sh` - Linux quick reset
- `debug-db.sh` - Debug development database

---

## 🏭 Production Environment

### **Ports & Services**
```
PostgreSQL: localhost:2679
Backend API: localhost:2681  
Frontend: localhost:2680
Domain: https://doanhoi.hcmut.edu.vn
```

### **Database Config**
```bash
DB_HOST=localhost
DB_PORT=2679
DB_USERNAME=postgres  
DB_PASSWORD=your_secure_password
DB_NAME=doanhoi
```

---

## 🚀 Quick Commands

### **Reset Production Database**
```bash
# Quick reset (30 giây)
./quick-reset-db-prod.sh --force

# Full reset (2-3 phút)  
./reset-database-prod.sh --force

# Reset nhưng giữ containers
./reset-database-prod.sh --keep-containers
```

### **Debug Issues**
```bash
# Debug production
./debug-db.sh --prod

# Debug development  
./debug-db.sh
```

### **Manual Steps**
```bash
# Start production stack
docker compose -f docker-compose.prod.yml up -d

# Reset database only
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -c "DROP DATABASE doanhoi; CREATE DATABASE doanhoi;"

# Create schema
cd backend
DB_PORT=2679 npm run db:create-schema

# Seed data
DB_PORT=2679 npm run seed
```

---

## 🛡️ Safety Features

### **Production Safeguards**
- ❗ **Double confirmation** required
- 🔒 **Type "DELETE ALL DATA"** to confirm
- ⏸️ **--force flag** to skip confirmations
- 📝 **Detailed logging** of all steps

### **Container Management**
- 🔄 **--keep-containers**: Giữ containers, chỉ reset data
- 🗑️ **Full reset**: Xóa volumes và tạo lại containers
- 🔍 **Health checks**: Kiểm tra services sau reset

---

## 🎯 Use Cases

### **Development on Production Server**
```bash
./quick-reset-db-prod.sh --force
```

### **Clean Production Deployment**  
```bash
./reset-database-prod.sh --force
```

### **Troubleshooting Database Issues**
```bash
./debug-db.sh --prod
```

### **Container Issues**
```bash
./reset-database-prod.sh --keep-containers
```

---

## 📊 Post-Reset Verification

### **Check Services**
```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
```

### **Check Database**
```bash
# Table count
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d doanhoi -c "\dt"

# Data count  
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d doanhoi -c "SELECT 'users' as table, COUNT(*) FROM users UNION SELECT 'organizations', COUNT(*) FROM organizations;"
```

### **Check APIs**
```bash
curl http://localhost:2681/api
curl http://localhost:2680
```

---

## 🔑 Default Credentials

After reset, use these credentials:

```
Email: admin@doanhoi.com
Password: admin1  
Role: super_admin
```

---

## 🚨 Emergency Recovery

### **If Production is Down**
```bash
# Stop everything
docker compose -f docker-compose.prod.yml down

# Clean slate
docker system prune -f
docker volume prune -f

# Redeploy
./deploy.sh
./quick-reset-db-prod.sh --force
```

### **If Database is Corrupted**
```bash
./reset-database-prod.sh --force
```

### **If Only App Issues**
```bash
./reset-database-prod.sh --keep-containers
```

---

## 📝 Logging

All scripts create logs in:
- `reset.log` - Reset operations
- `debug.log` - Debug information  
- Docker logs: `docker compose -f docker-compose.prod.yml logs`

---

**⚠️ Always backup production data before reset!**
