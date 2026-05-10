const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("."));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// ========== SETUP ==========
app.post("/api/setup", async (req, res) => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS expenses (
                id SERIAL PRIMARY KEY,
                amount DECIMAL(10,2),
                category VARCHAR(50),
                description TEXT,
                currency VARCHAR(3) DEFAULT 'THB',
                expense_date DATE,
                type VARCHAR(10)
            );
            CREATE TABLE IF NOT EXISTS budgets (
                id SERIAL PRIMARY KEY,
                user_id INTEGER DEFAULT 1,
                currency VARCHAR(3) DEFAULT 'THB',
                amount DECIMAL(10,2),
                month INTEGER,
                year INTEGER
            );
        `);
        res.json({ success: true, message: "Database ready!" });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// ========== EXPENSES ==========
app.get("/api/expenses", async (req, res) => {
    let { month, year, currency } = req.query;
    try {
        let query = `SELECT * FROM expenses WHERE EXTRACT(MONTH FROM expense_date)=$1 AND EXTRACT(YEAR FROM expense_date)=$2`;
        let params = [month, year];
        if (currency && currency !== "") {
            query += ` AND currency = $3`;
            params.push(currency);
        }
        query += ` ORDER BY expense_date DESC`;
        let r = await pool.query(query, params);
        res.json(r.rows);
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/expenses", async (req, res) => {
    let { amount, category, description, currency, expense_date, type } = req.body;
    try {
        let r = await pool.query(
            `INSERT INTO expenses (amount, category, description, currency, expense_date, type) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
            [amount, category, description, currency, expense_date, type]
        );
        res.json(r.rows[0]);
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/expenses/:id", async (req, res) => {
    try {
        await pool.query(`DELETE FROM expenses WHERE id=$1`, [req.params.id]);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// ========== SUMMARY ==========
app.get("/api/summary/monthly", async (req, res) => {
    let { month, year } = req.query;
    try {
        let r = await pool.query(
            `SELECT type, currency, SUM(amount) as total FROM expenses WHERE EXTRACT(MONTH FROM expense_date)=$1 AND EXTRACT(YEAR FROM expense_date)=$2 GROUP BY type, currency`,
            [month, year]
        );
        let income = {}, expense = {}, net = {};
        r.rows.forEach(row => {
            let curr = row.currency || "THB";
            let amt = parseFloat(row.total);
            if (row.type === "income") income[curr] = amt;
            else expense[curr] = amt;
        });
        let allCurrencies = new Set([...Object.keys(income), ...Object.keys(expense)]);
        allCurrencies.forEach(curr => { net[curr] = (income[curr] || 0) - (expense[curr] || 0); });
        res.json({ income, expense, net });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// ========== CATEGORIES ==========
app.get("/api/categories", async (req, res) => {
    let { month, year, currency } = req.query;
    try {
        let query = `SELECT category, SUM(amount) as total FROM expenses WHERE EXTRACT(MONTH FROM expense_date)=$1 AND EXTRACT(YEAR FROM expense_date)=$2 AND type='expense'`;
        let params = [month, year];
        if (currency && currency !== "") {
            query += ` AND currency = $3`;
            params.push(currency);
        }
        query += ` GROUP BY category ORDER BY total DESC`;
        let r = await pool.query(query, params);
        res.json({ labels: r.rows.map(r=>r.category), data: r.rows.map(r=>parseFloat(r.total)) });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// ========== BUDGETS ==========
app.get("/api/budgets", async (req, res) => {
    let { month, year } = req.query;
    try {
        let r = await pool.query(`SELECT currency, amount FROM budgets WHERE month=$1 AND year=$2`, [month, year]);
        let budgets = {};
        r.rows.forEach(row => budgets[row.currency] = parseFloat(row.amount));
        res.json(budgets);
    } catch(e) { res.json({}); }
});

app.post("/api/budgets", async (req, res) => {
    let { month, year, budgets } = req.body;
    try {
        for (let [currency, amount] of Object.entries(budgets)) {
            await pool.query(`DELETE FROM budgets WHERE month=$1 AND year=$2 AND currency=$3`, [month, year, currency]);
            if (amount > 0) {
                await pool.query(`INSERT INTO budgets (month, year, currency, amount) VALUES ($1,$2,$3,$4)`, [month, year, currency, amount]);
            }
        }
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// ========== EXPORT CSV ==========
app.get("/api/export/csv", async (req, res) => {
    let { month, year } = req.query;
    try {
        let r = await pool.query(`SELECT expense_date, type, amount, currency, category, description FROM expenses WHERE EXTRACT(MONTH FROM expense_date)=$1 AND EXTRACT(YEAR FROM expense_date)=$2 ORDER BY expense_date DESC`, [month, year]);
        res.json(r.rows);
    } catch(e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log(`📁 เปิด: http://localhost:${PORT}/index.html`);
    console.log(`🌐 สำหรับ Vercel: ใช้ Environment Variables DATABASE_URL`);
});
