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

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send("CommentAnalytics Backend is running 🚀");
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

