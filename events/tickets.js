const getDBConnection = require('../config/db');

const corsHeaders = {
    "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
};

const response = (statusCode, body) => ({
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body)
});

// Get Single User Tickets By User ID
exports.getSingleUserTickets = async (event) => {
    if (event?.httpMethod === "OPTIONS") {
        return response(200, {});
    }

    try {
        const id = event.queryStringParameters?.usrID;
        if (!id) {
            return response(400, { message: "User ID is required" });
        }

        const db = await getDBConnection();

        const [ticketResult] = await db.execute(
            `select
                shwID as showID,
                shwTitle as showTitle,
                bokID as bookingID,
                u.usrFullName as bookingBy,
                bokSeatNumber as seatNo,
                bokPayMethod as payMethod,
                shwTicketPrice as price,
                bokPayRef as payRef,
                bokStatus as bookingStatus
            from bookings b
            join users u on u.usrID = b.bokIndividual
            join shows s on s.shwID = b.bokShow
            where u.usrID = ?`,
            [id]
        )

        // Successful Load
        return response(200, {
                message: "Tickets of single user",
                body: ticketResult
            });
    } catch (err) {
        console.error("Load failed", err);
        return response(500, { message: "Internal server error" });
    }
};

// Get Single Show Tickets By Show ID
exports.getSingleShowTickets = async (event) => {
    if (event?.httpMethod === "OPTIONS") {
        return response(200, {});
    }

    try {
        const id = event.queryStringParameters?.shwID;
        if (!id) {
            return response(400, { message: "Event ID is required" });
        }

        const db = await getDBConnection();

        const [ticketResult] = await db.execute(
            `select
                shwID as showID,
                shwTitle as showTitle,
                bokID as bookingID,
                u.usrFullName as bookingBy,
                bokSeatNumber as seatNo,
                bokPayMethod as payMethod,
                shwTotalTickets as price,
                bokPayRef as payRef,
                bokStatus as bookingStatus
            from bookings b
            join users u on u.usrID = b.bokIndividual
            join shows s on s.shwID = b.bokShow
            where s.shwID = ?`,
            [id]
        )

        // Successful Load
        return response(200, {
                message: "Tickets of single show",
                body: ticketResult
            });
    } catch (err) {
        console.error("Load failed", err);
        return response(500, { message: "Internal server error" });
    }
};

// Get All Recent Tickets
exports.getRecentTicketBooking = async (event) => {
    if (event?.httpMethod === "OPTIONS") {
        return response(200, {});
    }

    try {
        const db = await getDBConnection();

        const [ticketResult] = await db.execute(
            `select
                shwID as showID,
                shwTitle as showTitle,
                bokID as bookingID,
                u.usrFullName as bookingBy,
                bokSeatNumber as seatNo,
                bokPayMethod as payMethod,
                shwTotalTickets as price,
                bokPayRef as payRef,
                bokStatus as bookingStatus
            from bookings b
            join users u on u.usrID = b.bokIndividual
            join shows s on s.shwID = b.bokShow
            order by bokID DESC`
        )

        // Successful Load
        return response(200, {
                message: "All Recent Tickets",
                body: ticketResult
            });
    } catch (err) {
        console.error("Load failed", err);
        return response(500, { message: "Internal server error" });
    }
};