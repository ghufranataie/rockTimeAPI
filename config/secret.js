const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

async function validateAdminSecret(username, password) {
  try {
    const client = new SecretsManagerClient({ region: 'us-east-1' });
    const command = new GetSecretValueCommand({ SecretId: 'admin-credentials' });
    const response = await client.send(command);

    if (!response || !response.SecretString) {
      console.error("Secrets Manager returned empty response");
      return null;
    }

    const secret = JSON.parse(response.SecretString);
    const admin = secret.admins.find(a => a.EMAIL === username && a.PASSWORD === password);

    if (admin) {
      return admin; // just return the admin object
    } else {
      return null;
    }

  } catch (err) {
    console.error("Error validating admin secret:", err);
    throw err; // Lambda handler will catch this
  }
}

module.exports = { validateAdminSecret };