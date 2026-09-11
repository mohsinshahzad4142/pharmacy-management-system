const { Client } = require('pg');
const bcrypt = require('bcrypt');

const client = new Client({
  connectionString: "postgresql://postgres:wardan4142@127.0.0.1:5432/pharmacy_db?schema=public",
});

async function main() {
  await client.connect();
  console.log('🔗 Connected to PostgreSQL database successfully!');

  const hashedPassword = await bcrypt.hash('cashier123', 10);

  const checkQuery = 'SELECT * FROM "User" WHERE email = $1';
  const existingUser = await client.query(checkQuery, ['cashier@pharmacy.com']);

  if (existingUser.rows.length > 0) {
    console.log('✅ Cashier user already exists with email: cashier@pharmacy.com');
  } else {
    const insertQuery = `
      INSERT INTO "User" (name, email, password, role)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    
    const values = ['Store Cashier', 'cashier@pharmacy.com', hashedPassword, 'CASHIER'];
    
    const result = await client.query(insertQuery, values);
    console.log('✅ Cashier user successfully created:', result.rows[0]);
  }

  await client.end();
}

main().catch(async (err) => {
  console.error('❌ Error executing script:', err);
  await client.end();
});