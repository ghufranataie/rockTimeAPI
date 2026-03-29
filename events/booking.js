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


// Stripe Initialization (cached)
let stripe;
const getStripeInstance = async () => {
    if (!stripe) {
        const secrets = await getStripeSecrets();
        stripe = new Stripe(secrets.STRIPE_SECRET_KEY);
    }
    return stripe;
};


// Main Booking Function
exports.payBooking = async (event) => {
    if (event?.httpMethod === "OPTIONS") return response(200, {});

    try {
        const body = parseJsonBody(event?.body);
        if (!body) return response(400, { message: "Invalid JSON body" });

        const { items, userID: userID, successUrl: successUrl, cancelUrl: cancelUrl} = body;
        if (!Array.isArray(items) || items.length === 0)
            return response(400, { message: "Bookings array required" });
        if (!userID) return response(400, { message: "userID required", body: body});
        

        let totalAmount = 0;
        items.forEach(item => {
            const seatCount = item.seatNumbers.length;
            const itemTotal = seatCount * item.pricePerSeat;
            totalAmount += itemTotal;
        });

        const stripeInstance = await getStripeInstance();
        const paymentIntent = await stripeInstance.paymentIntents.create({
            amount: Math.round(totalAmount * 100),
            currency: "cad",
            payment_method_types: ["card"],
            metadata: {
                userID: userID,
                items: JSON.stringify(items)
            }
        });

        return response(200, {
            message: "Payment intent created",
            clientSecret: paymentIntent.client_secret
        });

    } catch (err) {
        return response(500, {
            message: "Internal server error",
            error: err.message
        });
    }
};