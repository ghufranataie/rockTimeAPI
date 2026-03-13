const founders = require('./about/founders');
const events = require('./events/event');
const users = 

exports.handler = async (event) => {
    const method = event.httpMethod;
    const resource = event.resource;
    console.log("Event Recieved From API Gateway", JSON.stringify(event, null, 2));

    try {

        //Users
        if (resource === '/users') {
            switch (method) {
                case 'GET':
                    return events.getUsers(event);

                case 'POST':
                    return events.createUser(event);
                
                default:
                    return {
                        statusCode: 405,
                        body: JSON.stringify({ message: "Method not allowed" })
                    };
            }
        }



        //Events
        if (resource === '/events' && method === 'GET') {
            return await events.getEvents(event);
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