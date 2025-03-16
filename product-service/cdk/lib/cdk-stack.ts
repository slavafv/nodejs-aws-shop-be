import * as cdk from "aws-cdk-lib"
import { Construct } from "constructs"
import * as apigateway from "aws-cdk-lib/aws-apigateway"
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as lambda from "aws-cdk-lib/aws-lambda"
import * as dynamodb from "aws-cdk-lib/aws-dynamodb"
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs"
import * as sqs from "aws-cdk-lib/aws-sqs"
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources"

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // Create SNS Topic
    const createProductTopic = new sns.Topic(this, 'CreateProductTopic', {
      displayName: 'Product Creation Notifications'
    });

     // Add email subscription
     createProductTopic.addSubscription(
      new subscriptions.EmailSubscription('s.fomin@softteco.com')
    );

    // Reference existing DynamoDB tables
    const productsTable = dynamodb.Table.fromTableName(
      this,
      "ProductsTable",
      process.env.PRODUCTS_TABLE ?? "AWS_SHOP_DB_Products"
    )
    const stocksTable = dynamodb.Table.fromTableName(
      this,
      "StocksTable",
      process.env.STOCKS_TABLE ?? "AWS_SHOP_DB_Stocks"
    )

    const getProductsListFunction = new NodejsFunction(
      this,
      "GetProductsListFunction",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "getProductsList",
        entry: "./src/lambdas/getProductsList.ts",
        // depsLockFilePath: require.resolve("../package-lock.json"),
        environment: {
          PRODUCTS_TABLE: productsTable.tableName,
          STOCKS_TABLE: stocksTable.tableName,
        },
      }
    )

    const getProductsByIdFunction = new NodejsFunction(
      this,
      "GetProductsByIdFunction",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "getProductsById",
        entry: "./src/lambdas/getProductsById.ts",
        // depsLockFilePath: require.resolve("../package-lock.json"),
        environment: {
          PRODUCTS_TABLE: productsTable.tableName,
          STOCKS_TABLE: stocksTable.tableName,
        },
      }
    )

    // Create createProduct lambda function
    const createProductFunction = new NodejsFunction(
      this,
      "CreateProductFunction",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "createProduct",
        entry: "./src/lambdas/createProduct.ts",
        // depsLockFilePath: require.resolve("../package-lock.json"),
        environment: {
          PRODUCTS_TABLE: productsTable.tableName,
          STOCKS_TABLE: stocksTable.tableName,
        },
      }
    )

    // Assuming you already have the queue defined in AWS Console 'CatalogItemsQueue'
    const catalogItemsQueue = sqs.Queue.fromQueueArn(
      this,
      "CatalogItemsQueue",
      "arn:aws:sqs:eu-west-1:920373015839:catalogItemsQueue"
    )

    // Create the catalogBatchProcess lambda function
    const catalogBatchProcess = new NodejsFunction(
      this,
      "CatalogBatchProcess",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "handler",
        entry: "./src/lambdas/catalogBatchProcess.ts",
        timeout: cdk.Duration.seconds(30),
        environment: {
          PRODUCTS_TABLE: productsTable.tableName,
          STOCKS_TABLE: stocksTable.tableName,
          SNS_TOPIC_ARN: createProductTopic.topicArn,
        },
        bundling: {
          minify: true,
          sourceMap: true,
          externalModules: ["aws-sdk"], // AWS SDK is already available in the Lambda runtime
        },
      }
    )

    // Grant Lambda permissions to publish to SNS
    createProductTopic.grantPublish(catalogBatchProcess);

    // Add SQS trigger to Lambda
    catalogBatchProcess.addEventSource(
      new lambdaEventSources.SqsEventSource(catalogItemsQueue, {
        batchSize: 5,
      })
    )

    // Grant the Lambda functions read access to the DynamoDB tables
    productsTable.grantReadData(getProductsListFunction)
    productsTable.grantReadData(getProductsByIdFunction)
    stocksTable.grantReadData(getProductsListFunction)
    stocksTable.grantReadData(getProductsByIdFunction)

    // Grant the createProduct function write access to the DynamoDB tables
    productsTable.grantWriteData(createProductFunction)
    stocksTable.grantWriteData(createProductFunction)

    // Grant Lambda permissions to read from SQS
    catalogItemsQueue.grantConsumeMessages(catalogBatchProcess)

    // Grant Lambda permissions to write to DynamoDB tables
    productsTable.grantWriteData(catalogBatchProcess)
    stocksTable.grantWriteData(catalogBatchProcess)

    // Create API Gateway
    const api = new apigateway.RestApi(this, "ProductsApi", {
      restApiName: "Products Service",
      description: "This is the Products Service API",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
      // Enable API Gateway documentation
      endpointTypes: [apigateway.EndpointType.REGIONAL],
      deployOptions: {
        stageName: "dev",
        description: "development stage",
        methodOptions: {
          "/*/*": {
            // This special path applies to all resources and methods
            throttlingRateLimit: 10,
            throttlingBurstLimit: 5,
          },
        },
      },
      cloudWatchRole: true,
      cloudWatchRoleRemovalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    // ================================================== //
    // ============                           =========== //
    // ============          products         =========== //
    // ============                           =========== //
    // ================================================== //

    // Create products resource
    const products = api.root.addResource("products")

    // Create products GET method
    products.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getProductsListFunction)
    )

    // Create products POST method
    products.addMethod(
      "POST",
      new apigateway.LambdaIntegration(createProductFunction)
    )

    // ================================================== //
    // ============                           =========== //
    // ============    products/{productId}   =========== //
    // ============                           =========== //
    // ================================================== //

    // Create /products/{productId} resource
    const product = products.addResource("{productId}")

    // Add GET /products/{productId} method
    product.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getProductsByIdFunction)
    )

    // ================================================== //
    // ============                           =========== //
    // ================================================== //

    // Output the API URL
    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
      description: "API Gateway URL",
    })
  }
}
