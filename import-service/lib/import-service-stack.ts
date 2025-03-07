import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
// import * as iam from 'aws-cdk-lib/aws-iam';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as path from 'path';

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create S3 bucket for file uploads
    const bucket = new s3.Bucket(this, 'slava-s3-bucket', {
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
          ],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
    });

    // Create Lambda function using NodejsFunction
    const importProductsFile = new NodejsFunction(this, 'ImportProductsFile', {
      runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: path.join(__dirname, '../src/functions/importProductsFile.ts'),
      environment: {
        BUCKET_NAME: bucket.bucketName,
      },
      // bundling: {
      //   minify: true,
      //   sourceMap: true,
      //   externalModules: ['aws-sdk'],
      // },
    });

    // Create importFileParser Lambda
    const importFileParser = new NodejsFunction(this, 'ImportFileParser', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: path.join(__dirname, '../src/functions/importFileParser.ts'),
      environment: {
        BUCKET_NAME: bucket.bucketName,
      },
      // bundling: {
      //   minify: true,
      //   sourceMap: true,
      //   externalModules: ['aws-sdk'],
      // },
      timeout: cdk.Duration.seconds(60), // Increase timeout for file processing
    });

    // Grant S3 permissions to Lambda
    bucket.grantReadWrite(importProductsFile);
    bucket.grantRead(importFileParser);

    // Add S3 notification for uploaded folder
    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(importFileParser),
      { prefix: 'uploaded/' } // Only trigger for objects in uploaded folder
    );
    
    // Create API Gateway
    const api = new apigateway.RestApi(this, 'ImportApi', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    // Create API Gateway integration
    const integration = new apigateway.LambdaIntegration(importProductsFile);

    // Add resource and method
    const importResource = api.root.addResource('import');
    importResource.addMethod('GET', integration, {
      requestParameters: {
        'method.request.querystring.name': true,
      },
    });
  }
}
