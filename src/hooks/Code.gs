/* =========================================================
   PEARLSKINO BD
   GOOGLE APPS SCRIPT API
   STORE + ADMIN + WHATSAPP + MESSENGER
   =========================================================

   PUBLIC GET
   ---------------------------------------------------------
   ?action=ping
   ?action=storeSettings
   ?action=products

   ADMIN GET
   ---------------------------------------------------------
   ?action=auth&token=...
   ?action=orders&token=...
   ?action=customers&token=...
   ?action=settings&token=...

   PUBLIC POST
   ---------------------------------------------------------
   {
     "action": "login",
     "password": "..."
   }

   ADMIN POST
   ---------------------------------------------------------
   {
     "action": "logout",
     "token": "..."
   }

   {
     "action": "updateStatus",
     "token": "...",
     "orderId": "...",
     "status": "..."
   }

   {
     "action": "updateSettings",
     "token": "...",
     "settings": {...}
   }

   {
     "action": "updateProducts",
     "token": "...",
     "products": [...]
   }

   {
     "action": "uploadProductImage",
     "token": "...",
     "image": "data:image/jpeg;base64,...",
     "fileName": "optional-name.jpg",
     "mimeType": "image/jpeg"
   }

   {
     "action": "changePassword",
     "token": "...",
     "currentPassword": "...",
     "newPassword": "..."
   }

   =========================================================
   IMPORTANT
   =========================================================

   PHONE NUMBERS ARE STORED AS TEXT.

   Example:

       01577100162

   will remain:

       01577100162

   WhatsApp and Messenger settings are stored in:

       Store Settings

   ========================================================= */


/* =========================================================
   CONFIGURATION
========================================================= */

const CONFIG = {

  /* -------------------------------------------------------
     ORDER SHEET
  ------------------------------------------------------- */

  SHEET_NAME: "",

  SETTINGS_SHEET_NAME: "Store Settings",

  PRODUCTS_SHEET_NAME: "Products",


  /* -------------------------------------------------------
     ORDER HEADERS
  ------------------------------------------------------- */

  ORDER_ID_HEADER: "Order ID",

  STATUS_HEADER: "Status",

  DEFAULT_STATUS: "New",


  /* -------------------------------------------------------
     SESSION
  ------------------------------------------------------- */

  SESSION_DAYS: 7,

  PASSWORD_PROPERTY:
    "PEARLSKINO_ADMIN_PASSWORD_HASH",

  SESSIONS_PROPERTY:
    "PEARLSKINO_ADMIN_SESSIONS",


  /* -------------------------------------------------------
     INITIAL ADMIN PASSWORD
  ------------------------------------------------------- */

  INITIAL_PASSWORD: "62316231",


  /* -------------------------------------------------------
     ALLOWED ORDER STATUSES
  ------------------------------------------------------- */

  ALLOWED_STATUSES: [

    "New",
    "Confirmed",
    "Processing",
    "Shipped",
    "Delivered",
    "Cancelled",

  ],

};


/* =========================================================
   DEFAULT STORE SETTINGS
========================================================= */

const DEFAULT_SETTINGS = {

  /* -------------------------------------------------------
     STORE
  ------------------------------------------------------- */

  storeName:
    "PearlSkino BD",

  tagline:
    "Pearly Glow",


  /* -------------------------------------------------------
     CONTACT
  ------------------------------------------------------- */

  phone:
    "01577100162",

  email:
    "ammageddonmadmax@gmail.com",


  /* -------------------------------------------------------
     WHATSAPP
  ------------------------------------------------------- */

  whatsappEnabled:
    true,

  whatsappNumber:
    "01577100162",


  /* -------------------------------------------------------
     MESSENGER
  ------------------------------------------------------- */

  messengerEnabled:
    true,

  messengerUrl:
    "https://m.me/pearlskinobd",


  /* -------------------------------------------------------
     DELIVERY
  ------------------------------------------------------- */

  deliveryCharge:
    99,

  freeDeliveryThreshold:
    0,


  /* -------------------------------------------------------
     ORDER METHODS
  ------------------------------------------------------- */

  codEnabled:
    true,

  pickupEnabled:
    true,


  /* -------------------------------------------------------
     ADMIN / INVENTORY
  ------------------------------------------------------- */

  lowStockThreshold:
    3,

  autoRefreshSeconds:
    30,

};


/* =========================================================
   SETTINGS TYPES
========================================================= */

const BOOLEAN_SETTINGS = [

  "whatsappEnabled",
  "messengerEnabled",
  "codEnabled",
  "pickupEnabled",

];


const NUMERIC_SETTINGS = [

  "deliveryCharge",
  "freeDeliveryThreshold",
  "lowStockThreshold",
  "autoRefreshSeconds",

];


const STRING_SETTINGS = [

  "storeName",
  "tagline",
  "phone",
  "email",
  "whatsappNumber",
  "messengerUrl",

];


/* =========================================================
   SETUP
========================================================= */

function setupPearlSkino() {

  const lock =
    LockService.getScriptLock();

  lock.waitLock(30000);

  try {

    const properties =
      PropertiesService
        .getScriptProperties();


    /* -----------------------------------------------------
       CREATE INITIAL PASSWORD
    ----------------------------------------------------- */

    let passwordHash =
      properties.getProperty(
        CONFIG.PASSWORD_PROPERTY
      );


    if (!passwordHash) {

      passwordHash =
        hashPassword(
          CONFIG.INITIAL_PASSWORD
        );

      properties.setProperty(
        CONFIG.PASSWORD_PROPERTY,
        passwordHash
      );

    }


    /* -----------------------------------------------------
       CREATE / REPAIR SETTINGS SHEET
    ----------------------------------------------------- */

    const sheet =
      getSettingsSheet();


    initializeSettingsSheet(
      sheet
    );


    return jsonResponse({

      success: true,

      message:
        "PearlSkino API setup completed.",

      settings:
        getSettings(),

    });


  } finally {

    lock.releaseLock();

  }

}


/* =========================================================
   PASSWORD HASH
========================================================= */

function hashPassword(password) {

  const bytes =
    Utilities.computeDigest(

      Utilities.DigestAlgorithm.SHA_256,

      String(password),

      Utilities.Charset.UTF_8

    );


  return bytes

    .map(function(byte) {

      const value =
        byte < 0
          ? byte + 256
          : byte;


      return value
        .toString(16)
        .padStart(2, "0");

    })

    .join("");

}


/* =========================================================
   VERIFY PASSWORD
========================================================= */

function verifyPassword(password) {

  const properties =
    PropertiesService
      .getScriptProperties();


  let storedHash =
    properties.getProperty(
      CONFIG.PASSWORD_PROPERTY
    );


  if (!storedHash) {

    storedHash =
      hashPassword(
        CONFIG.INITIAL_PASSWORD
      );

    properties.setProperty(
      CONFIG.PASSWORD_PROPERTY,
      storedHash
    );

  }


  return (
    hashPassword(password) ===
    storedHash
  );

}


/* =========================================================
   SESSION STORAGE
========================================================= */

function getSessions() {

  const properties =
    PropertiesService
      .getScriptProperties();


  const raw =
    properties.getProperty(
      CONFIG.SESSIONS_PROPERTY
    );


  if (!raw) {

    return {};

  }


  try {

    return JSON.parse(raw);

  } catch (error) {

    return {};

  }

}


/* =========================================================
   SAVE SESSIONS
========================================================= */

function saveSessions(sessions) {

  PropertiesService
    .getScriptProperties()
    .setProperty(

      CONFIG.SESSIONS_PROPERTY,

      JSON.stringify(sessions)

    );

}


/* =========================================================
   CREATE SESSION
========================================================= */

function createSession() {

  const token =
    Utilities.getUuid() +
    "-" +
    Utilities.getUuid();


  const sessions =
    getSessions();


  const expiresAt =
    Date.now() +
    (
      CONFIG.SESSION_DAYS *
      24 *
      60 *
      60 *
      1000
    );


  sessions[token] = {

    expiresAt:
      expiresAt,

  };


  saveSessions(
    sessions
  );


  return {

    token:
      token,

    expiresAt:
      new Date(
        expiresAt
      ).toISOString(),

  };

}


/* =========================================================
   AUTHENTICATE TOKEN
========================================================= */

function authenticateToken(token) {

  token =
    String(
      token || ""
    ).trim();


  if (!token) {

    return {

      success: false,

      authenticated: false,

      error:
        "Authentication required.",

    };

  }


  const sessions =
    getSessions();


  const session =
    sessions[token];


  if (!session) {

    return {

      success: false,

      authenticated: false,

      error:
        "Invalid admin session.",

    };

  }


  const expiresAt =
    Number(
      session.expiresAt
    );


  if (
    !Number.isFinite(
      expiresAt
    )
  ) {

    delete sessions[token];

    saveSessions(
      sessions
    );


    return {

      success: false,

      authenticated: false,

      error:
        "Invalid admin session.",

    };

  }


  if (
    Date.now() >=
    expiresAt
  ) {

    delete sessions[token];

    saveSessions(
      sessions
    );


    return {

      success: false,

      authenticated: false,

      error:
        "Admin session expired.",

    };

  }


  return {

    success: true,

    authenticated: true,

  };

}


/* =========================================================
   INVALIDATE SESSION
========================================================= */

function invalidateSession(token) {

  token =
    String(
      token || ""
    ).trim();


  if (!token) {

    return;

  }


  const sessions =
    getSessions();


  if (
    sessions[token]
  ) {

    delete sessions[token];

    saveSessions(
      sessions
    );

  }

}


/* =========================================================
   INVALIDATE ALL SESSIONS
========================================================= */

function invalidateAllSessions() {

  PropertiesService
    .getScriptProperties()
    .deleteProperty(
      CONFIG.SESSIONS_PROPERTY
    );

}


/* =========================================================
   GET TOKEN FROM REQUEST
========================================================= */

function getTokenFromRequest(e) {

  if (
    e &&
    e.parameter &&
    e.parameter.token
  ) {

    return String(
      e.parameter.token
    ).trim();

  }


  return "";

}


/* =========================================================
   REQUIRE AUTH
========================================================= */

function requireAuth(e) {

  return authenticateToken(
    getTokenFromRequest(e)
  );

}


/* =========================================================
   WEB APP — GET
========================================================= */

function doGet(e) {

  try {

    const action =
      e &&
      e.parameter &&
      e.parameter.action

        ? String(
            e.parameter.action
          ).trim()

        : "ping";


    /* =====================================================
       PUBLIC — PING
    ===================================================== */

    if (
      action === "ping"
    ) {

      return jsonResponse({

        success: true,

        message:
          "PearlSkino BD API is running.",

        timestamp:
          new Date().toISOString(),

      });

    }


    /* =====================================================
       PUBLIC — STORE SETTINGS
    ===================================================== */

    if (
      action === "storeSettings"
    ) {

      const settings =
        getPublicStoreSettings();


      return jsonResponse({

        success: true,

        settings:
          settings,

      });

    }


    /* =====================================================
       PUBLIC — PRODUCTS

       Anyone can read the product catalog.
       No admin token required, same as storeSettings.
    ===================================================== */

    if (
      action === "products"
    ) {

      return jsonResponse({

        success: true,

        products:
          getProducts(),

      });

    }


    /* =====================================================
       ADMIN — AUTH
    ===================================================== */

    if (
      action === "auth"
    ) {

      const auth =
        requireAuth(e);


      if (
        !auth.success
      ) {

        return jsonResponse({

          success: false,

          authenticated: false,

          error:
            auth.error,

        });

      }


      return jsonResponse({

        success: true,

        authenticated: true,

      });

    }


    /* =====================================================
       EVERYTHING ELSE REQUIRES AUTH
    ===================================================== */

    const auth =
      requireAuth(e);


    if (
      !auth.success
    ) {

      return jsonResponse({

        success: false,

        authenticated: false,

        error:
          auth.error ||
          "Authentication required.",

      });

    }


    /* =====================================================
       ORDERS
    ===================================================== */

    if (
      action === "orders"
    ) {

      return jsonResponse({

        success: true,

        authenticated: true,

        orders:
          getOrders(),

      });

    }


    /* =====================================================
       CUSTOMERS
    ===================================================== */

    if (
      action === "customers"
    ) {

      return jsonResponse({

        success: true,

        authenticated: true,

        customers:
          getCustomers(),

      });

    }


    /* =====================================================
       ADMIN SETTINGS
    ===================================================== */

    if (
      action === "settings"
    ) {

      return jsonResponse({

        success: true,

        authenticated: true,

        settings:
          getSettings(),

      });

    }


    return jsonResponse({

      success: false,

      error:
        "Unknown action.",

    });


  } catch (error) {

    return jsonResponse({

      success: false,

      error:
        error &&
        error.message

          ? error.message

          : "Request failed.",

    });

  }

}


/* =========================================================
   WEB APP — POST
========================================================= */

function doPost(e) {

  try {

    const body =
      parseRequestBody(e);


    const action =
      String(
        body.action || ""
      ).trim();


    /* =====================================================
       LOGIN
    ===================================================== */

    if (
      action === "login"
    ) {

      const password =
        String(
          body.password || ""
        );


      if (!password) {

        return jsonResponse({

          success: false,

          error:
            "Password is required.",

        });

      }


      if (
        !verifyPassword(password)
      ) {

        return jsonResponse({

          success: false,

          authenticated: false,

          error:
            "Incorrect admin password.",

        });

      }


      const session =
        createSession();


      return jsonResponse({

        success: true,

        authenticated: true,

        token:
          session.token,

        expiresAt:
          session.expiresAt,

      });

    }


    /* =====================================================
       LOGOUT
    ===================================================== */

    if (
      action === "logout"
    ) {

      const token =
        String(
          body.token || ""
        ).trim();


      if (token) {

        invalidateSession(
          token
        );

      }


      return jsonResponse({

        success: true,

        authenticated: false,

      });

    }


    /* =====================================================
       AUTH FOR OTHER POST ACTIONS
    ===================================================== */

    const auth =
      authenticateToken(
        body.token
      );


    if (
      !auth.success
    ) {

      return jsonResponse({

        success: false,

        authenticated: false,

        error:
          auth.error ||
          "Authentication required.",

      });

    }


    /* =====================================================
       UPDATE ORDER STATUS
    ===================================================== */

    if (
      action === "updateStatus"
    ) {

      return jsonResponse(

        updateOrderStatus(

          body.orderId,

          body.status

        )

      );

    }


    /* =====================================================
       UPDATE SETTINGS
    ===================================================== */

    if (
      action === "updateSettings"
    ) {

      return jsonResponse(

        updateSettings(
          body.settings
        )

      );

    }


    /* =====================================================
       UPDATE PRODUCTS

       The admin panel always sends the COMPLETE product
       array (same pattern the React admin already uses
       for local publishing). This overwrites the whole
       catalog in one shot.
    ===================================================== */

    if (
      action === "updateProducts"
    ) {

      return jsonResponse(

        updateProducts(
          body.products
        )

      );

    }


    /* =====================================================
       UPLOAD PRODUCT IMAGE

       Accepts a base64 image (from the phone or PC),
       stores it in Google Drive, and returns a public
       viewable URL to save on the product.
    ===================================================== */

    if (
      action === "uploadProductImage"
    ) {

      return jsonResponse(

        uploadProductImage(

          body.image,

          body.fileName,

          body.mimeType

        )

      );

    }


    /* =====================================================
       CHANGE PASSWORD
    ===================================================== */

    if (
      action === "changePassword"
    ) {

      return jsonResponse(

        changeAdminPassword(

          body.currentPassword,

          body.newPassword

        )

      );

    }


    return jsonResponse({

      success: false,

      error:
        "Unknown action.",

    });


  } catch (error) {

    return jsonResponse({

      success: false,

      error:
        error &&
        error.message

          ? error.message

          : "Request failed.",

    });

  }

}


/* =========================================================
   PARSE REQUEST BODY
========================================================= */

function parseRequestBody(e) {

  if (
    !e ||
    !e.postData ||
    !e.postData.contents
  ) {

    return {};

  }


  try {

    const parsed =
      JSON.parse(
        e.postData.contents
      );


    if (
      !parsed ||
      typeof parsed !== "object"
    ) {

      return {};

    }


    return parsed;


  } catch (error) {

    throw new Error(
      "Invalid JSON request body."
    );

  }

}


/* =========================================================
   CHANGE ADMIN PASSWORD
========================================================= */

function changeAdminPassword(
  currentPassword,
  newPassword
) {

  currentPassword =
    String(
      currentPassword || ""
    );


  newPassword =
    String(
      newPassword || ""
    );


  if (!currentPassword) {

    return {

      success: false,

      error:
        "Current password is required.",

    };

  }


  if (!newPassword) {

    return {

      success: false,

      error:
        "New password is required.",

    };

  }


  if (
    newPassword.length < 6
  ) {

    return {

      success: false,

      error:
        "New password must be at least 6 characters.",

    };

  }


  if (
    !verifyPassword(
      currentPassword
    )
  ) {

    return {

      success: false,

      error:
        "Current password is incorrect.",

    };

  }


  PropertiesService
    .getScriptProperties()
    .setProperty(

      CONFIG.PASSWORD_PROPERTY,

      hashPassword(
        newPassword
      )

    );


  invalidateAllSessions();


  return {

    success: true,

    authenticated: false,

    message:
      "Admin password changed successfully. Please log in again.",

  };

}


/* =========================================================
   ORDER SHEET
========================================================= */

function getOrderSheet() {

  const spreadsheet =
    SpreadsheetApp
      .getActiveSpreadsheet();


  let sheet;


  if (
    CONFIG.SHEET_NAME
  ) {

    sheet =
      spreadsheet.getSheetByName(
        CONFIG.SHEET_NAME
      );

  } else {

    sheet =
      spreadsheet.getSheets()[0];

  }


  if (!sheet) {

    throw new Error(
      "Order response sheet was not found."
    );

  }


  return sheet;

}


/* =========================================================
   ENSURE ORDER HEADERS
========================================================= */

function ensureHeaders() {

  const sheet =
    getOrderSheet();


  const lastColumn =
    Math.max(
      sheet.getLastColumn(),
      1
    );


  const headers =
    sheet

      .getRange(
        1,
        1,
        1,
        lastColumn
      )

      .getValues()[0]

      .map(function(header) {

        return String(
          header
        ).trim();

      });


  let orderIdIndex =
    headers.indexOf(
      CONFIG.ORDER_ID_HEADER
    );


  let statusIndex =
    headers.indexOf(
      CONFIG.STATUS_HEADER
    );


  if (
    orderIdIndex === -1
  ) {

    orderIdIndex =
      headers.length;


    sheet
      .getRange(
        1,
        orderIdIndex + 1
      )
      .setValue(
        CONFIG.ORDER_ID_HEADER
      );


    headers.push(
      CONFIG.ORDER_ID_HEADER
    );

  }


  if (
    statusIndex === -1
  ) {

    statusIndex =
      headers.length;


    sheet
      .getRange(
        1,
        statusIndex + 1
      )
      .setValue(
        CONFIG.STATUS_HEADER
      );


    headers.push(
      CONFIG.STATUS_HEADER
    );

  }


  return {

    sheet:
      sheet,

    headers:
      headers,

    orderIdIndex:
      orderIdIndex,

    statusIndex:
      statusIndex,

  };

}


/* =========================================================
   GENERATE ORDER ID
========================================================= */

function generateOrderId(
  timestamp,
  rowNumber
) {

  const date =
    timestamp instanceof Date
      ? timestamp
      : new Date();


  const year =
    Utilities.formatDate(

      date,

      Session.getScriptTimeZone(),

      "yyyy"

    );


  const month =
    Utilities.formatDate(

      date,

      Session.getScriptTimeZone(),

      "MM"

    );


  const day =
    Utilities.formatDate(

      date,

      Session.getScriptTimeZone(),

      "dd"

    );


  return (

    "PS-" +
    year +
    month +
    day +
    "-" +
    String(
      rowNumber
    ).padStart(
      3,
      "0"
    )

  );

}


/* =========================================================
   CHECK REAL ORDER DATA
========================================================= */

function rowHasOrderData(
  row,
  orderIdIndex,
  statusIndex
) {

  return row.some(

    function(
      cell,
      columnIndex
    ) {

      if (
        columnIndex ===
        orderIdIndex
      ) {

        return false;

      }


      if (
        columnIndex ===
        statusIndex
      ) {

        return false;

      }


      return (
        String(
          cell == null
            ? ""
            : cell
        ).trim() !== ""
      );

    }

  );

}


/* =========================================================
   CLEAN EMPTY ROWS
========================================================= */

function cleanEmptyRows() {

  const result =
    ensureHeaders();


  const sheet =
    result.sheet;

  const headers =
    result.headers;

  const orderIdIndex =
    result.orderIdIndex;

  const statusIndex =
    result.statusIndex;


  const lastRow =
    sheet.getLastRow();


  if (
    lastRow < 2
  ) {

    return;

  }


  const values =
    sheet

      .getRange(
        2,
        1,
        lastRow - 1,
        headers.length
      )

      .getValues();


  const orderIdValues = [];

  const statusValues = [];


  values.forEach(
    function(row) {

      const hasOrderData =
        rowHasOrderData(

          row,

          orderIdIndex,

          statusIndex

        );


      if (!hasOrderData) {

        orderIdValues.push(
          [""]
        );

        statusValues.push(
          [""]
        );

      } else {

        orderIdValues.push([

          row[
            orderIdIndex
          ] || "",

        ]);


        statusValues.push([

          row[
            statusIndex
          ] || "",

        ]);

      }

    }
  );


  sheet
    .getRange(
      2,
      orderIdIndex + 1,
      orderIdValues.length,
      1
    )
    .setValues(
      orderIdValues
    );


  sheet
    .getRange(
      2,
      statusIndex + 1,
      statusValues.length,
      1
    )
    .setValues(
      statusValues
    );

}


/* =========================================================
   NORMALIZE ORDERS
========================================================= */

function normalizeOrders() {

  const result =
    ensureHeaders();


  const sheet =
    result.sheet;

  const headers =
    result.headers;

  const orderIdIndex =
    result.orderIdIndex;

  const statusIndex =
    result.statusIndex;


  const lastRow =
    sheet.getLastRow();


  if (
    lastRow < 2
  ) {

    return;

  }


  const values =
    sheet

      .getRange(
        2,
        1,
        lastRow - 1,
        headers.length
      )

      .getValues();


  const orderIds = [];

  const statuses = [];


  values.forEach(
    function(
      row,
      index
    ) {

      const rowNumber =
        index + 2;


      const hasOrderData =
        rowHasOrderData(

          row,

          orderIdIndex,

          statusIndex

        );


      if (!hasOrderData) {

        orderIds.push(
          [""]
        );

        statuses.push(
          [""]
        );

        return;

      }


      const timestamp =
        row[0];


      let orderId =
        row[
          orderIdIndex
        ];


      let status =
        row[
          statusIndex
        ];


      if (!orderId) {

        orderId =
          generateOrderId(

            timestamp,

            rowNumber

          );

      }


      if (!status) {

        status =
          CONFIG.DEFAULT_STATUS;

      }


      orderIds.push([
        orderId,
      ]);


      statuses.push([
        status,
      ]);

    }
  );


  sheet
    .getRange(
      2,
      orderIdIndex + 1,
      orderIds.length,
      1
    )
    .setValues(
      orderIds
    );


  sheet
    .getRange(
      2,
      statusIndex + 1,
      statuses.length,
      1
    )
    .setValues(
      statuses
    );

}


/* =========================================================
   GET ORDERS
========================================================= */

function getOrders() {

  cleanEmptyRows();

  normalizeOrders();


  const result =
    ensureHeaders();


  const sheet =
    result.sheet;

  const headers =
    result.headers;

  const orderIdIndex =
    result.orderIdIndex;

  const statusIndex =
    result.statusIndex;


  const lastRow =
    sheet.getLastRow();


  if (
    lastRow < 2
  ) {

    return [];

  }


  const values =
    sheet

      .getRange(
        2,
        1,
        lastRow - 1,
        headers.length
      )

      .getValues();


  const orders = [];


  values.forEach(
    function(
      row,
      index
    ) {

      const hasOrderData =
        rowHasOrderData(

          row,

          orderIdIndex,

          statusIndex

        );


      if (!hasOrderData) {

        return;

      }


      const object = {};


      headers.forEach(
        function(
          header,
          columnIndex
        ) {

          object[header] =
            formatCell(
              row[columnIndex]
            );

        }
      );


      orders.push({

        orderId:
          object["Order ID"] || "",

        timestamp:
          object["Timestamp"] || "",

        name:
          object["Name"] || "",

        phone:
          normalizePhone(
            object["Phone"] || ""
          ),

        email:
          object["Email"] || "",

        address:
          object["Address"] || "",

        area:
          object["Area"] || "",

        products:
          object["Products"] || "",

        quantity:
          object["Quantity"] || "",

        total:
          object["Total"] || "",

        payment:
          object["Payment"] || "",

        delivery:
          object["Delivery"] || "",

        note:
          object["Note"] || "",

        status:
          object["Status"] ||
          CONFIG.DEFAULT_STATUS,

        rowNumber:
          index + 2,

      });

    }
  );


  return orders.reverse();

}


/* =========================================================
   CUSTOMERS
========================================================= */

function getCustomers() {

  const orders =
    getOrders();


  const customerMap =
    new Map();


  orders.forEach(
    function(order) {

      const key =
        String(

          order.phone ||

          order.email ||

          order.name ||

          ""

        )
          .trim()
          .toLowerCase();


      if (!key) {

        return;

      }


      if (
        !customerMap.has(key)
      ) {

        customerMap.set(
          key,
          {

            id:
              key,

            name:
              order.name,

            phone:
              order.phone,

            email:
              order.email,

            address:
              order.address,

            area:
              order.area,

            orders:
              0,

            totalSpent:
              0,

            lastOrder:
              order.timestamp,

            orderIds:
              [],

          }
        );

      }


      const customer =
        customerMap.get(
          key
        );


      customer.orders += 1;


      customer.totalSpent +=
        parseAmount(
          order.total
        );


      customer.orderIds.push(
        order.orderId
      );


      if (
        String(
          order.timestamp
        ) >
        String(
          customer.lastOrder
        )
      ) {

        customer.lastOrder =
          order.timestamp;

      }


      if (
        !customer.address &&
        order.address
      ) {

        customer.address =
          order.address;

      }


      if (
        !customer.area &&
        order.area
      ) {

        customer.area =
          order.area;

      }


      if (
        !customer.email &&
        order.email
      ) {

        customer.email =
          order.email;

      }

    }
  );


  return Array

    .from(
      customerMap.values()
    )

    .sort(
      function(a, b) {

        return (
          b.orders -
          a.orders
        );

      }
    );

}


/* =========================================================
   UPDATE ORDER STATUS
========================================================= */

function updateOrderStatus(
  orderId,
  newStatus
) {

  orderId =
    String(
      orderId || ""
    ).trim();


  newStatus =
    String(
      newStatus || ""
    ).trim();


  if (!orderId) {

    return {

      success: false,

      error:
        "Order ID is required.",

    };

  }


  if (
    !CONFIG.ALLOWED_STATUSES.includes(
      newStatus
    )
  ) {

    return {

      success: false,

      error:
        "Invalid order status.",

    };

  }


  const lock =
    LockService.getScriptLock();


  lock.waitLock(30000);


  try {

    const result =
      ensureHeaders();


    const sheet =
      result.sheet;

    const orderIdIndex =
      result.orderIdIndex;

    const statusIndex =
      result.statusIndex;


    const lastRow =
      sheet.getLastRow();


    if (
      lastRow < 2
    ) {

      return {

        success: false,

        error:
          "No orders found.",

      };

    }


    const orderIds =
      sheet

        .getRange(
          2,
          orderIdIndex + 1,
          lastRow - 1,
          1
        )

        .getValues();


    for (
      let i = 0;
      i < orderIds.length;
      i++
    ) {

      if (
        String(
          orderIds[i][0]
        ).trim() ===
        orderId
      ) {

        sheet

          .getRange(
            i + 2,
            statusIndex + 1
          )

          .setValue(
            newStatus
          );


        SpreadsheetApp
          .flush();


        return {

          success: true,

          orderId:
            orderId,

          status:
            newStatus,

        };

      }

    }


    return {

      success: false,

      error:
        "Order ID not found.",

    };


  } finally {

    lock.releaseLock();

  }

}


/* =========================================================
   SETTINGS SHEET
========================================================= */

function getSettingsSheet() {

  const spreadsheet =
    SpreadsheetApp
      .getActiveSpreadsheet();


  let sheet =
    spreadsheet.getSheetByName(
      CONFIG.SETTINGS_SHEET_NAME
    );


  if (!sheet) {

    sheet =
      spreadsheet.insertSheet(
        CONFIG.SETTINGS_SHEET_NAME
      );

  }


  initializeSettingsSheet(
    sheet
  );


  return sheet;

}


/* =========================================================
   INITIALIZE SETTINGS SHEET
========================================================= */

function initializeSettingsSheet(
  sheet
) {

  /* -------------------------------------------------------
     HEADER
  ------------------------------------------------------- */

  if (
    sheet.getRange("A1").getValue() !==
    "Setting"
  ) {

    sheet
      .getRange("A1:B1")
      .setValues([

        [
          "Setting",
          "Value",
        ],

      ]);

  }


  /* -------------------------------------------------------
     BUILD EXISTING MAP
  ------------------------------------------------------- */

  const lastRow =
    sheet.getLastRow();


  const existing = {};


  if (
    lastRow >= 2
  ) {

    const values =
      sheet

        .getRange(
          2,
          1,
          lastRow - 1,
          2
        )

        .getValues();


    values.forEach(
      function(
        row,
        index
      ) {

        const key =
          String(
            row[0] || ""
          ).trim();


        if (key) {

          existing[key] =
            index + 2;

        }

      }
    );

  }


  /* -------------------------------------------------------
     CREATE MISSING SETTINGS
  ------------------------------------------------------- */

  Object.keys(
    DEFAULT_SETTINGS
  ).forEach(
    function(key) {

      if (
        existing[key]
      ) {

        return;

      }


      sheet.appendRow([

        key,

        DEFAULT_SETTINGS[key],

      ]);

    }
  );


  /* -------------------------------------------------------
     PHONE / EMAIL / WHATSAPP = TEXT
  ------------------------------------------------------- */

  const finalLastRow =
    sheet.getLastRow();


  if (
    finalLastRow >= 2
  ) {

    const values =
      sheet

        .getRange(
          2,
          1,
          finalLastRow - 1,
          2
        )

        .getValues();


    values.forEach(
      function(
        row,
        index
      ) {

        const key =
          String(
            row[0] || ""
          ).trim();


        if (
          key === "phone" ||
          key === "whatsappNumber" ||
          key === "email"
        ) {

          const cell =
            sheet.getRange(
              index + 2,
              2
            );


          cell.setNumberFormat(
            "@"
          );


          let value =
            String(
              row[1] == null
                ? ""
                : row[1]
            ).trim();


          if (
            key === "phone" ||
            key === "whatsappNumber"
          ) {

            value =
              normalizePhone(
                value
              );

          }


          cell.setValue(
            value
          );

        }

      }
    );

  }


  sheet
    .getRange("A1:B1")
    .setFontWeight(
      "bold"
    );

}


/* =========================================================
   GET SETTINGS
========================================================= */

function getSettings() {

  const sheet =
    getSettingsSheet();


  const lastRow =
    sheet.getLastRow();


  const settings = {

    ...DEFAULT_SETTINGS,

  };


  if (
    lastRow < 2
  ) {

    return settings;

  }


  const values =
    sheet

      .getRange(
        2,
        1,
        lastRow - 1,
        2
      )

      .getValues();


  values.forEach(
    function(row) {

      const key =
        String(
          row[0] || ""
        ).trim();


      if (!key) {

        return;

      }


      if (
        Object.prototype.hasOwnProperty.call(
          DEFAULT_SETTINGS,
          key
        )
      ) {

        settings[key] =
          parseSettingValue(
            key,
            row[1]
          );

      }

    }
  );


  /* -------------------------------------------------------
     NORMALIZE CONTACT DATA
  ------------------------------------------------------- */

  settings.phone =
    normalizePhone(
      settings.phone
    );


  settings.whatsappNumber =
    normalizePhone(
      settings.whatsappNumber
    );


  settings.email =
    String(
      settings.email || ""
    ).trim();


  settings.messengerUrl =
    String(
      settings.messengerUrl || ""
    ).trim();


  return settings;

}


/* =========================================================
   PUBLIC STORE SETTINGS
========================================================= */

function getPublicStoreSettings() {

  const settings =
    getSettings();


  const whatsappNumber =
    normalizePhone(
      settings.whatsappNumber ||
      settings.phone
    );


  const whatsappUrl =
    buildWhatsAppUrl(
      whatsappNumber
    );


  return {

    /* -----------------------------------------------------
       STORE
    ----------------------------------------------------- */

    storeName:
      settings.storeName,

    tagline:
      settings.tagline,


    /* -----------------------------------------------------
       PHONE
    ----------------------------------------------------- */

    phone:
      normalizePhone(
        settings.phone
      ),


    /* -----------------------------------------------------
       EMAIL
    ----------------------------------------------------- */

    email:
      settings.email,


    /* -----------------------------------------------------
       WHATSAPP
    ----------------------------------------------------- */

    whatsappEnabled:
      Boolean(
        settings.whatsappEnabled
      ),

    whatsappNumber:
      whatsappNumber,

    whatsappUrl:
      whatsappUrl,


    /* -----------------------------------------------------
       MESSENGER
    ----------------------------------------------------- */

    messengerEnabled:
      Boolean(
        settings.messengerEnabled
      ),

    messengerUrl:
      settings.messengerUrl,


    /* -----------------------------------------------------
       DELIVERY
    ----------------------------------------------------- */

    deliveryCharge:
      settings.deliveryCharge,

    freeDeliveryThreshold:
      settings.freeDeliveryThreshold,


    /* -----------------------------------------------------
       PAYMENT
    ----------------------------------------------------- */

    codEnabled:
      Boolean(
        settings.codEnabled
      ),

    pickupEnabled:
      Boolean(
        settings.pickupEnabled
      ),

  };

}


/* =========================================================
   PARSE SETTING VALUE
========================================================= */

function parseSettingValue(
  key,
  value
) {

  /* -------------------------------------------------------
     BOOLEAN
  ------------------------------------------------------- */

  if (
    BOOLEAN_SETTINGS.includes(
      key
    )
  ) {

    if (
      typeof value ===
      "boolean"
    ) {

      return value;

    }


    const normalized =
      String(
        value
      )
        .trim()
        .toLowerCase();


    return (
      normalized ===
      "true"
    );

  }


  /* -------------------------------------------------------
     NUMERIC
  ------------------------------------------------------- */

  if (
    NUMERIC_SETTINGS.includes(
      key
    )
  ) {

    const number =
      Number(
        value
      );


    return Number.isFinite(
      number
    )

      ? number

      : DEFAULT_SETTINGS[key];

  }


  /* -------------------------------------------------------
     PHONE
  ------------------------------------------------------- */

  if (
    key === "phone" ||
    key === "whatsappNumber"
  ) {

    return normalizePhone(
      value
    );

  }


  /* -------------------------------------------------------
     EMAIL / URL
  ------------------------------------------------------- */

  if (
    key === "email" ||
    key === "messengerUrl"
  ) {

    return String(
      value == null
        ? ""
        : value
    ).trim();

  }


  /* -------------------------------------------------------
     OTHER STRINGS
  ------------------------------------------------------- */

  return String(
    value == null
      ? ""
      : value
  ).trim();

}


/* =========================================================
   NORMALIZE PHONE
========================================================= */

function normalizePhone(value) {

  if (
    value == null
  ) {

    return "";

  }


  let phone =
    String(
      value
    ).trim();


  /* -------------------------------------------------------
     Remove formatting
  ------------------------------------------------------- */

  phone =
    phone.replace(
      /[\s()-]/g,
      ""
    );


  /* -------------------------------------------------------
     Convert Bangladesh +880 format
  ------------------------------------------------------- */

  if (
    phone.indexOf("+880") === 0
  ) {

    phone =
      "0" +
      phone.substring(4);

  }


  if (
    phone.indexOf("880") === 0 &&
    phone.length === 13
  ) {

    phone =
      "0" +
      phone.substring(3);

  }


  /* -------------------------------------------------------
     Restore removed leading zero
  ------------------------------------------------------- */

  if (
    /^\d{10}$/.test(
      phone
    )
  ) {

    phone =
      "0" +
      phone;

  }


  return phone;

}


/* =========================================================
   BUILD WHATSAPP URL
========================================================= */

function buildWhatsAppUrl(
  phone
) {

  phone =
    normalizePhone(
      phone
    );


  if (!phone) {

    return "";

  }


  /* -------------------------------------------------------
     WhatsApp requires international number.
     
     01577100162
           ↓
     8801577100162
  ------------------------------------------------------- */

  let international =
    phone;


  if (
    international.indexOf("0") === 0
  ) {

    international =
      "880" +
      international.substring(1);

  }


  international =
    international.replace(
      /\D/g,
      ""
    );


  if (!international) {

    return "";

  }


  return (
    "https://wa.me/" +
    international
  );

}


/* =========================================================
   UPDATE SETTINGS
========================================================= */

function updateSettings(
  incomingSettings
) {

  if (
    !incomingSettings ||
    typeof incomingSettings !== "object" ||
    Array.isArray(incomingSettings)
  ) {

    return {

      success: false,

      error:
        "Invalid settings data.",

    };

  }


  const lock =
    LockService.getScriptLock();


  lock.waitLock(30000);


  try {

    /* -----------------------------------------------------
       ALWAYS READ LATEST SHEET DATA FIRST
    ----------------------------------------------------- */

    const currentSettings =
      getSettings();


    const settings = {

      ...currentSettings,

    };


    /* -----------------------------------------------------
       ONLY UPDATE KNOWN SETTINGS
    ----------------------------------------------------- */

    Object.keys(
      DEFAULT_SETTINGS
    ).forEach(
      function(key) {

        if (
          Object.prototype.hasOwnProperty.call(
            incomingSettings,
            key
          )
        ) {

          settings[key] =
            parseSettingValue(
              key,
              incomingSettings[key]
            );

        }

      }
    );


    /* -----------------------------------------------------
       NORMALIZE CONTACT DATA
    ----------------------------------------------------- */

    settings.phone =
      normalizePhone(
        settings.phone
      );


    settings.whatsappNumber =
      normalizePhone(
        settings.whatsappNumber ||
        settings.phone
      );


    settings.email =
      String(
        settings.email || ""
      ).trim();


    settings.messengerUrl =
      String(
        settings.messengerUrl || ""
      ).trim();


    /* -----------------------------------------------------
       SAVE
    ----------------------------------------------------- */

    const sheet =
      getSettingsSheet();


    const lastRow =
      sheet.getLastRow();


    const values =
      lastRow >= 2

        ? sheet
            .getRange(
              2,
              1,
              lastRow - 1,
              2
            )
            .getValues()

        : [];


    const rowMap = {};


    values.forEach(
      function(
        row,
        index
      ) {

        const key =
          String(
            row[0] || ""
          ).trim();


        if (key) {

          rowMap[key] =
            index + 2;

        }

      }
    );


    /* -----------------------------------------------------
       WRITE EVERY SETTING
    ----------------------------------------------------- */

    Object.keys(
      DEFAULT_SETTINGS
    ).forEach(
      function(key) {

        let rowNumber =
          rowMap[key];


        if (!rowNumber) {

          sheet.appendRow([

            key,

            settings[key],

          ]);


          rowNumber =
            sheet.getLastRow();

        }


        const cell =
          sheet.getRange(
            rowNumber,
            2
          );


        /* -------------------------------------------------
           PHONE / WHATSAPP / EMAIL = TEXT
        ------------------------------------------------- */

        if (
          key === "phone" ||
          key === "whatsappNumber" ||
          key === "email"
        ) {

          cell.setNumberFormat(
            "@"
          );

        }


        cell.setValue(
          settings[key]
        );

      }
    );


    SpreadsheetApp.flush();


    /* -----------------------------------------------------
       READ BACK FROM SHEET
       
       This is intentional.
       
       It proves that the data actually persisted.
    ----------------------------------------------------- */

    const savedSettings =
      getSettings();


    return {

      success: true,

      settings:
        savedSettings,

      publicSettings:
        getPublicStoreSettings(),

      message:
        "Store settings saved successfully.",

    };


  } finally {

    lock.releaseLock();

  }

}


/* =========================================================
   REPAIR PHONE SETTINGS
========================================================= */

function repairSettingsPhone() {

  const sheet =
    getSettingsSheet();


  const lastRow =
    sheet.getLastRow();


  if (
    lastRow < 2
  ) {

    return;

  }


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


    if (
      key !== "phone" &&
      key !== "whatsappNumber"
    ) {

      continue;

    }


    const normalized =
      normalizePhone(
        values[i][1]
      );


    const cell =
      sheet.getRange(
        i + 2,
        2
      );


    cell.setNumberFormat(
      "@"
    );


    cell.setValue(
      normalized
    );

  }

}


/* =========================================================
   PARSE AMOUNT
========================================================= */

function parseAmount(value) {

  if (
    typeof value === "number"
  ) {

    return value;

  }


  const cleaned =
    String(
      value || ""
    )
      .replace(
        /[^\d.-]/g,
        ""
      );


  const number =
    Number(
      cleaned
    );


  return Number.isFinite(
    number
  )

    ? number

    : 0;

}


/* =========================================================
   FORMAT CELL
========================================================= */

function formatCell(value) {

  if (
    value instanceof Date
  ) {

    return Utilities.formatDate(

      value,

      Session.getScriptTimeZone(),

      "yyyy-MM-dd HH:mm:ss"

    );

  }


  return value == null
    ? ""
    : String(value);

}


/* =========================================================
   PRODUCTS SHEET

   Products are stored as ONE JSON blob in a "Key | Value"
   sheet (same idea as Store Settings, just one row).

   This avoids having to map every product field (tags
   array, nullable oldPrice, etc.) to its own spreadsheet
   column — the admin panel already works with a single
   JS array, so we just persist that array as-is.

   NOTE: a single Google Sheets cell holds up to ~50,000
   characters. That's plenty for a few hundred products
   with normal text fields and Drive image links, but if
   the catalog ever gets huge, this is the limit to watch.
========================================================= */

function getProductsSheet() {

  const spreadsheet =
    SpreadsheetApp
      .getActiveSpreadsheet();


  let sheet =
    spreadsheet.getSheetByName(
      CONFIG.PRODUCTS_SHEET_NAME
    );


  if (!sheet) {

    sheet =
      spreadsheet.insertSheet(
        CONFIG.PRODUCTS_SHEET_NAME
      );


    sheet
      .getRange("A1:B1")
      .setValues([

        [
          "Key",
          "Value",
        ],

      ]);


    sheet
      .getRange("A1:B1")
      .setFontWeight(
        "bold"
      );


    sheet
      .getRange("A2")
      .setValue(
        "products"
      );


    sheet
      .getRange("B2")
      .setValue(
        "[]"
      );

  }


  return sheet;

}


/* =========================================================
   GET PRODUCTS
========================================================= */

function getProducts() {

  const sheet =
    getProductsSheet();


  const lastRow =
    sheet.getLastRow();


  if (
    lastRow < 2
  ) {

    return [];

  }


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


    if (
      key === "products"
    ) {

      const raw =
        String(
          values[i][1] || "[]"
        );


      try {

        const parsed =
          JSON.parse(raw);


        return Array.isArray(
          parsed
        )
          ? parsed
          : [];


      } catch (error) {

        return [];

      }

    }

  }


  return [];

}


/* =========================================================
   UPDATE PRODUCTS
========================================================= */

function updateProducts(products) {

  if (
    !Array.isArray(products)
  ) {

    return {

      success: false,

      error:
        "Products must be an array.",

    };

  }


  const lock =
    LockService.getScriptLock();


  lock.waitLock(30000);


  try {

    const sheet =
      getProductsSheet();


    const lastRow =
      sheet.getLastRow();


    let targetRow = 2;


    if (
      lastRow >= 2
    ) {

      const values =
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
        i < values.length;
        i++
      ) {

        if (
          String(
            values[i][0] || ""
          ).trim() ===
          "products"
        ) {

          targetRow =
            i + 2;

          break;

        }

      }

    }


    sheet
      .getRange(
        targetRow,
        1
      )
      .setValue(
        "products"
      );


    sheet
      .getRange(
        targetRow,
        2
      )
      .setValue(
        JSON.stringify(
          products
        )
      );


    SpreadsheetApp.flush();


    return {

      success: true,

      count:
        products.length,

      products:
        getProducts(),

      message:
        "Products saved successfully.",

    };


  } finally {

    lock.releaseLock();

  }

}


/* =========================================================
   UPLOAD PRODUCT IMAGE (to Google Drive)

   Accepts a base64 data URL (e.g. "data:image/jpeg;base64,...")
   or raw base64, decodes it, saves it into a Drive folder,
   makes it viewable via link, and returns a hotlinkable URL.
========================================================= */

function uploadProductImage(
  base64Data,
  fileName,
  mimeType
) {

  if (!base64Data) {

    return {

      success: false,

      error:
        "No image data provided.",

    };

  }


  try {

    const cleanBase64 =
      String(base64Data).replace(
        /^data:[^;]+;base64,/,
        ""
      );


    const bytes =
      Utilities.base64Decode(
        cleanBase64
      );


    const resolvedMimeType =
      mimeType ||
      "image/jpeg";


    const resolvedFileName =
      fileName ||
      (
        "product-" +
        Date.now() +
        ".jpg"
      );


    const blob =
      Utilities.newBlob(
        bytes,
        resolvedMimeType,
        resolvedFileName
      );


    const folder =
      getProductImagesFolder();


    const file =
      folder.createFile(
        blob
      );


    file.setSharing(
      DriveApp.Access.ANYONE_WITH_LINK,
      DriveApp.Permission.VIEW
    );


    const fileId =
      file.getId();


    /*
     * This is the standard hotlink format for
     * a publicly-shared Drive file.
     */

    const url =
      "https://drive.google.com/uc?export=view&id=" +
      fileId;


    return {

      success: true,

      url:
        url,

      fileId:
        fileId,

    };


  } catch (error) {

    return {

      success: false,

      error:
        error &&
        error.message

          ? error.message

          : "Image upload failed.",

    };

  }

}


/* =========================================================
   PRODUCT IMAGES FOLDER

   All uploaded product photos live in one Drive folder
   so they're easy to find, and so we're not creating a
   loose file at the root of Drive on every upload.
========================================================= */

function getProductImagesFolder() {

  const folderName =
    "PearlSkino Product Images";


  const folders =
    DriveApp.getFoldersByName(
      folderName
    );


  if (
    folders.hasNext()
  ) {

    return folders.next();

  }


  return DriveApp.createFolder(
    folderName
  );

}


/* =========================================================
   JSON RESPONSE
========================================================= */

function jsonResponse(data) {

  return ContentService

    .createTextOutput(
      JSON.stringify(
        data
      )
    )

    .setMimeType(
      ContentService.MimeType.JSON
    );

}
