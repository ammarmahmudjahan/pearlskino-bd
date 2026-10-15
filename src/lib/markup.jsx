import { Fragment } from "react";

/*
|--------------------------------------------------------------------------
| Tiny text markup used by every editable text on the storefront
|--------------------------------------------------------------------------
|   *word*      -> <em>word</em>        (the soft italic accent used in headings)
|   **word**    -> <strong>word</strong>
|   new line    -> <br />
|   {brand}     -> a variable (store name, phone, ...)
|
| Nothing else is interpreted, and the result is always built from React
| elements, never from raw HTML, so an edited text can never inject markup.
*/

const TOKEN = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g;

export function fillVars(text, vars) {
  const source = String(text ?? "");

  if (!vars) return source;

  return source.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) &&
    vars[name] !== undefined &&
    vars[name] !== null
      ? String(vars[name])
      : match
  );
}

/* the same text without any markup - for placeholders, titles, aria labels */
export function plainText(text, vars) {
  return fillVars(text, vars)
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/\s*\n\s*/g, " ")
    .trim();
}

function renderLine(line, keyPrefix) {
  return line.split(TOKEN).map((part, index) => {
    if (!part) return null;

    const key = `${keyPrefix}-${index}`;

    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }

    return <Fragment key={key}>{part}</Fragment>;
  });
}

export function renderMarkup(text, vars) {
  const lines = fillVars(text, vars).split("\n");

  return lines.map((line, index) => (
    <Fragment key={`l${index}`}>
      {index > 0 && <br />}
      {renderLine(line, `l${index}`)}
    </Fragment>
  ));
}
