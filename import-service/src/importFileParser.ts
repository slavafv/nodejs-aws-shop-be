import { S3Event } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

const s3Client = new S3Client({ region: process.env.AWS_REGION });

export const handler = async (event: S3Event): Promise<void> => {
  try {
    for (const record of event.Records) {
      const bucket = record.s3.bucket.name;
      const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

      console.log(`Processing file: ${key} from bucket: ${bucket}`);

      // Get the file from S3
      const { Body } = await s3Client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );

      if (Body instanceof Readable) {
        // Process the CSV file
        await new Promise((resolve, reject) => {
          Body.pipe(csvParser())
            .on('data', (data: any) => {
              // Log each record
              console.log('Parsed record:', JSON.stringify(data));
            })
            .on('error', (error: any) => {
              console.error('Error parsing CSV:', error);
              reject(error);
            })
            .on('end', () => {
              console.log('Finished processing CSV file');
              resolve(null);
            });
        });
      } else {
        throw new Error('Failed to get readable stream from S3 object');
      }
    }
  } catch (error) {
    console.error('Error processing S3 event:', error);
    throw error;
  }
};
