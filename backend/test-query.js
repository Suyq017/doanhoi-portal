const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 9000,
    database: 'doanhoi',
    user: 'postgres',
    password: 'password',
});

async function testQuery() {
    try {
        const client = await pool.connect();
        console.log('Checking payment campaigns...');
        const campaigns = await client.query('SELECT id, name, organization_id, status, created_at FROM payment_campaigns ORDER BY created_at DESC LIMIT 5');
        console.log('Payment campaigns:', campaigns.rows);
        console.log('\nChecking organizations...');
        const orgs = await client.query('SELECT id, name, "isActive" FROM organizations WHERE "isActive" = true LIMIT 5');
        console.log('Active organizations:', orgs.rows);
        console.log('\nChecking users with super admin roles...');
        const superAdmins = await client.query(`
      SELECT u.id, u."familyName", u."givenName", u.code, ur."organizationId", r.name as role_name
      FROM users u 
      JOIN user_roles ur ON u.id = ur."userId"
      JOIN roles r ON ur."roleId" = r.id
      WHERE r.name = 'super_admin' OR r.name LIKE '%admin%'
      LIMIT 5
    `);
        console.log('Super admin users:', superAdmins.rows);

        client.release();
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

testQuery();
