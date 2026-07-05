import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

import {
  assignCaretaker,
  createCaretaker,
  getAllCaretakers,
  getAssignedListingTitles,
  getUnassignedListings,
  setCaretakerActive,
  type CaretakerDetail,
} from "@/lib/caretakers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/admin/caretakers")({
  component: AdminCaretakers,
});

function AdminCaretakers() {
  const qc = useQueryClient();
  const { data: caretakers = [], isLoading } = useQuery({
    queryKey: ["caretakers-all"],
    queryFn: getAllCaretakers,
  });
  const {
    data: unassignedListings = [],
    isError: unassignedIsError,
    error: unassignedError,
  } = useQuery({
    queryKey: ["unassigned-listings"],
    queryFn: getUnassignedListings,
  });

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedListingIds, setSelectedListingIds] = useState<string[]>([]);
  const [apartmentSearch, setApartmentSearch] = useState("");
  const [lastCreated, setLastCreated] = useState<{ email: string; password: string } | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      const result = await createCaretaker({
        email,
        password,
        fullName,
        phoneNumber: phoneNumber || undefined,
      });
      for (const listingId of selectedListingIds) {
        await assignCaretaker(listingId, result.id);
      }
      return result;
    },
    onSuccess: (result) => {
      toast.success(`Account created for ${fullName}`);
      setLastCreated({ email: result.email, password });
      setFullName("");
      setPhoneNumber("");
      setEmail("");
      setPassword("");
      setSelectedListingIds([]);
      setApartmentSearch("");
      qc.invalidateQueries({ queryKey: ["caretakers-all"] });
      qc.invalidateQueries({ queryKey: ["caretakers"] });
      qc.invalidateQueries({ queryKey: ["unassigned-listings"] });
      qc.invalidateQueries({ queryKey: ["caretaker-listings", result.id] });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to create account"),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    create.mutate();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Caretakers</h1>
        <p className="mt-1 text-muted-foreground">
          Create caretaker logins and assign the apartment(s) they're responsible for.
          You can also reassign a specific apartment later from that listing's edit page.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <UserPlus className="h-5 w-5" /> New caretaker
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="ct-name">Full name</Label>
            <Input id="ct-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="ct-phone">Phone number</Label>
            <Input id="ct-phone" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+254…" />
          </div>
          <div>
            <Label htmlFor="ct-email">Email</Label>
            <Input id="ct-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="ct-password">Password</Label>
            <Input
              id="ct-password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="ct-apartment-search">Assign apartments (optional)</Label>

            {selectedListingIds.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedListingIds.map((id) => {
                  const listing = unassignedListings.find((l) => l.id === id);
                  if (!listing) return null;
                  return (
                    <span
                      key={id}
                      className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                    >
                      {listing.title}
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedListingIds((prev) => prev.filter((x) => x !== id))
                        }
                        aria-label={`Remove ${listing.title}`}
                        className="text-primary/70 hover:text-primary"
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            <Input
              id="ct-apartment-search"
              value={apartmentSearch}
              onChange={(e) => setApartmentSearch(e.target.value)}
              placeholder="Type an apartment name to search…"
              className="mt-2"
            />

            <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
              {unassignedIsError && (
                <p className="p-1 text-xs text-destructive">
                  Couldn't load apartments: {(unassignedError as Error)?.message}
                </p>
              )}
              {!unassignedIsError && unassignedListings.length === 0 && (
                <p className="p-1 text-xs text-muted-foreground">
                  No unassigned apartments right now — every listing already has a caretaker.
                </p>
              )}
              {!unassignedIsError &&
                unassignedListings.length > 0 &&
                (() => {
                  const filtered = unassignedListings.filter((listing) =>
                    listing.title.toLowerCase().includes(apartmentSearch.trim().toLowerCase()),
                  );
                  if (filtered.length === 0) {
                    return (
                      <p className="p-1 text-xs text-muted-foreground">
                        No apartments match "{apartmentSearch}".
                      </p>
                    );
                  }
                  return filtered.map((listing) => (
                    <label
                      key={listing.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg p-1.5 text-sm hover:bg-secondary/50"
                    >
                      <Checkbox
                        checked={selectedListingIds.includes(listing.id)}
                        onCheckedChange={(checked) => {
                          setSelectedListingIds((prev) =>
                            checked
                              ? [...prev, listing.id]
                              : prev.filter((id) => id !== listing.id),
                          );
                        }}
                      />
                      {listing.title}
                    </label>
                  ));
                })()}
            </div>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Creating…" : "Create caretaker account"}
            </Button>
          </div>
        </form>

        {lastCreated && (
          <div className="mt-4 rounded-lg border border-border bg-secondary/40 p-4 text-sm">
            <p className="font-medium text-foreground">Share these credentials with the caretaker:</p>
            <p className="mt-1 text-muted-foreground">Email: {lastCreated.email}</p>
            <p className="text-muted-foreground">Password: {lastCreated.password}</p>
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">All caretakers</h2>
        <div className="mt-3 space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && caretakers.length === 0 && (
            <p className="text-sm text-muted-foreground">No caretaker accounts yet.</p>
          )}
          {caretakers.map((caretaker) => (
            <CaretakerRow key={caretaker.id} caretaker={caretaker} />
          ))}
        </div>
      </section>
    </div>
  );
}

function CaretakerRow({ caretaker }: { caretaker: CaretakerDetail }) {
  const qc = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [apartmentSearch, setApartmentSearch] = useState("");

  const { data: listingTitles = [] } = useQuery({
    queryKey: ["caretaker-listings", caretaker.id],
    queryFn: () => getAssignedListingTitles(caretaker.id),
  });
  const {
    data: unassignedListings = [],
    isError: unassignedIsError,
    error: unassignedError,
  } = useQuery({
    queryKey: ["unassigned-listings"],
    queryFn: getUnassignedListings,
    enabled: pickerOpen,
  });

  const toggleActive = useMutation({
    mutationFn: (isActive: boolean) => setCaretakerActive(caretaker.id, isActive),
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["caretakers-all"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const assign = useMutation({
    mutationFn: (listingId: string) => assignCaretaker(listingId, caretaker.id),
    onSuccess: () => {
      toast.success("Apartment assigned");
      setApartmentSearch("");
      setPickerOpen(false);
      qc.invalidateQueries({ queryKey: ["caretaker-listings", caretaker.id] });
      qc.invalidateQueries({ queryKey: ["unassigned-listings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">{caretaker.fullName}</p>
          {caretaker.phoneNumber && (
            <p className="text-xs text-muted-foreground">{caretaker.phoneNumber}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {caretaker.isActive ? "Active" : "Deactivated"}
          </span>
          <Switch
            checked={caretaker.isActive}
            onCheckedChange={(v) => toggleActive.mutate(v)}
            disabled={toggleActive.isPending}
          />
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {listingTitles.length === 0
          ? "No apartments assigned yet"
          : `Assigned: ${listingTitles.join(", ")}`}
      </p>

      {pickerOpen ? (
        <div className="mt-3 space-y-2">
          {unassignedIsError && (
            <p className="text-xs text-destructive">
              Couldn't load apartments: {(unassignedError as Error)?.message}
            </p>
          )}
          <div className="flex items-center gap-2">
            <Input
              value={apartmentSearch}
              onChange={(e) => setApartmentSearch(e.target.value)}
              placeholder="Type an apartment name to search…"
              className="h-8 text-xs"
            />
            <Button size="sm" variant="ghost" onClick={() => setPickerOpen(false)}>
              Cancel
            </Button>
          </div>
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
            {!unassignedIsError && unassignedListings.length === 0 && (
              <p className="p-1 text-xs text-muted-foreground">No unassigned apartments right now.</p>
            )}
            {!unassignedIsError &&
              unassignedListings.length > 0 &&
              (() => {
                const filtered = unassignedListings.filter((listing) =>
                  listing.title.toLowerCase().includes(apartmentSearch.trim().toLowerCase()),
                );
                if (filtered.length === 0) {
                  return (
                    <p className="p-1 text-xs text-muted-foreground">
                      No apartments match "{apartmentSearch}".
                    </p>
                  );
                }
                return filtered.map((listing) => (
                  <button
                    key={listing.id}
                    type="button"
                    disabled={assign.isPending}
                    onClick={() => assign.mutate(listing.id)}
                    className="block w-full rounded-lg p-1.5 text-left text-sm hover:bg-secondary/50 disabled:opacity-50"
                  >
                    {listing.title}
                  </button>
                ));
              })()}
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" className="mt-3" onClick={() => setPickerOpen(true)}>
          + Assign apartment
        </Button>
      )}
    </div>
  );
}