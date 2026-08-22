import { useEffect, useMemo, useState } from "react";
import { useProducts } from "../hooks/useProducts";
import "./Admin.css";
import ProductManager from "./ProductManager";

const ORDERS_API =
  "https://script.google.com/macros/s/AKfycbyTPwWo0X7XV1MtETwYHn5kdX6I47xZUTTf0cA1eO-D5fLz2K1M70OBEc7Pa2ovqnAQ/exec";

const STATUSES = [
  "New",
  "Confirmed",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
];

/* =========================================================
   ORDERS API
========================================================= */

async function fetchOrders() {
  const response = await fetch(
    `${ORDERS_API}?action=orders`
  );

  if (!response.ok) {
    throw new Error("Unable to load orders.");
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(
      data.error || "Unable to load orders."
    );
  }

  return data.orders || [];
}


/* =========================================================
   CUSTOMERS API
========================================================= */

async function fetchCustomers() {
  const response = await fetch(
    `${ORDERS_API}?action=customers`
  );

  if (!response.ok) {
    throw new Error("Unable to load customers.");
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(
      data.error || "Unable to load customers."
    );
  }

  return data.customers || [];
}


/* =========================================================
   UPDATE STATUS
========================================================= */

async function updateOrderStatus(orderId, status) {
  const response = await fetch(
    ORDERS_API,
    {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        action: "updateStatus",
        orderId,
        status,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      "Unable to update order status."
    );
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(
      data.error ||
      "Unable to update order status."
    );
  }

  return data;
}


/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({ status }) {
  const safeStatus =
    status || "New";

  return (
    <span
      className={`order-status status-${safeStatus
        .toLowerCase()
        .replace(/\s+/g, "-")}`}
    >
      {safeStatus}
    </span>
  );
}


/* =========================================================
   ORDERS PAGE
========================================================= */

function OrdersPage({
  orders,
  loading,
  error,
  refreshOrders,
}) {
  const [
    updatingOrder,
    setUpdatingOrder,
  ] = useState(null);

  async function handleStatusChange(
    orderId,
    status
  ) {
    try {
      setUpdatingOrder(orderId);

      await updateOrderStatus(
        orderId,
        status
      );

      await refreshOrders();

    } catch (error) {
      console.error(error);

      alert(
        error.message ||
        "Failed to update order status."
      );

    } finally {
      setUpdatingOrder(null);
    }
  }


  return (
    <section className="admin-page-section">

      <div className="admin-section-header">

        <div>
          <p className="admin-eyebrow">
            SALES
          </p>

          <h2>
            Orders
          </h2>

          <p className="admin-page-description">
            Manage customer orders and update
            their delivery status.
          </p>
        </div>

        <button
          type="button"
          className="admin-refresh-button"
          onClick={refreshOrders}
          disabled={loading}
        >
          {loading
            ? "Refreshing..."
            : "↻ Refresh"}
        </button>

      </div>


      {error && (
        <div className="admin-error">
          {error}
        </div>
      )}


      {loading ? (

        <div className="admin-loading">
          Loading orders...
        </div>

      ) : orders.length === 0 ? (

        <div className="admin-empty">

          <div className="admin-empty-icon">
            ✦
          </div>

          <h3>
            No orders yet
          </h3>

          <p>
            New customer orders will appear
            here automatically.
          </p>

        </div>

      ) : (

        <div className="orders-table-wrapper">

          <div className="orders-table">

            <div className="orders-table-header">

              <span>Order</span>
              <span>Customer</span>
              <span>Products</span>
              <span>Total</span>
              <span>Payment</span>
              <span>Delivery</span>
              <span>Status</span>

            </div>


            {orders.map((order) => (

              <div
                className="order-row"
                key={
                  order.orderId ||
                  order.rowNumber
                }
              >

                <div className="order-id-cell">

                  <strong>
                    {order.orderId ||
                      "—"}
                  </strong>

                  <small>
                    {order.timestamp ||
                      ""}
                  </small>

                </div>


                <div>

                  <strong>
                    {order.name ||
                      "Unknown"}
                  </strong>

                  <small>
                    {order.phone ||
                      "No phone"}
                  </small>

                </div>


                <div className="order-products-cell">

                  <span>
                    {order.products ||
                      "—"}
                  </span>

                  {order.quantity && (
                    <small>
                      Qty:{" "}
                      {order.quantity}
                    </small>
                  )}

                </div>


                <strong>
                  ৳
                  {Number(
                    String(
                      order.total || "0"
                    ).replace(
                      /[^\d.-]/g,
                      ""
                    )
                  ).toLocaleString()}
                </strong>


                <span>
                  {order.payment ||
                    "—"}
                </span>


                <div>

                  <strong>
                    {order.delivery ||
                      "—"}
                  </strong>

                  {order.area && (
                    <small>
                      {order.area}
                    </small>
                  )}

                </div>


                <div className="order-status-cell">

                  <StatusBadge
                    status={
                      order.status
                    }
                  />

                  <select
                    value={
                      order.status ||
                      "New"
                    }
                    disabled={
                      updatingOrder ===
                      order.orderId
                    }
                    onChange={(e) =>
                      handleStatusChange(
                        order.orderId,
                        e.target.value
                      )
                    }
                  >

                    {STATUSES.map(
                      (status) => (
                        <option
                          key={status}
                          value={status}
                        >
                          {status}
                        </option>
                      )
                    )}

                  </select>

                </div>

              </div>

            ))}

          </div>

        </div>

      )}

    </section>
  );
}


/* =========================================================
   CUSTOMERS PAGE
========================================================= */

function CustomersPage({
  customers,
  loading,
  error,
  refreshCustomers,
}) {
  return (
    <section className="admin-page-section">

      <div className="admin-section-header">

        <div>
          <p className="admin-eyebrow">
            CRM
          </p>

          <h2>
            Customers
          </h2>

          <p className="admin-page-description">
            Customer information collected from
            your orders.
          </p>
        </div>

        <button
          type="button"
          className="admin-refresh-button"
          onClick={refreshCustomers}
          disabled={loading}
        >
          {loading
            ? "Refreshing..."
            : "↻ Refresh"}
        </button>

      </div>


      {error && (
        <div className="admin-error">
          {error}
        </div>
      )}


      {loading ? (

        <div className="admin-loading">
          Loading customers...
        </div>

      ) : customers.length === 0 ? (

        <div className="admin-empty">

          <div className="admin-empty-icon">
            ✦
          </div>

          <h3>
            No customers yet
          </h3>

          <p>
            Customers will appear here after
            receiving orders.
          </p>

        </div>

      ) : (

        <div className="customers-table-wrapper">

          <div className="customers-table">

            <div className="customers-table-header">

              <span>Customer</span>
              <span>Contact</span>
              <span>Location</span>
              <span>Orders</span>
              <span>Total Spent</span>
              <span>Last Order</span>

            </div>


            {customers.map(
              (customer) => (

                <div
                  className="customer-row"
                  key={customer.id}
                >

                  <div>

                    <strong>
                      {customer.name ||
                        "Unknown"}
                    </strong>

                    <small>
                      {customer.id}
                    </small>

                  </div>


                  <div>

                    <strong>
                      {customer.phone ||
                        "—"}
                    </strong>

                    <small>
                      {customer.email ||
                        "—"}
                    </small>

                  </div>


                  <div>

                    <strong>
                      {customer.area ||
                        "—"}
                    </strong>

                    <small>
                      {customer.address ||
                        ""}
                    </small>

                  </div>


                  <strong>
                    {customer.orders ||
                      0}
                  </strong>


                  <strong>
                    ৳
                    {Number(
                      customer.totalSpent ||
                        0
                    ).toLocaleString()}
                  </strong>


                  <span>
                    {customer.lastOrder ||
                      "—"}
                  </span>

                </div>

              )
            )}

          </div>

        </div>

      )}

    </section>
  );
}


/* =========================================================
   DASHBOARD
========================================================= */

function Dashboard({
  products,
  productsLoading,
  orders,
}) {
  const totalProducts =
    products.length;

  const activeProducts =
    products.filter(
      (product) =>
        product.status !==
        "inactive"
    ).length;

  const lowStock =
    products.filter(
      (product) =>
        Number(
          product.stock || 0
        ) <= 2
    ).length;

  const newOrders =
    orders.filter(
      (order) =>
        (order.status || "New") ===
        "New"
    ).length;

  const revenue =
    orders
      .filter(
        (order) =>
          (order.status || "") !==
          "Cancelled"
      )
      .reduce(
        (sum, order) =>
          sum +
          Number(
            String(
              order.total || "0"
            ).replace(
              /[^\d.-]/g,
              ""
            )
          ),
        0
      );


  return (
    <>

      <section className="admin-stats">

        <div className="admin-stat">

          <span>
            Total Products
          </span>

          <strong>
            {productsLoading ? "…" : totalProducts}
          </strong>

        </div>


        <div className="admin-stat">

          <span>
            Active Products
          </span>

          <strong>
            {productsLoading ? "…" : activeProducts}
          </strong>

        </div>


        <div className="admin-stat">

          <span>
            Low Stock
          </span>

          <strong>
            {productsLoading ? "…" : lowStock}
          </strong>

        </div>


        <div className="admin-stat">

          <span>
            Orders
          </span>

          <strong>
            {orders.length}
          </strong>

        </div>

      </section>


      <section className="admin-dashboard-extra">

        <div className="admin-stat">

          <span>
            New Orders
          </span>

          <strong>
            {newOrders}
          </strong>

        </div>


        <div className="admin-stat">

          <span>
            Non-Cancelled Revenue
          </span>

          <strong>
            ৳
            {revenue.toLocaleString()}
          </strong>

        </div>

      </section>

    </>
  );
}


/* =========================================================
   SETTINGS PAGE
========================================================= */

const DEFAULT_SETTINGS = {
  storeName: "PearlSkino BD",
  tagline: "Beauty, fragrance & self-care",
  phone: "",
  email: "",
  deliveryCharge: 0,
  freeDeliveryThreshold: 0,
  codEnabled: true,
  pickupEnabled: true,
  lowStockThreshold: 2,
  autoRefreshSeconds: 30,
};


function SettingsPage() {

  const [
    settings,
    setSettings,
  ] = useState(
    DEFAULT_SETTINGS
  );

  const [
    loadingSettings,
    setLoadingSettings,
  ] = useState(true);


  const [
    saved,
    setSaved,
  ] = useState(false);


  useEffect(() => {

    async function loadSettings() {

      try {

        const response = await fetch(
          "http://localhost:3001/api/store-settings"
        );

        const data =
          await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error ||
            "Unable to load store settings."
          );
        }

        setSettings(
          {
            ...DEFAULT_SETTINGS,
            ...data.settings,
          }
        );

      } catch (error) {

        console.error(
          "LOAD SETTINGS ERROR:",
          error
        );

        window.alert(
          "Unable to load store settings from the local server."
        );

      } finally {

        setLoadingSettings(false);

      }

    }

    loadSettings();

  }, []);


  function handleChange(e) {

    const {
      name,
      value,
      type,
      checked,
    } = e.target;


    setSaved(false);


    setSettings(
      (current) => ({
        ...current,

        [name]:
          type === "checkbox"
            ? checked
            : [
                "deliveryCharge",
                "freeDeliveryThreshold",
                "lowStockThreshold",
                "autoRefreshSeconds",
              ].includes(name)
              ? value === ""
                ? 0
                : Number(value)
              : value,
      })
    );

  }


  async function saveSettings(e) {

    e.preventDefault();

    setSaved(false);

    try {

      const response = await fetch(
        "http://localhost:3001/api/store-settings",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(settings),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
          "Unable to save store settings."
        );
      }

      setSettings(
        data.settings
      );

      setSaved(true);

      window.dispatchEvent(
        new CustomEvent(
          "pearlskino-settings-updated"
        )
      );

      setTimeout(() => {
        setSaved(false);
      }, 2500);

    } catch (error) {

      console.error(
        "SAVE SETTINGS ERROR:",
        error
      );

      window.alert(
        error?.message ||
        "Unable to save store settings."
      );

    }

  }

  async function resetSettings() {

    const confirmed =
      window.confirm(
        "Reset all admin settings to their defaults?"
      );


    if (!confirmed) {
      return;
    }


    try {

      setSettings(
        DEFAULT_SETTINGS
      );


      const response =
        await fetch(
          "http://localhost:3001/api/store-settings",
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify(
                DEFAULT_SETTINGS
              ),
          }
        );


      const data =
        await response.json();


      if (!response.ok || !data.success) {
        throw new Error(
          data?.error ||
          "Unable to reset store settings."
        );
      }


      setSaved(true);


      setTimeout(() => {
        setSaved(false);
      }, 2500);


    } catch (error) {

      console.error(
        "RESET SETTINGS ERROR:",
        error
      );


      window.alert(
        error?.message ||
        "Unable to reset store settings."
      );

    }

  }


  return (

    <section className="admin-page-section settings-page">

      <div className="admin-section-header">

        <div>

          <p className="admin-eyebrow">
            SYSTEM
          </p>

          <h2>
            Settings
          </h2>

          <p className="admin-page-description">
            Configure your PearlSkino BD store and
            admin dashboard preferences.
          </p>

        </div>

      </div>


      <form
        className="settings-form"
        onSubmit={saveSettings}
      >


        {/* STORE */}

        <div className="settings-card">

          <div className="settings-card-header">

            <div>

              <p className="settings-card-eyebrow">
                STORE
              </p>

              <h3>
                Store Information
              </h3>

              <p>
                Basic information used throughout
                your store.
              </p>

            </div>

          </div>


          <div className="settings-grid">

            <label>

              Store Name

              <input
                name="storeName"
                value={settings.storeName}
                onChange={handleChange}
              />

            </label>


            <label>

              Tagline

              <input
                name="tagline"
                value={settings.tagline}
                onChange={handleChange}
              />

            </label>


            <label>

              Contact Phone

              <input
                name="phone"
                value={settings.phone}
                onChange={handleChange}
                placeholder="01XXXXXXXXX"
              />

            </label>


            <label>

              Contact Email

              <input
                type="email"
                name="email"
                value={settings.email}
                onChange={handleChange}
                placeholder="hello@example.com"
              />

            </label>

          </div>

        </div>


        {/* DELIVERY */}

        <div className="settings-card">

          <div className="settings-card-header">

            <div>

              <p className="settings-card-eyebrow">
                DELIVERY
              </p>

              <h3>
                Delivery Settings
              </h3>

              <p>
                Configure delivery and payment
                options for your store.
              </p>

            </div>

          </div>


          <div className="settings-grid">

            <label>

              Delivery Charge

              <div className="settings-input-prefix">

                <span>
                  ৳
                </span>

                <input
                  type="number"
                  min="0"
                  name="deliveryCharge"
                  value={
                    settings.deliveryCharge
                  }
                  onChange={handleChange}
                />

              </div>

            </label>


            <label>

              Free Delivery Above

              <div className="settings-input-prefix">

                <span>
                  ৳
                </span>

                <input
                  type="number"
                  min="0"
                  name="freeDeliveryThreshold"
                  value={
                    settings.freeDeliveryThreshold
                  }
                  onChange={handleChange}
                />

              </div>

            </label>

          </div>


          <div className="settings-toggles">

            <label className="settings-toggle">

              <input
                type="checkbox"
                name="codEnabled"
                checked={
                  settings.codEnabled
                }
                onChange={handleChange}
              />

              <span>

                <strong>
                  Cash on Delivery
                </strong>

                <small>
                  Allow customers to place COD
                  orders.
                </small>

              </span>

            </label>


            <label className="settings-toggle">

              <input
                type="checkbox"
                name="pickupEnabled"
                checked={
                  settings.pickupEnabled
                }
                onChange={handleChange}
              />

              <span>

                <strong>
                  Store Pickup
                </strong>

                <small>
                  Allow customers to collect
                  orders directly.
                </small>

              </span>

            </label>

          </div>

        </div>


        {/* DASHBOARD */}

        <div className="settings-card">

          <div className="settings-card-header">

            <div>

              <p className="settings-card-eyebrow">
                DASHBOARD
              </p>

              <h3>
                Admin Preferences
              </h3>

              <p>
                Control how the admin dashboard
                handles inventory and updates.
              </p>

            </div>

          </div>


          <div className="settings-grid">

            <label>

              Low Stock Threshold

              <input
                type="number"
                min="0"
                name="lowStockThreshold"
                value={
                  settings.lowStockThreshold
                }
                onChange={handleChange}
              />

              <small className="settings-help">
                Products at or below this number
                appear as low stock.
              </small>

            </label>


            <label>

              Auto Refresh Interval

              <div className="settings-input-suffix">

                <input
                  type="number"
                  min="5"
                  max="300"
                  name="autoRefreshSeconds"
                  value={
                    settings.autoRefreshSeconds
                  }
                  onChange={handleChange}
                />

                <span>
                  seconds
                </span>

              </div>

              <small className="settings-help">
                Orders and customers are refreshed
                automatically at this interval.
              </small>

            </label>

          </div>

        </div>


        {/* ACTIONS */}

        <div className="settings-actions">

          <button
            type="button"
            className="settings-reset-button"
            onClick={resetSettings}
          >
            Reset Defaults
          </button>


          <div className="settings-save-group">

            {saved && (
              <span className="settings-saved">
                ✓ Settings saved
              </span>
            )}


            <button
              type="submit"
              className="settings-save-button"
            >
              Save Settings
            </button>

          </div>

        </div>

      </form>

    </section>

  );
}


/* =========================================================
   ADMIN
========================================================= */

export default function Admin() {

  const [
    activePage,
    setActivePage,
  ] = useState("dashboard");


  const [
    orders,
    setOrders,
  ] = useState([]);


  const [
    customers,
    setCustomers,
  ] = useState([]);


  const [
    ordersLoading,
    setOrdersLoading,
  ] = useState(false);


  const [
    customersLoading,
    setCustomersLoading,
  ] = useState(false);


  const [
    ordersError,
    setOrdersError,
  ] = useState("");


  const [
    customersError,
    setCustomersError,
  ] = useState("");


  const [
    products,
    ,
    productsLoading,
  ] = useProducts();


  /* =======================================================
     LOAD ORDERS
  ======================================================= */

  async function refreshOrders() {

    try {

      setOrdersLoading(true);
      setOrdersError("");

      const data =
        await fetchOrders();

      setOrders(data);

    } catch (error) {

      console.error(
        "Orders loading failed:",
        error
      );

      setOrdersError(
        error.message ||
        "Unable to load orders."
      );

    } finally {

      setOrdersLoading(false);

    }
  }


  /* =======================================================
     LOAD CUSTOMERS
  ======================================================= */

  async function refreshCustomers() {

    try {

      setCustomersLoading(true);
      setCustomersError("");

      const data =
        await fetchCustomers();

      setCustomers(data);

    } catch (error) {

      console.error(
        "Customers loading failed:",
        error
      );

      setCustomersError(
        error.message ||
        "Unable to load customers."
      );

    } finally {

      setCustomersLoading(false);

    }
  }


  /* =======================================================
     INITIAL LOAD + AUTOMATIC REFRESH
  ======================================================= */

  useEffect(() => {

    /*
     * Load immediately when Admin opens.
     */
    refreshOrders();
    refreshCustomers();

    /*
     * Automatically refresh orders and customers
     * every 30 seconds while the Admin dashboard
     * is open.
     */
    const refreshInterval = setInterval(() => {

      refreshOrders();
      refreshCustomers();

    }, 30 * 1000);

    /*
     * Clean up the interval when Admin unmounts.
     */
    return () => {
      clearInterval(refreshInterval);
    };

  }, []);


  /* =======================================================
     PAGE TITLE
  ======================================================= */

  const pageTitle =
    useMemo(() => {

      switch (
        activePage
      ) {

        case "products":
          return "Product Dashboard";

        case "orders":
          return "Orders";

        case "customers":
          return "Customers";

        case "settings":
          return "Settings";

        default:
          return "Dashboard";

      }

    }, [activePage]);


  /* =======================================================
     NAVIGATION
  ======================================================= */

  function navigate(page) {

    setActivePage(page);

  }


  /* =======================================================
     RENDER
  ======================================================= */

  return (

    <div className="admin">

      {/* SIDEBAR */}

      <aside className="admin-sidebar">

        <div className="admin-brand">

          PearlSkino{" "}

          <span>
            BD
          </span>

        </div>


        <nav>

          <a
            href="#dashboard"
            className={
              activePage ===
              "dashboard"
                ? "active"
                : ""
            }
            onClick={(e) => {

              e.preventDefault();

              navigate(
                "dashboard"
              );

            }}
          >
            Dashboard
          </a>


          <a
            href="#products"
            className={
              activePage ===
              "products"
                ? "active"
                : ""
            }
            onClick={(e) => {

              e.preventDefault();

              navigate(
                "products"
              );

            }}
          >
            Products
          </a>


          <a
            href="#orders"
            className={
              activePage ===
              "orders"
                ? "active"
                : ""
            }
            onClick={(e) => {

              e.preventDefault();

              navigate(
                "orders"
              );

            }}
          >
            Orders

            {orders.length > 0 && (
              <span className="sidebar-count">
                {orders.length}
              </span>
            )}

          </a>


          <a
            href="#customers"
            className={
              activePage ===
              "customers"
                ? "active"
                : ""
            }
            onClick={(e) => {

              e.preventDefault();

              navigate(
                "customers"
              );

            }}
          >
            Customers
          </a>


          <a
            href="#settings"
            className={
              activePage ===
              "settings"
                ? "active"
                : ""
            }
            onClick={(e) => {

              e.preventDefault();

              navigate(
                "settings"
              );

            }}
          >
            Settings
          </a>

        </nav>


        <div className="admin-sidebar-bottom">

          <a href="/">
            View Store
          </a>

        </div>

      </aside>


      {/* MAIN */}

      <main className="admin-main">

        {/* TOP BAR */}

        <header className="admin-topbar">

          <div>

            <p className="admin-eyebrow">
              PEARLSKINO BD
            </p>

            <h1>
              {pageTitle}
            </h1>

          </div>


          <a
            href="/"
            className="admin-view-store"
          >
            View Store
          </a>

        </header>


        {/* DASHBOARD */}

        {activePage ===
          "dashboard" && (

          <>

            <Dashboard
              products={products}
              productsLoading={productsLoading}
              orders={orders}
            />


            <section className="admin-products">

              <div className="admin-section-header">

                <div>

                  <p className="admin-eyebrow">
                    CATALOG
                  </p>

                  <h2>
                    Manage Products
                  </h2>

                </div>

              </div>

              <ProductManager />

            </section>

          </>

        )}


        {/* PRODUCTS */}

        {activePage ===
          "products" && (

          <section className="admin-products">

            <div className="admin-section-header">

              <div>

                <p className="admin-eyebrow">
                  CATALOG
                </p>

                <h2>
                  Manage Products
                </h2>

              </div>

            </div>

            <ProductManager />

          </section>

        )}


        {/* ORDERS */}

        {activePage ===
          "orders" && (

          <OrdersPage
            orders={orders}
            loading={
              ordersLoading
            }
            error={
              ordersError
            }
            refreshOrders={
              refreshOrders
            }
          />

        )}


        {/* CUSTOMERS */}

        {activePage ===
          "customers" && (

          <CustomersPage
            customers={
              customers
            }
            loading={
              customersLoading
            }
            error={
              customersError
            }
            refreshCustomers={
              refreshCustomers
            }
          />

        )}


                {/* SETTINGS */}

        {activePage ===
          "settings" && (

          <SettingsPage />

        )}

      </main>

    </div>
  );
}













