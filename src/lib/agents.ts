import { supabase } from "./supabase";
import type { Agent } from "./types";

export type AgentDetail = Agent & { isActive: boolean };

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

// Used by the admin Agents page — unlike getAgents(), this also returns
// deactivated agents (and their isActive flag) so an admin can see and
// reactivate them.
export async function getAllAgents(): Promise<AgentDetail[]> {
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .order("full_name");

  if (error) throw error;

  return (data ?? []).map(
    (row): AgentDetail => ({
      id: row.id,
      fullName: row.full_name,
      phoneNumber: row.phone_number,
      whatsappNumber: row.whatsapp_number,
      isActive: row.is_active,
    }),
  );
}

export async function createAgent(input: {
  fullName: string;
  phoneNumber: string;
  whatsappNumber?: string | null;
}): Promise<AgentDetail> {
  const { data, error } = await supabase
    .from("agents")
    .insert({
      full_name: input.fullName,
      phone_number: input.phoneNumber,
      whatsapp_number: input.whatsappNumber?.trim() || null,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    fullName: data.full_name,
    phoneNumber: data.phone_number,
    whatsappNumber: data.whatsapp_number,
    isActive: data.is_active,
  };
}

export async function updateAgent(
  id: string,
  patch: Partial<{ fullName: string; phoneNumber: string; whatsappNumber: string | null }>,
): Promise<AgentDetail> {
  const row: Record<string, unknown> = {};
  if (patch.fullName !== undefined) row.full_name = patch.fullName;
  if (patch.phoneNumber !== undefined) row.phone_number = patch.phoneNumber;
  if (patch.whatsappNumber !== undefined) row.whatsapp_number = patch.whatsappNumber || null;

  const { data, error } = await supabase
    .from("agents")
    .update(row)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    fullName: data.full_name,
    phoneNumber: data.phone_number,
    whatsappNumber: data.whatsapp_number,
    isActive: data.is_active,
  };
}

export async function setAgentActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from("agents")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) throw error;
}