import fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import axios, { AxiosError } from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = fastify();
const PORT = process.env.PORT || 3000;

// Register CORS plugin
app.register(fastifyCors, {
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
});

// Health check endpoint
app.get('/health', async (request, reply) => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString()
  };
});

// Catch-all route handler
app.route({
  method: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  url: '/*',
  handler: async (request, reply) => {
    const originalUrl = request.url;
    console.log('originalUrl', originalUrl);
    console.log('method', request.method);
    console.log('body', request.body);
    
    // Skip the health endpoint
    if (originalUrl === '/health') {
      return;
    }
    
    const recipient = originalUrl.split('/')[1];
    console.log('recipient:', recipient);

    const recipientURL = process.env[recipient];
    console.log('recipientURL:', recipientURL);

    if (recipientURL) {
      const recipientPath = originalUrl.replace('/' + recipient, '');

      const axiosConfig = {
        method: request.method,
        url: `${recipientURL}${recipientPath ? "/" + recipientPath : ''}`,
        headers: {
          'Content-Type': 'application/json',
          ...(request.headers.authorization && {
            'Authorization': request.headers.authorization
          })
        },
        ...(request.body && Object.keys(request.body).length > 0 && { data: request.body } || {})
      };

      console.log('axiosConfig:', axiosConfig);

      try {
        const response = await axios(axiosConfig);
        console.log('response from recipient', response.data);
        return response.data;
      } catch (error) {
        if (error instanceof Error) {
          // Handle general Error instances
          if (axios.isAxiosError(error)) {
            // Handle Axios specific errors
            const axiosError = error as AxiosError;
            if (axiosError.response) {
              const { status, data } = axiosError.response;
              return reply.code(status).send(data);
            }
          }
          // Handle any Error instance
          return reply.code(502).send({ error: error.message });
        }
        // Handle unknown error types
        return reply.code(502).send({ error: 'An unknown error occurred' });
      }
    } else {
      return reply.code(502).send({ error: 'Cannot process request' });
    }
  }
});

// Start the server
const start = async () => {
  try {
    await app.listen({ port: Number(PORT), host: '0.0.0.0' });
    console.log(`bff-service listening on port ${PORT}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
