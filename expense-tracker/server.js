const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
require("dotenv").config();
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("."));
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
app.post("/api/setup", async (req, res) => {
    try { await pool.query("CREATE TABLE IF NOT EXISTS expenses (id SERIAL PRIMARY KEY, amount DECIMAL(10,2), category VARCHAR(50), description TEXT, currency VARCHAR(3) DEFAULT 'THB', expense_date DATE, type VARCHAR(10))"); res.json({ success: true }); }
    catch(e) { res.status(500).json({ error: e.message }); }
});
app.get("/api/expenses", async (req, res) => {
    let { month, year } = req.query;
    try { let r = await pool.query("SELECT * FROM expenses WHERE EXTRACT(MONTH FROM expense_date)=$1 AND EXTRACT(YEAR FROM expense_date)=$2 ORDER BY expense_date DESC", [month, year]); res.json(r.rows); }
    catch(e) { res.status(500).json({ error: e.message }); }
});
app.post("/api/expenses", async (req, res) => {
    let { amount, category, description, currency, expense_date, type } = req.body;
    try { let r = await pool.query("INSERT INTO expenses (amount, category, description, currency, expense_date, type) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *", [amount, category, description, currency, expense_date, type]); res.json(r.rows[0]); }
    catch(e) { res.status(500).json({ error: e.message }); }
});
app.delete("/api/expenses/:id", async (req, res) => {
    try { await pool.query("DELETE FROM expenses WHERE id=$1", [req.params.id]); res.json({ success: true }); }
    catch(e) { res.status(500).json({ error: e.message }); }
});
app.get("/api/summary/monthly", async (req, res) => {
    let { month, year } = req.query;
    try { let r = await pool.query("SELECT type, SUM(amount) as total FROM expenses WHERE EXTRACT(MONTH FROM expense_date)=$1 AND EXTRACT(YEAR FROM expense_date)=$2 GROUP BY type", [month, year]);
    let income=0, expense=0;
    r.rows.forEach(row => { if(row.type==="income") income=parseFloat(row.total); else expense=parseFloat(row.total); });
    res.json({ income: { THB: income }, expense: { THB: expense }, net: { THB: income - expense } }); }
    catch(e) { res.status(500).json({ error: e.message }); }
});
app.get("/api/categories", async (req, res) => {
    let { month, year } = req.query;
    try { let r = await pool.query("SELECT category, SUM(amount) as total FROM expenses WHERE EXTRACT(MONTH FROM expense_date)=$1 AND EXTRACT(YEAR FROM expense_date)=$2 AND type='expense' GROUP BY category", [month, year]);
    res.json({ labels: r.rows.map(r=>r.category), data: r.rows.map(r=>parseFloat(r.total)) }); }
    catch(e) { res.status(500).json({ error: e.message }); }
});
app.get("/api/export/csv", async (req, res) => {
    let { month, year } = req.query;
    try { let r = await pool.query("SELECT expense_date, type, amount, currency, category, description FROM expenses WHERE EXTRACT(MONTH FROM expense_date)=$1 AND EXTRACT(YEAR FROM expense_date)=$2", [month, year]); res.json(r.rows); }
    catch(e) { res.status(500).json({ error: e.message }); }
});
app.listen(3000, () => console.log("✅ Server at http://localhost:3000"));
