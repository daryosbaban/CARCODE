const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { decodeVin } = require('../utils/vin');

const router = express.Router();

router.get('/meta', (req, res) => {
  const brands = db.prepare('SELECT id, name, name_ar FROM brands ORDER BY name_ar').all();
  const modules = db.prepare('SELECT id, code, name, name_ar FROM modules ORDER BY name_ar').all();
  res.json({ brands, modules });
});

router.get('/vin/:vin', (req, res) => {
  const result = decodeVin(req.params.vin);
  if (!result || !result.valid) {
    return res.status(400).json({ error: (result && result.reason) || 'رقم هيكل غير صالح' });
  }
  res.json(result);
});

router.get('/', requireAuth, (req, res) => {
  const { vin, marke, model, year, mkb, q } = req.query;

  let brandFilter = marke ? String(marke).trim() : null;
  let yearFilter = year ? parseInt(year, 10) : null;

  if (vin) {
    const decoded = decodeVin(String(vin));
    if (decoded && decoded.valid) {
      brandFilter = brandFilter || decoded.brand;
      yearFilter = yearFilter || decoded.year;
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

  res.json({ count: rows.length, results: rows });
});

router.get('/history', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT query, created_at FROM search_history WHERE user_id = ? ORDER BY id DESC LIMIT 10')
    .all(req.user.id);
  res.json({ history: rows });
});

module.exports = router;
