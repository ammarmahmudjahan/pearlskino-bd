import { apiPost, ApiError } from "./api";
import { isBdMobile, normalizePhone } from "./format";
import { GOOGLE_FORMS } from "../config/googleForms";
import { submitToGoogleForm } from "../utils/submitToGoogleForm";

/*
 * One place that sends a "contact us" message (Contact page and FAQ page).
 *
 *   await sendContact({ name, phone, email, message, hp })
 *
 * Normal path : the shop server saves it in Admin > Messages and sends the
 *               owner an alert (email / WhatsApp / Telegram).
 * If the shop server cannot be reached (network, timeout) the message is
 * sent to the old Google Form instead, so a customer's message is never lost.
 * Returns nothing on success, throws an Error with a readable message.
 */
export async function sendContact({ name, phone, email, message, hp = "" }) {
  const cleanName = String(name || "").trim();
  const cleanPhone = normalizePhone(phone || "");
  const cleanEmail = String(email || "").trim();
  const cleanMessage = String(message || "").trim();

  if (cleanName.length < 2) throw new Error("Please enter your name.");

  if (!isBdMobile(cleanPhone) && !cleanEmail) {
    throw new Error("Please give a mobile number or an email so we can reply.");
  }

  if (cleanMessage.length < 5) throw new Error("Please write your message.");

  try {
    await apiPost({
      action: "contact",
      name: cleanName,
      phone: isBdMobile(cleanPhone) ? cleanPhone : "",
      email: cleanEmail,
      message: cleanMessage,
      hp,
    });
  } catch (problem) {
    const down =
      problem instanceof ApiError &&
      ["network", "timeout", "http", "parse", "server"].includes(problem.code);

    if (!down) throw problem;

    const fallback = await submitToGoogleForm(GOOGLE_FORMS.contact.url, {
      [GOOGLE_FORMS.contact.fields.name]: cleanName,
      [GOOGLE_FORMS.contact.fields.phone]: cleanPhone || cleanEmail,
      [GOOGLE_FORMS.contact.fields.message]: cleanMessage,
    });

    if (!fallback.success) {
      throw new Error("We could not send your message. Please try again.");
    }
  }
}
