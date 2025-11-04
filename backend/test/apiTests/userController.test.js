import request from "supertest";
import mongoose from "mongoose";
import app from "../../server.js";
import connectToDB from "../../src/config/mongoDBConnection.js";
import User from "../../src/models/userSchema.js";

beforeAll(async () => {
    process.env.NODE_ENV = "test";
    await connectToDB();
    await mongoose.connection.dropDatabase();
    await mongoose.connection.asPromise();

});

afterAll(async () => {
    await mongoose.connection.close();
});

// Testing the User APIs 
describe("User API", () => {
    let testUser;

    beforeEach(async () => {
        await User.deleteMany({});

        testUser = await User.create({
            name: "Tester",
            email: "tester@example.com",
            password: "hashedPassword123",
        });
    })

    // Testing successful post request
    test("POST /api/user returns 201 status", async () => {
        const res = await request(app).post("/api/user")
            .send({
                name: "Test",
                email: "testEmail@gmail.com",
                password: "WhatIsMyPassword"
            })
        expect(res.statusCode).toBe(201);
    })

    test("POST /api/user returns 400 (invalid email)", async () => {
        const res = await request(app).post("/api/user")
            .send({
                name: "Test",
                email: "NotARealEmailgmail.com",
                password: "WhatIsMyPassword"
            })
        expect(res.statusCode).toBe(400);
    })

    test("POST /api/user returns 400 (Invalid password)", async () => {
        const res = await request(app).post("/api/user")
            .send({
                name: "Test",
                email: "testEmail@gmail.com",
                password: "fake"
            })
        expect(res.statusCode).toBe(400);
    })

    test("POST /api/user returns 400 (No name)", async () => {
        const res = await request(app).post("/api/user")
            .send({
                email: "testEmail@gmail.com",
                password: "fake"
            })
        expect(res.statusCode).toBe(400);
    })

    test("POST /api/user returns 400 (No email)", async () => {
        const res = await request(app).post("/api/user")
            .send({
                name: "test",
                password: "fake"
            })
        expect(res.statusCode).toBe(400);
    })

    test("POST /api/user returns 400 (No password)", async () => {
        const res = await request(app).post("/api/user")
            .send({
                name: "test",
                email: "testEmail@gmail.com",
            })
        expect(res.statusCode).toBe(400);
    })

    test("GET /api/user/:id returns 200 status (success)", async () => {
        const res = await request(app).get(`/api/user/${testUser._id}`);
        expect(res.statusCode).toBe(200);
    })

    test("GET /api/user/:id returns 400 status (invalid id)", async () => {
        const res = await request(app).get(`/api/user/fakeIdlalala`);
        expect(res.statusCode).toBe(400);
    })

    test("GET /api/user/:id returns 404 status (Id valid, but user not found)", async () => {
        const res = await request(app).get(`/api/user/68febf955e6a41add2c48460`);
        expect(res.statusCode).toBe(404);
    })

    test("Delete /api/user/:id returns 200 status (success)", async () => {
        const res = await request(app).delete(`/api/user/${testUser._id}`);
        expect(res.statusCode).toBe(200);
    })

    test("Delete /api/user/:id returns 404 status (Valid Id, but user DNE)", async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app).delete(`/api/user/${fakeId}`);
        expect(res.statusCode).toBe(404);
    })

    test("Delete /api/user/:id returns 400 status (Invalid Id)", async () => {
        const res = await request(app).delete(`/api/user/fakeId`);
        expect(res.statusCode).toBe(400);
    })
});