require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS so the React app (running on port 3005 or similar) can query this API
app.use(cors());
app.use(express.json());

// Initialize PostgreSQL Connection Pool
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME,
});

// Test connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection test failed:', err.message);
  } else {
    console.log('Database connection pool initialized successfully at:', res.rows[0].now);
  }
});

// Cache storage
const cache = {
  regimen: {},
  actividades: {}
};

// Normalize district identifier to remove whitespaces and ignore case (e.g. "RM 1" -> "RM1")
const normalizeDistrict = (distrito) => {
  if (!distrito) return '';
  return distrito.replace(/\s+/g, '').toUpperCase();
};

/**
 * GET /api/regimen/:distrito
 * Retrieves the urbanistic rules for the specified district.
 */
app.get('/api/regimen/:distrito', async (req, res) => {
  const rawDistrito = req.params.distrito;
  if (!rawDistrito) {
    return res.status(400).json({ error: 'Parámetro de distrito es requerido' });
  }

  const normalized = normalizeDistrict(rawDistrito);

  // Check cache first
  if (cache.regimen[normalized]) {
    console.log(`[Cache Hit] Regimen for: ${rawDistrito} (normalized: ${normalized})`);
    return res.json(cache.regimen[normalized]);
  }

  console.log(`[Database Query] Regimen for: ${rawDistrito} (normalized: ${normalized})`);

  try {
    const queryText = `
      SELECT 
        distrito, sub_distrito, sup_minima, frente_min, fot_privado, fot_publico, 
        fos_vu, fos_vomf, fos_uc, r_jardin, r_fondo, r_perfil, altura_maxima, 
        plantas, fos, r_frente, r_lateral, r_fondo2, r_desde_lm, altura_max, 
        fuente, referencia
      FROM regimen_urbanistico 
      WHERE UPPER(REPLACE(distrito, ' ', '')) = UPPER(REPLACE($1, ' ', ''))
      LIMIT 1;
    `;

    const result = await pool.query({
      name: 'fetch-regimen',
      text: queryText,
      values: [rawDistrito]
    });

    if (result.rows.length === 0) {
      // Return 404 or empty object if not found. We return 404 as it is standard REST.
      return res.status(404).json({ error: `Régimen no encontrado para el distrito: ${rawDistrito}` });
    }

    const data = result.rows[0];

    // Store in cache
    cache.regimen[normalized] = data;

    return res.json(data);
  } catch (err) {
    console.error('Error fetching regimen urbanistico:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor al consultar la base de datos' });
  }
});

/**
 * GET /api/actividades/:distrito
 * Retrieves the list of permitted and prohibited activities for the specified district.
 */
app.get('/api/actividades/:distrito', async (req, res) => {
  const rawDistrito = req.params.distrito;
  if (!rawDistrito) {
    return res.status(400).json({ error: 'Parámetro de distrito es requerido' });
  }

  const normalized = normalizeDistrict(rawDistrito);

  // Check cache first
  if (cache.actividades[normalized]) {
    console.log(`[Cache Hit] Actividades for: ${rawDistrito} (normalized: ${normalized})`);
    return res.json(cache.actividades[normalized]);
  }

  console.log(`[Database Query] Actividades for: ${rawDistrito} (normalized: ${normalized})`);

  try {
    const queryText = `
      SELECT categoria, subcategoria, actividad, estado 
      FROM actividades_zonificacion 
      WHERE UPPER(REPLACE(distrito, ' ', '')) = UPPER(REPLACE($1, ' ', ''))
      ORDER BY categoria, subcategoria, actividad;
    `;

    const result = await pool.query({
      name: 'fetch-actividades',
      text: queryText,
      values: [rawDistrito]
    });

    const activities = result.rows.map(row => ({
      categoria: row.categoria || 'N/A',
      subcategoria: row.subcategoria || 'N/A',
      actividad: row.actividad || 'N/A',
      estado: row.estado || 'N/A'
    }));

    const responseData = {
      distrito: rawDistrito,
      actividades: activities
    };

    // Store in cache
    cache.actividades[normalized] = responseData;

    return res.json(responseData);
  } catch (err) {
    console.error('Error fetching actividades zonificacion:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor al consultar la base de datos' });
  }
});

/**
 * GET /api/obras-privadas
 * Retrieves private works plans by catastro or expediente.
 */
app.get('/api/obras-privadas', async (req, res) => {
  const { catastro, expediente } = req.query;
  
  if (!catastro && !expediente) {
    return res.status(400).json({ error: 'Se requiere el parámetro catastro o expediente' });
  }

  try {
    let queryText = '';
    let values = [];

    if (catastro) {
      queryText = `
        SELECT * 
        FROM obras_privadas_registro_expedientes_catastros_sep2025 
        WHERE CAST(catastro AS TEXT) = $1;
      `;
      values = [catastro.toString()];
    } else {
      queryText = `
        SELECT * 
        FROM obras_privadas_registro_expedientes_catastros_sep2025 
        WHERE CAST(expediente AS TEXT) ILIKE $1;
      `;
      values = [`%${expediente}%`];
    }

    const result = await pool.query(queryText, values);
    return res.json(result.rows);
  } catch (err) {
    console.error('Error fetching obras privadas:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor al consultar la base de datos' });
  }
});

/**
 * GET /api/tpc-valores
 * Retrieves TPC reference values from tpc_valores_referencia.
 */
app.get('/api/tpc-valores', async (req, res) => {
  try {
    const result = await pool.query('SELECT zona, valor_suelo_min, valor_suelo_max, fot_privado FROM tpc_valores_referencia ORDER BY zona ASC;');
    return res.json(result.rows);
  } catch (err) {
    console.error('Error fetching TPC valores:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor al consultar la base de datos' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Local zoning API server running on port ${PORT}`);
});
