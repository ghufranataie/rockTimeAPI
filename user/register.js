const getDBConnection = require('../config/db');
const argon2 = require('argon2');

const corsHeaders = {
    "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,POST"
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

const isValidEmail = (email = "") =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);


// Generates a username with 8 character
function generateRandomUsername(length = 8) {
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let username = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        username += characters[randomIndex];
    }
    return username;
}

// Create user using fullname, email and password
exports.registerUser = async (event) => {
    if (event?.httpMethod === "OPTIONS") {
        return response(200, {});
    }

    try {
        const body = parseJsonBody(event?.body);
        if (!body) {
            return response(400, { message: "Invalid JSON body" });
        }

        const db = await getDBConnection();

        const fullName = (body.fullName || body.fullname || "").trim();
        const email = (body.email || body.usrEmail || "").trim().toLowerCase();
        const password = body.password || body.usrPass || "";

        if (!fullName || !email || !password) {
            return response(400, { message: "Full name, email and password are required" });
        }

        if (!isValidEmail(email)) {
            return response(400, { message: "Invalid email format" });
        }

        if (password.length < 6) {
            return response(400, { message: "Password must be at least 6 characters" });
        }

        // Check if Exist user
        const [rows] = await db.execute(
            `SELECT * FROM users WHERE usrEmail = ?`,
            [email]
        );

        const hashedPassword = await argon2.hash(password, { type: argon2.argon2id });

        if (rows.length > 0) {
            const existing = rows[0];
            // If the account exists but has no password (created via Stripe guest checkout)
            // allow them to claim the account by setting the password.
            if (!existing.usrPassword && !existing.usrPass) {
                await db.execute(
                    "UPDATE users SET usrPassword = ?, usrFullName = ? WHERE usrID = ?",
                    [hashedPassword, fullName, existing.usrID]
                );
                return response(201, {
                    message: "Account claimed and registration successful",
                    user: {
                        id: existing.usrID,
                        fullName,
                        username: existing.usrName,
                        email: email
                    }
                });
            } else {
                return response(409, { message: "Email already exists" });
            }
        }

        // Generate unique username
        let username = generateRandomUsername();
        for (let i = 0; i < 5; i++) {
            const [existingUsername] = await db.execute(
                `SELECT usrName FROM users WHERE usrName = ?`,
                [username]
            );

            if (existingUsername.length === 0) {
                break;
            }

            username = generateRandomUsername();
        }

        const [result] = await db.execute(
            "INSERT INTO users (usrName, usrPassword, usrFullName, usrEmail) VALUES (?, ?, ?, ?)",
            [username, hashedPassword, fullName, email]
        );
    
        return response(201, {
                message: "Registration successful",
                user: {
                    id: result.insertId,
                    fullName,
                    username: username,
                    email: email
                }
             });
    } catch (err) {
        console.error("Registration failed", err);
        return response(500, { message: "Internal server error" });
    }
};