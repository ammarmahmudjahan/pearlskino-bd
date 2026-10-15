import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ContentContext } from "./context";
import { TEXTS, parseList, serializeList } from "./registry";
import { TextEditor, ListEditor } from "./EditUI";
import { useStore } from "../context/StoreContext";
import { adminCall, getAdminToken } from "../lib/adminApi";
import { EDIT_MODE_KEY } from "../config/api";
import { money } from "../lib/format";

const PREVIEW_KEY = "pearlskino_edit_preview";

function readFlag(key) {
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeFlag(key, on) {
  try {
    if (on) sessionStorage.setItem(key, "1");
    else sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/* /?pk_edit=1 switches the edit mode on, /?pk_edit=0 switches it off */
function consumeEditParam() {
  try {
    const url = new URL(window.location.href);
    const param = url.searchParams.get("pk_edit");

    if (param === null) return;

    writeFlag(EDIT_MODE_KEY, param === "1");
    url.searchParams.delete("pk_edit");
    window.history.replaceState(
      window.history.state,
      "",
      url.pathname + (url.search || "") + url.hash
    );
  } catch {
    /* ignore */
  }
}

export default function ContentProvider({ children }) {
  const { settings, content: published, refresh } = useStore();

  const [wanted, setWanted] = useState(() => {
    consumeEditParam();
    return readFlag(EDIT_MODE_KEY) && Boolean(getAdminToken());
  });
  const [status, setStatus] = useState(wanted ? "checking" : "off");
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState(() => readFlag(PREVIEW_KEY));
  const [drafts, setDrafts] = useState({});
  const [saveState, setSaveState] = useState("idle");
  const [saveError, setSaveError] = useState("");
  const [editing, setEditing] = useState(null);
  const [listEditing, setListEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const pending = useRef({});
  const timer = useRef(null);
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;

  const live = status === "on";

  /* ---------------------------------------------------------
     entering edit mode: check the login, load saved drafts
  --------------------------------------------------------- */
  useEffect(() => {
    if (!wanted) return undefined;

    let cancelled = false;

    (async () => {
      try {
        const session = await adminCall("session");
        const allowed =
          session.permissions?.includes("*") || session.permissions?.includes("content.edit");

        if (!allowed) throw new Error("Your role cannot edit the storefront text.");

        const data = await adminCall("content");
        if (cancelled) return;

        const loaded = {};
        (data.items || []).forEach((item) => {
          if (item.reset) loaded[item.key] = null;
          else if (item.draft !== null && item.draft !== undefined) loaded[item.key] = item.draft;
        });

        setDrafts(loaded);
        setStatus("on");
      } catch (error) {
        if (cancelled) return;
        writeFlag(EDIT_MODE_KEY, false);
        setWanted(false);
        setStatus("off");
        setNotice(
          error?.code === "auth" || !getAdminToken()
            ? "Please log in to the admin panel first, then open the storefront editor."
            : error?.message || "Could not start the storefront editor."
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [wanted]);

  useEffect(() => {
    function onLost() {
      writeFlag(EDIT_MODE_KEY, false);
      setWanted(false);
      setStatus("off");
      setEditing(null);
      setListEditing(null);
    }

    window.addEventListener("pearlskino-admin-auth-lost", onLost);
    return () => window.removeEventListener("pearlskino-admin-auth-lost", onLost);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("pk-edit-on", live && !preview);
    root.classList.toggle("pk-edit-bar", live);
    return () => {
      root.classList.remove("pk-edit-on", "pk-edit-bar");
    };
  }, [live, preview]);

  /* ---------------------------------------------------------
     reading texts
  --------------------------------------------------------- */
  const baseRaw = useCallback(
    (key) => {
      const def = TEXTS[key];
      if (!def) return "";

      const value = published?.[key];
      return value !== undefined && value !== "" ? value : def.default;
    },
    [published]
  );

  const getRaw = useCallback(
    (key) => {
      const def = TEXTS[key];
      if (!def) return "";

      if (live && Object.prototype.hasOwnProperty.call(drafts, key)) {
        const draft = drafts[key];
        return draft === null ? def.default : draft;
      }

      return baseRaw(key);
    },
    [live, drafts, baseRaw]
  );

  const getList = useCallback(
    (key) => {
      const def = TEXTS[key];
      if (!def) return [];

      return parseList(def, getRaw(key));
    },
    [getRaw]
  );

  const baseVars = useMemo(
    () => ({
      brand: settings.storeName || "PearlSkino BD",
      BRAND: (settings.storeName || "PearlSkino BD").toUpperCase(),
      tagline: settings.tagline || "",
      phone: settings.phone || "",
      email: settings.email || "",
      whatsapp: settings.whatsappNumber || "",
      address: settings.storeAddress || "",
      year: new Date().getFullYear(),
      freeShip: Number(settings.freeDeliveryThreshold) > 0 ? money(settings.freeDeliveryThreshold) : "",
    }),
    [settings]
  );

  const isDirty = useCallback(
    (key) => live && Object.prototype.hasOwnProperty.call(drafts, key),
    [live, drafts]
  );

  const draftCount = useMemo(() => Object.keys(drafts).length, [drafts]);

  /* ---------------------------------------------------------
     saving drafts (auto, a moment after typing stops)
  --------------------------------------------------------- */
  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);

    const changes = pending.current;
    pending.current = {};

    if (!Object.keys(changes).length) return true;

    setSaveState("saving");

    try {
      await adminCall("contentDraft", { changes });
      setSaveState(Object.keys(pending.current).length ? "dirty" : "saved");
      setSaveError("");
      return true;
    } catch (error) {
      /* keep what we could not save, unless something newer was typed */
      Object.entries(changes).forEach(([key, value]) => {
        if (!(key in pending.current)) pending.current[key] = value;
      });
      setSaveState("error");
      setSaveError(error?.message || "Could not save.");
      return false;
    }
  }, []);

  const queueSave = useCallback(
    (key, value) => {
      pending.current[key] = value;
      setSaveState("dirty");
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, 900);
    },
    [flush]
  );

  useEffect(() => () => window.clearTimeout(timer.current), []);

  /* what the live site shows for a key, as text (lists as JSON) */
  const baseInfo = useCallback(
    (key) => {
      const def = TEXTS[key];
      const base = baseRaw(key);
      const isDefault = typeof base !== "string" || base === def.default;
      const text = typeof base === "string" ? base : def.kind === "list" ? serializeList(def, base) : "";

      return { text, isDefault };
    },
    [baseRaw]
  );

  /* a normal text: line or paragraph */
  const setRaw = useCallback(
    (key, value) => {
      const def = TEXTS[key];
      if (!def || !live) return;

      const text = String(value ?? "").slice(0, 20000);
      const base = baseInfo(key);

      setDrafts((current) => {
        const next = { ...current };

        if (text === base.text) delete next[key];
        else next[key] = text;

        return next;
      });

      if (!text.trim()) return; /* empty texts are not saved */

      queueSave(key, text === base.text && base.isDefault ? null : text);
    },
    [live, baseInfo, queueSave]
  );

  const setText = setRaw;

  const setList = useCallback(
    (key, items) => {
      const def = TEXTS[key];
      if (!def || !live) return;

      setRaw(key, serializeList(def, items));
    },
    [live, setRaw]
  );

  /* "use the original text" */
  const resetText = useCallback(
    (key) => {
      if (!live) return;

      setDrafts((current) => ({ ...current, [key]: null }));
      queueSave(key, null);
    },
    [live, queueSave]
  );

  /* the editor was closed with a blank text: go back to what was there */
  const settleText = useCallback(
    (key) => {
      const draft = draftsRef.current[key];

      if (typeof draft === "string" && !draft.trim()) {
        const base = baseInfo(key);

        setDrafts((current) => {
          const next = { ...current };
          delete next[key];
          return next;
        });

        queueSave(key, base.isDefault ? null : base.text);
      }
    },
    [baseInfo, queueSave]
  );

  /* ---------------------------------------------------------
     publish / discard / leave
  --------------------------------------------------------- */
  const publish = useCallback(async () => {
    setBusy(true);

    try {
      const saved = await flush();
      if (!saved) throw new Error("Some changes could not be saved yet. Try again.");

      const result = await adminCall("contentPublish");
      setDrafts({});
      setSaveState("idle");
      await refresh(true);
      return result.published || 0;
    } finally {
      setBusy(false);
    }
  }, [flush, refresh]);

  const discard = useCallback(async () => {
    setBusy(true);

    try {
      pending.current = {};
      window.clearTimeout(timer.current);
      await adminCall("contentDiscard");
      setDrafts({});
      setSaveState("idle");
      setEditing(null);
      setListEditing(null);
    } finally {
      setBusy(false);
    }
  }, []);

  const exitEdit = useCallback(async () => {
    await flush();
    writeFlag(EDIT_MODE_KEY, false);
    writeFlag(PREVIEW_KEY, false);
    setPreview(false);
    setEditing(null);
    setListEditing(null);
    setWanted(false);
    setStatus("off");
  }, [flush]);

  const togglePreview = useCallback(() => {
    setPreview((current) => {
      writeFlag(PREVIEW_KEY, !current);
      return !current;
    });
    setEditing(null);
    setListEditing(null);
  }, []);

  const openEditor = useCallback(
    (key, element) => {
      if (!live || preview) return;

      setListEditing(null);
      setEditing({ key, element });
    },
    [live, preview]
  );

  const openListEditor = useCallback(
    (key) => {
      if (!live || preview) return;

      setEditing(null);
      setListEditing(key);
    },
    [live, preview]
  );

  const value = useMemo(
    () => ({
      status,
      editMode: live,
      preview,
      isEditing: live && !preview,
      notice,
      clearNotice: () => setNotice(""),
      baseVars,
      getRaw,
      getList,
      isDirty,
      draftCount,
      saveState,
      saveError,
      busy,
      setText,
      setList,
      resetText,
      settleText,
      publish,
      discard,
      exitEdit,
      togglePreview,
      openEditor,
      openListEditor,
      retrySave: flush,
    }),
    [
      status,
      live,
      preview,
      notice,
      baseVars,
      getRaw,
      getList,
      isDirty,
      draftCount,
      saveState,
      saveError,
      busy,
      setText,
      setList,
      resetText,
      settleText,
      publish,
      discard,
      exitEdit,
      togglePreview,
      openEditor,
      openListEditor,
      flush,
    ]
  );

  return (
    <ContentContext.Provider value={value}>
      {children}

      {live && !preview && editing && (
        <TextEditor
          key={editing.key}
          textKey={editing.key}
          element={editing.element}
          onClose={() => setEditing(null)}
        />
      )}

      {live && !preview && listEditing && (
        <ListEditor textKey={listEditing} onClose={() => setListEditing(null)} />
      )}
    </ContentContext.Provider>
  );
}
