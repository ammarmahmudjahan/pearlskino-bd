import "./Admin.css";
import ProductManager from "./ProductManager";

export default function Admin() {
  return (
    <div className="admin">

      {/* SIDEBAR */}
      <aside className="admin-sidebar">

        <div className="admin-brand">
          PearlSkino <span>BD</span>
        </div>

        <nav>
          <a href="/admin" className="active">
            Dashboard
          </a>

          <a href="/admin">
            Products
          </a>

          <a href="/admin">
            Orders
          </a>

          <a href="/admin">
            Customers
          </a>

          <a href="/admin">
            Settings
          </a>
        </nav>

        <div className="admin-sidebar-bottom">
          <a href="/">
            View Store
          </a>
        </div>

      </aside>


      {/* MAIN CONTENT */}
      <main className="admin-main">

        {/* TOP BAR */}
        <header className="admin-topbar">

          <div>
            <p className="admin-eyebrow">
              PEARLSKINO BD
            </p>

            <h1>
              Product Dashboard
            </h1>
          </div>

          <a
            href="/"
            className="admin-view-store"
          >
            View Store
          </a>

        </header>


        {/* STATISTICS */}
        <section className="admin-stats">

          <div className="admin-stat">
            <span>Total Products</span>
            <strong>12</strong>
          </div>

          <div className="admin-stat">
            <span>Active Products</span>
            <strong>10</strong>
          </div>

          <div className="admin-stat">
            <span>Low Stock</span>
            <strong>2</strong>
          </div>

          <div className="admin-stat">
            <span>Orders</span>
            <strong>0</strong>
          </div>

        </section>


        {/* PRODUCT MANAGER */}
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

          {/* EDITABLE PRODUCT MANAGER */}
          <ProductManager />

        </section>

      </main>

    </div>
  );
}