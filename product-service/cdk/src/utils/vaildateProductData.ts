interface ProductData {
  title: string
  description: string
  price: number
  count: number
}

const validateProductData = (productData: ProductData) => {
  if (!productData.title) {
    console.log(" Product Data title is Invalid:", productData.title)
  }

  if (!productData.description) {
    console.log(
      " Product Data description is Invalid:",
      productData.description
    )
  }

  if (
    productData.price === undefined ||
    typeof Number(productData.price) !== "number"
  ) {
    console.log(" Product Data price is Invalid:", productData.price)
  }

  if (
    !(
      productData.count === undefined ||
      typeof Number(productData.price) === "number"
    )
  ) {
    console.log(" Product Data count is Invalid:", productData.count)
  }

  return (
    !productData.title ||
    !productData.description ||
    productData.price === undefined ||
    typeof Number(productData.price) !== "number" ||
    !(
      productData.count === undefined ||
      typeof Number(productData.price) === "number"
    )
  )
}

export { validateProductData, ProductData }
