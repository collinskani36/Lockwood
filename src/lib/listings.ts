import { supabase } from "./supabase";
import { getSession } from "./auth";
import type { Listing, ListingPhoto } from "./types";

const PHOTO_BUCKET = "listing-photos";

const LISTING_SELECT =
  "*, location:locations(*), agent:agents(*), photos:listing_photos(*)";

function photoPublicUrl(storagePath: string): string {
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(storagePath).data
    .publicUrl;
}

function mapListing(row: any): Listing {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    listingType: row.listing_type,
    status: row.status,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    price: Number(row.price),
    deposit: row.deposit === null ? null : Number(row.deposit),
    location: {
      id: row.location.id,
      name: row.location.name,
      county: row.location.county,
    },
    addressDetail: row.address_detail,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    amenities: row.amenities ?? [],
    agent: row.agent
      ? {
          id: row.agent.id,
          fullName: row.agent.full_name,
          phoneNumber: row.agent.phone_number,
          whatsappNumber: row.agent.whatsapp_number,
        }
      : null,
    isFeatured: row.is_featured,
    photos: (row.photos ?? [])
      .slice()
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map(
        (p: any): ListingPhoto => ({
          id: p.id,
          url: photoPublicUrl(p.storage_path),
          sortOrder: p.sort_order,
        }),
      ),
    createdAt: row.created_at,
  };
}

export async function getListings(): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    // Caretaker uploads land as "draft" until an admin publishes them —
    // this keeps unreviewed photos off both the public site and the admin
    // listings table. The row still comes back even with zero published
    // photos; ListingCard already falls back to a placeholder image.
    .eq("photos.status", "published")
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapListing);
}

export async function getListingById(id: string): Promise<Listing | null> {
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("photos.status", "published")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapListing(data) : null;
}

// NOTE: `photos` is intentionally ignored here. A listing_photos row needs
// a listing_id, which doesn't exist until the listing itself is created, so
// photo upload happens as a separate step via addListingPhoto() below —
// call it once for each file right after createListing() resolves.
export async function createListing(
  data: Omit<Listing, "id" | "createdAt">,
): Promise<Listing> {
  const { data: inserted, error } = await supabase
    .from("listings")
    .insert({
      title: data.title,
      description: data.description,
      listing_type: data.listingType,
      status: data.status,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      price: data.price,
      deposit: data.deposit,
      location_id: data.location.id,
      address_detail: data.addressDetail,
      latitude: data.latitude,
      longitude: data.longitude,
      amenities: data.amenities,
      agent_id: data.agent?.id ?? null,
      is_featured: data.isFeatured,
    })
    .select("id")
    .single();

  if (error) throw error;

  const created = await getListingById(inserted.id);
  if (!created) throw new Error("Failed to load newly created listing");
  return created;
}

export async function updateListing(
  id: string,
  patch: Partial<Listing>,
): Promise<Listing> {
  const row: Record<string, unknown> = {};

  if (patch.title !== undefined) row.title = patch.title;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.listingType !== undefined) row.listing_type = patch.listingType;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.bedrooms !== undefined) row.bedrooms = patch.bedrooms;
  if (patch.bathrooms !== undefined) row.bathrooms = patch.bathrooms;
  if (patch.price !== undefined) row.price = patch.price;
  if (patch.deposit !== undefined) row.deposit = patch.deposit;
  if (patch.location !== undefined) row.location_id = patch.location.id;
  if (patch.addressDetail !== undefined) row.address_detail = patch.addressDetail;
  if (patch.latitude !== undefined) row.latitude = patch.latitude;
  if (patch.longitude !== undefined) row.longitude = patch.longitude;
  if (patch.amenities !== undefined) row.amenities = patch.amenities;
  if (patch.agent !== undefined) row.agent_id = patch.agent?.id ?? null;
  if (patch.isFeatured !== undefined) row.is_featured = patch.isFeatured;

  const { error } = await supabase.from("listings").update(row).eq("id", id);
  if (error) throw error;

  const updated = await getListingById(id);
  if (!updated) throw new Error("Listing not found");
  return updated;
}

export async function deleteListing(id: string): Promise<void> {
  // Clean up storage objects first since there's no cascading delete on the bucket.
  const { data: photos } = await supabase
    .from("listing_photos")
    .select("storage_path")
    .eq("listing_id", id);

  if (photos && photos.length > 0) {
    await supabase.storage
      .from(PHOTO_BUCKET)
      .remove(photos.map((p) => p.storage_path));
  }

  const { error } = await supabase.from("listings").delete().eq("id", id);
  if (error) throw error;
}

// Replaces the old uploadListingPhoto(file) — that signature couldn't work
// against this schema because listing_photos.storage_path needs a listing_id.
// Call this once per file, after the listing exists (i.e. after createListing,
// or any time from an edit screen for an existing listing).
//
// This is the admin-facing upload path, so photos go live immediately
// (status: "published") — unlike the caretaker upload flow, which inserts
// status: "draft" and waits for an admin to approve it on /admin/photos.
export async function addListingPhoto(
  listingId: string,
  file: File,
  sortOrder = 0,
): Promise<ListingPhoto> {
  const ext = file.name.split(".").pop();
  const path = `${listingId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { upsert: false });
  if (uploadError) throw uploadError;

  const session = await getSession();

  const { data, error } = await supabase
    .from("listing_photos")
    .insert({
      listing_id: listingId,
      storage_path: path,
      sort_order: sortOrder,
      status: "published",
      uploaded_by: session?.user.id ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  return {
    id: data.id,
    url: photoPublicUrl(data.storage_path),
    sortOrder: data.sort_order,
  };
}

export async function deleteListingPhoto(
  photoId: string,
  storagePath: string,
): Promise<void> {
  await supabase.storage.from(PHOTO_BUCKET).remove([storagePath]);
  const { error } = await supabase
    .from("listing_photos")
    .delete()
    .eq("id", photoId);
  if (error) throw error;
}

// Same as deleteListingPhoto, but looks up the storage path for you — handy
// when the caller (e.g. ListingForm) only has the photo id on hand, since
// ListingPhoto doesn't carry storage_path on the client.
export async function deleteListingPhotoById(photoId: string): Promise<void> {
  const { data, error: fetchError } = await supabase
    .from("listing_photos")
    .select("storage_path")
    .eq("id", photoId)
    .single();
  if (fetchError) throw fetchError;

  await supabase.storage.from(PHOTO_BUCKET).remove([data.storage_path]);

  const { error } = await supabase
    .from("listing_photos")
    .delete()
    .eq("id", photoId);
  if (error) throw error;
}