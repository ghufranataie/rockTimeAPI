const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

const sesClient = new SESClient({ region: "us-east-1" });
const RECEIVER_EMAIL = "gh.aazad@gmail.com";

exports.contactUs = async (event, context) => {
    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: "Method not allowed" })
        };
    }

    const { name, email, subject, message } = JSON.parse(event.body || "{}");

    if (!name || !email || !subject || !message) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Missing required fields" })
        };
    }

    const emailParams = {
        Source: RECEIVER_EMAIL,
        Destination: { ToAddresses: [RECEIVER_EMAIL] },
        Message: {
            Subject: { Data: `Contact Us Form: ${subject}` },
            Body: {
                Html: {
                    Data: `
                        <h2>New Contact Form Submission</h2>
                        <p><strong>Name:</strong> ${name}</p>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Subject:</strong> ${subject}</p>
                        <p><strong>Message:</strong><br/>${message}</p>
                    `,
                },
            },
        },
    };

    try {
        await sesClient.send(new SendEmailCommand(emailParams));
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Email sent successfully" })
        };
    } catch (error) {
        console.error("SES send error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Failed to send email" })
        };
    }
};