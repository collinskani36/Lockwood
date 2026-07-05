import type { Listing } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";

import { addListingPhoto, deleteListingPhotoById } from "@/lib/listings";
import { getLocations } from "@/lib/locations";
import { getAgents } from "@/lib/agents";
import { ALL_AMENITIES } from "@/components/amenity-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export type ListingFormValues = Omit<Listing, "id" | "createdAt">;

export function ListingForm({
  initial,
  onSubmit,
  submitLabel,
}: {
  initial?: Listing | null;
  onSubmit: (values: ListingFormValues) => Promise<Listing | void>;
  submitLabel: string;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: locations = [] } = useQuery({ queryKey: ["locations"], queryFn: getLocations });
  const { data: agents = [] } = useQuery({ queryKey: ["agents"], queryFn: getAgents });

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [listingType, setListingType] = useState<Listing["listingType"]>(initial?.listingType ?? "rent");
  const [status, setStatus] = useState<Listing["status"]>(initial?.status ?? "available");
  const [bedrooms, setBedrooms] = useState<number>(initial?.bedrooms ?? 1);
  const [bathrooms, setBathrooms] = useState<number>(initial?.bathrooms ?? 1);
  const [price, setPrice] = useState<number>(initial?.price ?? 20000);
  const [deposit, setDeposit] = useState<number | "">(initial?.deposit ?? "");
  const [locationId, setLocationId] = useState<string>(initial?.location.id ?? "");
  const [addressDetail, setAddressDetail] = useState(initial?.addressDetail ?? "");
  const [latitude, setLatitude] = useState<number | "">(initial?.latitude ?? "");
  const [longitude, setLongitude] = useState<number | "">(initial?.longitude ?? "");
  const [amenities, setAmenities] = useState<string[]>(initial?.amenities ?? []);
  const [agentId, setAgentId] = useState<string>(initial?.agent?.id ?? "");
  const [isFeatured, setIsFeatured] = useState<boolean>(initial?.isFeatured ?? false);
  const [photos, setPhotos] = useState<Listing["photos"]>(initial?.photos ?? []);
  const [removingPhotoId, setRemovingPhotoId] = useState<string | null>(null);

  useEffect(() => {
    if (!locationId && locations[0]) setLocationId(locations[0].id);
    if (!agentId && agents[0]) setAgentId(agents[0].id);
  }, [locations, agents, locationId, agentId]);

  const upload = useMutation({
    mutationFn: async (files: FileList) => {
      if (!initial) {
        throw new Error("Save the listing before adding photos.");
      }
      const uploaded: Listing["photos"] = [];
      for (let i = 0; i < files.length; i++) {
        const photo = await addListingPhoto(initial.id, files[i], photos.length + i);
        uploaded.push(photo);
      }
      return uploaded;
    },
    onSuccess: (uploaded) => {
      setPhotos((prev) => [...prev, ...uploaded]);
    },
    onError: (e: Error) => toast.error(e.message || "Failed to upload photo"),
  });

  async function handleRemovePhoto(photoId: string) {
    setRemovingPhotoId(photoId);
    try {
      await deleteListingPhotoById(photoId);
      setPhotos((prev) => prev.filter((x) => x.id !== photoId).map((x, i) => ({ ...x, sortOrder: i })));
    } catch (err) {
      toast.error((err as Error).message || "Failed to remove photo");
    } finally {
      setRemovingPhotoId(null);
    }
  }

  const submit = useMutation({
    mutationFn: async () => {
      const location = locations.find((l) => l.id === locationId);
      const agent = agents.find((a) => a.id === agentId) ?? null;
      if (!location) throw new Error("Pick a location");
      const values: ListingFormValues = {
        title: title.trim(),
        description: description.trim() || null,
        listingType,
        status,
        bedrooms,
        bathrooms,
        price,
        deposit: deposit === "" ? null : Number(deposit),
        location,
        addressDetail: addressDetail.trim() || null,
        latitude: latitude === "" ? null : Number(latitude),
        longitude: longitude === "" ? null : Number(longitude),
        amenities,
        agent,
        isFeatured,
        photos,
      };
      return await onSubmit(values);
    },
    onSuccess: (result) => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["listings"] });
      if (!initial && result && "id" in result) {
        // New listing — go straight to its edit screen so photos can be added.
        navigate({ to: "/admin/listings/$id/edit", params: { id: result.id } });
      } else {
        navigate({ to: "/admin/listings" });
      }
    },
    onError: (e: Error) => toast.error(e.message ?? "Failed to save"),
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
            <Select value={listingType} onValueChange={(v) => setListingType(v as Listing["listingType"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rent">For rent</SelectItem>
                <SelectItem value="sale">For sale</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as Listing["status"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="let">Let</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
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
            <Input id="addr" value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)} placeholder="e.g. Off Kinoo Road, near Acacia Plaza" />
          </div>
          <div>
            <Label htmlFor="lat">Latitude</Label>
            <Input id="lat" type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value === "" ? "" : Number(e.target.value))} />
          </div>
          <div>
            <Label htmlFor="lng">Longitude</Label>
            <Input id="lng" type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value === "" ? "" : Number(e.target.value))} />
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

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold">Photos</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((p, idx) => (
            <div key={p.id} className="relative aspect-square overflow-hidden rounded-lg bg-muted">
              <img src={p.url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label="Remove photo"
                disabled={removingPhotoId === p.id}
                onClick={() => handleRemovePhoto(p.id)}
                className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-background/90 text-foreground shadow disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              {idx === 0 && (
                <span className="absolute bottom-1 left-1 rounded bg-primary/90 px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  Cover
                </span>
              )}
            </div>
          ))}
          {initial ? (
            <label className="grid aspect-square cursor-pointer place-items-center rounded-lg border-2 border-dashed border-border bg-background text-center text-xs text-muted-foreground hover:border-primary hover:text-primary">
              <div className="flex flex-col items-center gap-1 p-2">
                <Upload className="h-5 w-5" />
                {upload.isPending ? "Uploading…" : "Add photo"}
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    upload.mutate(e.target.files);
                    e.target.value = "";
                  }
                }}
              />
            </label>
          ) : (
            <div className="grid aspect-square place-items-center rounded-lg border-2 border-dashed border-border bg-background p-2 text-center text-xs text-muted-foreground">
              Save the listing first, then add photos here.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold">Agent & visibility</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <Label>Assigned agent</Label>
            <Select value={agentId} onValueChange={setAgentId}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
            <div>
              <p className="font-medium">Featured listing</p>
              <p className="text-xs text-muted-foreground">Show this property at the top of results.</p>
            </div>
            <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
          </div>
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => navigate({ to: "/admin/listings" })}>
          Cancel
        </Button>
        <Button type="submit" disabled={submit.isPending}>
          {submit.isPending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}