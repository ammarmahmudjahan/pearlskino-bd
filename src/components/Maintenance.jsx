import { useStore } from "../context/StoreContext";
import T from "../content/T";

/* shown to visitors while Admin > Settings > "Maintenance mode" is on */
export default function Maintenance() {
  const { storeSettings } = useStore();
  const message = storeSettings?.maintenanceMessage;
  const logoUrl = storeSettings?.logoDataUrl || storeSettings?.logoUrl || "/logo.png";

  return (
    <main className="maintenance-page page">
      <section className="notfound-card">
        <span className="notfound-orb" aria-hidden="true"></span>

        {logoUrl && <img className="maintenance-logo" src={logoUrl} alt={storeSettings?.storeName || ""} />}

        <T k="maint.title" as="h1" />

        {message ? <p>{message}</p> : <T k="maint.note" as="p" />}
      </section>
    </main>
  );
}
