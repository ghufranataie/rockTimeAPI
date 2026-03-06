const getDBConnection = require('../config/db');
const argon2 = require('argon2');

exports.createUser = async (event) => {
    const db = await getDBConnection();
    const body = JSON.parse(event.body);

    const [result] = await db.execute(
        "INSERT INTO users (usrName, usrPass, usrOwner, usrRole, usrBranch, usrEmail, usrToken, usrFCP, usrStatus, usrEntryDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [body.usrName, await argon2.hash(body.usrPass), body.usrOwner, body.usrRole, body.usrBranch, body.usrEmail, body.usrToken, body.usrFCP, body.usrStatus, new Date()]
    );

    return {
        statusCode: 201,
        body: { id: result.insertId }
    };
};

exports.getUsers = async () => {
    const db = await getDBConnection();

    const [rows] = await db.execute(`
        SELECT usrID, concat(perName, ' ', perLastName) as usrFullName, perPhoto, usrName, usrRole, usrStatus, usrBranch, usrEmail, perPhone, usrToken, usrFCP, usrEntryDate from users 
        join personal on personal.perID = users.usrOwner where usrRole != 'super'`);

    return {
        statusCode: 200,
        body: rows
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