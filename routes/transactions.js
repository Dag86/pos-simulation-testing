import express from "express";
import Joi from "joi";
import { db } from "../app.js"; // Import the database instance

const router = express.Router();

// Joi validation schema for transaction creation
const transactionSchema = Joi.object({
  product_id: Joi.number().integer().required(),
  quantity: Joi.number().integer().min(1).required(),
});

// Validation middleware for transactions
function validateTransaction(req, res, next) {
  const { error } = transactionSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
}

// Route to process a transaction and update inventory
router.post("/", validateTransaction, async (req, res, next) => {
  const { product_id, quantity } = req.body;
  try {
    const product = await db.get(
      "SELECT price, inventory FROM products WHERE id = ?",
      [product_id]
    );

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (product.inventory < quantity) {
      return res.status(400).json({ error: "Insufficient inventory" });
    }

    const total = product.price * quantity;
    const newInventory = product.inventory - quantity;

    await db.run("UPDATE products SET inventory = ? WHERE id = ?", [
      newInventory,
      product_id,
    ]);

    const result = await db.run(
      "INSERT INTO transactions (product_id, quantity, total) VALUES (?, ?, ?)",
      [product_id, quantity, total]
    );

    res.status(200).json({ transaction_id: result.lastID, total });
  } catch (err) {
    next(err);
  }
});

// Route to get a transaction by ID
router.get("/:id", async (req, res, next) => {
  const { id } = req.params;
  try {
    const transaction = await db.get(
      "SELECT * FROM transactions WHERE id = ?",
      [id]
    );
    if (transaction) {
      res.status(200).json(transaction);
    } else {
      res.status(404).json({ error: "Transaction not found" });
    }
  } catch (err) {
    next(err);
  }
});

// Route to delete a transaction by ID
router.delete("/:id", async (req, res, next) => {
  const { id } = req.params;
  try {
    const result = await db.run("DELETE FROM transactions WHERE id = ?", id);
    if (result.changes > 0) {
      res.status(200).json({ message: "Transaction deleted successfully" });
    } else {
      res.status(404).json({ error: "Transaction not found" });
    }
  } catch (err) {
    next(err);
  }
});

export default router;
