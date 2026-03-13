const getDBConnection = require('../config/db');
const argon2 = require('argon2');

exports.createUser = async (event) => {
    const db = await getDBConnection();
    const body = JSON.parse(event.body);

    if (!body.usrEmail || !body.usrPass) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Email and password are required" })
        };
    }

    const [existing] = await db.execute(
        "SELECT usrEmail FROM users WHERE usrEmail = ?",
        [body.usrEmail]
    );

    if (existing.length > 0) {
        return {
            statusCode: 409,
            body: JSON.stringify({ message: "Email already exists" })
        };
    }

    const hashedPassword = await argon2.hash(body.usrPass);

    const [result] = await db.execute(
        "INSERT INTO users (usrPass, usrFullName, usrEmail) VALUES (?, ?, ?)",
        [hashedPassword, body.usrFullName, body.usrEmail]
    );

    return {
        statusCode: 200,
        body: JSON.stringify({ message: "success" })
    };
};

exports.getUsers = async () => {
    const db = await getDBConnection();

    const [rows] = await db.execute(`SELECT * from users`);

    return {
        statusCode: 200,
        body: JSON.stringify(rows)
    };
};

exports.updateUser = async (event) => {
    const db = await getDBConnection();
    const body = JSON.parse(event.body);
    const id = event.pathParameters.id;

    await db.execute(
        "UPDATE users SET name=?, email=? WHERE id=?",
        [body.name, body.email, id]
    );

    return {
        statusCode: 200,
        body: JSON.stringify({ message: "Updated" })
    };
};

exports.deleteUser = async (event) => {
    const db = await getDBConnection();
    const id = event.pathParameters.id;

    await db.execute(
        "DELETE FROM users WHERE id=?",
        [id]
    );

    return {
        statusCode: 200,
        body: JSON.stringify({ message: "Deleted" })
    };
};