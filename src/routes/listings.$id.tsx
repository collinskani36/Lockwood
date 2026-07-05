import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  BedDouble,
  Bath,
  MapPin,
  Phone,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { getListingById } from "@/lib/listings";
import { createInquiry } from "@/lib/inquiries";
import { formatKES, formatBedrooms, buildWhatsAppLink } from "@/lib/format";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { AmenityChip } from "@/components/amenity-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/listings/$id")({
  loader: async ({ params, context }) => {
    const listing = await context.queryClient.ensureQueryData({
      queryKey: ["listing", params.id],
      queryFn: () => getListingById(params.id),
    });
    if (!listing) throw notFound();
    return listing;
  },
  head: ({ params }) => ({
    meta: [
      { title: `Listing — Lockwood Properties` },
      { name: "description", content: `View listing details for ${params.id}.` },
    ],
  }),
  component: ListingDetailPage,
  notFoundComponent: () => (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl flex-1 px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-semibold">Listing not found</h1>
        <p className="mt-2 text-muted-foreground">
          The listing you're looking for may have been let or removed.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Browse all listings</Link>
        </Button>
      </main>
      <SiteFooter />
    </div>
  ),
});

function ListingDetailPage() {
  const { id } = Route.useParams();
  const initialListing = Route.useLoaderData();
  const { data: listing } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => getListingById(id),
    initialData: initialListing,
  });

  if (!listing) return null;

  const photos = [...listing.photos].sort((a, b) => a.sortOrder - b.sortOrder);
  const waMessage = `Hi Lockwood Properties, I'm interested in "${listing.title}" (KES ${listing.price.toLocaleString("en-KE")}/month). Is it still available?`;

  // WhatsApp clicks skip the inquiry form entirely, so there's no name/phone
  // to capture here — this just records that a WhatsApp inquiry happened for
  // this listing so it shows up in /admin/inquiries with channel "whatsapp",
  // same as the form and call channels. It's fire-and-forget: a failed log
  // write should never block the visitor from actually opening WhatsApp.
  const logWhatsappInquiry = useMutation({
    mutationFn: createInquiry,
    onError: (e: Error) => console.error("[WhatsApp inquiry log] failed:", e),
  });

  function handleWhatsAppClick() {
    if (!listing) return;
    logWhatsappInquiry.mutate({
      listingId: listing.id,
      agentId: listing.agent?.id ?? null,
      name: "WhatsApp inquiry",
      phoneNumber: "Not provided",
      message: waMessage,
      preferredMoveIn: null,
      contactChannel: "whatsapp",
    });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to listings
        </Link>

        <Gallery photos={photos.map((p) => p.url)} title={listing.title} />

        <div className="mt-8 grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                {listing.isFeatured && (
                  <Badge className="mb-3 gap-1 border-0 bg-accent text-accent-foreground">
                    <Sparkles className="h-3 w-3" /> Featured
                  </Badge>
                )}
                <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">
                  {listing.title}
                </h1>
                <p className="mt-2 flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {listing.location.name}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-4xl font-semibold text-foreground">
                  {formatKES(listing.price)}
                </p>
                <p className="text-sm text-muted-foreground">per month</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-6 border-y border-border/60 py-4 text-sm">
              <span className="flex items-center gap-2">
                <BedDouble className="h-5 w-5 text-primary" />
                {formatBedrooms(listing.bedrooms)}
              </span>
              <span className="flex items-center gap-2">
                <Bath className="h-5 w-5 text-primary" />
                {listing.bathrooms} bathroom{listing.bathrooms === 1 ? "" : "s"}
              </span>
              {listing.deposit != null && (
                <span className="text-muted-foreground">
                  Deposit: <strong className="text-foreground">{formatKES(listing.deposit)}</strong>
                </span>
              )}
              <span className="ml-auto">
                <Badge
                  variant={listing.status === "available" ? "default" : "secondary"}
                  className={
                    listing.status === "available"
                      ? "border-0 bg-success text-success-foreground"
                      : ""
                  }
                >
                  {listing.status}
                </Badge>
              </span>
            </div>

            {listing.description && (
              <section className="mt-8">
                <h2 className="font-display text-xl font-semibold">About this property</h2>
                <p className="mt-3 whitespace-pre-line leading-relaxed text-muted-foreground">
                  {listing.description}
                </p>
              </section>
            )}

            {listing.amenities.length > 0 && (
              <section className="mt-8">
                <h2 className="font-display text-xl font-semibold">Amenities</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {listing.amenities.map((a) => (
                    <AmenityChip key={a} name={a} />
                  ))}
                </div>
              </section>
            )}

          </div>

          {/* Sidebar / CTAs */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
              {listing.agent && (
                <div className="border-b border-border/60 pb-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Listed by
                  </p>
                  <p className="mt-1 font-semibold">{listing.agent.fullName}</p>
                  <p className="text-sm text-muted-foreground">
                    {listing.agent.phoneNumber}
                  </p>
                </div>
              )}

              {listing.agent?.whatsappNumber && (
                <Button
                  asChild
                  size="lg"
                  className="w-full bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90"
                >
                  <a
                    href={buildWhatsAppLink(listing.agent.whatsappNumber, waMessage)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleWhatsAppClick}
                  >
                    <MessageCircle className="mr-2 h-5 w-5" />
                    Inquire via WhatsApp
                  </a>
                </Button>
              )}

              <InquiryDialog listingId={listing.id} agentId={listing.agent?.id ?? null} listingTitle={listing.title} />

              {listing.agent && (
                <Button asChild variant="outline" size="lg" className="w-full">
                  <a href={`tel:${listing.agent.phoneNumber}`}>
                    <Phone className="mr-2 h-4 w-4" />
                    Call {listing.agent.phoneNumber}
                  </a>
                </Button>
              )}

              {listing.agent?.whatsappNumber && (
                <p className="rounded-lg bg-secondary p-3 text-center text-xs text-secondary-foreground">
                  💬 Prefer to skip the form?{" "}
                  <a
                    href={buildWhatsAppLink(listing.agent.whatsappNumber, waMessage)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-primary underline"
                    onClick={handleWhatsAppClick}
                  >
                    Message us directly on WhatsApp
                  </a>
                  .
                </p>
              )}
            </div>
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function Gallery({ photos, title }: { photos: string[]; title: string }) {
  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState(false);
  if (photos.length === 0) return null;
  const main = photos[idx];
  const next = () => setIdx((i) => (i + 1) % photos.length);
  const prev = () => setIdx((i) => (i - 1 + photos.length) % photos.length);

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-4">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="relative col-span-4 aspect-[16/9] cursor-pointer overflow-hidden rounded-2xl bg-muted sm:col-span-3"
      >
        <img src={main} alt={title} className="h-full w-full object-cover" />
        {photos.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-background/85 p-2 shadow hover:bg-background"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-background/85 p-2 shadow hover:bg-background"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-background/85 px-2.5 py-1 text-xs font-medium">
              {idx + 1} / {photos.length}
            </span>
          </>
        )}
      </div>
      <div className="col-span-4 grid grid-cols-4 gap-3 sm:col-span-1 sm:grid-cols-1">
        {photos.slice(0, 4).map((p, i) => (
          <button
            key={p}
            type="button"
            onClick={() => setIdx(i)}
            className={`relative aspect-square overflow-hidden rounded-lg bg-muted ring-offset-2 transition ${
              i === idx ? "ring-2 ring-primary" : "opacity-80 hover:opacity-100"
            }`}
          >
            <img src={p} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl border-0 bg-transparent p-0 shadow-none">
          <DialogHeader className="sr-only">
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <img src={main} alt={title} className="max-h-[85vh] w-full rounded-lg object-contain" />
            {photos.length > 1 && (
              <>
                <button type="button" aria-label="Previous photo" onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/90 p-2"><ChevronLeft /></button>
                <button type="button" aria-label="Next photo" onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/90 p-2"><ChevronRight /></button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InquiryDialog({
  listingId,
  agentId,
  listingTitle,
}: {
  listingId: string;
  agentId: string | null;
  listingTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState(`I'd like more info on "${listingTitle}".`);
  const [preferredMoveIn, setPreferredMoveIn] = useState("");

  const mutation = useMutation({
    mutationFn: createInquiry,
    onSuccess: () => {
      toast.success("Inquiry sent!", {
        description: "We'll be in touch shortly. For faster response, message us on WhatsApp.",
      });
      setOpen(false);
      setName(""); setPhoneNumber(""); setPreferredMoveIn("");
    },
    onError: (e: Error) => toast.error(e.message ?? "Could not send inquiry"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" variant="outline" className="w-full">
          Send inquiry
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send an inquiry</DialogTitle>
          <DialogDescription>
            We'll get back to you within a few hours during business days.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim() || !phoneNumber.trim()) {
              toast.error("Name and phone number are required");
              return;
            }
            mutation.mutate({
              listingId,
              agentId,
              name: name.trim(),
              phoneNumber: phoneNumber.trim(),
              message: message.trim() || null,
              preferredMoveIn: preferredMoveIn || null,
              contactChannel: "form",
            });
          }}
        >
          <div>
            <Label htmlFor="iq-name">Your name</Label>
            <Input id="iq-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="iq-phone">Phone number</Label>
            <Input
              id="iq-phone"
              type="tel"
              inputMode="tel"
              placeholder="+254 7XX XXX XXX"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="iq-movein">Preferred move-in date</Label>
            <Input
              id="iq-movein"
              type="date"
              value={preferredMoveIn}
              onChange={(e) => setPreferredMoveIn(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="iq-msg">Message</Label>
            <Textarea id="iq-msg" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending} className="w-full">
              {mutation.isPending ? "Sending…" : "Send inquiry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}