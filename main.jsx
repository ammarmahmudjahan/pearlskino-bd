import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";
import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleUserRound,
  Heart,
  Menu,
  Minus,
  PackageCheck,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
  X,
  Zap,
} from "lucide-react";
import "./styles.css";

/* ============================================================
   CATALOG — placeholder data. Swap for the real Wix export when
   ready (see README). Images are stand-ins from Unsplash.
   ============================================================ */
const P = [
  ["cdnim", "Club de Nuit Intense Man", "Eau de Parfum • 5 ml Decant", "Fragrance", ["EDP Perfumes"], 450, 550, 4.9,
    "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1000&q=85",
    "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1000&q=85"],
  ["mayar", "Lattafa Mayar", "Eau de Parfum • 5 ml Decant", "Fragrance", ["EDP Perfumes"], 390, 450, 4.8,
    "https://images.unsplash.com/photo-1563170351-be82bc888aa4?auto=format&fit=crop&w=1000&q=85",
    "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1000&q=85"],
  ["tropical", "Rayhaan Tropical Vibe", "Eau de Parfum • 5 ml Decant", "Fragrance", ["EDP Perfumes"], 350, 400, 4.8,
    "https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&w=1000&q=85",
    "https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=1000&q=85"],
  ["cosrx", "COSRX Low pH Good Morning Gel Cleanser", "Gentle daily cleanser • 150 ml", "Skincare", ["Oily Skin"], 1250, null, 4.9,
    "https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=1000&q=85",
    "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=1000&q=85"],
  ["simple", "Simple Kind to Skin Refreshing Facial Wash", "Refreshing face wash • 150 ml", "Skincare", ["Fragrance-Free"], 850, null, 4.8,
    "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=1000&q=85",
    "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=1000&q=85"],
  ["cerave", "CeraVe Skincare Routine", "Cleanse • Hydrate • Protect", "Skincare", ["Fragrance-Free"], 2850, null, 4.9,
    "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&w=1000&q=85",
    "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1000&q=85"],
  ["skin1004", "SKIN1004 Madagascar Centella Ampoule", "Soothing ampoule • 100 ml", "Skincare", ["Sensitive Skin"], 1650, null, 4.9,
    "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&w=1000&q=85",
    "https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=1000&q=85"],
  ["axisy", "AXIS-Y Dark Spot Correcting Glow Serum", "Brightening serum • 50 ml", "Skincare", ["Dark Spots"], 1450, 1650, 4.7,
    "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=1000&q=85",
    "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=1000&q=85"],
  ["boj", "Beauty of Joseon Glow Deep Serum", "Rice + alpha-arbutin • 30 ml", "Skincare", ["Oily Skin"], 1350, null, 4.9,
    "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=1000&q=85",
    "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1000&q=85"],
  ["cushion", "PearlSkino Silk Cushion Foundation", "Buildable coverage • SPF 35", "Makeup", ["Everyday"], 1550, null, 4.6,
    "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1000&q=85",
    "https://images.unsplash.com/photo-1563170351-be82bc888aa4?auto=format&fit=crop&w=1000&q=85"],
  ["tint", "PearlSkino Velvet Lip Tint", "Long-wear matte finish", "Makeup", ["Everyday"], 590, null, 4.7,
    "https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=1000&q=85",
    "https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&w=1000&q=85"],
  ["glow", "PearlSkino Pearl Glow Highlighter", "Nacre-finish luminizer", "Makeup", ["Everyday"], 690, 790, 4.8,
    "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1000&q=85",
    "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1000&q=85"],
].map((x) => ({
  id: x[0], name: x[1], subtitle: x[2], category: x[3], tags: x[4],
  price: x[5], oldPrice: x[6], rating: x[7], image: x[8], alt: x[9],
  description: "Thoughtfully selected for the PearlSkino BD beauty edit.",
}));

const F = [
  ["How fast do you deliver in Dhaka?", "Orders inside Dhaka are dispatched through local courier partners. Your exact ETA is confirmed at checkout."],
  ["Do you deliver nationwide in Bangladesh?", "Yes. Nationwide delivery is supported. Delivery time and charge depend on destination."],
  ["Are your products authentic?", "PearlSkino BD is positioned around authentic products with sourcing transparency."],
  ["Can I pay online?", "Yes. The checkout is structured for SSLCOMMERZ, with merchant credentials kept server-side."],
  ["Can I change or cancel an order?", "Contact PearlSkino BD as soon as possible; changes depend on order status."],
];

const money = (n) => `৳${n.toLocaleString("en-BD")}`;
const rev = { initial: { opacity: 0, y: 28 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.15 }, transition: { duration: 0.65 } };

/* ============================================================
   AMBIENT BACKGROUND — aurora mesh + drifting sparkle field.
   Rendered once, fixed behind all content.
   ============================================================ */
function Background() {
  const sparkles = useMemo(
    () =>
      Array.from({ length: 46 }).map((_, i) => ({
        key: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: 2 + Math.random() * 4,
        delay: `${(Math.random() * 8).toFixed(2)}s`,
        duration: `${(4 + Math.random() * 6).toFixed(2)}s`,
        op: (0.35 + Math.random() * 0.55).toFixed(2),
      })),
    []
  );
  return (
    <div className="bg-field" aria-hidden="true">
      <div className="aurora">
        <span className="a" />
        <span className="b" />
        <span className="c" />
        <span className="d" />
      </div>
      <div className="sparkle-field">
        {sparkles.map((s) => (
          <span
            key={s.key}
            className="sparkle"
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              animationDelay: s.delay,
              animationDuration: s.duration,
              "--tw-op": s.op,
            }}
          />
        ))}
      </div>
      <div className="grain" />
    </div>
  );
}

function App() {
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem("pearlskino-cart") || "[]"));
  const [drawer, setDrawer] = useState(false);
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null);
  const [faq, setFaq] = useState(0);
  const [toast, setToast] = useState("");
  const [end, setEnd] = useState(Date.now() + 7 * 3600000 + 41 * 60000);

  useEffect(() => { localStorage.setItem("pearlskino-cart", JSON.stringify(cart)); }, [cart]);
  useEffect(() => { let i = setInterval(() => setEnd((x) => Math.max(0, x - 1000)), 1000); return () => clearInterval(i); }, []);
  useEffect(() => { if (!toast) return; let i = setTimeout(() => setToast(""), 2200); return () => clearTimeout(i); }, [toast]);

  let list = useMemo(
    () =>
      P.filter(
        (p) =>
          (filter === "All" || p.category === filter) &&
          (!query || `${p.name}${p.subtitle}${p.category}`.toLowerCase().includes(query.toLowerCase()))
      ),
    [filter, query]
  );

  const count = cart.reduce((a, i) => a + i.qty, 0);
  const sub = cart.reduce((a, i) => a + i.price * i.qty, 0);
  const ship = sub ? (sub >= 2500 ? 0 : 80) : 0;
  const total = sub + ship;

  const add = (p) => {
    setCart((c) => {
      let f = c.find((i) => i.id === p.id);
      return f ? c.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i)) : [...c, { ...p, qty: 1 }];
    });
    setToast(p.name + " added to your bag");
    setDrawer(true);
  };

  const change = (id, d) =>
    setCart((c) => c.map((i) => (i.id === id ? { ...i, qty: Math.max(0, i.qty + d) } : i)).filter((i) => i.qty));

  const remain = Math.max(0, end - 0);

  return (
    <div>
      <Background />
      <Progress />
      <div className="topbar">
        <Sparkles />
        100% authentic products • Free pickup in selected areas • Nationwide delivery
      </div>
      <header className="header">
        <div className="nav">
          <button className="mobile-menu"><Menu /></button>
          <a className="logo" href="#">PearlSkino <span>BD</span></a>
          <nav>
            <a href="#shop">Shop</a>
            <a href="#collections">Collections</a>
            <a href="#story">Our story</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="actions">
            <button className="icon" onClick={() => setQuery(query ? "" : " ")}><Search /></button>
            <button className="icon desktop"><CircleUserRound /></button>
            <button className="bag" onClick={() => setDrawer(true)}><ShoppingBag /><b>{count}</b></button>
          </div>
        </div>
        {query === " " && (
          <div className="mobile-search">
            <Search />
            <input autoFocus onChange={(e) => setQuery(e.target.value)} placeholder="Search PearlSkino..." />
          </div>
        )}
      </header>
      <main>
        <section className="hero">
          <div className="hero-inner">
            <motion.div {...rev}>
              <div className="badge"><i />100% Authentic Products <b>in Bangladesh</b></div>
              <span className="eyebrow">PEARLSKINO BD • BEAUTY EDIT</span>
              <h1>Find your <em>signature</em> glow.</h1>
              <p>Curated skincare, cosmetics and fragrances — thoughtfully chosen for your everyday ritual.</p>
              <div className="ctas">
                <button className="btn dark" onClick={() => document.querySelector("#shop").scrollIntoView({ behavior: "smooth" })}>
                  Shop Trending <ArrowRight />
                </button>
                <a className="btn glass" href="#collections">Explore Fragrances</a>
              </div>
              <div className="proof">
                <span><ShieldCheck />Authenticity first</span>
                <span><Truck />BD-wide delivery</span>
              </div>
            </motion.div>
            <motion.div className="hero-art" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1 }}>
              <div className="orb-ring" />
              <div className="orb" />
              <div className="art front">
                <img src={P[1].image} alt="Lattafa Mayar" />
                <div className="art-label">
                  <small>NEW DROP</small>
                  <strong>Lattafa Mayar</strong>
                  <span>soft • luminous • unforgettable</span>
                </div>
              </div>
              <div className="floating"><Sparkles />Beauty<br /><b>without compromise.</b></div>
            </motion.div>
          </div>
        </section>
        <section className="sale-wrap">
          <div className="sale">
            <div>
              <small><Zap />LIMITED-TIME EDIT</small>
              <h3>Glow now. Save a little.</h3>
              <p>Selected favourites are moving fast.</p>
            </div>
            <div className="count">
              {[[Math.floor(remain / 3600000), "H"], [Math.floor((remain % 3600000) / 60000), "M"], [Math.floor((remain % 60000) / 1000), "S"]].map((x, idx) => (
                <div key={idx}><b>{String(x[0]).padStart(2, "0")}</b><span>{x[1]}</span></div>
              ))}
            </div>
            <a href="#shop"><ArrowRight /></a>
          </div>
        </section>
        <div className="trust">
          <span><ShieldCheck />Authenticity-focused sourcing</span>
          <span><PackageCheck />Carefully packed orders</span>
          <span><Truck />Dhaka & nationwide BD</span>
          <span><Sparkles />Curated beauty edit</span>
        </div>
        <section id="shop" className="section">
          <motion.div {...rev} className="heading">
            <div>
              <span className="eyebrow">THE EDIT</span>
              <h2>Beauty, curated for you.</h2>
              <p>Discover everyday essentials and statement scents selected for the PearlSkino community.</p>
            </div>
            <div className="searchbox">
              <Search />
              <input value={query === " " ? "" : query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products..." />
            </div>
          </motion.div>
          <div className="filters">
            {["All", "Fragrance", "Skincare", "Makeup"].map((f) => (
              <button key={f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>
          <div className="grid">
            {list.map((p) => <Product key={p.id} p={p} add={add} open={setModal} />)}
          </div>
        </section>
        <section id="collections" className="section">
          <div className="center">
            <span className="eyebrow">SHOP BY MOOD</span>
            <h2>Pick your ritual.</h2>
          </div>
          <div className="categories">
            {[["Fragrance", "Signature scents & decants", P[0].image], ["Skincare", "Simple, effective essentials", P[6].image], ["Makeup", "Everyday glow, elevated", P[10].image]].map((x, idx) => (
              <a key={idx} className="category" href="#shop" onClick={() => setFilter(x[0])}>
                <img src={x[2]} alt={x[0]} />
                <div>
                  <small>{x[0]}</small>
                  <b>{x[1]}</b>
                  <ArrowRight />
                </div>
              </a>
            ))}
          </div>
        </section>
        <section id="story" className="story">
          <div className="story-img">
            <img src={P[2].alt} alt="PearlSkino Story" />
            <span>PEARLSKINO<br /><b>BD</b></span>
          </div>
          <motion.div {...rev}>
            <span className="eyebrow">WHY PEARLSKINO</span>
            <h2>A softer way to shop beauty.</h2>
            <p>We believe beauty shopping should feel personal, transparent and a little magical. PearlSkino BD brings fragrances, skincare and cosmetics into one carefully edited destination.</p>
            <div className="benefits">
              <div><ShieldCheck /><b>Authenticity matters<small>We put product trust first.</small></b></div>
              <div><PackageCheck /><b>Thoughtful packing<small>Every order deserves care.</small></b></div>
              <div><Truck /><b>Made for Bangladesh<small>Delivery designed around BD.</small></b></div>
            </div>
          </motion.div>
        </section>
        <section className="section">
          <div className="center">
            <span className="eyebrow">LOVE NOTES</span>
            <h2>From the community.</h2>
          </div>
          <div className="reviews-grid">
            {[
              ["The whole experience feels much more premium than I expected.", "Sadia R."],
              ["The decants are perfect when I want to test a scent before committing.", "Nabila T."],
              ["Clean, easy to browse and the product presentation is beautiful.", "Fahim M."],
            ].map((x, idx) => (
              <div key={idx} className="review">
                <div>★★★★★</div>
                <blockquote>&ldquo;{x[0]}&rdquo;</blockquote>
                <small>— {x[1]}</small>
              </div>
            ))}
          </div>
        </section>
        <section id="faq" className="section faq">
          <div>
            <span className="eyebrow">QUESTIONS, ANSWERED</span>
            <h2>Need to know?</h2>
            <p>Everything important before your order leaves the PearlSkino studio.</p>
          </div>
          <div>
            {F.map((x, i) => (
              <div key={i} className="faq-item">
                <button onClick={() => setFaq(faq === i ? -1 : i)}>
                  {x[0]}
                  <ChevronDown style={{ transform: faq === i ? "rotate(180deg)" : "none" }} />
                </button>
                {faq === i && <p>{x[1]}</p>}
              </div>
            ))}
          </div>
        </section>
        <section className="newsletter">
          <div>
            <span className="eyebrow">THE PEARLSKINO LETTER</span>
            <h2>A little beauty, delivered.</h2>
            <p>New drops, fragrance finds and quiet little offers. No noise.</p>
          </div>
          <form onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="Your email address" />
            <button className="btn dark">Join the edit <ArrowRight /></button>
          </form>
        </section>
      </main>
      <footer>
        <div>
          <a className="logo" href="#">PearlSkino <span>BD</span></a>
          <p>Beauty, thoughtfully curated for Bangladesh.</p>
        </div>
        <div className="footerlinks">
          <div><b>SHOP</b><a href="#shop">All products</a><a href="#shop">Fragrance</a><a href="#shop">Skincare</a></div>
          <div><b>HELP</b><a href="#faq">Delivery</a><a href="#faq">FAQ</a><a href="#story">About us</a></div>
        </div>
        <div className="footerbottom">
          © {new Date().getFullYear()} PearlSkino BD. All rights reserved.
          <span>Secure checkout • Bangladesh</span>
        </div>
      </footer>
      <Cart open={drawer} close={() => setDrawer(false)} cart={cart} change={change} sub={sub} ship={ship} total={total} />
      <Modal p={modal} close={() => setModal(null)} add={add} />
      {toast && <div className="toast"><Check />{toast}</div>}
    </div>
  );
}

function Progress() {
  const { scrollYProgress } = useScroll();
  return <motion.div className="progress" style={{ scaleX: useSpring(scrollYProgress) }} />;
}

function Product({ p, add, open }) {
  return (
    <motion.article className="product" onClick={() => open(p)}>
      <div className="photo">
        <img src={p.image} alt={p.name} />
        <img className="alt" src={p.alt} alt={p.name} />
        <div className="badges">
          {p.oldPrice && <span>SALE</span>}
          <Heart />
        </div>
        <button onClick={(e) => { e.stopPropagation(); add(p); }}>
          <ShoppingBag />Add to cart
        </button>
      </div>
      <div className="pinfo">
        <div>
          <small>{p.category}</small>
          <h3>{p.name}</h3>
          <p>{p.subtitle}</p>
        </div>
        <strong>{money(p.price)} {p.oldPrice && <del>{money(p.oldPrice)}</del>}</strong>
        <span>★ {p.rating}</span>
      </div>
    </motion.article>
  );
}

function Cart({ open, close, cart, change, sub, ship, total }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <div className="backdrop" onClick={close} />
          <motion.aside className="drawer" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 330, damping: 34 }}>
            <div className="drawerhead">
              <div><span className="eyebrow">YOUR BAG</span><h3>{cart.length} items</h3></div>
              <button onClick={close}><X /></button>
            </div>
            {!cart.length ? (
              <div className="empty"><ShoppingBag /><h4>Your bag is waiting.</h4></div>
            ) : (
              <>
                <div className="items">
                  {cart.map((i) => (
                    <div key={i.id} className="item">
                      <img src={i.image} alt={i.name} />
                      <div>
                        <b>{i.name}</b>
                        <small>{i.subtitle}</small>
                        <strong>{money(i.price)}</strong>
                        <div className="qty">
                          <button onClick={() => change(i.id, -1)}><Minus /></button>
                          {i.qty}
                          <button onClick={() => change(i.id, 1)}><Plus /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="summary">
                  <p>Subtotal <b>{money(sub)}</b></p>
                  <p>Delivery <b>{ship ? money(ship) : "FREE"}</b></p>
                  <h4>Total <b>{money(total)}</b></h4>
                  <a className="checkout" href="/checkout.html">Proceed to secure checkout <ArrowRight /></a>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Modal({ p, close, add }) {
  return (
    <AnimatePresence>
      {p && (
        <>
          <div className="backdrop" onClick={close} />
          <motion.div className="modal" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <button className="modalx" onClick={close}><X /></button>
            <img src={p.image} alt={p.name} />
            <div>
              <span className="eyebrow">{p.category}</span>
              <h2>{p.name}</h2>
              <p>{p.description}</p>
              <b>{money(p.price)}</b>
              <button className="btn dark" onClick={() => { add(p); close(); }}>Add to cart <ShoppingBag /></button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

createRoot(document.getElementById("root")).render(<App />);
