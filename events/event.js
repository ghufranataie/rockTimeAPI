// --- Add these at the very top ---
const response = (statusCode, body) => ({
    statusCode,
    headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "OPTIONS,GET,POST"
    },
    body: JSON.stringify(body)
});

const parseJsonBody = (body) => {
    try {
        return JSON.parse(body);
    } catch {
        return null;
    }
};

const getDBConnection = require('../config/db');

exports.getEvents = async () => {
    try {
        const db = await getDBConnection();
        const [shows] = await db.execute(`select shwID, shwTitle, shwArtist, shwCategory, shwDate, shwTime, shwLocation, shwCity, shwImage, shwDetails,
            case
                when s.shwDate < curdate() then 'Passed'
                when SUM(CASE WHEN bokStatus = 'Booked' THEN 1 ELSE 0 END) < shwTotalTickets then 'Available'
            else 'Housefull' end AS availability
        from shows s
        left join bookings b on b.bokShow = s.shwID
        group by shwID order by shwID DESC;`);

        // Step 2: Fetch tickets and bookings for each show
        for (let show of shows) {
            // Fetch tickets for the show
            const [tickets] = await db.execute(
                `SELECT shtID, shtTotalTickets, shtPrice FROM showTickets WHERE shtShowID =?`,
                [show.shwID]
            );

            // Fetch bookings for each ticket
            for (let ticket of tickets) {
                const [bookings] = await db.execute(
                    `SELECT bokSeatNumber, bokStatus FROM bookings WHERE bokTicket = ?`,
                    [ticket.shtID]
                );
                ticket.bookings = bookings; // attach bookings to ticket
            }
            show.tickets = tickets; // attach tickets to show
        }

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Methods": "OPTIONS,GET"
            },
            body: JSON.stringify(shows)
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

exports.createEvent = async (event) => {
    if (event?.httpMethod === "OPTIONS") {
        return response(200, {});
    }

    try {
        const body = parseJsonBody(event?.body);
        if (!body) {
            return response(400, { message: "Invalid JSON body" });
        }

        const {
            shwTitle: title,
            shwArtist: artist,
            shwCategory: category,
            shwDate: date,
            shwTime: time,
            shwLocation: location,
            shwCity: city,
            shwImage: image,
            shwDetails: details,
            shwTotalTickets: totalTickets,
            shwTicketPrice: price
        } = body;

        const db = await getDBConnection();

        const [showResult] = await db.execute(
            `INSERT INTO shows (shwTitle, shwArtist, shwCategory, shwDate, shwTime, shwLocation, shwCity, shwImage, shwDetails)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, artist, category, date, time, location, city, image, details]
        );
        const shwID = showResult.insertId;

        await db.execute(
            `INSERT INTO showTickets (shtShowID, shtTotalTickets, shtPrice)
            VALUES (?, ?, ?)`,
            [shwID, totalTickets, price]
        );

        return response(201, {
            message: "Show created successfully",
            showID: shwID
        });

    } catch (err) {
        console.error("Registration failed", err);
        return response(500, {
            message: "Internal server error",
            error: err.message   // temporarily include error for debugging
        });
    }
};

// exports.createEvent = async (event) => {
//     if (event?.httpMethod === "OPTIONS") {
//         return response(200, {});
//     }

//     let db;

//     try {
//         const body = parseJsonBody(event?.body);
//         if (!body) {
//             return response(400, { message: "Invalid JSON body" });
//         }

//         const {
//             shwTitle: title,
//             shwArtist: artist,
//             shwCategory: category,
//             shwDate: date,
//             shwTime: time,
//             shwLocation: location,
//             shwCity: city,
//             shwImage: image,
//             shwDetails: details,
//             shwTotalTickets: totalTickets,
//             shwTicketPrice: price
//         } = body;

//         db = await getDBConnection();

//         await db.beginTransaction();
        
//         const [showResult] = await db.execute(
//             `INSERT INTO shows (shwTitle, shwArtist, shwCategory, shwDate, shwTime, shwLocation, shwCity, shwImage, shwDetails)
//             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//             [title, artist, category, date, time, location, city, image, details]
//         );
//         const shwID = showResult.insertId;

//         await db.execute(
//             `INSERT INTO showTickets (shtShowID, shtTotalTickets, shtPrice)
//             VALUES (?, ?, ?)`,
//             [shwID, totalTickets, price]
//         );

//         await db.commit();
    
//         return response(201, {
//             message: "Show created successfully",
//             showID: shwID
//         });
//     } catch (err) {
//         console.error("Registration failed", err);
//         await db.rollback();
//         return response(500, { message: "Internal server error" });
//     }
// };