import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, ImageOff, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/photos")({
  component: AdminPhotoApprovals,
});

const BUCKET = "listing-photos";

type PendingPhoto = {
  id: string;
  storage_path: string;
  created_at: string;
  listing_id: string;
  listings: { title: string } | null;
  profiles: { full_name: string } | null;
};

function AdminPhotoApprovals() {
  const [photos, setPhotos] = useState<PendingPhoto[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadPhotos() {
    const { data, error } = await supabase
      .from("listing_photos")
      .select("id, storage_path, created_at, listing_id, listings(title), profiles:uploaded_by(full_name)")
      .eq("status", "draft")
      .order("created_at", { ascending: true });

    if (error) {
      toast.error(error.message);
      return;
    }
    setPhotos((data ?? []) as unknown as PendingPhoto[]);
  }

  useEffect(() => {
    loadPhotos();
  }, []);

  async function approve(photo: PendingPhoto) {
    setBusyId(photo.id);
    const { error } = await supabase
      .from("listing_photos")
      .update({ status: "published" })
      .eq("id", photo.id);
    setBusyId(null);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Photo published to the listing");
    loadPhotos();
  }

  async function reject(photo: PendingPhoto) {
    setBusyId(photo.id);
    const { error } = await supabase.from("listing_photos").delete().eq("id", photo.id);
    if (!error) {
      await supabase.storage.from(BUCKET).remove([photo.storage_path]);
    }
    setBusyId(null);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Photo rejected");
    loadPhotos();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">Photo approvals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review photos caretakers have uploaded before they go live on the listing page.
        </p>
      </div>

      {photos === null && <p className="text-sm text-muted-foreground">Loading…</p>}

      {photos !== null && photos.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <ImageOff className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium text-foreground">Nothing waiting for review</p>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {photos?.map((photo) => {
          const { data } = supabase.storage.from(BUCKET).getPublicUrl(photo.storage_path);
          return (
            <div key={photo.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <img src={data.publicUrl} alt="" className="h-44 w-full object-cover" />
              <div className="p-4">
                <p className="font-medium text-foreground">{photo.listings?.title ?? "Unknown listing"}</p>
                <p className="text-xs text-muted-foreground">
                  Uploaded by {photo.profiles?.full_name ?? "Unknown caretaker"}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 gap-1.5"
                    disabled={busyId === photo.id}
                    onClick={() => approve(photo)}
                  >
                    <Check className="h-4 w-4" /> Publish
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1.5"
                    disabled={busyId === photo.id}
                    onClick={() => reject(photo)}
                  >
                    <X className="h-4 w-4" /> Reject
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
