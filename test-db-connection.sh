#!/bin/bash

# Test database connection for production

echo "🔧 Testing Production Database Connection..."

# Test 1: Check if containers are running
echo "1. Checking containers..."
docker compose -f docker-compose.prod.yml ps

# Test 2: Check PostgreSQL from inside container
echo -e "\n2. Testing PostgreSQL connection from inside postgres container..."
if docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -c "SELECT version();" >/dev/null 2>&1; then
    echo "✅ PostgreSQL container connection OK"
else
    echo "❌ PostgreSQL container connection FAILED"
fi

# Test 3: Check if database exists
echo -e "\n3. Checking if doanhoi database exists..."
if docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -lqt | cut -d \| -f 1 | grep -qw doanhoi; then
    echo "✅ Database 'doanhoi' exists"
else
    echo "❌ Database 'doanhoi' does not exist"
    echo "Creating database..."
    docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -c "CREATE DATABASE doanhoi;"
fi

# Test 4: Test connection from backend container
echo -e "\n4. Testing connection from backend container..."
if docker compose -f docker-compose.prod.yml exec -T backend node -e "
const { Client } = require('pg');
const client = new Client({
  host: 'doanhoi-postgres-prod',
  port: 5432,
  user: 'postgres',
  password: process.env.DB_PASSWORD || 'your_secure_password',
  database: 'doanhoi'
});
client.connect()
  .then(() => { console.log('✅ Backend container -> PostgreSQL: OK'); client.end(); })
  .catch(err => { console.log('❌ Backend container -> PostgreSQL: FAILED', err.message); });
" 2>/dev/null; then
    echo "Backend container connection test completed"
else
    echo "❌ Backend container not ready or connection failed"
fi

# Test 5: Manual connection with Docker network
echo -e "\n5. Manual connection test..."
cd backend

echo "Testing with Docker network settings..."
DB_HOST=doanhoi-postgres-prod \
DB_PORT=5432 \
DB_USERNAME=postgres \
DB_PASSWORD=your_secure_password \
DB_NAME=doanhoi \
node -e "
const { Client } = require('pg');
const client = new Client({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});
client.connect()
  .then(() => { 
    console.log('✅ Host -> PostgreSQL via Docker network: OK');
    return client.query('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = \\'public\\';');
  })
  .then(result => {
    console.log('📊 Tables count:', result.rows[0].count);
    client.end();
  })
  .catch(err => { 
    console.log('❌ Host -> PostgreSQL via Docker network: FAILED');
    console.log('Error:', err.message);
  });
"

cd ..

echo -e "\n🎯 If all tests pass, try running:"
echo "   ./quick-reset-db-prod.sh --force"
