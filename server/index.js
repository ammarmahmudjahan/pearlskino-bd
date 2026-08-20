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
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Could not read products.js",
    });
  }
});

/*
|--------------------------------------------------------------------------
| SAVE PRODUCTS
|--------------------------------------------------------------------------
*/

app.post("/api/products", async (req, res) => {
  try {
    const { file } = req.body;

    if (typeof file !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid file content.",
      });
    }

    await fs.promises.writeFile(
      productsFile,
      file,
      "utf8"
    );

    res.json({
      success: true,
      message: "products.js updated successfully.",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Could not update products.js",
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