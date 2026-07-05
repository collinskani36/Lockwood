import { createFileRoute, Link, Outlet, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Home, LayoutGrid, Camera, Wrench, LogOut } from "lucide-react";
import { isAuthenticated, signOut, getUserRole, type UserRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/caretaker")({
  component: CaretakerLayout,
});

function CaretakerLayout() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      const isAuthed = await isAuthenticated();
      if (cancelled) return;

      if (!isAuthed) {
        // No shared session — send them to the sign-in screen at /admin.
        navigate({ to: "/admin" });
        return;
      }

      const userRole = await getUserRole();
      if (cancelled) return;
      setAuthed(true);
      setRole(userRole);
    }

    checkAuth();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (authed === null) {
    return <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">Loading…</div>;
  }

  return (
    <CaretakerShell
      role={role}
      onSignedOut={async () => {
        await signOut();
        navigate({ to: "/admin" });
      }}
    />
  );
}

function CaretakerShell({
  role,
  onSignedOut,
}: {
  role: UserRole | null;
  onSignedOut: () => void;
}) {
  const router = useRouter();
  const pathname = router.state.location.pathname;

  const NavItem = ({
    to,
    icon: Icon,
    children,
    exact,
  }: {
    to: string;
    icon: typeof Home;
    children: React.ReactNode;
    exact?: boolean;
  }) => {
    const active = exact ? pathname === to : pathname.startsWith(to);
    return (
      <Link
        to={to}
        className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          active
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        }`}
      >
        <Icon className="h-4 w-4" />
        {children}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen bg-secondary/30">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card lg:flex lg:flex-col">
        <div className="border-b border-border px-6 py-5">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
              <Home className="h-5 w-5" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="font-display text-base font-semibold">Lockwood</span>
              <span className="-mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {role ?? "Caretaker"}
              </span>
            </span>
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          <NavItem to="/caretaker" icon={LayoutGrid} exact>Dashboard</NavItem>
          <NavItem to="/caretaker/listings" icon={Camera}>Vacant Listings</NavItem>
          <NavItem to="/caretaker/reports" icon={Wrench}>Report a Problem</NavItem>
          <div className="mt-auto border-t border-border pt-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={onSignedOut}
            >
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 lg:hidden">
          <Link to="/" className="font-display text-lg font-semibold">Lockwood Caretaker</Link>
          <div className="flex gap-1">
            <Link to="/caretaker" className="rounded px-2 py-1 text-xs">Dash</Link>
            <Link to="/caretaker/listings" className="rounded px-2 py-1 text-xs">Photos</Link>
            <Link to="/caretaker/reports" className="rounded px-2 py-1 text-xs">Reports</Link>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
