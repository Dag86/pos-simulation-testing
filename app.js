import express from "express";
import { open } from "sqlite";
import sqlite3 from "sqlite3";

/**
 * Initializes the database and creates necessary tables if they do not exist.
 * @returns {Promise<sqlite3.Database>} The initialized database object.
 */
async function initializeDb() {
  const db = await open({
    filename: process.env.DB_PATH || "pos.db",
    driver: sqlite3.Database,
  });

  // Create a table for storing products
  await db.run(
    "CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, price REAL, inventory INTEGER)"
  );
  // Create a table for storing transactions
  await db.run(
    "CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER, quantity INTEGER, total REAL)"
  );
  return db;
}

const app = express();
app.use(express.json());

/**
 * Middleware to validate product data before adding to the database.
 * Ensures that price and inventory numbers are non-negative.
 */
function validateProduct(req, res, next) {
  const { price, inventory } = req.body;
  if (price < 0 || inventory < 0) {
    return res
      .status(400)
      .json({ error: "Price and inventory must be non-negative numbers." });
  }
  next();
}

let db;

// Initialize the database and handle initialization errors.
initializeDb()
  .then((database) => {
    db = database;
  })
  .catch((err) => {
    console.error("Failed to initialize the database:", err);
    process.exit(1);
  });

//Updates an existing product's details.
app.put("/api/products/:id", async (req, res) => {
  const { id } = req.params; // Extract product ID from the URL parameter
  const { name, price, inventory } = req.body; // Extract updated product details from the request body

  try {
    // Update the product in the database if it exists
    const result = await db.run(
      "UPDATE products SET name = ?, price = ?, inventory = ? WHERE id = ?",
      [name, price, inventory, id]
    );

    if (result.changes) {
      res.json({ message: "Product updated successfully" });
    } else {
      // If no changes were made, it means the product ID was not found
      res.status(404).json({ error: "Product not found" });
    }
  } catch (err) {
    console.error("Error updating product:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
//Retrieves a specific transaction by ID
app.get("/api/transactions/:id", async (req, res) => {
  const { id } = req.params; // Extract transaction ID from the URL parameter

  try {
    // Fetch the transaction from the database
    const transaction = await db.get(
      "SELECT * FROM transactions WHERE id = ?",
      [id]
    );

    if (transaction) {
      res.json(transaction);
    } else {
      // If the transaction is not found, send a 404 response
      res.status(404).json({ error: "Transaction not found" });
    }
  } catch (err) {
    console.error("Error fetching transaction:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

//API endpoint to add a new product to the database.

app.post("/api/products", validateProduct, async (req, res) => {
  const { name, price, inventory } = req.body;
  try {
    const result = await db.run(
      "INSERT INTO products (name, price, inventory) VALUES (?, ?, ?)",
      [name, price, inventory]
    );
    res.json({ id: result.lastID });
  } catch (err) {
    console.error("Error adding new product:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * API endpoint to retrieve all products from the database.
 */
app.get("/api/products", async (req, res) => {
  try {
    const products = await db.all("SELECT * FROM products");
    res.status(200).json(products);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * API endpoint to process a transaction and update inventory.
 */
app.post("/api/transactions", async (req, res) => {
  const { product_id, quantity } = req.body;
  if (quantity < 0) {
    return res
      .status(400)
      .json({ error: "Quantity must be a positive number." });
  }

  try {
    const row = await db.get(
      "SELECT price, inventory FROM products WHERE id = ?",
      [product_id]
    );
    if (!row) {
      return res.status(404).json({ error: "Product not found" });
    }
    if (row.inventory < quantity) {
      return res.status(400).json({ error: "Insufficient inventory" });
    }

    const total = row.price * quantity;
    const newInventory = row.inventory - quantity;

    // Update the product inventory in the database
    await db.run("UPDATE products SET inventory = ? WHERE id = ?", [
      newInventory,
      product_id,
    ]);

    // Insert the transaction into the database
    const result = await db.run(
      "INSERT INTO transactions (product_id, quantity, total) VALUES (?, ?, ?)",
      [product_id, quantity, total]
    );
    // Respond with the transaction ID and total amount
    res.json({ transaction_id: result.lastID, total });
  } catch (err) {
    // Log and respond with an error if there are any issues during the process
    console.error("Error processing transaction:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
export { app, db };
