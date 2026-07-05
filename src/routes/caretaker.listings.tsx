import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ImageOff, Loader2, Trash2, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/caretaker/listings")({
  component: CaretakerListings,
});

// Photos are stored in the public "listing-photos" bucket, under
// `${listing.id}/${filename}`. Each upload creates a row in
// listing_photos with status "draft" until an admin publishes it.
const BUCKET = "listing-photos";

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

function CaretakerListings() {
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [photosByListing, setPhotosByListing] = useState<Record<string, Photo[]>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  async function loadListings() {
    console.log("[loadListings] starting");
    const session = await getSession();
    console.log("[loadListings] session:", session?.user?.id ?? "NO SESSION");
    if (!session) return;

    const { data: listingRows, error } = await supabase
      .from("listings")
      .select("id, title, status, location:locations(name)")
      .eq("status", "available")
      .eq("caretaker_id", session.user.id)
      .order("title", { ascending: true });

    console.log("[loadListings] listings result:", listingRows, "error:", error);

    if (error) {
      toast.error(error.message);
      return;
    }

    const rows = (listingRows ?? []) as unknown as Listing[];
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">Vacant listings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload fresh photos for your assigned apartments — an admin reviews and publishes
          them before they go live.
        </p>
      </div>

      {listings === null && <p className="text-sm text-muted-foreground">Loading…</p>}

      {listings !== null && listings.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <ImageOff className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium text-foreground">No vacant units assigned to you</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Check back once an admin assigns you a vacant apartment.
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
      <div>
        <p className="font-medium text-foreground">{listing.title}</p>
        {listing.location && (
          <p className="text-sm text-muted-foreground">{listing.location.name}</p>
        )}
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