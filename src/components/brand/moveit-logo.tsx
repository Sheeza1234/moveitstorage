/* eslint-disable @next/next/no-img-element -- static brand artwork served from /public; avoids needing the optional `sharp` image library */

const ALT = "Moveit 24/7";

/**
 * Theme-aware lockup (same artwork as the Moveit 24/7 admin console): the light artwork renders in light mode and the
 * dark artwork in dark mode, driven by the `dark:` variant.
 */
export function MoveitLogo({ className }: { className?: string; priority?: boolean }) {
  const shared = `w-auto object-contain ${className ?? ""}`;
  return (
    <>
      <img src="/moveit-logo.png" alt={ALT} className={`dark:hidden ${shared}`} />
      <img src="/moveit-logo-dark.png" alt={ALT} className={`hidden dark:block ${shared}`} />
    </>
  );
}
