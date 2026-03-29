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

// -------------------------------
// Stripe Initialization (cached)
// -------------------------------
let stripe;
const getStripeInstance = async () => {
    if (!stripe) {
        const secrets = await getStripeSecrets();
        stripe = new Stripe(secrets.STRIPE_SECRET_KEY);
    }
    return stripe;
};

// -------------------------------
// Main Booking Function
// -------------------------------
exports.payBooking = async (event) => {
    if (event?.httpMethod === "OPTIONS") return response(200, {});

    let db;

    try {
        const body = parseJsonBody(event?.body);
        if (!body) return response(400, { message: "Invalid JSON body" });

        const { items, userID: userID, successUrl: successUrl, cancelUrl: cancelUrl} = body;
        if (!Array.isArray(items) || items.length === 0)
            return response(400, { message: "Bookings array required" });
        if (!userID) return response(400, { message: "userID required" });

        // db = await getDBConnection();

        // // -------------------------------
        // // Step 1: Fetch latest tickets for all shows at once
        // // -------------------------------
        // const showIDs = bookings.map(b => b.shwID);
        // const placeholders = showIDs.map(() => "?").join(",");
        // const [ticketResults] = await db.execute(
        //     `SELECT shtShowID, shtID, shtPrice 
        //      FROM showTickets 
        //      WHERE shtShowID IN (${placeholders}) 
        //      ORDER BY shtShowID, shtID DESC`,
        //     showIDs
        // );

        // const ticketMap = {};
        // ticketResults.forEach(t => {
        //     if (!ticketMap[t.shtShowID]) ticketMap[t.shtShowID] = t;
        // });

        // -------------------------------
        // Step 2: Prepare booking data & total amount
        // -------------------------------
        // const bookingData = [];
        // let totalAmount = 0;

        // for (const b of bookings) {
        //     const ticket = ticketMap[b.shwID];
        //     if (!ticket) throw new Error(`Ticket not found for show ${b.shwID}`);

        //     if (!Array.isArray(b.seatNumber) || b.seatNumber.length === 0)
        //         throw new Error(`Show ${b.shwID} must have seat numbers`);

        //     b.seatNumber.forEach(seat => {
        //         bookingData.push({
        //             ticketID: ticket.shtID,
        //             seat,
        //             price: ticket.shtPrice,
        //             shwID: b.shwID
        //         });
        //         totalAmount += ticket.shtPrice;
        //     });
        // }

        // // // -------------------------------
        // // // Step 3: Check booked seats in one query
        // // // -------------------------------
        // // if (bookingData.length > 0) {
        // //     const seatConditions = bookingData.map(() => "(bokTicket = ? AND bokSeatNumber = ? AND bokStatus = 'Booked')").join(" OR ");
        // //     const seatParams = bookingData.flatMap(b => [b.ticketID, b.seat]);
        // //     const [existingSeats] = await db.execute(
        // //         `SELECT bokTicket, bokSeatNumber FROM bookings WHERE ${seatConditions}`,
        // //         seatParams
        // //     );
        // //     if (existingSeats.length > 0) {
        // //         await db.end();
        // //         return response(400, { message: "Some seats are already booked", seats: existingSeats });
        // //     }
        // // }

        // // -------------------------------
        // // Step 4: Create Stripe PaymentIntent
        // // -------------------------------
        // const stripeInstance = await getStripeInstance();
        // const paymentIntent = await stripeInstance.paymentIntents.create({
        //     amount: totalAmount * 100, // in cents
        //     currency: "cad",
        //     payment_method_types: ["card"],
        //     metadata: {
        //         individual,
        //         bookings: JSON.stringify(bookingData.map(b => ({ showID: b.shwID, seat: b.seat })))
        //     }
        // });

        // // -------------------------------
        // // Step 5: Batch insert bookings
        // // -------------------------------
        // if (bookingData.length > 0) {
        //     const values = bookingData.map(b => [
        //         b.ticketID,
        //         b.seat,
        //         individual,
        //         "Booked",
        //         method || "Card",
        //         paymentIntent.id,
        //         new Date()
        //     ]);

        //     await db.query(
        //         `INSERT INTO bookings 
        //          (bokShow, bokSeatNumber, bokIndividual, bokStatus, bokPayMethod, bokPayRef, bokEntryTime) 
        //          VALUES ?`,
        //         [values]
        //     );
        // }

        // await db.end();

        // return response(200, {
        //     message: "Payment intent created",
        //     clientSecret: paymentIntent.client_secret
        // });

    } catch (err) {
        if (db) {
            console.error("Booking failed:", err);
            await db.end();
        }

        return response(500, {
            message: "Internal server error",
            error: err.message
        });
    }
};