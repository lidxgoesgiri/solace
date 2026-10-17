"use client";

import { ExternalLink, Phone } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import {
  helpDirectory,
  isCountry,
  servicesFor,
  type Country,
  type HelpService,
  type ServiceCategory,
} from "@/lib/content";
import { cn } from "@/lib/utils";
import { usePrefsHydrated, usePrefsStore } from "@/store/prefs-store";

/** The selected country; the default until saved preferences have loaded. */
export function useSelectedCountry(): Country {
  const hydrated = usePrefsHydrated();
  const country = usePrefsStore((store) => store.country);
  return hydrated ? country : helpDirectory.defaultCountry;
}

/** Country picker for the help directory, separate from language (DL-01, K6). */
export function CountrySelect({ className }: { className?: string }) {
  const t = useTranslations("directory");
  const countries = useTranslations("countries");
  const country = useSelectedCountry();
  const setCountry = usePrefsStore((store) => store.setCountry);
  const id = useId();

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-medium">
        {t("countryLabel")}
      </label>
      <select
        id={id}
        data-testid="country-select"
        value={country}
        aria-describedby={`${id}-hint`}
        onChange={(event) => {
          if (isCountry(event.target.value)) setCountry(event.target.value);
        }}
        className="block min-h-11 w-full max-w-xs cursor-pointer rounded-xl border border-input bg-card px-3.5 text-base transition-colors hover:border-ink/60"
      >
        {helpDirectory.countries.map((code) => (
          <option key={code} value={code}>
            {countries(code)}
          </option>
        ))}
      </select>
      <p id={`${id}-hint`} className="text-sm text-muted-foreground">
        {t("countryHint")}
      </p>
    </div>
  );
}

function ServiceItem({ service }: { service: HelpService }) {
  const t = useTranslations("directory");
  const common = useTranslations("common");
  const format = useFormatter();

  return (
    <li
      data-testid={`service-${service.id}`}
      data-service-type={service.type}
      className="space-y-4 rounded-2xl border bg-card p-5 shadow-(--shadow-soft)"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-heading text-xl font-medium">{service.name}</p>
        <span className="rounded-full border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {t(`type.${service.type}`)}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {service.channels.map((channel) =>
          channel.kind === "phone" ? (
            <Button key={`${channel.number}-${channel.label}`} asChild>
              <a href={`tel:${channel.number}`} data-testid={`call-${service.id}-${channel.number}`}>
                <Phone aria-hidden="true" />
                {t("call", { label: channel.label })}
              </a>
            </Button>
          ) : (
            <Button key={channel.url} asChild variant="outline">
              <a
                href={channel.url}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`web-${service.id}`}
              >
                <ExternalLink aria-hidden="true" />
                {t("open", { label: channel.label })}
                <span className="sr-only"> {common("opensInNewTab")}</span>
              </a>
            </Button>
          ),
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        <a
          href={service.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-ink/30 underline-offset-3 hover:decoration-ink"
        >
          {t("source")}
          <span className="sr-only"> {common("opensInNewTab")}</span>
        </a>
        {service.verifiedAt ? (
          <>
            {" · "}
            {t("verifiedAt", {
              date: format.dateTime(new Date(service.verifiedAt), { dateStyle: "long" }),
            })}
          </>
        ) : null}
      </p>
    </li>
  );
}

interface ServiceListProps {
  category: ServiceCategory;
  className?: string;
}

/** Services of one category for the selected country, in data-file order. */
export function ServiceList({ category, className }: ServiceListProps) {
  const country = useSelectedCountry();
  const services = servicesFor(country, category);

  return (
    <ul className={cn("space-y-3", className)} data-testid={`services-${category}`}>
      {services.map((service) => (
        <ServiceItem key={service.id} service={service} />
      ))}
    </ul>
  );
}

/** Country picker plus emergency and support services. */
export function HelpDirectory({ className }: { className?: string }) {
  const t = useTranslations("directory");

  return (
    <div data-testid="help-directory" className={cn("space-y-6", className)}>
      <CountrySelect />
      <section className="space-y-3">
        <h3 className="text-xl">{t("emergency")}</h3>
        <ServiceList category="emergency" />
      </section>
      <section className="space-y-3">
        <h3 className="text-xl">{t("support")}</h3>
        <ServiceList category="support" />
      </section>
    </div>
  );
}
