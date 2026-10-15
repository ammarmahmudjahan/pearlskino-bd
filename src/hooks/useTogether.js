import { useEffect, useState } from "react";

import { apiGet } from "../lib/api";

/*
 * "Customers also bought": product id -> [product ids] worked out on the
 * server from real orders. Fetched once and remembered for 15 minutes.
 */
const KEY = "pearlskino-together";
const MAX_AGE = 15 * 60 * 1000;

let memory = null;
let pending = null;

function readCached() {
  if (memory && Date.now() - memory.at < MAX_AGE) return memory.map;

  try {
    const stored = JSON.parse(sessionStorage.getItem(KEY) || "null");

    if (stored && Date.now() - stored.at < MAX_AGE) {
      memory = stored;
      return stored.map;
    }
  } catch {
    /* ignore */
  }

  return null;
}

function load() {
  const cached = readCached();
  if (cached) return Promise.resolve(cached);
  if (pending) return pending;

  pending = apiGet({ action: "together" })
    .then((data) => {
      const map = data && typeof data.map === "object" && data.map ? data.map : {};
      memory = { at: Date.now(), map };

      try {
        sessionStorage.setItem(KEY, JSON.stringify(memory));
      } catch {
        /* ignore */
      }

      return map;
    })
    .catch(() => ({}))
    .finally(() => {
      pending = null;
    });

  return pending;
}

export function useTogether(enabled = true) {
  const [map, setMap] = useState(() => (enabled ? readCached() || {} : {}));

  useEffect(() => {
    let cancelled = false;

    if (!enabled) return undefined;

    load().then((result) => {
      if (!cancelled) setMap(result);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return map;
}
