import { createFileRoute } from "@tanstack/react-router";
import { ListingForm } from "@/components/listing-form";
import { createListing } from "@/lib/listings";

export const Route = createFileRoute("/admin/listings/new")({
  component: NewListingPage,
});

function NewListingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">New listing</h1>
        <p className="mt-1 text-muted-foreground">Add a property to the catalogue.</p>
      </div>
      <ListingForm
        submitLabel="Create listing"
        onSubmit={async (values) => {
          return await createListing(values);
        }}
      />
    </div>
  );
}