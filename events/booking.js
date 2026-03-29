const Stripe = require("stripe");
// const getStripeSecrets = require("../config/stripeSecret");

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

// let stripe;
// let cachedSecrets;

// const getStripeInstance = async () => {
//     if (!stripe) {
//         if (!cachedSecrets) cachedSecrets = await getStripeSecrets();
//         stripe = new Stripe(cachedSecrets.STRIPE_SECRET_KEY);
//     }
//     return stripe;
// };

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
        const paymentIntent = await stripeInstance.paymentIntents.create({
            amount: Math.round(totalAmount * 100),
            currency: "cad",
            payment_method_types: ["card"],
            metadata: { userID, items: JSON.stringify(items) }
        });

        return response(200, { message: "Payment intent created", clientSecret: paymentIntent.client_secret });

    } catch (err) {
        console.error(err); // log full error
        return response(500, { message: "Internal server error", error: err.message });
    }
};