const Stripe = require("stripe");
const getStripeSecrets = require("../config/stripeSecret");

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

let stripe;
let cachedSecrets;

const getStripeInstance = async () => {
    if (!stripe) {
        if (!cachedSecrets) cachedSecrets = await getStripeSecrets();
        stripe = new Stripe(cachedSecrets.STRIPE_SECRET_KEY);
    }
    return stripe;
};

exports.payBooking = async (event) => {
    if (event?.httpMethod === "OPTIONS") return response(200, {});

    try {
        const body = parseJsonBody(event?.body);
        if (!body) return response(400, { message: "Invalid JSON body" });

        const { items, userID, successUrl, cancelUrl } = body;
        if (!Array.isArray(items) || items.length === 0)
            return response(400, { message: "Bookings array required" });
        if (!userID) return response(400, { message: "userID required" });

        const totalAmount = items.reduce((sum, item) => sum + item.seatNumbers.length * item.pricePerSeat, 0);

        const stripeInstance = await getStripeInstance();
        
        const lineItems = items.map(item => ({
            price_data: {
                currency: "cad",
                product_data: {
                    name: "Event Ticket",
                    description: `Event ID: ${item.eventId} | Seats: ${item.seatNumbers.join(", ")}`,
                },
                unit_amount: Math.round(item.pricePerSeat * 100),
            },
            quantity: item.seatNumbers.length,
        }));

        const session = await stripeInstance.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            line_items: lineItems,
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: { 
                userID: String(userID), 
                items: JSON.stringify(items) 
            }
        });

        return response(200, { message: "Checkout session created", sessionId: session.id, url: session.url });

    } catch (err) {
        console.error(err); // log full error
        return response(500, { message: "Internal server error", error: err.message });
    }
};