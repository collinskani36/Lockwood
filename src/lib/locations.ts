import { supabase } from "./supabase";
import type { Location } from "./types";

export async function getLocations(): Promise<Location[]> {
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .order("name");

  if (error) throw error;

  return (data ?? []).map(
    (row): Location => ({
      id: row.id,
      name: row.name,
      county: row.county,
    }),
  );
}