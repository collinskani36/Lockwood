import { supabase } from "./supabase";
import type { Inquiry, InquiryRecord, InquiryStatus } from "./types";

function mapInquiry(row: any): InquiryRecord {
  return {
    id: row.id,
    listingId: row.listing_id,
    agentId: row.agent_id,
    name: row.name,
    phoneNumber: row.phone_number,
    message: row.message,
    preferredMoveIn: row.preferred_move_in,
    contactChannel: row.contact_channel,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function createInquiry(input: Inquiry): Promise<void> {
  const { error } = await supabase
    .from("inquiries")
    .insert({
      listing_id: input.listingId,
      agent_id: input.agentId,
      name: input.name,
      phone_number: input.phoneNumber,
      message: input.message,
      preferred_move_in: input.preferredMoveIn,
      contact_channel: input.contactChannel,
    });

  if (error) throw error;
}

export async function getInquiries(): Promise<InquiryRecord[]> {
  const { data, error } = await supabase
    .from("inquiries")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapInquiry);
}

export async function updateInquiryStatus(
  id: string,
  status: InquiryStatus,
): Promise<InquiryRecord> {
  const { data, error } = await supabase
    .from("inquiries")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return mapInquiry(data);
}