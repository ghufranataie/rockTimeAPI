const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const secretsClient = new SecretsManagerClient({ region: 'us-east-1' });
const SECRET_ID = process.env.STRIPE_SECRET_ID || 'stripekey';

// In-memory cache so we don't call Secrets Manager on every invocation
let cachedSecrets = null;

/**
 * Returns the full Stripe secrets object:
 *   { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET }
 */
async function getStripeSecrets() {
    if (cachedSecrets) return cachedSecrets;

    const command = new GetSecretValueCommand({ SecretId: SECRET_ID });
    const response = await secretsClient.send(command);
    cachedSecrets = JSON.parse(response.SecretString);
    return cachedSecrets;
}

module.exports = getStripeSecrets;