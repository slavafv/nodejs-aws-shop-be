import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { products } from "../lambdas/mocks";

const REGION = "eu-west-1";
const PRODUCTS_TABLE = "AWS_SHOP_DB_Products";
const STOCKS_TABLE = "AWS_SHOP_DB_Stocks";

// Create the client
const client = new DynamoDBClient({ region: REGION });
const dynamodb = DynamoDBDocumentClient.from(client);

const stocks = products.map((product) => ({
  product_id: product.id,
  count: Math.floor(Math.random() * 10) + 1, // Random stock between 1-10
}));

async function fillTables() {
  try {
    // Insert products
    for (const product of products) {
      await dynamodb.send(
        new PutCommand({
          TableName: PRODUCTS_TABLE,
          Item: product,
        })
      );
      console.log(`Added product: ${product.title}`);
    }

    // Insert stocks
    for (const stock of stocks) {
      await dynamodb.send(
        new PutCommand({
          TableName: STOCKS_TABLE,
          Item: stock,
        })
      );
      console.log(`Added stock for product: ${stock.product_id}`);
    }

    console.log("Data population completed successfully");
  } catch (error) {
    console.error("Error populating data:", error);
  }
}

// Call the function to execute it when this script is run
// run `npm run fill-db`
fillTables()
  .then(() => console.log("Database population process complete"))
  .catch(err => console.error("Failed to populate database:", err));

// Export the function so it can be imported and used elsewhere if needed
export { fillTables };
