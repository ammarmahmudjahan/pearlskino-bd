import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";

import { lazy, Suspense, useEffect } from "react";

import Header from "./components/Header";
import Footer from "./components/Footer";
import CartDrawer from "./components/CartDrawer";

const Home = lazy(() => import("./pages/Home"));
const Shop = lazy(() => import("./pages/Shop"));
const Product = lazy(() => import("./pages/Product"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Admin = lazy(() => import("./admin/Admin"));


/* =========================================================
   SCROLL TO TOP
========================================================= */

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }, [pathname]);

  return null;
}


/* =========================================================
   APP SHELL
========================================================= */

function AppShell() {
  const { pathname } = useLocation();

  const isAdmin =
    pathname === "/admin" ||
    pathname.startsWith("/admin/");

  return (
    <>
      <ScrollToTop />

      {!isAdmin && <Header />}

      <Suspense
        fallback={
          <div className="page-loading">
            Loading...
          </div>
        }
      >
        <Routes>

          <Route
            path="/"
            element={<Home />}
          />

          <Route
            path="/shop"
            element={<Shop />}
          />

          <Route
            path="/product/:id"
            element={<Product />}
          />

          <Route
            path="/cart"
            element={<Cart />}
          />

          <Route
            path="/checkout"
            element={<Checkout />}
          />

          <Route
            path="/about"
            element={<About />}
          />

          <Route
            path="/contact"
            element={<Contact />}
          />

          <Route
            path="/faq"
            element={<FAQ />}
          />

          <Route
            path="/admin"
            element={<Admin />}
          />

        </Routes>
      </Suspense>

      {!isAdmin && <CartDrawer />}
      {!isAdmin && <Footer />}

    </>
  );
}


/* =========================================================
   APP
========================================================= */

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
