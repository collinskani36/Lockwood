import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";

import { getListings } from "@/lib/listings";
import { getLocations } from "../lib/locations";
import { formatKES } from "@/lib/format";
import { ListingCard } from "@/components/listing-card";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rentals in Kinoo, Kikuyu & Sigona — Lockwood Properties" },
      {
        name: "description",
        content:
          "Browse verified bedsitters, 1, 2 and 3 bedroom apartments for rent across Kiambu County.",
      },
    ],
  }),
  component: HomePage,
});

const PRICE_MIN = 5000;
const PRICE_MAX = 120000;

function HomePage() {
  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["listings"],
    queryFn: getListings,
  });
  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: getLocations,
  });

  const [search, setSearch] = useState("");
  const [locationId, setLocationId] = useState<string>("all");
  const [bedrooms, setBedrooms] = useState<string>("any");
  const [priceRange, setPriceRange] = useState<[number, number]>([PRICE_MIN, PRICE_MAX]);
  const [availableOnly, setAvailableOnly] = useState(true);

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      if (availableOnly && l.status !== "available") return false;
      if (locationId !== "all" && l.location.id !== locationId) return false;
      if (bedrooms !== "any") {
        if (bedrooms === "studio" && l.bedrooms !== 0) return false;
        if (bedrooms === "1" && l.bedrooms !== 1) return false;
        if (bedrooms === "2" && l.bedrooms !== 2) return false;
        if (bedrooms === "3+" && l.bedrooms < 3) return false;
      }
      if (l.price < priceRange[0] || l.price > priceRange[1]) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${l.title} ${l.description ?? ""} ${l.location.name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [listings, availableOnly, locationId, bedrooms, priceRange, search]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <section className="relative z-0 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={heroImage}
            alt="Modern apartments in Kiambu County"
            width={1600}
            height={1024}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/75 to-primary/40" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:py-32">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary-foreground/90 backdrop-blur">
            Lockwood Properties · Kiambu County
          </p>
          <h1 className="mt-6 max-w-3xl font-display text-4xl font-semibold leading-tight text-primary-foreground sm:text-5xl lg:text-6xl">
            Quality homes for rent in Kinoo, Kikuyu & Sigona.
          </h1>
          <p className="mt-5 max-w-xl text-base text-primary-foreground/85 sm:text-lg">
            Bedsitters, 1, 2 and 3 bedroom apartments — verified, photographed, and ready
            to move into.
          </p>
        </div>
      </section>

      <main className="relative z-10 mx-auto mt-10 w-full max-w-7xl flex-1 px-4 pb-20 sm:px-6">
        {/* Filter bar */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-lg sm:p-6">
          <div className="grid gap-4 md:grid-cols-12">
            <div className="md:col-span-4">
              <Label className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Search
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by title or area…"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="md:col-span-3">
              <Label className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Location
              </Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All locations</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Bedrooms
              </Label>
              <Select value={bedrooms} onValueChange={setBedrooms}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="studio">Bedsitter</SelectItem>
                  <SelectItem value="1">1 bed</SelectItem>
                  <SelectItem value="2">2 beds</SelectItem>
                  <SelectItem value="3+">3+ beds</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3">
              <Label className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Price: {formatKES(priceRange[0])} – {formatKES(priceRange[1])}
              </Label>
              <div className="px-1 pt-3">
                <Slider
                  min={PRICE_MIN}
                  max={PRICE_MAX}
                  step={1000}
                  value={priceRange}
                  onValueChange={(v) => setPriceRange([v[0], v[1]] as [number, number])}
                />
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
            <div className="flex items-center gap-2">
              <Switch
                id="available-only"
                checked={availableOnly}
                onCheckedChange={setAvailableOnly}
              />
              <Label htmlFor="available-only" className="text-sm font-medium">
                Available only
              </Label>
            </div>
            <p className="text-sm text-muted-foreground">
              <SlidersHorizontal className="mr-1.5 inline h-3.5 w-3.5" />
              {filtered.length} {filtered.length === 1 ? "listing" : "listings"}
            </p>
          </div>
        </div>

        {/* Results */}
        <div className="mt-10">
          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-[380px] animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <h3 className="font-display text-2xl font-semibold text-foreground">
                No listings match your filters
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Try widening your price range, removing the location filter, or turning
                off "Available only".
              </p>
              <Button
                variant="outline"
                className="mt-6"
                onClick={() => {
                  setSearch("");
                  setLocationId("all");
                  setBedrooms("any");
                  setPriceRange([PRICE_MIN, PRICE_MAX]);
                  setAvailableOnly(false);
                }}
              >
                Reset filters
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}