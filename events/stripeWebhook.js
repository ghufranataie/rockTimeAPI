// lambdaStripeWebhook.js
const getDBConnection = require("../config/db");

const AWS = require("aws-sdk");
const Stripe = require("stripe");

const secretsManager = new AWS.SecretsManager();

let stripe;
const getStripeInstance = async () => {
    if (!stripe) {
        const secret = await secretsManager.getSecretValue({
            SecretId: "YOUR_SECRET_NAME", // Replace with your secret name in Secrets Manager
        }).promise();

        const secretObj = JSON.parse(secret.SecretString);

        stripe = new Stripe(secretObj.STRIPE_SECRET_KEY); // use key from secret
    }
    return stripe;
};

exports.stripeWebhook = async (event) => {
    // Convert body to Buffer (handle base64 from API Gateway)
    const bodyBuffer = event.isBase64Encoded
        ? Buffer.from(event.body, "base64")
        : Buffer.from(event.body, "utf8");

    const sig = event.headers?.['stripe-signature'];

    let stripeEvent;

    try {
        const stripeInstance = getStripeInstance();

        if (!sig) {
            // ⚠️ Only for API Gateway test / local testing
            console.warn("Stripe signature missing — using body as JSON (test mode)");
            stripeEvent = JSON.parse(bodyBuffer.toString("utf8"));
        } else {
            stripeEvent = stripeInstance.webhooks.constructEvent(
                bodyBuffer,
                sig,
                process.env.STRIPE_WEBHOOK_SECRET
            );
        }
    } catch (err) {
        console.error("Webhook verification failed:", err.message);
        return { statusCode: 400, body: `Webhook Error: ${err.message}` };
    }

    // Handle payment_intent.succeeded
    if (stripeEvent.type === "payment_intent.succeeded") {
        const paymentIntent = stripeEvent.data.object;

        // Extract metadata
        const { userID, items } = paymentIntent.metadata || {};

        if (!userID || !items) {
            console.error("Missing metadata fields:", paymentIntent.metadata);
            return { statusCode: 400, body: "Missing metadata fields" };
        }

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

            console.log(`Booking inserted for user ${userID}, payment ${paymentIntent.id}`);
        } catch (err) {
            console.error("DB insert failed:", err.stack || err);
            return { statusCode: 500, body: "Database error" };
        } finally {
            if (db) await db.end();
        }
    } else {
        console.log("Event type not handled:", stripeEvent.type);
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ received: true }),
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "OPTIONS,GET,POST",
        },
    };
};