const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return null;
    }
};

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;

    // Auth
    const authHeader = req.headers.authorization;
    let userId = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        if (decoded) userId = decoded.userId;
    }

    try {
        // ========== SETUP ==========
        if (path === '/api/setup' && req.method === 'POST') {
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
            return res.json({ success: true });
        }

        // ========== LINE AUTH ==========
        if (path === '/api/auth/liff' && req.method === 'POST') {
            const { lineUid, displayName } = req.body;
            let result = await pool.query('SELECT * FROM users WHERE line_uid = $1', [lineUid]);
            let userId;
            if (result.rows.length === 0) {
                const insert = await pool.query('INSERT INTO users (line_uid, display_name) VALUES ($1, $2) RETURNING id', [lineUid, displayName]);
                userId = insert.rows[0].id;
            } else {
                userId = result.rows[0].id;
            }
            const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
            return res.json({ success: true, token, userId });
        }

        // ตรวจสอบ Auth สำหรับ endpoints อื่นๆ
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { month, year, currency } = url.query;

        // ========== GET EXPENSES ==========
        if (path === '/api/expenses' && req.method === 'GET') {
            const result = await pool.query(
                `SELECT * FROM expenses WHERE user_id = $1 AND EXTRACT(MONTH FROM expense_date) = $2 AND EXTRACT(YEAR FROM expense_date) = $3 ORDER BY expense_date DESC`,
                [userId, month, year]
            );
            return res.json(result.rows);
        }

        // ========== ADD EXPENSE ==========
        if (path === '/api/expenses' && req.method === 'POST') {
            const { amount, category, description, currency, expense_date, type } = req.body;
            const result = await pool.query(
                `INSERT INTO expenses (user_id, amount, category, description, currency, expense_date, type) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
                [userId, amount, category, description, currency, expense_date, type]
            );
            return res.json(result.rows[0]);
        }

        // ========== DELETE EXPENSE ==========
        if (path.startsWith('/api/expenses/') && req.method === 'DELETE') {
            const id = path.split('/')[3];
            await pool.query('DELETE FROM expenses WHERE id = $1 AND user_id = $2', [id, userId]);
            return res.json({ success: true });
        }

        // ========== MONTHLY SUMMARY ==========
        if (path === '/api/summary/monthly' && req.method === 'GET') {
            const result = await pool.query(
                `SELECT type, currency, SUM(amount) as total FROM expenses WHERE user_id = $1 AND EXTRACT(MONTH FROM expense_date) = $2 AND EXTRACT(YEAR FROM expense_date) = $3 GROUP BY type, currency`,
                [userId, month, year]
            );
            const summary = { income: {}, expense: {}, net: {} };
            result.rows.forEach(row => {
                if (row.type === 'income') summary.income[row.currency] = parseFloat(row.total);
                else summary.expense[row.currency] = parseFloat(row.total);
            });
            const allCurrencies = new Set([...Object.keys(summary.income), ...Object.keys(summary.expense)]);
            allCurrencies.forEach(curr => { summary.net[curr] = (summary.income[curr] || 0) - (summary.expense[curr] || 0); });
            return res.json(summary);
        }

        // ========== CATEGORY SUMMARY ==========
        if (path === '/api/categories' && req.method === 'GET') {
            let query = `SELECT category, SUM(amount) as total FROM expenses WHERE user_id = $1 AND type = 'expense' AND EXTRACT(MONTH FROM expense_date) = $2 AND EXTRACT(YEAR FROM expense_date) = $3`;
            let params = [userId, month, year];
            if (currency) { query += ` AND currency = $4`; params.push(currency); }
            query += ` GROUP BY category ORDER BY total DESC`;
            const result = await pool.query(query, params);
            return res.json({ labels: result.rows.map(r => r.category), data: result.rows.map(r => parseFloat(r.total)) });
        }

        // ========== BUDGETS ==========
        if (path === '/api/budgets' && req.method === 'GET') {
            const result = await pool.query('SELECT currency, amount FROM budgets WHERE user_id = $1 AND month = $2 AND year = $3', [userId, month, year]);
            const budgets = {};
            result.rows.forEach(row => budgets[row.currency] = parseFloat(row.amount));
            return res.json(budgets);
        }

        if (path === '/api/budgets' && req.method === 'POST') {
            const { month, year, budgets } = req.body;
            for (const [currency, amount] of Object.entries(budgets)) {
                await pool.query(`INSERT INTO budgets (user_id, currency, amount, month, year) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (user_id, currency, month, year) DO UPDATE SET amount = EXCLUDED.amount`, [userId, currency, amount, month, year]);
            }
            return res.json({ success: true });
        }

        // ========== EXPORT CSV ==========
        if (path === '/api/export/csv' && req.method === 'GET') {
            const result = await pool.query(`SELECT expense_date, type, amount, currency, category, description FROM expenses WHERE user_id = $1 AND EXTRACT(MONTH FROM expense_date) = $2 AND EXTRACT(YEAR FROM expense_date) = $3 ORDER BY expense_date DESC`, [userId, month, year]);
            return res.json(result.rows);
        }

        return res.status(404).json({ error: 'Not found' });

    } catch (err) {
        console.error('API Error:', err);
        return res.status(500).json({ error: err.message });
    }
};