import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const sesClient = new SESClient({ region: "us-east-1" });
const RECEIVER_EMAIL = "ghufranataie@hotmail.com"; // where messages will go

exports.contactUs = async (event) => {
    if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const emailParams = {
    Source: RECEIVER_EMAIL, // must be verified in SES
    Destination: { ToAddresses: [RECEIVER_EMAIL] },
    Message: {
      Subject: { Data: `Contact Form: ${subject}` },
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
    res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    console.error("SES send error:", error);
    res.status(500).json({ message: "Failed to send email" });
  }
};