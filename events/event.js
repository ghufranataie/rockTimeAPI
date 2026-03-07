const getDBConnection = require('../config/db');

exports.getEvents = async () => {
    try {
        const db = await getDBConnection();
        const [shows] = await db.execute(`select shwID, shwTitle, shwArtist, shwOrganizer, orgCompanyName, shwCategory, shwDate, shwTime, shwLocation, shwCity, shwImage, shwDetails,
            case
                when s.shwDate < curdate() then 'Passed'
                when SUM(CASE WHEN bokStatus = 'Booked' THEN 1 ELSE 0 END) < SUM(st.shtTotalTickets) then 'Availalbe'
            else 'Housefull' end AS availability
        from shows s
        join organizers o on o.orgID = s.shwOrganizer
        left join showTickets st on st.shtShowID = s.shwID
        left join bookings bk on bk.bokTicket = st.shtID
        group by shwID order by shwID DESC`);

        // Step 2: Fetch tickets and bookings for each show
        for (let show of shows) {
            // Fetch tickets for the show
            const [tickets] = await db.execute(
                `SELECT shtID, shtType, shtTotalTickets, shtPrice FROM showTickets WHERE shtShowID = ?`,
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