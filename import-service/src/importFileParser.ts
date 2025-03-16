import { S3Event } from 'aws-lambda';
import { S3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const sqsClient = new SQSClient({ region: process.env.AWS_REGION });

const BUCKET = process.env.BUCKET_NAME;
const SQS_URL = process.env.SQS_QUEUE_URL;

export const handler = async (event: S3Event) => {
  try {
    for (const record of event.Records) {
      const bucket = record.s3.bucket.name;
      const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

      if (!key.startsWith('uploaded/')) {
        console.log('Skipping file not in uploaded folder', { key });
        continue;
      }

      console.log(`Processing file: ${key} from bucket: ${bucket}`);

      // Get the file from S3
      const { Body } = await s3Client.send(
        new GetObjectCommand({
          Bucket: BUCKET,
          Key: key,
        })
      );

      if (Body instanceof Readable) {
        const records: any[] = [];
        // Process the CSV file
        await new Promise((resolve, reject) => {
          Body.pipe(csvParser())
            .on('data', async (data) => {
              try {
                await sqsClient.send(
                  new SendMessageCommand({
                    QueueUrl: SQS_URL,
                    MessageBody: JSON.stringify(data)
                  })
                );
                
                console.log(`Message sent to SQS for record: ${JSON.stringify(data)}`);
              } catch (error) {
                console.error('Error sending message to SQS:', error);
              }
            })
            .on('error', (error) => {
              console.error('Error parsing CSV:', error);
              reject(error);
            })
            .on('end', async () => {
              try {
                // Generate the new key for parsed folder
                const newKey = key.replace('uploaded/', 'parsed/');

                // Copy the file to parsed folder
                await s3Client.send(
                  new CopyObjectCommand({
                    Bucket: BUCKET,
                    CopySource: `${BUCKET}/${key}`,
                    Key: newKey,
                  })
                );

                console.log(`File copied to: ${newKey}`);

                // Delete the file from uploaded folder
                await s3Client.send(
                  new DeleteObjectCommand({
                    Bucket: BUCKET,
                    Key: key,
                  })
                );

                console.log(`Original file deleted: ${key}`);
                resolve(true);
              } catch (error) {
                console.error('Error moving file:', error);
                reject(error);
              }
            });
        });
      } else {
        throw new Error('Failed to get readable stream from S3 object');
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Files processed successfully' })
    };
  } catch (error) {
    console.error('Error processing S3 event:', error);
    throw error;
  }
};
