"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/use-auth-store";
import { MoveitLogo } from "@/components/brand/moveit-logo";

function MailIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-[1.15rem]">
      <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="m4 7 8 5.5L20 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-[1.15rem]">
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5">
      <path d="M12 3 5 5.5v5c0 4.4 3 7.7 7 9.5 4-1.8 7-5.1 7-9.5v-5L12 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-[1.15rem]">
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
      {off ? <path d="m4 4 16 16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /> : null}
    </svg>
  );
}

const HIGHLIGHTS: Array<[string, string]> = [
  ["See every warehouse in 3D", "Floors, rows, racks and storage positions with live status colours."],
  ["Allocate exact space", "Reserve or occupy SQ.FT per position, rack or zone, never over capacity."],
  ["Access that fits the role", "Each person sees only the screens and actions they were given."],
];

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  // the form only works once the page is interactive; until then the button stays disabled
  const ready = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const problem = await login(email, password);
    setBusy(false);
    if (problem) return setError(problem);
    const next = params.get("next");
    router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
  };

  const frame = `flex h-13 items-center gap-3 rounded-auth-lg border bg-moveit-panel px-3.5 text-moveit-dim transition ${
    error
      ? "border-red-500/60 text-red-500 shadow-[0_0_0_0.22rem_rgb(239_68_68_/_13%)]"
      : "border-moveit-border focus-within:border-moveit-orange focus-within:text-moveit-orange focus-within:shadow-[0_0_0_0.22rem_rgb(240_90_40_/_13%)]"
  }`;
  const input =
    "h-full w-full border-0 bg-transparent text-sm font-medium text-moveit-text outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 placeholder:text-moveit-dim";

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-moveit-bg px-4 py-8 text-moveit-text sm:px-6">
      {/* ambient background wash */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 h-[38rem] w-[60rem] max-w-[120vw] -translate-x-1/2 rounded-full opacity-70 blur-[120px]" style={{ background: "radial-gradient(circle at 50% 50%, rgb(232 94 34 / 22%), transparent 62%)" }} />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 -right-40 h-[32rem] w-[32rem] rounded-full opacity-50 blur-[120px]" style={{ background: "radial-gradient(circle at 50% 50%, rgb(232 94 34 / 16%), transparent 60%)" }} />

      <div className="relative grid w-full max-w-6xl overflow-hidden rounded-[1.4rem] border border-moveit-border bg-moveit-panel shadow-admin-soft lg:grid-cols-[1.05fr_0.95fr]">
        {/* Brand panel */}
        <section className="relative hidden min-h-[44rem] overflow-hidden p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div aria-hidden="true" className="absolute inset-0" style={{ background: "linear-gradient(155deg, #17110e 0%, #0c0b0a 48%, #080808 100%)" }} />
          <div aria-hidden="true" className="absolute -left-24 top-24 h-80 w-80 rounded-full opacity-70 blur-[90px]" style={{ background: "radial-gradient(circle, rgb(232 94 34 / 34%), transparent 65%)" }} />
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: "linear-gradient(rgb(255 255 255 / 60%) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 60%) 1px, transparent 1px)", backgroundSize: "44px 44px" }}
          />

          <div className="relative flex items-center gap-4">
            <span className="grid place-items-center rounded-auth-lg bg-white px-4 py-3 shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element -- static brand artwork */}
              <img src="/moveit-logo.png" alt="Moveit 24/7" className="h-14 w-auto" />
            </span>
            <span className="h-10 w-px bg-white/15" aria-hidden="true" />
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/55">Storage operations</p>
          </div>

          <div className="relative max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-moveit-orange/25 bg-moveit-orange/10 px-3.5 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-moveit-orange-light">
              <ShieldIcon />
              Storage workspace
            </span>
            <h1 className="mt-6 text-[2.7rem] font-semibold leading-[1.06] text-white">
              Every warehouse, rack and position
              <span className="text-moveit-orange-light"> in one place.</span>
            </h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-white/60">
              Capacity, allocations, inventory and customers, managed from one focused operations panel with access that matches each role.
            </p>
            <ul className="mt-9 space-y-4">
              {HIGHLIGHTS.map(([title, copy]) => (
                <li key={title} className="flex items-start gap-3.5">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-auth-md border border-moveit-orange/25 bg-moveit-orange/15 text-moveit-orange-light">
                    <ShieldIcon />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-white">{title}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-white/50">{copy}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative grid grid-cols-3 gap-3">
            {[
              ["3D", "Warehouse view"],
              ["Live", "Capacity"],
              ["Role-based", "Access"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-auth-lg border border-white/10 bg-white/[0.05] p-4 backdrop-blur-sm">
                <p className="text-lg font-semibold text-white">{value}</p>
                <p className="mt-1 text-[0.7rem] font-medium uppercase tracking-[0.12em] text-white/45">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Form panel */}
        <section className="flex items-center justify-center px-6 py-12 sm:px-12">
          <form className="w-full max-w-md" method="post" action="/login" onSubmit={submit}>
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <MoveitLogo priority className="h-12" />
              <span className="h-8 w-px bg-moveit-border" aria-hidden="true" />
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-moveit-muted">Storage</p>
            </div>

            <div className="mb-8">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-moveit-orange">Secure sign in</p>
              <h2 className="mt-3 text-[2rem] font-semibold leading-tight text-moveit-text">Welcome back</h2>
              <p className="mt-2 text-sm leading-6 text-moveit-muted">Sign in to manage warehouses, allocations and inventory.</p>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-moveit-muted">Email</span>
                <span className={frame}>
                  <MailIcon />
                  <input
                    className={input}
                    type="email"
                    name="email"
                    autoComplete="username"
                    autoFocus
                    required
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => {
                      if (error) setError("");
                      setEmail(e.target.value);
                    }}
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-moveit-muted">Password</span>
                <span className={frame}>
                  <LockIcon />
                  <input
                    className={input}
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    required
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => {
                      if (error) setError("");
                      setPassword(e.target.value);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="grid size-8 shrink-0 place-items-center rounded-auth-sm text-moveit-dim transition hover:text-moveit-orange"
                  >
                    <EyeIcon off={showPassword} />
                  </button>
                </span>
              </label>
            </div>

            {error ? (
              <div className="mt-5 flex items-start gap-3 rounded-auth-lg border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-600 dark:text-red-300" role="alert">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="mt-0.5 size-4 shrink-0 text-red-500">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <p className="font-semibold">{error}</p>
              </div>
            ) : null}

            <button
              className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-auth-lg bg-gradient-to-br from-moveit-orange-light to-moveit-orange px-5 text-base font-semibold text-white shadow-auth-orange transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busy || !ready}
              type="submit"
            >
              {busy ? (
                "Signing in…"
              ) : (
                <>
                  Sign in <span aria-hidden="true">→</span>
                </>
              )}
            </button>

            <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs leading-5 text-moveit-muted">
              <span className="text-moveit-success">
                <ShieldIcon />
              </span>
              Accounts are created by a Super Admin. Forgot your password? Ask them to reset it.
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
