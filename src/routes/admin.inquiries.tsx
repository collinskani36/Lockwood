import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Phone, MessageCircle, Mail } from "lucide-react";

import { getInquiries, updateInquiryStatus } from "@/lib/inquiries";
import { getListings } from "@/lib/listings";
import type { InquiryRecord, InquiryStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/inquiries")({
  component: AdminInquiriesPage,
});

const STATUS_COLORS: Record<InquiryStatus, string> = {
  new: "bg-accent text-accent-foreground border-0",
  contacted: "bg-primary text-primary-foreground border-0",
  closed: "bg-success text-success-foreground border-0",
  lost: "bg-muted text-muted-foreground",
};

function channelIcon(c: InquiryRecord["contactChannel"]) {
  if (c === "whatsapp") return <MessageCircle className="h-3.5 w-3.5" />;
  if (c === "call") return <Phone className="h-3.5 w-3.5" />;
  return <Mail className="h-3.5 w-3.5" />;
}

function AdminInquiriesPage() {
  const qc = useQueryClient();
  const { data: inquiries = [], isLoading } = useQuery({
    queryKey: ["inquiries"],
    queryFn: getInquiries,
  });
  const { data: listings = [] } = useQuery({ queryKey: ["listings"], queryFn: getListings });

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<InquiryRecord | null>(null);

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: InquiryStatus }) =>
      updateInquiryStatus(id, status),
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["inquiries"] });
    },
  });

  const filtered = inquiries.filter((i) => statusFilter === "all" || i.status === statusFilter);

  const listingTitle = (id: string | null) =>
    id ? listings.find((l) => l.id === id)?.title ?? "—" : "—";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Inquiries</h1>
          <p className="mt-1 text-muted-foreground">Leads from the website, WhatsApp and calls.</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="hidden px-4 py-3 md:table-cell">Phone</th>
              <th className="hidden px-4 py-3 md:table-cell">Listing</th>
              <th className="px-4 py-3">Channel</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Received</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No inquiries.</td></tr>
            )}
            {filtered.map((i) => (
              <tr
                key={i.id}
                className="cursor-pointer hover:bg-secondary/30"
                onClick={() => setSelected(i)}
              >
                <td className="px-4 py-3 font-medium">{i.name}</td>
                <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{i.phoneNumber}</td>
                <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{listingTitle(i.listingId)}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 capitalize text-muted-foreground">
                    {channelIcon(i.contactChannel)} {i.contactChannel}
                  </span>
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={i.status}
                    onValueChange={(v) => update.mutate({ id: i.id, status: v as InquiryStatus })}
                  >
                    <SelectTrigger className="h-8 w-[130px]">
                      <Badge className={STATUS_COLORS[i.status]} variant="outline">
                        {i.status}
                      </Badge>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                  {new Date(i.createdAt).toLocaleString("en-KE")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
            <DialogDescription>
              {selected && new Date(selected.createdAt).toLocaleString("en-KE")}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <Field label="Phone" value={selected.phoneNumber} />
              <Field label="Channel" value={selected.contactChannel} />
              <Field label="Listing" value={listingTitle(selected.listingId)} />
              <Field label="Preferred move-in" value={selected.preferredMoveIn ?? "—"} />
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Message</p>
                <p className="mt-1 whitespace-pre-line">{selected.message || "—"}</p>
              </div>
              <a
                href={`tel:${selected.phoneNumber}`}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
              >
                <Phone className="h-4 w-4" /> Call back
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-2">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  );
}
