import { useStore } from "../context/StoreContext";
import { freeDeliveryThreshold } from "../lib/delivery";
import { money } from "../lib/format";
import T from "../content/T";
import { TruckIcon } from "./Icons";

/*
 * "Add ৳300 more for FREE delivery" with a filling bar.
 * Shown only when a free-delivery amount is set in Admin > Settings.
 */
export default function FreeShipBar({ subtotal, className = "" }) {
  const { settings } = useStore();
  const threshold = freeDeliveryThreshold(settings, "", "");

  if (settings.freeShipBar === false || !threshold || subtotal <= 0) return null;

  const gap = Math.max(0, threshold - subtotal);
  const percent = Math.min(100, Math.round((subtotal / threshold) * 100));

  return (
    <div className={`ship-bar${gap === 0 ? " done" : ""} ${className}`.trim()} role="status">
      <p>
        <TruckIcon size={17} />
        {gap > 0 ? (
          <T k="cart.ship.progress" vars={{ amount: money(gap) }} />
        ) : (
          <T k="cart.ship.done" />
        )}
      </p>

      <span className="ship-bar-track" aria-hidden="true">
        <span style={{ width: `${percent}%` }} />
      </span>
    </div>
  );
}
