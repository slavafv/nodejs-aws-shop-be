import * as cdk from "aws-cdk-lib"
import { Construct } from "constructs"
import * as apigateway from "aws-cdk-lib/aws-apigateway"
import * as s3 from "aws-cdk-lib/aws-s3"
import * as sqs from "aws-cdk-lib/aws-sqs"
import * as iam from "aws-cdk-lib/aws-iam"
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs"
import * as lambda from "aws-cdk-lib/aws-lambda"
import * as s3n from "aws-cdk-lib/aws-s3-notifications"
import * as path from "path"

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // Get reference to existing SQS queue using specific account and region values
    const catalogItemsQueue = sqs.Queue.fromQueueAttributes(
      this,
      "CatalogItemsQueue",
      {
        queueArn: `arn:aws:sqs:eu-west-1:920373015839:catalogItemsQueue`,
        queueName: "catalogItemsQueue"
      }
    );

    // Reference existing S3 bucket
    const bucket = s3.Bucket.fromBucketName(
      this,
      "ImportBucket",
      "slava-s3-bucket-1"
    )

    // // Create S3 bucket for file uploads
    // const bucket = new s3.Bucket(this, "slava-s3-bucket", {
    //   cors: [
    //     {
    //       allowedMethods: [
    //         s3.HttpMethods.GET,
    //         s3.HttpMethods.PUT,
    //         s3.HttpMethods.POST,
    //         s3.HttpMethods.DELETE,
    //         s3.HttpMethods.HEAD,
    //       ],
    //       allowedOrigins: ["*"],
    //       allowedHeaders: ["*"],
    //       exposedHeaders: [
    //         "ETag",
    //         "x-amz-server-side-encryption",
    //         "x-amz-request-id",
    //         "x-amz-id-2",
    //       ],
    //     },
    //   ],
    //   removalPolicy: cdk.RemovalPolicy.DESTROY,
    //   autoDeleteObjects: true,
    // })

    // Create Lambda function using NodejsFunction
    const importProductsFile = new NodejsFunction(this, "ImportProductsFile", {
      runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
      handler: "handler",
      entry: path.join(__dirname, "../src/importProductsFile.ts"),
      environment: {
        BUCKET_NAME: bucket.bucketName,
        REGION: this.region,
      },
    })

    // Using high-level grants instead of explicit permissions

    // Create importFileParser Lambda
    const importFileParser = new NodejsFunction(this, "ImportFileParser", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "handler",
      entry: path.join(__dirname, "../src/importFileParser.ts"),
      environment: {
        BUCKET_NAME: bucket.bucketName,
        REGION: this.region,
        SQS_QUEUE_URL: catalogItemsQueue.queueUrl,
      },
      timeout: cdk.Duration.seconds(60), // Increase timeout for file processing
    })

    // Grant SQS permissions to Lambda
    // catalogItemsQueue.grantSendMessages(importFileParser)

    // Add combined permissions in single policy statements
    importProductsFile.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["s3:GetObject", "s3:PutObject"],
        resources: ["arn:aws:s3:::slava-s3-bucket-1/*"]
      })
    );

    importFileParser.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
        resources: ["arn:aws:s3:::slava-s3-bucket-1/*"]
      })
    );

    // Separate SQS permissions
    importFileParser.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["sqs:SendMessage"],
        resources: ["arn:aws:sqs:eu-west-1:920373015839:catalogItemsQueue"]
      })
    );

    // Add S3 notification for uploaded folder
    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(importFileParser),
      { prefix: "uploaded/" } // Only trigger for objects in uploaded folder
    )

    // Create API Gateway
    const api = new apigateway.RestApi(this, "ImportApi", {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    })

    // Create API Gateway integration
    const integration = new apigateway.LambdaIntegration(importProductsFile, {
      proxy: true,
      integrationResponses: [
        {
          statusCode: "200",
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": "'*'",
          },
        },
      ],
    })

    // Add resource and method
    const importResource = api.root.addResource("import")
    importResource.addMethod("GET", integration, {
      requestParameters: {
        "method.request.querystring.name": true,
      },
      methodResponses: [
        {
          statusCode: "200",
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": true,
            "method.response.header.Access-Control-Allow-Headers": true,
            "method.response.header.Access-Control-Allow-Methods": true,
          },
        },
      ],
    })
  }
}
