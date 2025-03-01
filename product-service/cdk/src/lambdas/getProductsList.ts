import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const dynamoDb = DynamoDBDocumentClient.from(client);
const productsTable = process.env.PRODUCTS_TABLE
const stocksTable = process.env.STOCKS_TABLE

export const getProductsList = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Fetching all products')
    
    // Get all products from the products table
    const productsResult = await dynamoDb.send(new ScanCommand({
      TableName: productsTable
    }))
    
    const products = productsResult.Items || []
    
    // Get all stocks from the stocks table
    const stocksResult = await dynamoDb.send(new ScanCommand({
      TableName: stocksTable
    }))
    
    const stocks = stocksResult.Items || []
    
    // Join products with their stock information
    const joinedProducts = products.map(product => {
      const stock = stocks.find(s => s.product_id === product.id) || { count: 0 }
      return {
        ...product,
        count: stock.count
      }
    })
    
    console.log(`Found ${joinedProducts.length} products`)
    
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify(joinedProducts),
    }
  } catch (error) {
    console.error('Error fetching products:', error)
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({ message: "Internal server error", error: error instanceof Error ? error.message : error }),
    }
  }
}
