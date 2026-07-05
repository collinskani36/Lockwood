import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Camera, Wrench } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getSession, getCurrentProfile } from "@/lib/auth";
import { getAssignedListingTitles } from "@/lib/caretakers";

export const Route = createFileRoute("/caretaker/")({
  component: CaretakerDashboard,
});

function CaretakerDashboard() {
  const [fullName, setFullName] = useState<string | null>(null);
  const [apartmentNames, setApartmentNames] = useState<string[] | null>(null);
  const [vacantCount, setVacantCount] = useState<number | null>(null);
  const [openReportsCount, setOpenReportsCount] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const session = await getSession();
      if (!session) return;

      const profile = await getCurrentProfile();
      setFullName(profile?.fullName ?? null);

      const titles = await getAssignedListingTitles(session.user.id);
      setApartmentNames(titles);

      const { count: vacant } = await supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("status", "available")
        .eq("caretaker_id", session.user.id);
      setVacantCount(vacant ?? 0);

      const { count: open } = await supabase
        .from("maintenance_reports")
        .select("id", { count: "exact", head: true })
        .eq("caretaker_id", session.user.id)
        .eq("status", "open");
      setOpenReportsCount(open ?? 0);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Welcome back{fullName ? `, ${fullName}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {apartmentNames === null
            ? "Loading your assigned apartments…"
            : apartmentNames.length === 0
              ? "You don't have any apartments assigned yet — check with an admin."
              : apartmentNames.length === 1
                ? `You're the caretaker for ${apartmentNames[0]}.`
                : `You're the caretaker for: ${apartmentNames.join(", ")}.`}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          to="/caretaker/listings"
          icon={Camera}
          label="Vacant units"
          value={vacantCount}
          hint="Add or update photos"
        />
        <StatCard
          to="/caretaker/reports"
          icon={Wrench}
          label="Your open reports"
          value={openReportsCount}
          hint="Waiting on agents"
        />
      </div>
    </div>
  );
}

function StatCard({
  to,
  icon: Icon,
  label,
  value,
  hint,
}: {
  to: string;
  icon: typeof Camera;
  label: string;
  value: number | null;
  hint: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors hover:bg-secondary/40"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-2xl font-semibold text-foreground">{value === null ? "—" : value}</p>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
    </Link>
  );
}