import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ImageOff, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { getLocations } from "@/lib/locations";
import { ALL_AMENITIES } from "@/components/amenity-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/caretaker/listings")({
  component: CaretakerListings,
});

// Photos are stored in the public "listing-photos" bucket, under
// `${listing.id}/${filename}`. Each upload creates a row in
// listing_photos with status "draft" until an admin publishes it.
const BUCKET = "listing-photos";

// Listings created by a caretaker start as "pending" so an admin can
// review price/details before the unit goes live as "available" —
// same review pattern already used for photos (draft -> published).
const NEW_LISTING_STATUS = "pending";

type Listing = {
  id: string;
  title: string;
  status: string;
  location: { name: string } | null;
};

type Photo = {
  id: string;
  storage_path: string;
  status: "draft" | "published";
  uploaded_by: string | null;
};

function statusLabel(status: string) {
  switch (status) {
    case "pending":
      return "Awaiting admin approval";
    case "available":
      return "Available";
    case "let":
      return "Let";
    case "sold":
      return "Sold";
    default:
      return status;
  }
}

// Pending listings surface first since they need caretaker/admin attention.
const STATUS_SORT_ORDER: Record<string, number> = {
  pending: 0,
  available: 1,
  let: 2,
  sold: 2,
};

function CaretakerListings() {
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [photosByListing, setPhotosByListing] = useState<Record<string, Photo[]>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  async function loadListings() {
    console.log("[loadListings] starting");
    const session = await getSession();
    console.log("[loadListings] session:", session?.user?.id ?? "NO SESSION");
    if (!session) return;

    // Show every listing assigned to this caretaker, not just the
    // available ones, so newly created "pending" listings are visible
    // while awaiting admin approval.
    const { data: listingRows, error } = await supabase
      .from("listings")
      .select("id, title, status, location:locations(name)")
      .eq("caretaker_id", session.user.id)
      .order("created_at", { ascending: false });

    console.log("[loadListings] listings result:", listingRows, "error:", error);

    if (error) {
      toast.error(error.message);
      return;
    }

    const rows = (listingRows ?? []) as unknown as Listing[];
    rows.sort((a, b) => (STATUS_SORT_ORDER[a.status] ?? 99) - (STATUS_SORT_ORDER[b.status] ?? 99));
    setListings(rows);

    if (rows.length === 0) {
      setPhotosByListing({});
      return;
    }

    const { data: photoRows, error: photoError } = await supabase
      .from("listing_photos")
      .select("id, storage_path, status, uploaded_by, listing_id")
      .in("listing_id", rows.map((l) => l.id))
      .order("sort_order", { ascending: true });

    console.log("[loadListings] photos result:", photoRows, "error:", photoError);

    if (photoError) {
      toast.error(photoError.message);
      return;
    }

    const grouped: Record<string, Photo[]> = {};
    for (const photo of (photoRows ?? []) as (Photo & { listing_id: string })[]) {
      grouped[photo.listing_id] = [...(grouped[photo.listing_id] ?? []), photo];
    }
    setPhotosByListing(grouped);
  }

  useEffect(() => {
    loadListings();
  }, []);

  // NOTE: takes a plain File[] snapshot, not a live FileList — see onChange below.
  async function handleUpload(listing: Listing, files: File[]) {
    console.log("[handleUpload] called for listing", listing.id, "with", files?.length, "files");
    setUploadingId(listing.id);
    try {
      const session = await getSession();
      console.log("[handleUpload] session:", session?.user?.id ?? "NO SESSION");
      if (!session) throw new Error("You must be signed in.");

      for (const file of files) {
        console.log("[handleUpload] processing file:", file.name, file.type, file.size, "bytes");
        const path = `${listing.id}/${crypto.randomUUID()}-${file.name}`;
        console.log("[handleUpload] uploading to storage path:", path);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { upsert: false });

        console.log("[handleUpload] storage upload result:", uploadData, "error:", uploadError);
        if (uploadError) throw uploadError;

        const { data: insertData, error: insertError } = await supabase
          .from("listing_photos")
          .insert({
            listing_id: listing.id,
            storage_path: path,
            status: "draft",
            uploaded_by: session.user.id,
          })
          .select();

        console.log("[handleUpload] listing_photos insert result:", insertData, "error:", insertError);
        if (insertError) throw insertError;
      }

      toast.success("Photos sent for admin review");
      await loadListings();
    } catch (err) {
      console.error("[handleUpload] caught error:", err);
      toast.error((err as Error).message);
    } finally {
      setUploadingId(null);
    }
  }

  async function handleRemove(photo: Photo) {
    console.log("[handleRemove] removing photo", photo.id, photo.storage_path);
    const { error } = await supabase.from("listing_photos").delete().eq("id", photo.id);
    if (error) {
      console.error("[handleRemove] delete row error:", error);
      toast.error(error.message);
      return;
    }
    const { error: storageError } = await supabase.storage.from(BUCKET).remove([photo.storage_path]);
    if (storageError) {
      console.error("[handleRemove] delete storage object error:", storageError);
    }
    toast.success("Photo removed");
    loadListings();
  }

  if (showCreateForm) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">New listing</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Submitted listings are reviewed by an admin before going live.
          </p>
        </div>
        <CreateListingForm
          onCancel={() => setShowCreateForm(false)}
          onCreated={async () => {
            setShowCreateForm(false);
            await loadListings();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Your listings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create new units and upload photos — an admin reviews both before they go live.
          </p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4" />
          New listing
        </Button>
      </div>

      {listings === null && <p className="text-sm text-muted-foreground">Loading…</p>}

      {listings !== null && listings.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <ImageOff className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium text-foreground">No listings yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first listing to get it in front of an admin for review.
          </p>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {listings?.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            photos={photosByListing[listing.id] ?? []}
            uploading={uploadingId === listing.id}
            onUpload={(files) => handleUpload(listing, files)}
            onRemove={handleRemove}
          />
        ))}
      </div>
    </div>
  );
}

function ListingCard({
  listing,
  photos,
  uploading,
  onUpload,
  onRemove,
}: {
  listing: Listing;
  photos: Photo[];
  uploading: boolean;
  onUpload: (files: File[]) => void;
  onRemove: (photo: Photo) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const drafts = photos.filter((p) => p.status === "draft");
  const published = photos.filter((p) => p.status === "published");

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-foreground">{listing.title}</p>
          {listing.location && (
            <p className="text-sm text-muted-foreground">{listing.location.name}</p>
          )}
        </div>
        <span
          className={
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium " +
            (listing.status === "pending"
              ? "bg-amber-100 text-amber-800"
              : listing.status === "available"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-secondary text-muted-foreground")
          }
        >
          {statusLabel(listing.status)}
        </span>
      </div>

      {published.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-muted-foreground">Published</p>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            {published.map((photo) => (
              <PhotoTile key={photo.id} photo={photo} listingTitle={listing.title} onRemove={onRemove} />
            ))}
          </div>
        </div>
      )}

      {drafts.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-muted-foreground">Pending review</p>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            {drafts.map((photo) => (
              <PhotoTile key={photo.id} photo={photo} listingTitle={listing.title} onRemove={onRemove} />
            ))}
          </div>
        </div>
      )}

      {photos.length === 0 && (
        <p className="mt-3 text-xs text-muted-foreground">No photos yet.</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          // Snapshot into a plain array immediately. e.target.files is a LIVE
          // FileList tied to the input element — if we hand it off as-is and
          // then reset e.target.value below, the same object gets emptied out
          // from under the async handleUpload call once it resumes after its
          // first await, and the whole upload silently no-ops.
          const fileArray = e.target.files ? Array.from(e.target.files) : [];
          console.log("[input onChange] files selected:", fileArray.length);
          if (fileArray.length > 0) {
            onUpload(fileArray);
          }
          e.target.value = "";
        }}
      />
      <Button
        variant="outline"
        size="sm"
        className="mt-4 w-full gap-2"
        disabled={uploading}
        onClick={() => {
          console.log("[Add photos button] clicked");
          inputRef.current?.click();
        }}
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {uploading ? "Uploading…" : "Add photos"}
      </Button>
    </div>
  );
}

function PhotoTile({
  photo,
  listingTitle,
  onRemove,
}: {
  photo: Photo;
  listingTitle: string;
  onRemove: (photo: Photo) => void;
}) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(photo.storage_path);
  return (
    <div className="group relative aspect-square overflow-hidden rounded-lg bg-secondary">
      <img src={data.publicUrl} alt={listingTitle} className="h-full w-full object-cover" />
      {photo.status === "draft" && (
        <span className="absolute left-1 top-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          Pending review
        </span>
      )}
      {photo.status === "draft" && (
        <button
          type="button"
          onClick={() => onRemove(photo)}
          className="absolute right-1 top-1 hidden rounded-md bg-background/90 p-1 text-destructive group-hover:block"
          aria-label="Remove photo"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// Mirrors the section layout of the admin ListingForm (basic info / details &
// pricing / location / amenities), trimmed to what a caretaker should set.
// Status, agent assignment, and "featured" stay admin-only controls — every
// caretaker-created listing is forced to NEW_LISTING_STATUS below. Photos
// aren't part of this form since the listing must exist first; caretakers
// add those afterward from the listing card's "Add photos" button.
function CreateListingForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: () => Promise<void>;
}) {
  const [locations, setLocations] = useState<Awaited<ReturnType<typeof getLocations>>>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [listingType, setListingType] = useState<"rent" | "sale">("rent");
  const [bedrooms, setBedrooms] = useState<number>(1);
  const [bathrooms, setBathrooms] = useState<number>(1);
  const [price, setPrice] = useState<number>(20000);
  const [deposit, setDeposit] = useState<number | "">("");
  const [locationId, setLocationId] = useState<string>("");
  const [addressDetail, setAddressDetail] = useState("");
  const [amenities, setAmenities] = useState<string[]>([]);

  useEffect(() => {
    getLocations().then(setLocations).catch((err) => toast.error((err as Error).message));
  }, []);

  useEffect(() => {
    if (!locationId && locations[0]) setLocationId(locations[0].id);
  }, [locations, locationId]);

  const submit = useMutation({
    mutationFn: async () => {
      const location = locations.find((l) => l.id === locationId);
      if (!location) throw new Error("Pick a location");

      const session = await getSession();
      if (!session) throw new Error("You must be signed in.");

      const { data, error } = await supabase
        .from("listings")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          listing_type: listingType,
          status: NEW_LISTING_STATUS,
          bedrooms,
          bathrooms,
          price,
          deposit: deposit === "" ? null : Number(deposit),
          location_id: location.id,
          address_detail: addressDetail.trim() || null,
          amenities,
          caretaker_id: session.user.id,
        })
        .select()
        .single();

      console.log("[CreateListingForm] insert result:", data, "error:", error);
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      toast.success("Listing created and sent for admin review");
      await onCreated();
    },
    onError: (e: Error) => toast.error(e.message || "Failed to create listing"),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) {
          toast.error("Title is required");
          return;
        }
        submit.mutate();
      }}
      className="mx-auto max-w-4xl space-y-8"
    >
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold">Basic info</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label>Listing type</Label>
            <Select value={listingType} onValueChange={(v) => setListingType(v as "rent" | "sale")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rent">For rent</SelectItem>
                <SelectItem value="sale">For sale</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          New listings are submitted as "{statusLabel(NEW_LISTING_STATUS)}" — an admin will
          publish it once reviewed.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold">Details & pricing</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <div>
            <Label htmlFor="beds">Bedrooms</Label>
            <Input id="beds" type="number" min={0} value={bedrooms} onChange={(e) => setBedrooms(Number(e.target.value))} />
          </div>
          <div>
            <Label htmlFor="baths">Bathrooms</Label>
            <Input id="baths" type="number" min={0} value={bathrooms} onChange={(e) => setBathrooms(Number(e.target.value))} />
          </div>
          <div>
            <Label htmlFor="price">Price (KES)</Label>
            <Input id="price" type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} required />
          </div>
          <div>
            <Label htmlFor="deposit">Deposit (KES)</Label>
            <Input id="deposit" type="number" min={0} value={deposit} onChange={(e) => setDeposit(e.target.value === "" ? "" : Number(e.target.value))} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold">Location</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <Label>Area</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.name}, {l.county}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="addr">Address detail</Label>
            <Input
              id="addr"
              value={addressDetail}
              onChange={(e) => setAddressDetail(e.target.value)}
              placeholder="e.g. Off Kinoo Road, near Acacia Plaza"
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold">Amenities</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ALL_AMENITIES.map((a) => {
            const checked = amenities.includes(a);
            return (
              <label key={a} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background p-3 text-sm">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => {
                    setAmenities((prev) =>
                      v ? [...prev, a] : prev.filter((x) => x !== a),
                    );
                  }}
                />
                <span className="capitalize">{a.replace(/_/g, " ")}</span>
              </label>
            );
          })}
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submit.isPending}>
          {submit.isPending ? "Creating…" : "Create listing"}
        </Button>
      </div>
    </form>
  );
}