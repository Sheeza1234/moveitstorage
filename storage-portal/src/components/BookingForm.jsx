import { useState } from "react";
import { CLIMATE, INSURANCE, TERMS, UNITS, aed, calc, cubicMetres, plural } from "../data.js";
import { Check, Thermometer, ShieldCheck, UnitBox } from "./Icons.jsx";

const iso = (d) => d.toISOString().slice(0, 10);

function Stock({ unit }) {
  if (unit.left === 0) return <span className="stock out">Fully booked</span>;
  if (unit.left <= 2) return <span className="stock low">Only {unit.left} left</span>;
  return <span className="stock">{unit.left} available</span>;
}

function validate(f, minDate) {
  return {
    name: f.name.trim().length < 2 ? "Enter your full name." : "",
    phone: f.phone.replace(/\D/g, "").length < 9 ? "Enter a mobile number with at least 9 digits." : "",
    email: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim()) ? "" : "Enter a valid email address.",
    date: !f.date || f.date < minDate ? "Choose a move-in date from tomorrow." : "",
  };
}

/** The three booking steps, the price summary and the mobile bar. Calls onDone(recap) after a successful request. */
export default function BookingForm({ unitId, setUnitId, onDone }) {
  const unit = UNITS.find((u) => u.id === unitId);
  const [months, setMonths] = useState(3);
  const term = TERMS.find((t) => t.months === months);
  const [minDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 1); return iso(d); });
  const [f, setF] = useState(() => ({
    climate: false, insure: false, name: "", phone: "", email: "", notes: "", website: "",
    date: iso(new Date(new Date(minDate).getTime() + 6 * 864e5)),
  }));
  const [errs, setErrs] = useState({});
  const [sendError, setSendError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const c = calc(unit, term, f.climate, f.insure);
  const detailsFilled = ["name", "phone", "email"].every((k) => f[k].trim());

  async function submit(e) {
    e.preventDefault();
    const found = validate(f, minDate);
    setErrs(found);
    const first = Object.keys(found).find((k) => found[k]);
    if (first) {
      const el = document.getElementById(first === "date" ? "date" : first);
      el?.scrollIntoView({ block: "center" });
      el?.focus({ preventScroll: true });
      return;
    }
    setBusy(true);
    setSendError("");
    let ref;
    try {
      const api = import.meta.env.VITE_BOOKING_API;
      if (api) {
        const res = await fetch(`${api.replace(/\/$/, "")}/api/public/booking-requests`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            unitId: unit.id, months: term.months, climateControlled: c.climate, insurance: c.insure,
            moveInDate: f.date, name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim(),
            notes: f.notes.trim() || undefined, website: f.website,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.error || "Server error");
        ref = data.reference;
      } else {
        // no backend configured: the request is not sent anywhere
        ref = "SB-" + Math.floor(100000 + Math.random() * 900000);
      }
    } catch (err) {
      setSendError((err instanceof TypeError ? "We could not reach our booking system. " : err.message + " ") + "Please try again, or call +971 50 825 1645 to book by phone.");
      setBusy(false);
      document.getElementById("send-error")?.scrollIntoView({ block: "center" });
      return;
    }
    setBusy(false);
    const when = new Date(f.date + "T00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    onDone({
      firstName: f.name.trim().split(" ")[0], ref, phone: f.phone.trim(),
      rows: [
        ["Unit", `${unit.size} sq ft ${unit.name.toLowerCase()}`], ["Rental", plural(term.months)], ["Move-in", when],
        ["Extras", [c.climate && "Climate controlled", c.insure && "Insurance"].filter(Boolean).join(", ") || "None"],
        ["Monthly", aed(c.monthly)], ["Total", aed(c.total)],
      ],
    });
  }

  const submitLabel = busy ? "Sending..." : "Request booking";
  const progress = ["ok", "ok", detailsFilled ? "ok" : "on"];

  return (
    <div id="booking">
      <div className="progress" aria-hidden="true">
        {["Unit", "Period", "Details"].map((t, i) => <div key={t} className={progress[i]}>{t}</div>)}
      </div>

      <form className="grid" noValidate onSubmit={submit}>
        <div className="steps">
          <section className="step" id="step-size" aria-labelledby="h-size">
            <div className="step-h"><div className="n">1</div><div><h2 id="h-size">Choose your unit size</h2><small>Sizes in square feet. Not sure? Pick the closest match to your home.</small></div></div>
            <div className="units">
              {UNITS.map((u) => (
                <div className="opt" key={u.id}>
                  {u.popular && <span className="tag">Most popular</span>}
                  <input type="radio" name="unit" id={`u-${u.id}`} value={u.id} checked={u.id === unitId} disabled={u.left === 0} onChange={() => setUnitId(u.id)} />
                  <label htmlFor={`u-${u.id}`}>
                    <div className="cube"><UnitBox size={Math.round(30 + Math.sqrt(u.size / 200) * 22)} /></div>
                    <div className="u-size">{u.size} <small>sq ft</small></div>
                    <div className="u-fits">{u.fits}</div>
                    <div className="u-price">{aed(u.price)} <small>/ mo</small></div>
                    <Stock unit={u} />
                  </label>
                </div>
              ))}
            </div>
            <div className="helper"><b>{unit.size} sq ft {unit.name.toLowerCase()}:</b> {unit.fits.toLowerCase()}. About {Math.round(cubicMetres(unit.size))} cubic metres of space.</div>
          </section>

          <section className="step" id="step-term" aria-labelledby="h-term">
            <div className="step-h"><div className="n">2</div><div><h2 id="h-term">How long do you need it?</h2><small>Longer rentals cost less per month.</small></div></div>
            <div className="units terms">
              {TERMS.map((t) => (
                <div className="opt" key={t.months}>
                  <input type="radio" name="term" id={`t-${t.months}`} value={t.months} checked={t.months === months} onChange={() => setMonths(t.months)} />
                  <label htmlFor={`t-${t.months}`}><span className="n">{plural(t.months)}</span><span className={`d ${t.off ? "save" : ""}`}>{t.off ? `Save ${t.off}%` : "Flexible"}</span></label>
                </div>
              ))}
            </div>
            <div className="addons">
              <div className="opt addon"><input type="checkbox" id="climate" checked={f.climate} onChange={set("climate")} /><label htmlFor="climate"><div className="ico"><Thermometer /></div><div className="t"><b>Climate controlled</b><span>Protects furniture, electronics and documents from heat and humidity.</span></div><div className="p">+{CLIMATE * 100}% rent</div><div className="sw"></div></label></div>
              <div className="opt addon"><input type="checkbox" id="insure" checked={f.insure} onChange={set("insure")} /><label htmlFor="insure"><div className="ico"><ShieldCheck /></div><div className="t"><b>Contents insurance</b><span>Covers your belongings up to AED 20,000.</span></div><div className="p">AED {INSURANCE} / mo</div><div className="sw"></div></label></div>
            </div>
          </section>

          <section className="step" id="step-you" aria-labelledby="h-you">
            <div className="step-h"><div className="n">3</div><div><h2 id="h-you">Your details</h2><small>We use these only to confirm your booking.</small></div></div>
            <div className="fields">
              <div className="field"><label htmlFor="name">Full name</label><input id="name" autoComplete="name" placeholder="As on your Emirates ID" value={f.name} onChange={set("name")} aria-invalid={!!errs.name} /><div className="err">{errs.name}</div></div>
              <div className="field"><label htmlFor="phone">Mobile number</label><input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+971 5X XXX XXXX" value={f.phone} onChange={set("phone")} aria-invalid={!!errs.phone} /><div className="err">{errs.phone}</div></div>
              <div className="field"><label htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={f.email} onChange={set("email")} aria-invalid={!!errs.email} /><div className="err">{errs.email}</div></div>
              <div className="field"><label htmlFor="date">Move-in date</label><input id="date" type="date" min={minDate} value={f.date} onChange={set("date")} aria-invalid={!!errs.date} /><div className="err">{errs.date}</div></div>
              <div className="field full" style={{ position: "absolute", left: -9999, height: 0, overflow: "hidden" }} aria-hidden="true"><label htmlFor="website">Website</label><input id="website" tabIndex={-1} autoComplete="off" value={f.website} onChange={set("website")} /></div>
              <div className="field full"><label htmlFor="notes">Anything we should know? <span style={{ fontWeight: 400, color: "var(--muted)" }}>(optional)</span></label><textarea id="notes" placeholder="For example: large items, need help moving in, access times" value={f.notes} onChange={set("notes")} /></div>
            </div>
          </section>
          {sendError && <div className="send-error" id="send-error" role="alert">{sendError}</div>}
        </div>

        <aside className="summary" aria-live="polite">
          <div className="sum-top">
            <h2>Your booking</h2>
            <div className="row"><span>{unit.size} sq ft {unit.name.toLowerCase()}</span><span>{aed(c.base)}</span></div>
            {c.climate && <div className="row"><span>Climate controlled</span><span>+{aed(c.add)}</span></div>}
            {c.insure && <div className="row"><span>Insurance</span><span>+{aed(INSURANCE)}</span></div>}
            {c.disc > 0 && <div className="row save"><span>{plural(term.months)} discount ({term.off}%)</span><span>-{aed(c.disc)}</span></div>}
          </div>
          <div className="sum-total">
            <div className="big"><span>{aed(c.monthly)}</span> <small>/ month</small></div>
            <div className="sub">{aed(c.total)} in total for {plural(term.months)}</div>
          </div>
          <div className="sum-cta">
            <button className="btn primary" type="submit" disabled={busy}>{submitLabel}</button>
            <ul className="assure">
              {["No payment today", "No deposit required", "Cancel with 7 days notice"].map((t) => <li key={t}><Check />{t}</li>)}
            </ul>
          </div>
        </aside>

        <div className="bar"><div><b>{aed(c.monthly)} / mo</b><span>{unit.size} sq ft, {plural(term.months)}</span></div><button className="btn primary" type="submit" disabled={busy}>{submitLabel}</button></div>
      </form>
    </div>
  );
}
