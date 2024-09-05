import { expect } from "chai";
import request from "supertest";
import { app, initializeDb } from "../app.js";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

let db;
let productId;
let transactionId;

// Initialize database with in-memory storage before running tests
before(async () => {
  db = await open({
    filename: ":memory:", // Use in-memory for testing
    driver: sqlite3.Database,
  });
  await initializeDb(db); // Initialize tables in the in-memory DB
  console.log("Database initialized successfully for testing.");
});

// Test suite for Product Management
describe("Product Management", () => {
  describe("GET /api/products", () => {
    it("should get all products", async () => {
      const response = await request(app).get("/api/products");
      expect(response.statusCode).to.equal(200);
      expect(response.body).to.be.an("array");
    });
  });

  describe("POST /api/products", () => {
    it("should create a new product", async () => {
      const newProduct = { name: "Tea", price: 1.5, inventory: 50 };
      const response = await request(app)
        .post("/api/products")
        .send(newProduct);
      expect(response.statusCode).to.equal(201);
      expect(response.body).to.have.property("id");
      productId = response.body.id; // Store the product ID for later use
      console.log("Product created with ID:", productId);
    });

    it("should not create a product with invalid data", async () => {
      const invalidProduct = { name: "Invalid", price: -1, inventory: -5 };
      const response = await request(app)
        .post("/api/products")
        .send(invalidProduct);
      expect(response.statusCode).to.equal(400);
      expect(response.body).to.have.property("error");
      console.log("Product creation failed due to invalid data");
    });
  });

  describe("GET /api/products/:id", () => {
    it("should retrieve a product by ID", async () => {
      const response = await request(app).get(`/api/products/${productId}`);
      expect(response.statusCode).to.equal(200);
      expect(response.body).to.have.property("id", productId);
      console.log("Retrieved product with ID:", productId);
    });

    it("should return a 404 if the product does not exist", async () => {
      const response = await request(app).get("/api/products/9999");
      expect(response.statusCode).to.equal(404);
      expect(response.body).to.have.property("error", "Product not found");
      console.log("Product not found for non-existent ID");
    });
  });

  describe("PUT /api/products/:id", () => {
    it("should update product details", async () => {
      const updatedProduct = {
        name: "Updated Product",
        price: 20,
        inventory: 150,
      };
      const response = await request(app)
        .put(`/api/products/${productId}`)
        .send(updatedProduct);
      expect(response.statusCode).to.equal(200);
      expect(response.body).to.have.property(
        "message",
        "Product updated successfully"
      );
      console.log("Updated product with ID:", productId);
    });
  });

  describe("DELETE /api/products/:id", () => {
    it("should delete a product", async () => {
      const response = await request(app).delete(`/api/products/${productId}`);
      expect(response.statusCode).to.equal(200);
      expect(response.body).to.have.property(
        "message",
        "Product deleted successfully"
      );
      console.log("Deleted product with ID:", productId);
    });
  });
});

// Test suite for Transaction Management
describe("Transaction Management", () => {
  before(async () => {
    // Create a product to use in transaction tests
    const productResponse = await request(app)
      .post("/api/products")
      .send({ name: "Test Product", price: 10, inventory: 100 });

    productId = productResponse.body.id;
    console.log("Product created for transaction testing with ID:", productId);

    // Create a transaction for further tests
    const transactionResponse = await request(app)
      .post("/api/transactions")
      .send({ product_id: productId, quantity: 5 });
    transactionId = transactionResponse.body.transaction_id;
    console.log("Transaction created with ID:", transactionId);
  });

  describe("POST /api/transactions", () => {
    it("should process a transaction and update inventory", async () => {
      const transaction = { product_id: productId, quantity: 5 };
      const response = await request(app)
        .post("/api/transactions")
        .send(transaction);
      expect(response.statusCode).to.equal(200);
      expect(response.body).to.have.property("transaction_id");
      console.log(
        "Processed transaction with ID:",
        response.body.transaction_id
      );
    });

    it("should return 400 if quantity is greater than inventory", async () => {
      const transaction = { product_id: productId, quantity: 5000 }; // Exceed inventory
      const response = await request(app)
        .post("/api/transactions")
        .send(transaction);
      expect(response.statusCode).to.equal(400);
      expect(response.body).to.have.property("error", "Insufficient inventory");
      console.log("Transaction failed due to insufficient inventory");
    });
  });

  describe("GET /api/transactions/:id", () => {
    it("should retrieve a transaction by ID", async () => {
        console.log(`Retrieving transaction with ID: ${transactionId}`);
      const response = await request(app).get(
        `/api/transactions/${transactionId}`
      );
      console.log("Response status:", response.statusCode);
      console.log("Response body:", response.body);
      expect(response.statusCode).to.equal(200);
      expect(response.body).to.have.property("id", transactionId);
      console.log("Retrieved transaction with ID:", transactionId);
    });

    it("should return 404 if the transaction does not exist", async () => {
      const response = await request(app).get("/api/transactions/9999");
      console.log(`Attempting to retrieve non-existent transaction with ID: ${response}`);
      expect(response.statusCode).to.equal(404);
      expect(response.body).to.have.property("error", "Transaction not found");
      console.log("Transaction not found for non-existent ID");
    });
  });

  describe("DELETE /api/transactions/:id", () => {
    it("should delete a transaction", async () => {
      const response = await request(app).delete(
        `/api/transactions/${transactionId}`
      );
      expect(response.statusCode).to.equal(200);
      expect(response.body).to.have.property(
        "message",
        "Transaction deleted successfully"
      );
      console.log("Deleted transaction with ID:", transactionId);
    });
  });
});

// Close the database after all tests
after(async () => {
  await db.close();
  console.log("Database connection closed.");
});
