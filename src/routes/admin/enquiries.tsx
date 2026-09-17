import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { t } from "~/admin/strings.ts";
import { Notice, QuietButton } from "~/admin/ui.tsx";
import {
  deleteEnquiry,
  exportEnquiriesCsv,
  listEnquiries,
  setEnquiryHandled,
} from "~/server/admin/enquiries.ts";

export const Route = createFileRoute("/admin/enquiries")({
  loader: async () => ({ enquiries: await listEnquiries() }),
  component: EnquiriesPage,
});

const dateFormat = new Intl.DateTimeFormat("sq-AL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function EnquiriesPage() {
  const { enquiries } = Route.useLoaderData();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function run(work: () => Promise<unknown>) {
    setBusy(true);
    setProblem(null);
    try {
      await work();
      await router.invalidate();
    } catch (error) {
      console.error("Enquiry update failed", error);
      setProblem(t.genericError);
    } finally {
      setBusy(false);
    }
  }

  async function onExport() {
    setProblem(null);
    try {
      const csv = await exportEnquiriesCsv();
      // Built in the browser so the download needs no extra authenticated route.
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `kerkesat-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("CSV export failed", error);
      setProblem(t.genericError);
    }
  }

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-ink-900">{t.enquiries.title}</h1>
        {enquiries.length > 0 ? (
          <QuietButton onClick={onExport}>{t.enquiries.exportCsv}</QuietButton>
        ) : null}
      </div>
      <p className="mb-6 text-sm text-ink-500">{t.enquiries.intro}</p>

      {problem ? (
        <div className="mb-4">
          <Notice tone="error">{problem}</Notice>
        </div>
      ) : null}

      {enquiries.length === 0 ? (
        <Notice tone="ok">{t.enquiries.empty}</Notice>
      ) : (
        <ul className="grid gap-3">
          {enquiries.map((enquiry) => (
            <li
              key={enquiry.id}
              className={`rounded-2xl border bg-white p-4 ${
                enquiry.handledAt ? "border-sand-200 opacity-70" : "border-brand-200"
              }`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium text-ink-900">{enquiry.name}</p>
                <p className="text-xs text-ink-500">{dateFormat.format(enquiry.createdAt)}</p>
              </div>

              <p className="mt-1 text-sm text-ink-700">
                <a href={`tel:${enquiry.phone.replace(/[^\d+]/g, "")}`} className="text-brand-500">
                  {enquiry.phone}
                </a>
                {" · "}
                <a href={`mailto:${enquiry.email}`} className="text-brand-500">
                  {enquiry.email}
                </a>
              </p>

              <p className="mt-1 text-sm text-ink-500">
                {t.enquiries.car}:{" "}
                {enquiry.vehicleModel
                  ? `${enquiry.vehicleModel} (${enquiry.vehicleYear})`
                  : t.enquiries.noCar}
                {enquiry.pickupDate || enquiry.dropoffDate
                  ? ` · ${t.enquiries.dates}: ${enquiry.pickupDate ?? "?"} → ${enquiry.dropoffDate ?? "?"}`
                  : ""}
              </p>

              {enquiry.message ? (
                <p className="mt-2 whitespace-pre-wrap text-sm text-ink-700">{enquiry.message}</p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={`https://wa.me/${enquiry.phone.replace(/\D/g, "")}`}
                  className="rounded-full border border-sand-200 px-3 py-1.5 text-sm text-ink-700 hover:border-brand-400"
                >
                  {t.enquiries.whatsapp}
                </a>
                <QuietButton
                  disabled={busy}
                  onClick={() =>
                    run(() =>
                      setEnquiryHandled({
                        data: { id: enquiry.id, handled: !enquiry.handledAt },
                      }),
                    )
                  }
                >
                  {enquiry.handledAt ? t.enquiries.markUnhandled : t.enquiries.markHandled}
                </QuietButton>
                <QuietButton
                  danger
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(t.enquiries.deleteConfirm)) {
                      void run(() => deleteEnquiry({ data: { id: enquiry.id } }));
                    }
                  }}
                >
                  {t.enquiries.delete}
                </QuietButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
