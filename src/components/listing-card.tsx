import { Link } from "@tanstack/react-router";
import { BedDouble, Bath, MapPin, Sparkles } from "lucide-react";
import type { Listing } from "@/lib/types";
import { formatKES, formatBedrooms } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

const statusLabel: Record<Listing["status"], string> = {
  available: "Available",
  let: "Let",
  sold: "Sold",
  pending: "Pending",
};

export function ListingCard({ listing }: { listing: Listing }) {
  const cover =
    [...listing.photos].sort((a, b) => a.sortOrder - b.sortOrder)[0]?.url ??
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800";

  return (
    <Link
      to="/listings/$id"
      params={{ id: listing.id }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={cover}
          alt={listing.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {listing.isFeatured && (
            <Badge className="gap-1 border-0 bg-accent text-accent-foreground shadow">
              <Sparkles className="h-3 w-3" />
              Featured
            </Badge>
          )}
          {listing.status !== "available" && (
            <Badge variant="secondary" className="bg-foreground/85 text-background">
              {statusLabel[listing.status]}
            </Badge>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <p className="font-display text-2xl font-semibold leading-none text-foreground">
            {formatKES(listing.price)}
            <span className="ml-1 text-sm font-medium text-muted-foreground">
              /month
            </span>
          </p>
        </div>
        <h3 className="line-clamp-2 text-base font-semibold text-foreground">
          {listing.title}
        </h3>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          {listing.location.name}, {listing.location.county}
        </p>
        <div className="mt-auto flex items-center gap-4 border-t border-border/60 pt-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <BedDouble className="h-4 w-4" />
            {formatBedrooms(listing.bedrooms)}
          </span>
          <span className="flex items-center gap-1.5">
            <Bath className="h-4 w-4" />
            {listing.bathrooms} bath
          </span>
        </div>
      </div>
    </Link>
  );
}
