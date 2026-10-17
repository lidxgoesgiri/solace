/**
 * Typed access to the help directory in `src/data/hotlines.json` (DL-01).
 * Services are chosen by country, not by language.
 */

import hotlinesJson from "@/data/hotlines.json";

export const COUNTRIES = ["ID", "US", "GB"] as const;
export type Country = (typeof COUNTRIES)[number];

export const SERVICE_TYPES = ["public", "government", "nonprofit"] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

export type ServiceCategory = "emergency" | "support";

export type ServiceChannel =
  | { kind: "phone"; number: string; label: string }
  | { kind: "web"; url: string; label: string };

export interface HelpService {
  id: string;
  country: Country;
  category: ServiceCategory;
  name: string;
  type: ServiceType;
  channels: ServiceChannel[];
  sourceUrl: string;
  verifiedAt: string | null;
}

export interface HelpDirectory {
  defaultCountry: Country;
  countries: Country[];
  services: HelpService[];
}

export const helpDirectory = hotlinesJson as HelpDirectory;

export function isCountry(value: unknown): value is Country {
  return COUNTRIES.includes(value as Country);
}

/** Services for one country and category, in the order of the data file. */
export function servicesFor(country: Country, category: ServiceCategory): HelpService[] {
  return helpDirectory.services.filter(
    (service) => service.country === country && service.category === category,
  );
}
