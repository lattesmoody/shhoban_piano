// app/api/users/route.js
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request) {
  const { rows } = await pool.query('SELECT * FROM users');
  return new Response(JSON.stringify(rows));
}