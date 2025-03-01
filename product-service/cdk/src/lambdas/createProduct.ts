import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
  TransactWriteCommandInput,
} from "@aws-sdk/lib-dynamodb"
import { v4 as uuidv4 } from "uuid"

const client = new DynamoDBClient({})
const dynamoDb = DynamoDBDocumentClient.from(client)
const productsTable = process.env.PRODUCTS_TABLE
const stocksTable = process.env.STOCKS_TABLE

const validateProductData = (productData: ProductData) => {
  return (
    !productData.title ||
    !productData.description ||
    productData.price === undefined ||
    typeof Number(productData.price) !== "number" ||
    !(
      productData.count === undefined ||
      typeof Number(productData.price) === "number"
    )
  )
}

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
    console.log("Creating new product with data:", event.body)

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
    const invalidData = validateProductData(productData)

    // Basic validation for required fields
    if (invalidData) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": true,
        },
        body: JSON.stringify({
          message:
            "Missing required fields: title, description, and price are required",
        }),
      }
    }

    // Generate a unique ID for the new product
    const productId = uuidv4()

    // Create transaction input
    const transactItems: TransactWriteCommandInput = {
      TransactItems: [
        {
          // Create product record
          Put: {
            TableName: productsTable,
            Item: {
              id: productId,
              title: productData.title,
              description: productData.description,
              price: Number(productData.price),
            },
            // Optional: Ensure the product doesn't already exist
            ConditionExpression: "attribute_not_exists(id)",
          },
        },
        {
          // Create stock record
          Put: {
            TableName: stocksTable,
            Item: {
              product_id: productId,
              count: productData.count ? Number(productData.count) : 0,
            },
            // Optional: Ensure the stock doesn't already exist
            ConditionExpression: "attribute_not_exists(product_id)",
          },
        },
      ],
    }

    // Execute the transaction
    await dynamoDb.send(new TransactWriteCommand(transactItems))
    
    console.log(`Successfully created product and stock with ID: ${productId}`)

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
        price: Number(productData.price),
        count: productData.count ? Number(productData.count) : 0,
      }),
    }
  } catch (error) {
    console.error("Error creating product:", error)

    // Handle specific transaction errors
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const statusCode = errorMessage.includes('TransactionCanceledException') ? 409 : 500


    return {
      statusCode,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({
        message: "Error creating product",
        error: errorMessage,
      }),
    }
  }
}
