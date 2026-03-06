const mysql = require('mysql2/promise');
const { SecretsManagerClient, GetSecretValueCommand  } = require('@aws-sdk/client-secrets-manager');
let connection;

async function getDbConnection() {
    if (connection) return connection;
    const client = new SecretsManagerClient({ region: 'us-east-1' });
    const command = new GetSecretValueCommand({ SecretId: 'rockTimeDBC' });
    const response = await client.send(command);
    const secret = JSON.parse(response.SecretString);
    
    connection = await mysql.createConnection({
        host: secret.host,
        user: secret.username,
        password: secret.password,
        database: secret.dbname
    });
    return connection;
}
module.exports = getDbConnection;