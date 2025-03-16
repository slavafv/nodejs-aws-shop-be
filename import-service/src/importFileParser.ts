import { S3Event } from 'aws-lambda';
import { S3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const sqsClient = new SQSClient({ region: process.env.AWS_REGION });

const BUCKET = process.env.BUCKET_NAME;
const SQS_URL = process.env.SQS_QUEUE_URL;

// Helper function to move file to appropriate folder
async function moveFile(bucket: string, key: string, success: boolean): Promise<void> {
  try {
    const targetFolder = success ? 'parsed/' : 'errors/';
    const newKey = key.replace('uploaded/', targetFolder);
    
    // Copy to new location
    await s3Client.send(
      new CopyObjectCommand({
        Bucket: BUCKET,
        CopySource: `${bucket}/${key}`,
        Key: newKey,
      })
    );

    // Delete from original location
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
      })
    );

    console.log(`File moved from uploaded to ${targetFolder} folder: ${newKey}`);
  } catch (moveError) {
    console.error('Error moving file:', moveError);
  }
}

// Helper function to process file contents
async function processFileContents(body: Readable): Promise<boolean> {
  const records: any[] = [];
  
  try {
    await new Promise((resolve, reject) => {
      body.pipe(csvParser())
        .on('data', (data) => {
          records.push(data);
        })
        .on('error', (error) => {
          console.error('Error parsing CSV:', error);
          resolve(false); // Don't reject, just indicate failure
        })
        .on('end', () => {
          resolve(true); // Just mark end of parsing
        });
    });

    // Only try to send messages if we have records
    if (records.length > 0) {
      for (const record of records) {
        try {
          await sqsClient.send(
            new SendMessageCommand({
              QueueUrl: SQS_URL,
              MessageBody: JSON.stringify(record)
            })
          );
          console.log(`Message sent to SQS for record: ${JSON.stringify(record)}`);
        } catch (error) {
          console.error('Error sending message to SQS:', error);
          return false;
        }
      }
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error processing file contents:', error);
    return false;
  }
}

export const handler = async (event: S3Event) => {
  try {
    for (const record of event.Records) {
      const bucket = record.s3.bucket.name;
      const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
      let processingSuccess = false;

      if (!key.startsWith('uploaded/')) {
        console.log('Skipping file not in uploaded folder', { key });
        continue;
      }

      try {
        console.log(`Processing file: ${key} from bucket: ${bucket}`);
        
        const { Body } = await s3Client.send(
          new GetObjectCommand({
            Bucket: BUCKET,
            Key: key,
          })
        );

        if (Body instanceof Readable) {
          processingSuccess = await processFileContents(Body);
        }
      } catch (error) {
        console.error('Error processing file:', error);
        processingSuccess = false;
      } finally {
        // Always try to move the file, regardless of processing outcome
        try {
          await moveFile(bucket, key, processingSuccess);
        } catch (moveError) {
          console.error('Failed to move file:', moveError);
          // Don't throw - we want the Lambda to finish
        }
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Processing completed' })
    };
  } catch (error) {
    console.error('Unexpected error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};