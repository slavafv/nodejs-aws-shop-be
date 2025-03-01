# Using the fillTables() Function

You have successfully implemented the `fillTables()` function in `product-service/cdk/src/scripts/db-fill.ts`. This document explains how this function can be triggered in your application.

## Current Implementation

The `fillTables()` function is now set up to:

1. **Auto-execute when the script is run directly**: The function is called at the end of the file with proper promise handling.
2. **Be available for import**: The function is exported for use in other files.

## How to Trigger the Function

### Option 1: Direct Execution

You can run the script directly to populate your database tables:

```bash
# Navigate to your project directory
cd product-service/cdk

# Using npm
npx ts-node src/scripts/db-fill.ts

# OR using yarn
yarn ts-node src/scripts/db-fill.ts
```

This will execute the script, which will call `fillTables()` and populate your DynamoDB tables with the product and stock data.

### Option 2: Import and Use in Another File

If you need to call this function from another part of your application, you can import it:

```typescript
import { fillTables } from "../scripts/db-fill";

// Later in your code
await fillTables();
```

### Option 3: Add to Deployment Scripts

To run this as part of your deployment process, you could add it as a script in your `package.json`:

```json
"scripts": {
  "deploy": "cdk deploy",
  "fill-db": "ts-node src/scripts/db-fill.ts",
  "post-deploy": "npm run deploy && npm run fill-db"
}
```

Then run:

```bash
npm run post-deploy
```

## Considerations

- The script assumes that the DynamoDB tables already exist. Make sure your infrastructure is deployed before running this script.
- The script uses the AWS credentials from your environment, so make sure you're authenticated with the correct AWS profile.
- If you're running this in a CI/CD pipeline, ensure that the environment has the necessary AWS credentials and permissions.

## Troubleshooting

If you encounter errors when running the script:

1. Check if your AWS credentials are correctly set up
2. Verify that the table names match your actual DynamoDB tables
3. Ensure that the AWS region is set correctly (currently "eu-west-1")

By following these instructions, your `fillTables()` function will be properly triggered and will populate your DynamoDB tables with the required data.