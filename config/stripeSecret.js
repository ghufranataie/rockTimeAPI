const AWS = require("aws-sdk");

const secretsManager = new AWS.SecretsManager();

async function getStripeSecrets() {
    const data = await secretsManager.getSecretValue({
        SecretId: "stripekey"
    }).promise();

    return JSON.parse(data.SecretString);
}

module.exports = getStripeSecrets;