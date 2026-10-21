"use client";

import * as React from "react";
import { services } from "@/services";
import { useCan } from "@/lib/use-can";
import { BookingRequest, BookingRequestStatus, BookingRequestSummary, BOOKING_REQUEST_STATUSES } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { Drawer } from "@/components/ui/drawer";
import { Select } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { cn, formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { Inbox, PhoneCall, CheckCircle2, UserPlus, Phone, Mail, MessageCircle, Thermometer, ShieldCheck } from "lucide-react";
import Link from "next/link";

const STATUS_STYLE: Record<BookingRequestStatus, string> = {
  NEW: "bg-moveit-orange/15 text-moveit-orange border-moveit-orange/30",
  CONTACTED: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900",
  CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
  CONVERTED: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900",
  LOST: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
};
const labelOf = (s: BookingRequestStatus) => BOOKING_REQUEST_STATUSES.find((x) => x.id === s)?.label ?? s;

function StatusPill({ status }: { status: BookingRequestStatus }) {
  return <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", STATUS_STYLE[status])}>{labelOf(status)}</span>;
}

const whatsappLink = (phone: string) => `https://wa.me/${phone.replace(/\D/g, "")}`;

export default function BookingRequestsPage() {
  const can = useCan();
  const [requests, setRequests] = React.useState<BookingRequest[]>([]);
  const [summary, setSummary] = React.useState<BookingRequestSummary | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [openId, setOpenId] = React.useState<string | null>(null);

  const fetchAll = () => Promise.all([services.bookingRequestService.getBookingRequests(), services.bookingRequestService.getBookingRequestSummary()]);
  const apply = ([list, sum]: Awaited<ReturnType<typeof fetchAll>>) => {
    setRequests(list);
    setSummary(sum);
    setError(null);
    setIsLoading(false);
  };
  const fail = (err: unknown) => {
    setError(err instanceof Error ? err.message : "Failed to load booking requests.");
    setIsLoading(false);
  };
  const load = () => fetchAll().then(apply, fail);

  React.useEffect(() => {
    let active = true;
    const refresh = () => {
      fetchAll().then(
        (data) => active && apply(data),
        (err) => active && fail(err)
      );
    };
    refresh();
    const timer = setInterval(refresh, 30_000); // new portal requests appear without a manual refresh
    return () => {
      active = false;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the helpers only call stable state setters
  }, []);

  const filtered = React.useMemo(() => requests.filter((r) => statusFilter === "ALL" || r.status === statusFilter), [requests, statusFilter]);
  const open = requests.find((r) => r.id === openId) ?? null;

  const columns: ColumnDef<BookingRequest>[] = [
    { key: "reference", header: "Reference", sortable: true, cell: (r) => <span className="font-mono text-xs font-bold text-moveit-orange">{r.reference}</span> },
    {
      key: "name", header: "Customer", sortable: true,
      cell: (r) => (
        <div className="text-xs">
          <div className="font-bold text-slate-900 dark:text-slate-100">{r.name}</div>
          <div className="text-slate-500">{r.phone}</div>
        </div>
      ),
    },
    {
      key: "sizeSqFt", header: "Unit", sortable: true,
      cell: (r) => (
        <div className="text-xs">
          <div className="font-semibold">{r.sizeSqFt} sq ft {r.unitName.toLowerCase()}</div>
          <div className="text-slate-500">{r.months} {r.months === 1 ? "month" : "months"}</div>
        </div>
      ),
    },
    { key: "moveInDate", header: "Move-in", sortable: true, cell: (r) => <span className="text-xs">{formatDate(r.moveInDate)}</span> },
    {
      key: "monthlyAed", header: "Value", sortable: true,
      cell: (r) => (
        <div className="text-xs">
          <div className="font-semibold">{formatCurrency(r.monthlyAed)} / mo</div>
          <div className="text-slate-500">{formatCurrency(r.totalAed)} total</div>
        </div>
      ),
    },
    { key: "status", header: "Status", sortable: true, cell: (r) => <StatusPill status={r.status} /> },
    { key: "createdAt", header: "Received", sortable: true, cell: (r) => <span className="text-xs text-slate-500">{formatDateTime(r.createdAt)}</span> },
  ];

  if (isLoading) return <LoadingState message="Loading booking requests..." className="py-24" />;
  if (error || !summary) return <ErrorState message={error || "Failed to load booking requests."} onRetry={load} className="my-12" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Booking Requests"
        description="Storage bookings sent from the public booking portal. Contact each customer, confirm the unit, then create the customer record."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="New" value={summary.new} subtitle="Waiting for a first call" icon={<Inbox className="h-5 w-5" />} onClick={() => setStatusFilter("NEW")} />
        <MetricCard title="Contacted" value={summary.contacted} subtitle="Follow-up in progress" icon={<PhoneCall className="h-5 w-5" />} onClick={() => setStatusFilter("CONTACTED")} />
        <MetricCard title="Confirmed" value={summary.confirmed} subtitle="Unit confirmed, not yet a customer" icon={<CheckCircle2 className="h-5 w-5" />} onClick={() => setStatusFilter("CONFIRMED")} />
        <MetricCard title="Customers created" value={summary.converted} subtitle={`${summary.total} requests in total`} icon={<UserPlus className="h-5 w-5" />} onClick={() => setStatusFilter("CONVERTED")} />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-56">
          <Select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={[{ value: "ALL", label: "All requests" }, ...BOOKING_REQUEST_STATUSES.map((s) => ({ value: s.id, label: s.label }))]} />
        </div>
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        keyExtractor={(r) => r.id}
        searchPlaceholder="Search by name, phone, email or reference..."
        searchableKey={(r) => `${r.name} ${r.phone} ${r.email} ${r.reference}`}
        emptyMessage="No booking requests yet. New requests from the booking portal show up here."
        onRowClick={(r) => setOpenId(r.id)}
      />

      <Drawer isOpen={Boolean(open)} onClose={() => setOpenId(null)} title={open ? `Request ${open.reference}` : ""} description={open ? `Received ${formatDateTime(open.createdAt)}` : ""} size="lg">
        {open && <RequestDetail key={open.id} request={open} canEdit={can("CUSTOMERS", "EDIT")} canCreateCustomer={can("CUSTOMERS", "CREATE")} onChanged={load} />}
      </Drawer>
    </div>
  );
}

function RequestDetail({ request: r, canEdit, canCreateCustomer, onChanged }: { request: BookingRequest; canEdit: boolean; canCreateCustomer: boolean; onChanged: () => Promise<void> }) {
  const [notes, setNotes] = React.useState(r.internalNotes);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ ok: boolean; text: string } | null>(null);

  const run = async (fn: () => Promise<void>, done: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
      await onChanged();
      setMessage({ ok: true, text: done });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setBusy(false);
    }
  };

  const setStatus = (status: BookingRequestStatus) => run(() => services.bookingRequestService.updateBookingRequest(r.id, { status }).then(() => undefined), `Marked as ${labelOf(status).toLowerCase()}.`);
  const saveNotes = () => run(() => services.bookingRequestService.updateBookingRequest(r.id, { internalNotes: notes }).then(() => undefined), "Notes saved.");
  const createCustomer = () =>
    run(async () => {
      const [firstName, ...rest] = r.name.split(/\s+/);
      const customer = await services.customerService.createCustomer({
        type: "INDIVIDUAL",
        firstName,
        lastName: rest.join(" ") || "-",
        email: r.email,
        phone: r.phone,
        address: "To be confirmed",
        city: "Dubai",
        country: "United Arab Emirates",
        status: "ACTIVE",
        notes: `From booking request ${r.reference}. ${r.customerNotes ?? ""}`.trim(),
        requiredSqFt: r.sizeSqFt,
        storageStartDate: r.moveInDate,
        storageDurationMonths: r.months,
      });
      await services.bookingRequestService.updateBookingRequest(r.id, { status: "CONVERTED", customerId: customer.id });
    }, "Customer created and linked to this request.");

  const row = (label: string, value: React.ReactNode) => (
    <div className="flex items-start justify-between gap-4 border-b border-moveit-border-soft py-2 text-sm last:border-0">
      <span className="text-moveit-muted">{label}</span>
      <span className="text-right font-medium text-moveit-text">{value}</span>
    </div>
  );

  return (
    <div className="mt-4 flex-1 space-y-6 overflow-y-auto pr-1">
      <div className="flex items-center justify-between gap-3">
        <StatusPill status={r.status} />
        <div className="flex gap-2">
          <a href={`tel:${r.phone}`}><Button variant="outline" size="sm"><Phone className="mr-1.5 h-3.5 w-3.5" />Call</Button></a>
          <a href={whatsappLink(r.phone)} target="_blank" rel="noreferrer"><Button variant="outline" size="sm"><MessageCircle className="mr-1.5 h-3.5 w-3.5" />WhatsApp</Button></a>
          <a href={`mailto:${r.email}`}><Button variant="outline" size="sm"><Mail className="mr-1.5 h-3.5 w-3.5" />Email</Button></a>
        </div>
      </div>

      <section>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-moveit-muted">Customer</h3>
        {row("Name", r.name)}
        {row("Phone", r.phone)}
        {row("Email", r.email)}
        {r.customerNotes && row("Their note", <span className="max-w-xs whitespace-pre-wrap">{r.customerNotes}</span>)}
      </section>

      <section>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-moveit-muted">Booking</h3>
        {row("Unit", `${r.sizeSqFt} sq ft ${r.unitName.toLowerCase()}`)}
        {row("Period", `${r.months} ${r.months === 1 ? "month" : "months"}`)}
        {row("Move-in date", formatDate(r.moveInDate))}
        {row("Extras", (
          <span className="inline-flex flex-wrap justify-end gap-2">
            {!r.climateControlled && !r.insurance && "None"}
            {r.climateControlled && <span className="inline-flex items-center gap-1"><Thermometer className="h-3.5 w-3.5" />Climate controlled</span>}
            {r.insurance && <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" />Insurance</span>}
          </span>
        ))}
        {row("Monthly", formatCurrency(r.monthlyAed))}
        {row("Total", <span className="font-bold">{formatCurrency(r.totalAed)}</span>)}
        {row("Source", r.source)}
      </section>

      {canEdit && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-moveit-muted">Follow-up</h3>
          <div className="flex flex-wrap gap-2">
            {BOOKING_REQUEST_STATUSES.filter((s) => s.id !== "CONVERTED").map((s) => (
              <Button key={s.id} size="sm" variant={r.status === s.id ? "primary" : "outline"} disabled={busy || r.status === "CONVERTED"} onClick={() => setStatus(s.id)}>
                {s.label}
              </Button>
            ))}
          </div>
          <label htmlFor="internal-notes" className="block pt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">Internal notes</label>
          <textarea
            id="internal-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Call outcome, agreed price, unit number..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moveit-orange dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <Button size="sm" variant="secondary" disabled={busy || notes === r.internalNotes} onClick={saveNotes}>Save notes</Button>
        </section>
      )}

      <section className="space-y-2 rounded-xl border border-moveit-border bg-moveit-surface p-4">
        <h3 className="text-sm font-bold text-moveit-text">Customer record</h3>
        {r.customerId ? (
          <p className="text-sm text-moveit-muted">
            A customer was created from this request. <Link className="font-semibold text-moveit-orange underline" href={`/customers/${r.customerId}`}>Open customer profile</Link>
          </p>
        ) : (
          <>
            <p className="text-sm text-moveit-muted">Once the customer agrees, create their customer record from these details. Then you can allocate storage and raise a contract.</p>
            {canCreateCustomer ? (
              <Button disabled={busy} isLoading={busy} onClick={createCustomer}><UserPlus className="mr-1.5 h-4 w-4" />Create customer</Button>
            ) : (
              <p className="text-xs text-moveit-muted">Your account cannot create customers.</p>
            )}
          </>
        )}
      </section>

      {message && <p role="status" className={cn("text-sm font-medium", message.ok ? "text-moveit-success" : "text-moveit-danger")}>{message.text}</p>}
    </div>
  );
}
