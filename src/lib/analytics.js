/*
|--------------------------------------------------------------------------
| Facebook Pixel + Google Analytics (optional)
|--------------------------------------------------------------------------
| Nothing is loaded until an ID is saved in Admin > Settings > SEO & tracking.
| Customers' names, phone numbers and addresses are never sent to either
| service - only product ids, names, values and page views.
*/

let loadedPixel = "";
let loadedGa = "";

function loadScript(src) {
  const script = document.createElement("script");
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

export function initAnalytics({ fbPixelId, gaMeasurementId } = {}) {
  const pixel = String(fbPixelId || "").replace(/[^0-9]/g, "");
  const ga = String(gaMeasurementId || "").trim();

  try {
    if (pixel && pixel !== loadedPixel && !window.fbq) {
      /* official Meta Pixel bootstrap, trimmed */
      const fbq = function (...args) {
        if (fbq.callMethod) fbq.callMethod(...args);
        else fbq.queue.push(args);
      };
      fbq.push = fbq;
      fbq.loaded = true;
      fbq.version = "2.0";
      fbq.queue = [];
      window.fbq = fbq;
      window._fbq = fbq;
      loadScript("https://connect.facebook.net/en_US/fbevents.js");
      window.fbq("init", pixel);
      loadedPixel = pixel;
    }

    if (/^(G|UA|AW)-[A-Z0-9-]+$/i.test(ga) && ga !== loadedGa) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () {
        window.dataLayer.push(arguments);
      };
      window.gtag("js", new Date());
      window.gtag("config", ga, { send_page_view: false });
      loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga)}`);
      loadedGa = ga;
    }
  } catch {
    /* tracking must never break the shop */
  }
}

export function trackPageView(path) {
  try {
    if (window.fbq && loadedPixel) window.fbq("track", "PageView");
    if (window.gtag && loadedGa) {
      window.gtag("event", "page_view", {
        page_path: path,
        page_location: window.location.href,
        page_title: document.title,
      });
    }
  } catch {
    /* ignore */
  }
}

/* event: "view_item" | "add_to_cart" | "add_to_wishlist" | "search" |
   "begin_checkout" | "purchase" | "sign_up" */
export function trackEvent(event, data = {}) {
  try {
    const value = Number(data.value || 0);
    const items = (data.items || []).map((item) => ({
      item_id: String(item.id),
      item_name: item.name,
      price: Number(item.price || 0),
      quantity: Number(item.qty || 1),
    }));

    if (window.gtag && loadedGa) {
      const payload = { currency: "BDT", value, items, transaction_id: data.orderId };
      if (data.query) payload.search_term = String(data.query).slice(0, 80);
      window.gtag("event", event, payload);
    }

    if (window.fbq && loadedPixel) {
      const map = {
        view_item: "ViewContent",
        add_to_cart: "AddToCart",
        add_to_wishlist: "AddToWishlist",
        search: "Search",
        begin_checkout: "InitiateCheckout",
        purchase: "Purchase",
        sign_up: "CompleteRegistration",
      };
      const name = map[event];

      if (name) {
        window.fbq("track", name, {
          currency: "BDT",
          value,
          content_ids: items.map((item) => item.item_id),
          content_type: "product",
          num_items: items.reduce((sum, item) => sum + item.quantity, 0),
          ...(data.query ? { search_string: String(data.query).slice(0, 80) } : {}),
        });
      }
    }
  } catch {
    /* ignore */
  }
}
