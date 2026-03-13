const getDBConnection = require('../config/db');
const argon2 = require('argon2'); 

exports.loginUser = async (event) => {
    const db = await getDBConnection();
    const body = JSON.parse(event.body);

    const username = body.username;
    const password = body.password;

    // Fetch user by username
    const [rows] = await db.execute(
        `SELECT * FROM users WHERE usrName = ? or usrEmail = ?`,
        [username, username]
    );

    if (rows.length === 0) {
        return {
            statusCode: 401,
            body: JSON.stringify({ message: "Invalid username or password" })
        };
    }

    const user = rows[0];

    try {
        // Verify password with Argon2
        const isPasswordValid = await argon2.verify(user.password, password);

        if (!isPasswordValid) {
            return {
                statusCode: 401,
                body: JSON.stringify({ message: "Invalid username or password" })
            };
        }

        // Successful login
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Login successful",
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                    // omit password from response!
                }
            })
        };
    } catch (err) {
        console.error("Password verification failed", err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal server error" })
        };
    }
};