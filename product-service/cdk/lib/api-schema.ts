// api-schema.ts
export const apiSchema = {
  openapi: "3.0.0",
  info: {
    title: "Products Service API",
    description: "API for managing products",
    version: "1.0.0"
  },
  paths: {
    "/products": {
      get: {
        summary: "Get all products",
        description: "Returns an array of all available products",
        responses: {  // This was missing
          "200": {
            description: "Successful operation",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: {
                        type: "string",
                        description: "The product ID"
                      },
                      title: {
                        type: "string",
                        description: "The product title"
                      },
                      description: {
                        type: "string",
                        description: "The product description"
                      },
                      price: {
                        type: "number",
                        description: "The product price"
                      }
                    }
                  }
                }
              }
            }
          },
          "500": {
            description: "Internal server error"
          }
        }
      }
    },
    "/products/{productId}": {
      get: {
        summary: "Get product by ID",
        description: "Returns a single product by ID",
        parameters: [
          {
            name: "productId",
            in: "path",
            required: true,
            description: "ID of the product to retrieve",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {  // This was missing
          "200": {
            description: "Successful operation",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: {
                      type: "string",
                      description: "The product ID"
                    },
                    title: {
                      type: "string",
                      description: "The product title"
                    },
                    description: {
                      type: "string",
                      description: "The product description"
                    },
                    price: {
                      type: "number",
                      description: "The product price"
                    }
                  }
                }
              }
            }
          },
          "404": {
            description: "Product not found"
          },
          "500": {
            description: "Internal server error"
          }
        }
      }
    }
  }
};
