import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb"

const client = new DynamoDBClient({})
const dynamoDb = DynamoDBDocumentClient.from(client)
const productsTable = process.env.PRODUCTS_TABLE || 'products'
const stocksTable = process.env.STOCKS_TABLE || 'stocks'

export const getProductsById = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Get productId from path parameters
    const productId = event.pathParameters?.productId
    console.log(`Getting product with ID: ${productId}`)

    if (!productId) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": true,
        },
        body: JSON.stringify({
          message: "Product ID is required",
        }),
      }
    }

    // Get the product from DynamoDB
    const productResult = await dynamoDb.send(new GetCommand({
      TableName: productsTable,
      Key: { id: productId }
    }))

    // Check if product exists
    if (!productResult.Item) {
      return {
        statusCode: 404,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": true,
        },
        body: JSON.stringify({
          message: "Product not found",
        }),
      }
    }

    const product = productResult.Item

    // Get stock information
    const stockResult = await dynamoDb.send(new GetCommand({
      TableName: stocksTable,
      Key: { product_id: productId }
    }))

    // Join product with stock information
    const joinedProduct = {
      ...product,
      count: stockResult.Item ? stockResult.Item.count : 0
    }

    console.log(`Found product: ${JSON.stringify(joinedProduct)}`)

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify(joinedProduct),
    }
  } catch (error) {
    console.error('Error fetching product by ID:', error)
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({
        message: "Internal server error",
        error: error.message,
      }),
    }
  }
}
