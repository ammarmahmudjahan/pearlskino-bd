$path = ".\src\admin\Code.gs"
$backup = ".\src\admin\Code.gs.before-category-system.bak"

Copy-Item $path $backup -Force

$content = Get-Content $path -Raw

Write-Host "=== CATEGORY SYSTEM EDIT ===" -ForegroundColor Cyan

# ------------------------------------------------------------
# 1. CATEGORY SYSTEM
# ------------------------------------------------------------

if ($content.Contains('const CATEGORIES_SHEET_NAME = "Categories"')) {
    Write-Host "[SKIP] Category system already exists." -ForegroundColor Yellow
    $categoryExists = $true
}

if (-not $categoryExists) {

$categoryBlock = @"

const CATEGORIES_SHEET_NAME = "Categories";

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
    spreadsheet.getSheetByName(
      CATEGORIES_SHEET_NAME
    );

  if (!sheet) {
    sheet =
      spreadsheet.insertSheet(
        CATEGORIES_SHEET_NAME
      );

    sheet
      .getRange(1, 1, 1, 4)
      .setValues([[
        "ID",
        "Name",
        "Normalized",
        "Visibility"
      ]]);

    sheet
      .getRange(1, 1, 1, 4)
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

  if (lastRow > 1) {

    const rows =
      sheet
        .getRange(
          2,
          1,
          lastRow - 1,
          4
        )
        .getValues();

    rows.forEach(function(row) {

      const name =
        String(row[1] || "").trim();

      if (!name) return;

      categories.push({
        id:
          String(row[0] || "").trim(),

        name:
          name,

        normalized:
          String(
            row[2] ||
            normalizeCategoryName(name)
          ).trim(),

        visibility:
          String(
            row[3] ||
            "visible"
          ).trim()
      });
    });
  }

  return categories;
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
      error: "Category name is required."
    };
  }

  const categories =
    getCategories();

  const existing =
    categories.find(function(category) {
      return category.normalized === normalized;
    });

  if (existing) {
    return {
      success: true,
      category: existing,
      existing: true
    };
  }

  const category = {
    id:
      "category-" +
      new Date().getTime(),

    name:
      cleanName,

    normalized:
      normalized,

    visibility:
      "visible"
  };

  getCategoriesSheet().appendRow([
    category.id,
    category.name,
    category.normalized,
    category.visibility
  ]);

  return {
    success: true,
    category: category,
    existing: false
  };
}

function updateCategoryVisibility(
  categoryId,
  visibility
) {

  const allowed = [
    "visible",
    "hidden",
    "deleted"
  ];

  if (
    allowed.indexOf(
      String(visibility)
    ) === -1
  ) {
    return {
      success: false,
      error: "Invalid category visibility."
    };
  }

  const sheet =
    getCategoriesSheet();

  const lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {
    return {
      success: false,
      error: "Category not found."
    };
  }

  const rows =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        4
      )
      .getValues();

  for (
    let index = 0;
    index < rows.length;
    index++
  ) {

    if (
      String(rows[index][0] || "").trim() ===
      String(categoryId || "").trim()
    ) {

      sheet
        .getRange(
          index + 2,
          4
        )
        .setValue(
          String(visibility)
        );

      return {
        success: true
      };
    }
  }

  return {
    success: false,
    error: "Category not found."
  };
}

function deleteCategory(categoryId) {

  const sheet =
    getCategoriesSheet();

  const lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {
    return {
      success: false,
      error: "Category not found."
    };
  }

  const rows =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        4
      )
      .getValues();

  for (
    let index = 0;
    index < rows.length;
    index++
  ) {

    if (
      String(rows[index][0] || "").trim() ===
      String(categoryId || "").trim()
    ) {

      sheet.deleteRow(index + 2);

      return {
        success: true
      };
    }
  }

  return {
    success: false,
    error: "Category not found."
  };
}

"@

    $pattern = '(?m)^function getProductsSheet\(\)\s*\{'

    if ($content -notmatch $pattern) {
        throw "ERROR: getProductsSheet() not found."
    }

    $content = [regex]::Replace(
        $content,
        $pattern,
        ($categoryBlock + "`r`nfunction getProductsSheet() {"),
        1
    )

    Write-Host "[OK] Category system inserted." -ForegroundColor Green
}

# ------------------------------------------------------------
# 2. PRODUCT HEADER
# ------------------------------------------------------------

$oldHeader = @"
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
      "Cost Price"
"@

$newHeader = @"
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
      "Visibility",
      "Description",
      "Image",
      "Alt",
      "Notes",
      "Cost Price"
"@

$count = ([regex]::Matches(
    $content,
    [regex]::Escape($oldHeader)
)).Count

if ($count -eq 0) {
    throw "ERROR: Product header not found."
}

$content = $content.Replace(
    $oldHeader,
    $newHeader
)

Write-Host "[OK] Product header -> 18 columns." -ForegroundColor Green

# ------------------------------------------------------------
# 3. GET PRODUCTS RANGE
# ------------------------------------------------------------

$getStart =
    $content.IndexOf("function getProducts()")

$updateStart =
    $content.IndexOf("function updateProducts()")

if ($getStart -lt 0) {
    throw "ERROR: getProducts() not found."
}

if ($updateStart -lt 0) {
    throw "ERROR: updateProducts() not found."
}

$getBlock =
    $content.Substring(
        $getStart,
        $updateStart - $getStart
    )

if (
    $getBlock -notmatch
    'lastRow\s*-\s*1,\s*17\s*\)'
) {
    throw "ERROR: getProducts() 17-column range not found."
}

$getBlock =
    [regex]::Replace(
        $getBlock,
        '(lastRow\s*-\s*1,\s*)17(\s*\))',
        '${1}18${2}',
        1
    )

# ------------------------------------------------------------
# 4. GET PRODUCTS MAPPING
# ------------------------------------------------------------

if (
    $getBlock -notmatch
    '\bvisibility:\s*String\(row\[12\]'
) {

    $statusPattern =
        '(status:\s*String\(\s*row\[11\]\s*\|\|\s*"active"\s*\)\.trim\(\),)'

    if (
        $getBlock -notmatch
        $statusPattern
    ) {
        throw "ERROR: getProducts() status mapping not found."
    }

    $getBlock =
        [regex]::Replace(
            $getBlock,
            $statusPattern,
            '$1' + "`r`n" +
            '  visibility: String(row[12] || "visible").trim(),',
            1
        )

    # Shift fields after Status.
    $getBlock =
        $getBlock.Replace(
            'String(row[12] || "")',
            'String(row[13] || "")'
        )

    $getBlock =
        $getBlock.Replace(
            'String(row[13] || "").trim()',
            'String(row[14] || "").trim()'
        )

    $getBlock =
        $getBlock.Replace(
            'String(row[14] || "").trim()',
            'String(row[15] || "").trim()'
        )

    $getBlock =
        $getBlock.Replace(
            'row[15] === "" ||',
            'row[16] === "" ||'
        )

    $getBlock =
        $getBlock.Replace(
            ': String(row[15])',
            ': String(row[16])'
        )

    $getBlock =
        $getBlock.Replace(
            'row[16] === "" ||',
            'row[17] === "" ||'
        )

    $getBlock =
        $getBlock.Replace(
            ': Number(row[16]);',
            ': Number(row[17]);'
        )

    Write-Host "[OK] getProducts() visibility mapping inserted." -ForegroundColor Green
}

$content =
    $content.Substring(0, $getStart) +
    $getBlock +
    $content.Substring($updateStart)

# ------------------------------------------------------------
# 5. UPDATE PRODUCTS
# ------------------------------------------------------------

$updateStart =
    $content.IndexOf("function updateProducts()")

$updateBlock =
    $content.Substring($updateStart)

$updateBlock =
    [regex]::Replace(
        $updateBlock,
        '(\.getRange\(\s*1,\s*1,\s*1,\s*)17(\s*\))',
        '${1}18${2}',
        2
    )

$updateBlock =
    [regex]::Replace(
        $updateBlock,
        '(\.getRange\(\s*2,\s*1,\s*rows\.length,\s*)17(\s*\))',
        '${1}18${2}',
        1
    )

if (
    $updateBlock -notmatch
    'product\.visibility'
) {

    $statusPattern =
        'String\(\s*product\.status\s*\|\|\s*"active"\s*\),'

    if (
        $updateBlock -notmatch
        $statusPattern
    ) {
        throw "ERROR: updateProducts() status row not found."
    }

    $updateBlock =
        [regex]::Replace(
            $updateBlock,
            $statusPattern,
            'String(product.status || "active"),' +
            "`r`n`r`n" +
            '            String(product.visibility || "visible"),',
            1
        )
}

$content =
    $content.Substring(0, $updateStart) +
    $updateBlock

Write-Host "[OK] updateProducts() changed to 18 columns." -ForegroundColor Green

# ------------------------------------------------------------
# 6. GET CATEGORIES ROUTE
# ------------------------------------------------------------

if (
    $content -notmatch
    'action\s*===\s*"categories"'
) {

    $pattern =
        '(?s)(if\s*\(\s*action\s*===\s*"products"\s*\)\s*\{.*?\n\s*\})'

    $match =
        [regex]::Match(
            $content,
            $pattern
        )

    if (-not $match.Success) {
        throw "ERROR: GET products route not found."
    }

    $route = @"

  if (
    action === "categories"
  ) {

    return jsonResponse({
      success: true,
      categories:
        getCategories()
    });

  }

"@

    $content =
        $content.Replace(
            $match.Value,
            $match.Value + $route
        )

    Write-Host "[OK] GET categories route added." -ForegroundColor Green
}

# ------------------------------------------------------------
# 7. CATEGORY POST ROUTES
# ------------------------------------------------------------

if (
    $content -notmatch
    'action\s*===\s*"createCategory"'
) {

    $pattern =
        '(?s)(if\s*\(\s*action\s*===\s*"updateProducts"\s*\)\s*\{.*?\n\s*\})'

    $match =
        [regex]::Match(
            $content,
            $pattern
        )

    if (-not $match.Success) {
        throw "ERROR: POST updateProducts route not found."
    }

    $routes = @"

  if (
    action === "createCategory"
  ) {

    return jsonResponse(
      createCategory(
        body.name
      )
    );

  }

  if (
    action === "updateCategoryVisibility"
  ) {

    return jsonResponse(
      updateCategoryVisibility(
        body.categoryId,
        body.visibility
      )
    );

  }

  if (
    action === "deleteCategory"
  ) {

    return jsonResponse(
      deleteCategory(
        body.categoryId
      )
    );

  }

"@

    $content =
        $content.Replace(
            $match.Value,
            $match.Value + $routes
        )

    Write-Host "[OK] Category POST routes added." -ForegroundColor Green
}

# ------------------------------------------------------------
# 8. WRITE
# ------------------------------------------------------------

Set-Content `
    -Path $path `
    -Value $content `
    -Encoding UTF8

# ------------------------------------------------------------
# 9. VERIFY
# ------------------------------------------------------------

$verify =
    Get-Content $path -Raw

$checks = @(
    'const CATEGORIES_SHEET_NAME = "Categories"',
    'function getCategories()',
    'function createCategory(name)',
    'function updateCategoryVisibility(',
    'function deleteCategory(',
    '"Visibility"',
    'visibility:',
    'product.visibility',
    'action === "categories"',
    'action === "createCategory"',
    'action === "updateCategoryVisibility"',
    'action === "deleteCategory"'
)

Write-Host ""
Write-Host "=== VERIFICATION ===" -ForegroundColor Cyan

$failed = 0

foreach ($check in $checks) {

    if ($verify.Contains($check)) {
        Write-Host "[OK] $check" -ForegroundColor Green
    }

    if (-not $verify.Contains($check)) {
        Write-Host "[MISSING] $check" -ForegroundColor Red
        $failed++
    }
}

Write-Host ""

if ($failed -gt 0) {
    Write-Host "FAILED: $failed verification item(s)." -ForegroundColor Red
    Write-Host "Backup: $backup" -ForegroundColor Yellow
    exit 1
}

Write-Host "SUCCESS: Code.gs backend category system updated." -ForegroundColor Green
Write-Host "Backup: $backup" -ForegroundColor DarkGray
