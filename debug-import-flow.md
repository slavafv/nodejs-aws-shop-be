# Debugging Guide: CSV Import to Products Flow

## Data Flow Overview
1. CSV file uploaded to S3
2. `importFileParser.ts` processes the file and sends records to SQS
3. `catalogBatchProcess.ts` receives SQS messages and stores in DynamoDB
4. `getProductsList.ts` retrieves products from DynamoDB

## How to Debug in AWS Console

1. **Check S3 Upload**
   - Go to S3 Console
   - Verify file is uploaded to correct bucket
   - Check file permissions and content

2. **Check CloudWatch Logs**
   - Go to CloudWatch Logs
   - Look for logs from these Lambda functions:
     - `/aws/lambda/import-file-parser`
     - `/aws/lambda/catalog-batch-process`
   - Check for errors or successful processing messages

3. **Check SQS Queue**
   - Go to SQS Console
   - Look for:
     - Number of messages in flight
     - Dead Letter Queue (if configured)
     - Check if messages are being received and processed

4. **Check DynamoDB**
   - Go to DynamoDB Tables
   - Check both tables:
     - Products table (${PRODUCTS_TABLE})
     - Stocks table (${STOCKS_TABLE})
   - Verify if data exists in both tables
   - Use "Items" tab to view actual data

## Common Issues to Check

1. **Data Format Issues**
   - Ensure CSV columns match expected format
   - Required fields: title, price (number), count (number)
   - Check price and count are valid numbers in CSV

2. **Permissions**
   - Lambda IAM roles have correct permissions for:
     - S3 read access
     - SQS send/receive
     - DynamoDB read/write
     - SNS publish

3. **Environment Variables**
   - Verify all required env vars are set:
     - BUCKET_NAME
     - SQS_QUEUE_URL
     - PRODUCTS_TABLE
     - STOCKS_TABLE
     - SNS_TOPIC_ARN

## Code Review Notes

1. The import parsing looks correct, with proper error handling
2. The catalog batch process correctly creates both product and stock entries
3. The products list endpoint correctly queries both tables

If data is not appearing in /products endpoint:
1. Confirm CSV parsing logs in CloudWatch
2. Check SQS queue for successful message delivery
3. Verify catalogBatchProcess logs for successful DynamoDB writes
4. Check DynamoDB tables directly for data
5. Test /products endpoint directly with Postman/curl to rule out client issues