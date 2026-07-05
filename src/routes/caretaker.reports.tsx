import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/caretaker/reports")({
  component: CaretakerReports,
});

type Priority = "low" | "normal" | "high" | "urgent";
type Status = "open" | "in_progress" | "resolved";

type ListingOption = { id: string; title: string };

type Report = {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  created_at: string;
  listing_id: string;
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

function CaretakerReports() {
  const [listings, setListings] = useState<ListingOption[]>([]);
  const [reports, setReports] = useState<Report[] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [listingId, setListingId] = useState("");

  const listingsById = useMemo(
    () => Object.fromEntries(listings.map((l) => [l.id, l.title])),
    [listings],
  );

  async function loadData() {
    const session = await getSession();
    if (!session) return;

    const { data: listingRows } = await supabase
      .from("listings")
      .select("id, title")
      .eq("caretaker_id", session.user.id)
      .order("title", { ascending: true });
    setListings(listingRows ?? []);

    const { data: reportRows, error } = await supabase
      .from("maintenance_reports")
      .select("id, title, description, priority, status, created_at, listing_id")
      .eq("caretaker_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(error.message);
      return;
    }
    setReports((reportRows ?? []) as Report[]);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!listingId) {
      toast.error("Pick the apartment this report is about");
      return;
    }

    setSubmitting(true);
    try {
      const session = await getSession();
      if (!session) throw new Error("You must be signed in.");

      const { error } = await supabase.from("maintenance_reports").insert({
        title,
        description,
        priority,
        listing_id: listingId,
        caretaker_id: session.user.id,
        status: "open",
      });
      if (error) throw error;

      toast.success("Report sent to the agents");
      setTitle("");
      setDescription("");
      setPriority("normal");
      setListingId("");
      loadData();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">Report a problem</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Flag issues at a property so the agents can follow up.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div>
          <Label htmlFor="report-listing">Apartment</Label>
          <select
            id="report-listing"
            value={listingId}
            onChange={(e) => setListingId(e.target.value)}
            required
            disabled={listings.length === 0}
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          >
            <option value="" disabled>
              {listings.length === 0 ? "No apartments assigned to you yet" : "Select the apartment"}
            </option>
            {listings.map((listing) => (
              <option key={listing.id} value={listing.id}>
                {listing.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="report-title">What's wrong</Label>
          <Input
            id="report-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Leaking pipe under kitchen sink"
            required
          />
        </div>

        <div>
          <Label htmlFor="report-priority">Priority</Label>
          <select
            id="report-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div>
          <Label htmlFor="report-description">Details</Label>
          <textarea
            id="report-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What did you notice, and where exactly?"
            rows={4}
            required
            className="mt-1 flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
          />
        </div>

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Sending…" : "Send to agents"}
        </Button>
      </form>

      <div>
        <h2 className="font-display text-lg font-semibold text-foreground">Your reports</h2>
        <div className="mt-3 space-y-3">
          {reports === null && <p className="text-sm text-muted-foreground">Loading…</p>}
          {reports !== null && reports.length === 0 && (
            <p className="text-sm text-muted-foreground">You haven't reported anything yet.</p>
          )}
          {reports?.map((report) => (
            <div key={report.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">{report.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {listingsById[report.listing_id] ?? "Unknown apartment"}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[report.status]}`}>
                  {STATUS_LABEL[report.status]}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{report.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date(report.created_at).toLocaleDateString()} · {report.priority} priority
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}