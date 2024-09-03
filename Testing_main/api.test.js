import { expect } from 'chai';
import request from 'supertest';
import { app } from '../app.js';  // Adjust the import path according to your project structure

describe('GET /api/products', () => {
    it('should fetch all products', async () => {
        const response = await request(app).get('/api/products');
        expect(response.statusCode).to.equal(200);
        expect(response.body).to.be.an('array');  // Adjust according to the expected response
    });
});