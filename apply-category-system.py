from pathlib import Path
import re
import shutil
import sys

ROOT = Path(__file__).resolve().parent
CODE = ROOT / "src" / "admin" / "Code.gs"

if not CODE.exists():
    print("[ERROR] Code.gs not found:", CODE)
    sys.exit(1)

original = CODE.read_text(encoding="utf-8-sig")

# ------------------------------------------------------------
# BACKUP
# ------------------------------------------------------------
backup = CODE.with_name("Code.gs.before-category-final.bak")
shutil.copy2(CODE, backup)
print("[OK] Backup created:", backup.name)

# ------------------------------------------------------------
# SAFETY CHECKS
# ------------------------------------------------------------
required = [
    "function getProductsSheet()",
    "function getProducts()",
    "function updateProducts(products)",
    'action === "products"',
    'action === "updateProducts"',
]

for marker in required:
    if marker not in original:
        print("[ERROR] Required marker missing:", marker)
        print("[STOP] Code.gs was not changed.")
        sys.exit(1)

if "function getCategories()" in original:
    print("[ERROR] Category system already exists.")
    print("[STOP] No changes made.")
    sys.exit(1)

# ------------------------------------------------------------
# CATEGORY SYSTEM
# ------------------------------------------------------------
category_system = r'''
/* =========================================================
   CATEGORY SYSTEM
   ========================================================= */

function normalizeCategoryName(name) {

  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

}


function getCategoriesSheet() {

  const spreadsheet =
    SpreadsheetApp.getActiveSpreadsheet();

  let sheet =
    spreadsheet.getSheetByName("Categories");

  if (!sheet) {

    sheet =
      spreadsheet.insertSheet("Categories");

    sheet
      .getRange(1, 1, 1, 3)
      .setValues([[
        "ID",
        "Name",
        "Visibility"
      ]]);

    sheet
      .getRange(1, 1, 1, 3)
      .setFontWeight("bold");

  }

  return sheet;

}


function getCategories() {

  const sheet =
    getCategoriesSheet();

  const lastRow =
    sheet.getLastRow();

  const categories = [];

  if (lastRow >= 2) {

    const rows =
      sheet
        .getRange(
          2,
          1,
          lastRow - 1,
          3
        )
        .getValues();

    rows.forEach(function(row) {

      const id =
        String(row[0] || "").trim();

      const name =
        String(row[1] || "").trim();

      if (!id || !name) {
        return;
      }

      categories.push({

        id: id,

        name: name,

        normalized:
          normalizeCategoryName(name),

        visibility:
          String(
            row[2] || "visible"
          ).trim() || "visible"

      });

    });

  }


  /*
     Automatically discover categories already used
     by products. This makes existing Fragrance products
     available even before the Categories sheet existed.
  */

  const products =
    getProductsRaw();

  const known =
    {};

  categories.forEach(function(category) {

    known[
      category.normalized
    ] = true;

  });


  products.forEach(function(product) {

    const name =
      String(
        product.category || ""
      ).trim();

    const normalized =
      normalizeCategoryName(name);

    if (!normalized || known[normalized]) {
      return;
    }

    categories.push({

      id:
        "category-" +
        normalized
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, ""),

      name: name,

      normalized: normalized,

      visibility: "visible"

    });

    known[normalized] = true;

  });


  return categories;

}


function getVisibleCategories() {

  return getCategories()
    .filter(function(category) {

      return (
        category.visibility !== "hidden" &&
        category.visibility !== "deleted"
      );

    });

}


function findCategoryByName(name) {

  const normalized =
    normalizeCategoryName(name);

  if (!normalized) {
    return null;
  }

  const categories =
    getCategories();

  for (
    let i = 0;
    i < categories.length;
    i++
  ) {

    if (
      categories[i].normalized === normalized
    ) {

      return categories[i];

    }

  }

  return null;

}


function createCategory(name) {

  const cleanName =
    String(name || "")
      .trim()
      .replace(/\s+/g, " ");

  const normalized =
    normalizeCategoryName(cleanName);

  if (!normalized) {

    return {

      success: false,

      error:
        "Category name is required."

    };

  }


  const existing =
    findCategoryByName(cleanName);

  if (existing) {

    return {

      success: true,

      category: existing,

      existing: true,

      message:
        "Category already exists."

    };

  }


  const sheet =
    getCategoriesSheet();

  const id =
    "category-" +
    Date.now().toString(36) +
    "-" +
    Math.random()
      .toString(36)
      .slice(2, 8);


  sheet.appendRow([
    id,
    cleanName,
    "visible"
  ]);


  return {

    success: true,

    existing: false,

    category: {

      id: id,

      name: cleanName,

      normalized: normalized,

      visibility: "visible"

    },

    message:
      "Category created successfully."

  };

}


function updateCategoryVisibility(
  id,
  visibility
) {

  const valid =
    [
      "visible",
      "hidden",
      "deleted"
    ];

  if (
    valid.indexOf(
      String(visibility)
    ) === -1
  ) {

    return {

      success: false,

      error:
        "Invalid category visibility."

    };

  }


  const sheet =
    getCategoriesSheet();

  const lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {

    return {

      success: false,

      error:
        "Category not found."

    };

  }


  const rows =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        3
      )
      .getValues();


  for (
    let i = 0;
    i < rows.length;
    i++
  ) {

    if (
      String(rows[i][0] || "").trim() ===
      String(id || "").trim()
    ) {

      sheet
        .getRange(
          i + 2,
          3
        )
        .setValue(
          String(visibility)
        );

      return {

        success: true,

        message:
          "Category visibility updated."

      };

    }

  }


  return {

    success: false,

    error:
      "Category not found."

  };

}


function getProductsRaw() {

  const sheet =
    getProductsSheet();

  const lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }


  const headers =
    sheet
      .getRange(
        1,
        1,
        1,
        Math.max(
          17,
          sheet.getLastColumn()
        )
      )
      .getValues()[0]
      .map(function(value) {

        return String(
          value || ""
        ).trim();

      });


  const isProductTable =
    headers[0] === "ID" &&
    headers[1] === "Name";


  if (!isProductTable) {

    const values =
      sheet
        .getRange(
          2,
          1,
          lastRow - 1,
          2
        )
        .getValues();

    for (
      let i = 0;
      i < values.length;
      i++
    ) {

      const key =
        String(
          values[i][0] || ""
        ).trim();

      if (key === "products") {

        try {

          const parsed =
            JSON.parse(
              String(
                values[i][1] || "[]"
              )
            );

          return Array.isArray(parsed)
            ? parsed
            : [];

        } catch (error) {

          return [];

        }

      }

    }

    return [];

  }


  const rows =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        18
      )
      .getValues();


  return rows
    .filter(function(row) {

      return String(
        row[0] || ""
      ).trim() !== "";

    })
    .map(function(row) {

      const tagsText =
        String(
          row[5] || ""
        ).trim();

      const oldPriceValue =
        row[7] === "" ||
        row[7] === null
          ? null
          : Number(row[7]);

      const costPriceValue =
        row[16] === "" ||
        row[16] === null
          ? 0
          : Number(row[16]);


      return {

        id:
          String(row[0] || "").trim(),

        name:
          String(row[1] || "").trim(),

        brand:
          String(row[2] || "").trim(),

        category:
          String(row[3] || "").trim(),

        subtitle:
          String(row[4] || "").trim(),

        tags:
          tagsText
            ? tagsText
                .split("|")
                .map(function(tag) {
                  return String(tag).trim();
                })
                .filter(Boolean)
            : [],

        price:
          row[6] === "" ||
          row[6] === null
            ? 0
            : Number(row[6]),

        oldPrice:
          oldPriceValue,

        rating:
          row[8] === "" ||
          row[8] === null
            ? 0
            : Number(row[8]),

        reviews:
          row[9] === "" ||
          row[9] === null
            ? 0
            : Number(row[9]),

        stock:
          row[10] === "" ||
          row[10] === null
            ? 0
            : Number(row[10]),

        status:
          String(
            row[11] || "active"
          ).trim(),

        description:
          String(row[12] || ""),

        image:
          String(row[13] || "").trim(),

        alt:
          String(row[14] || "").trim(),

        notes:
          row[15] === "" ||
          row[15] === null
            ? null
            : String(row[15]),

        costPrice:
          costPriceValue,

        visibility:
          String(
            row[17] || "visible"
          ).trim() || "visible"

      };

    });

}


function isProductVisible(
  product,
  categories
) {

  if (!product) {
    return false;
  }

  if (
    product.visibility === "hidden" ||
    product.visibility === "deleted"
  ) {

    return false;

  }


  if (
    product.status === "inactive"
  ) {

    return false;

  }


  const categoryName =
    normalizeCategoryName(
      product.category
    );

  if (!categoryName) {
    return true;
  }


  const category =
    categories.find(function(item) {

      return (
        item.normalized ===
        categoryName
      );

    });


  if (!category) {
    return true;
  }


  return (
    category.visibility !== "hidden" &&
    category.visibility !== "deleted"
  );

}


function getVisibleProducts() {

  const products =
    getProductsRaw();

  const categories =
    getCategories();

  return products.filter(
    function(product) {

      return isProductVisible(
        product,
        categories
      );

    }
  );

}


function updateProductVisibility(
  id,
  visibility
) {

  const valid =
    [
      "visible",
      "hidden",
      "deleted"
    ];

  if (
    valid.indexOf(
      String(visibility)
    ) === -1
  ) {

    return {

      success: false,

      error:
        "Invalid product visibility."

    };

  }


  const sheet =
    getProductsSheet();

  const lastColumn =
    sheet.getLastColumn();

  if (lastColumn < 18) {

    sheet
      .getRange(
        1,
        18
      )
      .setValue("Visibility");

  }


  const lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {

    return {

      success: false,

      error:
        "Product not found."

    };

  }


  const ids =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        1
      )
      .getValues();


  for (
    let i = 0;
    i < ids.length;
    i++
  ) {

    if (
      String(
        ids[i][0] || ""
      ).trim() ===
      String(id || "").trim()
    ) {

      sheet
        .getRange(
          i + 2,
          18
        )
        .setValue(
          String(visibility)
        );

      return {

        success: true,

        message:
          "Product visibility updated."

      };

    }

  }


  return {

    success: false,

    error:
      "Product not found."

  };

}
'''

# Insert category system immediately before getProductsSheet().
marker = "function getProductsSheet()"
if marker not in original:
    print("[ERROR] getProductsSheet() marker missing.")
    sys.exit(1)

patched = original.replace(
    marker,
    category_system + "\n\n" + marker,
    1
)

# ------------------------------------------------------------
# REPLACE getProducts()
# ------------------------------------------------------------
get_products_pattern = re.compile(
    r"function getProducts\(\) \{.*?\n\}\n\n\n/\* =========================================================\n   UPDATE PRODUCTS",
    re.S
)

new_get_products = r'''function getProducts() {

  return getProductsRaw();

}


/* =========================================================
   UPDATE PRODUCTS'''

patched, count = get_products_pattern.subn(
    new_get_products,
    patched,
    count=1
)

if count != 1:
    print("[ERROR] Could not replace getProducts().")
    print("[STOP] Original file remains untouched.")
    sys.exit(1)

# ------------------------------------------------------------
# REPLACE updateProducts()
# ------------------------------------------------------------
update_pattern = re.compile(
    r"function updateProducts\(products\) \{.*?(?=\n/\* =========================================================)",
    re.S
)

new_update_products = r'''function updateProducts(products) {

  if (
    !Array.isArray(products)
  ) {

    return {

      success: false,

      error:
        "Products must be an array."

    };

  }


  const lock =
    LockService.getScriptLock();


  lock.waitLock(30000);


  try {

    const sheet =
      getProductsSheet();


    const headers = [[
      "ID",
      "Name",
      "Brand",
      "Category",
      "Subtitle",
      "Tags",
      "Price",
      "Old Price",
      "Rating",
      "Reviews",
      "Stock",
      "Status",
      "Description",
      "Image",
      "Alt",
      "Notes",
      "Cost Price",
      "Visibility"
    ]];


    sheet.clearContents();


    sheet
      .getRange(
        1,
        1,
        1,
        18
      )
      .setValues(headers);


    sheet
      .getRange(
        1,
        1,
        1,
        18
      )
      .setFontWeight("bold");


    const rows =
      products.map(function(product) {

        const tags =
          Array.isArray(product.tags)
            ? product.tags
                .map(function(tag) {
                  return String(tag).trim();
                })
                .filter(Boolean)
                .join(" | ")
            : String(
                product.tags || ""
              ).trim();


        return [

          String(
            product.id || ""
          ),

          String(
            product.name || ""
          ),

          String(
            product.brand || ""
          ),

          String(
            product.category || ""
          ),

          String(
            product.subtitle || ""
          ),

          tags,

          product.price === "" ||
          product.price === null ||
          product.price === undefined
            ? 0
            : Number(product.price),

          product.oldPrice === "" ||
          product.oldPrice === null ||
          product.oldPrice === undefined
            ? ""
            : Number(product.oldPrice),

          product.rating === "" ||
          product.rating === null ||
          product.rating === undefined
            ? 0
            : Number(product.rating),

          product.reviews === "" ||
          product.reviews === null ||
          product.reviews === undefined
            ? 0
            : Number(product.reviews),

          product.stock === "" ||
          product.stock === null ||
          product.stock === undefined
            ? 0
            : Number(product.stock),

          String(
            product.status || "active"
          ),

          String(
            product.description || ""
          ),

          String(
            product.image || ""
          ),

          String(
            product.alt || ""
          ),

          product.notes === null ||
          product.notes === undefined
            ? ""
            : String(product.notes),

          product.costPrice === "" ||
          product.costPrice === null ||
          product.costPrice === undefined
            ? 0
            : Number(product.costPrice),

          String(
            product.visibility || "visible"
          )

        ];

      });


    if (rows.length > 0) {

      sheet
        .getRange(
          2,
          1,
          rows.length,
          18
        )
        .setValues(rows);

    }


    SpreadsheetApp.flush();


    return {

      success: true,

      count:
        products.length,

      products:
        getProducts(),

      message:
        "Products saved successfully."

    };


  } finally {

    lock.releaseLock();

  }

}


'''

patched, count = update_pattern.subn(
    new_update_products,
    patched,
    count=1
)

if count != 1:
    print("[ERROR] Could not replace updateProducts().")
    print("[STOP] Original file remains untouched.")
    sys.exit(1)

# ------------------------------------------------------------
# PATCH PUBLIC PRODUCTS GET ROUTE
# ------------------------------------------------------------
old_get_route = '''if (
      action === "products"
    ) {

      return jsonResponse({

        success: true,

        products:
          getProducts(),

      });

    }'''

new_get_route = '''if (
      action === "products"
    ) {

      return jsonResponse({

        success: true,

        products:
          getVisibleProducts(),

        categories:
          getVisibleCategories(),

      });

    }'''

if old_get_route not in patched:
    print("[ERROR] Public products route not found.")
    print("[STOP] Original file remains untouched.")
    sys.exit(1)

patched = patched.replace(
    old_get_route,
    new_get_route,
    1
)

# ------------------------------------------------------------
# PATCH updateProducts POST ROUTE
# ------------------------------------------------------------
old_post_route = '''if (
      action === "updateProducts"
    ) {

      return jsonResponse(

        updateProducts(
          body.products
        )

      );

    }'''

new_post_route = '''if (
      action === "updateProducts"
    ) {

      return jsonResponse(

        updateProducts(
          body.products
        )

      );

    }


    if (
      action === "updateProductVisibility"
    ) {

      const auth =
        requireAuth(e);

      if (!auth.success) {
        return jsonResponse(auth);
      }

      return jsonResponse(

        updateProductVisibility(
          body.id,
          body.visibility
        )

      );

    }


    if (
      action === "createCategory"
    ) {

      const auth =
        requireAuth(e);

      if (!auth.success) {
        return jsonResponse(auth);
      }

      return jsonResponse(

        createCategory(
          body.name
        )

      );

    }


    if (
      action === "updateCategoryVisibility"
    ) {

      const auth =
        requireAuth(e);

      if (!auth.success) {
        return jsonResponse(auth);
      }

      return jsonResponse(

        updateCategoryVisibility(
          body.id,
          body.visibility
        )

      );

    }'''

if old_post_route not in patched:
    print("[ERROR] updateProducts POST route not found.")
    print("[STOP] Original file remains untouched.")
    sys.exit(1)

patched = patched.replace(
    old_post_route,
    new_post_route,
    1
)

# ------------------------------------------------------------
# FINAL SAFETY CHECKS
# ------------------------------------------------------------
checks = [
    "function getCategories()",
    "function getVisibleCategories()",
    "function getProductsRaw()",
    "function getVisibleProducts()",
    "function updateProductVisibility(",
    "function updateCategoryVisibility(",
    '"Visibility"',
    'action === "createCategory"',
    'action === "updateCategoryVisibility"',
    'action === "updateProductVisibility"',
]

for marker in checks:
    if marker not in patched:
        print("[ERROR] Final verification failed:", marker)
        print("[STOP] Original file remains untouched.")
        sys.exit(1)

# Verify only one occurrence of the main functions.
for marker in [
    "function getProducts()",
    "function updateProducts(products)",
    "function getCategories()",
]:
    if patched.count(marker) != 1:
        print(
            "[ERROR] Duplicate/unexpected function count:",
            marker,
            patched.count(marker)
        )
        print("[STOP] Original file remains untouched.")
        sys.exit(1)

# Write only after every check passes.
CODE.write_text(
    patched,
    encoding="utf-8"
)

print("")
print("[SUCCESS] Code.gs category/product visibility system applied.")
print("[BACKUP]", backup)
print("[BYTES]", CODE.stat().st_size)
