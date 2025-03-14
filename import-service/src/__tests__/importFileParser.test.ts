import { S3Event } from 'aws-lambda';
import { S3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { Readable } from 'stream';
import { handler } from '../importFileParser';

const s3ClientMock = mockClient(S3Client);

describe('importFileParser lambda', () => {
  beforeEach(() => {
    s3ClientMock.reset();
  });

  it('should process CSV file from S3', async () => {
    // Mock S3 event
    const mockEvent: S3Event = {
      Records: [{
        s3: {
          bucket: {
            name: 'test-bucket'
          },
          object: {
            key: 'uploaded/test.csv'
          }
        }
      }]
    } as any;

    // Create a mock readable stream with CSV content
    const mockCsvContent = 'id,title,price\n1,Test Product,10.99';
    const mockStream = Readable.from([mockCsvContent]);

    // Mock S3 GetObjectCommand response
    s3ClientMock
      .on(GetObjectCommand).resolves({
        Body: mockStream as any
      })
      .on(CopyObjectCommand).resolves({})
      .on(DeleteObjectCommand).resolves({});

    // Mock console.log to verify output
    const consoleSpy = jest.spyOn(console, 'log');

    await handler(mockEvent);

    // Verify S3 client was called with correct parameters
    // Verify all S3 operations were called
    expect(s3ClientMock.calls()).toHaveLength(3); // Get, Copy, and Delete operations

    // Verify GetObjectCommand
    const getObjectCall = s3ClientMock.commandCalls(GetObjectCommand)[0];
    expect(getObjectCall.args[0].input).toEqual({
      Bucket: 'XXXXXXXXXXX',
      Key: 'uploaded/test.csv'
    });

    // Verify CopyObjectCommand
    const copyObjectCall = s3ClientMock.commandCalls(CopyObjectCommand)[0];
    expect(copyObjectCall.args[0].input).toEqual({
      Bucket: 'XXXXXXXXXXX',
      CopySource: 'test-bucket/uploaded/test.csv',
      Key: 'parsed/test.csv'
    });

    // Verify DeleteObjectCommand
    const deleteObjectCall = s3ClientMock.commandCalls(DeleteObjectCommand)[0];
    expect(deleteObjectCall.args[0].input).toEqual({
      Bucket: 'XXXXXXXXXXX',
      Key: 'uploaded/test.csv'
    });

    // Verify console output for processed data
    expect(consoleSpy).toHaveBeenCalledWith('Processing file: uploaded/test.csv from bucket: test-bucket');
    expect(consoleSpy).toHaveBeenCalledWith('Parsed record: {"id":"1","title":"Test Product","price":"10.99"}');

    consoleSpy.mockRestore();
  });

  it('should handle CSV parsing errors', async () => {
    const mockEvent: S3Event = {
      Records: [{
        s3: {
          bucket: {
            name: 'test-bucket'
          },
          object: {
            key: 'uploaded/invalid.csv'
          }
        }
      }]
    } as any;

    // Create a mock readable stream with invalid CSV content
    const mockInvalidCsvContent = 'invalid,csv,content\nincomplete';
    const mockStream = Readable.from([mockInvalidCsvContent]);

    // Mock S3 GetObjectCommand response
    s3ClientMock.on(GetObjectCommand).resolves({
      Body: mockStream
    });

    // Mock console.error to verify error handling
    const consoleErrorSpy = jest.spyOn(console, 'error');

    await handler(mockEvent);

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error parsing CSV:'));
    consoleErrorSpy.mockRestore();
  });

  it('should handle S3 errors gracefully', async () => {
    const mockEvent: S3Event = {
      Records: [{
        s3: {
          bucket: {
            name: 'test-bucket'
          },
          object: {
            key: 'uploaded/test.csv'
          }
        }
      }]
    } as any;

    // Mock S3 GetObjectCommand to throw an error
    s3ClientMock.on(GetObjectCommand).rejects(new Error('S3 Error'));

    await expect(handler(mockEvent)).rejects.toThrow('S3 Error');
  });
});