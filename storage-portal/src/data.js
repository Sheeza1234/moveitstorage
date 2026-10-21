// Sample data. Replace with the facility's real rate card and live availability.
export const UNITS = [
  { id: "locker", size: 10, name: "Locker", fits: "Boxes and a few suitcases", price: 250, left: 8 },
  { id: "small", size: 25, name: "Small", fits: "Studio apartment contents", price: 550, left: 5 },
  { id: "medium", size: 50, name: "Medium", fits: "1 bedroom apartment", price: 950, left: 2, popular: true },
  { id: "large", size: 100, name: "Large", fits: "2 to 3 bedroom home", price: 1700, left: 4 },
  { id: "xl", size: 200, name: "Extra large", fits: "Villa or small office", price: 3100, left: 0 },
];
export const TERMS = [{ months: 1, off: 0 }, { months: 3, off: 5 }, { months: 6, off: 10 }, { months: 12, off: 15 }];
export const CLIMATE = 0.15;
export const INSURANCE = 30;

export const aed = (n) => "AED " + Math.round(n).toLocaleString("en-US");
export const plural = (m) => `${m} ${m === 1 ? "month" : "months"}`;
export const cubicMetres = (size) => size * 0.0929 * 2.4;

export function calc(unit, term, climate, insure) {
  const base = unit.price;
  const add = climate ? base * CLIMATE : 0;
  const full = base + add;
  const disc = (full * term.off) / 100;
  const monthly = full - disc + (insure ? INSURANCE : 0);
  return { base, add, disc, monthly, total: monthly * term.months, climate, insure };
}

export const SERVICES = [
  ["home-movers-in-dubai", "Home movers", "Studio, apartment and villa moves"],
  ["office-movers-in-dubai", "Office movers", "Offices and commercial spaces"],
  ["international-movers-in-dubai", "International moves", "Relocate overseas with sea or air cargo"],
  ["storage-services-dubai", "Storage services", "Covered, cold and warehouse storage"],
  ["furniture-storage-in-dubai", "Furniture storage", "Safe space for sofas, beds and more"],
  ["commercial-storage-in-dubai", "Commercial storage", "Stock, files and equipment"],
  ["deep-cleaning-services", "Deep cleaning", "Move-out and move-in cleaning"],
  ["manpower-services", "Manpower", "Loaders and helpers by the hour"],
];

export const FAQ = [
  ["What happens after I request a booking?", "We call you to confirm the unit, the move-in date and how to pay. Your unit is held for you once we confirm."],
  ["What can I store?", "Furniture, boxes, appliances, seasonal items and business stock. We cannot accept food, flammable or hazardous goods, or anything illegal."],
  ["How do I choose the right size?", "A 25 sq ft unit holds a studio's contents, 50 sq ft fits a one bedroom apartment and 100 sq ft fits a two to three bedroom home. Call us if you are between sizes."],
  ["Can your team move my things in?", "Yes. Tell us in the notes when you book, and our movers will quote for packing, loading and delivery to your unit."],
  ["Can I cancel or extend?", "Yes. Give us 7 days notice to end your rental, or tell us before it ends to extend at the same monthly rate."],
  ["Do I need to pay now?", "No. Booking online is a request. You pay after we confirm your unit, on or before move-in day."],
];
