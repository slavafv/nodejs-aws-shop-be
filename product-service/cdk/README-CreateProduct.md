# CreateProduct Lambda Function

This document provides information about the newly implemented `createProduct` Lambda function.

## Function Overview

The `createProduct` Lambda function creates a new product in the Products database. It's triggered by a POST request to the `/products` endpoint.

## API Endpoint

- **Method**: POST
- **URL**: {{apiBaseUrl}}/products

## Request Format

```json
{
  "title": "Product Title",
  "description": "Product Description",
  "price": 29.99,
  "count": 10
}
```

## Response

### Success (201 Created)
```json
{
  "id": "uuid-generated-id",
  "title": "Product Title",
  "description": "Product Description",
  "price": 29.99,
  "count": 10
}
```

### Error (400 Bad Request)
```json
{
  "message": "Missing required fields: title, description, and price are required"
}
```

### Error (500 Internal Server Error)
```json
{
  "message": "Error creating product",
  "error": "Error details"
}
```

## Implementation Details

The function:
1. Validates the incoming request data
2. Generates a unique ID for the new product
3. Creates a record in the Products table
4. Creates a corresponding record in the Stocks table
5. Returns the created product with status code 201

## Permissions

The Lambda function has:
- Write permissions to the Products table
- Write permissions to the Stocks table

## Deployment

After deployment, the API Gateway URL can be found in the CloudFormation outputs under the key "ApiUrl".