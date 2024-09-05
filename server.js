import { app, initializeDb } from "./app.js";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

// Open the database in production mode and initialize it
const startServer = async () => {
  try {
    const db = await open({
      filename: process.env.DB_PATH || "pos.db",
      driver: sqlite3.Database,
    });

    await initializeDb(db); // Initialize the database structure

    const port = process.env.PORT || 5500;
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
  }
};

startServer();
