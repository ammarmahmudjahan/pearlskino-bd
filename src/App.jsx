import { BrowserRouter, Routes, Route } from "react-router-dom";

import Header from "./components/Header";
import CartDrawer from "./components/CartDrawer";

import Home from "./pages/Home";
import Shop from "./pages/Shop";
import Product from "./pages/Product";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import About from "./pages/About";
import Contact from "./pages/Contact";
import FAQ from "./pages/FAQ";

import Admin from "./admin/Admin";

export default function App() {
  return (
    <BrowserRouter>
      <Header />

      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/shop" element={<Shop />} />

        <Route
          path="/product/:id"
          element={<Product />}
        />

        <Route path="/cart" element={<Cart />} />

        <Route
          path="/checkout"
          element={<Checkout />}
        />

        <Route path="/about" element={<About />} />

        <Route
          path="/contact"
          element={<Contact />}
        />

        <Route path="/faq" element={<FAQ />} />

        {/* ADMIN */}
        <Route
          path="/admin"
          element={<Admin />}
        />
      </Routes>

      {/* CART DRAWER */}
      <CartDrawer />
    </BrowserRouter>
  );
}