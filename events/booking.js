const Stripe = require("stripe");
const getStripeSecrets = require("../config/stripeSecret");
const getDBConnection = require("../config/db");


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

/* -------------------------------
   Stripe Initialization (cached)
--------------------------------*/
let stripe; // reuse across Lambda cold starts

const getStripeInstance = async () => {
    if (!stripe) {
        const secrets = await getStripeSecrets();
        stripe = new Stripe(secrets.STRIPE_SECRET_KEY);
    }
    return stripe;
};

/* -------------------------------
   Main Booking Function
--------------------------------*/
exports.payBooking = async (event) => {

    if (event?.httpMethod === "OPTIONS") {
        return response(200, {});
    }
    let db;

    try {
        const body = parseJsonBody(event?.body);

        if (!body) {
            return response(400, { message: "Invalid JSON body" });
        }

        const { bookings, bokIndividual: individual, bokMethod: method } = body;

        if (!Array.isArray(bookings) || bookings.length === 0) {
            return response(400, { message: "Bookings array required" });
        }

        if (!individual) {
            return response(400, { message: "Individual ID required" });
        }

        const db = await getDBConnection();
        await db.beginTransaction();

        let totalAmount = 0;
        let bookingData = [];


        for (const item of bookings){
            const {shwID, seatNumber} = item;
            if (!shwID || !Array.isArray(seatNumber) || seatNumber.length === 0) {
                await db.rollback();
                return response(400, { message: "Each booking must have show ID and seat numbers" });
            }

            // Get latest ticket for this show
            const [ticketResult] = await db.execute(
                `SELECT shtID, shtPrice
                 FROM showTickets
                 WHERE shtShowID = ?
                 ORDER BY shtID DESC
                 LIMIT 1`,
                [shwID]
            );
            if (!ticketResult.length) {
                await db.rollback();
                return response(404, { message: `Ticket not found for show ${shwID}` });
            }

            const ticketID = ticketResult[0].shtID;
            const ticketPrice = ticketResult[0].shtPrice;

            for (const seat of seatNumber){
                const [seatCheck] = await db.execute(
                    `SELECT bokID 
                     FROM bookings
                     WHERE bokTicket = ? 
                       AND bokSeatNumber = ? 
                       AND bokStatus = 'Booked'`,
                    [ticketID, seat]
                );

                if (seatCheck.length > 0) {
                    await db.rollback();
                    return response(400, { message: `Seat ${seat} for show ${shwID} already booked` });
                }

                bookingData.push({
                    ticketID,
                    seat,
                    price: ticketPrice,
                    shwID
                });

                totalAmount += ticketPrice;
            }
        }

        const stripe = await getStripeInstance();

        const paymentIntent = await stripe.paymentIntents.create({
            amount: totalAmount * 100, // Stripe uses cents
            currency: "cad",
            payment_method_types: ["card"],
            metadata: {
                individual,
                bookings: JSON.stringify(bookingData.map(b => ({ showID: b.shwID, seat: b.seat })))
            }
        });

        const bokStatus = "Pending";
        const entryTime = new Date();

        const values = bookingData.map(item => [
            item.ticketID,
            item.seat,
            individual,
            bokStatus,
            method || "card",
            paymentIntent.id,
            entryTime
        ]);

        // Batch insert
        await db.query(
            `INSERT INTO bookings (bokTicket, bokSeatNumber, bokIndividual, bokStatus, bokPayMethod, bokPayRef, bokEntryTime) VALUES ?`,
            [values]
        );

        // for (const item of bookingData) {
        //     await db.execute(
        //         `INSERT INTO bookings
        //         (bokTicket, bokSeatNumber, bokIndividual, bokStatus, bokPayMethod, bokPayRef, bokEntryTime)
        //         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        //         [
        //             item.ticketID,
        //             item.seat,
        //             individual,
        //             bokStatus,
        //             method || "card",
        //             paymentIntent.id,
        //             entryTime
        //         ]
        //     );
        // }

        await db.commit();
        await db.end();

        return response(200, {
            message: "Payment intent created",
            clientSecret: paymentIntent.client_secret
        });
    } catch (err) {
        if (db) {
            console.error("Booking failed:", err);
            await db.rollback();
        }

        return response(500, {
            message: "Internal server error",
            error: err.message
        });
    }
};