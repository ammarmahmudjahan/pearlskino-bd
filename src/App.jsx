import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";

import { useStore } from "./context/StoreContext";
import { useContent } from "./content/context";
import { EditBar } from "./content/EditUI";

import Header from "./components/Header";
import Footer from "./components/Footer";
import CartDrawer from "./components/CartDrawer";
import CartToast from "./components/CartToast";
import FavouritePrompt from "./components/FavouritePrompt";
import Maintenance from "./components/Maintenance";
import ErrorBoundary from "./components/ErrorBoundary";
import NotFound from "./pages/NotFound";

const Home = lazy(() => import("./pages/Home"));
const Shop = lazy(() => import("./pages/Shop"));
const Product = lazy(() => import("./pages/Product"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Account = lazy(() => import("./pages/Account"));
const Track = lazy(() => import("./pages/Track"));
const Admin = lazy(() => import("./admin/Admin"));

/* =========================================================
   SCROLL TO TOP  (every new page starts at the top)
========================================================= */
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}

/* =========================================================
   HIDES THE FIRST-LOAD SPLASH once a page is ready
========================================================= */
function InitialLoaderExit() {
  useEffect(() => {
    const loader = document.getElementById("initial-loading");

    if (!loader) return undefined;

    const frame = requestAnimationFrame(() => {
      loader.classList.add("loaded");
      window.setTimeout(() => loader.remove(), 500);
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  return null;
}

/* =========================================================
   APP SHELL
========================================================= */
function AppShell() {
  const { pathname } = useLocation();
  const { settings } = useStore();
  const content = useContent();

  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  /* the owner (checking or in edit mode) can still see the whole store */
  const closedForVisitors = Boolean(settings.maintenanceMode) && !isAdmin && content.status === "off";

  if (closedForVisitors) {
    return (
      <>
        <ScrollToTop />
        <Maintenance />
        <InitialLoaderExit />
      </>
    );
  }

  return (
    <>
      <ScrollToTop />

      {!isAdmin && <Header />}

      <ErrorBoundary>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/product/:id" element={<Product />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/account" element={<Account />} />
            <Route path="/track" element={<Track />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/maintenance" element={content.editMode ? <Maintenance /> : <NotFound />} />
            <Route path="*" element={<NotFound />} />
          </Routes>

          <InitialLoaderExit />
        </Suspense>
      </ErrorBoundary>

      {!isAdmin && <CartDrawer />}
      {!isAdmin && <CartToast />}
      {!isAdmin && <FavouritePrompt />}
      {!isAdmin && <Footer />}
      {!isAdmin && <EditBar />}
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
