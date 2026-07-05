import {
  Wifi,
  Car,
  Droplets,
  Sun,
  Shield,
  ArrowUpDown,
  Bath,
  Sparkles,
} from "lucide-react";

const AMENITY_META: Record<string, { label: string; Icon: typeof Wifi }> = {
  ensuite: { label: "Ensuite", Icon: Bath },
  parking: { label: "Parking", Icon: Car },
  water_backup: { label: "Water backup", Icon: Droplets },
  solar: { label: "Solar", Icon: Sun },
  cctv: { label: "CCTV", Icon: Shield },
  lift: { label: "Lift", Icon: ArrowUpDown },
  wifi: { label: "Wi-Fi", Icon: Wifi },
};

export function AmenityChip({ name }: { name: string }) {
  const meta = AMENITY_META[name] ?? { label: name, Icon: Sparkles };
  const { Icon, label } = meta;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
      <Icon className="h-3.5 w-3.5 text-primary" />
      {label}
    </span>
  );
}

export const ALL_AMENITIES = Object.keys(AMENITY_META);
