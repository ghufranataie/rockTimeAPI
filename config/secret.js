const { SecretsManagerClient, GetSecretValueCommand  } = require('@aws-sdk/client-secrets-manager');

async function validateAdminSecret(username, password) {
    const client = new SecretsManagerClient({ region: 'us-east-1' });
    const command = new GetSecretValueCommand({ SecretId: 'admin-credentials' });
    const response = await client.send(command);
    const secret = JSON.parse(response.SecretString);
    const admin = secret.admins.find(a => a.EMAIL === username && a.PASSWORD === password);
    

    if (admin) {
        // Successful login
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Methods": "OPTIONS,POST"
            },
            body: JSON.stringify({ message: "Login successful", name: admin.NAME, email: admin.EMAIL })
        };
    } else {
        // Invalid credentials
        return {
            statusCode: 401,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Methods": "OPTIONS,POST"
            },
            body: JSON.stringify({ message: "Invalid credentials" })
        };
    }
}