export function formatKES(amount: number): string {
  return `KES ${amount.toLocaleString("en-KE")}`;
}

export function formatKESPerMonth(amount: number): string {
  return `${formatKES(amount)}/month`;
}

export function formatBedrooms(n: number): string {
  if (n === 0) return "Bedsitter";
  if (n === 1) return "1 Bedroom";
  return `${n} Bedrooms`;
}

export function buildWhatsAppLink(
  number: string,
  message: string,
): string {
  const digits = number.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
