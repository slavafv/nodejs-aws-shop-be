// lambda/catalogBatchProcess.ts
import { SQSEvent, Context } from "aws-lambda"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb"
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns"
import { v4 as uuidv4 } from 'uuid';

const dynamoClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dynamoClient)
const snsClient = new SNSClient({})

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE
const STOCKS_TABLE = process.env.STOCKS_TABLE
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN

export const handler = async (event: SQSEvent, context: Context) => {
  try {
    const createdProducts = []

    for (const record of event.Records) {
      if (typeof record.body !== "string") {
        throw new Error("Record body is not a string")
      }

      const productData = JSON.parse(record.body)

      if (
        !productData.title ||
        typeof productData.price !== "number" ||
        typeof productData.count !== "number"
      ) {
        throw new Error("Invalid product data structure")
      }

      const productId = uuidv4()

      const putParams = {
        TableName: PRODUCTS_TABLE,
        Item: {
          id: productId,
          title: productData.title,
          description: productData.description,
          price: productData.price,
        },
      }

      await docClient.send(new PutCommand(putParams))

      // Create stock in stocks table
      await docClient.send(new PutCommand({
        TableName: STOCKS_TABLE,
        Item: {
          product_id: productId,
          count: productData.count
        }
      }));
      createdProducts.push(putParams.Item)
    }

    // Send notification to SNS
    if (createdProducts.length > 0) {
      const message = {
        products: createdProducts,
        totalCreated: createdProducts.length,
        timestamp: new Date().toISOString(),
      }

      await snsClient.send(
        new PublishCommand({
          TopicArn: SNS_TOPIC_ARN,
          Subject: "New Products Created",
          Message: JSON.stringify(message, null, 2),
          MessageAttributes: {
            productCount: {
              DataType: "Number",
              StringValue: createdProducts.length.toString(),
            },
          },
        })
      )
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Successfully processed ${createdProducts.length} products`,
      }),
    }
  } catch (error) {
    console.error("Error processing batch:", error)
    await snsClient.send(new PublishCommand({
      TopicArn: SNS_TOPIC_ARN,
      Message: JSON.stringify({ error }),
      Subject: 'Error Creating Products',
    }));
    throw error
  }
}
