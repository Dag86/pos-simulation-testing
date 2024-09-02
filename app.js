const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Initialize SQLite DB in-memory (change ':memory:' to 'pos.db' for file-based persistence)
const db = new sqlite3.Database("pos.db"); // Use 'pos.db' to persist the database across server restarts

// Create tables
db.serialize(() => {
  // Create products table
  db.run(
    "CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, price REAL, inventory INTEGER)"
  );

  // Create transactions table
  db.run(
    "CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER, quantity INTEGER, total REAL)"
  );
});

// API to add a new product
app.post("/api/products", (req, res) => {
  const { name, price, inventory } = req.body;

  // Ensure valid input for price and inventory
  if (price < 0 || inventory < 0) {
    return res
      .status(400)
      .json({ error: "Price and inventory must be non-negative numbers." });
  }
  db.run(
    "INSERT INTO products (name, price, inventory) VALUES (?, ?, ?)",
    [name, price, inventory],
    function (err) {
      if (err) {
        console.error("Error adding new product:", err);
        return res.status(400).json({ error: err.message });
      }
      res.json({ id: this.lastID });
    }
  );
});

// API to handle a transaction
app.post("/api/transactions", (req, res) => {
  const { product_id, quantity } = req.body;
  if (quantity < 0) {
    return res
      .status(400)
      .json({ error: "Quantity must be a positive number." });
  }

  db.get(
    "SELECT price, inventory FROM products WHERE id = ?",
    [product_id],
    (err, row) => {
      if (err) {
        console.error("Error retrieving product:", err);
        return res.status(400).json({ error: err.message });
      }
      if (!row) {
        return res.status(404).json({ error: "Product not found" });
      }
      if (row.inventory < quantity) {
        return res.status(400).json({ error: "Insufficient inventory" });
      }

      const total = row.price * quantity;
      const newInventory = row.inventory - quantity;

      // Update the inventory
      db.run(
        "UPDATE products SET inventory = ? WHERE id = ?",
        [newInventory, product_id],
        function (err) {
          if (err) {
            console.error("Error updating inventory:", err);
            return res.status(400).json({ error: err.message });
          }

          // Insert transaction into the database
          db.run(
            "INSERT INTO transactions (product_id, quantity, total) VALUES (?, ?, ?)",
            [product_id, quantity, total],
            function (err) {
              if (err) {
                console.error("Error inserting transaction:", err);
                return res.status(400).json({ error: err.message });
              }
              res.json({ transaction_id: this.lastID, total });
            }
          );
        }
      );
    }
  );
});
// Start the server
app.listen(5500, () => {
  console.log("POS system running on http://localhost:5500");
});
