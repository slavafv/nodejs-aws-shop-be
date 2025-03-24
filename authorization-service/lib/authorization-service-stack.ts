import * as cdk from "aws-cdk-lib"
import * as lambda from "aws-cdk-lib/aws-lambda"
import * as iam from 'aws-cdk-lib/aws-iam'
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs"
import * as path from "path"
import { Construct } from "constructs"
import * as dotenv from "dotenv"
dotenv.config()

export class AuthorizationServiceStack extends cdk.Stack {
  public readonly basicAuthorizerFunction: NodejsFunction

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    this.basicAuthorizerFunction = new NodejsFunction(
      this,
      "BasicAuthorizerFunction",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "handler",
        entry: path.join(__dirname, "../src/lambdas/basicAuthorizer.ts"),
        environment: {
          CREDENTIALS: process.env.CREDENTIALS || "",
        },
        bundling: {
          minify: true,
          sourceMap: true,
        },
      }
    )

    // Add explicit CloudWatch Logs permissions if needed
    this.basicAuthorizerFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents'
        ],
        resources: ['*']
      })
    );
    
    console.log("===>> process.env.CREDENTIALS:", process.env.CREDENTIALS)

    // Export the authorizer function ARN
    new cdk.CfnOutput(this, "BasicAuthorizerArn", {
      value: this.basicAuthorizerFunction.functionArn,
      description: "Basic Authorizer Lambda Function ARN",
      exportName: "BasicAuthorizerArn",
    })

    // Add permission for API Gateway to invoke the authorizer
    this.basicAuthorizerFunction.addPermission("APIGatewayInvokePermission", {
      principal: new cdk.aws_iam.ServicePrincipal("apigateway.amazonaws.com"),
      action: "lambda:InvokeFunction",
    })
  }
}
