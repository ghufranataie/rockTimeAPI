// lambdaStripeWebhook.js
const Stripe = require("stripe");
const getDBConnection = require("../config/db");

let stripe; // Cached Stripe instance
const getStripeInstance = () => {
    if (!stripe) {
        stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    }
    return stripe;
};

exports.stripeWebhook = async (event) => {
    // Convert body to Buffer (handle base64 from API Gateway)
    const body = event.isBase64Encoded
        ? Buffer.from(event.body, "base64")
        : Buffer.from(event.body, "utf8");

    const sig = event.headers['stripe-signature'];

    let stripeEvent;
    try {
        const stripeInstance = getStripeInstance();
        stripeEvent = stripeInstance.webhooks.constructEvent(
            body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error("Webhook signature verification failed:", err.message);
        return { statusCode: 400, body: `Webhook Error: ${err.message}` };
    }

    // Handle payment_intent.succeeded
    if (stripeEvent.type === "payment_intent.succeeded") {
        const paymentIntent = stripeEvent.data.object;
        const { userID, items } = paymentIntent.metadata;

        let parsedItems;
        try {
            parsedItems = JSON.parse(items);
        } catch (err) {
            console.error("Failed to parse items metadata:", err);
            return { statusCode: 400, body: "Invalid metadata format" };
        }

        let db;
        try {
            db = await getDBConnection();

            for (const item of parsedItems) {
                for (const seat of item.seatNumbers) {
                    await db.query(
                        `INSERT INTO bookings 
                         (bokShow, bokSeatNumber, bokIndividual, bokStatus, bokPayMethod, bokPayRef, bokEntryTime)
                         VALUES (?, ?, ?, 'Booked', 'Card', ?, NOW())`,
                        [item.eventId, seat, userID, paymentIntent.id]
                    );
                }
            }
        } catch (err) {
            console.error("DB insert failed:", err);
            return { statusCode: 500, body: "Database error" };
        } finally {
            if (db) await db.end();
        }
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
};