import express from "express";
import { open } from "sqlite";
import sqlite3 from "sqlite3";
import morgan from "morgan";
import helmet from "helmet";
import productRoutes from "./routes/products.js"; // Import product routes
import transactionRoutes from "./routes/transactions.js"; // Import transaction routes

const app = express();
app.use(express.json());
app.use(morgan("dev"));
app.use(helmet());

let db;

/**
 * Initializes the database and creates necessary tables if they do not exist.
 */
async function initializeDb(dbInstance) {
  try {
    db = dbInstance || await open({
      filename: process.env.DB_PATH || "pos.db",
      driver: sqlite3.Database,
    });

    // Enable foreign key constraints for integrity
    await db.run("PRAGMA foreign_keys = ON");

    // Wrap table creation in a transaction to ensure atomicity
    await db.exec(`
      BEGIN TRANSACTION;

      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL NOT NULL CHECK(price >= 0),
        inventory INTEGER NOT NULL CHECK(inventory >= 0)
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL CHECK(quantity >= 0),
        total REAL NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      );

      COMMIT;
    `);

    console.log("Database initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize the database:", err);

    // Rollback in case of any error during table creation
    await db.exec("ROLLBACK");

    throw err; // Let the caller handle the error
  }
}

export { app, initializeDb, db };

// Use the routes
app.use("/api/products", productRoutes); // Use product routes
app.use("/api/transactions", transactionRoutes); // Use transaction routes

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});
