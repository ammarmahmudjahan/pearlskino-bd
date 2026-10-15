import { useContent } from "./context";
import { TEXTS } from "./registry";
import { renderMarkup, plainText } from "../lib/markup";

/*
|--------------------------------------------------------------------------
| <T k="home.hero.title" as="h1" className="..." />
|--------------------------------------------------------------------------
| Shows an editable text. Visitors just see the text. When the owner opens
| the storefront from Admin > "Edit storefront", the same element gets a
| soft outline and clicking it opens the editor.
*/

function mergeVars(base, extra) {
  return extra ? { ...base, ...extra } : base;
}

export default function T({ k, as: Tag = "span", className, vars, children, ...rest }) {
  const content = useContent();
  const def = TEXTS[k];

  if (!def && import.meta.env.DEV) {
    console.warn(`[T] "${k}" is not in src/content/texts yet.`);
  }

  const raw = content.getRaw(k);
  const text = typeof raw === "string" ? raw : "";
  const shown = text || (typeof children === "string" ? children : "");
  const body = renderMarkup(shown, mergeVars(content.baseVars, vars));

  const clickable = content.isEditing && def && def.inline !== false;

  if (!clickable) {
    return (
      <Tag className={className || undefined} {...rest}>
        {body}
      </Tag>
    );
  }

  const classes = [className, "pk-editable", content.isDirty(k) ? "pk-dirty" : ""]
    .filter(Boolean)
    .join(" ");

  function handleClick(event) {
    event.preventDefault();
    event.stopPropagation();
    content.openEditor(k, event.currentTarget);
  }

  return (
    <Tag
      className={classes}
      data-pk-key={k}
      title="Click to edit this text"
      onClick={handleClick}
      {...rest}
    >
      {body}
    </Tag>
  );
}

/* a text for attributes: placeholder, aria-label, alt ... (no markup) */
export function useText(k, vars) {
  const content = useContent();
  const raw = content.getRaw(k);

  return plainText(typeof raw === "string" ? raw : "", mergeVars(content.baseVars, vars));
}

/* a repeating list (announcement strip, FAQ questions ...) */
export function useList(k) {
  return useContent().getList(k);
}

/*
 * Put this next to a repeating list. It only shows up in edit mode and opens
 * the list editor. The surrounding element should be position: relative
 * (add the class "pk-list-host").
 */
export function ListEditTrigger({ k, label }) {
  const content = useContent();
  const def = TEXTS[k];

  if (!content.isEditing || !def) return null;

  return (
    <button
      type="button"
      className={`pk-list-trigger${content.isDirty(k) ? " pk-dirty" : ""}`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        content.openListEditor(k);
      }}
    >
      <span aria-hidden="true">✎</span> {label || `Edit ${def.label.toLowerCase()}`}
    </button>
  );
}
