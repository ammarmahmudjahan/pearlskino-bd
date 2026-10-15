import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useCustomer } from "../context/CustomerContext";
import T from "../content/T";
import { HeartIcon, CloseIcon } from "./Icons";

/*
 * Shown when someone who is not logged in taps a heart.
 * Favourites live in the customer's account, so we ask them to log in;
 * the product they tapped is added automatically once they are in.
 */
export default function FavouritePrompt() {
  const { prompt, closePrompt, rememberPending } = useCustomer();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (!prompt) return undefined;

    function onKey(event) {
      if (event.key === "Escape") closePrompt();
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [prompt, closePrompt]);

  /* leaving the page closes it */
  useEffect(() => {
    closePrompt();
  }, [pathname, closePrompt]);

  if (!prompt) return null;

  function goLogin() {
    rememberPending(prompt.id);
    closePrompt();
    navigate(`/account?next=${encodeURIComponent(pathname + search)}`);
  }

  return (
    <div className="fav-prompt-backdrop" role="presentation" onClick={closePrompt}>
      <div
        className="fav-prompt"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fav-prompt-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="fav-prompt-close" onClick={closePrompt} aria-label="Close">
          <CloseIcon size={18} />
        </button>

        <span className="fav-prompt-icon">
          <HeartIcon size={26} filled />
        </span>

        <T k="fav.prompt.title" as="h2" id="fav-prompt-title" />
        <T k="fav.prompt.text" as="p" />

        <div className="fav-prompt-actions">
          <button type="button" className="fav-prompt-login" onClick={goLogin}>
            <T k="fav.prompt.login" />
          </button>

          <button type="button" className="fav-prompt-later" onClick={closePrompt}>
            <T k="fav.prompt.later" />
          </button>
        </div>
      </div>
    </div>
  );
}
