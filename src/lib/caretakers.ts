import { supabase } from "./supabase";

export type CaretakerOption = {
  id: string;
  fullName: string;
};

export type CaretakerDetail = {
  id: string;
  fullName: string;
  phoneNumber: string | null;
  isActive: boolean;
};

export async function getCaretakers(): Promise<CaretakerOption[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "caretaker")
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((p) => ({ id: p.id, fullName: p.full_name }));
}

// Includes inactive caretakers too — used on the admin caretakers page,
// where you need to see (and re-enable) deactivated accounts.
export async function getAllCaretakers(): Promise<CaretakerDetail[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone_number, is_active")
    .eq("role", "caretaker")
    .order("full_name", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((p) => ({
    id: p.id,
    fullName: p.full_name,
    phoneNumber: p.phone_number,
    isActive: p.is_active,
  }));
}

export async function getAssignedListingTitles(
  caretakerId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("listings")
    .select("title")
    .eq("caretaker_id", caretakerId)
    .order("title", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((l) => l.title as string);
}

export async function setCaretakerActive(
  caretakerId: string,
  isActive: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", caretakerId);

  if (error) throw error;
}

export async function createCaretaker(input: {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
}): Promise<{ id: string; email: string }> {
  const { data, error } = await supabase.functions.invoke("create-caretaker", {
    body: input,
  });

  if (error) {
    // supabase-js wraps non-2xx responses in a generic error; the function's
    // own error message is in the response body, so surface that instead.
    const message =
      (await error.context?.json?.().catch(() => null))?.error ??
      error.message;
    throw new Error(message);
  }

  return data as { id: string; email: string };
}

export async function getUnassignedListings(): Promise<
  { id: string; title: string }[]
> {
  const { data, error } = await supabase
    .from("listings")
    .select("id, title")
    .is("caretaker_id", null)
    .order("title", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getListingCaretaker(listingId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("listings")
    .select("caretaker_id")
    .eq("id", listingId)
    .single();

  if (error) throw error;
  return data?.caretaker_id ?? null;
}

export async function assignCaretaker(
  listingId: string,
  caretakerId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("listings")
    .update({ caretaker_id: caretakerId })
    .eq("id", listingId);

  if (error) throw error;
}