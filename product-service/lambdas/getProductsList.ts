import {APIGatewayProxyEvent, APIGatewayProxyResult} from '../cdk/types'
import { products } from "./mocks";

export const getProductsList = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(products),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};
