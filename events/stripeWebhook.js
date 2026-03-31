// lambdaStripeWebhook.js
const getDBConnection = require("../config/db");
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const Stripe = require("stripe");

const secretsManager = new SecretsManagerClient({ region: "us-east-1" });

let stripe, stripeWebhookSecret;

// Fetch Stripe secrets from Secrets Manager
const getStripeInstance = async () => {
  if (!stripe || !stripeWebhookSecret) {
    const secretResponse = await secretsManager.send(
      new GetSecretValueCommand({ SecretId: "stripekey" }) // replace with your secret name
    );

    const secretObj = JSON.parse(secretResponse.SecretString);
    stripe = new Stripe(secretObj.STRIPE_SECRET_KEY, { apiVersion: "2023-08-16" });
    stripeWebhookSecret = secretObj.STRIPE_WEBHOOK_SECRET;
  }
  return { stripe, stripeWebhookSecret };
};

exports.stripeWebhook = async (event) => {
  const bodyBuffer = event.isBase64Encoded
    ? Buffer.from(event.body, "base64")
    : Buffer.from(event.body, "utf8");

  const sig = event.headers?.['stripe-signature'];

  let stripeEvent;

  try {
    const { stripe, stripeWebhookSecret } = await getStripeInstance();

    if (!sig) {
      console.warn("Stripe signature missing — using body as JSON (test mode)");
      stripeEvent = JSON.parse(bodyBuffer.toString("utf8"));
    } else {
      stripeEvent = stripe.webhooks.constructEvent(bodyBuffer, sig, stripeWebhookSecret);
    }
  } catch (err) {
    console.error("Webhook verification failed:", err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  // Handle checkout.session.completed
  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;
    const { userID, items } = session.metadata || {};

    if (!userID || !items) {
      console.error("Missing metadata fields:", session.metadata);
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
            [item.eventId, seat, userID, session.id]
          );
        }
      }

      console.log(`Booking inserted for user ${userID}, payment ${session.id}`);
    } catch (err) {
      console.error("DB insert failed:", err.stack || err);
      return { statusCode: 500, body: "Database error" };
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