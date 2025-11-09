// server/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import plaidRoutes from "./plaidRoutes.js";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Plaid routes mounted at /api/plaid
app.use("/api/plaid", plaidRoutes);

// Basic root test
app.get("/", (req, res) => res.send("🚀 AI Finance Manager Backend (Plaid Sandbox)"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
