const express = require("express");
const router = express.Router();
const axios = require("axios");
const pool = require("../db");

const APP_ID = process.env.APP_ID;
const APP_SECRET = process.env.APP_SECRET;

router.post("/", async (req, res) => {
  try {
    const shortToken = req.body.token;

    if (!shortToken) {
      return res.status(400).json({ error: "Token missing" });
    }

    const tokenRes = await axios.get(
      "https://graph.facebook.com/v24.0/oauth/access_token",
      {
        params: {
          grant_type: "fb_exchange_token",
          client_id: APP_ID,
          client_secret: APP_SECRET,
          fb_exchange_token: shortToken
        }
      }
    );

    const longToken = tokenRes.data.access_token;

    const profileRes = await axios.get(
      "https://graph.facebook.com/me",
      {
        params: {
          fields: "id,name",
          access_token: longToken
        }
      }
    );

    const fbUserId = profileRes.data.id;
    const fbName = profileRes.data.name;

    const userResult = await pool.query(
      `
      INSERT INTO users (facebook_user_id, facebook_name, long_lived_user_token)
      VALUES ($1, $2, $3)
      ON CONFLICT (facebook_user_id)
      DO UPDATE SET
        facebook_name = EXCLUDED.facebook_name,
        long_lived_user_token = EXCLUDED.long_lived_user_token
      RETURNING id;
      `,
      [fbUserId, fbName, longToken]
    );

    const userId = userResult.rows[0].id;

    const pageRes = await axios.get(
      "https://graph.facebook.com/me/accounts",
      {
        params: { access_token: longToken }
      }
    );

    for (const page of pageRes.data.data) {
      await pool.query(
        `
        INSERT INTO pages (facebook_page_id, page_name, page_access_token, user_id)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (facebook_page_id)
        DO UPDATE SET
          page_name = EXCLUDED.page_name,
          page_access_token = EXCLUDED.page_access_token;
        `,
        [page.id, page.name, page.access_token, userId]
      );
    }

    res.json({ success: true });

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Exchange failed" });
  }
});

module.exports = router;
