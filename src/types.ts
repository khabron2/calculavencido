export type DurationType = 'days' | 'months' | 'years';

export interface Product {
  id: string;
  name: string;
  fabricationDate: string; // YYYY-MM-DD
  durationValue: number;
  durationType: DurationType;
  expirationDate: string; // YYYY-MM-DD
  createdAt: number; // timestamp
}

export type TextSizePref = 'normal' | 'large' | 'huge';

export interface AppSettings {
  isDarkMode: boolean;
  textSize: TextSizePref;
}
