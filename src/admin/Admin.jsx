import { useCallback, useEffect, useMemo, useState } from "react";

import "./Admin.css";
import { useStore } from "../context/StoreContext";
import { apiPost } from "../lib/api";
import {
  adminCall,
  clearAdminSession,
  getAdminToken,
  getStoredAdminUser,
  saveAdminSession,
} from "../lib/adminApi";
import { EDIT_MODE_KEY } from "../config/api";
import { AdminContext, Feedback, Field, Spinner, toast } from "./ui";

import Dashboard from "./pages/Dashboard";
import { Orders, Returns } from "./pages/Orders";
import { Products, Categories } from "./pages/Catalog";
import Inventory from "./pages/Inventory";
import Customers from "./pages/Customers";
import Abandoned from "./pages/Abandoned";
import { Coupons, Banners } from "./pages/Marketing";
import { Reviews, Messages } from "./pages/Inbox";
import SiteText from "./pages/SiteText";
import Settings from "./pages/Settings";
import Reports from "./pages/Reports";
import { Team, Activity, Backups, Password } from "./pages/Team";

/* ---------- icons (one path each, so no icon library is needed) ---------- */
const ICONS = {
  dashboard: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  orders: "M7 4h10l1 3H6l1-3zM5 8h14l-1 12H6L5 8zm4 3v6m3-6v6m3-6v6",
  returns: "M9 7H5l3-3m-3 3 3 3M5 7h9a5 5 0 0 1 0 10H8",
  products: "M12 3 3 7.5v9L12 21l9-4.5v-9L12 3zm0 9 9-4.5M12 12 3 7.5M12 12v9",
  categories: "M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z",
  inventory: "M4 7l8-4 8 4v10l-8 4-8-4V7zm4 2v4l4 2 4-2V9",
  customers: "M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM4 21a8 8 0 0 1 16 0",
  abandoned: "M3 4h2l2.4 11h10.2L20 7H6.2M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm9 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  coupons: "M3 9a2 2 0 0 0 0 6v3h18v-3a2 2 0 0 1 0-6V6H3v3zm6-1v8m6-8v8",
  banners: "M3 5h18v14H3V5zm0 10 5-5 4 4 3-3 6 6",
  reviews: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z",
  messages: "M3 5h18v12H8l-5 4V5z",
  text: "M5 5h14M12 5v14m-4 0h8",
  settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0-6 1.5 3 3.3-.7.9 3.2 3 1.5-1.5 3 1.5 3-3 1.5-.9 3.2-3.3-.7L12 22l-1.5-3-3.3.7-.9-3.2-3-1.5 1.5-3-1.5-3 3-1.5.9-3.2 3.3.7L12 2z",
  reports: "M4 20V10m6 10V4m6 16v-8m6 8H2",
  team: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z",
  activity: "M3 12h4l3-8 4 16 3-8h4",
  backups: "M12 4v12m0 0-4-4m4 4 4-4M4 20h16",
  password: "M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5V11z",
  storefront: "M3 9l2-5h14l2 5M3 9v11h18V9M3 9h18M9 20v-6h6v6",
};

function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name] || ICONS.dashboard} />
    </svg>
  );
}

/* label, permission needed, group */
const PAGES = [
  { id: "dashboard", label: "Dashboard", perm: "orders.view", group: "Sales", comp: Dashboard },
  { id: "orders", label: "Orders", perm: "orders.view", group: "Sales", comp: Orders, badge: "newOrders" },
  { id: "returns", label: "Returns & refunds", perm: "orders.view", group: "Sales", comp: Returns, badge: "openReturns" },
  { id: "customers", label: "Customers", perm: "customers.view", group: "Sales", comp: Customers },
  { id: "abandoned", label: "Abandoned carts", perm: "customers.view", group: "Sales", comp: Abandoned, badge: "abandonedOpen" },
  { id: "products", label: "Products", perm: "products.view", group: "Catalog", comp: Products },
  { id: "categories", label: "Categories", perm: "products.view", group: "Catalog", comp: Categories },
  { id: "inventory", label: "Inventory", perm: "inventory.view", group: "Catalog", comp: Inventory, badge: "lowStock" },
  { id: "coupons", label: "Coupons", perm: "coupons.manage", group: "Marketing", comp: Coupons },
  { id: "banners", label: "Home banners", perm: "banners.manage", group: "Marketing", comp: Banners },
  { id: "reviews", label: "Reviews", perm: "reviews.moderate", group: "Marketing", comp: Reviews, badge: "pendingReviews" },
  { id: "messages", label: "Messages", perm: "messages.manage", group: "Marketing", comp: Messages, badge: "newMessages" },
  { id: "text", label: "Site text", perm: "content.edit", group: "Website", comp: SiteText },
  { id: "settings", label: "Settings", perm: "settings.edit", group: "Website", comp: Settings },
  { id: "reports", label: "Reports", perm: "reports.view", group: "Insights", comp: Reports },
  { id: "activity", label: "Activity log", perm: "activity.view", group: "Insights", comp: Activity },
  { id: "backups", label: "Backups", perm: "backups.view", group: "Insights", comp: Backups },
  { id: "team", label: "Team & access", perm: "team.manage", group: "Account", comp: Team },
  { id: "password", label: "My password", perm: null, group: "Account", comp: Password },
];

/* ---------- login ---------- */
function Login({ onDone, logo }) {
  const [username, setUsername] = useState("owner");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      const data = await apiPost({ action: "login", username: username.trim(), password });
      saveAdminSession({ token: data.token, expiresAt: data.expiresAt, user: data.user });
      onDone(data);
    } catch (problem) {
      setError(problem.message || "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ad-login">
      <div className="ad-login-card">
        {logo && <img src={logo} alt="" />}
        <p className="eyebrow">PearlSkino BD</p>
        <h1>Admin login</h1>

        <form onSubmit={submit}>
          <Field label="Username">
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              required
            />
          </Field>

          <Field label="Password">
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              autoFocus
              required
            />
          </Field>

          {error && <div className="ad-note bad" role="alert">{error}</div>}

          <button type="submit" className="ad-btn primary" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <a className="back" href="/">
          ← Back to store
        </a>
      </div>
    </div>
  );
}

function currentPage() {
  const id = window.location.hash.replace(/^#\/?/, "").split("?")[0];
  return PAGES.some((p) => p.id === id) ? id : "dashboard";
}

export default function Admin() {
  const { settings } = useStore();
  const logo = settings.logoDataUrl || settings.logoUrl || "/logo.png";

  const [session, setSession] = useState(() => (getAdminToken() ? { checking: true } : null));
  const [page, setPage] = useState(currentPage);
  const [arg, setArg] = useState(null);
  const [menu, setMenu] = useState(false);
  const [badges, setBadges] = useState({});
  const [warnings, setWarnings] = useState({});

  useEffect(() => {
    document.title = "Admin | PearlSkino BD";

    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex,nofollow";
    document.head.appendChild(robots);

    return () => robots.remove();
  }, []);

  /* check a saved login */
  useEffect(() => {
    if (!getAdminToken()) return undefined;

    let alive = true;

    adminCall("session")
      .then((data) => alive && setSession({ user: data.user, permissions: data.permissions || [] }))
      .catch(() => {
        if (!alive) return;
        clearAdminSession();
        setSession(null);
      });

    return () => {
      alive = false;
    };
  }, []);

  /* logged out from anywhere (expired, another device) */
  useEffect(() => {
    function lost() {
      setSession(null);
    }

    window.addEventListener("pearlskino-admin-auth-lost", lost);
    return () => window.removeEventListener("pearlskino-admin-auth-lost", lost);
  }, []);

  useEffect(() => {
    function onHash() {
      setPage(currentPage());
      setMenu(false);
    }

    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const permissions = useMemo(() => session?.permissions || [], [session]);
  const can = useCallback((perm) => !perm || permissions.includes("*") || permissions.includes(perm), [permissions]);

  const go = useCallback((id, extra) => {
    setArg(extra || null);
    setMenu(false);

    if (window.location.hash !== `#/${id}`) window.location.hash = `/${id}`;
    else setPage(id);

    window.scrollTo({ top: 0 });
  }, []);

  /* numbers shown next to menu items */
  const loadBadges = useCallback(async () => {
    if (!permissions.length) return;

    try {
      const d = await adminCall("dashboard");
      setBadges({
        newOrders: d.counts?.New || 0,
        openReturns: d.openReturns || 0,
        lowStock: (d.lowStock || []).length,
        pendingReviews: d.pendingReviews || 0,
        newMessages: d.newMessages || 0,
        abandonedOpen: d.abandonedOpen || 0,
        stockAlertsWaiting: d.stockAlertsWaiting || 0,
      });
      setWarnings(d.warnings || {});
    } catch {
      /* badges are optional */
    }
  }, [permissions]);

  useEffect(() => {
    if (!permissions.length || !can("orders.view")) return undefined;

    loadBadges();
    const timer = window.setInterval(loadBadges, 60000);
    return () => window.clearInterval(timer);
  }, [permissions, can, loadBadges, page]);

  async function logout() {
    try {
      await apiPost({ action: "logout", token: getAdminToken() });
    } catch {
      /* the local logout still happens */
    }

    clearAdminSession();
    setSession(null);
  }

  function openStorefrontEditor() {
    try {
      localStorage.setItem(EDIT_MODE_KEY, "1");
    } catch {
      /* the ?pk_edit=1 link below also turns it on */
    }

    window.location.href = "/?pk_edit=1";
  }

  const ctx = useMemo(
    () => ({
      user: session?.user || getStoredAdminUser(),
      can,
      go,
      arg,
      warnings,
      refreshBadges: loadBadges,
    }),
    [session, can, go, arg, warnings, loadBadges]
  );

  if (session?.checking) {
    return (
      <div className="ad-login">
        <Spinner label="Checking your login…" />
      </div>
    );
  }

  if (!session) {
    return (
      <>
        <Login
          logo={logo}
          onDone={(data) => {
            setSession({ user: data.user, permissions: data.permissions || [] });
            setWarnings(data.warnings || {});
            if (data.warnings?.defaultPassword) {
              toast("You are using the default password. Please change it now (My password).", "error");
            }
          }}
        />
        <Feedback />
      </>
    );
  }

  const allowed = PAGES.filter((p) => can(p.perm));
  const active = allowed.find((p) => p.id === page) || allowed[0];
  const Page = active?.comp;
  const groups = [...new Set(allowed.map((p) => p.group))];

  return (
    <AdminContext.Provider value={ctx}>
      <div className="ad">
        <div className="ad-topbar">
          <strong>{settings.storeName || "PearlSkino BD"}</strong>
          <button type="button" onClick={() => setMenu((v) => !v)}>
            {menu ? "Close" : "Menu"}
          </button>
        </div>

        <aside className={`ad-side${menu ? " open" : ""}`}>
          <div className="ad-brand">
            <img src={logo} alt="" />
            <div>
              <strong>{settings.storeName || "PearlSkino"}</strong>
              <small>Admin</small>
            </div>
          </div>

          <nav className="ad-nav" aria-label="Admin menu">
            {groups.map((group) => (
              <div key={group}>
                <div className="ad-nav-label">{group}</div>

                {allowed
                  .filter((p) => p.group === group)
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={active?.id === p.id ? "on" : ""}
                      onClick={() => go(p.id)}
                    >
                      <Icon name={p.id} />
                      {p.label}
                      {p.badge && badges[p.badge] > 0 && <em>{badges[p.badge]}</em>}
                    </button>
                  ))}
              </div>
            ))}

            {can("content.edit") && (
              <div>
                <div className="ad-nav-label">Visit</div>
                <button type="button" onClick={openStorefrontEditor}>
                  <Icon name="storefront" />
                  Edit storefront (view as visitor)
                </button>
                <button type="button" onClick={() => window.open("/", "_blank", "noopener")}>
                  <Icon name="storefront" />
                  Open store
                </button>
              </div>
            )}
          </nav>

          <div className="ad-side-foot">
            <div className="ad-me">
              <strong>{session.user?.name || session.user?.username}</strong>
              {session.user?.role}
            </div>
            <button type="button" className="ad-btn" onClick={logout}>
              Log out
            </button>
          </div>
        </aside>

        <main className="ad-main">
          {warnings.defaultPassword && (
            <div className="ad-note warn" style={{ marginBottom: 16 }}>
              <strong>Security:</strong> this account still uses the default password.{" "}
              <button type="button" className="ad-btn small" onClick={() => go("password")}>
                Change it now
              </button>
            </div>
          )}

          {Page ? <Page key={active.id} /> : <Spinner />}
        </main>
      </div>

      <Feedback />
    </AdminContext.Provider>
  );
}
