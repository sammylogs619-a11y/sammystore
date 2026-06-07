import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn("[DB] DATABASE_URL not set — Replit PostgreSQL not connected.");
}

export const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;
