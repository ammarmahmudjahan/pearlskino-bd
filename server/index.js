import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = 3001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const productsFile = path.join(
  __dirname,
  "..",
  "src",
  "data",
  "products.js"
);

app.use(cors());
app.use(express.json({ limit: "20mb" }));

/*
|--------------------------------------------------------------------------
| GET PRODUCTS
|--------------------------------------------------------------------------
*/

app.get("/api/products", async (req, res) => {
  try {
    const file = await fs.promises.readFile(
      productsFile,
      "utf8"
    );

    res.json({
      success: true,
      file,
    });
  } catch (error) {
    console.error("GET PRODUCTS ERROR:", error);

    res.status(500).json({
      success: false,
      error: "Could not read products.js",
    });
  }
});

/*
|--------------------------------------------------------------------------
| PUBLISH PRODUCTS
|--------------------------------------------------------------------------
|
| The admin panel sends:
|
| PUT /api/products
|
| {
|   products: [...]
| }
|
| This converts the product array into the PRODUCTS export
| used by the React application and writes it to:
|
| src/data/products.js
|
|--------------------------------------------------------------------------
*/

app.put("/api/products", async (req, res) => {
  try {
    const { products } = req.body;

    if (!Array.isArray(products)) {
      return res.status(400).json({
        success: false,
        error: "Invalid products data.",
      });
    }

    const existingFile =
      await fs.promises.readFile(
        productsFile,
        "utf8"
      );

    const productsText =
      JSON.stringify(
        products,
        null,
        2
      );

    const productsExport =
      `export const PRODUCTS = ${productsText};`;

    /*
     * Replace the existing PRODUCTS export.
     *
     * Everything before PRODUCTS is preserved.
     * Everything after PRODUCTS is also preserved.
     */

    const productsPattern =
      /export const PRODUCTS\s*=\s*\[[\s\S]*?\];/;

    let updatedFile;

    if (productsPattern.test(existingFile)) {

      updatedFile =
        existingFile.replace(
          productsPattern,
          productsExport
        );

    } else {

      /*
       * Safety fallback:
       * If PRODUCTS export cannot be found,
       * append it to the file instead of destroying
       * the existing file.
       */

      updatedFile =
        `${existingFile.trim()}\n\n${productsExport}\n`;

    }

    await fs.promises.writeFile(
      productsFile,
      updatedFile,
      "utf8"
    );

    console.log(
      `Published ${products.length} products to src/data/products.js`
    );

    res.json({
      success: true,
      message:
        "Products published successfully.",
      count: products.length,
    });

  } catch (error) {

    console.error(
      "PUBLISH PRODUCTS ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      error:
        "Could not update products.js",
    });
  }
});

/*
|--------------------------------------------------------------------------
| SERVER
|--------------------------------------------------------------------------
*/

app.listen(PORT, () => {
  console.log(
    `PearlSkino local admin server running at http://localhost:${PORT}`
  );
});