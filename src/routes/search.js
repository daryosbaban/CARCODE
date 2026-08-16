const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { decodeVin } = require('../utils/vin');
const { decodeVinNHTSA, getModelsForMakeYear } = require('../utils/nhtsa');

const router = express.Router();

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const modelsCache = new Map();

function getCached(key) {
  const entry = modelsCache.get(key);
  if (!entry || entry.expires < Date.now()) return null;
  return entry.value;
}
function setCached(key, value) {
  modelsCache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
}

// Tries the free NHTSA vPIC service (real, live data for virtually any make/model
// sold in the US market); falls back to the local standards-based WMI table if the
// network call fails or is unreachable, so the feature still works offline.
async function decodeVinBestEffort(vin) {
  try {
    const nhtsa = await decodeVinNHTSA(vin);
    if (nhtsa && nhtsa.valid && nhtsa.make) return nhtsa;
  } catch {
    // fall through to local decode
  }
  const local = decodeVin(vin);
  return local && local.valid ? { ...local, source: 'local' } : local;
}

router.get('/meta', (req, res) => {
  const brands = db.prepare('SELECT id, name, name_ar FROM brands ORDER BY name_ar').all();
  const modules = db.prepare('SELECT id, code, name, name_ar FROM modules ORDER BY name_ar').all();
  res.json({ brands, modules });
});

router.get('/models', async (req, res) => {
  const { make, year } = req.query;
  if (!make || !year) {
    return res.status(400).json({ error: 'الرجاء تحديد الماركة والسنة' });
  }
  const key = `${make}|${year}`;
  const cached = getCached(key);
  if (cached) return res.json({ models: cached, cached: true });

  try {
    const models = await getModelsForMakeYear(String(make), String(year));
    setCached(key, models);
    res.json({ models, cached: false });
  } catch {
    res.json({ models: [], unavailable: true });
  }
});

router.get('/vin/:vin', async (req, res) => {
  const result = await decodeVinBestEffort(req.params.vin);
  if (!result || !result.valid) {
    return res.status(400).json({ error: (result && result.reason) || 'رقم هيكل غير صالح' });
  }
  res.json(result);
});

router.get('/', requireAuth, async (req, res) => {
  const { vin, marke, model, year, mkb, q } = req.query;

  let brandFilter = marke ? String(marke).trim() : null;
  let yearFilter = year ? parseInt(year, 10) : null;
  let vehicleInfo = null;

  if (vin) {
    const decoded = await decodeVinBestEffort(String(vin));
    if (decoded && decoded.valid) {
      brandFilter = brandFilter || decoded.make || decoded.brand;
      yearFilter = yearFilter || decoded.year;
      vehicleInfo = decoded;
    }
  }

  const clauses = [];
  const params = {};

  if (brandFilter) {
    clauses.push('(b.name = @brand OR b.name_ar = @brand)');
    params.brand = brandFilter;
  }
  if (yearFilter) {
    clauses.push('(dc.year_from IS NULL OR dc.year_from <= @year) AND (dc.year_to IS NULL OR dc.year_to >= @year)');
    params.year = yearFilter;
  }
  if (mkb) {
    clauses.push('(m.code = @mkb OR m.name_ar LIKE @mkbLike)');
    params.mkb = String(mkb).trim();
    params.mkbLike = `%${String(mkb).trim()}%`;
  }
  if (model) {
    clauses.push('(dc.model IS NULL OR dc.model LIKE @modelLike)');
    params.modelLike = `%${String(model).trim()}%`;
  }
  if (q) {
    clauses.push('(dc.code LIKE @qLike OR dc.title_ar LIKE @qLike OR dc.description_ar LIKE @qLike)');
    params.qLike = `%${String(q).trim()}%`;
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const sql = `
    SELECT dc.id, dc.code, dc.title, dc.title_ar, dc.description_ar, dc.severity,
           m.code AS module_code, m.name_ar AS module_name_ar,
           b.name AS brand, b.name_ar AS brand_ar
    FROM diagnostic_codes dc
    JOIN modules m ON m.id = dc.module_id
    LEFT JOIN brands b ON b.id = dc.brand_id
    ${where}
    ORDER BY dc.code
    LIMIT 100
  `;

  const rows = db.prepare(sql).all(params);

  db.prepare('INSERT INTO search_history (user_id, query) VALUES (?, ?)').run(
    req.user.id,
    JSON.stringify({ vin, marke, model, year, mkb, q })
  );

  res.json({ count: rows.length, results: rows, vehicleInfo });
});

router.get('/history', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT query, created_at FROM search_history WHERE user_id = ? ORDER BY id DESC LIMIT 10')
    .all(req.user.id);
  res.json({ history: rows });
});

module.exports = router;
