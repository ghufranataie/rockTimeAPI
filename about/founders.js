const getDBConnection = require('../config/db');

exports.getFounders = async (event) => {
    try {
        const db = await getDBConnection();
        const [rows] = await db.execute("SELECT * FROM founders");
        return {
            statusCode: 200,
            body: JSON.stringify(rows)
        };
    } catch (error) {
        console.error("DB Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Database error" })
        };
    }
}