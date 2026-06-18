const { Pool } = require('pg');
require('dotenv').config();

const data = [
  { zona: 1, min: 30, max: 40, fot: 2.4 },
  { zona: 3, min: 100, max: 140, fot: 2.4 },
  { zona: 4, min: 100, max: 140, fot: 2.4 },
  { zona: 5, min: 120, max: 160, fot: 2.4 },
  { zona: 8, min: 150, max: 200, fot: 2.4 },
  { zona: 11, min: 150, max: 200, fot: 2.4 },
  { zona: 12, min: 150, max: 200, fot: 2.4 },
  { zona: 13, min: 150, max: 200, fot: 2.4 },
  { zona: 14, min: 120, max: 180, fot: 3 },
  { zona: 16, min: 150, max: 250, fot: 4.2 },
  { zona: 17, min: 200, max: 300, fot: 1.1 },
  { zona: 19, min: 200, max: 500, fot: 5.4 },
  { zona: 20, min: 200, max: 300, fot: 5.4 },
  { zona: 23, min: 70, max: 100, fot: 1.1 },
  { zona: 24, min: 30, max: 40, fot: 1.8 },
  { zona: 25, min: 30, max: 40, fot: 1.8 },
  { zona: 26, min: 150, max: 300, fot: 2.4 },
  { zona: 27, min: 150, max: 250, fot: 4.2 },
  { zona: 28, min: 150, max: 250, fot: 5.4 },
  { zona: 29, min: 200, max: 500, fot: 5.4 },
  { zona: 32, min: 100, max: 150, fot: 1.1 },
  { zona: 33, min: 250, max: 350, fot: 4.2 },
  { zona: 34, min: 250, max: 400, fot: 5.4 },
  { zona: 35, min: 300, max: null, fot: 3 },
  { zona: 40, min: 40, max: 80, fot: 2.4 },
  { zona: 41, min: 70, max: 100, fot: 1.1 },
  { zona: 42, min: 100, max: 200, fot: 2.4 },
  { zona: 43, min: 250, max: 400, fot: 4.2 },
  { zona: 44, min: 250, max: 400, fot: 5.4 },
  { zona: 45, min: 200, max: null, fot: 2.4 }
];

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME,
});

async function seed() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tpc_valores_referencia (
        zona INTEGER PRIMARY KEY,
        valor_suelo_min NUMERIC,
        valor_suelo_max NUMERIC,
        fot_privado NUMERIC
      );
    `);
    
    await pool.query('TRUNCATE TABLE tpc_valores_referencia;');

    for (const row of data) {
      await pool.query(
        'INSERT INTO tpc_valores_referencia (zona, valor_suelo_min, valor_suelo_max, fot_privado) VALUES ($1, $2, $3, $4)',
        [row.zona, row.min, row.max, row.fot]
      );
    }
    console.log('Data seeded successfully!');
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

seed();
