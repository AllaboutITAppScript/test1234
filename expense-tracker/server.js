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

// Create tables with user_id
async function initDatabase() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS expenses (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(100) NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                category VARCHAR(50) NOT NULL,
                description TEXT,
                currency VARCHAR(3) NOT NULL,
                expense_date DATE NOT NULL,
                type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense'))
            )
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, expense_date)
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS budgets (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(100) NOT NULL,
                currency VARCHAR(3) NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                month INTEGER NOT NULL,
                year INTEGER NOT NULL,
                UNIQUE(user_id, currency, month, year)
            )
        `);
        console.log("✅ Database initialized with user support");
    } catch (err) {
        console.error("Database init error:", err);
    }
}

// Routes
app.get("/api/expenses", async (req, res) => {
    const { month, year, userId } = req.query;
    if (!userId) return res.status(400).json({ error: "userId required" });
    
    try {
        const result = await pool.query(
            "SELECT * FROM expenses WHERE user_id = $1 AND EXTRACT(MONTH FROM expense_date) = $2 AND EXTRACT(YEAR FROM expense_date) = $3 ORDER BY expense_date DESC",
            [userId, month, year]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/expenses", async (req, res) => {
    const { amount, category, description, currency, expense_date, type, userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });
    
    try {
        const result = await pool.query(
            "INSERT INTO expenses (user_id, amount, category, description, currency, expense_date, type) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
            [userId, amount, category, description, currency, expense_date, type]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put("/api/expenses/:id", async (req, res) => {
    const { id } = req.params;
    const { amount, category, description, currency, expense_date, type, userId } = req.body;
    
    try {
        const result = await pool.query(
            "UPDATE expenses SET amount=$1, category=$2, description=$3, currency=$4, expense_date=$5, type=$6 WHERE id=$7 AND user_id=$8 RETURNING *",
            [amount, category, description, currency, expense_date, type, id, userId]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete("/api/expenses/:id", async (req, res) => {
    const { id } = req.params;
    const { userId } = req.query;
    
    try {
        await pool.query("DELETE FROM expenses WHERE id = $1 AND user_id = $2", [id, userId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/summary/monthly", async (req, res) => {
    const { month, year, userId } = req.query;
    if (!userId) return res.status(400).json({ error: "userId required" });
    
    try {
        const result = await pool.query(
            "SELECT type, SUM(amount) as total FROM expenses WHERE user_id=$1 AND EXTRACT(MONTH FROM expense_date)=$2 AND EXTRACT(YEAR FROM expense_date)=$3 GROUP BY type",
            [userId, month, year]
        );
        let income = 0, expense = 0;
        result.rows.forEach(row => {
            if (row.type === "income") income = parseFloat(row.total);
            else expense = parseFloat(row.total);
        });
        res.json({ income: { THB: income }, expense: { THB: expense }, net: { THB: income - expense } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/categories", async (req, res) => {
    const { month, year, userId } = req.query;
    if (!userId) return res.status(400).json({ error: "userId required" });
    
    try {
        const result = await pool.query(
            "SELECT category, SUM(amount) as total FROM expenses WHERE user_id=$1 AND EXTRACT(MONTH FROM expense_date)=$2 AND EXTRACT(YEAR FROM expense_date)=$3 AND type='expense' GROUP BY category",
            [userId, month, year]
        );
        res.json({ labels: result.rows.map(r => r.category), data: result.rows.map(r => parseFloat(r.total)) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/budgets", async (req, res) => {
    const { month, year, userId } = req.query;
    if (!userId) return res.status(400).json({ error: "userId required" });
    
    try {
        const result = await pool.query(
            "SELECT currency, amount FROM budgets WHERE user_id=$1 AND month=$2 AND year=$3",
            [userId, month, year]
        );
        const budgets = {};
        result.rows.forEach(row => budgets[row.currency] = parseFloat(row.amount));
        res.json(budgets);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/budgets", async (req, res) => {
    const { month, year, budgets, userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });
    
    try {
        for (const [currency, amount] of Object.entries(budgets)) {
            await pool.query(
                "INSERT INTO budgets (user_id, currency, amount, month, year) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (user_id, currency, month, year) DO UPDATE SET amount = EXCLUDED.amount",
                [userId, currency, amount, month, year]
            );
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/export/csv", async (req, res) => {
    const { month, year, userId } = req.query;
    if (!userId) return res.status(400).json({ error: "userId required" });
    
    try {
        const result = await pool.query(
            "SELECT expense_date, type, amount, currency, category, description FROM expenses WHERE user_id=$1 AND EXTRACT(MONTH FROM expense_date)=$2 AND EXTRACT(YEAR FROM expense_date)=$3 ORDER BY expense_date DESC",
            [userId, month, year]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    await initDatabase();
    console.log(`✅ Server running at https://your-ngrok-url.ngrok.io`);
    console.log(`📍 Local: http://localhost:${PORT}`);
});
