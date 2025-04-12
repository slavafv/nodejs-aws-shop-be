import { APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult } from 'aws-lambda';

export const handler = async (event: APIGatewayTokenAuthorizerEvent): Promise<APIGatewayAuthorizerResult> => {
  console.log('Event:', JSON.stringify(event));
  let encodedCreds

  try {
    if (!event.authorizationToken) {
      throw new Error('Unauthorized'); // Will return 401
    }
  
    const authorizationToken = event.authorizationToken;

    
    if (!authorizationToken.toLowerCase().startsWith('basic ')) {
      throw new Error('Forbidden'); // Will return 403
    }

    // Remove 'Basic ' from the token and decode
    encodedCreds = authorizationToken.split(' ')[1];
    console.log('===>> encodedCreds:', encodedCreds)
    const buff = Buffer.from(encodedCreds, 'base64');
    console.log('===>> buff:', buff)
    const [username, password] = buff.toString('utf-8').split(':');
    console.log('===>> buff.toString(utf-8):', buff.toString('utf-8'))
    console.log('===>> username, password:', username, password)

    console.log(`Username: ${username}`);

    // Get credentials from environment variables
    const storedCredentials = process.env.CREDENTIALS ?? '';
    console.log('===>> storedCredentials:', storedCredentials)
    const credentialsMap = parseCredentials(storedCredentials);
    console.log('===>> credentialsMap:', credentialsMap)
    console.log('===>> isAuthorized(username, password, credentialsMap):', isAuthorized(username, password, credentialsMap))

    if (!isAuthorized(username, password, credentialsMap)) {
      throw new Error('Forbidden');
    }

    return generatePolicy(encodedCreds, event.methodArn, 'Allow');
  } catch (error) {
    console.log('Error:', error);
    return generatePolicy(encodedCreds ?? 'Unknown_user', event.methodArn, 'Deny');
  }
};

const parseCredentials = (credentials: string): Map<string, string> => {
  const credentialsMap = new Map<string, string>();
  
  credentials.split(',').forEach(pair => {
    console.log('===>> pair:', pair)
    const [username, password] = pair.trim().split('=');
    console.log('===>> username, password:', username, password)
    if (username && password) {
      console.log('===>> username && password:', username && password)
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
  console.log('===>> credentialsMap isAuthorized:', credentialsMap)
  console.log('===>> credentialsMap.get(username):', credentialsMap.get(username))
  const storedPassword = credentialsMap.get(username);
  console.log('===>> storedPassword:', storedPassword)
  console.log('===>> storedPassword === password:', storedPassword === password)
  return !!storedPassword && !!password && storedPassword === password;

};

const generatePolicy = (
  principalId: string, 
  resource: string, 
  effect: 'Allow' | 'Deny',
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
