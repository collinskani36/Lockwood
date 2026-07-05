import { createFileRoute, notFound } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ListingForm } from "@/components/listing-form";
import { getListingById, updateListing } from "@/lib/listings";
import { assignCaretaker, getCaretakers, getListingCaretaker } from "@/lib/caretakers";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin/listings/$id/edit")({
  component: EditListingPage,
});

function EditListingPage() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => getListingById(id),
  });

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!data) throw notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Edit listing</h1>
        <p className="mt-1 text-muted-foreground">{data.title}</p>
      </div>
      <ListingForm
        initial={data}
        submitLabel="Save changes"
        onSubmit={async (values) => {
          await updateListing(id, values);
        }}
      />
      <CaretakerAssignmentCard listingId={id} />
    </div>
  );
}

function CaretakerAssignmentCard({ listingId }: { listingId: string }) {
  const qc = useQueryClient();
  const { data: caretakers = [] } = useQuery({
    queryKey: ["caretakers"],
    queryFn: getCaretakers,
  });
  const { data: currentCaretakerId, isLoading } = useQuery({
    queryKey: ["listing-caretaker", listingId],
    queryFn: () => getListingCaretaker(listingId),
  });

  const assign = useMutation({
    mutationFn: (value: string) =>
      assignCaretaker(listingId, value === "unassigned" ? null : value),
    onSuccess: () => {
      toast.success("Caretaker updated");
      qc.invalidateQueries({ queryKey: ["listing-caretaker", listingId] });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update caretaker"),
  });

  return (
    <section className="mx-auto max-w-4xl rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="font-display text-lg font-semibold">Caretaker</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Only the caretaker assigned here can upload photos or report maintenance issues
        for this apartment.
      </p>
      <div className="mt-4 max-w-sm">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <Select
            value={currentCaretakerId ?? "unassigned"}
            onValueChange={(v) => assign.mutate(v)}
            disabled={assign.isPending}
          >
            <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {caretakers.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </section>
  );
}