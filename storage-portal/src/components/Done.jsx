import { Check } from "./Icons.jsx";

export default function Done({ result, onAgain }) {
  return (
    <div className="done">
      <div className="check-ico"><Check size={28} /></div>
      <h2>Thanks {result.firstName}, your request is in</h2>
      <p style={{ color: "var(--muted)", margin: "6px 0 0" }}>Your booking reference</p>
      <div className="ref">{result.ref}</div>
      <div className="recap">
        {result.rows.map(([k, v]) => <div className="row" key={k}><span>{k}</span><span>{v}</span></div>)}
      </div>
      <ol className="next">
        <li>We call you on <b>{result.phone}</b> to confirm your unit.</li>
        <li>You get your unit number and access details.</li>
        <li>Pay and move in on your chosen date.</li>
      </ol>
      <button type="button" className="btn ghost" onClick={onAgain}>Make another booking</button>
    </div>
  );
}
