// ============================================================
// Module: webhook
// Route:  POST /webhook
// Purpose: Receives Stripe webhook events after a user pays.
//          Verifies the signature, then on checkout.session.completed
//          saves booking rows to MySQL.
//
// IMPORTANT: API Gateway must be configured to pass the raw
//            (un-parsed) body so the Stripe signature check works.
//            In API Gateway, set "Content Handling" to
//            CONVERT_TO_TEXT (default) and do NOT transform the body.
// ============================================================

const Stripe = require('stripe');
const getStripeSecrets = require('../config/stripeSecret');
const getDBConnection = require('../config/db');

// Cached Stripe instance (includes webhook secret)
let stripe;
let stripeWebhookSecret;

const initStripe = async () => {
    if (!stripe) {
        const secrets = await getStripeSecrets();
        stripe = new Stripe(secrets.STRIPE_SECRET_KEY);
        stripeWebhookSecret = secrets.STRIPE_WEBHOOK_SECRET;
    }
    return { stripe, stripeWebhookSecret };
};

// ---- DB helpers ----

/**
 * Look up a user's usrID by email.
 * Returns null if not found.
 */
async function findUserIdByEmail(db, email) {
    if (!email) return null;
    const [rows] = await db.execute(
        'SELECT usrID FROM users WHERE usrEmail = ? LIMIT 1',
        [email]
    );
    return rows.length > 0 ? rows[0].usrID : null;
}

/**
 * Insert one booking row per seat.
 *
 * orderItems shape (from session.metadata):
 *   [{ eventId: "1", seatNumbers: [5, 6], pricePerSeat: 95 }, …]
 *
 * DB columns used:
 *   bokTicket      → showTickets.shtID  (FK)
 *   bokSeatNumber  → seat number
 *   bokIndividual  → users.usrID       (FK)
 *   bokStatus      → 'Booked'
 *   bokPayMethod   → 'Stripe'
 *   bokPayRef      → Stripe session ID
 *   bokEntryTime   → current timestamp
 */
async function saveBookings(db, userId, orderItems, stripeSessionId) {
    for (const item of orderItems) {
        // Get the shtID for this show (eventId maps to shwID)
        const [ticketRows] = await db.execute(
            'SELECT shtID FROM showTickets WHERE shtShowID = ? LIMIT 1',
            [item.eventId]
        );

        if (ticketRows.length === 0) {
            console.warn(`No showTicket found for eventId=${item.eventId} – skipping`);
            continue;
        }

        const shtID = ticketRows[0].shtID;

        for (const seatNumber of item.seatNumbers) {
            await db.execute(
                `INSERT INTO bookings
                    (bokTicket, bokSeatNumber, bokIndividual, bokStatus, bokPayMethod, bokPayRef, bokEntryTime)
                 VALUES (?, ?, ?, 'Booked', 'Stripe', ?, NOW())`,
                [shtID, seatNumber, userId, stripeSessionId]
            );
        }
    }
}

// ---- Main export ----
exports.handleWebhook = async (event) => {
    // Stripe webhook must receive a raw POST body – no CORS pre-flight needed
    // but we still handle OPTIONS gracefully just in case
    if (event?.httpMethod === 'OPTIONS') {
        return { statusCode: 200, body: '' };
    }

    let db;

    try {
        const { stripe: stripeInstance, stripeWebhookSecret: secret } = await initStripe();

        // ---- Verify Stripe signature ----
        const signature =
            event.headers?.['Stripe-Signature'] ||
            event.headers?.['stripe-signature'];

        let stripeEvent;
        try {
            stripeEvent = stripeInstance.webhooks.constructEvent(
                event.body,   // must be the RAW string body
                signature,
                secret
            );
        } catch (err) {
            console.error('Webhook signature verification failed:', err.message);
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid webhook signature' }),
            };
        }

        // ---- Handle the event ----
        if (stripeEvent.type === 'checkout.session.completed') {
            const session = stripeEvent.data.object;

            console.log('Payment successful – session:', session.id);
            console.log('Customer email:', session.customer_email);

            // Read what we stored in metadata when creating the session
            let userId = session.metadata?.userId
                ? parseInt(session.metadata.userId, 10) || null
                : null;
            const userEmail = session.metadata?.userEmail || session.customer_email;
            const orderItems = JSON.parse(session.metadata?.orderItems || '[]');

            db = await getDBConnection();

            // Fall back: look up user by email if userId wasn't in metadata
            if (!userId) {
                userId = await findUserIdByEmail(db, userEmail);
            }

            if (!userId) {
                console.warn('Could not resolve userId – skipping DB write');
                return {
                    statusCode: 200,
                    body: JSON.stringify({ received: true, warning: 'User not found' }),
                };
            }

            console.log(`Saving ${orderItems.length} order item(s) for user ${userId}`);
            await saveBookings(db, userId, orderItems, session.id);
            console.log('Bookings saved successfully');

        } else {
            console.log(`Webhook event ignored: ${stripeEvent.type}`);
        }

        // Always return 200 so Stripe doesn't retry
        return {
            statusCode: 200,
            body: JSON.stringify({ received: true }),
        };

    } catch (err) {
        console.error('Webhook handler error:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Webhook processing failed' }),
        };
    } finally {
        if (db) {
            try { await db.end(); } catch (_) { /* ignore */ }
        }
    }
};
