import { APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult } from 'aws-lambda';

export const handler = async (event: APIGatewayTokenAuthorizerEvent): Promise<APIGatewayAuthorizerResult> => {
  console.log('Event:', JSON.stringify(event));

  if (!event.authorizationToken) {
    throw new Error('Unauthorized'); // Will return 401
  }

  try {
    const authorizationToken = event.authorizationToken;
    
    if (!authorizationToken.toLowerCase().startsWith('basic ')) {
      throw new Error('Forbidden'); // Will return 403
    }

    // Remove 'Basic ' from the token and decode
    const encodedCreds = authorizationToken.split(' ')[1];
    const buff = Buffer.from(encodedCreds, 'base64');
    const [username, password] = buff.toString('utf-8').split(':');

    console.log(`Username: ${username}`);

    // Get credentials from environment variables
    const storedCredentials = process.env.CREDENTIALS || '';
    const credentialsMap = parseCredentials(storedCredentials);

    if (!isAuthorized(username, password, credentialsMap)) {
      throw new Error('Forbidden');
    }

    return generatePolicy(encodedCreds, event.methodArn, 'Allow');
  } catch (error) {
    console.log('Error:', error);
    throw error instanceof Error && error.message === 'Unauthorized' 
      ? new Error('Unauthorized') 
      : new Error('Forbidden');
  }
};

const parseCredentials = (credentials: string): Map<string, string> => {
  const credentialsMap = new Map<string, string>();
  
  credentials.split(',').forEach(pair => {
    const [username, password] = pair.trim().split('=');
    if (username && password) {
      credentialsMap.set(username, password);
    }
  });

  return credentialsMap;
};

const isAuthorized = (
  username: string, 
  password: string, 
  credentialsMap: Map<string, string>
): boolean => {
  const storedPassword = credentialsMap.get(username);
  return storedPassword === password;
};

const generatePolicy = (
  principalId: string, 
  resource: string, 
  effect: 'Allow' | 'Deny'
): APIGatewayAuthorizerResult => {
  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource
        }
      ]
    }
  };
};
