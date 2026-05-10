const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

app.post('/api/setup', async (req, res) => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY, line_uid VARCHAR(100) UNIQUE NOT NULL,
                display_name VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS expenses (
                id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                amount DECIMAL(10,2) NOT NULL, category VARCHAR(50) NOT NULL,
                description TEXT, currency VARCHAR(3) DEFAULT 'THB',
                expense_date DATE NOT NULL, type VARCHAR(10) DEFAULT 'expense',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS budgets (
                id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                currency VARCHAR(3) DEFAULT 'THB', amount DECIMAL(10,2) NOT NULL,
                month INTEGER, year INTEGER, UNIQUE(user_id, currency, month, year)
            );
        `);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/liff', async (req, res) => {
    const { lineUid, displayName } = req.body;
    try {
        let result = await pool.query('SELECT * FROM users WHERE line_uid = $1', [lineUid]);
        let userId;
        if (result.rows.length === 0) {
            const insert = await pool.query('INSERT INTO users (line_uid, display_name) VALUES ($1, $2) RETURNING id', [lineUid, displayName]);
            userId = insert.rows[0].id;
        } else {
            userId = result.rows[0].id;
        }
        const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
        res.json({ success: true, token, userId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/expenses', verifyToken, async (req, res) => {
    const { month, year } = req.query;
    try {
        const result = await pool.query(
            `SELECT * FROM expenses WHERE user_id = $1 AND EXTRACT(MONTH FROM expense_date) = $2 AND EXTRACT(YEAR FROM expense_date) = $3 ORDER BY expense_date DESC`,
            [req.userId, month, year]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/expenses', verifyToken, async (req, res) => {
    const { amount, category, description, currency, expense_date, type } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO expenses (user_id, amount, category, description, currency, expense_date, type) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [req.userId, amount, category, description, currency, expense_date, type]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/expenses/:id', verifyToken, async (req, res) => {
    try {
        await pool.query('DELETE FROM expenses WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/summary/monthly', verifyToken, async (req, res) => {
    const { month, year } = req.query;
    try {
        const result = await pool.query(
            `SELECT type, currency, SUM(amount) as total FROM expenses WHERE user_id = $1 AND EXTRACT(MONTH FROM expense_date) = $2 AND EXTRACT(YEAR FROM expense_date) = $3 GROUP BY type, currency`,
            [req.userId, month, year]
        );
        const summary = { income: {}, expense: {}, net: {} };
        result.rows.forEach(row => {
            if (row.type === 'income') summary.income[row.currency] = parseFloat(row.total);
            else summary.expense[row.currency] = parseFloat(row.total);
        });
        const allCurrencies = new Set([...Object.keys(summary.income), ...Object.keys(summary.expense)]);
        allCurrencies.forEach(curr => { summary.net[curr] = (summary.income[curr] || 0) - (summary.expense[curr] || 0); });
        res.json(summary);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/categories', verifyToken, async (req, res) => {
    const { month, year, currency } = req.query;
    try {
        let query = `SELECT category, SUM(amount) as total FROM expenses WHERE user_id = $1 AND type = 'expense' AND EXTRACT(MONTH FROM expense_date) = $2 AND EXTRACT(YEAR FROM expense_date) = $3`;
        let params = [req.userId, month, year];
        if (currency) { query += ` AND currency = $4`; params.push(currency); }
        query += ` GROUP BY category ORDER BY total DESC`;
        const result = await pool.query(query, params);
        res.json({ labels: result.rows.map(r => r.category), data: result.rows.map(r => parseFloat(r.total)) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/budgets', verifyToken, async (req, res) => {
    const { month, year } = req.query;
    try {
        const result = await pool.query('SELECT currency, amount FROM budgets WHERE user_id = $1 AND month = $2 AND year = $3', [req.userId, month, year]);
        const budgets = {};
        result.rows.forEach(row => budgets[row.currency] = parseFloat(row.amount));
        res.json(budgets);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/budgets', verifyToken, async (req, res) => {
    const { month, year, budgets } = req.body;
    try {
        for (const [currency, amount] of Object.entries(budgets)) {
            await pool.query(`INSERT INTO budgets (user_id, currency, amount, month, year) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (user_id, currency, month, year) DO UPDATE SET amount = EXCLUDED.amount`, [req.userId, currency, amount, month, year]);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/export/csv', verifyToken, async (req, res) => {
    const { month, year } = req.query;
    try {
        const result = await pool.query(`SELECT expense_date, type, amount, currency, category, description FROM expenses WHERE user_id = $1 AND EXTRACT(MONTH FROM expense_date) = $2 AND EXTRACT(YEAR FROM expense_date) = $3 ORDER BY expense_date DESC`, [req.userId, month, year]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log(`📁 เปิดเบราว์เซอร์: http://localhost:${PORT}/index.html`);
});