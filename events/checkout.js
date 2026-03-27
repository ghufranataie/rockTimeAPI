// ============================================================
// Module: checkout
// Route:  POST /checkout
// Purpose: Creates a Stripe Checkout Session so the user is
//          redirected to Stripe's hosted payment page.
//
// Flow:
//   1. Frontend sends cart items + user info
//   2. This module gets Stripe key from AWS Secrets Manager
//   3. Builds a Stripe Checkout Session with line items
//   4. Stores userId / orderItems in session.metadata
//      (so the webhook can read them after payment)
//   5. Returns { sessionId, url } to frontend
//   6. Frontend redirects user to Stripe URL
// ============================================================

const Stripe = require('stripe');
const getStripeSecrets = require('../config/stripeSecret');

const response = (statusCode, body, extraHeaders = {}) => ({
    statusCode,
    headers: {
        'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'OPTIONS,POST',
        ...extraHeaders,
    },
    body: JSON.stringify(body),
});

const parseJsonBody = (raw) => {
    try { return JSON.parse(raw); } catch { return null; }
};

// Cached Stripe instance
let stripe;
const getStripe = async () => {
    if (!stripe) {
        const secrets = await getStripeSecrets();
        stripe = new Stripe(secrets.STRIPE_SECRET_KEY);
    }
    return stripe;
};

// ---- Main export ----
exports.createSession = async (event) => {
    if (event?.httpMethod === 'OPTIONS') return response(200, {});

    try {
        const body = parseJsonBody(event?.body);
        if (!body) return response(400, { message: 'Invalid JSON body' });

        const { items, customerEmail, userId, successUrl, cancelUrl } = body;

        if (!Array.isArray(items) || items.length === 0) {
            return response(400, { message: 'No items in cart' });
        }

        // ---- Build Stripe line items ----
        // Each item: { eventId, eventTitle, seatNumbers, pricePerSeat, date, time, venue }
        const lineItems = items.map((item) => ({
            price_data: {
                currency: 'usd',
                product_data: {
                    name: item.eventTitle,
                    description: `Seats: ${item.seatNumbers.join(', ')} | ${item.venue} | ${item.date} ${item.time}`,
                },
                unit_amount: Math.round(item.pricePerSeat * 100), // cents
            },
            quantity: item.seatNumbers.length,
        }));

        const stripeInstance = await getStripe();

        // ---- Create Checkout Session ----
        const session = await stripeInstance.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: lineItems,
            customer_email: customerEmail || undefined,

            // Metadata lets the webhook know who bought what
            metadata: {
                userId: userId ? String(userId) : '',
                userEmail: String(customerEmail || '').trim().toLowerCase(),
                // orderItems must be a JSON string (Stripe metadata values are strings)
                orderItems: JSON.stringify(
                    items.map((item) => ({
                        eventId: item.eventId,
                        seatNumbers: item.seatNumbers,
                        pricePerSeat: item.pricePerSeat,
                    }))
                ),
            },

            success_url: successUrl || `${process.env.FRONTEND_URL || 'https://your-s3-site.com'}/checkout?stripe=success`,
            cancel_url: cancelUrl || `${process.env.FRONTEND_URL || 'https://your-s3-site.com'}/checkout?stripe=cancel`,
        });

        return response(200, { sessionId: session.id, url: session.url });

    } catch (err) {
        console.error('Error creating Stripe Checkout Session:', err);
        return response(500, { message: 'Failed to create checkout session', error: err.message });
    }
};
