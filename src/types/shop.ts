// Speglar kolumnerna i Supabase-tabellerna (se PLAN.md, datamodell).
export type Service = {
  id: string;
  name: string;
  description: string;
  priceSek: number;
  durationMinutes: number;
  isActive: boolean;
  sortOrder: number;
};

export type Barber = {
  id: string;
  name: string;
  bio: string;
  photoUrl: string | null;
  isActive: boolean;
};

/** weekday: 0 = söndag ... 6 = lördag. null i opens/closes = stängt. */
export type OpeningHours = {
  weekday: number;
  opens: string | null;
  closes: string | null;
};

export type GalleryImage = {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
};
