const getDBConnection = require('../config/db');

exports.getFounders = async () => {
    try {
        const db = await getDBConnection();
        const [rows] = await db.execute("SELECT * FROM founders");

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Methods": "OPTIONS,GET"
            },
            body: JSON.stringify(rows)
        };

    } catch (error) {
        console.error("DATABASE ERROR:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Database error",
                error: error.message
            })
        };
    }
};