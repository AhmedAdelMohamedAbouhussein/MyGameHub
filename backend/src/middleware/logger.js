import logger from '../utils/logger.js';

const requestLogger = (req, res, next) => {
    logger.debug({ method: req.method, url: req.originalUrl, host: req.get('host') }, 'incoming request');
    next();
}
export default requestLogger;

/*
Parts explained

`${req.method}`
Shows the HTTP method (e.g., GET, POST, PUT, DELETE).
Example: GET

`${req.protocol}`
Shows the protocol used by the request (http or https).
Example: http

://${req.get('host')}
req.get('host') gets the Host header from the request.
This is usually the domain name and port.
Example: localhost:3000 or example.com

`${req.originalUrl}`
Shows the original URL path and query string from the request.
Example: /users?id=42

In Express.js, next is a function that you call inside middleware to pass control to the next middleware function or route handler in the stack.

*/
