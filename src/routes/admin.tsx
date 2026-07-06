import { createFileRoute, Link, Outlet, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Home, LayoutGrid, MessageSquare, LogOut, Image, Wrench, Users, Contact } from "lucide-react";
import { isAuthenticated, signIn, signOut, getUserRole, type UserRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      const isAuthed = await isAuthenticated();
      if (cancelled) return;
      setAuthed(isAuthed);

      if (isAuthed) {
        const userRole = await getUserRole();
        if (cancelled) return;
        setRole(userRole);
        if (userRole === "caretaker") {
          navigate({ to: "/caretaker" });
        }
      }
    }

    checkAuth();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (authed === null) {
    return <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">Loading…</div>;
  }

  if (!authed) {
    return (
      <LoginScreen
        onAuthed={(userRole) => {
          setAuthed(true);
          setRole(userRole);
          if (userRole === "caretaker") {
            navigate({ to: "/caretaker" });
          }
        }}
      />
    );
  }

  // Caretakers are redirected above; render nothing while that happens
  // instead of flashing the admin dashboard at them.
  if (role === "caretaker") {
    return <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">Redirecting…</div>;
  }

  return (
    <AdminShell
      role={role}
      onSignedOut={() => {
        setAuthed(false);
        setRole(null);
      }}
    />
  );
}

function LoginScreen({ onAuthed }: { onAuthed: (role: UserRole | null) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <div className="grid min-h-screen place-items-center bg-secondary/40 px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lg">
        <Link to="/" className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <Home className="h-4 w-4" /> Back to site
        </Link>
        <h1 className="font-display text-2xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to manage listings and inquiries.
        </p>
        <form
          className="mt-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            try {
              await signIn(email, password);
              const role = await getUserRole();
              toast.success("Signed in");
              onAuthed(role);
            } catch (err) {
              toast.error((err as Error).message);
            } finally {
              setLoading(false);
            }
          }}
        >
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function AdminShell({
  role,
  onSignedOut,
}: {
  role: UserRole | null;
  onSignedOut: () => void;
}) {
  const router = useRouter();
  const navigate = useNavigate();
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
                {role ?? "Admin"}
              </span>
            </span>
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          <NavItem to="/admin" icon={LayoutGrid} exact>Dashboard</NavItem>
          <NavItem to="/admin/listings" icon={Home}>Listings</NavItem>
          <NavItem to="/admin/inquiries" icon={MessageSquare}>Inquiries</NavItem>
          <NavItem to="/admin/photos" icon={Image}>Photo Approvals</NavItem>
          <NavItem to="/admin/maintenance" icon={Wrench}>Maintenance</NavItem>
          <NavItem to="/admin/caretakers" icon={Users}>Caretakers</NavItem>
          <NavItem to="/admin/agents" icon={Contact}>Agents</NavItem>
          <div className="mt-auto border-t border-border pt-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={async () => {
                await signOut();
                onSignedOut();
                navigate({ to: "/admin" });
              }}
            >
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 lg:hidden">
          <Link to="/" className="font-display text-lg font-semibold">Lockwood Admin</Link>
          <div className="flex gap-1">
            <Link to="/admin" className="rounded px-2 py-1 text-xs">Dash</Link>
            <Link to="/admin/listings" className="rounded px-2 py-1 text-xs">Listings</Link>
            <Link to="/admin/inquiries" className="rounded px-2 py-1 text-xs">Inquiries</Link>
            <Link to="/admin/photos" className="rounded px-2 py-1 text-xs">Photos</Link>
            <Link to="/admin/maintenance" className="rounded px-2 py-1 text-xs">Maint.</Link>
            <Link to="/admin/caretakers" className="rounded px-2 py-1 text-xs">Care.</Link>
            <Link to="/admin/agents" className="rounded px-2 py-1 text-xs">Agents</Link>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}