// /routes/products.js
import express from "express";
import Joi from "joi";
import { db } from "../app.js"; // Assuming db is exported from app.js

const router = express.Router();

// Joi validation schema for product creation and updates
const productSchema = Joi.object({
  name: Joi.string().required(),
  price: Joi.number().min(0).required(),
  inventory: Joi.number().min(0).required(),
});

// Validation middleware for products
function validateProduct(req, res, next) {
  const { error } = productSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
}

// Middleware to check if a product exists
async function checkProductExists(req, res, next) {
  const { id } = req.params;
  try {
    const product = await db.get("SELECT * FROM products WHERE id = ?", [id]);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    req.product = product; // Store product in the request object
    next();
  } catch (err) {
    next(err);
  }
}

// Route to add a new product
router.post("/", validateProduct, async (req, res, next) => {
  const { name, price, inventory } = req.body;
  try {
    const result = await db.run(
      "INSERT INTO products (name, price, inventory) VALUES (?, ?, ?)",
      [name, price, inventory]
    );
    res.status(201).json({ id: result.lastID });
  } catch (err) {
    next(err);
  }
});

// Route to update a product's details
router.put("/:id", validateProduct, checkProductExists, async (req, res, next) => {
  const { name, price, inventory } = req.body;
  const { id } = req.params;
  try {
    await db.run(
      "UPDATE products SET name = ?, price = ?, inventory = ? WHERE id = ?",
      [name, price, inventory, id]
    );
    res.json({ message: "Product updated successfully" });
  } catch (err) {
    next(err);
  }
});

// Route to get a specific product by ID
router.get("/:id", checkProductExists, (req, res) => {
  res.status(200).json(req.product);
});

// Route to get all products
router.get("/", async (req, res, next) => {
  try {
    const products = await db.all("SELECT * FROM products");
    res.status(200).json(products);
  } catch (err) {
    next(err);
  }
});

// Route to delete a product by ID
router.delete("/:id", checkProductExists, async (req, res, next) => {
  const { id } = req.params;
  try {
    await db.run("DELETE FROM products WHERE id = ?", id);
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (err) {
    next(err);
  }
});

export default router;
