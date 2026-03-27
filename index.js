const founders = require('./about/founders');
const events = require('./events/event');
const users = require('./user/users');
const auth = require('./user/auth');
const register = require('./user/register');
const tickets = require('./events/tickets');
const checkout = require('./events/checkout');
const webhook = require('./events/webhook');
const { validateAdminSecret } = require('./config/secret');

const corsHeaders = {
    "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,GET,POST"
};

const withCors = (res) => ({
    ...res,
    headers: {
        ...corsHeaders,
        ...(res?.headers || {})
    }
});

exports.handler = async (event) => {
    const method = event.httpMethod;
    const resource = event.resource;
    console.log("Event Recieved From API Gateway", JSON.stringify(event, null, 2));

    if (method === 'OPTIONS') {
        return withCors({
            statusCode: 200,
            body: JSON.stringify({ message: "OK" })
        });
    }
    
    

    try {
        // Register User
        if (resource === '/register') {
            switch (method) {
                case 'POST':
                    return withCors(await register.registerUser(event));
                
                default:
                    return withCors({
                        statusCode: 405,
                        body: JSON.stringify({ message: "Method not allowed" })
                    });
            }
        }


        // Stripe Checkout – create a Checkout Session, return { sessionId, url }
        if (resource === '/checkout') {
            switch (method) {
                case 'POST':
                    return withCors(await checkout.createSession(event));

                default:
                    return withCors({
                        statusCode: 405,
                        body: JSON.stringify({ message: 'Method not allowed' })
                    });
            }
        }

        // Stripe Webhook – verifies signature, saves bookings to DB
        // NOTE: Do NOT wrap with withCors; Stripe doesn't need CORS headers,
        //       and the raw body must reach the handler unmodified.
        if (resource === '/webhook') {
            return await webhook.handleWebhook(event);
        }



        if (resource === '/adminAuth' && method === 'POST') {
            try {
                const body = JSON.parse(event.body);
                const { username, password } = body;

                if (!username || !password) {
                return withCors({
                    statusCode: 400,
                    body: JSON.stringify({ message: "Username and password are required" })
                });
                }

                const admin = await validateAdminSecret(username, password);

                if (admin) {
                return withCors({
                    statusCode: 200,
                    body: JSON.stringify({ message: "Login successful", name: admin.NAME, email: admin.EMAIL })
                });
                } else {
                return withCors({
                    statusCode: 401,
                    body: JSON.stringify({ message: "Invalid credentials" })
                });
                }

            } catch (err) {
                console.error("Error in /adminAuth handler:", err);
                return withCors({
                statusCode: 500,
                body: JSON.stringify({ message: "Internal server error" })
                });
            }
        }

        // Login User
        if (resource === '/auth') {
            switch (method) {
                case 'POST':
                    return withCors(await auth.loginUser(event));
                
                default:
                    return withCors({
                        statusCode: 405,
                        body: JSON.stringify({ message: "Method not allowed" })
                    });
            }
        }

        //Users
        if (resource === '/users') {
            switch (method) {
                case 'GET':
                    return withCors(await users.getUsers(event));

                case 'POST':
                    return withCors(await users.createUser(event));
                
                default:
                    return withCors({
                        statusCode: 405,
                        body: JSON.stringify({ message: "Method not allowed" })
                    });
            }
        }
        
        //Events
        if (resource === '/events') {
            switch (method){
                case 'GET':
                    return withCors(await events.getEvents(event));
                
                case 'POST':
                    return withCors(await events.createEvent(event));
                
                default:
                    return withCors({
                        statusCode: 405,
                        body: JSON.stringify({ message: "Method not allowed" })
                    });
            }
            
        }

        //Founders
        if (resource === '/founders' && method === 'GET') {
            return withCors(await founders.getFounders(event));
        }

        // read query parameters safely
        const usrID = event.queryStringParameters?.usrID;
        const shwID = event.queryStringParameters?.shwID;
        if (resource === '/tickets'){
            switch (method){
                case 'GET':
                    if(usrID){
                        return withCors(await tickets.getSingleUserTickets(event));
                    }else if (shwID){
                        return withCors(await tickets.getSingleShowTickets(event));
                    }else{
                        return withCors(await tickets.getRecentTicketBooking(event));
                    }
                default:
                    return withCors({
                        statusCode: 405,
                        body: JSON.stringify({ message: "Method not allowed" })
                    });
            }

        }

        return withCors({
            statusCode: 404,
            body: JSON.stringify({ message: "Route not found" })
        });
    } catch (error) {
        console.error("Error:", error);
        return withCors({
            statusCode: 500,
            body: JSON.stringify({ message: "Internal server error" })
        });
    }
};