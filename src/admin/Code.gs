/* =========================================================
   PEARLSKINO BD  -  GOOGLE APPS SCRIPT API  (v4)
   Store  +  Admin  +  Customer accounts  +  Notifications
   =========================================================

   HOW TO USE
   ---------------------------------------------------------
   1. Paste this whole file into your Apps Script project (Code.gs).
   2. Run  setupPearlSkino  once (Run menu) and accept permissions.
   3. Deploy > Manage deployments > Edit > New version > Deploy.
      (Keep the same Web app URL: Execute as ME, access ANYONE.)
   4. Project Settings > Time zone > (GMT+06:00) Asia/Dhaka.

   The first sheet of the spreadsheet stays your ORDERS sheet (the
   Google Form response sheet). Every other sheet is created and
   repaired automatically by setupPearlSkino.

   PUBLIC  (GET)   ?action=ping | bootstrap | storeSettings | products |
                   logo | reviews | content | together | product | sitemap
   PUBLIC  (POST)  placeOrder | trackOrder | contact | validateCoupon |
                   customerRegister | customerLogin | customerMe |
                   customerOrders | customerClaimOrder | customerUpdate |
                   customerWishlist | customerForgot | customerReset |
                   submitReview | cartSave | stockNotify | login
   ADMIN   (POST)  everything else, always with {token}. See the router
                   at the bottom of this file (ADMIN_ROUTES).

   SECRETS (API keys / tokens) are kept in Script Properties, never in
   the spreadsheet and never sent to the browser.
   ========================================================= */

const API_VERSION = "4.0.0";

const CONFIG = {
  SETTINGS_SHEET_NAME: "Store Settings",
  PRODUCTS_SHEET_NAME: "Products",
  CATEGORIES_SHEET_NAME: "Categories",

  ORDER_ID_HEADER: "Order ID",
  STATUS_HEADER: "Status",
  DEFAULT_STATUS: "New",

  SESSION_DAYS: 7,
  CUSTOMER_SESSION_DAYS: 30,

  /* legacy owner password (kept so your current login keeps working) */
  PASSWORD_PROPERTY: "PEARLSKINO_ADMIN_PASSWORD_HASH",
  INITIAL_PASSWORD: "62316231",

  /* statuses an order can have, in normal order of progress */
  ALLOWED_STATUSES: [
    "New", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled", "Returned"
  ],
  /* statuses that no longer count as sales */
  DEAD_STATUSES: ["Cancelled", "Returned"],

  PAYMENT_STATUSES: ["Unpaid", "Pending verification", "Paid", "Refunded"],

  MAX_ITEMS_PER_ORDER: 40,
  MAX_QTY_PER_LINE: 20,
  CONTENT_MAX_LEN: 20000,
  VIDEO_HARD_MAX_MB: 12,
  REVIEW_PHOTO_MAX: 3,
  REVIEW_PHOTO_MAX_KB: 450,
  ABANDONED_KEEP_DAYS: 30,
  BROADCAST_MAX: 100,
  CACHE_SECONDS: 600,
  PBKDF_ROUNDS: 150
};

/* ---------------------------------------------------------
   Role -> permission map
--------------------------------------------------------- */
const PERMISSIONS = {
  owner: ["*"],
  manager: [
    "orders.view", "orders.edit", "orders.trash", "orders.notify",
    "products.view", "products.edit", "products.delete",
    "inventory.view", "inventory.adjust",
    "customers.view", "customers.edit", "customers.broadcast",
    "coupons.manage", "content.edit", "banners.manage", "reviews.moderate",
    "messages.manage", "reports.view", "finance.view",
    "settings.edit", "notifications.test", "activity.view", "backups.view"
  ],
  staff: [
    "orders.view", "orders.edit", "orders.notify",
    "products.view", "inventory.view",
    "customers.view", "messages.manage", "reviews.moderate", "reports.view"
  ]
};

/* ---------------------------------------------------------
   Sheet schemas.   k = key used in code,  h = header text,
   al = extra header spellings accepted,  t = value type
   t:  str | text | num | money | bool | json | phone
--------------------------------------------------------- */
const SCHEMAS = {
  orders: [
    { k: "orderId", h: "Order ID", al: ["orderid", "id"] },
    { k: "timestamp", h: "Timestamp", t: "date", al: ["time", "date", "createdat"] },
    { k: "name", h: "Name", al: ["fullname", "customername"] },
    { k: "phone", h: "Phone", t: "phone", al: ["phonenumber", "mobile"] },
    { k: "email", h: "Email", al: ["emailaddress"] },
    { k: "address", h: "Address", t: "text", al: ["deliveryaddress"] },
    { k: "area", h: "Area" },
    { k: "products", h: "Products", t: "text" },
    { k: "quantity", h: "Quantity", t: "num" },
    { k: "total", h: "Total", t: "money" },
    { k: "payment", h: "Payment" },
    { k: "delivery", h: "Delivery" },
    { k: "note", h: "Note", t: "text", al: ["alittlenote", "customernote"] },
    { k: "costData", h: "Cost Data", t: "text", al: ["costdata", "cost"] },
    { k: "status", h: "Status" },
    { k: "subtotal", h: "Subtotal", t: "money" },
    { k: "discount", h: "Discount", t: "money" },
    { k: "coupon", h: "Coupon" },
    { k: "deliveryCharge", h: "Delivery Charge", t: "money" },
    { k: "zone", h: "Zone" },
    { k: "whatsapp", h: "WhatsApp", t: "phone" },
    { k: "customerId", h: "Customer ID" },
    { k: "items", h: "Items JSON", t: "json" },
    { k: "paymentStatus", h: "Payment Status" },
    { k: "payRef", h: "Payment Ref" },
    { k: "adminNote", h: "Admin Note", t: "text" },
    { k: "cancelReason", h: "Cancel Reason", t: "text" },
    { k: "trashed", h: "Trashed" },
    { k: "source", h: "Source" },
    { k: "stockApplied", h: "Stock Applied" },
    { k: "idemKey", h: "Idempotency Key" },
    { k: "trackingCode", h: "Tracking Code" },
    { k: "updatedAt", h: "Updated At" }
  ],

  products: [
    { k: "id", h: "ID" },
    { k: "name", h: "Name" },
    { k: "brand", h: "Brand" },
    { k: "category", h: "Category" },
    { k: "subtitle", h: "Subtitle" },
    { k: "tags", h: "Tags", t: "text" },
    { k: "price", h: "Price", t: "num" },
    { k: "oldPrice", h: "Old Price", t: "num" },
    { k: "rating", h: "Rating", t: "num" },
    { k: "reviews", h: "Reviews", t: "num" },
    { k: "stock", h: "Stock", t: "num" },
    { k: "status", h: "Status" },
    { k: "description", h: "Description", t: "text" },
    { k: "image", h: "Image", t: "text" },
    { k: "alt", h: "Alt" },
    { k: "notes", h: "Notes", t: "text" },
    { k: "costPrice", h: "Cost Price", t: "num" },
    { k: "visibility", h: "Visibility" },
    { k: "sku", h: "SKU" },
    { k: "images", h: "Images", t: "json" },
    { k: "features", h: "Features", t: "json" },
    { k: "specs", h: "Specs", t: "json" },
    { k: "flags", h: "Flags", t: "json" },
    { k: "variantLabel", h: "Variant Label" },
    { k: "variants", h: "Variants", t: "json" },
    { k: "videos", h: "Videos", t: "json" },
    { k: "lowStock", h: "Low Stock Threshold", t: "num" },
    { k: "createdAt", h: "Created At" },
    { k: "updatedAt", h: "Updated At" }
  ],

  categories: [
    { k: "id", h: "ID" },
    { k: "name", h: "Name" },
    { k: "visibility", h: "Visibility" },
    { k: "sort", h: "Sort", t: "num" },
    { k: "blurb", h: "Blurb", t: "text" }
  ],

  settings: [
    { k: "key", h: "Setting" },
    { k: "value", h: "Value", t: "text" }
  ],

  content: [
    { k: "key", h: "Key" },
    { k: "value", h: "Value", t: "text" },
    { k: "draft", h: "Draft", t: "text" },
    { k: "updatedAt", h: "Updated At" },
    { k: "updatedBy", h: "Updated By" }
  ],

  contentHistory: [
    { k: "id", h: "ID" },
    { k: "time", h: "Time" },
    { k: "key", h: "Key" },
    { k: "oldValue", h: "Old Value", t: "text" },
    { k: "newValue", h: "New Value", t: "text" },
    { k: "actor", h: "Actor" }
  ],

  orderHistory: [
    { k: "time", h: "Time" },
    { k: "orderId", h: "Order ID" },
    { k: "actor", h: "Actor" },
    { k: "action", h: "Action" },
    { k: "from", h: "From" },
    { k: "to", h: "To" },
    { k: "note", h: "Note", t: "text" },
    { k: "visible", h: "Customer Visible" }
  ],

  returns: [
    { k: "id", h: "ID" },
    { k: "orderId", h: "Order ID" },
    { k: "created", h: "Created" },
    { k: "type", h: "Type" },
    { k: "items", h: "Items JSON", t: "json" },
    { k: "amount", h: "Amount", t: "money" },
    { k: "reason", h: "Reason", t: "text" },
    { k: "status", h: "Status" },
    { k: "restock", h: "Restock", t: "bool" },
    { k: "restocked", h: "Restocked", t: "bool" },
    { k: "note", h: "Note", t: "text" },
    { k: "updated", h: "Updated" }
  ],

  inventoryLog: [
    { k: "time", h: "Time" },
    { k: "productId", h: "Product ID" },
    { k: "product", h: "Product" },
    { k: "variantId", h: "Variant" },
    { k: "change", h: "Change", t: "num" },
    { k: "before", h: "Before", t: "num" },
    { k: "after", h: "After", t: "num" },
    { k: "reason", h: "Reason" },
    { k: "ref", h: "Reference" },
    { k: "actor", h: "Actor" }
  ],

  activity: [
    { k: "time", h: "Time" },
    { k: "actor", h: "Actor" },
    { k: "role", h: "Role" },
    { k: "action", h: "Action" },
    { k: "target", h: "Target" },
    { k: "details", h: "Details", t: "text" }
  ],

  notifyLog: [
    { k: "time", h: "Time" },
    { k: "channel", h: "Channel" },
    { k: "to", h: "To" },
    { k: "event", h: "Event" },
    { k: "ref", h: "Reference" },
    { k: "status", h: "Status" },
    { k: "detail", h: "Detail", t: "text" }
  ],

  admins: [
    { k: "id", h: "ID" },
    { k: "username", h: "Username" },
    { k: "name", h: "Name" },
    { k: "role", h: "Role" },
    { k: "hash", h: "Password Hash" },
    { k: "active", h: "Active", t: "bool" },
    { k: "sessionVersion", h: "Session Version", t: "num" },
    { k: "mustChange", h: "Must Change Password", t: "bool" },
    { k: "created", h: "Created" },
    { k: "lastLogin", h: "Last Login" }
  ],

  accounts: [
    { k: "id", h: "ID" },
    { k: "name", h: "Name" },
    { k: "phone", h: "Phone", t: "phone" },
    { k: "email", h: "Email" },
    { k: "hash", h: "Password Hash" },
    { k: "addresses", h: "Addresses JSON", t: "json" },
    { k: "wishlist", h: "Wishlist JSON", t: "json" },
    { k: "sessionVersion", h: "Session Version", t: "num" },
    { k: "created", h: "Created" },
    { k: "lastLogin", h: "Last Login" },
    { k: "resetHash", h: "Reset Code Hash" },
    { k: "resetExpires", h: "Reset Expires", t: "num" },
    { k: "disabled", h: "Disabled", t: "bool" }
  ],

  customerFlags: [
    { k: "phone", h: "Phone", t: "phone" },
    { k: "name", h: "Name" },
    { k: "blocked", h: "Blocked", t: "bool" },
    { k: "blockReason", h: "Block Reason", t: "text" },
    { k: "note", h: "Note", t: "text" },
    { k: "tags", h: "Tags" },
    { k: "hidden", h: "Hidden", t: "bool" },
    { k: "updatedAt", h: "Updated At" }
  ],

  coupons: [
    { k: "code", h: "Code" },
    { k: "type", h: "Type" },
    { k: "value", h: "Value", t: "num" },
    { k: "minOrder", h: "Min Order", t: "num" },
    { k: "maxDiscount", h: "Max Discount", t: "num" },
    { k: "starts", h: "Starts", t: "day" },
    { k: "expires", h: "Expires", t: "day" },
    { k: "limit", h: "Usage Limit", t: "num" },
    { k: "perCustomer", h: "Per Customer", t: "num" },
    { k: "used", h: "Used", t: "num" },
    { k: "active", h: "Active", t: "bool" },
    { k: "description", h: "Description", t: "text" },
    { k: "created", h: "Created" }
  ],

  banners: [
    { k: "id", h: "ID" },
    { k: "title", h: "Title" },
    { k: "subtitle", h: "Subtitle", t: "text" },
    { k: "image", h: "Image", t: "text" },
    { k: "link", h: "Link", t: "text" },
    { k: "button", h: "Button Text" },
    { k: "active", h: "Active", t: "bool" },
    { k: "sort", h: "Sort", t: "num" },
    { k: "starts", h: "Starts", t: "day" },
    { k: "ends", h: "Ends", t: "day" }
  ],

  reviews: [
    { k: "id", h: "ID" },
    { k: "productId", h: "Product ID" },
    { k: "name", h: "Name" },
    { k: "customerId", h: "Customer ID" },
    { k: "rating", h: "Rating", t: "num" },
    { k: "title", h: "Title" },
    { k: "body", h: "Body", t: "text" },
    { k: "status", h: "Status" },
    { k: "verified", h: "Verified Purchase", t: "bool" },
    { k: "reply", h: "Store Reply", t: "text" },
    { k: "photos", h: "Photos", t: "json" },
    { k: "created", h: "Created" }
  ],

  messages: [
    { k: "id", h: "ID" },
    { k: "time", h: "Time" },
    { k: "name", h: "Name" },
    { k: "phone", h: "Phone", t: "phone" },
    { k: "email", h: "Email" },
    { k: "message", h: "Message", t: "text" },
    { k: "status", h: "Status" },
    { k: "note", h: "Note", t: "text" }
  ],

  customers: [
    { k: "key", h: "Customer Key" },
    { k: "phone", h: "Phone", t: "phone" },
    { k: "name", h: "Name" },
    { k: "email", h: "Email" },
    { k: "address", h: "Address", t: "text" },
    { k: "area", h: "Area" },
    { k: "source", h: "Source" },
    { k: "created", h: "Created" },
    { k: "lastOrderAt", h: "Last Order At" },
    { k: "deleted", h: "Deleted", t: "bool" },
    { k: "deletedAt", h: "Deleted At" }
  ],

  abandonedCarts: [
    { k: "id", h: "ID" },
    { k: "key", h: "Customer Key" },
    { k: "name", h: "Name" },
    { k: "phone", h: "Phone", t: "phone" },
    { k: "email", h: "Email" },
    { k: "items", h: "Items JSON", t: "json" },
    { k: "total", h: "Total", t: "money" },
    { k: "created", h: "Created" },
    { k: "updated", h: "Updated" },
    { k: "status", h: "Status" },
    { k: "contactedAt", h: "Contacted At" },
    { k: "note", h: "Note", t: "text" }
  ],

  stockAlerts: [
    { k: "id", h: "ID" },
    { k: "productId", h: "Product ID" },
    { k: "variantId", h: "Variant ID" },
    { k: "product", h: "Product" },
    { k: "variantLabel", h: "Variant" },
    { k: "name", h: "Name" },
    { k: "phone", h: "Phone", t: "phone" },
    { k: "email", h: "Email" },
    { k: "created", h: "Created" },
    { k: "status", h: "Status" },
    { k: "restocked", h: "Back In Stock", t: "bool" },
    { k: "notifiedAt", h: "Notified At" },
    { k: "via", h: "Notified Via" }
  ],

  backups: [
    { k: "id", h: "Snapshot ID" },
    { k: "part", h: "Part", t: "num" },
    { k: "time", h: "Time" },
    { k: "actor", h: "Actor" },
    { k: "reason", h: "Reason" },
    { k: "data", h: "Data", t: "text" }
  ]
};

const SHEET_NAMES = {
  orderHistory: "Order History",
  returns: "Returns",
  inventoryLog: "Inventory Log",
  activity: "Activity Log",
  notifyLog: "Notification Log",
  admins: "Admin Users",
  accounts: "Customer Accounts",
  customerFlags: "Customer Flags",
  coupons: "Coupons",
  banners: "Banners",
  reviews: "Reviews",
  messages: "Messages",
  content: "Site Content",
  contentHistory: "Content History",
  customers: "Customers",
  abandonedCarts: "Abandoned Carts",
  stockAlerts: "Stock Alerts",
  backups: "Catalog Backups"
};

/* ---------------------------------------------------------
   Store settings.  def = default,  t = type,  pub = sent to
   the public storefront.  Secrets are NOT here (see 09-notify).
--------------------------------------------------------- */
const SETTING_DEFS = {
  /* store */
  storeName: { t: "str", def: "PearlSkino BD", pub: 1 },
  tagline: { t: "str", def: "Pearly Glow", pub: 1 },
  logoUrl: { t: "str", def: "", pub: 1 },
  logoFileId: { t: "str", def: "", pub: 1 },
  logoFileName: { t: "str", def: "", pub: 1 },
  /* contact */
  phone: { t: "phone", def: "01577100162", pub: 1 },
  email: { t: "str", def: "ammageddonmadmax@gmail.com", pub: 1 },
  storeAddress: { t: "text", def: "", pub: 1 },
  whatsappEnabled: { t: "bool", def: true, pub: 1 },
  whatsappNumber: { t: "phone", def: "01577100162", pub: 1 },
  messengerEnabled: { t: "bool", def: true, pub: 1 },
  messengerUrl: { t: "str", def: "https://m.me/pearlskinobd", pub: 1 },
  /* social */
  facebookUrl: { t: "str", def: "", pub: 1 },
  instagramUrl: { t: "str", def: "", pub: 1 },
  tiktokUrl: { t: "str", def: "", pub: 1 },
  youtubeUrl: { t: "str", def: "", pub: 1 },
  /* delivery */
  deliveryCharge: { t: "num", def: 99, pub: 1 },
  freeDeliveryThreshold: { t: "num", def: 0, pub: 1 },
  deliveryZones: { t: "json", def: [], pub: 1 },
  /* payment */
  codEnabled: { t: "bool", def: true, pub: 1 },
  pickupEnabled: { t: "bool", def: true, pub: 1 },
  bkashEnabled: { t: "bool", def: false, pub: 1 },
  bkashNumber: { t: "str", def: "", pub: 1 },
  bkashType: { t: "str", def: "Personal", pub: 1 },
  bkashInstructions: { t: "text", def: "Send the total amount to our bKash number, then enter the transaction ID and the number you paid from.", pub: 1 },
  /* orders / accounts */
  minOrderAmount: { t: "num", def: 0, pub: 1 },
  guestCheckout: { t: "bool", def: true, pub: 1 },
  accountsEnabled: { t: "bool", def: true, pub: 1 },
  reviewsEnabled: { t: "bool", def: true, pub: 1 },
  reviewsAutoApprove: { t: "bool", def: false, pub: 0 },
  maintenanceMode: { t: "bool", def: false, pub: 1 },
  maintenanceMessage: { t: "text", def: "We are updating the store. Please check back soon.", pub: 1 },
  /* admin / inventory */
  lowStockThreshold: { t: "num", def: 3, pub: 0 },
  autoRefreshSeconds: { t: "num", def: 30, pub: 1 },
  /* homepage */
  homeSections: { t: "json", def: { marquee: true, hero: true, banners: true, flags: true, categories: true, recent: true, reviews: true, cta: true }, pub: 1 },
  homeCategoryLimit: { t: "num", def: 5, pub: 1 },
  homeFlagSections: {
    t: "json", pub: 1,
    def: {
      new: { on: true, limit: 8 },
      trending: { on: true, limit: 8 },
      featured: { on: true, limit: 8 },
      deal: { on: true, limit: 8 }
    }
  },
  /* storefront helpers (all can be switched off) */
  urgencyEnabled: { t: "bool", def: true, pub: 1 },
  urgencyThreshold: { t: "num", def: 5, pub: 1 },
  freeShipBar: { t: "bool", def: true, pub: 1 },
  welcomeCouponCode: { t: "str", def: "", pub: 1 },
  welcomeCouponAuto: { t: "bool", def: true, pub: 1 },
  stickyBarEnabled: { t: "bool", def: true, pub: 1 },
  recentlyViewedEnabled: { t: "bool", def: true, pub: 1 },
  liveSearchEnabled: { t: "bool", def: true, pub: 1 },
  relatedEnabled: { t: "bool", def: true, pub: 1 },
  togetherEnabled: { t: "bool", def: true, pub: 1 },
  stockAlertsEnabled: { t: "bool", def: true, pub: 1 },
  abandonedCartsEnabled: { t: "bool", def: true, pub: 1 },
  reviewPhotosEnabled: { t: "bool", def: true, pub: 1 },
  videoUploadMaxMb: { t: "num", def: 10, pub: 1 },
  /* admin-side helpers */
  abandonedMinutes: { t: "num", def: 60, pub: 0 },
  abandonedTemplate: { t: "text", def: "Hi {name}, you left something in your bag at {store}: {items}. Finish your order here: {link}", pub: 0 },
  restockTemplate: { t: "text", def: "Hi {name}, good news! {product} is back in stock at {store}. Order here: {link}", pub: 0 },
  vipMinSpent: { t: "num", def: 10000, pub: 0 },
  vipMinOrders: { t: "num", def: 5, pub: 0 },
  inactiveDays: { t: "num", def: 60, pub: 0 },
  notifyLowStockDigest: { t: "bool", def: true, pub: 0 },
  invoiceFooter: { t: "text", def: "Thank you for shopping with us!", pub: 0 },
  /* SEO + analytics */
  siteUrl: { t: "str", def: "https://pearlskino-bd.vercel.app", pub: 1 },
  seoTitle: { t: "str", def: "PearlSkino BD | Skincare & Fragrance in Bangladesh", pub: 1 },
  seoDescription: { t: "text", def: "Authentic skincare, cosmetics and fragrances, carefully selected and delivered across Bangladesh.", pub: 1 },
  seoKeywords: { t: "str", def: "skincare, fragrance, perfume, cosmetics, Bangladesh", pub: 1 },
  seoImage: { t: "str", def: "", pub: 1 },
  seoIndex: { t: "bool", def: true, pub: 1 },
  fbPixelId: { t: "str", def: "", pub: 1 },
  gaMeasurementId: { t: "str", def: "", pub: 1 },
  googleSiteVerification: { t: "str", def: "", pub: 1 },
  /* notifications (non-secret part) */
  notifyEmailEnabled: { t: "bool", def: true, pub: 0 },
  notifyEmailTo: { t: "str", def: "ammageddonmadmax@gmail.com", pub: 0 },
  notifyChannel: { t: "str", def: "none", pub: 0 },
  notifyPhone: { t: "phone", def: "01577100162", pub: 0 },
  notifyOnNewOrder: { t: "bool", def: true, pub: 0 },
  notifyOnLowStock: { t: "bool", def: true, pub: 0 },
  customerEmailEnabled: { t: "bool", def: true, pub: 0 },
  customerWhatsappMode: { t: "str", def: "button", pub: 0 },
  customerNotifyStatuses: { t: "json", def: ["Confirmed", "Shipped", "Delivered", "Cancelled"], pub: 0 },
  emailSenderName: { t: "str", def: "PearlSkino BD", pub: 0 },
  waTemplates: {
    t: "json", pub: 0,
    def: {
      New: "Hi {name}, we received your order {orderId} (total {total}). Thank you for choosing {store}!",
      Confirmed: "Hi {name}, your order {orderId} is confirmed. We will pack it with care. Track: {trackUrl}",
      Processing: "Hi {name}, we are preparing your order {orderId}. Track: {trackUrl}",
      Shipped: "Hi {name}, your order {orderId} is on the way! Total to pay: {total}. Track: {trackUrl}",
      Delivered: "Hi {name}, your order {orderId} was delivered. We hope you love it! - {store}",
      Cancelled: "Hi {name}, your order {orderId} has been cancelled. Please message us if you need help. - {store}",
      Returned: "Hi {name}, we have recorded the return for order {orderId}. - {store}"
    }
  }
};

/* secrets live only in Script Properties */
const SECRET_KEYS = [
  "CALLMEBOT_APIKEY",
  "TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID",
  "META_WA_TOKEN", "META_WA_PHONE_ID", "META_WA_LANG",
  "META_WA_TEMPLATE_ADMIN", "META_WA_TEMPLATE_CUSTOMER"
];
/* =========================================================
   UTILITIES
========================================================= */

function fail(message, code) {
  const error = new Error(message);
  error.api = true;
  error.code = code || "bad_request";
  throw error;
}

function tz() {
  return Session.getScriptTimeZone() || "Asia/Dhaka";
}

function nowStr() {
  return Utilities.formatDate(new Date(), tz(), "yyyy-MM-dd HH:mm:ss");
}

function todayStr() {
  return Utilities.formatDate(new Date(), tz(), "yyyy-MM-dd");
}

function str(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function clip(value, max) {
  const s = str(value);
  return s.length > max ? s.slice(0, max) : s;
}

function num(value, fallback) {
  if (value === "" || value === null || value === undefined) {
    return fallback === undefined ? 0 : fallback;
  }
  const n = Number(value);
  return isFinite(n) ? n : (fallback === undefined ? 0 : fallback);
}

function taka(value) {
  return Math.round(Number(value) || 0);
}

function boolOf(value, fallback) {
  if (value === true || value === false) return value;
  if (value === null || value === undefined || value === "") {
    return fallback === undefined ? false : fallback;
  }
  const s = String(value).trim().toLowerCase();
  if (["true", "yes", "y", "1", "on", "checked"].indexOf(s) !== -1) return true;
  if (["false", "no", "n", "0", "off"].indexOf(s) !== -1) return false;
  return fallback === undefined ? false : fallback;
}

function jsonOf(value, fallback) {
  if (value && typeof value === "object") return value;
  const s = str(value);
  if (!s) return fallback;
  try {
    return JSON.parse(s);
  } catch (error) {
    return fallback;
  }
}

function uid(prefix) {
  return (prefix || "") + Utilities.getUuid().replace(/-/g, "").slice(0, 10);
}

function listOf(value) {
  if (Array.isArray(value)) return value;
  return [];
}

function pickKeys(source, keys) {
  const out = {};
  keys.forEach(function (key) {
    if (source && source[key] !== undefined) out[key] = source[key];
  });
  return out;
}

/* ---------------------------------------------------------
   PHONE NUMBERS  (kept exactly compatible with the old code)
--------------------------------------------------------- */
function normalizePhone(value) {
  let phone = str(value).replace(/[\s()\-]/g, "");
  if (!phone) return "";
  if (phone.indexOf("+880") === 0) phone = "0" + phone.slice(4);
  else if (/^880\d{10}$/.test(phone)) phone = "0" + phone.slice(3);
  else if (/^\d{10}$/.test(phone)) phone = "0" + phone;
  return phone;
}

function isBdMobile(phone) {
  return /^01[3-9]\d{8}$/.test(normalizePhone(phone));
}

function phoneIntl(value) {
  const phone = normalizePhone(value);
  if (!phone) return "";
  if (phone.charAt(0) === "0") return "880" + phone.slice(1);
  return phone.replace(/\D/g, "");
}

function buildWhatsAppUrl(number, text) {
  const intl = phoneIntl(number);
  if (!intl) return "";
  return "https://wa.me/" + intl + (text ? "?text=" + encodeURIComponent(text) : "");
}

function parseAmount(value) {
  if (typeof value === "number") return isFinite(value) ? value : 0;
  const cleaned = str(value).replace(/[^0-9.\-]/g, "");
  if (!cleaned) return 0;
  const n = Number(cleaned);
  return isFinite(n) ? n : 0;
}

function formatCell(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, tz(), "yyyy-MM-dd HH:mm:ss");
  }
  if (value === null || value === undefined) return "";
  return String(value);
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(str(value));
}

function isHttpUrl(value) {
  return /^https?:\/\/[^\s]+$/i.test(str(value));
}

function safeUrl(value) {
  const s = str(value);
  if (!s) return "";
  if (/^https?:\/\//i.test(s) || s.charAt(0) === "/") return s;
  return "";
}

/* ---------------------------------------------------------
   TEXT HELPERS
--------------------------------------------------------- */
function canonKey(value) {
  return str(value).replace(/\s+/g, " ").toLowerCase();
}

function squash(value) {
  return str(value).replace(/\s+/g, " ");
}

function titleCaseIfFlat(value) {
  const s = squash(value);
  if (s && (s === s.toLowerCase() || s === s.toUpperCase())) {
    return s.toLowerCase().replace(/(^|\s)(\S)/g, function (m, a, b) {
      return a + b.toUpperCase();
    });
  }
  return s;
}

function slugify(value) {
  return str(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function escapeHtml(value) {
  return String(value === null || value === undefined ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtMoney(value) {
  const n = taka(value);
  return "৳" + String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function fillTemplate(template, vars) {
  return String(template || "").replace(/\{(\w+)\}/g, function (m, key) {
    return vars[key] === undefined || vars[key] === null ? "" : String(vars[key]);
  });
}

/* ---------------------------------------------------------
   DATES (everything is stored as "yyyy-MM-dd HH:mm:ss" text)
--------------------------------------------------------- */
function dayOf(timeString) {
  return str(timeString).slice(0, 10);
}

function parseDay(day) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(str(day));
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

function addDays(day, delta) {
  const d = parseDay(day);
  if (!d) return day;
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function monthOf(day) {
  return str(day).slice(0, 7);
}

/* ---------------------------------------------------------
   CRYPTO HELPERS
--------------------------------------------------------- */
function bytesToHex(bytes) {
  return bytes.map(function (b) {
    const v = b < 0 ? b + 256 : b;
    return (v < 16 ? "0" : "") + v.toString(16);
  }).join("");
}

function sha256Hex(text) {
  return bytesToHex(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(text), Utilities.Charset.UTF_8)
  );
}

function hmacHex(data, key) {
  return bytesToHex(Utilities.computeHmacSha256Signature(String(data), String(key)));
}

function secretKey() {
  const properties = PropertiesService.getScriptProperties();
  let key = properties.getProperty("PS_SECRET");
  if (!key) {
    key = Utilities.getUuid() + Utilities.getUuid() + Utilities.getUuid();
    properties.setProperty("PS_SECRET", key);
  }
  return key;
}

function sign(data) {
  return hmacHex(data, secretKey()).slice(0, 40);
}

function constantTimeEquals(a, b) {
  const x = String(a);
  const y = String(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

function randomDigits(length) {
  let out = "";
  while (out.length < length) {
    out += String(parseInt(Utilities.getUuid().replace(/-/g, "").slice(0, 8), 16)).replace(/\D/g, "");
  }
  return out.slice(0, length);
}

function b64urlEncode(text) {
  return Utilities.base64EncodeWebSafe(String(text), Utilities.Charset.UTF_8).replace(/=+$/, "");
}

function b64urlDecode(text) {
  let s = String(text);
  while (s.length % 4) s += "=";
  const bytes = Utilities.base64DecodeWebSafe(s);
  return Utilities.newBlob(bytes).getDataAsString("UTF-8");
}

/* salted + iterated password hash.  format  v2$rounds$salt$hash  */
function makePasswordHash(password) {
  const salt = Utilities.getUuid().replace(/-/g, "").slice(0, 16);
  const rounds = CONFIG.PBKDF_ROUNDS;
  let digest = salt + ":" + password;
  for (let i = 0; i < rounds; i++) {
    digest = hmacHex(digest, salt + ":" + password);
  }
  return "v2$" + rounds + "$" + salt + "$" + digest;
}

function checkPasswordHash(password, stored) {
  const hash = str(stored);
  if (!hash) return false;
  if (hash.indexOf("v2$") === 0) {
    const parts = hash.split("$");
    if (parts.length !== 4) return false;
    const rounds = Number(parts[1]);
    const salt = parts[2];
    let digest = salt + ":" + password;
    for (let i = 0; i < rounds; i++) {
      digest = hmacHex(digest, salt + ":" + password);
    }
    return constantTimeEquals(digest, parts[3]);
  }
  /* legacy unsalted sha-256 (old owner password) */
  return constantTimeEquals(sha256Hex(password), hash);
}

function isLegacyHash(stored) {
  return str(stored).indexOf("v2$") !== 0;
}

/* ---------------------------------------------------------
   SCRIPT PROPERTIES (read once per request)
--------------------------------------------------------- */
let _propsMemo = null;

function allProps() {
  if (!_propsMemo) _propsMemo = PropertiesService.getScriptProperties().getProperties() || {};
  return _propsMemo;
}

function getProp(key, fallback) {
  const v = allProps()[key];
  return v === undefined || v === null || v === "" ? (fallback === undefined ? "" : fallback) : v;
}

function setProp(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, String(value));
  allProps()[key] = String(value);
}

function deleteProp(key) {
  PropertiesService.getScriptProperties().deleteProperty(key);
  delete allProps()[key];
}

/* ---------------------------------------------------------
   LOCK  (re-entrant inside one execution)
--------------------------------------------------------- */
let _lockDepth = 0;

function withLock(fn, waitMs) {
  if (_lockDepth > 0) return fn();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(waitMs || 25000)) {
    fail("The store is busy right now. Please try again in a moment.", "busy");
  }
  _lockDepth = 1;
  try {
    return fn();
  } finally {
    _lockDepth = 0;
    try { lock.releaseLock(); } catch (error) { /* ignore */ }
  }
}

/* ---------------------------------------------------------
   CACHE  (chunked, versioned)
--------------------------------------------------------- */
const CACHE_CHUNK = 30000;

function cacheGet(key) {
  try {
    const cache = CacheService.getScriptCache();
    const head = cache.get(key);
    if (!head) return null;
    if (head.charAt(0) !== "#") return JSON.parse(head);
    const count = Number(head.slice(1));
    const keys = [];
    for (let i = 0; i < count; i++) keys.push(key + ":" + i);
    const parts = cache.getAll(keys);
    let text = "";
    for (let j = 0; j < count; j++) {
      const piece = parts[key + ":" + j];
      if (piece === undefined || piece === null) return null;
      text += piece;
    }
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

function cachePut(key, value, seconds) {
  try {
    const cache = CacheService.getScriptCache();
    const text = JSON.stringify(value);
    const ttl = seconds || CONFIG.CACHE_SECONDS;
    if (text.length <= CACHE_CHUNK) {
      cache.put(key, text, ttl);
      return;
    }
    const chunks = {};
    let count = 0;
    for (let i = 0; i < text.length; i += CACHE_CHUNK) {
      chunks[key + ":" + count] = text.slice(i, i + CACHE_CHUNK);
      count++;
    }
    cache.putAll(chunks, ttl);
    cache.put(key, "#" + count, ttl);
  } catch (error) {
    /* cache is only an optimisation */
  }
}

function cacheDelete(key) {
  try {
    CacheService.getScriptCache().remove(key);
  } catch (error) { /* ignore */ }
}

function versionOf(name) {
  return getProp("PS_V_" + name, "0");
}

function bumpVersion() {
  const names = Array.prototype.slice.call(arguments);
  names.forEach(function (name) {
    setProp("PS_V_" + name, String(new Date().getTime()) + randomDigits(3));
  });
}

function cached(name, builder) {
  const key = "ps:" + name + ":" + versionOf(name);
  const hit = cacheGet(key);
  if (hit !== null) return hit;
  const fresh = builder();
  cachePut(key, fresh);
  return fresh;
}

/* ---------------------------------------------------------
   RATE LIMIT  (best-effort, via cache)
--------------------------------------------------------- */
function rateLimit(key, max, seconds, message) {
  try {
    const cache = CacheService.getScriptCache();
    const k = "rl:" + key;
    const current = Number(cache.get(k) || 0);
    if (current >= max) {
      fail(message || "Too many attempts. Please wait a few minutes and try again.", "rate_limited");
    }
    cache.put(k, String(current + 1), seconds);
  } catch (error) {
    if (error && error.api) throw error;
  }
}

/* look only (does not count) */
function rateCheck(key, max, message) {
  try {
    const current = Number(CacheService.getScriptCache().get("rl:" + key) || 0);
    if (current >= max) fail(message || "Too many attempts. Please wait a few minutes and try again.", "rate_limited");
  } catch (error) {
    if (error && error.api) throw error;
  }
}

/* count one event */
function rateHit(key, seconds) {
  try {
    const cache = CacheService.getScriptCache();
    const k = "rl:" + key;
    cache.put(k, String(Number(cache.get(k) || 0) + 1), seconds);
  } catch (error) { /* best effort */ }
}

function rateReset(key) {
  cacheDelete("rl:" + key);
}

/* ---------------------------------------------------------
   OUTPUT
--------------------------------------------------------- */
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
/* =========================================================
   TBL  -  tiny table layer on top of a sheet
   Matches columns by header text (case/space-insensitive),
   adds missing columns at the end, never reorders or removes
   anything you have in the sheet.
========================================================= */

function normHeader(value) {
  return String(value === null || value === undefined ? "" : value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const TEXT_TYPES = { str: 1, text: 1, phone: 1, day: 1, json: 1 };

class Tbl {
  constructor(name, schema, opts) {
    this.name = name;
    this.schema = schema;
    this.opts = opts || {};
    this._sheet = null;
    this._cols = null;
    this._headers = null;
    this._rows = null;
  }

  /* ---- open / repair ---- */
  open() {
    if (this._cols) return this._sheet;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = this.opts.first ? ss.getSheets()[0] : ss.getSheetByName(this.name);
    let created = false;
    if (!sheet) {
      sheet = ss.insertSheet(this.name);
      created = true;
    }
    const lastCol = Math.max(sheet.getLastColumn(), 1);
    let headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) {
      return String(h === null || h === undefined ? "" : h).trim();
    });
    if (headers.every(function (h) { return h === ""; })) headers = [];

    const cols = {};
    const used = {};
    this.schema.forEach(function (def) {
      const wanted = [normHeader(def.h), normHeader(def.k)].concat((def.al || []).map(normHeader));
      for (let i = 0; i < headers.length; i++) {
        if (!used[i] && wanted.indexOf(normHeader(headers[i])) !== -1) {
          cols[def.k] = i;
          used[i] = true;
          break;
        }
      }
    });

    const missing = this.schema.filter(function (def) { return cols[def.k] === undefined; });
    if (missing.length) {
      const start = headers.length;
      sheet.getRange(1, start + 1, 1, missing.length).setValues([missing.map(function (d) { return d.h; })]);
      missing.forEach(function (def, i) {
        cols[def.k] = start + i;
        headers.push(def.h);
      });
      try {
        sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
        if (created || start === 0) sheet.setFrozenRows(1);
      } catch (error) { /* cosmetic */ }
    }

    this._sheet = sheet;
    this._cols = cols;
    this._headers = headers;
    this.applyColumnFormats(false);
    return sheet;
  }

  applyColumnFormats(force) {
    const signature = this.schema.map(function (d) { return d.k + ":" + (d.t || "str"); }).join(",");
    const prop = "PS_FMT_" + this.name;
    if (!force && getProp(prop) === signature) return;
    try {
      const sheet = this._sheet;
      const rows = Math.max(sheet.getMaxRows() - 1, 1);
      const self = this;
      this.schema.forEach(function (def) {
        if (TEXT_TYPES[def.t || "str"]) {
          sheet.getRange(2, self._cols[def.k] + 1, rows, 1).setNumberFormat("@");
        }
      });
      setProp(prop, signature);
    } catch (error) { /* cosmetic only */ }
  }

  headers() {
    this.open();
    return this._headers.slice();
  }

  invalidate() {
    this._rows = null;
  }

  /* ---- value conversion ---- */
  readValue(def, raw) {
    const type = def.t || "str";
    switch (type) {
      case "num": return num(raw, 0);
      case "money": return parseAmount(raw);
      case "bool": return boolOf(raw, false);
      case "json": return jsonOf(raw, null);
      case "phone": return normalizePhone(formatCell(raw));
      case "date": return formatCell(raw);
      case "day": return raw instanceof Date
        ? Utilities.formatDate(raw, tz(), "yyyy-MM-dd")
        : str(raw);
      default: return str(formatCell(raw));
    }
  }

  writeValue(def, value) {
    const type = def.t || "str";
    if (value === null || value === undefined) return "";
    if (value instanceof Date) return value;
    switch (type) {
      case "num":
      case "money": return value === "" ? "" : num(value, 0);
      case "bool": return value === true || value === "true" ? true : false;
      case "json": return typeof value === "string" ? value : JSON.stringify(value);
      case "date": return value;
      default: return String(value);
    }
  }

  formatOf(def) {
    const type = def.t || "str";
    if (def.k === "timestamp" && this.opts.first) return "yyyy-mm-dd hh:mm:ss";
    if (TEXT_TYPES[type]) return "@";
    return "General";
  }

  isRow(obj) {
    if (this.opts.isRow) return this.opts.isRow(obj);
    const first = this.schema[0].k;
    return str(obj[first]) !== "";
  }

  /* ---- read ---- */
  readAll(force) {
    if (this._rows && !force) return this._rows;
    const sheet = this.open();
    const lastRow = sheet.getLastRow();
    const width = this._headers.length;
    const rows = [];
    if (lastRow >= 2) {
      const values = sheet.getRange(2, 1, lastRow - 1, width).getValues();
      for (let r = 0; r < values.length; r++) {
        const raw = values[r];
        const obj = { _row: r + 2 };
        for (let s = 0; s < this.schema.length; s++) {
          const def = this.schema[s];
          obj[def.k] = this.readValue(def, raw[this._cols[def.k]]);
        }
        if (this.isRow(obj)) rows.push(obj);
      }
    }
    this._rows = rows;
    return rows;
  }

  find(predicate) {
    const rows = this.readAll();
    for (let i = 0; i < rows.length; i++) {
      if (predicate(rows[i])) return rows[i];
    }
    return null;
  }

  findBy(key, value, loose) {
    const want = loose ? canonKey(value) : str(value);
    return this.find(function (row) {
      return (loose ? canonKey(row[key]) : str(row[key])) === want;
    });
  }

  filter(predicate) {
    return this.readAll().filter(predicate);
  }

  /* ---- write ---- */
  append(obj) {
    const sheet = this.open();
    const width = this._headers.length;
    const row = [];
    const formats = [];
    for (let i = 0; i < width; i++) {
      row.push("");
      formats.push("General");
    }
    for (let s = 0; s < this.schema.length; s++) {
      const def = this.schema[s];
      const col = this._cols[def.k];
      formats[col] = this.formatOf(def);
      if (obj[def.k] !== undefined) row[col] = this.writeValue(def, obj[def.k]);
    }
    const target = Math.max(sheet.getLastRow(), 1) + 1;
    const range = sheet.getRange(target, 1, 1, width);
    range.setNumberFormats([formats]);
    range.setValues([row]);
    this.invalidate();
    return target;
  }

  /* add many rows with one sheet write (fast backfills) */
  appendMany(list) {
    if (!list || !list.length) return;
    const sheet = this.open();
    const width = this._headers.length;
    const values = [];
    const formats = [];
    for (let n = 0; n < list.length; n++) {
      const row = [];
      const fmt = [];
      for (let i = 0; i < width; i++) {
        row.push("");
        fmt.push("General");
      }
      for (let s = 0; s < this.schema.length; s++) {
        const def = this.schema[s];
        const col = this._cols[def.k];
        fmt[col] = this.formatOf(def);
        if (list[n][def.k] !== undefined) row[col] = this.writeValue(def, list[n][def.k]);
      }
      values.push(row);
      formats.push(fmt);
    }
    const start = Math.max(sheet.getLastRow(), 1) + 1;
    const lastNeeded = start + values.length - 1;
    if (sheet.getMaxRows() < lastNeeded) sheet.insertRowsAfter(sheet.getMaxRows(), lastNeeded - sheet.getMaxRows());
    const range = sheet.getRange(start, 1, values.length, width);
    range.setNumberFormats(formats);
    range.setValues(values);
    this.invalidate();
  }

  update(rowNumber, patch) {
    const sheet = this.open();
    const keys = Object.keys(patch).filter(function (k) { return this._cols[k] !== undefined; }, this);
    if (!keys.length) return;
    let min = Infinity;
    let max = -1;
    for (let i = 0; i < keys.length; i++) {
      const c = this._cols[keys[i]];
      if (c < min) min = c;
      if (c > max) max = c;
    }
    const range = sheet.getRange(rowNumber, min + 1, 1, max - min + 1);
    const values = range.getValues();
    const defs = {};
    this.schema.forEach(function (d) { defs[d.k] = d; });
    for (let j = 0; j < keys.length; j++) {
      const key = keys[j];
      values[0][this._cols[key] - min] = this.writeValue(defs[key], patch[key]);
    }
    range.setValues(values);
    this.invalidate();
  }

  remove(rowNumber) {
    this.open().deleteRow(rowNumber);
    this.invalidate();
  }

  clearData() {
    const sheet = this.open();
    const lastRow = sheet.getLastRow();
    if (lastRow >= 2) sheet.getRange(2, 1, lastRow - 1, this._headers.length).clearContent();
    this.invalidate();
  }

  /* replace every data row (used for reorder and restore).
     New values are written first, leftovers cleared afterwards,
     so an interruption can never leave the sheet empty. */
  replaceAll(objects) {
    const sheet = this.open();
    const existing = Math.max(sheet.getLastRow() - 1, 0);
    const width = this._headers.length;
    const rows = objects.map(function (obj) {
      const row = [];
      for (let i = 0; i < width; i++) row.push("");
      for (let s = 0; s < this.schema.length; s++) {
        const def = this.schema[s];
        if (obj[def.k] !== undefined) row[this._cols[def.k]] = this.writeValue(def, obj[def.k]);
      }
      return row;
    }, this);
    if (rows.length) {
      const needed = rows.length + 1;
      if (sheet.getMaxRows() < needed) sheet.insertRowsAfter(sheet.getMaxRows(), needed - sheet.getMaxRows());
      sheet.getRange(2, 1, rows.length, width).setValues(rows);
    }
    if (existing > rows.length) {
      sheet.getRange(rows.length + 2, 1, existing - rows.length, width).clearContent();
    }
    this.invalidate();
  }

  /* keep only the newest n data rows (log tables) */
  trimTo(maxRows) {
    const sheet = this.open();
    const lastRow = sheet.getLastRow();
    const extra = lastRow - 1 - maxRows;
    if (extra > 0) {
      sheet.deleteRows(2, extra);
      this.invalidate();
    }
  }
}

/* ---------------------------------------------------------
   The tables
--------------------------------------------------------- */
const T = {
  orders: new Tbl("", SCHEMAS.orders, {
    first: true,
    isRow: function (o) { return !!(o.orderId || o.name || o.phone || o.products); }
  }),
  products: new Tbl(CONFIG.PRODUCTS_SHEET_NAME, SCHEMAS.products),
  categories: new Tbl(CONFIG.CATEGORIES_SHEET_NAME, SCHEMAS.categories),
  settings: new Tbl(CONFIG.SETTINGS_SHEET_NAME, SCHEMAS.settings),
  content: new Tbl(SHEET_NAMES.content, SCHEMAS.content),
  contentHistory: new Tbl(SHEET_NAMES.contentHistory, SCHEMAS.contentHistory),
  orderHistory: new Tbl(SHEET_NAMES.orderHistory, SCHEMAS.orderHistory, {
    isRow: function (o) { return !!(o.orderId || o.time); }
  }),
  returns: new Tbl(SHEET_NAMES.returns, SCHEMAS.returns),
  inventoryLog: new Tbl(SHEET_NAMES.inventoryLog, SCHEMAS.inventoryLog, {
    isRow: function (o) { return !!(o.time || o.productId); }
  }),
  activity: new Tbl(SHEET_NAMES.activity, SCHEMAS.activity, {
    isRow: function (o) { return !!(o.time || o.action); }
  }),
  notifyLog: new Tbl(SHEET_NAMES.notifyLog, SCHEMAS.notifyLog, {
    isRow: function (o) { return !!(o.time || o.event); }
  }),
  admins: new Tbl(SHEET_NAMES.admins, SCHEMAS.admins),
  accounts: new Tbl(SHEET_NAMES.accounts, SCHEMAS.accounts),
  customerFlags: new Tbl(SHEET_NAMES.customerFlags, SCHEMAS.customerFlags),
  coupons: new Tbl(SHEET_NAMES.coupons, SCHEMAS.coupons),
  banners: new Tbl(SHEET_NAMES.banners, SCHEMAS.banners),
  reviews: new Tbl(SHEET_NAMES.reviews, SCHEMAS.reviews),
  messages: new Tbl(SHEET_NAMES.messages, SCHEMAS.messages),
  customers: new Tbl(SHEET_NAMES.customers, SCHEMAS.customers),
  abandonedCarts: new Tbl(SHEET_NAMES.abandonedCarts, SCHEMAS.abandonedCarts),
  stockAlerts: new Tbl(SHEET_NAMES.stockAlerts, SCHEMAS.stockAlerts),
  backups: new Tbl(SHEET_NAMES.backups, SCHEMAS.backups)
};
/* =========================================================
   ADMIN AUTH  -  users, roles, signed tokens
========================================================= */

let _actor = null;   /* {id, username, name, role} for the current request */

function actorName() {
  return _actor ? (_actor.username || _actor.name || _actor.id) : "system";
}

function can(permission) {
  if (!_actor) return false;
  const list = PERMISSIONS[_actor.role] || [];
  return list.indexOf("*") !== -1 || list.indexOf(permission) !== -1;
}

function requirePerm(permission) {
  if (!can(permission)) {
    fail("You do not have permission to do this.", "forbidden");
  }
}

function permissionsFor(role) {
  const list = PERMISSIONS[role] || [];
  if (list.indexOf("*") !== -1) {
    const all = {};
    Object.keys(PERMISSIONS).forEach(function (r) {
      PERMISSIONS[r].forEach(function (p) { if (p !== "*") all[p] = 1; });
    });
    ["team.manage", "settings.secrets", "backups.restore", "backups.run", "orders.delete"].forEach(function (p) { all[p] = 1; });
    return Object.keys(all);
  }
  return list.slice();
}

/* ---------------------------------------------------------
   ACTIVITY LOG
--------------------------------------------------------- */
function logActivity(action, target, details) {
  try {
    T.activity.append({
      time: nowStr(),
      actor: actorName(),
      role: _actor ? _actor.role : "",
      action: action,
      target: clip(target, 200),
      details: clip(typeof details === "string" ? details : JSON.stringify(details || ""), 1500)
    });
    if (T.activity.open().getLastRow() > 6000) T.activity.trimTo(5000);
  } catch (error) {
    console.error("activity log failed: " + error);
  }
}

/* ---------------------------------------------------------
   ADMIN USERS TABLE
--------------------------------------------------------- */
function adminPublic(user) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    active: user.active,
    created: user.created,
    lastLogin: user.lastLogin
  };
}

function ensureOwner() {
  const rows = T.admins.readAll();
  if (rows.length) return;
  let hash = getProp(CONFIG.PASSWORD_PROPERTY);
  if (!hash) hash = makePasswordHash(CONFIG.INITIAL_PASSWORD);
  T.admins.append({
    id: "u_owner",
    username: "owner",
    name: "Owner",
    role: "owner",
    hash: hash,
    active: true,
    sessionVersion: 1,
    mustChange: false,
    created: nowStr(),
    lastLogin: ""
  });
  bumpVersion("admins");
}

function adminDirectory() {
  return cached("admins", function () {
    ensureOwner();
    return T.admins.readAll().map(function (u) {
      return {
        id: u.id, username: u.username, name: u.name, role: u.role,
        active: u.active, sessionVersion: u.sessionVersion
      };
    });
  });
}

/* ---------------------------------------------------------
   TOKENS
--------------------------------------------------------- */
function issueAdminToken(user) {
  const exp = new Date().getTime() + CONFIG.SESSION_DAYS * 86400000;
  const payload = b64urlEncode(JSON.stringify({
    u: user.id, e: exp, v: user.sessionVersion || 1, j: uid("")
  }));
  return { token: "a." + payload + "." + sign("a." + payload), expiresAt: exp };
}

function readSignedToken(token, prefix) {
  const parts = str(token).split(".");
  if (parts.length !== 3 || parts[0] !== prefix) return null;
  const expected = sign(prefix + "." + parts[1]);
  if (!constantTimeEquals(expected, parts[2])) return null;
  try {
    const payload = JSON.parse(b64urlDecode(parts[1]));
    if (!payload || !payload.e || payload.e < new Date().getTime()) return null;
    return payload;
  } catch (error) {
    return null;
  }
}

function revokedMap() {
  return jsonOf(getProp("PS_REVOKED"), {}) || {};
}

function revokeJti(jti, expiresAt) {
  const map = revokedMap();
  const now = new Date().getTime();
  Object.keys(map).forEach(function (k) { if (map[k] < now) delete map[k]; });
  map[jti] = expiresAt;
  setProp("PS_REVOKED", JSON.stringify(map));
}

function authenticateAdmin(token) {
  const payload = readSignedToken(token, "a");
  if (!payload) return null;
  if (revokedMap()[payload.j]) return null;
  const directory = adminDirectory();
  for (let i = 0; i < directory.length; i++) {
    const u = directory[i];
    if (u.id === payload.u) {
      if (!u.active) return null;
      if (Number(u.sessionVersion || 1) !== Number(payload.v)) return null;
      return { id: u.id, username: u.username, name: u.name, role: u.role, jti: payload.j, exp: payload.e };
    }
  }
  return null;
}

function requireAdmin(token) {
  const user = authenticateAdmin(token);
  if (!user) fail("Authentication required.", "auth");
  _actor = user;
  return user;
}

/* ---------------------------------------------------------
   LOGIN / LOGOUT / PASSWORD
--------------------------------------------------------- */
function adminLogin(body) {
  const username = canonKey(body.username) || "owner";
  const password = String(body.password === undefined || body.password === null ? "" : body.password);
  if (!password) fail("Password is required.");
  rateLimit("login:" + username, 8, 600, "Too many login attempts. Please wait 10 minutes.");
  rateLimit("login:all", 60, 600, "Too many login attempts. Please wait a few minutes.");

  ensureOwner();
  const user = T.admins.findBy("username", username, true);
  if (!user || !user.active || !checkPasswordHash(password, user.hash)) {
    fail("Invalid username or password.", "auth");
  }

  const patch = { lastLogin: nowStr() };
  if (isLegacyHash(user.hash)) {
    patch.hash = makePasswordHash(password);
    deleteProp(CONFIG.PASSWORD_PROPERTY);
  }
  if (!user.sessionVersion) patch.sessionVersion = 1;
  T.admins.update(user._row, patch);
  rateReset("login:" + username);

  const issued = issueAdminToken({ id: user.id, sessionVersion: patch.sessionVersion || user.sessionVersion || 1 });
  _actor = { id: user.id, username: user.username, name: user.name, role: user.role };
  logActivity("login", user.username, "");

  return {
    success: true,
    authenticated: true,
    token: issued.token,
    expiresAt: issued.expiresAt,
    user: { id: user.id, username: user.username, name: user.name, role: user.role },
    permissions: permissionsFor(user.role),
    warnings: { defaultPassword: password === CONFIG.INITIAL_PASSWORD }
  };
}

function adminLogout(token) {
  const user = authenticateAdmin(token);
  if (user) {
    revokeJti(user.jti, user.exp);
    _actor = user;
    logActivity("logout", user.username, "");
  }
  return { success: true, authenticated: false };
}

function adminSession() {
  const user = _actor;
  return {
    success: true,
    authenticated: true,
    user: { id: user.id, username: user.username, name: user.name, role: user.role },
    permissions: permissionsFor(user.role)
  };
}

function checkNewPassword(password, username) {
  const p = String(password || "");
  if (p.length < 6) fail("New password must be at least 6 characters.");
  if (p === CONFIG.INITIAL_PASSWORD) fail("Please choose a different password than the default one.");
  if (username && p.toLowerCase() === String(username).toLowerCase()) fail("Password cannot be the same as the username.");
}

function adminChangePassword(body) {
  const current = String(body.currentPassword || "");
  const next = String(body.newPassword || "");
  if (!current) fail("Current password is required.");
  if (!next) fail("New password is required.");
  rateLimit("chpw:" + _actor.id, 8, 600);
  return withLock(function () {
    const user = T.admins.findBy("id", _actor.id);
    if (!user || !checkPasswordHash(current, user.hash)) fail("Current password is incorrect.");
    checkNewPassword(next, user.username);
    T.admins.update(user._row, {
      hash: makePasswordHash(next),
      sessionVersion: Number(user.sessionVersion || 1) + 1,
      mustChange: false
    });
    bumpVersion("admins");
    logActivity("password.change", user.username, "");
    return {
      success: true,
      authenticated: false,
      message: "Password changed. Please log in again."
    };
  });
}

/* ---------------------------------------------------------
   TEAM
--------------------------------------------------------- */
function teamList() {
  requirePerm("team.manage");
  ensureOwner();
  return { success: true, users: T.admins.readAll().map(adminPublic) };
}

function teamSave(body) {
  requirePerm("team.manage");
  const role = str(body.role);
  if (["owner", "manager", "staff"].indexOf(role) === -1) fail("Role must be owner, manager or staff.");
  const username = canonKey(body.username);
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) fail("Username must be 3-30 letters, numbers, dot, dash or underscore.");
  const name = clip(body.name, 60) || username;

  return withLock(function () {
    ensureOwner();
    const rows = T.admins.readAll(true);
    const clash = rows.filter(function (u) { return u.username.toLowerCase() === username && u.id !== body.id; })[0];
    if (clash) fail("That username is already taken.");

    if (body.id) {
      const user = T.admins.findBy("id", body.id);
      if (!user) fail("User not found.", "not_found");
      const active = body.active === undefined ? user.active : boolOf(body.active, true);
      const owners = rows.filter(function (u) { return u.role === "owner" && u.active && u.id !== user.id; });
      if (user.role === "owner" && (role !== "owner" || !active) && owners.length === 0) {
        fail("There must always be at least one active owner.");
      }
      const patch = { username: username, name: name, role: role, active: active };
      if (!active || role !== user.role) patch.sessionVersion = Number(user.sessionVersion || 1) + 1;
      if (body.password) {
        checkNewPassword(body.password, username);
        patch.hash = makePasswordHash(String(body.password));
        patch.sessionVersion = Number(user.sessionVersion || 1) + 1;
        patch.mustChange = true;
      }
      T.admins.update(user._row, patch);
      bumpVersion("admins");
      logActivity("team.update", username, role + (active ? "" : " (deactivated)"));
      return { success: true, user: adminPublic(Object.assign({}, user, patch)) };
    }

    if (!body.password) fail("A starting password is required for a new user.");
    checkNewPassword(body.password, username);
    const record = {
      id: uid("u_"), username: username, name: name, role: role,
      hash: makePasswordHash(String(body.password)), active: true,
      sessionVersion: 1, mustChange: true, created: nowStr(), lastLogin: ""
    };
    T.admins.append(record);
    bumpVersion("admins");
    logActivity("team.create", username, role);
    return { success: true, user: adminPublic(record) };
  });
}

function teamLogoutAll(body) {
  requirePerm("team.manage");
  return withLock(function () {
    const user = T.admins.findBy("id", str(body.id));
    if (!user) fail("User not found.", "not_found");
    T.admins.update(user._row, { sessionVersion: Number(user.sessionVersion || 1) + 1 });
    bumpVersion("admins");
    logActivity("team.logoutAll", user.username, "");
    return { success: true };
  });
}

/* ---------------------------------------------------------
   CUSTOMER TOKENS
--------------------------------------------------------- */
function issueCustomerToken(account) {
  const exp = new Date().getTime() + CONFIG.CUSTOMER_SESSION_DAYS * 86400000;
  const payload = b64urlEncode(JSON.stringify({ a: account.id, e: exp, v: account.sessionVersion || 1 }));
  return { token: "c." + payload + "." + sign("c." + payload), expiresAt: exp };
}

function authenticateCustomer(token) {
  const payload = readSignedToken(token, "c");
  if (!payload) return null;
  const account = T.accounts.findBy("id", payload.a);
  if (!account || account.disabled) return null;
  if (Number(account.sessionVersion || 1) !== Number(payload.v)) return null;
  return account;
}

function requireCustomer(token) {
  const account = authenticateCustomer(token);
  if (!account) fail("Please log in to your account.", "auth");
  return account;
}
/* =========================================================
   STORE SETTINGS  (sheet "Store Settings": Setting | Value)
========================================================= */

let _settingsMemo = null;

function settingFromSheet(key, raw) {
  const def = SETTING_DEFS[key];
  switch (def.t) {
    case "bool": return boolOf(raw, def.def);
    case "num": return num(raw, def.def);
    case "json": return jsonOf(raw, def.def);
    case "phone": return raw === "" || raw === undefined ? def.def : normalizePhone(raw);
    default: return raw === undefined || raw === null ? def.def : str(raw);
  }
}

function getSettings() {
  if (_settingsMemo) return _settingsMemo;
  const stored = {};
  T.settings.readAll().forEach(function (row) {
    stored[row.key] = row.value;
  });
  const out = {};
  Object.keys(SETTING_DEFS).forEach(function (key) {
    const def = SETTING_DEFS[key];
    const has = Object.prototype.hasOwnProperty.call(stored, key);
    if (!has) {
      out[key] = def.def;
    } else if (def.t === "str" || def.t === "text") {
      out[key] = str(stored[key]);
    } else if (def.t === "phone") {
      out[key] = normalizePhone(stored[key]);
    } else if (stored[key] === "" || stored[key] === null) {
      out[key] = def.def;
    } else {
      out[key] = settingFromSheet(key, stored[key]);
    }
  });
  /* sections added in newer versions keep working with older saved values */
  out.homeSections = Object.assign({}, SETTING_DEFS.homeSections.def, out.homeSections || {});
  out.homeFlagSections = mergeFlagSections(out.homeFlagSections);
  /* legacy alias */
  out.whatsapp = out.whatsappNumber;
  _settingsMemo = out;
  return out;
}

function mergeFlagSections(value) {
  const def = SETTING_DEFS.homeFlagSections.def;
  const src = value && typeof value === "object" ? value : {};
  const out = {};
  Object.keys(def).forEach(function (k) {
    const one = src[k] && typeof src[k] === "object" ? src[k] : {};
    out[k] = {
      on: one.on === undefined ? def[k].on : boolOf(one.on, true),
      limit: Math.min(24, Math.max(1, Math.floor(num(one.limit, def[k].limit))))
    };
  });
  return out;
}

function initializeSettingsSheet() {
  const sheet = T.settings.open();
  const existing = {};
  T.settings.readAll(true).forEach(function (row) { existing[row.key] = true; });
  const rows = [];
  Object.keys(SETTING_DEFS).forEach(function (key) {
    if (!existing[key]) {
      const def = SETTING_DEFS[key];
      const value = def.t === "json" ? JSON.stringify(def.def) : String(def.def);
      rows.push([key, value]);
    }
  });
  if (rows.length) {
    const start = Math.max(sheet.getLastRow(), 1) + 1;
    sheet.getRange(start, 1, rows.length, 2).setValues(rows);
    T.settings.invalidate();
  }
  _settingsMemo = null;
  return rows.length;
}

function publicSettings() {
  return cached("settings", function () {
    const all = getSettings();
    const out = {};
    Object.keys(SETTING_DEFS).forEach(function (key) {
      if (SETTING_DEFS[key].pub) out[key] = all[key];
    });
    const number = normalizePhone(all.whatsappNumber || all.phone);
    out.whatsappNumber = number;
    out.whatsappUrl = buildWhatsAppUrl(number);
    out.phone = normalizePhone(all.phone);
    out.whatsapp = number;
    return out;
  });
}

/* ---------------------------------------------------------
   VALIDATE + SAVE
--------------------------------------------------------- */
const NOTIFY_CHANNELS = ["none", "callmebot", "telegram", "meta"];
const WA_MODES = ["off", "button", "auto"];

function cleanZones(value) {
  const list = listOf(value).slice(0, 20);
  const seen = {};
  return list.map(function (z) {
    const name = clip(z && z.name, 60);
    if (!name) return null;
    let id = slugify(z.id || name) || uid("z");
    while (seen[id]) id = id + "-2";
    seen[id] = true;
    return {
      id: id,
      name: name,
      charge: Math.max(0, taka(z.charge)),
      freeThreshold: Math.max(0, taka(z.freeThreshold)),
      areas: listOf(z.areas).map(function (a) { return clip(a, 40); }).filter(Boolean).slice(0, 60),
      note: clip(z.note, 120)
    };
  }).filter(Boolean);
}

function cleanSettingValue(key, value) {
  const def = SETTING_DEFS[key];
  switch (def.t) {
    case "bool": return boolOf(value, def.def);
    case "num": {
      const n = Math.max(0, num(value, def.def));
      if (key === "videoUploadMaxMb") return Math.min(CONFIG.VIDEO_HARD_MAX_MB, Math.max(1, n));
      return n;
    }
    case "phone": {
      const p = normalizePhone(value);
      if (p && !/^01[3-9]\d{8}$/.test(p) && !/^\+?\d{8,15}$/.test(p)) {
        fail("Phone number for \"" + key + "\" does not look right.");
      }
      return p;
    }
    case "json": {
      if (key === "deliveryZones") return cleanZones(typeof value === "string" ? jsonOf(value, []) : value);
      if (key === "homeSections") {
        const src = typeof value === "string" ? jsonOf(value, {}) : (value || {});
        const out = {};
        Object.keys(def.def).forEach(function (k) { out[k] = src[k] === undefined ? def.def[k] : boolOf(src[k], true); });
        return out;
      }
      if (key === "homeFlagSections") {
        return mergeFlagSections(typeof value === "string" ? jsonOf(value, {}) : value);
      }
      if (key === "waTemplates") {
        const src = typeof value === "string" ? jsonOf(value, {}) : (value || {});
        const out = {};
        CONFIG.ALLOWED_STATUSES.forEach(function (s) { out[s] = clip(src[s] === undefined ? def.def[s] : src[s], 600); });
        return out;
      }
      if (key === "customerNotifyStatuses") {
        const src = typeof value === "string" ? jsonOf(value, []) : listOf(value);
        return src.filter(function (s) { return CONFIG.ALLOWED_STATUSES.indexOf(s) !== -1; });
      }
      return typeof value === "string" ? jsonOf(value, def.def) : value;
    }
    case "text": return clip(value, 2000);
    default: {
      let s = clip(value, 500);
      if (/Url$/.test(key) && s && !isHttpUrl(s)) fail("\"" + key + "\" must start with http:// or https://");
      if (key === "siteUrl") s = s.replace(/\/+$/, "");
      if (key === "notifyChannel" && NOTIFY_CHANNELS.indexOf(s) === -1) fail("Unknown notification channel.");
      if (key === "customerWhatsappMode" && WA_MODES.indexOf(s) === -1) fail("Unknown WhatsApp mode.");
      if ((key === "email" || key === "notifyEmailTo") && s) {
        s.split(",").forEach(function (part) {
          if (!isEmail(part.trim())) fail("\"" + part.trim() + "\" is not a valid email address.");
        });
      }
      return s;
    }
  }
}

function updateSettings(patch) {
  requirePerm("settings.edit");
  if (!patch || typeof patch !== "object") fail("Settings are required.");
  return withLock(function () {
    const clean = {};
    Object.keys(patch).forEach(function (key) {
      if (!SETTING_DEFS[key]) return;
      clean[key] = cleanSettingValue(key, patch[key]);
    });
    const keys = Object.keys(clean);
    if (!keys.length) fail("No valid settings were sent.");

    const rows = T.settings.readAll(true);
    const byKey = {};
    rows.forEach(function (r) { byKey[r.key] = r; });
    const toAppend = [];
    keys.forEach(function (key) {
      const def = SETTING_DEFS[key];
      const value = def.t === "json" ? JSON.stringify(clean[key]) : String(clean[key]);
      if (byKey[key]) T.settings.update(byKey[key]._row, { value: value });
      else toAppend.push([key, value]);
    });
    if (toAppend.length) {
      const sheet = T.settings.open();
      const start = Math.max(sheet.getLastRow(), 1) + 1;
      sheet.getRange(start, 1, toAppend.length, 2).setValues(toAppend);
    }
    T.settings.invalidate();
    _settingsMemo = null;
    bumpVersion("settings");
    logActivity("settings.update", keys.slice(0, 8).join(","), { count: keys.length });
    return { success: true, settings: getSettings() };
  });
}

/* ---------------------------------------------------------
   SECRETS  (Script Properties only)
--------------------------------------------------------- */
const SECRET_PLAIN = ["META_WA_LANG", "META_WA_TEMPLATE_ADMIN", "META_WA_TEMPLATE_CUSTOMER", "META_WA_PHONE_ID", "TELEGRAM_CHAT_ID"];

function getSecret(key) {
  return getProp(key);
}

function secretStatus() {
  const out = {};
  SECRET_KEYS.forEach(function (key) {
    const v = getProp(key);
    if (SECRET_PLAIN.indexOf(key) !== -1) out[key] = { set: !!v, value: v };
    else out[key] = { set: !!v, hint: v ? "••••" + v.slice(-3) : "" };
  });
  return out;
}

function saveSecrets(body) {
  requirePerm("settings.secrets");
  const patch = body.secrets || {};
  const changed = [];
  Object.keys(patch).forEach(function (key) {
    if (SECRET_KEYS.indexOf(key) === -1) return;
    const value = patch[key];
    if (value === null || value === undefined) return;
    const text = String(value).trim();
    if (text === "") {
      deleteProp(key);
    } else {
      if (text.length > 600) fail("Value for " + key + " is too long.");
      setProp(key, text);
    }
    changed.push(key);
  });
  logActivity("secrets.update", changed.join(","), "");
  return { success: true, secrets: secretStatus() };
}
/* =========================================================
   SITE CONTENT  -  every editable text on the storefront
   Sheet "Site Content":  Key | Value | Draft | Updated At | Updated By
   Visitors only ever see "Value".  Edits made in the admin's
   "view as visitor" mode go to "Draft" until you press Publish.
========================================================= */

const CONTENT_RESET = "__RESET__";

function validContentKey(key) {
  return /^[A-Za-z0-9][A-Za-z0-9_.\-]{0,90}$/.test(str(key));
}

function contentPublic() {
  return cached("content", function () {
    const out = {};
    T.content.readAll().forEach(function (row) {
      if (row.value !== "") out[row.key] = row.value;
    });
    return out;
  });
}

function contentAdminList() {
  requirePerm("content.edit");
  const rows = T.content.readAll(true).map(function (r) {
    return {
      key: r.key,
      value: r.value,
      draft: r.draft === "" ? null : r.draft,
      reset: r.draft === CONTENT_RESET,
      updatedAt: r.updatedAt,
      updatedBy: r.updatedBy
    };
  });
  return { success: true, items: rows };
}

function contentSaveDraft(body) {
  requirePerm("content.edit");
  const changes = body.changes || {};
  const keys = Object.keys(changes);
  if (!keys.length) fail("Nothing to save.");
  if (keys.length > 200) fail("Too many changes at once.");
  return withLock(function () {
    const byKey = {};
    T.content.readAll(true).forEach(function (r) { byKey[r.key] = r; });
    let saved = 0;
    keys.forEach(function (key) {
      if (!validContentKey(key)) return;
      const incoming = changes[key];
      let draft;
      if (incoming === null) {
        draft = CONTENT_RESET;
      } else {
        draft = String(incoming);
        if (draft.length > CONFIG.CONTENT_MAX_LEN) fail("Text for \"" + key + "\" is too long.");
      }
      const row = byKey[key];
      if (row) {
        /* same as what is live  ->  no draft needed */
        if ((draft === CONTENT_RESET && row.value === "") || draft === row.value) draft = "";
        T.content.update(row._row, { draft: draft, updatedAt: nowStr(), updatedBy: actorName() });
      } else if (draft !== "") {
        T.content.append({ key: key, value: "", draft: draft, updatedAt: nowStr(), updatedBy: actorName() });
      }
      saved++;
    });
    T.content.invalidate();
    return { success: true, saved: saved, drafts: countDrafts() };
  });
}

function countDrafts() {
  return T.content.readAll(true).filter(function (r) { return r.draft !== ""; }).length;
}

function contentPublish(body) {
  requirePerm("content.edit");
  const only = Array.isArray(body.keys) && body.keys.length ? body.keys : null;
  return withLock(function () {
    let published = 0;
    T.content.readAll(true).forEach(function (row) {
      if (row.draft === "") return;
      if (only && only.indexOf(row.key) === -1) return;
      const newValue = row.draft === CONTENT_RESET ? "" : row.draft;
      T.contentHistory.append({
        id: uid("h_"), time: nowStr(), key: row.key,
        oldValue: row.value, newValue: newValue, actor: actorName()
      });
      T.content.update(row._row, { value: newValue, draft: "", updatedAt: nowStr(), updatedBy: actorName() });
      published++;
    });
    T.content.invalidate();
    if (T.contentHistory.open().getLastRow() > 3000) T.contentHistory.trimTo(2500);
    if (published) {
      bumpVersion("content");
      logActivity("content.publish", published + " text(s)", "");
    }
    return { success: true, published: published, drafts: countDrafts() };
  });
}

function contentDiscard(body) {
  requirePerm("content.edit");
  const only = Array.isArray(body.keys) && body.keys.length ? body.keys : null;
  return withLock(function () {
    let discarded = 0;
    T.content.readAll(true).forEach(function (row) {
      if (row.draft === "") return;
      if (only && only.indexOf(row.key) === -1) return;
      T.content.update(row._row, { draft: "" });
      discarded++;
    });
    T.content.invalidate();
    return { success: true, discarded: discarded, drafts: countDrafts() };
  });
}

function contentHistoryList(body) {
  requirePerm("content.edit");
  const key = str(body.key);
  let rows = T.contentHistory.readAll(true);
  if (key) rows = rows.filter(function (r) { return r.key === key; });
  rows = rows.slice(-Math.min(num(body.limit, 60), 200)).reverse();
  return { success: true, items: rows.map(function (r) { return pickKeys(r, ["id", "time", "key", "oldValue", "newValue", "actor"]); }) };
}

function contentRevert(body) {
  requirePerm("content.edit");
  const entry = T.contentHistory.findBy("id", str(body.id));
  if (!entry) fail("History entry not found.", "not_found");
  return contentSaveDraft({ changes: (function () { const o = {}; o[entry.key] = entry.oldValue === "" ? null : entry.oldValue; return o; })() });
}

/* ---------------------------------------------------------
   BANNERS  (homepage slider)
--------------------------------------------------------- */
function bannerObject(row) {
  return {
    id: row.id, title: row.title, subtitle: row.subtitle, image: row.image,
    link: row.link, button: row.button, active: row.active, sort: row.sort,
    starts: row.starts, ends: row.ends
  };
}

function bannerLive(row, today) {
  if (!row.active) return false;
  if (row.starts && today < row.starts) return false;
  if (row.ends && today > row.ends) return false;
  return true;
}

function bannersPublic() {
  return cached("banners", function () {
    const today = todayStr();
    return T.banners.readAll()
      .filter(function (b) { return bannerLive(b, today); })
      .sort(function (a, b) { return a.sort - b.sort; })
      .map(function (b) { return pickKeys(b, ["id", "title", "subtitle", "image", "link", "button"]); });
  });
}

function bannersAdminList() {
  requirePerm("banners.manage");
  return {
    success: true,
    banners: T.banners.readAll(true).sort(function (a, b) { return a.sort - b.sort; }).map(bannerObject)
  };
}

function bannerSave(body) {
  requirePerm("banners.manage");
  const b = body.banner || {};
  const title = clip(b.title, 120);
  if (!title && !str(b.image)) fail("A banner needs a title or an image.");
  if (b.image && !isHttpUrl(b.image) && str(b.image).charAt(0) !== "/") fail("Banner image must be a web address.");
  const link = str(b.link);
  if (link && !safeUrl(link)) fail("Banner link must start with http(s):// or /");
  return withLock(function () {
    const rows = T.banners.readAll(true);
    const record = {
      title: title,
      subtitle: clip(b.subtitle, 300),
      image: clip(b.image, 800),
      link: clip(link, 500),
      button: clip(b.button, 40),
      active: boolOf(b.active, true),
      starts: clip(b.starts, 10),
      ends: clip(b.ends, 10)
    };
    let id = str(b.id);
    const existing = id ? T.banners.findBy("id", id) : null;
    if (existing) {
      T.banners.update(existing._row, record);
    } else {
      id = uid("bn_");
      const maxSort = rows.reduce(function (m, r) { return Math.max(m, r.sort); }, 0);
      T.banners.append(Object.assign({ id: id, sort: maxSort + 1 }, record));
    }
    bumpVersion("banners");
    logActivity(existing ? "banner.update" : "banner.create", id, title);
    return { success: true, id: id };
  });
}

function bannerDelete(body) {
  requirePerm("banners.manage");
  return withLock(function () {
    const row = T.banners.findBy("id", str(body.id));
    if (!row) fail("Banner not found.", "not_found");
    T.banners.remove(row._row);
    bumpVersion("banners");
    logActivity("banner.delete", row.id, row.title);
    return { success: true };
  });
}

function bannerReorder(body) {
  requirePerm("banners.manage");
  const ids = listOf(body.ids);
  return withLock(function () {
    ids.forEach(function (id, index) {
      const row = T.banners.findBy("id", str(id));
      if (row) T.banners.update(row._row, { sort: index + 1 });
    });
    T.banners.invalidate();
    bumpVersion("banners");
    return { success: true };
  });
}
/* =========================================================
   CATALOG  -  categories, products, one visibility layer
   Visibility:  visible | draft | hidden | deleted   (soft delete)
   A product is on the storefront only when
        product.visibility == visible
        AND its category is visible (or it has no category)
========================================================= */

const VISIBILITIES = ["visible", "draft", "hidden", "deleted"];
const PRODUCT_FLAGS = ["new", "trending", "featured", "deal"];

function normVisibility(value) {
  const v = canonKey(value);
  return VISIBILITIES.indexOf(v) !== -1 ? v : "visible";
}

/* ---------------------------------------------------------
   CATEGORIES
--------------------------------------------------------- */
function categoryObject(row) {
  return {
    id: row.id,
    name: row.name,
    visibility: normVisibility(row.visibility),
    sort: row.sort,
    blurb: row.blurb
  };
}

function nextCategorySort(rows) {
  return rows.reduce(function (m, r) { return Math.max(m, r.sort || 0); }, 0) + 1;
}

/* make sure every category used by a product exists in the Categories sheet */
function ensureCategoriesForProducts() {
  const products = T.products.readAll();
  const cats = T.categories.readAll();
  const known = {};
  cats.forEach(function (c) { known[canonKey(c.name)] = true; });
  const missing = [];
  products.forEach(function (p) {
    const key = canonKey(p.category);
    if (key && !known[key]) {
      known[key] = true;
      missing.push(titleCaseIfFlat(p.category));
    }
  });
  if (!missing.length) return;
  withLock(function () {
    let sort = nextCategorySort(T.categories.readAll(true));
    missing.forEach(function (name) {
      if (!T.categories.findBy("name", name, true)) {
        T.categories.append({ id: uid("c_"), name: name, visibility: "visible", sort: sort++ });
      }
    });
    bumpVersion("catalog");
  });
}

function categoryMap() {
  const map = {};
  T.categories.readAll().forEach(function (c) { map[canonKey(c.name)] = c; });
  return map;
}

function findCategory(name) {
  return T.categories.findBy("name", squash(name), true);
}

/* returns the canonical (stored) category, creating it if needed */
function resolveCategory(name, createIfMissing) {
  const clean = squash(name);
  if (!clean) return null;
  if (clean.length > 60) fail("Category name is too long (60 characters max).");
  const found = findCategory(clean);
  if (found) return found;
  if (!createIfMissing) return null;
  const record = {
    id: uid("c_"), name: titleCaseIfFlat(clean), visibility: "visible",
    sort: nextCategorySort(T.categories.readAll(true)), blurb: ""
  };
  T.categories.append(record);
  bumpVersion("catalog");
  return record;
}

function categoriesAdminList() {
  requirePerm("products.view");
  ensureCategoriesForProducts();
  const counts = {};
  T.products.readAll().forEach(function (p) {
    const key = canonKey(p.category);
    if (!counts[key]) counts[key] = { total: 0, visible: 0 };
    if (normVisibility(p.visibility) !== "deleted") counts[key].total++;
    if (normVisibility(p.visibility) === "visible") counts[key].visible++;
  });
  const items = T.categories.readAll(true)
    .sort(function (a, b) { return a.sort - b.sort; })
    .map(function (c) {
      const info = counts[canonKey(c.name)] || { total: 0, visible: 0 };
      const o = categoryObject(c);
      o.products = info.total;
      o.visibleProducts = info.visible;
      return o;
    });
  return { success: true, categories: items };
}

function categoryCreate(body) {
  requirePerm("products.edit");
  const name = squash(body.name);
  if (!name) fail("Category name is required.");
  if (name.length > 60) fail("Category name is too long (60 characters max).");
  return withLock(function () {
    const existing = findCategory(name);
    if (existing) {
      /* never create a duplicate - bring a deleted one back instead */
      if (normVisibility(existing.visibility) === "deleted") {
        T.categories.update(existing._row, { visibility: "visible" });
        bumpVersion("catalog");
        logActivity("category.restore", existing.name, "");
        return { success: true, category: categoryObject(Object.assign({}, existing, { visibility: "visible" })), existed: true, restored: true };
      }
      return { success: true, category: categoryObject(existing), existed: true };
    }
    const category = resolveCategory(name, true);
    logActivity("category.create", category.name, "");
    return { success: true, category: categoryObject(category), existed: false };
  });
}

function categoryUpdate(body) {
  requirePerm("products.edit");
  return withLock(function () {
    const row = T.categories.findBy("id", str(body.id));
    if (!row) fail("Category not found.", "not_found");
    const patch = {};
    if (body.name !== undefined) {
      const name = squash(body.name);
      if (!name) fail("Category name is required.");
      if (name.length > 60) fail("Category name is too long (60 characters max).");
      const clash = T.categories.readAll(true).filter(function (c) {
        return c.id !== row.id && canonKey(c.name) === canonKey(name);
      })[0];
      if (clash) fail("A category named \"" + clash.name + "\" already exists.");
      patch.name = name;
    }
    if (body.blurb !== undefined) patch.blurb = clip(body.blurb, 200);
    if (body.visibility !== undefined) {
      if (VISIBILITIES.indexOf(canonKey(body.visibility)) === -1) fail("Visibility must be visible, draft, hidden or deleted.");
      patch.visibility = canonKey(body.visibility);
    }
    if (body.sort !== undefined) patch.sort = num(body.sort, row.sort);
    T.categories.update(row._row, patch);

    /* renaming keeps products attached to the category */
    if (patch.name && patch.name !== row.name) {
      const key = canonKey(row.name);
      T.products.readAll(true).forEach(function (p) {
        if (canonKey(p.category) === key) T.products.update(p._row, { category: patch.name, updatedAt: nowStr() });
      });
    }
    bumpVersion("catalog");
    logActivity("category.update", row.name, patch);
    return { success: true, category: categoryObject(Object.assign({}, row, patch)) };
  });
}

function categoryReorder(body) {
  requirePerm("products.edit");
  return withLock(function () {
    listOf(body.ids).forEach(function (id, index) {
      const row = T.categories.findBy("id", str(id));
      if (row) T.categories.update(row._row, { sort: index + 1 });
    });
    T.categories.invalidate();
    bumpVersion("catalog");
    return { success: true };
  });
}

/* ---------------------------------------------------------
   PRODUCTS
--------------------------------------------------------- */
function splitTags(text) {
  const s = str(text);
  return s ? s.split("|").map(function (t) { return t.trim(); }).filter(Boolean) : [];
}

function productFromRow(row) {
  let images = listOf(row.images).map(str).filter(Boolean);
  if (!images.length && row.image) images = [row.image];
  const variants = listOf(row.variants).map(function (v) {
    return {
      id: str(v.id),
      label: str(v.label),
      sku: str(v.sku),
      price: v.price === undefined || v.price === null || v.price === "" ? null : num(v.price, 0),
      stock: Math.max(0, Math.floor(num(v.stock, 0))),
      image: str(v.image)
    };
  }).filter(function (v) { return v.id && v.label; });

  let stock = Math.max(0, Math.floor(num(row.stock, 0)));
  if (variants.length) {
    stock = variants.reduce(function (sum, v) { return sum + v.stock; }, 0);
  }

  return {
    id: str(row.id),
    name: str(row.name),
    brand: str(row.brand),
    category: str(row.category),
    subtitle: str(row.subtitle),
    tags: splitTags(row.tags),
    price: num(row.price, 0),
    oldPrice: row.oldPrice > 0 ? row.oldPrice : null,
    rating: num(row.rating, 0),
    reviews: num(row.reviews, 0),
    stock: stock,
    status: canonKey(row.status) === "inactive" ? "inactive" : "active",
    description: row.description,
    image: images[0] || str(row.image),
    images: images,
    alt: str(row.alt),
    notes: row.notes === "" ? null : row.notes,
    costPrice: num(row.costPrice, 0),
    visibility: normVisibility(row.visibility),
    sku: str(row.sku),
    features: listOf(row.features).map(str).filter(Boolean),
    specs: listOf(row.specs).map(function (s) { return { k: str(s && s.k), v: str(s && s.v) }; }).filter(function (s) { return s.k; }),
    flags: listOf(row.flags).filter(function (f) { return PRODUCT_FLAGS.indexOf(f) !== -1; }),
    variantLabel: str(row.variantLabel),
    variants: variants,
    videos: cleanVideos(row.videos, true),
    lowStock: num(row.lowStock, 0),
    createdAt: str(row.createdAt),
    updatedAt: str(row.updatedAt)
  };
}

function publicProduct(p) {
  return {
    id: p.id, name: p.name, brand: p.brand, category: p.category, subtitle: p.subtitle,
    tags: p.tags, price: p.price, oldPrice: p.oldPrice, rating: p.rating, reviews: p.reviews,
    stock: p.stock, status: p.status, description: p.description, image: p.image,
    images: p.images, alt: p.alt, sku: p.sku, features: p.features, specs: p.specs,
    flags: p.flags, variantLabel: p.variantLabel, videos: p.videos,
    variants: p.variants.map(function (v) {
      return { id: v.id, label: v.label, price: v.price, stock: v.stock, image: v.image };
    })
  };
}

function productVisible(product, catMap) {
  if (product.visibility !== "visible") return false;
  const key = canonKey(product.category);
  if (!key) return true;
  const cat = catMap[key];
  if (!cat) return true;
  return normVisibility(cat.visibility) === "visible";
}

function allProducts() {
  return T.products.readAll().map(function (row) {
    const p = productFromRow(row);
    p._row = row._row;
    return p;
  });
}

function findProductRow(id) {
  return T.products.findBy("id", str(id));
}

function publicCatalog() {
  return cached("catalog", function () {
    ensureCategoriesForProducts();
    const cats = T.categories.readAll(true);
    const catMap = {};
    cats.forEach(function (c) { catMap[canonKey(c.name)] = c; });
    const products = allProducts()
      .filter(function (p) { return productVisible(p, catMap); })
      .map(publicProduct);
    const listed = {};
    products.forEach(function (p) {
      if (p.status === "inactive") return;
      const key = canonKey(p.category);
      listed[key] = (listed[key] || 0) + 1;
    });
    const categories = cats
      .filter(function (c) { return normVisibility(c.visibility) === "visible"; })
      .sort(function (a, b) { return a.sort - b.sort; })
      .map(function (c) {
        return { id: c.id, name: c.name, blurb: c.blurb, count: listed[canonKey(c.name)] || 0 };
      });
    return { products: products, categories: categories };
  });
}

/* ---------------------------------------------------------
   ADMIN LIST
--------------------------------------------------------- */
function productsAdminList() {
  requirePerm("products.view");
  ensureCategoriesForProducts();
  const finance = can("finance.view");
  const globalLow = num(getSettings().lowStockThreshold, 3);
  const products = allProducts().map(function (p) {
    const threshold = p.lowStock > 0 ? p.lowStock : globalLow;
    const out = Object.assign({}, p, { lowThreshold: threshold, isLow: p.stock <= threshold });
    delete out._row;
    if (!finance) out.costPrice = 0;
    return out;
  });
  return {
    success: true,
    products: products,
    categories: T.categories.readAll(true).sort(function (a, b) { return a.sort - b.sort; }).map(categoryObject),
    lowStockThreshold: globalLow
  };
}

/* ---------------------------------------------------------
   SAVE ONE PRODUCT
--------------------------------------------------------- */
function cleanImageList(list) {
  return listOf(list).map(function (u) { return clip(u, 800); }).filter(function (u) {
    return u && (isHttpUrl(u) || u.charAt(0) === "/");
  }).slice(0, 10);
}

/* ---------------------------------------------------------
   VIDEOS  (YouTube / Facebook / Google Drive / direct file link)
   stored as  { kind, id, url, poster, title }
--------------------------------------------------------- */
const VIDEO_KINDS = ["youtube", "facebook", "drive", "file"];

function parseVideoLink(raw) {
  const url = str(raw);
  let m;
  m = /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|embed\/|live\/))([A-Za-z0-9_-]{11})/i.exec(url);
  if (m) return { kind: "youtube", id: m[1], url: "https://www.youtube.com/watch?v=" + m[1] };
  if (/^https?:\/\/(?:www\.|m\.|web\.)?(?:facebook\.com|fb\.watch)\//i.test(url) && /(video|reel|watch|fb\.watch)/i.test(url)) {
    return { kind: "facebook", id: "", url: url };
  }
  m = /drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^#]*&)?id=)([A-Za-z0-9_-]{5,})/i.exec(url);
  if (m) return { kind: "drive", id: m[1], url: "https://drive.google.com/file/d/" + m[1] + "/preview" };
  if (/^https?:\/\/[^\s]+\.(mp4|webm|m4v|mov)(\?[^\s]*)?$/i.test(url)) return { kind: "file", id: "", url: url };
  return null;
}

function cleanVideos(list, quiet) {
  const out = [];
  listOf(list).slice(0, 5).forEach(function (v) {
    if (!v) return;
    let item = null;
    if (VIDEO_KINDS.indexOf(str(v.kind)) !== -1 && (str(v.id) || str(v.url))) {
      /* already parsed (saved earlier) - re-check through the link parser */
      item = parseVideoLink(str(v.url)) || (v.kind === "drive" && /^[A-Za-z0-9_-]{5,}$/.test(str(v.id))
        ? { kind: "drive", id: str(v.id), url: "https://drive.google.com/file/d/" + str(v.id) + "/preview" }
        : (v.kind === "youtube" && /^[A-Za-z0-9_-]{11}$/.test(str(v.id))
          ? { kind: "youtube", id: str(v.id), url: "https://www.youtube.com/watch?v=" + str(v.id) } : null));
    } else if (str(v.url)) {
      item = parseVideoLink(str(v.url));
    }
    if (!item) {
      if (!quiet) fail("That video link is not supported. Use a YouTube, Facebook or Google Drive link, or a direct .mp4 / .webm link.");
      return;
    }
    const poster = clip(v.poster, 800);
    item.poster = poster && (isHttpUrl(poster) || poster.charAt(0) === "/") ? poster : "";
    item.title = clip(v.title, 80);
    out.push(item);
  });
  return out;
}

function cleanVariants(list) {
  const seen = {};
  return listOf(list).slice(0, 40).map(function (v) {
    const label = clip(v && v.label, 60);
    if (!label) return null;
    let id = str(v.id) || slugify(label) || uid("v");
    while (seen[id]) id += "-2";
    seen[id] = true;
    return {
      id: id,
      label: label,
      sku: clip(v.sku, 40),
      price: v.price === undefined || v.price === null || v.price === "" ? null : Math.max(0, taka(v.price)),
      stock: Math.max(0, Math.floor(num(v.stock, 0))),
      image: clip(v.image, 800)
    };
  }).filter(Boolean);
}

function buildProductRecord(input, existing) {
  const name = clip(input.name, 140);
  if (!name) fail("Product name is required.");
  const price = num(input.price, NaN);
  if (!isFinite(price) || price < 0) fail("Price must be a number (0 or more).");
  const oldPrice = input.oldPrice === null || input.oldPrice === undefined || input.oldPrice === "" ? 0 : num(input.oldPrice, 0);
  if (oldPrice < 0) fail("Old price cannot be negative.");

  const variants = cleanVariants(input.variants);
  let stock = Math.max(0, Math.floor(num(input.stock, 0)));
  if (variants.length) stock = variants.reduce(function (s, v) { return s + v.stock; }, 0);

  let images = cleanImageList(input.images);
  const primary = clip(input.image, 800);
  if (primary && (isHttpUrl(primary) || primary.charAt(0) === "/")) {
    images = [primary].concat(images.filter(function (u) { return u !== primary; }));
  }
  images = images.slice(0, 10);

  let costPrice = existing ? num(existing.costPrice, 0) : 0;
  if (can("finance.view") && input.costPrice !== undefined && input.costPrice !== null && input.costPrice !== "") {
    costPrice = Math.max(0, num(input.costPrice, 0));
  }

  const tags = listOf(input.tags).map(function (t) { return clip(t, 40); }).filter(Boolean).slice(0, 20);
  const flags = listOf(input.flags).filter(function (f) { return PRODUCT_FLAGS.indexOf(f) !== -1; });

  return {
    name: name,
    brand: clip(input.brand, 80),
    subtitle: clip(input.subtitle, 160),
    tags: tags.join("|"),
    price: taka(price),
    oldPrice: oldPrice > 0 ? taka(oldPrice) : "",
    rating: Math.min(5, Math.max(0, num(input.rating, existing ? existing.rating : 0))),
    reviews: Math.max(0, Math.floor(num(input.reviews, existing ? existing.reviews : 0))),
    stock: stock,
    status: canonKey(input.status) === "inactive" ? "inactive" : "active",
    description: clip(input.description, 4000),
    image: images[0] || "",
    images: images,
    alt: clip(input.alt, 160),
    notes: clip(input.notes, 1000),
    costPrice: costPrice,
    sku: clip(input.sku, 40),
    features: listOf(input.features).map(function (f) { return clip(f, 200); }).filter(Boolean).slice(0, 20),
    specs: listOf(input.specs).map(function (s) { return { k: clip(s && s.k, 60), v: clip(s && s.v, 200) }; }).filter(function (s) { return s.k; }).slice(0, 25),
    flags: flags,
    variantLabel: variants.length ? (clip(input.variantLabel, 30) || "Option") : "",
    variants: variants,
    videos: cleanVideos(input.videos, false),
    lowStock: Math.max(0, Math.floor(num(input.lowStock, 0)))
  };
}

function productSave(body) {
  requirePerm("products.edit");
  const input = body.product || {};
  return withLock(function () {
    let row = str(input.id) ? findProductRow(input.id) : null;
    if (str(input.id) && !row && body.mustExist) fail("Product not found.", "not_found");

    if (row && body.expectedUpdatedAt && row.updatedAt && row.updatedAt !== body.expectedUpdatedAt) {
      fail("This product was changed by someone else. Reload the list and try again.", "conflict");
    }

    const record = buildProductRecord(input, row);
    /* category: reuse the canonical one, create when new */
    const wantCategory = squash(input.category);
    if (wantCategory) {
      const cat = resolveCategory(wantCategory, true);
      record.category = cat.name;
    } else {
      record.category = "";
    }
    const visibility = input.visibility === undefined
      ? (row ? normVisibility(row.visibility) : "visible")
      : normVisibility(input.visibility);
    record.visibility = visibility;
    record.updatedAt = nowStr();

    let id;
    if (row) {
      id = row.id;
      const before = productFromRow(row);
      T.products.update(row._row, record);
      logStockChange(before, record, "Edited in admin");
      logActivity("product.update", id, record.name);
    } else {
      id = str(input.id) || ("ps-" + uid("").slice(0, 7));
      if (findProductRow(id)) fail("A product with this ID already exists.");
      record.id = id;
      record.createdAt = nowStr();
      T.products.append(record);
      if (record.stock > 0 || record.variants.length) {
        recordInventory({
          productId: id, product: record.name, variantId: "", change: record.stock,
          before: 0, after: record.stock, reason: "Product created", ref: ""
        });
      }
      logActivity("product.create", id, record.name);
    }
    bumpVersion("catalog");
    const saved = findProductRow(id);
    return { success: true, product: adminProductView(productFromRow(saved)) };
  });
}

function adminProductView(p) {
  const out = Object.assign({}, p);
  delete out._row;
  if (!can("finance.view")) out.costPrice = 0;
  return out;
}

/* log a stock difference caused by editing a product */
function logStockChange(beforeProduct, record, reason) {
  const afterVariants = listOf(record.variants);
  if (beforeProduct.variants.length || afterVariants.length) {
    const beforeMap = {};
    beforeProduct.variants.forEach(function (v) { beforeMap[v.id] = v.stock; });
    afterVariants.forEach(function (v) {
      const was = beforeMap[v.id] === undefined ? 0 : beforeMap[v.id];
      if (was !== v.stock) {
        recordInventory({
          productId: beforeProduct.id, product: record.name, variantId: v.id,
          change: v.stock - was, before: was, after: v.stock, reason: reason, ref: ""
        });
      }
    });
    return;
  }
  if (beforeProduct.stock !== record.stock) {
    recordInventory({
      productId: beforeProduct.id, product: record.name, variantId: "",
      change: record.stock - beforeProduct.stock, before: beforeProduct.stock,
      after: record.stock, reason: reason, ref: ""
    });
  }
}

/* ---------------------------------------------------------
   VISIBILITY  (hide / unhide / delete / restore)
--------------------------------------------------------- */
function productSetVisibility(body) {
  requirePerm("products.edit");
  const ids = listOf(body.ids).concat(body.id ? [body.id] : []).map(str).filter(Boolean);
  const visibility = canonKey(body.visibility);
  if (VISIBILITIES.indexOf(visibility) === -1) fail("Visibility must be visible, draft, hidden or deleted.");
  if (!ids.length) fail("No products selected.");
  if (visibility === "deleted") requirePerm("products.delete");
  return withLock(function () {
    if (ids.length > 3 || visibility === "deleted") {
      snapshotCatalog("Before changing " + ids.length + " product(s) to " + visibility);
    }
    let changed = 0;
    ids.forEach(function (id) {
      const row = findProductRow(id);
      if (!row) return;
      if (normVisibility(row.visibility) === visibility) return;
      T.products.update(row._row, { visibility: visibility, updatedAt: nowStr() });
      changed++;
    });
    bumpVersion("catalog");
    logActivity("product." + visibility, ids.slice(0, 5).join(","), { count: changed });
    return { success: true, changed: changed };
  });
}

/* ---------------------------------------------------------
   BULK EDIT  (many products at once)
   ops: category | flagAdd | flagRemove | priceSet | pricePercent |
        status | visibility | lowStock
--------------------------------------------------------- */
function productBulk(body) {
  requirePerm("products.edit");
  const ids = listOf(body.ids).map(str).filter(Boolean).slice(0, 200);
  const op = str(body.op);
  const ops = ["category", "flagAdd", "flagRemove", "priceSet", "pricePercent", "status", "visibility", "lowStock"];
  if (!ids.length) fail("No products selected.");
  if (ops.indexOf(op) === -1) fail("Unknown bulk action.");
  const value = body.value;
  return withLock(function () {
    let category = null;
    if (op === "category") {
      if (!squash(value)) fail("Choose a category.");
      category = resolveCategory(value, true);
    }
    if (op === "flagAdd" || op === "flagRemove") {
      if (PRODUCT_FLAGS.indexOf(str(value)) === -1) fail("Unknown flag.");
    }
    if (op === "priceSet") {
      const n = num(value, NaN);
      if (!isFinite(n) || n < 0) fail("Enter a price (0 or more).");
    }
    let percent = 0;
    if (op === "pricePercent") {
      percent = num(value, NaN);
      if (!isFinite(percent) || percent === 0 || percent < -90 || percent > 300) fail("Enter a percent between -90 and 300 (not 0).");
    }
    if (op === "status" && ["active", "inactive"].indexOf(canonKey(value)) === -1) fail("Status must be active or inactive.");
    if (op === "visibility") {
      if (["visible", "draft", "hidden"].indexOf(canonKey(value)) === -1) fail("Use the delete button to delete products.");
    }
    if (op === "lowStock" && !isFinite(num(value, NaN))) fail("Enter a number.");

    snapshotCatalog("Before bulk edit (" + op + ") of " + ids.length + " product(s)");
    let changed = 0;
    ids.forEach(function (id) {
      const row = findProductRow(id);
      if (!row || normVisibility(row.visibility) === "deleted") return;
      const patch = { updatedAt: nowStr() };
      if (op === "category") patch.category = category.name;
      if (op === "flagAdd" || op === "flagRemove") {
        const flags = listOf(row.flags).filter(function (f) { return PRODUCT_FLAGS.indexOf(f) !== -1; });
        const has = flags.indexOf(str(value)) !== -1;
        if (op === "flagAdd" && !has) flags.push(str(value));
        if (op === "flagRemove" && has) flags.splice(flags.indexOf(str(value)), 1);
        patch.flags = flags;
      }
      if (op === "priceSet") patch.price = taka(num(value, 0));
      if (op === "pricePercent") {
        patch.price = Math.max(0, taka(row.price * (1 + percent / 100)));
        const variants = listOf(row.variants).map(function (v) {
          if (v && v.price !== null && v.price !== undefined && v.price !== "") {
            return Object.assign({}, v, { price: Math.max(0, taka(num(v.price, 0) * (1 + percent / 100))) });
          }
          return v;
        });
        if (variants.length) patch.variants = variants;
      }
      if (op === "status") patch.status = canonKey(value);
      if (op === "visibility") patch.visibility = canonKey(value);
      if (op === "lowStock") patch.lowStock = Math.max(0, Math.floor(num(value, 0)));
      T.products.update(row._row, patch);
      changed++;
    });
    bumpVersion("catalog");
    logActivity("product.bulk", op, { count: changed, value: str(value) });
    return { success: true, changed: changed };
  });
}

function productDeleteForever(body) {
  requirePerm("products.delete");
  const id = str(body.id);
  return withLock(function () {
    const row = findProductRow(id);
    if (!row) fail("Product not found.", "not_found");
    if (normVisibility(row.visibility) !== "deleted") fail("Move the product to Deleted first, then remove it permanently.");
    snapshotCatalog("Before permanently removing " + row.name);
    T.products.remove(row._row);
    bumpVersion("catalog");
    logActivity("product.purge", id, row.name);
    return { success: true };
  });
}

function productReorder(body) {
  requirePerm("products.edit");
  const ids = listOf(body.ids).map(str);
  return withLock(function () {
    const rows = T.products.readAll(true);
    const byId = {};
    rows.forEach(function (r) { byId[r.id] = r; });
    const ordered = [];
    const used = {};
    ids.forEach(function (id) {
      if (byId[id] && !used[id]) { ordered.push(byId[id]); used[id] = true; }
    });
    rows.forEach(function (r) { if (!used[r.id]) ordered.push(r); });
    T.products.replaceAll(ordered);
    bumpVersion("catalog");
    logActivity("product.reorder", "", { count: ordered.length });
    return { success: true };
  });
}

/* ---------------------------------------------------------
   CSV / BULK IMPORT   (client parses the CSV, sends rows)
--------------------------------------------------------- */
function productImport(body) {
  requirePerm("products.edit");
  const rows = listOf(body.rows);
  if (!rows.length) fail("The file has no rows.");
  if (rows.length > 500) fail("Please import at most 500 products at a time.");
  return withLock(function () {
    const before = T.products.readAll(true);
    snapshotCatalog("Before CSV import (" + rows.length + " rows, " + before.length + " products)");
    const byId = {};
    before.forEach(function (r) { byId[r.id] = r; });
    const errors = [];
    let created = 0;
    let updated = 0;
    const result = before.map(function (r) { return Object.assign({}, r); });
    const indexById = {};
    result.forEach(function (r, i) { indexById[r.id] = i; });

    rows.forEach(function (input, i) {
      const line = i + 2;
      try {
        const id = str(input.id);
        const existing = id ? byId[id] : null;
        /* blank cells in the CSV mean "leave as it is" */
        const given = {};
        Object.keys(input).forEach(function (k) {
          if (input[k] !== "" && input[k] !== null && input[k] !== undefined) given[k] = input[k];
        });
        const merged = Object.assign({}, existing ? productFromRow(existing) : {}, given);
        if (typeof given.tags === "string") merged.tags = splitTags(given.tags.replace(/,/g, "|"));
        if (typeof given.images === "string") merged.images = given.images.split("|").map(str).filter(Boolean);
        if (typeof given.features === "string") merged.features = given.features.split("|").map(str).filter(Boolean);
        const record = buildProductRecord(merged, existing);
        const wantCategory = squash(input.category !== undefined ? input.category : (existing ? existing.category : ""));
        record.category = wantCategory ? resolveCategory(wantCategory, true).name : "";
        record.visibility = input.visibility ? normVisibility(input.visibility) : (existing ? normVisibility(existing.visibility) : "visible");
        record.updatedAt = nowStr();
        if (existing) {
          result[indexById[id]] = Object.assign({}, existing, record);
          updated++;
        } else {
          record.id = id || ("ps-" + uid("").slice(0, 7));
          if (indexById[record.id] !== undefined) fail("Duplicate ID " + record.id);
          record.createdAt = nowStr();
          indexById[record.id] = result.length;
          result.push(record);
          created++;
          if (record.stock > 0) {
            recordInventory({
              productId: record.id, product: record.name, variantId: "", change: record.stock,
              before: 0, after: record.stock, reason: "CSV import", ref: ""
            });
          }
        }
      } catch (error) {
        errors.push({ line: line, name: str(input.name), error: error && error.message ? error.message : "Invalid row" });
      }
    });

    if (!body.dryRun && (created || updated)) {
      T.products.replaceAll(result);
      bumpVersion("catalog");
      logActivity("product.import", "", { created: created, updated: updated, errors: errors.length });
    }
    return { success: true, created: created, updated: updated, errors: errors, dryRun: !!body.dryRun };
  });
}

/* ---------------------------------------------------------
   RATINGS FROM APPROVED REVIEWS
--------------------------------------------------------- */
function recomputeProductRating(productId) {
  const row = findProductRow(productId);
  if (!row) return;
  const approved = T.reviews.filter(function (r) {
    return r.productId === str(productId) && r.status === "approved";
  });
  if (!approved.length) return;
  const sum = approved.reduce(function (s, r) { return s + r.rating; }, 0);
  T.products.update(row._row, {
    rating: Math.round((sum / approved.length) * 10) / 10,
    reviews: approved.length
  });
  bumpVersion("catalog");
}
/* =========================================================
   INVENTORY  -  stock changes, log, low stock, backups
========================================================= */

function recordInventory(entry) {
  try {
    T.inventoryLog.append({
      time: nowStr(),
      productId: entry.productId,
      product: clip(entry.product, 140),
      variantId: entry.variantId || "",
      change: entry.change,
      before: entry.before,
      after: entry.after,
      reason: clip(entry.reason, 160),
      ref: entry.ref || "",
      actor: actorName()
    });
    if (T.inventoryLog.open().getLastRow() > 9000) T.inventoryLog.trimTo(7500);
  } catch (error) {
    console.error("inventory log failed: " + error);
  }
  /* something that was sold out is available again -> tell the people waiting */
  try {
    if (entry.productId && Number(entry.before) <= 0 && Number(entry.after) > 0) {
      markRestocked(entry.productId, entry.variantId || "");
    }
  } catch (error) {
    console.error("restock check failed: " + error);
  }
}

/* change stock of one product/variant. Returns {before, after, threshold, crossedLow}. */
function changeStock(productId, variantId, delta, reason, ref) {
  const row = findProductRow(productId);
  if (!row) fail("Product not found.", "not_found");
  const p = productFromRow(row);
  const globalLow = num(getSettings().lowStockThreshold, 3);
  const threshold = p.lowStock > 0 ? p.lowStock : globalLow;
  let before;
  let after;

  if (p.variants.length) {
    const v = p.variants.filter(function (x) { return x.id === str(variantId); })[0];
    if (!v) fail("Please choose an option for \"" + p.name + "\".", "stock");
    before = v.stock;
    after = before + delta;
    if (after < 0) fail("Not enough stock for \"" + p.name + " - " + v.label + "\".", "stock");
    v.stock = after;
    const total = p.variants.reduce(function (s, x) { return s + x.stock; }, 0);
    T.products.update(row._row, { variants: p.variants, stock: total, updatedAt: nowStr() });
  } else {
    before = p.stock;
    after = before + delta;
    if (after < 0) fail("Not enough stock for \"" + p.name + "\".", "stock");
    T.products.update(row._row, { stock: after, updatedAt: nowStr() });
  }

  recordInventory({
    productId: p.id, product: p.name, variantId: str(variantId), change: delta,
    before: before, after: after, reason: reason, ref: ref
  });
  return {
    before: before,
    after: after,
    threshold: threshold,
    crossedLow: before > threshold && after <= threshold,
    name: p.name
  };
}

function stockAdjust(body) {
  requirePerm("inventory.adjust");
  const reason = clip(body.reason, 60);
  if (!reason) fail("Please give a reason for the stock change.");
  const mode = body.mode === "set" ? "set" : "delta";
  const amount = Math.floor(num(body.amount, NaN));
  if (!isFinite(amount)) fail("Enter a whole number.");
  return withLock(function () {
    const row = findProductRow(body.productId);
    if (!row) fail("Product not found.", "not_found");
    const p = productFromRow(row);
    let current = p.stock;
    if (p.variants.length) {
      const v = p.variants.filter(function (x) { return x.id === str(body.variantId); })[0];
      if (!v) fail("Choose which option to change.");
      current = v.stock;
    }
    const delta = mode === "set" ? amount - current : amount;
    if (delta === 0) return { success: true, unchanged: true };
    const note = clip(body.note, 120);
    const result = changeStock(p.id, body.variantId, delta, reason + (note ? ": " + note : ""), "");
    bumpVersion("catalog");
    logActivity("stock.adjust", p.id, { delta: delta, reason: reason });
    return { success: true, before: result.before, after: result.after };
  });
}

function inventoryLogList(body) {
  requirePerm("inventory.view");
  let rows = T.inventoryLog.readAll(true);
  const productId = str(body.productId);
  if (productId) rows = rows.filter(function (r) { return r.productId === productId; });
  const limit = Math.min(num(body.limit, 200), 1000);
  rows = rows.slice(-limit).reverse();
  return { success: true, items: rows.map(function (r) { return pickKeys(r, ["time", "productId", "product", "variantId", "change", "before", "after", "reason", "ref", "actor"]); }) };
}

function lowStockItems() {
  const globalLow = num(getSettings().lowStockThreshold, 3);
  const items = [];
  allProducts().forEach(function (p) {
    if (p.visibility === "deleted") return;
    const threshold = p.lowStock > 0 ? p.lowStock : globalLow;
    if (p.variants.length) {
      p.variants.forEach(function (v) {
        if (v.stock <= threshold) {
          items.push({ productId: p.id, name: p.name, variantId: v.id, variant: v.label, stock: v.stock, threshold: threshold, image: p.image, visibility: p.visibility });
        }
      });
    } else if (p.stock <= threshold) {
      items.push({ productId: p.id, name: p.name, variantId: "", variant: "", stock: p.stock, threshold: threshold, image: p.image, visibility: p.visibility });
    }
  });
  return items.sort(function (a, b) { return a.stock - b.stock; });
}

/* ---------------------------------------------------------
   CATALOG SNAPSHOTS  (undo / restore)
--------------------------------------------------------- */
const SNAPSHOT_KEEP = 15;
const SNAPSHOT_CHUNK = 40000;

function stripRow(row) {
  const out = Object.assign({}, row);
  delete out._row;
  return out;
}

function snapshotCatalog(reason) {
  const payload = JSON.stringify({
    products: T.products.readAll(true).map(stripRow),
    categories: T.categories.readAll(true).map(stripRow)
  });
  const id = uid("b_");
  const time = nowStr();
  const actor = actorName();
  let part = 0;
  for (let i = 0; i < payload.length; i += SNAPSHOT_CHUNK) {
    T.backups.append({
      id: id, part: part++, time: time, actor: actor,
      reason: clip(reason, 200), data: payload.slice(i, i + SNAPSHOT_CHUNK)
    });
  }
  pruneSnapshots();
  return id;
}

function pruneSnapshots() {
  const rows = T.backups.readAll(true);
  const order = [];
  rows.forEach(function (r) { if (order.indexOf(r.id) === -1) order.push(r.id); });
  if (order.length <= SNAPSHOT_KEEP) return;
  const drop = {};
  order.slice(0, order.length - SNAPSHOT_KEEP).forEach(function (id) { drop[id] = true; });
  const rowNumbers = rows.filter(function (r) { return drop[r.id]; }).map(function (r) { return r._row; });
  rowNumbers.sort(function (a, b) { return b - a; }).forEach(function (n) { T.backups.remove(n); });
}

function backupsList() {
  requirePerm("backups.view");
  const rows = T.backups.readAll(true);
  const map = {};
  const order = [];
  rows.forEach(function (r) {
    if (!map[r.id]) {
      map[r.id] = { id: r.id, time: r.time, actor: r.actor, reason: r.reason, parts: 0 };
      order.push(r.id);
    }
    map[r.id].parts++;
  });
  return {
    success: true,
    snapshots: order.map(function (id) { return map[id]; }).reverse(),
    lastFullBackup: getProp("PS_LAST_BACKUP"),
    lastFullBackupUrl: getProp("PS_LAST_BACKUP_URL")
  };
}

function backupCreate(body) {
  requirePerm("backups.view");
  return withLock(function () {
    const id = snapshotCatalog(clip(body.reason, 120) || "Manual snapshot");
    logActivity("backup.snapshot", id, "");
    return { success: true, id: id };
  });
}

function backupRestore(body) {
  requirePerm("backups.restore");
  const id = str(body.id);
  return withLock(function () {
    const parts = T.backups.readAll(true).filter(function (r) { return r.id === id; })
      .sort(function (a, b) { return a.part - b.part; });
    if (!parts.length) fail("Snapshot not found.", "not_found");
    const data = jsonOf(parts.map(function (p) { return p.data; }).join(""), null);
    if (!data || !Array.isArray(data.products)) fail("This snapshot is damaged.");
    snapshotCatalog("Before restoring " + id);
    T.products.replaceAll(data.products);
    T.categories.replaceAll(listOf(data.categories));
    bumpVersion("catalog");
    logActivity("backup.restore", id, { products: data.products.length });
    return { success: true, products: data.products.length };
  });
}

/* full copy of the whole spreadsheet into Drive */
function fullBackup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const file = DriveApp.getFileById(ss.getId());
  const folders = DriveApp.getFoldersByName("PearlSkino Backups");
  const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder("PearlSkino Backups");
  const copy = file.makeCopy("PearlSkino backup " + nowStr(), folder);
  setProp("PS_LAST_BACKUP", nowStr());
  setProp("PS_LAST_BACKUP_URL", copy.getUrl());
  /* keep only the newest 14 copies */
  const all = [];
  const it = folder.getFiles();
  while (it.hasNext()) all.push(it.next());
  all.sort(function (a, b) { return b.getDateCreated().getTime() - a.getDateCreated().getTime(); });
  all.slice(14).forEach(function (f) { f.setTrashed(true); });
  return copy.getUrl();
}

function backupFull() {
  requirePerm("backups.run");
  const url = fullBackup();
  logActivity("backup.full", "", "");
  return { success: true, url: url, time: getProp("PS_LAST_BACKUP") };
}

/* time-driven trigger entry point */
function dailyBackup() {
  resetRequestState();
  try {
    fullBackup();
    snapshotCatalog("Daily automatic snapshot");
  } catch (error) {
    console.error("daily backup failed: " + error);
  }
  try {
    lowStockDigest();
  } catch (error) {
    console.error("low stock digest failed: " + error);
  }
}

/* one short message a day listing everything that is low or sold out */
function lowStockDigest() {
  const settings = getSettings();
  if (!settings.notifyLowStockDigest || !settings.notifyOnLowStock) return;
  const items = lowStockItems().filter(function (i) { return i.visibility === "visible"; });
  if (!items.length) return;
  const lines = items.slice(0, 25).map(function (i) {
    return i.name + (i.variant ? " - " + i.variant : "") + ": " + (i.stock <= 0 ? "SOLD OUT" : i.stock + " left");
  });
  if (items.length > 25) lines.push("...and " + (items.length - 25) + " more");
  notifyAdminEvent("low_stock", "Daily stock check (" + items.length + ")", lines.join("\n"));
}

/* ---------------------------------------------------------
   IMAGE UPLOADS  (Google Drive)
--------------------------------------------------------- */
function sniffImage(bytes) {
  if (bytes.length > 12) {
    const b = bytes.map(function (x) { return x < 0 ? x + 256 : x; });
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return { mime: "image/png", ext: "png" };
    if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return { mime: "image/jpeg", ext: "jpg" };
    if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return { mime: "image/gif", ext: "gif" };
    if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return { mime: "image/webp", ext: "webp" };
  }
  return null;
}

function decodeImage(data) {
  const clean = String(data || "").replace(/^data:[^;]+;base64,/, "");
  if (!clean) fail("No image data provided.");
  if (clean.length > 8000000) fail("Image is too large. Please use a smaller photo.");
  let bytes;
  try {
    bytes = Utilities.base64Decode(clean);
  } catch (error) {
    fail("The image could not be read.");
  }
  const kind = sniffImage(bytes);
  if (!kind) fail("Only PNG, JPG, WEBP or GIF images are allowed.");
  return { bytes: bytes, kind: kind };
}

function slugifyFileName(value) {
  const text = String(value || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").trim();
  return text.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "product-image";
}

function driveFolder(name) {
  const folders = DriveApp.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(name);
}

function trashFilesByName(folder, fileName) {
  const files = folder.getFilesByName(fileName);
  while (files.hasNext()) files.next().setTrashed(true);
}

function uploadProductImage(body) {
  requirePerm("products.edit");
  const image = decodeImage(body.image);
  const fileName = slugifyFileName(body.productName) + "-" + new Date().getTime().toString(36) + "." + image.kind.ext;
  const blob = Utilities.newBlob(image.bytes, image.kind.mime, fileName);
  const file = driveFolder("PearlSkino Product Images").createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const fileId = file.getId();
  logActivity("image.upload", fileName, "");
  return {
    success: true,
    url: "https://lh3.googleusercontent.com/d/" + fileId + "=w2000",
    fileId: fileId,
    fileName: fileName
  };
}

function uploadLogo(body) {
  requirePerm("settings.edit");
  const image = decodeImage(body.image);
  const fileName = "PearlSkino-BD-Logo." + image.kind.ext;
  const blob = Utilities.newBlob(image.bytes, image.kind.mime, fileName);
  const folder = driveFolder("PearlSkino Brand Assets");
  trashFilesByName(folder, fileName);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const fileId = file.getId();
  const url = file.getDownloadUrl();
  updateSettings({ logoUrl: url, logoFileId: fileId, logoFileName: fileName });
  logActivity("logo.upload", fileName, "");
  return { success: true, url: url, fileId: fileId, fileName: fileName };
}

/* public: the logo as base64 text.  Only the saved logo file can be fetched. */
function logoProxy(id) {
  const settings = getSettings();
  const wanted = str(id);
  const body = wanted && wanted === settings.logoFileId
    ? Utilities.base64Encode(DriveApp.getFileById(wanted).getBlob().getBytes())
    : "";
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.TEXT);
}
/* =========================================================
   MEDIA  -  product videos and customer review photos (Google Drive)
========================================================= */

/* first bytes only, so a 10 MB video is never copied around */
function sniffVideo(bytes) {
  if (!bytes || bytes.length < 16) return null;
  const b = [];
  for (let i = 0; i < 16; i++) b.push(bytes[i] < 0 ? bytes[i] + 256 : bytes[i]);
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    const brand = String.fromCharCode(b[8], b[9], b[10], b[11]);
    if (brand === "qt  ") return { mime: "video/quicktime", ext: "mov" };
    return { mime: "video/mp4", ext: "mp4" };
  }
  if (b[0] === 0x1A && b[1] === 0x45 && b[2] === 0xDF && b[3] === 0xA3) return { mime: "video/webm", ext: "webm" };
  return null;
}

function videoLimitMb() {
  const wanted = num(getSettings().videoUploadMaxMb, 10);
  return Math.min(CONFIG.VIDEO_HARD_MAX_MB, Math.max(1, wanted));
}

function uploadProductVideo(body) {
  requirePerm("products.edit");
  const limitMb = videoLimitMb();
  const clean = String(body.video || "").replace(/^data:[^;]+;base64,/, "");
  if (!clean) fail("No video data provided.");
  if (clean.length > Math.ceil(limitMb * 1048576 * 4 / 3) + 200) {
    fail("This video is too large. The limit is " + limitMb + " MB - use a shorter clip, or paste a YouTube / Facebook link instead.");
  }
  let bytes;
  try {
    bytes = Utilities.base64Decode(clean);
  } catch (error) {
    fail("The video could not be read.");
  }
  if (bytes.length > limitMb * 1048576) {
    fail("This video is too large. The limit is " + limitMb + " MB - use a shorter clip, or paste a YouTube / Facebook link instead.");
  }
  const kind = sniffVideo(bytes);
  if (!kind) fail("Only MP4, MOV or WEBM videos are allowed.");
  const fileName = slugifyFileName(body.productName || "product") + "-video-" + new Date().getTime().toString(36) + "." + kind.ext;
  const blob = Utilities.newBlob(bytes, kind.mime, fileName);
  const file = driveFolder("PearlSkino Product Videos").createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const fileId = file.getId();
  logActivity("video.upload", fileName, Math.round(bytes.length / 1024) + " KB");
  return {
    success: true,
    video: { kind: "drive", id: fileId, url: "https://drive.google.com/file/d/" + fileId + "/preview", poster: "", title: "" },
    fileId: fileId,
    fileName: fileName
  };
}

/* ---------------------------------------------------------
   REVIEW PHOTOS  (small photos, compressed by the browser first)
--------------------------------------------------------- */
function saveReviewPhotos(photos, productName) {
  const list = listOf(photos).slice(0, CONFIG.REVIEW_PHOTO_MAX);
  const urls = [];
  list.forEach(function (data) {
    const clean = String(data || "").replace(/^data:[^;]+;base64,/, "");
    if (!clean) return;
    if (clean.length > Math.ceil(CONFIG.REVIEW_PHOTO_MAX_KB * 1024 * 4 / 3) + 200) {
      fail("One of your photos is too large. Please choose a smaller photo.");
    }
    let bytes;
    try {
      bytes = Utilities.base64Decode(clean);
    } catch (error) {
      fail("One of your photos could not be read.");
    }
    const kind = sniffImage(bytes);
    if (!kind || kind.ext === "gif") fail("Photos must be PNG, JPG or WEBP.");
    const fileName = "review-" + slugifyFileName(productName) + "-" + new Date().getTime().toString(36) + urls.length + "." + kind.ext;
    const file = driveFolder("PearlSkino Review Photos").createFile(Utilities.newBlob(bytes, kind.mime, fileName));
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    urls.push("https://lh3.googleusercontent.com/d/" + file.getId() + "=w1200");
  });
  return urls;
}

function trashReviewPhotos(urls) {
  listOf(urls).forEach(function (url) {
    const m = /\/d\/([A-Za-z0-9_-]+)/.exec(str(url));
    if (!m) return;
    try { DriveApp.getFileById(m[1]).setTrashed(true); } catch (error) { /* already gone */ }
  });
}
/* =========================================================
   ORDERS
   The FIRST sheet of the spreadsheet is the orders sheet
   (your Google Form responses).  New columns are added to
   the right automatically; nothing you already have moves.
========================================================= */

const LOCKED_STATUSES = ["Cancelled", "Returned"];
const EDITABLE_STATUSES = ["New", "Confirmed", "Processing"];

/* ---------------------------------------------------------
   ITEMS
--------------------------------------------------------- */
function parseCostData(text) {
  const s = str(text);
  if (!s) return [];
  return s.split("||").map(function (chunk) {
    const p = chunk.split("|").map(function (x) { return x.trim(); });
    if (p.length < 5) return null;
    return { id: p[0], variantId: "", name: p[1], variant: "", qty: num(p[2], 1), price: num(p[3], 0), cost: num(p[4], 0) };
  }).filter(Boolean);
}

function normalizeItems(list) {
  return listOf(list).map(function (i) {
    return {
      id: str(i.id),
      variantId: str(i.variantId),
      name: str(i.name),
      variant: str(i.variant),
      qty: Math.max(1, Math.floor(num(i.qty, 1))),
      price: num(i.price, 0),
      cost: num(i.cost, 0)
    };
  });
}

function orderItems(row) {
  const stored = normalizeItems(row.items);
  if (stored.length) return stored;
  return normalizeItems(parseCostData(row.costData));
}

function itemsText(items) {
  return items.map(function (i) {
    return i.name + (i.variant ? " (" + i.variant + ")" : "") + " × " + i.qty;
  }).join(", ");
}

function costDataText(items) {
  return items.map(function (i) {
    return [i.id, i.name + (i.variant ? " (" + i.variant + ")" : ""), i.qty, i.price, i.cost].join(" | ");
  }).join(" || ");
}

function itemsSubtotal(items) {
  return items.reduce(function (s, i) { return s + i.price * i.qty; }, 0);
}

function itemsQuantity(items) {
  return items.reduce(function (s, i) { return s + i.qty; }, 0);
}

/* ---------------------------------------------------------
   ORDER IDS
--------------------------------------------------------- */
function orderDayPrefix(day) {
  return "PS-" + str(day).replace(/-/g, "").slice(0, 8) + "-";
}

function nextOrderId(rows, day) {
  const prefix = orderDayPrefix(day || todayStr());
  let max = 0;
  rows.forEach(function (r) {
    if (r.orderId && r.orderId.indexOf(prefix) === 0) {
      const n = parseInt(r.orderId.slice(prefix.length), 10);
      if (n > max) max = n;
    }
  });
  return prefix + String(max + 1).padStart(3, "0");
}

/* give an ID + "New" status to rows that arrived straight from the Google Form */
function assignMissingOrderIds() {
  const rows = T.orders.readAll();
  const needs = rows.filter(function (r) { return !r.orderId || !r.status; });
  if (!needs.length) return [];
  return withLock(function () {
    const fresh = T.orders.readAll(true);
    const assigned = [];
    fresh.forEach(function (r) {
      if (r.orderId && r.status) return;
      const patch = {};
      if (!r.orderId) {
        patch.orderId = nextOrderId(fresh, dayOf(r.timestamp) || todayStr());
        r.orderId = patch.orderId;
      }
      if (!r.status) patch.status = CONFIG.DEFAULT_STATUS;
      if (!r.source) patch.source = "form";
      T.orders.update(r._row, patch);
      assigned.push(r.orderId);
    });
    return assigned;
  });
}

/* ---------------------------------------------------------
   TRACKING
--------------------------------------------------------- */
function trackToken(orderId, phone) {
  return sign("track:" + orderId + ":" + normalizePhone(phone)).slice(0, 12);
}

function trackUrl(order) {
  const base = str(getSettings().siteUrl);
  return base + "/track?o=" + encodeURIComponent(order.orderId) + "&t=" + trackToken(order.orderId, order.phone);
}

/* ---------------------------------------------------------
   VIEWS
--------------------------------------------------------- */
function orderView(row) {
  const items = orderItems(row);
  const subtotal = row.subtotal > 0 ? row.subtotal : (items.length ? itemsSubtotal(items) : row.total);
  return {
    orderId: row.orderId,
    timestamp: row.timestamp,
    name: row.name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    area: row.area,
    products: row.products,
    quantity: row.quantity || itemsQuantity(items),
    total: row.total,
    payment: row.payment,
    delivery: row.delivery,
    note: row.note,
    status: row.status || CONFIG.DEFAULT_STATUS,
    subtotal: subtotal,
    discount: row.discount,
    coupon: row.coupon,
    deliveryCharge: row.deliveryCharge,
    zone: row.zone,
    whatsapp: row.whatsapp,
    customerId: row.customerId,
    items: items,
    paymentStatus: row.paymentStatus || "Unpaid",
    payRef: row.payRef,
    adminNote: row.adminNote,
    cancelReason: row.cancelReason,
    trashed: boolOf(row.trashed, false),
    source: row.source || "form",
    stockApplied: row.stockApplied,
    trackingCode: row.trackingCode,
    updatedAt: row.updatedAt,
    rowNumber: row._row
  };
}

function orderCostOf(view, finance) {
  if (!finance) return null;
  return view.items.reduce(function (s, i) { return s + i.cost * i.qty; }, 0);
}

/* what the printed invoice / packing slip needs (readable by anyone who can see orders) */
function printInfo() {
  const settings = getSettings();
  return {
    storeName: settings.storeName,
    phone: settings.phone,
    email: settings.email,
    address: settings.storeAddress,
    siteUrl: settings.siteUrl,
    footer: settings.invoiceFooter
  };
}

function ordersAdminList(body) {
  requirePerm("orders.view");
  assignMissingOrderIds();
  const finance = can("finance.view");
  const includeTrashed = !!(body && body.includeTrashed);
  const returnsByOrder = {};
  T.returns.readAll().forEach(function (r) {
    returnsByOrder[r.orderId] = (returnsByOrder[r.orderId] || 0) + 1;
  });
  const out = [];
  T.orders.readAll().forEach(function (row) {
    const view = orderView(row);
    if (view.trashed && !includeTrashed) return;
    if (!finance) {
      view.items = view.items.map(function (i) { return Object.assign({}, i, { cost: 0 }); });
    }
    view.returns = returnsByOrder[view.orderId] || 0;
    out.push(view);
  });
  out.reverse();
  return { success: true, orders: out, print: printInfo() };
}

function findOrderRow(orderId) {
  const id = str(orderId).toLowerCase();
  if (!id) return null;
  return T.orders.find(function (r) { return r.orderId.toLowerCase() === id; });
}

function orderDetail(body) {
  requirePerm("orders.view");
  const row = findOrderRow(body.orderId);
  if (!row) fail("Order not found.", "not_found");
  const view = orderView(row);
  if (!can("finance.view")) view.items = view.items.map(function (i) { return Object.assign({}, i, { cost: 0 }); });
  const history = T.orderHistory.filter(function (h) { return h.orderId === view.orderId; })
    .map(function (h) { return pickKeys(h, ["time", "actor", "action", "from", "to", "note"]); });
  const returns = T.returns.filter(function (r) { return r.orderId === view.orderId; }).map(returnView);
  const flag = view.phone ? T.customerFlags.findBy("phone", view.phone) : null;
  const others = view.phone
    ? T.orders.filter(function (r) { return r.phone === view.phone && r.orderId !== view.orderId && !boolOf(r.trashed, false); }).length
    : 0;
  return {
    success: true,
    order: view,
    history: history,
    returns: returns,
    customer: { blocked: !!(flag && flag.blocked), note: flag ? flag.note : "", otherOrders: others },
    whatsapp: whatsappLinkFor(view),
    trackUrl: trackUrl(view),
    print: printInfo()
  };
}

function whatsappVars(view) {
  return {
    name: view.name.split(" ")[0] || view.name,
    orderId: view.orderId,
    status: view.status,
    total: fmtMoney(view.total),
    store: getSettings().storeName,
    trackUrl: trackUrl(view)
  };
}

function whatsappLinkFor(view, statusOverride) {
  const settings = getSettings();
  const templates = settings.waTemplates || {};
  const status = statusOverride || view.status;
  const template = templates[status] || SETTING_DEFS.waTemplates.def[status] || "";
  const text = fillTemplate(template, whatsappVars(view));
  const to = view.whatsapp || view.phone;
  return { to: to, text: text, url: buildWhatsAppUrl(to, text) };
}

/* ---------------------------------------------------------
   HISTORY
--------------------------------------------------------- */
function addHistory(orderId, action, from, to, note, customerVisible) {
  T.orderHistory.append({
    time: nowStr(), orderId: orderId, actor: actorName(), action: action,
    from: from || "", to: to || "", note: clip(note, 500), visible: customerVisible ? "yes" : ""
  });
  if (T.orderHistory.open().getLastRow() > 20000) T.orderHistory.trimTo(16000);
}

/* ---------------------------------------------------------
   DELIVERY ZONES
--------------------------------------------------------- */
function pickZone(settings, zoneId, area) {
  const zones = listOf(settings.deliveryZones);
  if (!zones.length) return null;
  if (zoneId) {
    const z = zones.filter(function (x) { return x.id === zoneId; })[0];
    if (z) return z;
  }
  const a = canonKey(area);
  if (a) {
    for (let i = 0; i < zones.length; i++) {
      const hit = zones[i].areas.some(function (kw) { return a.indexOf(canonKey(kw)) !== -1; });
      if (hit) return zones[i];
    }
  }
  return zones[0];
}

function deliveryFor(settings, subtotal, method, zoneId, area) {
  if (method === "Pickup") return { charge: 0, zone: null, free: false };
  const zone = pickZone(settings, zoneId, area);
  const base = zone ? zone.charge : num(settings.deliveryCharge, 0);
  const threshold = zone && zone.freeThreshold > 0 ? zone.freeThreshold : num(settings.freeDeliveryThreshold, 0);
  if (threshold > 0 && subtotal >= threshold) return { charge: 0, zone: zone, free: true };
  return { charge: base, zone: zone, free: false };
}

/* ---------------------------------------------------------
   CREATE ORDER  (web checkout  +  admin manual order)
--------------------------------------------------------- */
function cleanCustomerInput(c, admin) {
  const name = squash(clip(c && c.name, 80));
  if (name.length < 2) fail("Please enter your full name.");
  const phone = normalizePhone(c && c.phone);
  if (!isBdMobile(phone)) fail("Please enter a valid Bangladeshi mobile number (01XXXXXXXXX).");
  const email = str(c && c.email);
  if (email && !isEmail(email)) fail("That email address does not look right.");
  let whatsapp = normalizePhone(c && c.whatsapp);
  if (whatsapp && !isBdMobile(whatsapp)) fail("Please enter a valid WhatsApp number, or leave it empty.");
  return {
    name: name,
    phone: phone,
    email: clip(email, 120),
    whatsapp: whatsapp,
    address: clip(c && c.address, 400),
    area: clip(c && c.area, 100)
  };
}

function resolveOrderItems(requested, admin) {
  const wanted = {};
  const order = [];
  listOf(requested).forEach(function (r) {
    const id = str(r && r.id);
    if (!id) return;
    const variantId = str(r.variantId);
    const key = id + "|" + variantId;
    const qty = Math.floor(num(r.qty, 0));
    if (qty < 1) return;
    if (!wanted[key]) {
      wanted[key] = { id: id, variantId: variantId, qty: 0, price: r.price };
      order.push(key);
    }
    wanted[key].qty += qty;
  });
  if (!order.length) fail("Your bag is empty.");
  if (order.length > CONFIG.MAX_ITEMS_PER_ORDER) fail("Too many different products in one order.");

  const catMap = categoryMap();
  const items = [];
  order.forEach(function (key) {
    const w = wanted[key];
    const row = findProductRow(w.id);
    if (!row) fail("One of the products is no longer available.", "stock");
    const p = productFromRow(row);
    if (!admin) {
      if (!productVisible(p, catMap) || p.status === "inactive") {
        fail("\"" + p.name + "\" is no longer available.", "stock");
      }
      if (w.qty > CONFIG.MAX_QTY_PER_LINE) fail("You can order at most " + CONFIG.MAX_QTY_PER_LINE + " of one product.");
    }
    let unit = p.price;
    let label = "";
    let available = p.stock;
    if (p.variants.length) {
      const v = p.variants.filter(function (x) { return x.id === w.variantId; })[0];
      if (!v) fail("Please choose an option for \"" + p.name + "\".", "stock");
      label = v.label;
      available = v.stock;
      if (v.price !== null) unit = v.price;
    } else if (w.variantId) {
      w.variantId = "";
    }
    if (admin && w.price !== undefined && w.price !== null && w.price !== "") unit = Math.max(0, taka(w.price));
    items.push({
      id: p.id, variantId: w.variantId, name: p.name, variant: label,
      qty: w.qty, price: unit, cost: p.costPrice, _available: available
    });
  });
  return items;
}

function createOrder(input, opts) {
  opts = opts || {};
  const admin = !!opts.admin;
  const settings = getSettings();
  const customer = cleanCustomerInput(input.customer, admin);

  /* delivery / payment */
  const deliveryMethod = input.delivery === "Pickup" ? "Pickup" : "Home Delivery";
  if (deliveryMethod === "Pickup" && !settings.pickupEnabled && !admin) fail("Pickup is not available right now.");
  if (deliveryMethod === "Home Delivery" && customer.address.length < 5) fail("Please enter your delivery address.");
  let payment = str(input.payment) || "Cash on Delivery";
  if (["Cash on Delivery", "Pickup", "bKash"].indexOf(payment) === -1) fail("Please choose a payment method.");
  if (!admin) {
    if (payment === "Cash on Delivery" && !settings.codEnabled) fail("Cash on Delivery is not available right now.");
    if (payment === "Pickup" && !settings.pickupEnabled) fail("Pickup is not available right now.");
    if (payment === "bKash" && !settings.bkashEnabled) fail("bKash payment is not available right now.");
  }
  let payRef = "";
  let paymentStatus = "Unpaid";
  if (payment === "bKash") {
    const trx = clip(input.payRef && input.payRef.trxId, 40);
    const sender = normalizePhone(input.payRef && input.payRef.sender);
    if (!admin && (trx.length < 6 || !/^[A-Za-z0-9]+$/.test(trx))) fail("Please enter the bKash transaction ID.");
    payRef = trx + (sender ? " (from " + sender + ")" : "");
    paymentStatus = "Pending verification";
  }
  if (admin && CONFIG.PAYMENT_STATUSES.indexOf(str(input.paymentStatus)) !== -1) paymentStatus = input.paymentStatus;

  const clientRef = clip(input.clientRef, 60);

  return withLock(function () {
    const rows = T.orders.readAll(true);

    if (clientRef) {
      const dup = rows.filter(function (r) { return r.idemKey === clientRef; })[0];
      if (dup) return { duplicate: true, order: orderView(dup) };
    }

    if (!admin) {
      const flag = T.customerFlags.findBy("phone", customer.phone);
      if (flag && flag.blocked) {
        fail("We are unable to take this order online. Please contact us on WhatsApp or phone.", "blocked");
      }
    }

    const items = resolveOrderItems(input.items, admin);
    if (!(admin && opts.skipStock)) {
      items.forEach(function (i) {
        if (i._available < i.qty) {
          fail(i._available > 0
            ? "Only " + i._available + " left of \"" + i.name + (i.variant ? " - " + i.variant : "") + "\"."
            : "\"" + i.name + (i.variant ? " - " + i.variant : "") + "\" is out of stock.", "stock");
        }
      });
    }
    items.forEach(function (i) { delete i._available; });

    const subtotal = itemsSubtotal(items);

    /* coupon */
    let discount = 0;
    let freeShip = false;
    let couponCode = "";
    if (str(input.coupon)) {
      const check = couponCheck(input.coupon, subtotal, customer.phone, rows);
      discount = check.discount;
      freeShip = check.freeShipping;
      couponCode = check.coupon.code;
    }
    if (admin && input.discount !== undefined && input.discount !== "") {
      discount = Math.min(subtotal, Math.max(0, taka(input.discount)));
    }
    const afterDiscount = Math.max(0, subtotal - discount);
    if (!admin && num(settings.minOrderAmount, 0) > 0 && afterDiscount < settings.minOrderAmount) {
      fail("The minimum order is " + fmtMoney(settings.minOrderAmount) + ".");
    }

    const delivery = deliveryFor(settings, subtotal, deliveryMethod, str(input.zoneId), customer.area);
    let deliveryCharge = freeShip ? 0 : delivery.charge;
    if (admin && input.deliveryCharge !== undefined && input.deliveryCharge !== "") {
      deliveryCharge = Math.max(0, taka(input.deliveryCharge));
    }
    const total = afterDiscount + deliveryCharge;

    const orderId = nextOrderId(rows, todayStr());
    const applyStock = !(admin && opts.skipStock);
    const lowAlerts = [];
    if (applyStock) {
      items.forEach(function (i) {
        const res = changeStock(i.id, i.variantId, -i.qty, "Order " + orderId, orderId);
        if (res.crossedLow) lowAlerts.push({ name: i.name + (i.variant ? " - " + i.variant : ""), stock: res.after });
      });
      bumpVersion("catalog");
    }
    if (couponCode) couponAdjustUsed(couponCode, 1);

    const status = admin && CONFIG.ALLOWED_STATUSES.indexOf(str(input.status)) !== -1 ? input.status : CONFIG.DEFAULT_STATUS;
    const record = {
      orderId: orderId,
      timestamp: new Date(),
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: deliveryMethod === "Pickup" && !customer.address ? "Pickup" : customer.address,
      area: customer.area,
      products: itemsText(items),
      quantity: itemsQuantity(items),
      total: total,
      payment: payment,
      delivery: deliveryMethod,
      note: clip(input.note, 600),
      costData: costDataText(items),
      status: status,
      subtotal: subtotal,
      discount: discount,
      coupon: couponCode,
      deliveryCharge: deliveryCharge,
      zone: delivery.zone ? delivery.zone.name : "",
      whatsapp: customer.whatsapp,
      customerId: str(opts.customerId),
      items: items,
      paymentStatus: paymentStatus,
      payRef: payRef,
      source: admin ? (clip(input.source, 20) || "manual") : "web",
      stockApplied: applyStock ? "yes" : "",
      idemKey: clientRef,
      updatedAt: nowStr()
    };
    T.orders.append(record);
    /* the customer is kept in their own table - deleting this order later never removes them */
    try {
      customerUpsert({
        fromOrder: true, phone: customer.phone, email: customer.email, name: customer.name,
        address: customer.address, area: customer.area, time: nowStr(), source: admin ? "admin" : "web"
      });
    } catch (error) { console.error("customer upsert failed: " + error); }
    try { markCartRecovered(customer.phone, customer.email, orderId); } catch (error) { /* optional */ }
    addHistory(orderId, admin ? "Order created by staff" : "Order placed", "", status, "", true);
    if (admin) logActivity("order.create", orderId, fmtMoney(total));

    const view = orderView(Object.assign({ _row: 0 }, record, { timestamp: nowStr(), trashed: "" }));
    return { duplicate: false, order: view, lowAlerts: lowAlerts };
  });
}

function placeOrderPublic(body) {
  if (str(body.hp)) fail("Your order could not be placed. Please try again.");
  const settings = getSettings();
  if (settings.maintenanceMode) fail(settings.maintenanceMessage || "The store is updating. Please try later.", "maintenance");
  const account = body.customerToken ? authenticateCustomer(body.customerToken) : null;
  if (!settings.guestCheckout && !account) fail("Please log in to place an order.", "auth");

  const phone = normalizePhone(body.customer && body.customer.phone);
  /* a retried request (same clientRef) must always get its original answer */
  const clientRef = clip(body.clientRef, 60);
  const dup = clientRef ? T.orders.find(function (r) { return r.idemKey === clientRef; }) : null;
  if (dup) return placeOrderResponse(orderView(dup), true);

  rateCheck("order:" + phone, 5, "You have placed several orders just now. Please wait a few minutes.");
  rateCheck("order:all", 150, "We are receiving a lot of orders. Please try again in a minute.");

  const result = createOrder(body, { admin: false, customerId: account ? account.id : "" });
  const order = result.order;
  if (!result.duplicate) {
    rateHit("order:" + phone, 600);
    rateHit("order:all", 600);
    afterOrderPlaced(order, result.lowAlerts);
  }
  return placeOrderResponse(order, result.duplicate);
}

function placeOrderResponse(order, duplicate) {
  return {
    success: true,
    duplicate: duplicate,
    orderId: order.orderId,
    token: trackToken(order.orderId, order.phone),
    total: order.total,
    subtotal: order.subtotal,
    discount: order.discount,
    deliveryCharge: order.deliveryCharge,
    payment: order.payment,
    paymentStatus: order.paymentStatus,
    items: order.items.map(function (i) { return { name: i.name, variant: i.variant, qty: i.qty, price: i.price }; })
  };
}

function orderCreateManual(body) {
  requirePerm("orders.edit");
  const result = createOrder(body, {
    admin: true,
    skipStock: boolOf(body.skipStock, false)
  });
  if (!result.duplicate && boolOf(body.notify, false)) {
    afterOrderPlaced(result.order, result.lowAlerts);
  } else if (!result.duplicate) {
    sendLowStockAlert(result.lowAlerts);
  }
  return { success: true, order: result.order };
}

/* ---------------------------------------------------------
   STATUS CHANGES
--------------------------------------------------------- */
function restockOrder(row, view, reason) {
  if (row.stockApplied !== "yes") return 0;
  let n = 0;
  view.items.forEach(function (i) {
    if (!i.id) return;
    try {
      changeStock(i.id, i.variantId, i.qty, reason, view.orderId);
      n++;
    } catch (error) {
      /* product deleted for good: nothing to restock */
    }
  });
  bumpVersion("catalog");
  return n;
}

function reapplyStock(view, reason) {
  view.items.forEach(function (i) {
    if (!i.id) return;
    changeStock(i.id, i.variantId, -i.qty, reason, view.orderId);
  });
  bumpVersion("catalog");
}

function orderUpdateStatus(body) {
  requirePerm("orders.edit");
  const status = str(body.status);
  if (CONFIG.ALLOWED_STATUSES.indexOf(status) === -1) fail("Unknown status.");
  const reason = clip(body.reason, 300);

  const outcome = withLock(function () {
    const row = findOrderRow(body.orderId);
    if (!row) fail("Order not found.", "not_found");
    if (boolOf(row.trashed, false)) fail("This order is in the trash. Restore it first.");
    const from = row.status || CONFIG.DEFAULT_STATUS;
    if (from === status) return { unchanged: true, row: row };

    const reopening = LOCKED_STATUSES.indexOf(from) !== -1;
    if (reopening) {
      if (_actor.role !== "owner") fail("A " + from.toLowerCase() + " order is locked. Only the owner can reopen it.", "locked");
      if (!reason) fail("Please give a reason for reopening this order.");
    }
    if (status === "Cancelled" && reason.length < 3) fail("Please write why this order is being cancelled.");
    if (status === "Returned" && ["Delivered", "Shipped"].indexOf(from) === -1) {
      fail("Only shipped or delivered orders can be marked as returned.");
    }

    const view = orderView(row);
    const patch = { status: status, updatedAt: nowStr() };

    if (status === "Cancelled") {
      patch.cancelReason = reason;
      if (restockOrder(row, view, "Order " + view.orderId + " cancelled")) patch.stockApplied = "restocked";
      if (row.coupon) couponAdjustUsed(row.coupon, -1);
    } else if (status === "Returned") {
      patch.cancelReason = reason;
      if (boolOf(body.restock, false) && restockOrder(row, view, "Order " + view.orderId + " returned")) patch.stockApplied = "restocked";
    } else if (reopening) {
      if (row.stockApplied === "restocked" && view.items.length) {
        reapplyStock(view, "Order " + view.orderId + " reopened");
        patch.stockApplied = "yes";
      }
      if (row.coupon && from === "Cancelled") couponAdjustUsed(row.coupon, 1);
      patch.cancelReason = "";
    }

    T.orders.update(row._row, patch);
    addHistory(view.orderId, "Status changed", from, status, reason, true);
    logActivity("order.status", view.orderId, from + " -> " + status);
    const fresh = Object.assign({}, row, patch);
    return { unchanged: false, row: fresh, from: from };
  });

  const view = orderView(outcome.row);
  if (outcome.unchanged) return { success: true, unchanged: true, order: view };

  let notified = { email: false, whatsapp: false };
  if (boolOf(body.notify, true)) {
    notified = notifyStatusChange(view, outcome.from);
  }
  return {
    success: true,
    order: view,
    notified: notified,
    whatsapp: whatsappLinkFor(view)
  };
}

/* ---------------------------------------------------------
   EDIT FIELDS / ITEMS
--------------------------------------------------------- */
function orderUpdateFields(body) {
  requirePerm("orders.edit");
  const patchIn = body.patch || {};
  return withLock(function () {
    const row = findOrderRow(body.orderId);
    if (!row) fail("Order not found.", "not_found");
    if (boolOf(row.trashed, false)) fail("This order is in the trash.");
    const view = orderView(row);
    const patch = { updatedAt: nowStr() };
    const changes = [];

    if (patchIn.name !== undefined) {
      const name = squash(clip(patchIn.name, 80));
      if (name.length < 2) fail("Name is too short.");
      patch.name = name; changes.push("name");
    }
    if (patchIn.phone !== undefined) {
      const phone = normalizePhone(patchIn.phone);
      if (!isBdMobile(phone)) fail("Phone number does not look right.");
      patch.phone = phone; changes.push("phone");
    }
    if (patchIn.whatsapp !== undefined) {
      const w = normalizePhone(patchIn.whatsapp);
      if (w && !isBdMobile(w)) fail("WhatsApp number does not look right.");
      patch.whatsapp = w; changes.push("whatsapp");
    }
    if (patchIn.email !== undefined) {
      const email = str(patchIn.email);
      if (email && !isEmail(email)) fail("Email does not look right.");
      patch.email = clip(email, 120); changes.push("email");
    }
    if (patchIn.address !== undefined) { patch.address = clip(patchIn.address, 400); changes.push("address"); }
    if (patchIn.area !== undefined) { patch.area = clip(patchIn.area, 100); changes.push("area"); }
    if (patchIn.note !== undefined) { patch.note = clip(patchIn.note, 600); changes.push("note"); }
    if (patchIn.adminNote !== undefined) { patch.adminNote = clip(patchIn.adminNote, 1000); changes.push("admin note"); }
    if (patchIn.trackingCode !== undefined) { patch.trackingCode = clip(patchIn.trackingCode, 60); changes.push("tracking code"); }
    if (patchIn.paymentStatus !== undefined) {
      if (CONFIG.PAYMENT_STATUSES.indexOf(patchIn.paymentStatus) === -1) fail("Unknown payment status.");
      patch.paymentStatus = patchIn.paymentStatus; changes.push("payment status");
    }
    if (patchIn.payment !== undefined && ["Cash on Delivery", "Pickup", "bKash"].indexOf(patchIn.payment) !== -1) {
      patch.payment = patchIn.payment; changes.push("payment");
    }
    if (patchIn.delivery !== undefined && ["Home Delivery", "Pickup"].indexOf(patchIn.delivery) !== -1) {
      patch.delivery = patchIn.delivery; changes.push("delivery");
    }

    let items = view.items;
    let itemsChanged = false;
    if (Array.isArray(patchIn.items)) {
      if (EDITABLE_STATUSES.indexOf(view.status) === -1) fail("Items can only be edited while the order is New, Confirmed or Processing.");
      if (!view.items.length && row.stockApplied === "yes") fail("This order has no item details, so items cannot be edited.");
      const oldQty = {};
      view.items.forEach(function (i) { oldQty[i.id + "|" + i.variantId] = (oldQty[i.id + "|" + i.variantId] || 0) + i.qty; });

      const merged = patchIn.items.map(function (i) {
        const existing = view.items.filter(function (o) { return o.id === str(i.id) && o.variantId === str(i.variantId); })[0];
        return { id: i.id, variantId: i.variantId, qty: i.qty, price: i.price !== undefined && i.price !== "" ? i.price : (existing ? existing.price : undefined) };
      });
      const resolved = resolveOrderItems(merged, true);
      const newQty = {};
      resolved.forEach(function (i) { newQty[i.id + "|" + i.variantId] = i.qty; });

      if (row.stockApplied === "yes") {
        const keys = {};
        Object.keys(oldQty).forEach(function (k) { keys[k] = true; });
        Object.keys(newQty).forEach(function (k) { keys[k] = true; });
        /* first take stock for increases (can fail), then give back decreases */
        Object.keys(keys).forEach(function (k) {
          const diff = (newQty[k] || 0) - (oldQty[k] || 0);
          if (diff > 0) {
            const parts = k.split("|");
            changeStock(parts[0], parts[1], -diff, "Order " + view.orderId + " edited", view.orderId);
          }
        });
        Object.keys(keys).forEach(function (k) {
          const diff = (newQty[k] || 0) - (oldQty[k] || 0);
          if (diff < 0) {
            const parts = k.split("|");
            changeStock(parts[0], parts[1], -diff, "Order " + view.orderId + " edited", view.orderId);
          }
        });
        bumpVersion("catalog");
      }
      items = resolved.map(function (i) { delete i._available; return i; });
      itemsChanged = true;
      changes.push("items");
    }

    let discount = patchIn.discount !== undefined ? Math.max(0, taka(patchIn.discount)) : view.discount;
    let deliveryCharge = patchIn.deliveryCharge !== undefined ? Math.max(0, taka(patchIn.deliveryCharge)) : view.deliveryCharge;
    if (itemsChanged || patchIn.discount !== undefined || patchIn.deliveryCharge !== undefined) {
      const subtotal = itemsChanged ? itemsSubtotal(items) : view.subtotal;
      discount = Math.min(discount, subtotal);
      patch.subtotal = subtotal;
      patch.discount = discount;
      patch.deliveryCharge = deliveryCharge;
      patch.total = Math.max(0, subtotal - discount) + deliveryCharge;
      if (itemsChanged) {
        patch.items = items;
        patch.products = itemsText(items);
        patch.quantity = itemsQuantity(items);
        patch.costData = costDataText(items);
      }
      if (patchIn.discount !== undefined) changes.push("discount");
      if (patchIn.deliveryCharge !== undefined) changes.push("delivery charge");
    }

    if (!changes.length) return { success: true, unchanged: true, order: view };
    T.orders.update(row._row, patch);
    addHistory(view.orderId, "Edited", "", "", changes.join(", "), false);
    logActivity("order.edit", view.orderId, changes.join(", "));
    return { success: true, order: orderView(Object.assign({}, row, patch)) };
  });
}

/* ---------------------------------------------------------
   TRASH
--------------------------------------------------------- */
function orderTrash(body) {
  requirePerm("orders.trash");
  return withLock(function () {
    const row = findOrderRow(body.orderId);
    if (!row) fail("Order not found.", "not_found");
    if (row.stockApplied === "yes") {
      fail("Cancel this order first so its stock goes back, then move it to the trash.");
    }
    T.orders.update(row._row, { trashed: "yes", updatedAt: nowStr() });
    addHistory(row.orderId, "Moved to trash", "", "", "", false);
    logActivity("order.trash", row.orderId, "");
    return { success: true };
  });
}

function orderRestore(body) {
  requirePerm("orders.trash");
  return withLock(function () {
    const row = findOrderRow(body.orderId);
    if (!row) fail("Order not found.", "not_found");
    T.orders.update(row._row, { trashed: "", updatedAt: nowStr() });
    addHistory(row.orderId, "Restored from trash", "", "", "", false);
    logActivity("order.restore", row.orderId, "");
    return { success: true };
  });
}

function orderPurge(body) {
  requirePerm("orders.delete");
  return withLock(function () {
    const row = findOrderRow(body.orderId);
    if (!row) fail("Order not found.", "not_found");
    if (!boolOf(row.trashed, false)) fail("Only orders in the trash can be removed permanently.");
    T.orders.remove(row._row);
    logActivity("order.purge", row.orderId, "");
    return { success: true };
  });
}

/* ---------------------------------------------------------
   PUBLIC TRACKING  +  CUSTOMER VIEW
--------------------------------------------------------- */
function customerSafeOrder(view) {
  const history = T.orderHistory.filter(function (h) { return h.orderId === view.orderId && h.visible === "yes"; });
  const timeline = history.map(function (h) {
    return { time: h.time, status: h.to || h.action, note: h.action === "Status changed" && h.to === "Cancelled" ? "" : h.note };
  });
  if (!timeline.length) timeline.push({ time: view.timestamp, status: "New", note: "" });
  return {
    orderId: view.orderId,
    placedAt: view.timestamp,
    status: view.status,
    firstName: (view.name || "").split(" ")[0],
    items: view.items.map(function (i) { return { name: i.name, variant: i.variant, qty: i.qty, price: i.price }; }),
    products: view.items.length ? "" : view.products,
    subtotal: view.subtotal,
    discount: view.discount,
    deliveryCharge: view.deliveryCharge,
    total: view.total,
    payment: view.payment,
    paymentStatus: view.paymentStatus,
    delivery: view.delivery,
    area: view.area,
    coupon: view.coupon,
    trackingCode: view.trackingCode,
    cancelReason: view.status === "Cancelled" ? view.cancelReason : "",
    timeline: timeline,
    token: trackToken(view.orderId, view.phone)
  };
}

function trackOrderPublic(body) {
  const id = str(body.orderId).toUpperCase();
  if (!id) fail("Please enter your order number.");
  rateLimit("track:" + id, 12, 600, "Too many attempts. Please wait a few minutes.");
  rateLimit("track:all", 300, 600, "Too many attempts. Please wait a few minutes.");
  const row = findOrderRow(id);
  const phone = normalizePhone(body.phone);
  const tokenOk = body.token && row && constantTimeEquals(trackToken(row.orderId, row.phone), str(body.token));
  const phoneOk = row && phone && (phone === row.phone || (row.whatsapp && phone === row.whatsapp));
  if (!row || boolOf(row.trashed, false) || !(tokenOk || phoneOk)) {
    fail("We could not find an order with those details.", "not_found");
  }
  return { success: true, order: customerSafeOrder(orderView(row)) };
}

/* ---------------------------------------------------------
   CUSTOMERS  (list / segments / broadcast live in 07b-customers.gs)
--------------------------------------------------------- */
function customerKeyOf(row) {
  return str(row.phone || row.email || row.name).toLowerCase();
}

function customerDetail(body) {
  requirePerm("customers.view");
  const phone = normalizePhone(body.phone);
  const key = str(body.id).toLowerCase();
  const orders = T.orders.filter(function (r) {
    return !boolOf(r.trashed, false) && ((phone && r.phone === phone) || (key && customerKeyOf(r) === key));
  }).map(orderView).reverse();
  const flag = phone ? T.customerFlags.findBy("phone", phone) : null;
  const account = phone ? T.accounts.findBy("phone", phone) : null;
  const record = key ? T.customers.findBy("key", key) : null;
  return {
    success: true,
    customer: record ? pickKeys(record, ["key", "created", "source", "lastOrderAt", "deleted"]) : null,
    orders: orders,
    flag: flag ? pickKeys(flag, ["blocked", "blockReason", "note", "tags", "hidden"]) : null,
    account: account ? { id: account.id, created: account.created, lastLogin: account.lastLogin, disabled: account.disabled } : null
  };
}

function customerFlagSave(body) {
  requirePerm("customers.edit");
  const phone = normalizePhone(body.phone);
  if (!phone) fail("Phone number is required.");
  return withLock(function () {
    const existing = T.customerFlags.findBy("phone", phone);
    const record = { phone: phone, updatedAt: nowStr() };
    if (body.name !== undefined) record.name = clip(body.name, 80);
    if (body.blocked !== undefined) record.blocked = boolOf(body.blocked, false);
    if (body.blockReason !== undefined) record.blockReason = clip(body.blockReason, 300);
    if (body.note !== undefined) record.note = clip(body.note, 1000);
    if (body.tags !== undefined) record.tags = clip(body.tags, 120);
    if (body.hidden !== undefined) record.hidden = boolOf(body.hidden, false);
    if (existing) T.customerFlags.update(existing._row, record);
    else T.customerFlags.append(record);
    logActivity("customer.flag", phone, pickKeys(body, ["blocked", "hidden", "note"]));
    return { success: true };
  });
}
/* =========================================================
   CUSTOMERS  -  a real table, separate from orders
   Deleting an order never removes the customer. A customer
   goes away only when you press "Delete customer" (their
   orders stay in the Orders sheet).
========================================================= */

function ageMinutes(timeString) {
  try {
    const d = Utilities.parseDate(str(timeString), tz(), "yyyy-MM-dd HH:mm:ss");
    return Math.max(0, Math.floor((new Date().getTime() - d.getTime()) / 60000));
  } catch (error) {
    return 0;
  }
}

function ageDays(timeString) {
  const day = parseDay(dayOf(timeString));
  const today = parseDay(todayStr());
  if (!day || !today) return 0;
  return Math.max(0, Math.round((today.getTime() - day.getTime()) / 86400000));
}

/* add or refresh one customer (called whenever an order is placed) */
function customerUpsert(info) {
  const key = customerKeyOf(info);
  if (!key) return null;
  const when = str(info.time) || nowStr();
  const existing = T.customers.findBy("key", key);
  if (!existing) {
    T.customers.append({
      key: key, phone: normalizePhone(info.phone), name: clip(info.name, 80), email: clip(info.email, 120),
      address: clip(info.address, 400), area: clip(info.area, 100), source: str(info.source) || "web",
      created: when, lastOrderAt: info.fromOrder ? when : "", deleted: false, deletedAt: ""
    });
    return key;
  }
  const patch = {};
  if (info.name && (info.fromOrder || !existing.name)) patch.name = clip(info.name, 80);
  if (info.phone && !existing.phone) patch.phone = normalizePhone(info.phone);
  if (info.email && !existing.email) patch.email = clip(info.email, 120);
  if (info.address && (!existing.address || info.fromOrder)) patch.address = clip(info.address, 400);
  if (info.area && (!existing.area || info.fromOrder)) patch.area = clip(info.area, 100);
  if (info.fromOrder && str(when) > str(existing.lastOrderAt)) patch.lastOrderAt = when;
  /* a brand-new order always brings a deleted customer back */
  if (existing.deleted && (info.force || info.fromOrder)) {
    patch.deleted = false;
    patch.deletedAt = "";
  }
  if (Object.keys(patch).length) T.customers.update(existing._row, patch);
  return key;
}

/* make sure every person who ordered or registered is in the table
   (one-time backfill of old orders, and Google Form orders) */
function syncCustomers() {
  const have = {};
  T.customers.readAll(true).forEach(function (r) { have[r.key] = r; });
  const fresh = {};
  const revive = {};

  T.orders.readAll().forEach(function (o) {
    if (boolOf(o.trashed, false)) return;
    const key = customerKeyOf(o);
    if (!key) return;
    const row = have[key];
    const when = str(o.timestamp);
    if (row) {
      if (row.deleted && when > str(row.deletedAt)) revive[key] = row;
      return;
    }
    let entry = fresh[key];
    if (!entry) {
      entry = fresh[key] = {
        key: key, phone: o.phone, name: o.name, email: o.email, address: o.address, area: o.area,
        source: "orders", created: when, lastOrderAt: when, deleted: false, deletedAt: ""
      };
    }
    if (when >= str(entry.lastOrderAt)) {
      entry.lastOrderAt = when;
      if (o.name) entry.name = o.name;
    }
    if (when < str(entry.created)) entry.created = when;
    if (!entry.email && o.email) entry.email = o.email;
    if (!entry.address && o.address) entry.address = o.address;
    if (!entry.area && o.area) entry.area = o.area;
  });

  T.accounts.readAll().forEach(function (a) {
    const key = customerKeyOf(a);
    if (!key || have[key] || fresh[key]) return;
    fresh[key] = {
      key: key, phone: a.phone, name: a.name, email: a.email, address: "", area: "",
      source: "account", created: a.created || nowStr(), lastOrderAt: "", deleted: false, deletedAt: ""
    };
  });

  const list = Object.keys(fresh).map(function (k) { return fresh[k]; });
  if (list.length) T.customers.appendMany(list);
  Object.keys(revive).forEach(function (k) {
    T.customers.update(revive[k]._row, { deleted: false, deletedAt: "" });
  });
  return list.length;
}

function segmentsFor(c, settings) {
  const out = [];
  const vipSpent = num(settings.vipMinSpent, 10000);
  const vipOrders = num(settings.vipMinOrders, 5);
  const inactiveDays = Math.max(1, num(settings.inactiveDays, 60));
  const live = c.orders - c.cancelled;
  if (c.blocked) out.push("blocked");
  if (live <= 0) out.push("noOrders");
  if ((vipSpent > 0 && c.totalSpent >= vipSpent) || (vipOrders > 0 && live >= vipOrders)) out.push("vip");
  if (live >= 2) out.push("repeat");
  if (live === 1) out.push("firstTimer");
  if (live >= 1 && c.daysSince > inactiveDays) out.push("inactive");
  if (live >= 1 && c.daysSince <= 30) out.push("recent");
  return out;
}

/* the full customer list (used by the list screen and by broadcasts) */
function customersBuild() {
  syncCustomers();
  const settings = getSettings();
  const flags = {};
  T.customerFlags.readAll().forEach(function (f) { flags[f.phone] = f; });
  const accounts = {};
  T.accounts.readAll().forEach(function (a) { accounts[a.phone] = a; });

  const agg = {};
  T.orders.readAll().forEach(function (o) {
    if (boolOf(o.trashed, false)) return;
    const key = customerKeyOf(o);
    if (!key) return;
    const dead = CONFIG.DEAD_STATUSES.indexOf(o.status) !== -1;
    const a = agg[key] || (agg[key] = { orders: 0, cancelled: 0, totalSpent: 0, last: "", first: "", ids: [], name: "" });
    a.orders += 1;
    a.ids.push(o.orderId);
    if (dead) a.cancelled += 1;
    else a.totalSpent += o.total;
    if (str(o.timestamp) >= str(a.last)) { a.last = o.timestamp; if (o.name) a.name = o.name; }
    if (!a.first || str(o.timestamp) < str(a.first)) a.first = o.timestamp;
  });

  const list = [];
  T.customers.readAll().forEach(function (c) {
    if (c.deleted) return;
    const flag = c.phone ? flags[c.phone] : null;
    if (flag && flag.hidden) return;
    const a = agg[c.key] || { orders: 0, cancelled: 0, totalSpent: 0, last: "", first: "", ids: [], name: "" };
    const last = a.last || c.lastOrderAt || "";
    const customer = {
      id: c.key, name: a.name || c.name, phone: c.phone, email: c.email, address: c.address, area: c.area,
      orders: a.orders, cancelled: a.cancelled, totalSpent: a.totalSpent,
      lastOrder: last, firstOrder: a.first || c.created, orderIds: a.ids,
      blocked: !!(flag && flag.blocked), note: flag ? flag.note : "", tags: flag ? flag.tags : "",
      hasAccount: !!(c.phone && accounts[c.phone]), source: c.source, created: c.created,
      daysSince: last ? ageDays(last) : 9999
    };
    customer.segments = segmentsFor(customer, settings);
    list.push(customer);
  });
  return list;
}

function customersAdminList() {
  requirePerm("customers.view");
  assignMissingOrderIds();
  const list = customersBuild().sort(function (a, b) {
    return b.orders - a.orders || (str(b.lastOrder) > str(a.lastOrder) ? 1 : -1);
  });
  const summary = { total: list.length, vip: 0, repeat: 0, firstTimer: 0, inactive: 0, recent: 0, noOrders: 0, blocked: 0 };
  list.forEach(function (c) {
    c.segments.forEach(function (s) { if (summary[s] !== undefined) summary[s]++; });
  });
  const settings = getSettings();
  return {
    success: true,
    customers: list,
    summary: summary,
    rules: { vipMinSpent: settings.vipMinSpent, vipMinOrders: settings.vipMinOrders, inactiveDays: settings.inactiveDays }
  };
}

function customerCreate(body) {
  requirePerm("customers.edit");
  const phone = normalizePhone(body.phone);
  const email = str(body.email);
  const name = squash(clip(body.name, 80));
  if (name.length < 2) fail("Please enter the customer's name.");
  if (!phone && !email) fail("Enter a phone number or an email.");
  if (phone && !isBdMobile(phone)) fail("That phone number does not look right.");
  if (email && !isEmail(email)) fail("That email address does not look right.");
  return withLock(function () {
    const key = customerUpsert({
      phone: phone, email: email, name: name, address: clip(body.address, 400),
      area: clip(body.area, 100), source: "manual", force: true
    });
    if (body.note !== undefined && phone) {
      const existing = T.customerFlags.findBy("phone", phone);
      const record = { phone: phone, note: clip(body.note, 1000), updatedAt: nowStr() };
      if (existing) T.customerFlags.update(existing._row, record);
      else T.customerFlags.append(record);
    }
    logActivity("customer.create", key, name);
    return { success: true, id: key };
  });
}

function customerDelete(body) {
  requirePerm("customers.edit");
  const key = str(body.id).toLowerCase();
  if (!key) fail("Customer not found.", "not_found");
  return withLock(function () {
    syncCustomers();
    const row = T.customers.findBy("key", key);
    if (!row) fail("Customer not found.", "not_found");
    T.customers.update(row._row, { deleted: true, deletedAt: nowStr() });
    logActivity("customer.delete", key, row.name);
    return { success: true };
  });
}

function customerRestore(body) {
  requirePerm("customers.edit");
  const key = str(body.id).toLowerCase();
  return withLock(function () {
    const row = T.customers.findBy("key", key);
    if (!row) fail("Customer not found.", "not_found");
    T.customers.update(row._row, { deleted: false, deletedAt: "" });
    logActivity("customer.restore", key, row.name);
    return { success: true };
  });
}

/* ---------------------------------------------------------
   BROADCAST  -  an offer to a group of customers
   email    : sent from here (daily Gmail quota applies)
   whatsapp : a list of one-tap links (nothing is sent by itself)
--------------------------------------------------------- */
function broadcastTargets(body) {
  const all = customersBuild();
  const ids = listOf(body.ids).map(function (x) { return str(x).toLowerCase(); }).filter(Boolean);
  const segment = str(body.segment) || "all";
  let list;
  if (ids.length) {
    list = all.filter(function (c) { return ids.indexOf(c.id) !== -1; });
  } else if (segment === "all") {
    list = all;
  } else {
    list = all.filter(function (c) { return c.segments.indexOf(segment) !== -1; });
  }
  return list.filter(function (c) { return !c.blocked; });
}

function customerBroadcast(body) {
  requirePerm("customers.broadcast");
  const channel = str(body.channel) === "whatsapp" ? "whatsapp" : "email";
  const message = clip(body.message, 1500);
  const subject = clip(body.subject, 120);
  const settings = getSettings();
  const targets = broadcastTargets(body);
  const reachable = targets.filter(function (c) {
    return channel === "email" ? isEmail(c.email) : isBdMobile(c.phone);
  });
  const limited = reachable.slice(0, CONFIG.BROADCAST_MAX);
  const base = {
    success: true, channel: channel, selected: targets.length, reachable: reachable.length,
    willSend: limited.length, capped: reachable.length > limited.length
  };
  if (body.dryRun) {
    if (channel === "email") {
      try { base.quota = MailApp.getRemainingDailyQuota(); } catch (error) { base.quota = null; }
    }
    return base;
  }
  if (message.length < 5) fail("Please write the message.");
  if (channel === "email" && subject.length < 3) fail("Please write a subject.");
  if (!limited.length) fail("None of the selected customers can receive this message.");

  const vars = function (c) {
    return {
      name: (c.name || "").split(" ")[0] || "there",
      store: settings.storeName, siteUrl: settings.siteUrl, link: settings.siteUrl,
      coupon: str(body.coupon).toUpperCase()
    };
  };

  if (channel === "whatsapp") {
    const links = limited.map(function (c) {
      const text = fillTemplate(message, vars(c));
      return { id: c.id, name: c.name, phone: c.phone, text: text, url: buildWhatsAppUrl(c.whatsapp || c.phone, text) };
    });
    logActivity("customer.broadcast", "whatsapp", { count: links.length });
    return Object.assign(base, { links: links });
  }

  let sent = 0;
  let failed = 0;
  let stoppedForQuota = false;
  for (let i = 0; i < limited.length; i++) {
    const c = limited[i];
    const text = fillTemplate(message, vars(c));
    const html = emailShell(escapeHtml(subject),
      '<p style="font-size:15px;line-height:1.7;margin:0 0 14px">' + escapeHtml(text).replace(/\n/g, "<br>") + '</p>' +
      (settings.siteUrl ? '<p style="margin:18px 0 0"><a href="' + escapeHtml(settings.siteUrl) + '" style="background:#302936;color:#ffffff;text-decoration:none;padding:11px 22px;border-radius:999px;font-size:14px">Visit ' + escapeHtml(settings.storeName) + '</a></p>' : "") +
      '<p style="font-size:12px;color:#8a8091;margin:22px 0 0">You are getting this because you ordered from us. Reply "STOP" if you do not want offers by email.</p>',
      settings);
    const res = sendEmail({
      to: c.email, subject: subject, text: text + "\n\nReply STOP if you do not want offers by email.",
      html: html, event: "customer.broadcast", ref: "", replyTo: settings.email
    });
    if (res.ok) sent++;
    else {
      failed++;
      if (res.error === "quota") { stoppedForQuota = true; break; }
    }
  }
  logActivity("customer.broadcast", "email", { sent: sent, failed: failed });
  return Object.assign(base, { sent: sent, failed: failed, stoppedForQuota: stoppedForQuota });
}

/* =========================================================
   ABANDONED CARTS
   The storefront sends the bag once a visitor has typed a phone
   number or email at checkout and then goes quiet.
========================================================= */
function cartKeyFor(phone, email) {
  if (isBdMobile(phone)) return normalizePhone(phone);
  if (isEmail(email)) return str(email).toLowerCase();
  return "";
}

function cartSavePublic(body) {
  const settings = getSettings();
  if (!settings.abandonedCartsEnabled || settings.maintenanceMode || str(body.hp)) {
    return { success: true, skipped: true };
  }
  const phone = normalizePhone(body.phone);
  const email = str(body.email);
  const key = cartKeyFor(phone, email);
  if (!key) return { success: true, skipped: true };
  rateLimit("cartsave:" + key, 40, 3600, "Too many updates.");
  rateLimit("cartsave:all", 1500, 3600, "Busy.");

  const catalog = publicCatalog();
  const byId = {};
  catalog.products.forEach(function (p) { byId[p.id] = p; });
  const items = [];
  listOf(body.items).slice(0, 40).forEach(function (raw) {
    const p = byId[str(raw && raw.id)];
    if (!p || p.status === "inactive") return;
    const variant = str(raw.variantId) ? p.variants.filter(function (v) { return v.id === str(raw.variantId); })[0] : null;
    if (p.variants.length && !variant) return;
    const price = variant && variant.price !== null && variant.price !== undefined ? variant.price : p.price;
    items.push({
      id: p.id, variantId: variant ? variant.id : "", name: p.name, variant: variant ? variant.label : "",
      qty: Math.min(CONFIG.MAX_QTY_PER_LINE, Math.max(1, Math.floor(num(raw.qty, 1)))), price: price
    });
  });

  try {
    return withLock(function () {
      const existing = T.abandonedCarts.findBy("key", key);
      if (!items.length) {
        if (existing && existing.status === "open") T.abandonedCarts.remove(existing._row);
        return { success: true, cleared: true };
      }
      const total = items.reduce(function (s, i) { return s + i.price * i.qty; }, 0);
      const record = {
        name: clip(body.name, 80), phone: isBdMobile(phone) ? phone : "", email: isEmail(email) ? clip(email, 120) : "",
        items: items, total: total, updated: nowStr()
      };
      if (existing) {
        if (existing.status === "recovered" || existing.status === "dismissed") {
          record.status = "open";
          record.created = nowStr();
          record.contactedAt = "";
        }
        T.abandonedCarts.update(existing._row, record);
      } else {
        record.id = uid("ac_");
        record.key = key;
        record.created = nowStr();
        record.status = "open";
        T.abandonedCarts.append(record);
        if (T.abandonedCarts.open().getLastRow() > 2500) T.abandonedCarts.trimTo(2000);
      }
      return { success: true };
    }, 4000);
  } catch (error) {
    /* a busy shop must never slow checkout down */
    return { success: true, skipped: true };
  }
}

function markCartRecovered(phone, email, orderId) {
  const keys = [cartKeyFor(phone, ""), cartKeyFor("", email)].filter(Boolean);
  keys.forEach(function (key) {
    const row = T.abandonedCarts.findBy("key", key);
    if (row && (row.status === "open" || row.status === "contacted")) {
      T.abandonedCarts.update(row._row, { status: "recovered", note: "Order " + orderId, updated: nowStr() });
    }
  });
}

function cartItemsText(items) {
  return listOf(items).map(function (i) {
    return i.name + (i.variant ? " (" + i.variant + ")" : "") + " x" + i.qty;
  }).join(", ");
}

function abandonedList() {
  requirePerm("customers.view");
  const settings = getSettings();
  const minutes = Math.max(5, num(settings.abandonedMinutes, 60));
  let rows = T.abandonedCarts.readAll(true);

  /* tidy up old rows */
  const keep = rows.filter(function (r) {
    const days = ageMinutes(r.updated) / 1440;
    if (r.status === "recovered" || r.status === "dismissed") return days <= 7;
    return days <= CONFIG.ABANDONED_KEEP_DAYS;
  });
  if (keep.length !== rows.length && can("customers.edit")) {
    T.abandonedCarts.replaceAll(keep);
    rows = T.abandonedCarts.readAll(true);
  }

  const items = rows.map(function (r) {
    const age = ageMinutes(r.updated);
    const itemsText = cartItemsText(r.items);
    const link = settings.siteUrl ? settings.siteUrl + "/cart" : "";
    const text = fillTemplate(settings.abandonedTemplate, {
      name: (r.name || "").split(" ")[0] || "there", store: settings.storeName, items: itemsText, link: link
    });
    return {
      id: r.id, name: r.name, phone: r.phone, email: r.email, items: listOf(r.items), itemsText: itemsText,
      total: r.total, created: r.created, updated: r.updated, status: r.status, contactedAt: r.contactedAt,
      note: r.note, ageMinutes: age, abandoned: (r.status === "open" || r.status === "contacted") && age >= minutes,
      waUrl: r.phone ? buildWhatsAppUrl(r.phone, text) : "", message: text
    };
  }).sort(function (a, b) { return str(b.updated) > str(a.updated) ? 1 : -1; });

  const counts = { open: 0, contacted: 0, recovered: 0, dismissed: 0, abandoned: 0, value: 0 };
  items.forEach(function (i) {
    counts[i.status] = (counts[i.status] || 0) + 1;
    if (i.abandoned && i.status !== "contacted") { counts.abandoned++; counts.value += i.total; }
  });
  return { success: true, items: items, counts: counts, afterMinutes: minutes };
}

function abandonedUpdate(body) {
  requirePerm("customers.edit");
  return withLock(function () {
    const row = T.abandonedCarts.findBy("id", str(body.id));
    if (!row) fail("Cart not found.", "not_found");
    const patch = {};
    if (body.status !== undefined) {
      if (["open", "contacted", "dismissed", "recovered"].indexOf(str(body.status)) === -1) fail("Unknown status.");
      patch.status = str(body.status);
      if (patch.status === "contacted") patch.contactedAt = nowStr();
    }
    if (body.note !== undefined) patch.note = clip(body.note, 300);
    T.abandonedCarts.update(row._row, patch);
    return { success: true };
  });
}

function abandonedDelete(body) {
  requirePerm("customers.edit");
  const ids = listOf(body.ids).concat(body.id ? [body.id] : []).map(str).filter(Boolean);
  return withLock(function () {
    const wanted = {};
    ids.forEach(function (id) { wanted[id] = true; });
    const rows = T.abandonedCarts.readAll(true);
    const keep = rows.filter(function (r) { return !wanted[r.id]; });
    if (keep.length !== rows.length) T.abandonedCarts.replaceAll(keep);
    return { success: true, removed: rows.length - keep.length };
  });
}

/* =========================================================
   "TELL ME WHEN IT IS BACK"  -  stock alerts
========================================================= */
function stockNotifyPublic(body) {
  const settings = getSettings();
  if (!settings.stockAlertsEnabled) fail("Stock alerts are turned off right now.");
  if (str(body.hp)) fail("Could not save your request.");
  const phone = normalizePhone(body.phone);
  const email = str(body.email);
  if (!isBdMobile(phone) && !isEmail(email)) fail("Please enter a mobile number or an email so we can tell you.");
  if (email && !isEmail(email)) fail("That email address does not look right.");
  const contact = isBdMobile(phone) ? phone : email.toLowerCase();
  rateLimit("stockalert:" + contact, 10, 3600, "You have asked for several alerts already. Please try again later.");
  rateLimit("stockalert:all", 400, 3600);

  const productId = str(body.productId);
  const row = findProductRow(productId);
  if (!row) fail("Product not found.", "not_found");
  const p = productFromRow(row);
  if (p.visibility !== "visible" || p.status === "inactive") fail("This product is not available right now.");
  const variantId = str(body.variantId);
  let variant = null;
  if (p.variants.length) {
    variant = p.variants.filter(function (v) { return v.id === variantId; })[0];
    if (!variant) fail("Please choose an option first.");
  }
  const left = variant ? variant.stock : p.stock;
  if (left > 0) return { success: true, inStock: true };

  return withLock(function () {
    const dup = T.stockAlerts.find(function (a) {
      return a.productId === p.id && a.variantId === variantId && a.status === "waiting" &&
        ((isBdMobile(phone) && a.phone === phone) || (isEmail(email) && a.email.toLowerCase() === email.toLowerCase()));
    });
    if (!dup) {
      T.stockAlerts.append({
        id: uid("sa_"), productId: p.id, variantId: variantId, product: p.name,
        variantLabel: variant ? variant.label : "", name: clip(body.name, 80),
        phone: isBdMobile(phone) ? phone : "", email: isEmail(email) ? clip(email, 120) : "",
        created: nowStr(), status: "waiting", restocked: false
      });
      if (T.stockAlerts.open().getLastRow() > 3000) T.stockAlerts.trimTo(2500);
    }
    return { success: true, saved: true };
  });
}

/* a product (or one option of it) was sold out and now has stock again */
function markRestocked(productId, variantId) {
  const waiting = T.stockAlerts.filter(function (a) {
    return a.productId === str(productId) && a.status === "waiting" && !a.restocked &&
      (!a.variantId || a.variantId === str(variantId));
  });
  if (!waiting.length) return;
  const row = findProductRow(productId);
  if (!row) return;
  const p = productFromRow(row);
  if (p.visibility !== "visible" || p.status === "inactive") return;
  const settings = getSettings();
  const link = (settings.siteUrl || "") + "/product/" + encodeURIComponent(p.id);
  waiting.forEach(function (a) {
    const patch = { restocked: true };
    if (a.email) {
      const label = p.name + (a.variantLabel ? " (" + a.variantLabel + ")" : "");
      const first = (a.name || "").split(" ")[0] || "there";
      const html = emailShell("Back in stock",
        '<p style="font-size:15px;line-height:1.7;margin:0 0 14px">Hi ' + escapeHtml(first) + ', <strong>' + escapeHtml(label) +
        '</strong> is available again.</p><p style="margin:18px 0 0"><a href="' + escapeHtml(link) +
        '" style="background:#302936;color:#ffffff;text-decoration:none;padding:11px 22px;border-radius:999px;font-size:14px">Order now</a></p>',
        settings);
      const res = sendEmail({
        to: a.email, subject: label + " is back in stock", text: "Hi " + first + ", " + label + " is back in stock: " + link,
        html: html, event: "customer.restock", ref: p.id
      });
      if (res.ok) {
        patch.status = "notified";
        patch.notifiedAt = nowStr();
        patch.via = "email";
      }
    }
    T.stockAlerts.update(a._row, patch);
  });
  logActivity("stock.alerts", p.id, { count: waiting.length });
}

function stockAlertsList() {
  requirePerm("inventory.view");
  const settings = getSettings();
  const cache = {};
  const rows = T.stockAlerts.readAll(true).slice().reverse().map(function (a) {
    let stock = null;
    if (cache[a.productId] === undefined) {
      const row = findProductRow(a.productId);
      cache[a.productId] = row ? productFromRow(row) : false;
    }
    const p = cache[a.productId];
    if (p) {
      if (a.variantId) {
        const v = p.variants.filter(function (x) { return x.id === a.variantId; })[0];
        stock = v ? v.stock : null;
      } else {
        stock = p.stock;
      }
    }
    const link = (settings.siteUrl || "") + "/product/" + encodeURIComponent(a.productId);
    const text = fillTemplate(settings.restockTemplate, {
      name: (a.name || "").split(" ")[0] || "there", product: a.product + (a.variantLabel ? " (" + a.variantLabel + ")" : ""),
      store: settings.storeName, link: link
    });
    return {
      id: a.id, productId: a.productId, product: a.product, variantId: a.variantId, variantLabel: a.variantLabel,
      name: a.name, phone: a.phone, email: a.email, created: a.created, status: a.status,
      restocked: a.restocked, notifiedAt: a.notifiedAt, via: a.via, stock: stock,
      ready: a.status === "waiting" && (a.restocked || (stock !== null && stock > 0)),
      waUrl: a.phone ? buildWhatsAppUrl(a.phone, text) : ""
    };
  });
  const counts = { waiting: 0, ready: 0, notified: 0 };
  rows.forEach(function (r) {
    if (r.status === "waiting") counts.waiting++;
    if (r.ready) counts.ready++;
    if (r.status === "notified") counts.notified++;
  });
  return { success: true, items: rows, counts: counts };
}

function stockAlertUpdate(body) {
  requirePerm("inventory.adjust");
  const ids = listOf(body.ids).concat(body.id ? [body.id] : []).map(str).filter(Boolean);
  const status = str(body.status);
  if (["waiting", "notified", "dismissed"].indexOf(status) === -1) fail("Unknown status.");
  return withLock(function () {
    let changed = 0;
    ids.forEach(function (id) {
      const row = T.stockAlerts.findBy("id", id);
      if (!row) return;
      const patch = { status: status };
      if (status === "notified") { patch.notifiedAt = nowStr(); patch.via = row.via || "whatsapp"; }
      T.stockAlerts.update(row._row, patch);
      changed++;
    });
    return { success: true, changed: changed };
  });
}

function stockAlertDelete(body) {
  requirePerm("inventory.adjust");
  const ids = listOf(body.ids).concat(body.id ? [body.id] : []).map(str).filter(Boolean);
  return withLock(function () {
    const wanted = {};
    ids.forEach(function (id) { wanted[id] = true; });
    const rows = T.stockAlerts.readAll(true);
    const keep = rows.filter(function (r) { return !wanted[r.id]; });
    if (keep.length !== rows.length) T.stockAlerts.replaceAll(keep);
    return { success: true, removed: rows.length - keep.length };
  });
}

/* =========================================================
   PUBLIC HELPERS  -  bought-together, share/SEO data
========================================================= */
function togetherMap() {
  const hit = cacheGet("ps:together");
  if (hit !== null) return hit;
  const rows = T.orders.readAll();
  const pairs = {};
  rows.slice(-600).forEach(function (o) {
    if (boolOf(o.trashed, false) || CONFIG.DEAD_STATUSES.indexOf(o.status) !== -1) return;
    const seen = {};
    const ids = [];
    orderItems(o).forEach(function (i) {
      if (i.id && !seen[i.id]) { seen[i.id] = true; ids.push(i.id); }
    });
    if (ids.length < 2) return;
    ids.forEach(function (a) {
      ids.forEach(function (b) {
        if (a === b) return;
        pairs[a] = pairs[a] || {};
        pairs[a][b] = (pairs[a][b] || 0) + 1;
      });
    });
  });
  const map = {};
  Object.keys(pairs).forEach(function (a) {
    map[a] = Object.keys(pairs[a])
      .sort(function (x, y) { return pairs[a][y] - pairs[a][x]; })
      .slice(0, 8);
  });
  cachePut("ps:together", map, 3600);
  return map;
}

function togetherPublic() {
  const catalog = publicCatalog();
  const visible = {};
  catalog.products.forEach(function (p) { if (p.status !== "inactive") visible[p.id] = true; });
  const raw = togetherMap();
  const out = {};
  Object.keys(raw).forEach(function (a) {
    if (!visible[a]) return;
    const list = raw[a].filter(function (b) { return visible[b]; }).slice(0, 4);
    if (list.length) out[a] = list;
  });
  return { success: true, map: out };
}

function productMetaPublic(id) {
  const wanted = str(id);
  const p = publicCatalog().products.filter(function (x) { return x.id === wanted; })[0];
  if (!p) fail("Product not found.", "not_found");
  const settings = getSettings();
  return {
    success: true,
    product: {
      id: p.id, name: p.name, brand: p.brand, category: p.category,
      description: clip(p.description, 300), image: p.image, price: p.price, oldPrice: p.oldPrice,
      stock: p.stock, status: p.status
    },
    store: { name: settings.storeName, siteUrl: settings.siteUrl, logoUrl: settings.logoUrl }
  };
}

function sitemapPublic() {
  const catalog = publicCatalog();
  return {
    success: true,
    siteUrl: getSettings().siteUrl,
    products: catalog.products.filter(function (p) { return p.status !== "inactive"; }).map(function (p) { return p.id; }),
    categories: catalog.categories.filter(function (c) { return c.count > 0; }).map(function (c) { return c.name; })
  };
}
/* =========================================================
   COUPONS
========================================================= */
const COUPON_TYPES = ["percent", "fixed", "shipping"];

function couponView(row) {
  return {
    code: row.code, type: row.type, value: row.value, minOrder: row.minOrder,
    maxDiscount: row.maxDiscount, starts: row.starts, expires: row.expires,
    limit: row.limit, perCustomer: row.perCustomer, used: row.used,
    active: row.active, description: row.description, created: row.created
  };
}

function findCoupon(code) {
  return T.coupons.findBy("code", str(code).toUpperCase(), true);
}

/* returns {coupon, discount, freeShipping} or throws a friendly error */
function couponCheck(code, subtotal, phone, orderRows) {
  const clean = str(code).toUpperCase();
  if (!clean) fail("Enter a coupon code.");
  const c = findCoupon(clean);
  if (!c || !c.active) fail("That coupon code is not valid.", "coupon");
  const today = todayStr();
  if (c.starts && today < c.starts) fail("This coupon is not active yet.", "coupon");
  if (c.expires && today > c.expires) fail("This coupon has expired.", "coupon");
  if (c.limit > 0 && c.used >= c.limit) fail("This coupon has been fully used.", "coupon");
  if (c.minOrder > 0 && subtotal < c.minOrder) {
    fail("Add " + fmtMoney(c.minOrder - subtotal) + " more to use this coupon (minimum " + fmtMoney(c.minOrder) + ").", "coupon");
  }
  if (c.perCustomer > 0 && phone) {
    const rows = orderRows || T.orders.readAll();
    const mine = rows.filter(function (r) {
      return r.phone === normalizePhone(phone) && str(r.coupon).toUpperCase() === c.code.toUpperCase() &&
        CONFIG.DEAD_STATUSES.indexOf(r.status) === -1 && !boolOf(r.trashed, false);
    }).length;
    if (mine >= c.perCustomer) fail("You have already used this coupon.", "coupon");
  }
  let discount = 0;
  let freeShipping = false;
  if (c.type === "percent") {
    discount = Math.floor(subtotal * Math.min(c.value, 100) / 100);
    if (c.maxDiscount > 0) discount = Math.min(discount, c.maxDiscount);
  } else if (c.type === "fixed") {
    discount = Math.min(taka(c.value), subtotal);
  } else {
    freeShipping = true;
  }
  return { coupon: c, discount: Math.max(0, discount), freeShipping: freeShipping };
}

function couponAdjustUsed(code, delta) {
  const c = findCoupon(code);
  if (!c) return;
  T.coupons.update(c._row, { used: Math.max(0, c.used + delta) });
}

function couponValidatePublic(body) {
  rateLimit("coupon:" + normalizePhone(body.phone || "x"), 20, 600, "Too many coupon attempts. Please wait a few minutes.");
  rateLimit("coupon:all", 400, 600);
  const items = resolveOrderItems(body.items, false);
  const subtotal = itemsSubtotal(items);
  const check = couponCheck(body.code, subtotal, body.phone, null);
  return {
    success: true,
    code: check.coupon.code,
    type: check.coupon.type,
    discount: check.discount,
    freeShipping: check.freeShipping,
    description: check.coupon.description
  };
}

function couponsAdminList() {
  requirePerm("coupons.manage");
  return { success: true, coupons: T.coupons.readAll(true).map(couponView).reverse() };
}

function couponSave(body) {
  requirePerm("coupons.manage");
  const c = body.coupon || {};
  const code = str(c.code).toUpperCase().replace(/\s+/g, "");
  if (!/^[A-Z0-9_-]{3,24}$/.test(code)) fail("Coupon code must be 3-24 letters or numbers.");
  const type = str(c.type);
  if (COUPON_TYPES.indexOf(type) === -1) fail("Choose percent, fixed or free shipping.");
  const value = num(c.value, 0);
  if (type === "percent" && (value <= 0 || value > 100)) fail("Percent must be between 1 and 100.");
  if (type === "fixed" && value <= 0) fail("Discount amount must be more than 0.");
  const starts = clip(c.starts, 10);
  const expires = clip(c.expires, 10);
  [starts, expires].forEach(function (d) { if (d && !parseDay(d)) fail("Dates must look like 2026-12-31."); });
  if (starts && expires && starts > expires) fail("The start date is after the end date.");
  return withLock(function () {
    const original = str(c.originalCode).toUpperCase();
    const clash = findCoupon(code);
    if (clash && original !== code) fail("A coupon with this code already exists.");
    const existing = original ? findCoupon(original) : null;
    const record = {
      code: code, type: type, value: type === "shipping" ? 0 : value,
      minOrder: Math.max(0, taka(c.minOrder)), maxDiscount: Math.max(0, taka(c.maxDiscount)),
      starts: starts, expires: expires, limit: Math.max(0, Math.floor(num(c.limit, 0))),
      perCustomer: Math.max(0, Math.floor(num(c.perCustomer, 0))),
      active: boolOf(c.active, true), description: clip(c.description, 200)
    };
    if (existing) {
      T.coupons.update(existing._row, record);
    } else {
      record.used = 0;
      record.created = nowStr();
      T.coupons.append(record);
    }
    logActivity(existing ? "coupon.update" : "coupon.create", code, type + " " + value);
    return { success: true };
  });
}

function couponDelete(body) {
  requirePerm("coupons.manage");
  return withLock(function () {
    const c = findCoupon(body.code);
    if (!c) fail("Coupon not found.", "not_found");
    T.coupons.remove(c._row);
    logActivity("coupon.delete", c.code, "");
    return { success: true };
  });
}

/* =========================================================
   REVIEWS
========================================================= */
function reviewView(r, admin) {
  const out = {
    id: r.id, productId: r.productId, name: r.name, rating: r.rating, title: r.title,
    body: r.body, verified: r.verified, reply: r.reply, created: r.created,
    photos: listOf(r.photos).map(str).filter(Boolean)
  };
  if (admin) { out.status = r.status; out.customerId = r.customerId; }
  return out;
}

function shortName(name) {
  const parts = squash(name).split(" ");
  if (parts.length < 2) return parts[0] || "Customer";
  return parts[0] + " " + parts[parts.length - 1].charAt(0) + ".";
}

function reviewsPublicFor(productId) {
  const rows = T.reviews.filter(function (r) { return r.productId === str(productId) && r.status === "approved"; });
  const list = rows.map(function (r) { const v = reviewView(r, false); v.name = shortName(r.name); return v; }).reverse();
  const avg = rows.length ? rows.reduce(function (s, r) { return s + r.rating; }, 0) / rows.length : 0;
  return { success: true, reviews: list, count: rows.length, average: Math.round(avg * 10) / 10 };
}

function reviewsFeatured() {
  return cached("reviews", function () {
    return T.reviews.filter(function (r) { return r.status === "approved" && r.rating >= 4 && r.body; })
      .slice(-12).reverse().slice(0, 6)
      .map(function (r) { const v = reviewView(r, false); v.name = shortName(r.name); return v; });
  });
}

function reviewSubmitPublic(body) {
  const settings = getSettings();
  if (!settings.reviewsEnabled) fail("Reviews are turned off right now.");
  if (str(body.hp)) fail("Your review could not be sent.");
  const account = requireCustomer(body.customerToken);
  rateLimit("review:" + account.id, 6, 3600, "You are sending reviews too fast. Please wait a while.");
  const rating = Math.round(num(body.rating, 0));
  if (rating < 1 || rating > 5) fail("Please choose a star rating.");
  const text = clip(body.body, 1200);
  if (text.length < 3) fail("Please write a few words about the product.");
  const productId = str(body.productId);
  const row = findProductRow(productId);
  if (!row) fail("Product not found.", "not_found");
  const wantsPhotos = listOf(body.photos).length > 0;
  if (wantsPhotos && !settings.reviewPhotosEnabled) fail("Review photos are turned off right now.");

  return withLock(function () {
    const photos = wantsPhotos ? saveReviewPhotos(body.photos, row.name) : null;
    const verified = T.orders.filter(function (o) {
      return (o.customerId === account.id || o.phone === account.phone) &&
        CONFIG.DEAD_STATUSES.indexOf(o.status) === -1 && !boolOf(o.trashed, false) &&
        orderItems(o).some(function (i) { return i.id === productId; });
    }).length > 0;
    const existing = T.reviews.find(function (r) { return r.productId === productId && r.customerId === account.id; });
    const status = settings.reviewsAutoApprove ? "approved" : "pending";
    const record = {
      productId: productId, name: account.name, customerId: account.id, rating: rating,
      title: clip(body.title, 80), body: text, status: status, verified: verified
    };
    if (photos) record.photos = photos;
    if (existing) {
      if (photos) trashReviewPhotos(existing.photos);
      T.reviews.update(existing._row, record);
    } else {
      record.id = uid("r_");
      record.created = nowStr();
      record.reply = "";
      if (!photos) record.photos = [];
      T.reviews.append(record);
    }
    if (status === "approved") { recomputeProductRating(productId); bumpVersion("reviews"); }
    notifyAdminEvent("review", "New review (" + rating + "/5)", row.name + ": " + text.slice(0, 120));
    return { success: true, status: status };
  });
}

function reviewsAdminList(body) {
  requirePerm("reviews.moderate");
  const status = str(body && body.status);
  const names = {};
  T.products.readAll().forEach(function (p) { names[p.id] = p.name; });
  let rows = T.reviews.readAll(true);
  if (status) rows = rows.filter(function (r) { return r.status === status; });
  return {
    success: true,
    reviews: rows.reverse().map(function (r) { const v = reviewView(r, true); v.product = names[r.productId] || r.productId; return v; })
  };
}

function reviewModerate(body) {
  requirePerm("reviews.moderate");
  const status = str(body.status);
  if (["pending", "approved", "rejected"].indexOf(status) === -1) fail("Unknown review status.");
  return withLock(function () {
    const r = T.reviews.findBy("id", str(body.id));
    if (!r) fail("Review not found.", "not_found");
    const patch = { status: status };
    if (body.reply !== undefined) patch.reply = clip(body.reply, 600);
    T.reviews.update(r._row, patch);
    recomputeProductRating(r.productId);
    bumpVersion("reviews");
    logActivity("review." + status, r.id, "");
    return { success: true };
  });
}

function reviewDelete(body) {
  requirePerm("reviews.moderate");
  return withLock(function () {
    const r = T.reviews.findBy("id", str(body.id));
    if (!r) fail("Review not found.", "not_found");
    trashReviewPhotos(r.photos);
    T.reviews.remove(r._row);
    bumpVersion("reviews");
    logActivity("review.delete", r.id, "");
    return { success: true };
  });
}

/* =========================================================
   CONTACT MESSAGES
========================================================= */
function contactPublic(body) {
  if (str(body.hp)) fail("Your message could not be sent.");
  const name = squash(clip(body.name, 80));
  const phone = normalizePhone(body.phone);
  const email = str(body.email);
  const message = clip(body.message, 2000);
  if (name.length < 2) fail("Please enter your name.");
  if (!isBdMobile(phone) && !isEmail(email)) fail("Please enter a mobile number or an email so we can reply.");
  if (message.length < 5) fail("Please write your message.");
  rateLimit("contact:" + (phone || email), 4, 3600, "You have sent several messages already. We will reply soon!");
  rateLimit("contact:all", 100, 3600);
  const id = uid("m_");
  T.messages.append({ id: id, time: nowStr(), name: name, phone: isBdMobile(phone) ? phone : "", email: isEmail(email) ? email : "", message: message, status: "new", note: "" });
  notifyAdminEvent("message", "New message from " + name, message.slice(0, 300) + (phone ? "\nPhone: " + phone : ""));
  return { success: true };
}

function messagesAdminList() {
  requirePerm("messages.manage");
  return { success: true, messages: T.messages.readAll(true).reverse() };
}

function messageUpdate(body) {
  requirePerm("messages.manage");
  return withLock(function () {
    const m = T.messages.findBy("id", str(body.id));
    if (!m) fail("Message not found.", "not_found");
    const patch = {};
    if (body.status !== undefined) {
      if (["new", "read", "replied"].indexOf(body.status) === -1) fail("Unknown status.");
      patch.status = body.status;
    }
    if (body.note !== undefined) patch.note = clip(body.note, 600);
    T.messages.update(m._row, patch);
    return { success: true };
  });
}

function messageDelete(body) {
  requirePerm("messages.manage");
  return withLock(function () {
    const m = T.messages.findBy("id", str(body.id));
    if (!m) fail("Message not found.", "not_found");
    T.messages.remove(m._row);
    logActivity("message.delete", m.id, "");
    return { success: true };
  });
}

/* =========================================================
   CUSTOMER ACCOUNTS
========================================================= */
function accountView(a) {
  return {
    id: a.id, name: a.name, phone: a.phone, email: a.email,
    addresses: listOf(a.addresses), wishlist: listOf(a.wishlist), created: a.created
  };
}

function requireAccountsEnabled() {
  if (!getSettings().accountsEnabled) fail("Customer accounts are turned off right now.");
}

function cleanAddresses(list) {
  return listOf(list).slice(0, 5).map(function (a) {
    return {
      label: clip(a && a.label, 30) || "Home",
      name: clip(a && a.name, 80),
      phone: normalizePhone(a && a.phone),
      address: clip(a && a.address, 400),
      area: clip(a && a.area, 100),
      zoneId: clip(a && a.zoneId, 40)
    };
  }).filter(function (a) { return a.address; });
}

function customerRegister(body) {
  requireAccountsEnabled();
  if (str(body.hp)) fail("Could not create the account.");
  const name = squash(clip(body.name, 80));
  const phone = normalizePhone(body.phone);
  const email = str(body.email);
  const password = String(body.password || "");
  if (name.length < 2) fail("Please enter your name.");
  if (!isBdMobile(phone)) fail("Please enter a valid Bangladeshi mobile number.");
  if (email && !isEmail(email)) fail("That email address does not look right.");
  if (password.length < 6) fail("Password must be at least 6 characters.");
  rateLimit("register:" + phone, 4, 3600);
  rateLimit("register:all", 120, 3600);
  return withLock(function () {
    if (T.accounts.findBy("phone", phone)) {
      fail("An account with this phone number already exists. Please log in.", "exists");
    }
    const account = {
      id: uid("a_"), name: name, phone: phone, email: clip(email, 120),
      hash: makePasswordHash(password), addresses: [], wishlist: [],
      sessionVersion: 1, created: nowStr(), lastLogin: nowStr(), disabled: false
    };
    T.accounts.append(account);
    const issued = issueCustomerToken(account);
    return { success: true, token: issued.token, expiresAt: issued.expiresAt, account: accountView(account) };
  });
}

function customerLogin(body) {
  requireAccountsEnabled();
  const phone = normalizePhone(body.phone);
  const password = String(body.password || "");
  if (!phone || !password) fail("Enter your phone number and password.");
  rateLimit("clogin:" + phone, 8, 600, "Too many login attempts. Please wait 10 minutes.");
  rateLimit("clogin:all", 200, 600);
  const account = T.accounts.findBy("phone", phone);
  if (!account || account.disabled || !checkPasswordHash(password, account.hash)) {
    fail("Phone number or password is incorrect.", "auth");
  }
  rateReset("clogin:" + phone);
  T.accounts.update(account._row, { lastLogin: nowStr() });
  const issued = issueCustomerToken(account);
  return { success: true, token: issued.token, expiresAt: issued.expiresAt, account: accountView(account) };
}

function customerMe(body) {
  const account = requireCustomer(body.customerToken);
  return { success: true, account: accountView(account) };
}

function customerUpdate(body) {
  const account = requireCustomer(body.customerToken);
  return withLock(function () {
    const patch = {};
    if (body.name !== undefined) {
      const name = squash(clip(body.name, 80));
      if (name.length < 2) fail("Please enter your name.");
      patch.name = name;
    }
    if (body.email !== undefined) {
      const email = str(body.email);
      if (email && !isEmail(email)) fail("That email address does not look right.");
      patch.email = clip(email, 120);
    }
    if (body.addresses !== undefined) patch.addresses = cleanAddresses(body.addresses);
    if (body.newPassword) {
      if (!checkPasswordHash(String(body.currentPassword || ""), account.hash)) fail("Current password is incorrect.");
      if (String(body.newPassword).length < 6) fail("New password must be at least 6 characters.");
      patch.hash = makePasswordHash(String(body.newPassword));
      patch.sessionVersion = Number(account.sessionVersion || 1) + 1;
    }
    T.accounts.update(account._row, patch);
    const updated = Object.assign({}, account, patch);
    const out = { success: true, account: accountView(updated) };
    if (patch.sessionVersion) {
      const issued = issueCustomerToken(updated);
      out.token = issued.token;
      out.expiresAt = issued.expiresAt;
    }
    return out;
  });
}

function customerWishlist(body) {
  const account = requireCustomer(body.customerToken);
  const ids = listOf(body.ids).map(str).filter(Boolean).slice(0, 200);
  T.accounts.update(account._row, { wishlist: ids });
  return { success: true, ids: ids };
}

function customerOrders(body) {
  const account = requireCustomer(body.customerToken);
  const list = T.orders.filter(function (o) {
    return o.customerId === account.id && !boolOf(o.trashed, false);
  }).map(function (o) { return customerSafeOrder(orderView(o)); }).reverse();
  return { success: true, orders: list };
}

function customerClaimOrder(body) {
  const account = requireCustomer(body.customerToken);
  const id = str(body.orderId).toUpperCase();
  rateLimit("claim:" + account.id, 10, 600);
  return withLock(function () {
    const row = findOrderRow(id);
    const phone = normalizePhone(body.phone);
    if (!row || boolOf(row.trashed, false) || !phone || (phone !== row.phone && phone !== row.whatsapp)) {
      fail("We could not find an order with those details.", "not_found");
    }
    if (row.customerId && row.customerId !== account.id) {
      fail("This order is already linked to another account.");
    }
    T.orders.update(row._row, { customerId: account.id });
    return { success: true, order: customerSafeOrder(orderView(Object.assign({}, row, { customerId: account.id }))) };
  });
}

function customerForgot(body) {
  requireAccountsEnabled();
  const phone = normalizePhone(body.phone);
  rateLimit("forgot:" + phone, 3, 1800, "Please wait a while before asking for another code.");
  rateLimit("forgot:all", 60, 1800);
  const generic = { success: true, message: "If this number has an email on file, we have sent a reset code to it. Otherwise please message us on WhatsApp." };
  const account = T.accounts.findBy("phone", phone);
  if (!account || !account.email || account.disabled) return generic;
  const code = randomDigits(6);
  T.accounts.update(account._row, {
    resetHash: sha256Hex(account.id + ":" + code),
    resetExpires: new Date().getTime() + 15 * 60000
  });
  sendEmail({
    to: account.email,
    subject: "Your " + getSettings().storeName + " password reset code",
    text: "Your password reset code is " + code + ". It works for 15 minutes. If you did not ask for it, you can ignore this email.",
    event: "password.reset", ref: account.id
  });
  return generic;
}

function customerReset(body) {
  requireAccountsEnabled();
  const phone = normalizePhone(body.phone);
  rateLimit("reset:" + phone, 6, 1800, "Too many attempts. Please wait a while.");
  const password = String(body.newPassword || "");
  if (password.length < 6) fail("New password must be at least 6 characters.");
  return withLock(function () {
    const account = T.accounts.findBy("phone", phone);
    const bad = "That code is not correct or has expired.";
    if (!account || !account.resetHash || account.resetExpires < new Date().getTime()) fail(bad);
    if (!constantTimeEquals(sha256Hex(account.id + ":" + str(body.code)), account.resetHash)) fail(bad);
    T.accounts.update(account._row, {
      hash: makePasswordHash(password), resetHash: "", resetExpires: 0,
      sessionVersion: Number(account.sessionVersion || 1) + 1
    });
    return { success: true, message: "Password updated. You can log in now." };
  });
}

/* admin side of accounts */
function accountsAdminList() {
  requirePerm("customers.view");
  return {
    success: true,
    accounts: T.accounts.readAll(true).map(function (a) {
      return { id: a.id, name: a.name, phone: a.phone, email: a.email, created: a.created, lastLogin: a.lastLogin, disabled: a.disabled };
    }).reverse()
  };
}

function accountAdminAction(body) {
  requirePerm("customers.edit");
  return withLock(function () {
    const account = T.accounts.findBy("id", str(body.id)) || T.accounts.findBy("phone", normalizePhone(body.phone));
    if (!account) fail("Account not found.", "not_found");
    const action = str(body.op);
    if (action === "disable" || action === "enable") {
      T.accounts.update(account._row, { disabled: action === "disable", sessionVersion: Number(account.sessionVersion || 1) + 1 });
    } else if (action === "resetPassword") {
      const temp = "ps" + randomDigits(6);
      T.accounts.update(account._row, { hash: makePasswordHash(temp), sessionVersion: Number(account.sessionVersion || 1) + 1 });
      logActivity("account.reset", account.phone, "");
      return { success: true, tempPassword: temp };
    } else {
      fail("Unknown action.");
    }
    logActivity("account." + action, account.phone, "");
    return { success: true };
  });
}
/* =========================================================
   NOTIFICATIONS
   Admin alerts : email  +  one chat channel
                  (CallMeBot WhatsApp | Telegram | Meta WhatsApp Cloud API)
   Customer     : confirmation / status email, and WhatsApp
                  either by a one-tap button (wa.me) or automatically
                  (only possible with the Meta Cloud API).
   Secrets live in Script Properties (see SECRET_KEYS).
========================================================= */

function logNotify(channel, to, event, ref, status, detail) {
  try {
    T.notifyLog.append({
      time: nowStr(), channel: channel, to: clip(to, 120), event: event,
      ref: ref || "", status: status, detail: clip(detail, 400)
    });
    if (T.notifyLog.open().getLastRow() > 3000) T.notifyLog.trimTo(2500);
  } catch (error) {
    console.error("notify log failed: " + error);
  }
}

/* ---------------------------------------------------------
   EMAIL
--------------------------------------------------------- */
function sendEmail(opts) {
  const to = str(opts.to);
  if (!to) return { ok: false, error: "no recipient" };
  try {
    if (MailApp.getRemainingDailyQuota() < 1) {
      logNotify("email", to, opts.event || "email", opts.ref, "skipped", "Daily email quota is used up");
      return { ok: false, error: "quota" };
    }
    const settings = getSettings();
    const mail = {
      to: to,
      subject: opts.subject,
      body: opts.text || "",
      name: settings.emailSenderName || settings.storeName
    };
    if (opts.html) mail.htmlBody = opts.html;
    if (opts.replyTo) mail.replyTo = opts.replyTo;
    MailApp.sendEmail(mail);
    logNotify("email", to, opts.event || "email", opts.ref, "sent", opts.subject);
    return { ok: true };
  } catch (error) {
    logNotify("email", to, opts.event || "email", opts.ref, "failed", error && error.message);
    return { ok: false, error: error && error.message ? error.message : "email failed" };
  }
}

function emailShell(heading, innerHtml, settings) {
  const store = escapeHtml(settings.storeName);
  return '<div style="background:#fffdf9;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#302b35">' +
    '<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #eadff0;border-radius:18px;overflow:hidden">' +
    '<div style="background:#302936;color:#ffffff;padding:22px 26px;text-align:center">' +
    '<div style="font-family:Georgia,serif;font-size:22px;letter-spacing:.04em">' + store + '</div>' +
    '<div style="font-size:11px;letter-spacing:.22em;color:#d9c5df;margin-top:4px">' + escapeHtml((settings.tagline || "").toUpperCase()) + '</div></div>' +
    '<div style="padding:26px">' +
    '<h2 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:0 0 12px">' + heading + '</h2>' +
    innerHtml +
    '</div>' +
    '<div style="padding:16px 26px;background:#faf6fb;color:#817682;font-size:12px;text-align:center">' +
    store + (settings.phone ? " &middot; " + escapeHtml(settings.phone) : "") + '</div></div></div>';
}

function orderTableHtml(view) {
  const rows = view.items.length
    ? view.items.map(function (i) {
      return '<tr><td style="padding:6px 0;border-bottom:1px solid #f0e8f3">' + escapeHtml(i.name) +
        (i.variant ? ' <span style="color:#817682">(' + escapeHtml(i.variant) + ')</span>' : '') +
        ' &times; ' + i.qty + '</td><td style="padding:6px 0;border-bottom:1px solid #f0e8f3;text-align:right">' +
        fmtMoney(i.price * i.qty) + '</td></tr>';
    }).join("")
    : '<tr><td style="padding:6px 0">' + escapeHtml(view.products) + '</td><td></td></tr>';
  const line = function (label, value) {
    return '<tr><td style="padding:3px 0;color:#817682">' + label + '</td><td style="text-align:right">' + value + '</td></tr>';
  };
  let totals = "";
  if (view.items.length) {
    totals += line("Subtotal", fmtMoney(view.subtotal));
    if (view.discount > 0) totals += line("Discount" + (view.coupon ? " (" + escapeHtml(view.coupon) + ")" : ""), "-" + fmtMoney(view.discount));
    totals += line("Delivery", view.deliveryCharge > 0 ? fmtMoney(view.deliveryCharge) : "Free");
  }
  totals += '<tr><td style="padding-top:8px;font-weight:bold">Total</td><td style="padding-top:8px;text-align:right;font-weight:bold;font-size:18px">' + fmtMoney(view.total) + '</td></tr>';
  return '<table style="width:100%;border-collapse:collapse;font-size:14px">' + rows + '</table>' +
    '<table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:10px">' + totals + '</table>';
}

function customerOrderEmail(view, kind, extraMessage) {
  const settings = getSettings();
  const first = escapeHtml((view.name || "").split(" ")[0] || "there");
  const headings = {
    confirmation: "Thank you, " + first + "!",
    status: "Update on your order"
  };
  const intro = kind === "confirmation"
    ? "We have received your order <b>" + escapeHtml(view.orderId) + "</b>. We will contact you shortly to confirm it."
    : "Your order <b>" + escapeHtml(view.orderId) + "</b> is now <b>" + escapeHtml(view.status) + "</b>." +
      (extraMessage ? "<br><br>" + escapeHtml(extraMessage) : "");
  const url = trackUrl(view);
  const body = '<p style="font-size:14px;line-height:1.6;margin:0 0 16px">' + intro + '</p>' +
    orderTableHtml(view) +
    '<p style="font-size:13px;color:#817682;margin:16px 0 4px">Deliver to</p>' +
    '<p style="font-size:14px;margin:0">' + escapeHtml(view.name) + '<br>' + escapeHtml(view.address) +
    (view.area ? ", " + escapeHtml(view.area) : "") + '<br>' + escapeHtml(view.phone) + '</p>' +
    '<p style="margin:22px 0 0;text-align:center"><a href="' + escapeHtml(url) + '" style="background:#9c82aa;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:14px;display:inline-block">Track your order</a></p>';
  const text = (kind === "confirmation"
    ? "Thank you! We received your order " + view.orderId + "."
    : "Your order " + view.orderId + " is now " + view.status + ".") +
    (extraMessage ? "\n" + extraMessage : "") +
    "\nTotal: " + fmtMoney(view.total) + "\nTrack: " + url + "\n- " + settings.storeName;
  return {
    subject: (kind === "confirmation" ? "Order received " : "Order " + view.status + " ") + view.orderId + " - " + settings.storeName,
    html: emailShell(headings[kind], body, settings),
    text: text
  };
}

function sendCustomerOrderEmail(view, kind, extraMessage) {
  const settings = getSettings();
  if (!settings.customerEmailEnabled || !view.email || !isEmail(view.email)) return false;
  const mail = customerOrderEmail(view, kind, extraMessage);
  const res = sendEmail({
    to: view.email, subject: mail.subject, html: mail.html, text: mail.text,
    replyTo: settings.email, event: "customer." + kind, ref: view.orderId
  });
  return res.ok;
}

/* ---------------------------------------------------------
   CHAT CHANNELS  (admin alerts)
--------------------------------------------------------- */
function fetchJson(url, options) {
  const res = UrlFetchApp.fetch(url, Object.assign({ muteHttpExceptions: true }, options || {}));
  const code = res.getResponseCode();
  const text = res.getContentText();
  return { ok: code >= 200 && code < 300, code: code, text: text };
}

function metaText(text) {
  /* template parameters may not contain new lines, tabs or long runs of spaces */
  return String(text).replace(/[\r\n\t]+/g, " | ").replace(/ {4,}/g, "   ").slice(0, 900);
}

function sendMetaTemplate(toNumber, templateName, params, event, ref) {
  const token = getSecret("META_WA_TOKEN");
  const phoneId = getSecret("META_WA_PHONE_ID");
  const lang = getSecret("META_WA_LANG") || "en";
  if (!token || !phoneId || !templateName) return { ok: false, error: "Meta WhatsApp is not fully set up" };
  const payload = {
    messaging_product: "whatsapp",
    to: phoneIntl(toNumber),
    type: "template",
    template: {
      name: templateName,
      language: { code: lang },
      components: [{ type: "body", parameters: params.map(function (p) { return { type: "text", text: metaText(p) }; }) }]
    }
  };
  const res = fetchJson("https://graph.facebook.com/v20.0/" + encodeURIComponent(phoneId) + "/messages", {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + token },
    payload: JSON.stringify(payload)
  });
  logNotify("meta", toNumber, event, ref, res.ok ? "sent" : "failed", res.ok ? "" : res.text.slice(0, 300));
  return { ok: res.ok, error: res.ok ? "" : res.text.slice(0, 200) };
}

function sendAdminChannel(text, event, ref) {
  const settings = getSettings();
  const channel = settings.notifyChannel;
  if (channel === "none" || !channel) return { ok: false, skipped: true };
  try {
    if (channel === "callmebot") {
      const key = getSecret("CALLMEBOT_APIKEY");
      const phone = phoneIntl(settings.notifyPhone);
      if (!key || !phone) return { ok: false, error: "CallMeBot number or API key is missing" };
      const url = "https://api.callmebot.com/whatsapp.php?phone=" + encodeURIComponent("+" + phone) +
        "&text=" + encodeURIComponent(text) + "&apikey=" + encodeURIComponent(key);
      const res = fetchJson(url, { method: "get" });
      logNotify("callmebot", settings.notifyPhone, event, ref, res.ok ? "sent" : "failed", res.ok ? "" : res.text.replace(/<[^>]+>/g, " ").slice(0, 300));
      return { ok: res.ok, error: res.ok ? "" : "CallMeBot answered " + res.code };
    }
    if (channel === "telegram") {
      const token = getSecret("TELEGRAM_BOT_TOKEN");
      const chat = getSecret("TELEGRAM_CHAT_ID");
      if (!token || !chat) return { ok: false, error: "Telegram bot token or chat ID is missing" };
      const res = fetchJson("https://api.telegram.org/bot" + token + "/sendMessage", {
        method: "post", contentType: "application/json",
        payload: JSON.stringify({ chat_id: chat, text: text, disable_web_page_preview: true })
      });
      logNotify("telegram", chat, event, ref, res.ok ? "sent" : "failed", res.ok ? "" : res.text.slice(0, 300));
      return { ok: res.ok, error: res.ok ? "" : "Telegram answered " + res.code };
    }
    if (channel === "meta") {
      return sendMetaTemplate(settings.notifyPhone, getSecret("META_WA_TEMPLATE_ADMIN"), [text], event, ref);
    }
  } catch (error) {
    logNotify(channel, settings.notifyPhone, event, ref, "failed", error && error.message);
    return { ok: false, error: error && error.message ? error.message : "failed" };
  }
  return { ok: false, error: "Unknown channel" };
}

/* kind: new_order | low_stock | message | review | test */
function notifyAdminEvent(kind, subject, body, ref) {
  const settings = getSettings();
  const result = { email: null, channel: null };
  try {
    if (settings.notifyEmailEnabled && settings.notifyEmailTo) {
      result.email = sendEmail({
        to: settings.notifyEmailTo,
        subject: "[" + settings.storeName + "] " + subject,
        text: body + "\n\n" + (settings.siteUrl ? settings.siteUrl + "/admin" : ""),
        event: "admin." + kind, ref: ref
      });
    }
  } catch (error) {
    console.error("admin email failed: " + error);
  }
  if (kind === "new_order" || kind === "low_stock" || kind === "test") {
    try {
      result.channel = sendAdminChannel(subject + "\n" + body, "admin." + kind, ref);
    } catch (error) {
      console.error("admin channel failed: " + error);
    }
  }
  return result;
}

/* ---------------------------------------------------------
   ORDER EVENTS
--------------------------------------------------------- */
function adminOrderSummary(view) {
  const lines = [
    "Order " + view.orderId + " - " + fmtMoney(view.total) + " (" + view.payment + ")",
    view.name + " - " + view.phone,
    view.items.length ? itemsText(view.items) : view.products,
    [view.area, view.address].filter(Boolean).join(", ")
  ];
  if (view.coupon) lines.push("Coupon " + view.coupon + " (-" + fmtMoney(view.discount) + ")");
  if (view.payRef) lines.push("bKash: " + view.payRef);
  if (view.note) lines.push("Note: " + view.note);
  return lines.join("\n");
}

function notifyNewOrder(view) {
  return notifyAdminEvent("new_order", "New order " + view.orderId, adminOrderSummary(view), view.orderId);
}

function sendLowStockAlert(items) {
  if (!items || !items.length) return;
  const settings = getSettings();
  if (!settings.notifyOnLowStock) return;
  notifyAdminEvent("low_stock", "Low stock", items.map(function (i) { return i.name + ": " + i.stock + " left"; }).join("\n"));
}

function afterOrderPlaced(view, lowAlerts) {
  const settings = getSettings();
  try { if (settings.notifyOnNewOrder) notifyNewOrder(view); } catch (error) { console.error(error); }
  try { sendCustomerOrderEmail(view, "confirmation"); } catch (error) { console.error(error); }
  try {
    if (settings.customerWhatsappMode === "auto" && metaCustomerReady()) sendCustomerWhatsApp(view, "New");
  } catch (error) { console.error(error); }
  try { sendLowStockAlert(lowAlerts); } catch (error) { console.error(error); }
}

function metaCustomerReady() {
  return !!(getSecret("META_WA_TOKEN") && getSecret("META_WA_PHONE_ID") && getSecret("META_WA_TEMPLATE_CUSTOMER"));
}

function sendCustomerWhatsApp(view, status) {
  const to = view.whatsapp || view.phone;
  const link = whatsappLinkFor(view, status);
  const first = (view.name || "").split(" ")[0] || "there";
  const res = sendMetaTemplate(to, getSecret("META_WA_TEMPLATE_CUSTOMER"), [first, view.orderId, link.text], "customer.whatsapp", view.orderId);
  return res.ok;
}

function notifyStatusChange(view, from) {
  const settings = getSettings();
  const out = { email: false, whatsapp: false };
  if (listOf(settings.customerNotifyStatuses).indexOf(view.status) === -1) return out;
  try { out.email = sendCustomerOrderEmail(view, "status"); } catch (error) { console.error(error); }
  try {
    if (settings.customerWhatsappMode === "auto" && metaCustomerReady()) out.whatsapp = sendCustomerWhatsApp(view, view.status);
  } catch (error) { console.error(error); }
  return out;
}

/* admin presses "resend" on an order */
function orderNotify(body) {
  requirePerm("orders.notify");
  const row = findOrderRow(body.orderId);
  if (!row) fail("Order not found.", "not_found");
  const view = orderView(row);
  const what = str(body.what);
  if (what === "customerEmail") {
    if (!view.email) fail("This customer did not give an email address.");
    const ok = sendCustomerOrderEmail(view, body.kind === "confirmation" ? "confirmation" : "status", clip(body.message, 400));
    if (!ok) fail("The email could not be sent. See Settings > Notifications > log.");
    return { success: true };
  }
  if (what === "adminAlert") {
    notifyNewOrder(view);
    return { success: true };
  }
  if (what === "customerWhatsApp") {
    if (!metaCustomerReady()) fail("Automatic WhatsApp needs the Meta Cloud API. Use the WhatsApp button instead.");
    if (!sendCustomerWhatsApp(view, view.status)) fail("WhatsApp message failed. See the notification log.");
    return { success: true };
  }
  fail("Unknown notification type.");
}

function notificationsTest(body) {
  requirePerm("notifications.test");
  const settings = getSettings();
  const target = str(body.target);
  const stamp = nowStr();
  if (target === "email") {
    if (!settings.notifyEmailTo) fail("Add an email address first.");
    const res = sendEmail({
      to: settings.notifyEmailTo.split(",")[0].trim(),
      subject: "[" + settings.storeName + "] Test email",
      text: "This is a test email from your store admin panel. Sent at " + stamp + ".",
      event: "admin.test"
    });
    return { success: res.ok, error: res.ok ? "" : (res.error === "quota" ? "Daily email limit reached." : res.error), message: res.ok ? "Test email sent to " + settings.notifyEmailTo : "" };
  }
  if (target === "channel") {
    if (settings.notifyChannel === "none") fail("Choose a WhatsApp / Telegram option first.");
    const res = sendAdminChannel("Test message from " + settings.storeName + " admin (" + stamp + ")", "admin.test", "");
    return { success: res.ok, error: res.ok ? "" : res.error, message: res.ok ? "Test message sent." : "" };
  }
  if (target === "customerWhatsApp") {
    if (!metaCustomerReady()) fail("The Meta WhatsApp Cloud API is not set up yet.");
    const phone = normalizePhone(body.phone || settings.notifyPhone);
    const res = sendMetaTemplate(phone, getSecret("META_WA_TEMPLATE_CUSTOMER"), ["Test", "PS-TEST", "This is a test update"], "customer.test", "");
    return { success: res.ok, error: res.ok ? "" : res.error, message: res.ok ? "Template message sent to " + phone : "" };
  }
  fail("Unknown test target.");
}

function notificationLogList(body) {
  requirePerm("notifications.test");
  const rows = T.notifyLog.readAll(true).slice(-Math.min(num(body && body.limit, 80), 300)).reverse();
  return { success: true, items: rows.map(function (r) { return pickKeys(r, ["time", "channel", "to", "event", "ref", "status", "detail"]); }) };
}

/* ---------------------------------------------------------
   GOOGLE FORM ORDERS (old checkout, or the public Form)
--------------------------------------------------------- */
function onFormSubmitTrigger(e) {
  resetRequestState();
  try {
    const assigned = assignMissingOrderIds();
    try { syncCustomers(); } catch (error) { console.error("customer sync failed: " + error); }
    assigned.forEach(function (id) {
      const row = findOrderRow(id);
      if (!row) return;
      const view = orderView(row);
      afterOrderPlaced(view, []);
    });
  } catch (error) {
    console.error("onFormSubmit failed: " + error);
  }
}
/* =========================================================
   RETURNS / REFUNDS
========================================================= */
const RETURN_STATUSES = ["requested", "approved", "received", "refunded", "rejected"];

function returnView(r) {
  return {
    id: r.id, orderId: r.orderId, created: r.created, type: r.type, items: listOf(r.items),
    amount: r.amount, reason: r.reason, status: r.status, restock: r.restock,
    restocked: r.restocked, note: r.note, updated: r.updated
  };
}

function returnsList() {
  requirePerm("orders.view");
  const names = {};
  T.orders.readAll().forEach(function (o) { names[o.orderId] = { name: o.name, phone: o.phone, total: o.total }; });
  return {
    success: true,
    returns: T.returns.readAll(true).reverse().map(function (r) {
      const v = returnView(r);
      v.customer = names[r.orderId] || null;
      return v;
    })
  };
}

function returnCreate(body) {
  requirePerm("orders.edit");
  const type = ["return", "refund", "exchange"].indexOf(body.type) !== -1 ? body.type : "return";
  const reason = clip(body.reason, 400);
  if (reason.length < 3) fail("Please write the reason.");
  return withLock(function () {
    const order = findOrderRow(body.orderId);
    if (!order) fail("Order not found.", "not_found");
    const view = orderView(order);
    const items = listOf(body.items).map(function (i) {
      return { id: str(i.id), variantId: str(i.variantId), name: clip(i.name, 140), qty: Math.max(1, Math.floor(num(i.qty, 1))) };
    }).filter(function (i) { return i.name; });
    const amount = Math.min(view.total, Math.max(0, taka(body.amount)));
    const record = {
      id: uid("rt_"), orderId: view.orderId, created: nowStr(), type: type, items: items,
      amount: amount, reason: reason, status: "requested", restock: boolOf(body.restock, true),
      restocked: false, note: "", updated: nowStr()
    };
    T.returns.append(record);
    addHistory(view.orderId, "Return requested", "", "", reason, false);
    logActivity("return.create", view.orderId, type + " " + fmtMoney(amount));
    return { success: true, return: returnView(record) };
  });
}

function returnUpdate(body) {
  requirePerm("orders.edit");
  return withLock(function () {
    const r = T.returns.findBy("id", str(body.id));
    if (!r) fail("Return not found.", "not_found");
    const patch = { updated: nowStr() };
    if (body.note !== undefined) patch.note = clip(body.note, 400);
    if (body.amount !== undefined) patch.amount = Math.max(0, taka(body.amount));
    if (body.restock !== undefined && !r.restocked) patch.restock = boolOf(body.restock, true);
    const nextStatus = body.status !== undefined ? str(body.status) : r.status;
    if (RETURN_STATUSES.indexOf(nextStatus) === -1) fail("Unknown return status.");
    patch.status = nextStatus;

    const order = findOrderRow(r.orderId);
    const wantRestock = patch.restock !== undefined ? patch.restock : r.restock;
    if (nextStatus === "received" && wantRestock && !r.restocked && order) {
      listOf(r.items).forEach(function (i) {
        if (!i.id) return;
        try { changeStock(i.id, i.variantId, i.qty, "Return for " + r.orderId, r.orderId); } catch (error) { /* product removed */ }
      });
      bumpVersion("catalog");
      patch.restocked = true;
    }
    if (nextStatus === "refunded" && order) {
      const amount = patch.amount !== undefined ? patch.amount : r.amount;
      if (amount >= order.total && order.total > 0) T.orders.update(order._row, { paymentStatus: "Refunded", updatedAt: nowStr() });
    }
    T.returns.update(r._row, patch);
    if (nextStatus !== r.status) addHistory(r.orderId, "Return " + nextStatus, r.status, nextStatus, patch.note || "", false);
    logActivity("return.update", r.orderId, nextStatus);
    return { success: true };
  });
}

/* =========================================================
   REPORTS
========================================================= */
function inDay(order, from, to) {
  const d = dayOf(order.timestamp);
  return d >= from && d <= to;
}

function profitOf(view) {
  if (!view.items.length) return null;
  const costKnown = view.items.some(function (i) { return i.cost > 0; });
  if (!costKnown) return null;
  const itemProfit = view.items.reduce(function (s, i) { return s + (i.price - i.cost) * i.qty; }, 0);
  return itemProfit - view.discount;
}

function buildReport(from, to, groupBy, finance) {
  const returnsByOrder = {};
  T.returns.readAll().forEach(function (r) {
    if (r.status === "refunded" || r.status === "received") returnsByOrder[r.orderId] = (returnsByOrder[r.orderId] || 0) + r.amount;
  });

  const totals = {
    orders: 0, booked: 0, delivered: 0, cancelled: 0, returned: 0, revenue: 0, deliveredRevenue: 0,
    discount: 0, deliveryCharges: 0, units: 0, profit: 0, profitOrders: 0, noCostOrders: 0, refunds: 0
  };
  const series = {};
  const products = {};
  const status = {};
  const payment = {};
  const areas = {};
  const coupons = {};
  const customers = {};
  const firstSeen = {};
  const categoriesSales = {};
  const weekdays = [0, 0, 0, 0, 0, 0, 0];
  const productCategory = {};
  T.products.readAll().forEach(function (p) { productCategory[p.id] = str(p.category) || "Uncategorised"; });
  const orderCounts = {};

  const all = T.orders.readAll();
  all.forEach(function (row) {
    if (boolOf(row.trashed, false)) return;
    const key = row.phone || row.email;
    const d = dayOf(row.timestamp);
    if (key && (!firstSeen[key] || d < firstSeen[key])) firstSeen[key] = d;
    if (key && CONFIG.DEAD_STATUSES.indexOf(row.status) === -1) orderCounts[key] = (orderCounts[key] || 0) + 1;
  });

  all.forEach(function (row) {
    if (boolOf(row.trashed, false)) return;
    if (!inDay(row, from, to)) return;
    const view = orderView(row);
    const dead = CONFIG.DEAD_STATUSES.indexOf(view.status) !== -1;
    totals.orders++;
    status[view.status] = (status[view.status] || 0) + 1;
    if (view.status === "Cancelled") totals.cancelled++;
    if (view.status === "Returned") totals.returned++;
    if (dead) return;

    totals.booked++;
    totals.revenue += view.total;
    totals.discount += view.discount;
    totals.deliveryCharges += view.deliveryCharge;
    totals.units += view.quantity;
    if (view.status === "Delivered") { totals.delivered++; totals.deliveredRevenue += view.total; }
    totals.refunds += Math.min(view.total, returnsByOrder[view.orderId] || 0);

    const bucket = groupBy === "month" ? monthOf(dayOf(view.timestamp)) : dayOf(view.timestamp);
    if (!series[bucket]) series[bucket] = { label: bucket, orders: 0, revenue: 0, profit: 0 };
    series[bucket].orders++;
    series[bucket].revenue += view.total;

    const profit = profitOf(view);
    if (profit === null) totals.noCostOrders++;
    else { totals.profit += profit; totals.profitOrders++; series[bucket].profit += profit; }

    payment[view.payment || "Unknown"] = (payment[view.payment || "Unknown"] || 0) + 1;
    const area = view.area || "Unknown";
    areas[area] = areas[area] || { area: area, orders: 0, revenue: 0 };
    areas[area].orders++;
    areas[area].revenue += view.total;
    if (view.coupon) {
      coupons[view.coupon] = coupons[view.coupon] || { code: view.coupon, orders: 0, discount: 0 };
      coupons[view.coupon].orders++;
      coupons[view.coupon].discount += view.discount;
    }
    const dayDate = parseDay(dayOf(view.timestamp));
    if (dayDate) weekdays[dayDate.getUTCDay()]++;
    view.items.forEach(function (i) {
      const cat = productCategory[i.id] || "Other";
      categoriesSales[cat] = categoriesSales[cat] || { category: cat, qty: 0, revenue: 0 };
      categoriesSales[cat].qty += i.qty;
      categoriesSales[cat].revenue += i.price * i.qty;
    });
    view.items.forEach(function (i) {
      const pk = i.id || i.name;
      const p = products[pk] = products[pk] || { id: i.id, name: i.name, qty: 0, revenue: 0, profit: 0, hasCost: false };
      p.qty += i.qty;
      p.revenue += i.price * i.qty;
      if (i.cost > 0) { p.profit += (i.price - i.cost) * i.qty; p.hasCost = true; }
    });
    const ck = view.phone || view.email;
    if (ck && !customers[ck]) customers[ck] = firstSeen[ck] >= from ? "new" : "returning";
  });

  const customerSplit = { new: 0, returning: 0 };
  Object.keys(customers).forEach(function (k) { customerSplit[customers[k]]++; });
  /* repeat rate: of the people who ordered in this period, how many have ordered 2+ times in all */
  const buyers = Object.keys(customers);
  const repeatBuyers = buyers.filter(function (k) { return (orderCounts[k] || 0) >= 2; }).length;

  const labels = Object.keys(series).sort();
  /* fill empty days so the chart has no gaps */
  let seriesList = labels.map(function (l) { return series[l]; });
  if (groupBy !== "month") {
    seriesList = [];
    let d = from;
    let guard = 0;
    while (d <= to && guard++ < 400) {
      seriesList.push(series[d] || { label: d, orders: 0, revenue: 0, profit: 0 });
      d = addDays(d, 1);
    }
  }

  const productList = Object.keys(products).map(function (k) { return products[k]; });
  const best = productList.slice().sort(function (a, b) { return b.qty - a.qty; }).slice(0, 15);
  const bestByRevenue = productList.slice().sort(function (a, b) { return b.revenue - a.revenue; }).slice(0, 10)
    .map(function (b) { return { id: b.id, name: b.name, qty: b.qty, revenue: b.revenue }; });

  if (!finance) {
    totals.profit = null;
    seriesList.forEach(function (s) { s.profit = null; });
    best.forEach(function (b) { b.profit = null; });
  }

  return {
    from: from, to: to, groupBy: groupBy,
    totals: totals,
    averageOrder: totals.booked ? Math.round(totals.revenue / totals.booked) : 0,
    series: seriesList,
    best: best,
    status: status,
    payment: payment,
    areas: Object.keys(areas).map(function (k) { return areas[k]; }).sort(function (a, b) { return b.orders - a.orders; }).slice(0, 15),
    areasByRevenue: Object.keys(areas).map(function (k) { return areas[k]; }).sort(function (a, b) { return b.revenue - a.revenue; }).slice(0, 15),
    coupons: Object.keys(coupons).map(function (k) { return coupons[k]; }),
    customers: customerSplit,
    repeat: { buyers: buyers.length, repeatBuyers: repeatBuyers, rate: buyers.length ? Math.round(repeatBuyers * 1000 / buyers.length) / 10 : 0 },
    cancelRate: totals.orders ? Math.round((totals.cancelled + totals.returned) * 1000 / totals.orders) / 10 : 0,
    itemsPerOrder: totals.booked ? Math.round(totals.units * 10 / totals.booked) / 10 : 0,
    categories: Object.keys(categoriesSales).map(function (k) { return categoriesSales[k]; }).sort(function (a, b) { return b.revenue - a.revenue; }).slice(0, 12),
    weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(function (label, i) { return { label: label, orders: weekdays[i] }; }),
    bestByRevenue: bestByRevenue
  };
}

function reportData(body) {
  requirePerm("reports.view");
  let to = clip(body.to, 10) || todayStr();
  let from = clip(body.from, 10) || addDays(to, -29);
  if (!parseDay(from) || !parseDay(to)) fail("Dates must look like 2026-01-31.");
  if (from > to) { const t = from; from = to; to = t; }
  const span = (parseDay(to).getTime() - parseDay(from).getTime()) / 86400000;
  if (span > 800) fail("Please choose a shorter date range (under 2 years).");
  const groupBy = body.groupBy === "month" || span > 120 ? "month" : "day";
  return { success: true, report: buildReport(from, to, groupBy, can("finance.view")) };
}

function dashboardData() {
  requirePerm("orders.view");
  assignMissingOrderIds();
  const finance = can("finance.view");
  const today = todayStr();
  const month = monthOf(today);
  const rows = T.orders.readAll().filter(function (r) { return !boolOf(r.trashed, false); });

  const counts = {};
  let todayOrders = 0;
  let todayRevenue = 0;
  let monthOrders = 0;
  let monthRevenue = 0;
  let pendingPayments = 0;
  rows.forEach(function (r) {
    const st = r.status || CONFIG.DEFAULT_STATUS;
    counts[st] = (counts[st] || 0) + 1;
    const dead = CONFIG.DEAD_STATUSES.indexOf(st) !== -1;
    const d = dayOf(r.timestamp);
    if (d === today) { todayOrders++; if (!dead) todayRevenue += r.total; }
    if (monthOf(d) === month && !dead) { monthOrders++; monthRevenue += r.total; }
    if (r.paymentStatus === "Pending verification" && !dead) pendingPayments++;
  });

  const report = buildReport(addDays(today, -29), today, "day", finance);
  const recent = rows.slice(-8).reverse().map(function (r) {
    const v = orderView(r);
    return { orderId: v.orderId, name: v.name, total: v.total, status: v.status, timestamp: v.timestamp, payment: v.payment };
  });

  return {
    success: true,
    today: { orders: todayOrders, revenue: todayRevenue },
    month: { orders: monthOrders, revenue: monthRevenue, profit: finance ? report.totals.profit : null },
    counts: counts,
    pendingPayments: pendingPayments,
    openReturns: T.returns.filter(function (r) { return r.status === "requested" || r.status === "approved"; }).length,
    newMessages: T.messages.filter(function (m) { return m.status === "new"; }).length,
    pendingReviews: T.reviews.filter(function (r) { return r.status === "pending"; }).length,
    stockAlertsWaiting: T.stockAlerts.filter(function (a) { return a.status === "waiting"; }).length,
    abandonedOpen: T.abandonedCarts.filter(function (a) { return a.status === "open" && ageMinutes(a.updated) >= num(getSettings().abandonedMinutes, 60); }).length,
    repeatRate: report.repeat ? report.repeat.rate : 0,
    lowStock: lowStockItems().slice(0, 10),
    recent: recent,
    series: report.series,
    best: report.best.slice(0, 5),
    warnings: {
      defaultPassword: _actor.role === "owner" && ownerUsesDefaultPassword(),
      notifications: !getSettings().notifyEmailEnabled && getSettings().notifyChannel === "none"
    }
  };
}

function ownerUsesDefaultPassword() {
  try {
    const owner = T.admins.findBy("id", "u_owner") || T.admins.readAll()[0];
    if (!owner) return false;
    const key = "ps:defpw:" + sha256Hex(owner.hash).slice(0, 16);
    const hit = cacheGet(key);
    if (hit !== null) return hit === 1;
    const same = checkPasswordHash(CONFIG.INITIAL_PASSWORD, owner.hash);
    cachePut(key, same ? 1 : 0, 3600);
    return same;
  } catch (error) {
    return false;
  }
}

function activityList(body) {
  requirePerm("activity.view");
  let rows = T.activity.readAll(true);
  const actor = str(body && body.actor);
  if (actor) rows = rows.filter(function (r) { return r.actor === actor; });
  rows = rows.slice(-Math.min(num(body && body.limit, 200), 1000)).reverse();
  return { success: true, items: rows.map(function (r) { return pickKeys(r, ["time", "actor", "role", "action", "target", "details"]); }) };
}
/* =========================================================
   ROUTER  -  doGet / doPost
========================================================= */

function resetRequestState() {
  _actor = null;
  _settingsMemo = null;
  _propsMemo = null;
  _lockDepth = 0;
  Object.keys(T).forEach(function (k) { T[k]._rows = null; });
}

function combinedVersion() {
  return ["settings", "catalog", "banners", "content", "reviews"].map(versionOf).join("-");
}

function bootstrapData(clientVersion) {
  const version = combinedVersion();
  if (clientVersion && clientVersion === version) {
    return { success: true, unchanged: true, v: version };
  }
  const catalog = publicCatalog();
  return {
    success: true,
    v: version,
    settings: publicSettings(),
    products: catalog.products,
    categories: catalog.categories,
    banners: bannersPublic(),
    content: contentPublic(),
    reviews: reviewsFeatured()
  };
}

/* ---------------------------------------------------------
   GET  (public only)
--------------------------------------------------------- */
function doGet(e) {
  resetRequestState();
  try {
    const p = (e && e.parameter) || {};
    const action = str(p.action) || "ping";

    if (action === "logo") return logoProxy(p.id);
    if (action === "ping") {
      return jsonResponse({ success: true, message: "PearlSkino BD API is running.", version: API_VERSION, timestamp: new Date().toISOString() });
    }
    if (action === "bootstrap") return jsonResponse(bootstrapData(str(p.v)));
    if (action === "storeSettings") return jsonResponse({ success: true, settings: publicSettings() });
    if (action === "products") {
      const catalog = publicCatalog();
      return jsonResponse({ success: true, products: catalog.products, categories: catalog.categories });
    }
    if (action === "content") return jsonResponse({ success: true, content: contentPublic() });
    if (action === "together") return jsonResponse(togetherPublic());
    if (action === "product") return jsonResponse(productMetaPublic(p.id));
    if (action === "sitemap") return jsonResponse(sitemapPublic());
    if (action === "reviews") return jsonResponse(reviewsPublicFor(p.productId));
    return jsonResponse({ success: false, error: "Unknown action." });
  } catch (error) {
    return jsonResponse(errorPayload(error));
  }
}

function errorPayload(error) {
  if (error && error.api) {
    const out = { success: false, error: error.message, code: error.code };
    if (error.code === "auth") out.authenticated = false;
    return out;
  }
  console.error(error && error.stack ? error.stack : String(error));
  return { success: false, error: "Something went wrong. Please try again.", code: "server" };
}

/* ---------------------------------------------------------
   POST
--------------------------------------------------------- */
function parseBody(e) {
  const raw = e && e.postData && e.postData.contents ? e.postData.contents : "";
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    } catch (error) { /* fall through */ }
  }
  return Object.assign({}, (e && e.parameter) || {});
}

const PUBLIC_ROUTES = {
  login: adminLogin,
  placeOrder: placeOrderPublic,
  trackOrder: trackOrderPublic,
  contact: contactPublic,
  validateCoupon: couponValidatePublic,
  customerRegister: customerRegister,
  customerLogin: customerLogin,
  customerMe: customerMe,
  customerUpdate: customerUpdate,
  customerWishlist: customerWishlist,
  customerOrders: customerOrders,
  customerClaimOrder: customerClaimOrder,
  customerForgot: customerForgot,
  customerReset: customerReset,
  submitReview: reviewSubmitPublic,
  cartSave: cartSavePublic,
  stockNotify: stockNotifyPublic
};

function settingsAdminGet() {
  requirePerm("settings.edit");
  return {
    success: true,
    settings: getSettings(),
    secrets: can("settings.secrets") ? secretStatus() : null,
    channelReady: {
      callmebot: !!getSecret("CALLMEBOT_APIKEY"),
      telegram: !!(getSecret("TELEGRAM_BOT_TOKEN") && getSecret("TELEGRAM_CHAT_ID")),
      meta: !!(getSecret("META_WA_TOKEN") && getSecret("META_WA_PHONE_ID") && getSecret("META_WA_TEMPLATE_ADMIN")),
      metaCustomer: metaCustomerReady()
    },
    triggers: triggerStatus(),
    version: API_VERSION
  };
}

const ADMIN_ROUTES = {
  session: adminSession,
  dashboard: dashboardData,
  report: reportData,

  orders: ordersAdminList,
  orderDetail: orderDetail,
  orderStatus: orderUpdateStatus,
  orderEdit: orderUpdateFields,
  orderCreate: orderCreateManual,
  orderTrash: orderTrash,
  orderRestore: orderRestore,
  orderPurge: orderPurge,
  orderNotify: orderNotify,

  returns: returnsList,
  returnCreate: returnCreate,
  returnUpdate: returnUpdate,

  customers: customersAdminList,
  customerDetail: customerDetail,
  customerFlag: customerFlagSave,
  customerCreate: customerCreate,
  customerDelete: customerDelete,
  customerRestore: customerRestore,
  customerBroadcast: customerBroadcast,
  abandoned: abandonedList,
  abandonedUpdate: abandonedUpdate,
  abandonedDelete: abandonedDelete,
  stockAlerts: stockAlertsList,
  stockAlertUpdate: stockAlertUpdate,
  stockAlertDelete: stockAlertDelete,
  accounts: accountsAdminList,
  accountAction: accountAdminAction,

  products: productsAdminList,
  productSave: productSave,
  productVisibility: productSetVisibility,
  productPurge: productDeleteForever,
  productReorder: productReorder,
  productBulk: productBulk,
  productImport: productImport,
  stockAdjust: stockAdjust,
  inventoryLog: inventoryLogList,
  lowStock: function () { requirePerm("inventory.view"); return { success: true, items: lowStockItems() }; },
  categories: categoriesAdminList,
  categoryCreate: categoryCreate,
  categoryUpdate: categoryUpdate,
  categoryReorder: categoryReorder,

  coupons: couponsAdminList,
  couponSave: couponSave,
  couponDelete: couponDelete,
  banners: bannersAdminList,
  bannerSave: bannerSave,
  bannerDelete: bannerDelete,
  bannerReorder: bannerReorder,
  reviews: reviewsAdminList,
  reviewModerate: reviewModerate,
  reviewDelete: reviewDelete,
  messages: messagesAdminList,
  messageUpdate: messageUpdate,
  messageDelete: messageDelete,

  content: contentAdminList,
  contentDraft: contentSaveDraft,
  contentPublish: contentPublish,
  contentDiscard: contentDiscard,
  contentHistory: contentHistoryList,
  contentRevert: contentRevert,

  settings: settingsAdminGet,
  settingsSave: function (body) { return updateSettings(body.settings); },
  secretsSave: saveSecrets,
  notificationsTest: notificationsTest,
  notificationLog: notificationLogList,
  triggersInstall: function () { requirePerm("backups.run"); return installTriggers(); },
  uploadProductImage: uploadProductImage,
  uploadProductVideo: uploadProductVideo,
  uploadLogo: uploadLogo,

  team: teamList,
  teamSave: teamSave,
  teamLogoutAll: teamLogoutAll,
  activity: activityList,
  backups: backupsList,
  backupCreate: backupCreate,
  backupRestore: backupRestore,
  backupFull: backupFull,
  changePassword: adminChangePassword
};

function doPost(e) {
  resetRequestState();
  try {
    const body = parseBody(e);
    const action = str(body.action);
    if (!action) fail("Missing action.");

    if (action === "logout") return jsonResponse(adminLogout(body.token));

    if (PUBLIC_ROUTES[action]) {
      return jsonResponse(PUBLIC_ROUTES[action](body));
    }
    const handler = ADMIN_ROUTES[action];
    if (!handler) fail("Unknown action.");
    requireAdmin(body.token);
    const result = handler(body);
    if (result && result.success === undefined) result.success = true;
    return jsonResponse(result);
  } catch (error) {
    return jsonResponse(errorPayload(error));
  }
}

/* =========================================================
   SETUP  -  run once from the editor  (Run > setupPearlSkino)
========================================================= */
function triggerStatus() {
  const out = { formSubmit: false, daily: false };
  try {
    ScriptApp.getProjectTriggers().forEach(function (t) {
      if (t.getHandlerFunction() === "onFormSubmitTrigger") out.formSubmit = true;
      if (t.getHandlerFunction() === "dailyBackup") out.daily = true;
    });
  } catch (error) { /* needs scriptapp scope */ }
  return out;
}

function installTriggers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const existing = ScriptApp.getProjectTriggers();
  ["onFormSubmitTrigger", "dailyBackup"].forEach(function (name) {
    existing.forEach(function (t) {
      if (t.getHandlerFunction() === name) ScriptApp.deleteTrigger(t);
    });
  });
  ScriptApp.newTrigger("onFormSubmitTrigger").forSpreadsheet(ss).onFormSubmit().create();
  ScriptApp.newTrigger("dailyBackup").timeBased().everyDays(1).atHour(3).create();
  return { success: true, triggers: triggerStatus() };
}

function setupPearlSkino() {
  resetRequestState();
  return withLock(function () {
    const report = [];
    T.orders.open();
    report.push("Orders sheet ready");
    Object.keys(T).forEach(function (k) {
      if (k !== "orders") T[k].open();
    });
    report.push("Created / repaired " + (Object.keys(T).length - 1) + " other sheets");

    const addedSettings = initializeSettingsSheet();
    report.push("Settings: " + addedSettings + " new setting rows");

    ensureOwner();
    report.push("Owner login ready (username: owner)");

    try {
      const added = syncCustomers();
      report.push("Customers: " + added + " added from orders / accounts (" + T.customers.readAll(true).length + " total)");
    } catch (error) {
      report.push("Customers NOT synced: " + error.message);
    }

    ensureCategoriesForProducts();
    report.push("Categories: " + T.categories.readAll(true).length);

    try {
      installTriggers();
      report.push("Triggers installed (new Google Form orders + daily backup)");
    } catch (error) {
      report.push("Triggers NOT installed: " + error.message + " - run installTriggers manually");
    }

    secretKey();
    bumpVersion("settings", "catalog", "banners", "content", "reviews", "admins");
    const text = "PearlSkino API v" + API_VERSION + " setup complete:\n- " + report.join("\n- ");
    console.log(text);
    return text;
  });
}
