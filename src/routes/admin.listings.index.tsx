import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, CheckCircle2, Search, Eye, Send } from "lucide-react";
import { toast } from "sonner";

import { getListings, updateListing, deleteListing } from "@/lib/listings";
import { formatKES, formatBedrooms } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/listings/")({
  component: AdminListingsPage,
});

// Listings created by caretakers land here with status "pending" — they
// need an admin to review the submitted details before they count as
// "available" and show up on the public site.
const STATUS_SORT_ORDER: Record<string, number> = {
  pending: 0,
  available: 1,
  let: 2,
  sold: 2,
};

function statusBadgeClassName(status: string) {
  if (status === "available") return "border-0 bg-success text-success-foreground";
  if (status === "pending") return "border-0 bg-amber-100 text-amber-800";
  return "";
}

function AdminListingsPage() {
  const qc = useQueryClient();
  const { data: listings = [], isLoading } = useQuery({ queryKey: ["listings"], queryFn: getListings });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["listings"] });
  };

  const markAsLet = useMutation({
    mutationFn: (id: string) => updateListing(id, { status: "let" }),
    onSuccess: () => { toast.success("Marked as let"); invalidate(); },
  });
  const publish = useMutation({
    mutationFn: (id: string) => updateListing(id, { status: "available" }),
    onSuccess: () => { toast.success("Listing published"); invalidate(); },
    onError: (e: Error) => toast.error(e.message || "Failed to publish listing"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteListing(id),
    onSuccess: () => { toast.success("Listing deleted"); invalidate(); },
  });

  const filtered = listings
    .filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (search && !`${l.title} ${l.location.name}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => (STATUS_SORT_ORDER[a.status] ?? 99) - (STATUS_SORT_ORDER[b.status] ?? 99));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Listings</h1>
          <p className="mt-1 text-muted-foreground">Manage your property listings.</p>
        </div>
        <Button asChild>
          <Link to="/admin/listings/new"><Plus className="mr-1 h-4 w-4" /> New listing</Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search title or location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="let">Let</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Listing</th>
              <th className="hidden px-4 py-3 md:table-cell">Location</th>
              <th className="hidden px-4 py-3 md:table-cell">Type</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No listings found.</td></tr>
            )}
            {filtered.map((l) => (
              <tr key={l.id} className="hover:bg-secondary/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={l.photos[0]?.url}
                      alt=""
                      className="h-12 w-16 rounded-md object-cover bg-muted"
                    />
                    <div>
                      <p className="font-medium">{l.title}</p>
                      <p className="text-xs text-muted-foreground">{formatBedrooms(l.bedrooms)} · {l.bathrooms} bath</p>
                    </div>
                  </div>
                </td>
                <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{l.location.name}</td>
                <td className="hidden px-4 py-3 capitalize text-muted-foreground md:table-cell">{l.listingType}</td>
                <td className="px-4 py-3 font-semibold">{formatKES(l.price)}</td>
                <td className="px-4 py-3">
                  <Badge variant={l.status === "available" ? "default" : "secondary"} className={statusBadgeClassName(l.status)}>
                    {l.status}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    {l.status === "pending" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" title="Review submission">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-lg">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Review submission</AlertDialogTitle>
                            <AlertDialogDescription>
                              Submitted by the assigned caretaker. Check the details before publishing.
                            </AlertDialogDescription>
                          </AlertDialogHeader>

                          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1 text-sm">
                            {l.photos[0]?.url && (
                              <img
                                src={l.photos[0].url}
                                alt=""
                                className="h-40 w-full rounded-lg object-cover bg-muted"
                              />
                            )}

                            <div>
                              <p className="font-display text-base font-semibold text-foreground">{l.title}</p>
                              <p className="text-muted-foreground">
                                {l.location.name}{l.addressDetail ? ` — ${l.addressDetail}` : ""}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-secondary/30 p-3 sm:grid-cols-4">
                              <div>
                                <p className="text-xs text-muted-foreground">Type</p>
                                <p className="font-medium capitalize">{l.listingType}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Beds / baths</p>
                                <p className="font-medium">{formatBedrooms(l.bedrooms)} / {l.bathrooms}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Price</p>
                                <p className="font-medium">{formatKES(l.price)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Deposit</p>
                                <p className="font-medium">{l.deposit ? formatKES(l.deposit) : "—"}</p>
                              </div>
                            </div>

                            {l.description && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">Description</p>
                                <p className="mt-1 text-foreground">{l.description}</p>
                              </div>
                            )}

                            {l.amenities.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">Amenities</p>
                                <div className="mt-1.5 flex flex-wrap gap-1.5">
                                  {l.amenities.map((a) => (
                                    <span key={a} className="rounded-full bg-secondary px-2 py-0.5 text-xs capitalize text-secondary-foreground">
                                      {a.replace(/_/g, " ")}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <AlertDialogFooter>
                            <AlertDialogCancel>Close</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => publish.mutate(l.id)}
                              disabled={publish.isPending}
                            >
                              <Send className="mr-1 h-4 w-4" />
                              Publish
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    {l.status === "available" && (
                      <Button size="sm" variant="ghost"
                        onClick={() => markAsLet.mutate(l.id)}
                        disabled={markAsLet.isPending}
                        title="Mark as let"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button asChild size="sm" variant="ghost" title="Edit">
                      <Link to="/admin/listings/$id/edit" params={{ id: l.id }}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" title="Delete" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
                          <AlertDialogDescription>
                            "{l.title}" will be permanently removed. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove.mutate(l.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}