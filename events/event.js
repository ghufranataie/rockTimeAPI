const getDBConnection = require('../config/db');

exports.getEvents = async () => {
    try {
        const db = await getDBConnection();
        const [shows] = await db.execute(`select shwID, shwTitle, shwArtist, shwCategory, shwDate, shwTime, shwLocation, shwCity, shwImage, shwDetails,
            case
                when s.shwDate < curdate() then 'Passed'
                when SUM(CASE WHEN bokStatus = 'Booked' THEN 1 ELSE 0 END) < SUM(st.shtTotalTickets) then 'Available'
            else 'Housefull' end AS availability
        from shows s
        left join showTickets st on st.shtShowID = s.shwID
        left join bookings bk on bk.bokTicket = st.shtID
        group by shwID order by shwID DESC`);

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

    let db;

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

        db = await getDBConnection();

        await db.beginTransaction();
        
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

        await db.commit();
    
        return response(201, {
            message: "Show created successfully",
            showID: shwID
        });
    } catch (err) {
        if (db) {
            await db.rollback(); // rollback if any error happens
        }
        console.error("Registration failed", err);
        return response(500, { message: "Internal server error" });
    }
};