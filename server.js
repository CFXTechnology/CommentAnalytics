require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Import route
const exchangeTokenRoute = require("./routes/exchange-token");
app.use("/exchange-token", exchangeTokenRoute);

// ✅ สร้าง table อัตโนมัติ
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        facebook_user_id TEXT UNIQUE,
        facebook_name TEXT,
        long_lived_user_token TEXT,
        token_expiry TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS pages (
        id SERIAL PRIMARY KEY,
        facebook_page_id TEXT UNIQUE,
        page_name TEXT,
        page_access_token TEXT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log("✅ Database ready");
  } catch (err) {
    console.error("❌ DB error:", err);
  }
}

initDB();

app.get('/', (req, res) => {
  res.send("CommentAnalytics Backend is running 🚀");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
