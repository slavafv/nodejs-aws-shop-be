import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb"
import { v4 as uuidv4 } from 'uuid'

const client = new DynamoDBClient({})
const dynamoDb = DynamoDBDocumentClient.from(client)
const productsTable = process.env.PRODUCTS_TABLE
const stocksTable = process.env.STOCKS_TABLE

interface ProductData {
  title: string
  description: string
  price: number
  count: number
}

export const createProduct = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Creating new product with data:', event.body)
    
    // Validate input
    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": true,
        },
        body: JSON.stringify({
          message: "Product data is required",
        }),
      }
    }
    
    // Parse and validate the request body
    const productData: ProductData = JSON.parse(event.body)
    
    // Basic validation for required fields
    if (!productData.title || !productData.description || productData.price === undefined) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": true,
        },
        body: JSON.stringify({
          message: "Missing required fields: title, description, and price are required",
        }),
      }
    }
    
    // Generate a unique ID for the new product
    const productId = uuidv4()
    
    // Create the product in the products table
    await dynamoDb.send(
      new PutCommand({
        TableName: productsTable,
        Item: {
          id: productId,
          title: productData.title,
          description: productData.description,
          price: productData.price,
        },
      })
    )
    
    // Create the stock record in the stocks table
    await dynamoDb.send(
      new PutCommand({
        TableName: stocksTable,
        Item: {
          product_id: productId,
          count: productData.count || 0,
        },
      })
    )
    
    // Return the newly created product
    return {
      statusCode: 201,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({
        id: productId,
        title: productData.title,
        description: productData.description,
        price: productData.price,
        count: productData.count || 0,
      }),
    }
  } catch (error) {
    console.error('Error creating product:', error)
    
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({
        message: "Error creating product",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    }
  }
}