import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
// import * as iam from 'aws-cdk-lib/aws-iam';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
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

    // Grant S3 permissions to Lambda
    bucket.grantReadWrite(importProductsFile);
    
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
