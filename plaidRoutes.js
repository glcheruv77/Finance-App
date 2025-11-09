// server/plaidRoutes.js
import express from "express";
import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

const router = express.Router();

const clientId = process.env.PLAID_CLIENT_ID;
const secret = process.env.PLAID_SECRET;

if (!clientId || !secret) {
  console.warn("WARNING: PLAID_CLIENT_ID or PLAID_SECRET not set in .env");
}

const config = new Configuration({
  basePath: PlaidEnvironments.sandbox, // sandbox for local testing
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": clientId,
      "PLAID-SECRET": secret,
    },
  },
});
const client = new PlaidApi(config);

// Create a link token for Plaid Link
router.post("/create_link_token", async (req, res) => {
  try {
    const response = await client.linkTokenCreate({
      user: { client_user_id: "local-user-1" },
      client_name: "AI Finance Manager (Sandbox)",
      products: ["transactions", "auth"],
      language: "en",
      country_codes: ["US"],
    });
    res.json(response.data);
  } catch (err) {
    console.error("create_link_token error:", err);
    res.status(500).json({ error: "Failed to create link token" });
  }
});

// Exchange public_token => access_token
router.post("/exchange_public_token", async (req, res) => {
  try {
    const { public_token } = req.body;
    const resp = await client.itemPublicTokenExchange({ public_token });
    res.json({ access_token: resp.data.access_token, item_id: resp.data.item_id });
  } catch (err) {
    console.error("exchange_public_token error:", err);
    res.status(500).json({ error: "Failed to exchange public token" });
  }
});

// Fetch transactions (example, date range can be adjusted)
router.post("/transactions", async (req, res) => {
  try {
    const { access_token, start_date, end_date } = req.body;
    if (!access_token) return res.status(400).json({ error: "access_token required" });

    const response = await client.transactionsGet({
      access_token,
      start_date: start_date || "2024-01-01",
      end_date: end_date || new Date().toISOString().slice(0, 10)
    });
    res.json(response.data);
  } catch (err) {
    console.error("transactions error:", err);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

export default router;
