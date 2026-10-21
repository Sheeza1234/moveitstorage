const base = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" };

export const Shield = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2" {...base}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
);
export const ShieldCheck = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2" {...base}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg>
);
export const Clock = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2" {...base}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
);
export const Truck = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2" {...base}><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>
);
export const Phone = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2" {...base}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /></svg>
);
export const Thermometer = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2" {...base}><path d="M14 14.8V4a2 2 0 0 0-4 0v10.8a4 4 0 1 0 4 0z" /></svg>
);
export const Calendar = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2" {...base}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
);
export const Check = ({ size = 14, width = 3 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={width} {...base}><path d="m5 12 5 5 9-10" /></svg>
);
export const UnitBox = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" strokeWidth="2.5" aria-hidden="true" {...base}><path d="M5 19 24 7l19 12v22H5z" /><path d="M13 41V24h22v17M13 29h22M13 34h22" /></svg>
);
