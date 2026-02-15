require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const APP_ID = process.env.APP_ID;
const APP_SECRET = process.env.APP_SECRET;

app.post('/exchange-token', async (req, res) => {
    try {
        const shortToken = req.body.token;

        if (!shortToken) {
            return res.status(400).json({ error: "Token missing" });
        }

        const tokenRes = await axios.get(`https://graph.facebook.com/v24.0/oauth/access_token`, {
            params: {
                grant_type: 'fb_exchange_token',
                client_id: APP_ID,
                client_secret: APP_SECRET,
                fb_exchange_token: shortToken
            }
        });

        const longToken = tokenRes.data.access_token;

        const pageRes = await axios.get(`https://graph.facebook.com/v24.0/me/accounts`, {
            params: {
                access_token: longToken
            }
        });

        res.json({
            long_lived_token: longToken,
            pages: pageRes.data
        });

    } catch (err) {
        console.error(err.response?.data || err.message);
        res.status(500).json({ error: "Token exchange failed" });
    }
});

const pool = require("./db");

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
        facebook_page_id TEXT,
        page_name TEXT,
        page_access_token TEXT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
  } catch (err) {
    console.error("DB error:", err);
  }
}

initDB();

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send("CommentAnalytics Backend is running 🚀");
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

