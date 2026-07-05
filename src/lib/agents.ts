import { supabase } from "./supabase";
import type { Agent } from "./types";

export async function getAgents(): Promise<Agent[]> {
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("is_active", true)
    .order("full_name");

  if (error) throw error;

  return (data ?? []).map(
    (row): Agent => ({
      id: row.id,
      fullName: row.full_name,
      phoneNumber: row.phone_number,
      whatsappNumber: row.whatsapp_number,
    }),
  );
}