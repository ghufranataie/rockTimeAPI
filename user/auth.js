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

// Login users using email, username or password
exports.loginUser = async (event) => {
    if (event?.httpMethod === "OPTIONS") {
        return response(200, {});
    }

    try {
        const body = parseJsonBody(event?.body);
        if (!body) {
            return response(400, { message: "Invalid JSON body" });
        }

        const db = await getDBConnection();

        const username = (body.username || body.email || "").trim();
        const password = body.password || "";

        if (!username || !password) {
            return response(400, { message: "Username and password are required" });
        }

        // Fetch user by username
        const [rows] = await db.execute(
            `SELECT * FROM users WHERE usrName = ? or usrEmail = ?`,
            [username, username]
        );

        if (rows.length === 0) {
            return response(401, { message: "Invalid username or password" });
        }

        const user = rows[0];

        // Verify password with Argon2
        const passwordHash = user.usrPassword || user.usrPass;
        if (!passwordHash) {
            return response(401, { message: "Invalid username or password" });
        }

        const isPasswordValid = await argon2.verify(passwordHash, password);

        if (!isPasswordValid) {
            return response(401, { message: "Invalid username or password" });
        }

        // Successful login
        return response(200, {
                message: "Login successful",
                user: {
                    id: user.id,
                    username: user.usrName,
                    email: user.usrEmail,
                    fullName: user.usrFullName || ""
                    // omit password from response!
                }
            });
    } catch (err) {
        console.error("Login failed", err);
        return response(500, { message: "Internal server error" });
    }
};
