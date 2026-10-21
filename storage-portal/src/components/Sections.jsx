import { UNITS, SERVICES, FAQ, aed, cubicMetres } from "../data.js";
import { Calendar, Clock, Phone, Shield, ShieldCheck, Thermometer, Truck } from "./Icons.jsx";

const SITE = "https://themoveit.com";
const ext = { target: "_blank", rel: "noreferrer" };

const Logos = () => (
  <>
    <img className="logo-light" src="/moveit-logo.png" alt="The Move It 24/7" />
    <img className="logo-dark" src="/moveit-logo-dark.png" alt="The Move It 24/7" />
  </>
);

export function Header() {
  return (
    <header className="topbar">
      <div className="wrap">
        <a className="brand" href={`${SITE}/`} {...ext}><Logos /></a>
        <nav className="nav" aria-label="Main">
          <a href="#top">Storage booking</a>
          <a href="#how">How it works</a>
          <a href="#sizes">Unit sizes</a>
          <a href={`${SITE}/services/`} {...ext}>Our services</a>
          <a href={`${SITE}/contact-us/`} {...ext}>Contact us</a>
        </nav>
        <div className="call">
          <span>Need help booking?<br />Call us</span>
          <div className="ico"><Phone /></div>
          <b>+971 50 825 1645</b>
        </div>
      </div>
    </header>
  );
}

export function Hero() {
  return (
    <section className="hero-band" id="top">
      <div className="wrap hero">
        <div className="hero-text">
          <div className="eyebrow">Self storage in Dubai</div>
          <h1>Safe, flexible storage, <span>booked in two minutes.</span></h1>
          <p className="lede">Choose a unit size, pick how long you need it and tell us when you are moving in. We confirm your unit by phone. No deposit and no payment today.</p>
          <div className="cta-row">
            <a className="btn primary" href="#step-size">Book a storage unit</a>
            <a className="btn ghost-dark" href="#how">How it works</a>
          </div>
          <ul className="stats">
            <li><b>4.9</b><span>star rated</span></li>
            <li><b>2019</b><span>moving Dubai since</span></li>
            <li><b>5</b><span>unit sizes</span></li>
          </ul>
        </div>
        <ul className="trust">
          <li><div className="ico"><Shield /></div><div><b>Secure and monitored</b><span>24-hour CCTV and gated access</span></div></li>
          <li><div className="ico"><Clock /></div><div><b>Open daily 7am to 10pm</b><span>Visit your unit when it suits you</span></div></li>
          <li><div className="ico"><Truck /></div><div><b>Movers on hand</b><span>Ask us to pack and move your items in</span></div></li>
        </ul>
      </div>
    </section>
  );
}

export function Why() {
  const cards = [
    [<ShieldCheck size={22} />, "Secure and monitored", "Gated access and 24-hour CCTV keep your belongings safe."],
    [<Calendar />, "Flexible terms", "Rent from 1 to 12 months, and save more the longer you stay."],
    [<Truck size={22} />, "Packing and moving", "Our crew can pack, load and deliver to your unit."],
    [<Thermometer size={22} />, "Climate controlled", "Add cooling for furniture, electronics and documents."],
  ];
  return (
    <section className="band alt" id="why">
      <div className="wrap">
        <div className="sec-head"><div className="eyebrow">Why The Move It</div><h2>Storage from a team that moves Dubai every day</h2><p>We are movers first, so getting your things in, out and across town is part of the service.</p></div>
        <div className="cards4">
          {cards.map(([icon, title, text]) => (
            <div className="card" key={title}><div className="ico">{icon}</div><h3>{title}</h3><p>{text}</p></div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function How() {
  const steps = [
    ["Book online", "Pick a size and period, then send your request. It takes about two minutes."],
    ["We call you", "Our team confirms your unit, the price and your move-in date by phone."],
    ["Move in", "Bring your items yourself, or ask our crew to pack and move them for you."],
    ["Pay and access", "Pay when you move in and get access whenever the facility is open."],
  ];
  return (
    <section className="band" id="how">
      <div className="wrap">
        <div className="sec-head"><div className="eyebrow">How it works</div><h2>From request to move-in in four steps</h2></div>
        <ol className="steps4">
          {steps.map(([title, text], i) => (
            <li key={title}><span className="num">{i + 1}</span><h3>{title}</h3><p>{text}</p></li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Sizes({ onPick }) {
  return (
    <section className="band alt" id="sizes">
      <div className="wrap">
        <div className="sec-head"><div className="eyebrow">Unit size guide</div><h2>Which size do you need?</h2><p>Sizes in square feet. Prices are monthly, before any period discount.</p></div>
        <div className="table-wrap">
          <table className="sizes">
            <thead><tr><th>Unit</th><th>Size</th><th>Space</th><th>Good for</th><th>From</th><th></th></tr></thead>
            <tbody>
              {UNITS.map((u) => (
                <tr key={u.id}>
                  <td><b>{u.name}</b></td>
                  <td>{u.size} sq ft</td>
                  <td>{cubicMetres(u.size).toFixed(1)} m&sup3;</td>
                  <td>{u.fits}</td>
                  <td className="price">{aed(u.price)} / mo</td>
                  <td>{u.left === 0 ? <span className="stock out">Fully booked</span> : <a className="btn primary" href="#step-size" onClick={() => onPick(u.id)}>Select</a>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export function Services() {
  return (
    <section className="band" id="services">
      <div className="wrap">
        <div className="sec-head"><div className="eyebrow">More from The Move It</div><h2>Everything around your move</h2><p>Moving, storage and home services across Dubai, all from one team.</p></div>
        <div className="svc">
          {SERVICES.map(([slug, title, text]) => (
            <a key={slug} href={`${SITE}/service/${slug}/`} {...ext}><b>{title}</b><span>{text}</span></a>
          ))}
        </div>
        <p className="all"><a href={`${SITE}/services/`} {...ext}>View all services on themoveit.com</a></p>
      </div>
    </section>
  );
}

export function Faq() {
  return (
    <section className="band alt" id="faq">
      <div className="wrap narrow">
        <div className="sec-head"><div className="eyebrow">Questions</div><h2>Good to know before you book</h2></div>
        {FAQ.map(([q, a]) => (
          <details key={q}><summary>{q}</summary><p>{a}</p></details>
        ))}
      </div>
    </section>
  );
}

export function CtaBand() {
  return (
    <section className="cta-band">
      <div className="wrap">
        <div><h2>Ready to store your things?</h2><p>Choose a unit and we will call you to confirm.</p></div>
        <div className="cta-row"><a className="btn dark" href="#step-size">Book a storage unit</a><a className="btn ghost-light" href={`${SITE}/get-a-quote/`} {...ext}>Get a moving quote</a></div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="sitefoot">
      <div className="wrap foot-grid">
        <div><Logos /><p>Movers, packers and storage in Dubai since 2019 for tenants, SMEs and corporates.</p></div>
        <div><h4>Company</h4><a href={`${SITE}/about-us/`} {...ext}>About us</a><a href={`${SITE}/services/`} {...ext}>Services</a><a href={`${SITE}/our-clients/`} {...ext}>Our clients</a><a href={`${SITE}/blog/`} {...ext}>Blog</a></div>
        <div><h4>Legal</h4><a href={`${SITE}/terms-conditions/`} {...ext}>Terms and conditions</a><a href={`${SITE}/privacy-policy/`} {...ext}>Privacy policy</a><a href={`${SITE}/contact-us/`} {...ext}>Contact us</a></div>
        <div><h4>Get in touch</h4><span>Storage bookings: +971 50 825 1645</span><span>Office: +971 4 238 7608</span><span>Toll free: 800 668 348</span><span>inquiry@themoveit.com</span></div>
      </div>
      <div className="wrap"><div className="copy">Prices shown are examples and are confirmed by our team when we call you.</div></div>
    </footer>
  );
}
