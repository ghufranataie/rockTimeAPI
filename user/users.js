const getDBConnection = require('../config/db');
const argon2 = require('argon2');

const corsHeaders = {
    "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,GET,POST"
};

const response = (statusCode, body) => ({
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body)
});

const parseJsonBody = (rawBody) => {
    if (!rawBody) return {};
    try {
        return JSON.parse(rawBody);
    } catch {
        return null;
    }
};

const isValidEmail = (email = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const generateRandomUsername = (length = 8) => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let username = '';
    for (let i = 0; i < length; i += 1) {
        username += chars[Math.floor(Math.random() * chars.length)];
    }
    return username;
};

exports.getUsers = async (event) => {
    if (event?.httpMethod === "OPTIONS") {
        return response(200, {});
    }

    try {
        const db = await getDBConnection();
        const [rows] = await db.execute(
            `SELECT usrID, usrName, usrFullName, usrEmail, usrPhone, usrStatus
             FROM users
             ORDER BY usrID DESC`
        );

        return response(200, rows);
    } catch (err) {
        console.error("Get users failed", err);
        return response(500, { message: "Internal server error" });
    }
};

exports.createUser = async (event) => {
    if (event?.httpMethod === "OPTIONS") {
        return response(200, {});
    }

    try {
        const body = parseJsonBody(event?.body);
        if (!body) {
            return response(400, { message: "Invalid JSON body" });
        }

        const db = await getDBConnection();
        const fullName = (body.fullName || body.usrFullName || "").trim();
        const email = (body.email || body.usrEmail || "").trim().toLowerCase();
        const password = body.password || body.usrPassword || "";
        const phone = (body.phone || body.usrPhone || "").trim();

        if (!fullName || !email || !password) {
            return response(400, { message: "Full name, email and password are required" });
        }

        if (!isValidEmail(email)) {
            return response(400, { message: "Invalid email format" });
        }

        if (password.length < 6) {
            return response(400, { message: "Password must be at least 6 characters" });
        }

        const [existingEmail] = await db.execute(
            `SELECT usrID FROM users WHERE usrEmail = ? LIMIT 1`,
            [email]
        );

        if (existingEmail.length > 0) {
            return response(409, { message: "Email already exists" });
        }

        let username = (body.username || body.usrName || "").trim();
        if (!username) {
            username = generateRandomUsername();
        }

        for (let i = 0; i < 5; i += 1) {
            const [existingUsername] = await db.execute(
                `SELECT usrID FROM users WHERE usrName = ? LIMIT 1`,
                [username]
            );

            if (existingUsername.length === 0) break;
            username = generateRandomUsername();
        }

        const hashedPassword = await argon2.hash(password, { type: argon2.argon2id });
        const [result] = await db.execute(
            `INSERT INTO users (usrName, usrPassword, usrFullName, usrEmail, usrPhone)
             VALUES (?, ?, ?, ?, ?)`,
            [username, hashedPassword, fullName, email, phone || null]
        );

        return response(201, {
            message: "User created successfully",
            user: {
                id: result.insertId,
                username,
                fullName,
                email,
                phone: phone || null
            }
        });
    } catch (err) {
        console.error("Create user failed", err);
        return response(500, { message: "Internal server error" });
    }
};