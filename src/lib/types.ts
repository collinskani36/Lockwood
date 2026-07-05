export type Location = { id: string; name: string; county: string };

export type Agent = {
  id: string;
  fullName: string;
  phoneNumber: string;
  whatsappNumber: string | null;
};

export type ListingPhoto = { id: string; url: string; sortOrder: number };

export type ListingStatus = "available" | "let" | "sold" | "pending";
export type ListingType = "rent" | "sale";

export type Listing = {
  id: string;
  title: string;
  description: string | null;
  listingType: ListingType;
  status: ListingStatus;
  bedrooms: number;
  bathrooms: number;
  price: number;
  deposit: number | null;
  location: Location;
  addressDetail: string | null;
  latitude: number | null;
  longitude: number | null;
  amenities: string[];
  agent: Agent | null;
  isFeatured: boolean;
  photos: ListingPhoto[];
  createdAt: string;
};

export type InquiryStatus = "new" | "contacted" | "closed" | "lost";
export type ContactChannel = "whatsapp" | "call" | "form";

export type Inquiry = {
  listingId: string | null;
  agentId: string | null;
  name: string;
  phoneNumber: string;
  message: string | null;
  preferredMoveIn: string | null;
  contactChannel: ContactChannel;
};

export type InquiryRecord = Inquiry & {
  id: string;
  status: InquiryStatus;
  createdAt: string;
};
