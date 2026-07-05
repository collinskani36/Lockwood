import { Link } from "@tanstack/react-router";
import { Home } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <Home className="h-5 w-5" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-display text-lg font-semibold text-foreground">
              Lockwood
            </span>
            <span className="-mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Properties
            </span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            to="/"
            className="rounded-md px-3 py-2 font-medium text-foreground hover:bg-secondary"
            activeOptions={{ exact: true }}
            activeProps={{ className: "bg-secondary" }}
          >
            Listings
          </Link>
          <Link
            to="/admin"
            className="rounded-md px-3 py-2 font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            Sign In
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border/60 bg-secondary/40">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <p className="font-display text-xl font-semibold text-foreground">
            Lockwood Properties
          </p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Trusted letting agents serving Kinoo, Kikuyu, Sigona and the wider Kiambu
            County area.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-foreground">Contact</p>
          <p className="mt-2 text-muted-foreground">+254 712 345 678</p>
          <p className="text-muted-foreground">hello@lockwoodproperties.co.ke</p>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-foreground">Office</p>
          <p className="mt-2 text-muted-foreground">
            Kinoo Stage, Waiyaki Way
            <br />
            Kiambu County, Kenya
          </p>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Lockwood Properties. All rights reserved.
      </div>
    </footer>
  );
}