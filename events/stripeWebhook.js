// lambdaStripeWebhook.js
const getDBConnection = require("../config/db");
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");
const Stripe = require("stripe");

const secretsManager = new SecretsManagerClient({ region: "us-east-1" });
const sesClient = new SESClient({ region: 'us-east-1' });
const sns = new SNSClient({ region: 'us-east-1' });

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

      let realUserID = parseInt(userID, 10);
      const email = session.customer_details?.email || session.customer_email;

      if ((!realUserID || realUserID === 1) && email) {
          const [userRows] = await db.query('SELECT usrID FROM users WHERE usrEmail = ?', [email]);
          if (userRows.length > 0) {
              realUserID = userRows[0].usrID;
          } else {
              const name = session.customer_details?.name || email.split('@')[0];
              const [insertResult] = await db.query(
                  'INSERT INTO users (usrName, usrEmail, usrFullName, usrStatus) VALUES (?, ?, ?, 1)',
                  [email.split('@')[0], email, name]
              );
              realUserID = insertResult.insertId;
          }
      }

      if (!realUserID) {
          realUserID = 1; // absolute fallback
      }

      for (const item of parsedItems) {
        for (const seat of item.seatNumbers) {
          await db.query(
            `INSERT INTO bookings 
             (bokShow, bokSeatNumber, bokIndividual, bokStatus, bokPayMethod, bokPayRef, bokEntryTime)
             VALUES (?, ?, ?, 'Booked', 'Card', ?, NOW())`,
            [item.eventId, seat, realUserID, session.id]
          );
        }
      }

      console.log(`Booking inserted for user ${realUserID}, payment ${session.id}`);



      // Send SNS notification and SES email
      const message = `Booking confirmed for ${email}. Seat number: ${seatNumbers}`;
      await sns.send(new PublishCommand({
        TopicArn: "arn:aws:sns:us-east-1:309237749474:BookingNotifications:3d788c12-b05f-4d28-a9c3-1527f7d86d8b", // replace with your SNS topic ARN
        Message: message,
        Subject: "Ticket Booking Confirmation"
      }));



      if (email) {
        try {
          await sesClient.send(new SendEmailCommand({
            Source: 'gh.aazad@gmail.com', // replace with your verified SES email
            Destination: { ToAddresses: [email] },
            Message: {
              Subject: { Data: 'Your RockTime Booking Confirmation' },
              Body: { Text: { Data: `Booking confirmed! Payment ref: ${session.id}` } }
            }
          }));
          console.log(`Confirmation email sent via SES to ${email}`);
        } catch (emailErr) {
          console.error(`Failed to send confirmation email to ${email}:`, emailErr);
        }
      }
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