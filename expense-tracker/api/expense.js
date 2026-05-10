const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;
    
    try {
        // ========== SETUP DATABASE ==========
        if (path === '/api/setup' && req.method === 'POST') {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS expenses (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER DEFAULT 1,
                    amount DECIMAL(10,2),
                    category VARCHAR(50),
                    description TEXT,
                    currency VARCHAR(3) DEFAULT 'THB',
                    expense_date DATE,
                    type VARCHAR(10),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);
            // เพิ่ม user เริ่มต้น
            await pool.query(`INSERT INTO users (name) SELECT 'Test User' WHERE NOT EXISTS (SELECT 1 FROM users LIMIT 1)`);
            return res.json({ success: true, message: 'Database ready!' });
        }
        
        // ========== ADD EXPENSE ==========
        if (path === '/api/expenses' && req.method === 'POST') {
            const { amount, category, description, currency, expense_date, type } = req.body;
            const result = await pool.query(
                `INSERT INTO expenses (amount, category, description, currency, expense_date, type) 
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                [amount, category, description, currency, expense_date, type || 'expense']
            );
            return res.json(result.rows[0]);
        }
        
        // ========== GET EXPENSES ==========
        if (path === '/api/expenses' && req.method === 'GET') {
            const { month, year } = url.query;
            const result = await pool.query(
                `SELECT * FROM expenses 
                 WHERE EXTRACT(MONTH FROM expense_date) = $1 
                 AND EXTRACT(YEAR FROM expense_date) = $2 
                 ORDER BY expense_date DESC`,
                [month, year]
            );
            return res.json(result.rows);
        }
        
        // ========== DELETE EXPENSE ==========
        if (path.startsWith('/api/expenses/') && req.method === 'DELETE') {
            const id = path.split('/')[3];
            await pool.query('DELETE FROM expenses WHERE id = $1', [id]);
            return res.json({ success: true });
        }
        
        // ========== SUMMARY ==========
        if (path === '/api/summary/monthly' && req.method === 'GET') {
            const { month, year } = url.query;
            const result = await pool.query(
                `SELECT type, SUM(amount) as total 
                 FROM expenses 
                 WHERE EXTRACT(MONTH FROM expense_date) = $1 
                 AND EXTRACT(YEAR FROM expense_date) = $2 
                 GROUP BY type`,
                [month, year]
            );
            let income = 0, expense = 0;
            result.rows.forEach(row => {
                if (row.type === 'income') income = parseFloat(row.total);
                else expense = parseFloat(row.total);
            });
            return res.json({ 
                income: { THB: income }, 
                expense: { THB: expense }, 
                net: { THB: income - expense } 
            });
        }
        
        // ========== CATEGORIES ==========
        if (path === '/api/categories' && req.method === 'GET') {
            const { month, year } = url.query;
            const result = await pool.query(
                `SELECT category, SUM(amount) as total 
                 FROM expenses 
                 WHERE EXTRACT(MONTH FROM expense_date) = $1 
                 AND EXTRACT(YEAR FROM expense_date) = $2 
                 AND type = 'expense'
                 GROUP BY category`,
                [month, year]
            );
            return res.json({
                labels: result.rows.map(r => r.category),
                data: result.rows.map(r => parseFloat(r.total))
            });
        }
        
        // ========== BUDGETS ==========
        if (path === '/api/budgets' && req.method === 'GET') {
            return res.json({ THB: 10000 });
        }
        
        if (path === '/api/budgets' && req.method === 'POST') {
            return res.json({ success: true });
        }
        
        // ========== EXPORT CSV ==========
        if (path === '/api/export/csv' && req.method === 'GET') {
            const { month, year } = url.query;
            const result = await pool.query(
                `SELECT expense_date, type, amount, currency, category, description 
                 FROM expenses 
                 WHERE EXTRACT(MONTH FROM expense_date) = $1 
                 AND EXTRACT(YEAR FROM expense_date) = $2`,
                [month, year]
            );
            return res.json(result.rows);
        }
        
        return res.status(404).json({ error: 'Not found' });
        
    } catch (err) {
        console.error('Error:', err);
        return res.status(500).json({ error: err.message });
    }
};
