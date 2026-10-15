import { useContent } from "../content/context";

/*
 * Only visible to the owner in storefront edit mode.
 * Some pages show different things in different situations (empty bag /
 * filled bag / thank-you page). This lets the owner flip between them to
 * reach every text.
 */
export default function EditViewSwitch({ views, value, onChange }) {
  const content = useContent();

  if (!content.isEditing) return null;

  return (
    <div className="pk-viewswitch" role="tablist" aria-label="Which version of this page to edit">
      <span>Showing:</span>
      {views.map(([id, label]) => (
        <button
          type="button"
          role="tab"
          key={id}
          aria-selected={value === id}
          className={value === id ? "on" : ""}
          onClick={() => onChange(id)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
