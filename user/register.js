const getDBConnection = require('../config/db');
const argon2 = require('argon2');


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
    const db = await getDBConnection();
    

    try {
        const body = JSON.parse(event.body);
        const { fullname, email, password } = body;
        const username = generateRandomUsername();

        // Check if Exist user
        const [rows] = await db.execute(
            `SELECT * FROM users WHERE usrEmail = ?`,
            [email]
        );

        if (rows.length > 0) {
            return {
                statusCode: 409, // Conflict
                body: JSON.stringify({ message: "Email Already Exist", genUser: username })
            };
        }
        const hashedPassword = await argon2.hash(password);
        
        const [result] = await db.execute(
            "INSERT INTO users (usrName, usrPass, usrFullName, usrEmail) VALUES (?, ?, ?, ?)",
            [username, hashedPassword, fullname, email]
        );
    
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "success",
                user: {
                    fullname: fullname,
                    username: username,
                    email: email
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
