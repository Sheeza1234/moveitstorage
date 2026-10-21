import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export function AccessDenied({ what }: { what?: string }) {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-xl border border-moveit-border bg-moveit-card p-8 text-center">
      <ShieldAlert className="mx-auto h-10 w-10 text-moveit-orange" />
      <h2 className="mt-3 text-lg font-bold text-moveit-text">You don&apos;t have access to this page</h2>
      <p className="mt-1 text-sm text-moveit-muted">
        {what ? `${what} is not part of your account's permissions.` : "This page is not part of your account's permissions."} Ask a Super Admin to grant access if you need it.
      </p>
      <Link href="/" className="mt-5 inline-flex rounded-lg bg-moveit-orange px-4 py-2 text-sm font-semibold text-white hover:bg-moveit-orange-dark">
        Back to the dashboard
      </Link>
    </div>
  );
}
