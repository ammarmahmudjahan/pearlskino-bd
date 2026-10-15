/*
|--------------------------------------------------------------------------
| Delivery charge rules - the same rules the server uses
|--------------------------------------------------------------------------
| The server always recalculates the real charge when an order is placed.
| This copy only exists so the bag and checkout can show the right number
| before the customer presses "Place order".
*/

export function listZones(settings) {
  return Array.isArray(settings?.deliveryZones) ? settings.deliveryZones : [];
}

function canon(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function pickZone(settings, zoneId, area) {
  const zones = listZones(settings);

  if (!zones.length) return null;

  if (zoneId) {
    const exact = zones.find((zone) => zone.id === zoneId);
    if (exact) return exact;
  }

  const wanted = canon(area);

  if (wanted) {
    const hit = zones.find((zone) =>
      (zone.areas || []).some((word) => wanted.includes(canon(word)))
    );

    if (hit) return hit;
  }

  return zones[0];
}

export function deliveryFor(settings, subtotal, method, zoneId, area) {
  if (method === "Pickup") {
    return { charge: 0, zone: null, free: false };
  }

  const zone = pickZone(settings, zoneId, area);
  const base = zone ? Number(zone.charge || 0) : Number(settings?.deliveryCharge || 0);
  const threshold =
    zone && Number(zone.freeThreshold) > 0
      ? Number(zone.freeThreshold)
      : Number(settings?.freeDeliveryThreshold || 0);

  if (threshold > 0 && subtotal >= threshold) {
    return { charge: 0, zone, free: true };
  }

  return { charge: base, zone, free: false };
}

/* what to show before the customer has picked an area */
export function deliveryRange(settings, subtotal) {
  const zones = listZones(settings);

  if (!subtotal) return { min: 0, max: 0, exact: true, free: false };

  if (!zones.length) {
    const one = deliveryFor(settings, subtotal, "Home Delivery", "", "");
    return { min: one.charge, max: one.charge, exact: true, free: one.free };
  }

  const charges = zones.map(
    (zone) => deliveryFor(settings, subtotal, "Home Delivery", zone.id, "").charge
  );
  const min = Math.min(...charges);
  const max = Math.max(...charges);

  return { min, max, exact: min === max, free: max === 0 };
}

/* how much more to spend for free delivery (0 when not applicable) */
export function freeDeliveryGap(settings, subtotal, zoneId, area) {
  const zone = pickZone(settings, zoneId, area);
  const threshold =
    zone && Number(zone.freeThreshold) > 0
      ? Number(zone.freeThreshold)
      : Number(settings?.freeDeliveryThreshold || 0);

  if (!threshold || subtotal >= threshold) return 0;

  return threshold - subtotal;
}

/* the spend that unlocks free delivery (0 when there is none) */
export function freeDeliveryThreshold(settings, zoneId, area) {
  const zone = pickZone(settings, zoneId, area);

  return zone && Number(zone.freeThreshold) > 0
    ? Number(zone.freeThreshold)
    : Number(settings?.freeDeliveryThreshold || 0);
}
