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

    if (event?.httpMethod === "OPTIONS") return response(200, {});

    let db;

    try {
        const body = parseJsonBody(event?.body);
        if (!body) return response(400, { message: "Invalid JSON body" });

        const { bookings, bokIndividual: individual, bokMethod: method } = body;
        if (!Array.isArray(bookings) || bookings.length === 0) 
            return response(400, { message: "Bookings array required" });
        if (!individual) return response(400, { message: "Individual ID required" });

        db = await getDBConnection();
        await db.beginTransaction();

        let totalAmount = 0;
        let bookingData = [];

        // Prepare lists for batch queries
        const showIDs = bookings.map(b => b.shwID);

        // Fetch latest tickets for all shows in one query
        const [tickets] = await db.query(
            `SELECT shtShowID, shtID, shtPrice
             FROM showTickets
             WHERE shtShowID IN (?)
             AND shtID = (SELECT MAX(shtID) FROM showTickets WHERE shtShowID = showTickets.shtShowID)`,
            [showIDs]
        );

        const ticketMap = {};
        tickets.forEach(t => ticketMap[t.shtShowID] = { id: t.shtID, price: t.shtPrice });

        // Collect all seats to check
        const seatChecks = [];
        for (const b of bookings) {
            const { shwID, seatNumber } = b;
            if (!ticketMap[shwID]) {
                await db.rollback();
                return response(404, { message: `Ticket not found for show ${shwID}` });
            }

            const ticketID = ticketMap[shwID].id;
            const price = ticketMap[shwID].price;

            seatNumber.forEach(seat => {
                bookingData.push({ shwID, ticketID, seat, price });
                seatChecks.push({ ticketID, seat, shwID });
                totalAmount += price;
            });
        }

        // Batch check if seats already booked
        const seatConditions = seatChecks.map(() => "(bokTicket = ? AND bokSeatNumber = ? AND bokStatus = 'Booked')").join(" OR ");
        const seatParams = seatChecks.flatMap(s => [s.ticketID, s.seat]);
        const [alreadyBooked] = await db.query(
            `SELECT bokTicket, bokSeatNumber FROM bookings WHERE ${seatConditions}`,
            seatParams
        );

        if (alreadyBooked.length > 0) {
            await db.rollback();
            const conflictSeats = alreadyBooked.map(s => `${s.bokSeatNumber}`).join(", ");
            return response(400, { message: `Seats already booked: ${conflictSeats}` });
        }

        // Create Stripe PaymentIntent
        const stripe = await getStripeInstance();
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(totalAmount * 100), // cents
            currency: "cad",
            payment_method_types: ["card"],
            metadata: {
                individual,
                bookings: JSON.stringify(bookingData.map(b => ({ showID: b.shwID, seat: b.seat })))
            }
        });

        // Prepare batch insert
        const entryTime = new Date();
        const insertValues = bookingData.map(b => [
            b.ticketID, b.seat, individual, "Pending", method || "card", paymentIntent.id, entryTime
        ]);

        await db.query(
            `INSERT INTO bookings (bokTicket, bokSeatNumber, bokIndividual, bokStatus, bokPayMethod, bokPayRef, bokEntryTime) VALUES ?`,
            [insertValues]
        );

        await db.commit();
        await db.end();

        return response(200, {
            message: "Payment intent created",
            clientSecret: paymentIntent.client_secret
        });

    } catch (err) {
        console.error("Booking failed:", err);
        if (db) await db.rollback();
        return response(500, { message: "Internal server error", error: err.message });
    }
};
















// const Stripe = require("stripe");
// const getStripeSecrets = require("../config/stripeSecret");
// const getDBConnection = require("../config/db");


// const response = (statusCode, body) => ({
//     statusCode,
//     headers: {
//         "Access-Control-Allow-Origin": "*",
//         "Access-Control-Allow-Headers": "*",
//         "Access-Control-Allow-Methods": "OPTIONS,GET,POST"
//     },
//     body: JSON.stringify(body)
// });

// const parseJsonBody = (body) => {
//     try {
//         return JSON.parse(body);
//     } catch {
//         return null;
//     }
// };

// /* -------------------------------
//    Stripe Initialization (cached)
// --------------------------------*/
// let stripe; // reuse across Lambda cold starts

// const getStripeInstance = async () => {
//     if (!stripe) {
//         const secrets = await getStripeSecrets();
//         stripe = new Stripe(secrets.STRIPE_SECRET_KEY);
//     }
//     return stripe;
// };

// /* -------------------------------
//    Main Booking Function
// --------------------------------*/
// exports.payBooking = async (event) => {

//     if (event?.httpMethod === "OPTIONS") {
//         return response(200, {});
//     }
//     let db;

//     try {
//         const body = parseJsonBody(event?.body);

//         if (!body) {
//             return response(400, { message: "Invalid JSON body" });
//         }

//         const { bookings, bokIndividual: individual, bokMethod: method } = body;

//         if (!Array.isArray(bookings) || bookings.length === 0) {
//             return response(400, { message: "Bookings array required" });
//         }

//         if (!individual) {
//             return response(400, { message: "Individual ID required" });
//         }

//         const db = await getDBConnection();
//         await db.beginTransaction();

//         let totalAmount = 0;
//         let bookingData = [];


//         for (const item of bookings){
//             const {shwID, seatNumber} = item;
//             if (!shwID || !Array.isArray(seatNumber) || seatNumber.length === 0) {
//                 await db.rollback();
//                 return response(400, { message: "Each booking must have show ID and seat numbers" });
//             }

//             // Get latest ticket for this show
//             const [ticketResult] = await db.execute(
//                 `SELECT shtID, shtPrice
//                  FROM showTickets
//                  WHERE shtShowID = ?
//                  ORDER BY shtID DESC
//                  LIMIT 1`,
//                 [shwID]
//             );
//             if (!ticketResult.length) {
//                 await db.rollback();
//                 return response(404, { message: `Ticket not found for show ${shwID}` });
//             }

//             const ticketID = ticketResult[0].shtID;
//             const ticketPrice = ticketResult[0].shtPrice;

//             for (const seat of seatNumber){
//                 const [seatCheck] = await db.execute(
//                     `SELECT bokID 
//                      FROM bookings
//                      WHERE bokTicket = ? 
//                        AND bokSeatNumber = ? 
//                        AND bokStatus = 'Booked'`,
//                     [ticketID, seat]
//                 );

//                 if (seatCheck.length > 0) {
//                     await db.rollback();
//                     return response(400, { message: `Seat ${seat} for show ${shwID} already booked` });
//                 }

//                 bookingData.push({
//                     ticketID,
//                     seat,
//                     price: ticketPrice,
//                     shwID
//                 });

//                 totalAmount += ticketPrice;
//             }
//         }

//         const stripe = await getStripeInstance();

//         const paymentIntent = await stripe.paymentIntents.create({
//             amount: totalAmount * 100, // Stripe uses cents
//             currency: "cad",
//             payment_method_types: ["card"],
//             metadata: {
//                 individual,
//                 bookings: JSON.stringify(bookingData.map(b => ({ showID: b.shwID, seat: b.seat })))
//             }
//         });

//         const bokStatus = "Pending";
//         const entryTime = new Date();

//         const values = bookingData.map(item => [
//             item.ticketID,
//             item.seat,
//             individual,
//             bokStatus,
//             method || "card",
//             paymentIntent.id,
//             entryTime
//         ]);

//         // Batch insert
//         await db.query(
//             `INSERT INTO bookings (bokTicket, bokSeatNumber, bokIndividual, bokStatus, bokPayMethod, bokPayRef, bokEntryTime) VALUES ?`,
//             [values]
//         );

//         // for (const item of bookingData) {
//         //     await db.execute(
//         //         `INSERT INTO bookings
//         //         (bokTicket, bokSeatNumber, bokIndividual, bokStatus, bokPayMethod, bokPayRef, bokEntryTime)
//         //         VALUES (?, ?, ?, ?, ?, ?, ?)`,
//         //         [
//         //             item.ticketID,
//         //             item.seat,
//         //             individual,
//         //             bokStatus,
//         //             method || "card",
//         //             paymentIntent.id,
//         //             entryTime
//         //         ]
//         //     );
//         // }

//         await db.commit();
//         await db.end();

//         return response(200, {
//             message: "Payment intent created",
//             clientSecret: paymentIntent.client_secret
//         });
//     } catch (err) {
//         if (db) {
//             console.error("Booking failed:", err);
//             await db.rollback();
//         }

//         return response(500, {
//             message: "Internal server error",
//             error: err.message
//         });
//     }
// };



// const Stripe = require("stripe");
// const getStripeSecrets = require("../config/stripeSecret");
// const getDBConnection = require("../config/db");

// const response = (statusCode, body) => ({
//     statusCode,
//     headers: {
//         "Access-Control-Allow-Origin": "*",
//         "Access-Control-Allow-Headers": "*",
//         "Access-Control-Allow-Methods": "OPTIONS,GET,POST"
//     },
//     body: JSON.stringify(body)
// });

// const parseJsonBody = (body) => {
//     try {
//         return JSON.parse(body);
//     } catch {
//         return null;
//     }
// };

// // -------------------------------
// // Stripe Initialization (cached)
// // -------------------------------
// let stripe;
// const getStripeInstance = async () => {
//     if (!stripe) {
//         const secrets = await getStripeSecrets();
//         stripe = new Stripe(secrets.STRIPE_SECRET_KEY);
//     }
//     return stripe;
// };

// // -------------------------------
// // Main Booking Function
// // -------------------------------
// exports.payBooking = async (event) => {
//     if (event?.httpMethod === "OPTIONS") return response(200, {});

//     let db;

//     try {
//         const body = parseJsonBody(event?.body);
//         if (!body) return response(400, { message: "Invalid JSON body" });

//         const { bookings, bokIndividual: individual, bokMethod: method } = body;
//         if (!Array.isArray(bookings) || bookings.length === 0)
//             return response(400, { message: "Bookings array required" });
//         if (!individual) return response(400, { message: "Individual ID required" });

//         db = await getDBConnection();
//         await db.beginTransaction();

//         // -------------------------------
//         // Step 1: Fetch latest tickets for all shows at once
//         // -------------------------------
//         const showIDs = bookings.map(b => b.shwID);
//         const placeholders = showIDs.map(() => "?").join(",");
//         const [ticketResults] = await db.execute(
//             `SELECT shtShowID, shtID, shtPrice 
//              FROM showTickets 
//              WHERE shtShowID IN (${placeholders}) 
//              ORDER BY shtShowID, shtID DESC`,
//             showIDs
//         );

//         const ticketMap = {};
//         ticketResults.forEach(t => {
//             if (!ticketMap[t.shtShowID]) ticketMap[t.shtShowID] = t;
//         });

//         // -------------------------------
//         // Step 2: Prepare booking data & total amount
//         // -------------------------------
//         const bookingData = [];
//         let totalAmount = 0;

//         for (const b of bookings) {
//             const ticket = ticketMap[b.shwID];
//             if (!ticket) throw new Error(`Ticket not found for show ${b.shwID}`);

//             if (!Array.isArray(b.seatNumber) || b.seatNumber.length === 0)
//                 throw new Error(`Show ${b.shwID} must have seat numbers`);

//             b.seatNumber.forEach(seat => {
//                 bookingData.push({
//                     ticketID: ticket.shtID,
//                     seat,
//                     price: ticket.shtPrice,
//                     shwID: b.shwID
//                 });
//                 totalAmount += ticket.shtPrice;
//             });
//         }

//         // -------------------------------
//         // Step 3: Check booked seats in one query
//         // -------------------------------
//         if (bookingData.length > 0) {
//             const seatConditions = bookingData.map(() => "(bokTicket = ? AND bokSeatNumber = ? AND bokStatus = 'Booked')").join(" OR ");
//             const seatParams = bookingData.flatMap(b => [b.ticketID, b.seat]);
//             const [existingSeats] = await db.execute(
//                 `SELECT bokTicket, bokSeatNumber FROM bookings WHERE ${seatConditions}`,
//                 seatParams
//             );
//             if (existingSeats.length > 0) {
//                 await db.rollback();
//                 return response(400, { message: "Some seats are already booked", seats: existingSeats });
//             }
//         }

//         // -------------------------------
//         // Step 4: Create Stripe PaymentIntent
//         // -------------------------------
//         const stripeInstance = await getStripeInstance();
//         const paymentIntent = await stripeInstance.paymentIntents.create({
//             amount: totalAmount * 100, // in cents
//             currency: "cad",
//             payment_method_types: ["card"],
//             metadata: {
//                 individual,
//                 bookings: JSON.stringify(bookingData.map(b => ({ showID: b.shwID, seat: b.seat })))
//             }
//         });

//         // -------------------------------
//         // Step 5: Batch insert bookings
//         // -------------------------------
//         if (bookingData.length > 0) {
//             const values = bookingData.map(b => [
//                 b.ticketID,
//                 b.seat,
//                 individual,
//                 "Pending",
//                 method || "card",
//                 paymentIntent.id,
//                 new Date()
//             ]);

//             await db.query(
//                 `INSERT INTO bookings 
//                  (bokTicket, bokSeatNumber, bokIndividual, bokStatus, bokPayMethod, bokPayRef, bokEntryTime) 
//                  VALUES ?`,
//                 [values]
//             );
//         }

//         await db.commit();
//         await db.end();

//         return response(200, {
//             message: "Payment intent created",
//             clientSecret: paymentIntent.client_secret
//         });

//     } catch (err) {
//         if (db) {
//             console.error("Booking failed:", err);
//             await db.rollback();
//             await db.end();
//         }

//         return response(500, {
//             message: "Internal server error",
//             error: err.message
//         });
//     }
// };