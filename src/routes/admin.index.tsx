import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Home, MessageSquare, CheckCircle2, Plus } from "lucide-react";
import { getListings } from "@/lib/listings";
import { getInquiries } from "@/lib/inquiries";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data: listings = [] } = useQuery({ queryKey: ["listings"], queryFn: getListings });
  const { data: inquiries = [] } = useQuery({ queryKey: ["inquiries"], queryFn: getInquiries });

  const total = listings.length;
  const available = listings.filter((l) => l.status === "available").length;
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const newInquiries = inquiries.filter((i) => new Date(i.createdAt).getTime() > oneWeekAgo).length;

  const stats = [
    { label: "Total listings", value: total, icon: Home, tone: "bg-primary/10 text-primary" },
    { label: "Available", value: available, icon: CheckCircle2, tone: "bg-success/15 text-success" },
    { label: "New inquiries (7 days)", value: newInquiries, icon: MessageSquare, tone: "bg-accent/15 text-accent" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Overview of your listings and inquiries.</p>
        </div>
        <Button asChild>
          <Link to="/admin/listings/new"><Plus className="mr-1 h-4 w-4" /> New listing</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className={`grid h-10 w-10 place-items-center rounded-lg ${tone}`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="mt-4 font-display text-3xl font-semibold">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Recent inquiries</h2>
          <Link to="/admin/inquiries" className="text-sm font-medium text-primary hover:underline">
            View all →
          </Link>
        </div>
        <ul className="mt-4 divide-y divide-border">
          {inquiries.slice(0, 5).map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="font-medium">{i.name}</p>
                <p className="text-sm text-muted-foreground">
                  {i.phoneNumber} · {i.contactChannel}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(i.createdAt).toLocaleDateString("en-KE")}
              </span>
            </li>
          ))}
          {inquiries.length === 0 && (
            <li className="py-4 text-sm text-muted-foreground">No inquiries yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
