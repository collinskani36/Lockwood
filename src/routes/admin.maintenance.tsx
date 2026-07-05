import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/maintenance")({
  component: AdminMaintenance,
});

type Status = "open" | "in_progress" | "resolved";

type Report = {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: Status;
  created_at: string;
  listings: { title: string } | null;
  profiles: { full_name: string } | null;
};

const STATUS_LABEL: Record<Status, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
};

const STATUS_STYLE: Record<Status, string> = {
  open: "bg-destructive/10 text-destructive",
  in_progress: "bg-amber-500/10 text-amber-600",
  resolved: "bg-emerald-500/10 text-emerald-600",
};

function AdminMaintenance() {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [filter, setFilter] = useState<"all" | Status>("all");

  async function loadReports() {
    let query = supabase
      .from("maintenance_reports")
      .select("id, title, description, priority, status, created_at, listings(title), profiles:caretaker_id(full_name)")
      .order("created_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data, error } = await query;
    if (error) {
      toast.error(error.message);
      return;
    }
    setReports((data ?? []) as unknown as Report[]);
  }

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function updateStatus(id: string, status: Status) {
    const { error } = await supabase.from("maintenance_reports").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    loadReports();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Maintenance reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">Issues flagged by caretakers across all properties.</p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as "all" | Status)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
        >
          <option value="all">All</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {reports === null && <p className="text-sm text-muted-foreground">Loading…</p>}
      {reports !== null && reports.length === 0 && (
        <p className="text-sm text-muted-foreground">No reports match this filter.</p>
      )}

      <div className="space-y-3">
        {reports?.map((report) => (
          <div key={report.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">{report.title}</p>
                <p className="text-xs text-muted-foreground">
                  {report.listings?.title ?? "Unknown property"} · reported by{" "}
                  {report.profiles?.full_name ?? "Unknown caretaker"}
                </p>
              </div>
              <select
                value={report.status}
                onChange={(e) => updateStatus(report.id, e.target.value as Status)}
                className={`h-8 shrink-0 rounded-md border border-input px-2 text-xs shadow-sm ${STATUS_STYLE[report.status]}`}
              >
                <option value="open">{STATUS_LABEL.open}</option>
                <option value="in_progress">{STATUS_LABEL.in_progress}</option>
                <option value="resolved">{STATUS_LABEL.resolved}</option>
              </select>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{report.description}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {new Date(report.created_at).toLocaleDateString()} · {report.priority} priority
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
