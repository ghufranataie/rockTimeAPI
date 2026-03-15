const founders = require('./about/founders');
const events = require('./events/event');
const users = require('./user/users');
const auth = require('./user/auth');
const register = require('./user/register');
const { validateAdminSecret } = require('./config/secret');

exports.handler = async (event) => {
    const method = event.httpMethod;
    const resource = event.resource;
    console.log("Event Recieved From API Gateway", JSON.stringify(event, null, 2));

    try {
        // Register User
        if (resource === '/register') {
            switch (method) {
                case 'POST':
                    return register.registerUser(event);
                
                default:
                    return {
                        statusCode: 405,
                        body: JSON.stringify({ message: "Method not allowed" })
                    };
            }
        }

        if (resource === '/adminAuth' && method === 'POST') {
            try {
                const body = JSON.parse(event.body);
                const { username, password } = body;

                if (!username || !password) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: "Username and password are required" })
                };
                }

                const admin = await validateAdminSecret(username, password);

                if (admin) {
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

            } catch (err) {
                console.error("Error in /adminAuth handler:", err);
                return {
                statusCode: 500,
                body: JSON.stringify({ message: "Internal server error" })
                };
            }
        }

        // Login User
        if (resource === '/auth') {
            switch (method) {
                case 'POST':
                    return auth.loginUser(event);
                
                default:
                    return {
                        statusCode: 405,
                        body: JSON.stringify({ message: "Method not allowed" })
                    };
            }
        }

        //Users
        if (resource === '/users') {
            switch (method) {
                case 'GET':
                    return users.getUsers(event);

                case 'POST':
                    return users.createUser(event);
                
                default:
                    return {
                        statusCode: 405,
                        body: JSON.stringify({ message: "Method not allowed" })
                    };
            }
        }

        
        //Events
        if (resource === '/events') {
            switch (method){
                case 'GET':
                    return await events.getEvents(event);
                
                case 'POST':
                    return await events.createEvent(event)
                
                default:
                    return {
                        statusCode: 405,
                        body: JSON.stringify({ message: "Method not allowed" })
                    };
            }
            
        }

        //Founders
        if (resource === '/founders' && method === 'GET') {
            return await founders.getFounders(event);
        }


        return {
            statusCode: 404,
            body: JSON.stringify({ message: "Route not found" })
        };
    } catch (error) {
        console.error("Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal server error" })
        };
    }
};