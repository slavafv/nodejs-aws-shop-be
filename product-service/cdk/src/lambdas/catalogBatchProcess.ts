// lambda/catalogBatchProcess.ts
import { SQSEvent, SQSRecord, Context } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';

const dynamodb = new DynamoDB.DocumentClient();
const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE;

export const handler = async (event: SQSEvent, context: Context) => {
  try {
    const productCreationPromises = event.Records.map(async (record: SQSRecord) => {
      const productData = JSON.parse(record.body);
      
      const params = {
        TableName: PRODUCTS_TABLE!,
        Item: {
          id: productData.id || Date.now().toString(),
          title: productData.title,
          description: productData.description,
          price: productData.price,
        }
      };

      try {
        await dynamodb.put(params).promise();
        console.log(`Successfully created product: ${params.Item.id}`);
        return params.Item;
      } catch (error) {
        console.error(`Error creating product from message: ${record.body}`, error);
        throw error;
      }
    });

    await Promise.all(productCreationPromises);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Products created successfully' })
    };
  } catch (error) {
    console.error('Error processing batch:', error);
    throw error;
  }
};
