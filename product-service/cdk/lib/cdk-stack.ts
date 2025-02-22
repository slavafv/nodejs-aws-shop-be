import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const getProductsListFunction = new NodejsFunction(this, "GetProductsListFunction", {
      runtime: lambda.Runtime.NODEJS_18_X, // Provide any supported Node.js runtime
      handler: "getProductsList",
      entry: '../lambdas/getProductsList.ts',
    });

    const getProductsByIdFunction = new NodejsFunction(this, "GetProductsByIdFunction", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "getProductsById",
      entry: '../lambdas/getProductsById.ts',
    });

    // Create API Gateway
    const api = new apigateway.RestApi(this, 'ProductsApi', {
      restApiName: 'Products Service',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    // Create products resource and GET method
    const products = api.root.addResource('products');
    products.addMethod('GET', new apigateway.LambdaIntegration(getProductsListFunction));

    // Add GET /products/{productId} method
    const product = products.addResource('{productId}');
    product.addMethod('GET', new apigateway.LambdaIntegration(getProductsByIdFunction));

    // Output the API URL
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });
  }
}
