import * as cdk from "aws-cdk-lib"
import { Construct } from "constructs"
import * as apigateway from "aws-cdk-lib/aws-apigateway"
import * as lambda from "aws-cdk-lib/aws-lambda"
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs"
import { apiSchema } from "./api-schema"

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

    // Add API documentation
    new apigateway.CfnDocumentationVersion(this, "ProductsApiDocVersion", {
      restApiId: api.restApiId,
      documentationVersion: "1.0.0",
      description: "Products API version 1.0.0",
    })

    // Add documentation parts
    new apigateway.CfnDocumentationPart(this, "ApiDocumentation", {
      restApiId: api.restApiId,
      location: { type: "API" },
      properties: JSON.stringify(apiSchema),
    })

    // ================================================== //
    // ============                           =========== //
    // ============          products         =========== //
    // ============                           =========== //
    // ================================================== //

    // Create products resource
    const products = api.root.addResource("products")

    // // Add documentation for /products endpoint
    // new apigateway.CfnDocumentationPart(this, "ProductsDocumentation", {
    //   restApiId: api.restApiId,
    //   location: {
    //     type: "RESOURCE",
    //     path: "/products",
    //   },
    //   properties: JSON.stringify({
    //     description: "Products resource",
    //   }),
    // })

    // Create products GET method
    products.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getProductsListFunction)
    )

    // // Add documentation for GET /products method
    // new apigateway.CfnDocumentationPart(this, "GetProductsListDocumentation", {
    //   restApiId: api.restApiId,
    //   location: {
    //     type: "METHOD",
    //     path: "/products",
    //     method: "GET"
    //   },
    //   properties: JSON.stringify({
    //     description: "Get all products",
    //     summary: "Returns an array of all available products"
    //   })
    // })

    // ================================================== //
    // ============                           =========== //
    // ============    products/{productId}   =========== //
    // ============                           =========== //
    // ================================================== //

    // Create /products/{productId} resource
    const product = products.addResource("{productId}")

    // // Add documentation for /products/{productId} parameter
    // new apigateway.CfnDocumentationPart(this, "ProductIdParamDocumentation", {
    //   restApiId: api.restApiId,
    //   location: {
    //     type: "PATH_PARAMETER",
    //     path: "/products/{productId}",
    //     name: "productId"
    //   },
    //   properties: JSON.stringify({
    //     description: "The ID of the product"
    //   })
    // })

    // Add GET /products/{productId} method
    product.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getProductsByIdFunction)
    )

    // // Add documentation for GET /products/{productId} method
    // new apigateway.CfnDocumentationPart(this, "GetProductByIdDocumentation", {
    //   restApiId: api.restApiId,
    //   location: {
    //     type: "METHOD",
    //     path: "/products/{productId}",
    //     method: "GET"
    //   },
    //   properties: JSON.stringify({
    //     description: "Get a product by ID",
    //     summary: "Returns a single product by ID"
    //   })
    // });

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
