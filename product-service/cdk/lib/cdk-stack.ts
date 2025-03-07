import * as cdk from "aws-cdk-lib"
import { Construct } from "constructs"
import * as apigateway from "aws-cdk-lib/aws-apigateway"
import * as lambda from "aws-cdk-lib/aws-lambda"
import * as dynamodb from "aws-cdk-lib/aws-dynamodb"
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs"

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

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
        depsLockFilePath: require.resolve('../package.json'),
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
        depsLockFilePath: require.resolve('../package.json'),
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
        depsLockFilePath: require.resolve('../package.json'),
        environment: {
          PRODUCTS_TABLE: productsTable.tableName,
          STOCKS_TABLE: stocksTable.tableName,
        },
      }
    )

    // Grant the Lambda functions read access to the DynamoDB tables
    productsTable.grantReadData(getProductsListFunction)
    productsTable.grantReadData(getProductsByIdFunction)
    stocksTable.grantReadData(getProductsListFunction)
    stocksTable.grantReadData(getProductsByIdFunction)
    
    // Grant the createProduct function write access to the DynamoDB tables
    productsTable.grantWriteData(createProductFunction)
    stocksTable.grantWriteData(createProductFunction)

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
