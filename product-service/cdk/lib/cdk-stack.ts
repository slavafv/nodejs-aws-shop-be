import * as cdk from "aws-cdk-lib"
import { Construct } from "constructs"
import * as apigateway from "aws-cdk-lib/aws-apigateway"
import * as lambda from "aws-cdk-lib/aws-lambda"
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs"

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const getProductsListFunction = new NodejsFunction(
      this,
      "GetProductsListFunction",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "getProductsList",
        entry: "../lambdas/getProductsList.ts",
      }
    )

    const getProductsByIdFunction = new NodejsFunction(
      this,
      "GetProductsByIdFunction",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "getProductsById",
        entry: "../lambdas/getProductsById.ts",
      }
    )

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
