const axios = require("axios");
const pool = require("./db");

app.post("/exchange-token", async (req, res) => {
  try {
    const { longToken } = req.body;

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

    const pagesRes = await axios.get(
      "https://graph.facebook.com/me/accounts",
      {
        params: {
          access_token: longToken
        }
      }
    );

    const pages = pagesRes.data.data;

    for (const page of pages) {
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
    res.status(500).json({ error: "Something went wrong" });
  }
});
