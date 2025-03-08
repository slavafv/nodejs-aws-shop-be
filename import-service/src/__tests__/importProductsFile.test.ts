jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({
    send: jest.fn()
  })),
  PutObjectCommand: jest.fn()
}));

jest.mock('@aws-sdk/s3-request-presigner');

import { APIGatewayProxyEvent } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { handler } from '../importProductsFile';

const mockPutObjectCommand = jest.fn();
jest.mocked(PutObjectCommand).mockImplementation(mockPutObjectCommand);

const mockGetSignedUrl = jest.fn();
jest.mocked(getSignedUrl).mockImplementation(mockGetSignedUrl);

describe('importProductsFile lambda', () => {
  const mockEvent: APIGatewayProxyEvent = {
    queryStringParameters: {
      name: 'test.csv'
    },
    multiValueQueryStringParameters: null,
    httpMethod: 'GET',
    path: '/import',
    headers: {},
    multiValueHeaders: {},
    body: null,
    isBase64Encoded: false,
    pathParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    resource: ''
  };

  const mockSignedUrl = 'https://mock-signed-url.com';
  const mockBucketName = 'XXXXXXXXXXX';

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSignedUrl.mockResolvedValue(mockSignedUrl);
    process.env.BUCKET_NAME = mockBucketName;
    process.env.AWS_REGION = 'eu-west-1';
  });

  describe('successful cases', () => {
    it('should return signed URL when file name is provided', async () => {
      const response = await handler(mockEvent);

      expect(response).toEqual({
        statusCode: 200,
        headers: expect.objectContaining({
          'Access-Control-Allow-Origin': '*'
        }),
        body: mockSignedUrl
      });

      expect(S3Client).toHaveBeenCalledWith({
        region: 'eu-west-1'
      });

      expect(mockPutObjectCommand).toHaveBeenCalledWith({
        Bucket: mockBucketName,
        Key: 'uploaded/test.csv',
        ContentType: 'text/csv'
      });

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        { expiresIn: 3600 }
      );
    });
  });

  describe('error cases', () => {
    it('should return 400 if filename is not provided', async () => {
      const eventWithoutFilename = {
        ...mockEvent,
        queryStringParameters: {}
      };

      const response = await handler(eventWithoutFilename);

      expect(response).toEqual({
        statusCode: 400,
        headers: expect.objectContaining({
          'Access-Control-Allow-Origin': '*'
        }),
        body: JSON.stringify({ message: 'File name is required' })
      });
    });

    it('should handle OPTIONS request', async () => {
      const optionsEvent = {
        ...mockEvent,
        httpMethod: 'OPTIONS'
      };

      const response = await handler(optionsEvent);

      expect(response).toEqual({
        statusCode: 200,
        headers: expect.objectContaining({
          'Access-Control-Allow-Origin': '*'
        }),
        body: ''
      });
    });
  });
});