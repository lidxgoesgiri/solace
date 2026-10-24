"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioItem } from "@/components/ui/radio-cards";
import { saveRecord } from "@/lib/account/client";
import type { CheckinRecord, StoredRecord } from "@/lib/account/types";
import { localDay } from "@/lib/history";

const MOODS = ["1", "2", "3", "4", "5"] as const;
const NOTE_MAX = 280;

/**
 * Mood check-in (RW-04): 1–5 with words, an optional note, at most once a
 * day (a second check-in the same day replaces the first). No streaks.
 */
export function CheckinCard({ checkins }: { checkins: StoredRecord<"checkin">[] }) {
  const t = useTranslations("history");
  const format = useFormatter();
  const noteId = useId();
  const today = localDay(new Date());
  const existing = checkins.find((record) => record.value.day === today);
  const [mood, setMood] = useState<string>(existing ? String(existing.value.mood) : "");
  const [note, setNote] = useState(existing?.value.note ?? "");
  const [status, setStatus] = useState<"idle" | "busy" | "saved" | "error">("idle");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!mood || status === "busy") return;
    setStatus("busy");
    const value: CheckinRecord = {
      v: 1,
      mood: Number(mood) as CheckinRecord["mood"],
      note: note.trim().slice(0, NOTE_MAX),
      day: today,
      at: new Date().toISOString(),
    };
    try {
      await saveRecord("checkin", value, existing?.id);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  };

  const recent = [...checkins].sort((a, b) => b.value.at.localeCompare(a.value.at)).slice(0, 7);

  return (
    <section
      aria-labelledby="checkin-title"
      className="surface space-y-5 p-6 sm:p-8"
      data-testid="checkin"
    >
      <div className="space-y-1.5">
        <h2 id="checkin-title" className="text-2xl">
          {t("checkinTitle")}
        </h2>
        <p className="text-muted-foreground">{existing ? t("checkinDone") : t("checkinBody")}</p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <fieldset className="space-y-2">
          <legend id="mood-legend" className="mb-2 text-sm font-medium">
            {t("moodLegend")}
          </legend>
          <RadioGroup
            aria-labelledby="mood-legend"
            value={mood}
            values={MOODS}
            onValueChange={setMood}
            className="grid grid-cols-2 gap-2 sm:grid-cols-5"
          >
            {MOODS.map((value) => (
              <RadioItem
                key={value}
                value={value}
                data-testid={`checkin-mood-${value}`}
                className="flex min-h-12 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border bg-card px-2 py-2 text-center text-sm transition-colors hover:border-input data-[state=checked]:border-primary data-[state=checked]:bg-secondary"
              >
                <span className="numeral text-lg leading-none">{value}</span>
                <span>{t(`mood.${value}` as "mood.1")}</span>
              </RadioItem>
            ))}
          </RadioGroup>
        </fieldset>
        <div className="space-y-1.5">
          <label htmlFor={noteId} className="block text-sm font-medium">
            {t("noteLabel")}
          </label>
          <textarea
            id={noteId}
            rows={2}
            maxLength={NOTE_MAX}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t("notePlaceholder")}
            aria-describedby={`${noteId}-hint`}
            data-testid="checkin-note"
            className="block w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-base transition-colors hover:border-ink/60"
          />
          <p id={`${noteId}-hint`} className="text-sm text-muted-foreground">
            {t("noteHint")}
          </p>
        </div>
        <Button type="submit" disabled={!mood || status === "busy"} data-testid="checkin-save">
          {t("checkinSave")}
        </Button>
        <p
          role="status"
          aria-live="polite"
          className="min-h-5 text-sm"
          data-testid="checkin-status"
        >
          {status === "saved" ? t("checkinSaved") : status === "error" ? t("checkinError") : null}
        </p>
      </form>
      {recent.length > 0 ? (
        <div className="space-y-2 border-t pt-4">
          <h3 className="text-sm font-semibold">{t("recentTitle")}</h3>
          <ul className="space-y-1.5 text-sm" data-testid="checkin-recent">
            {recent.map((record) => (
              <li key={record.id} className="flex flex-wrap gap-x-3">
                <span className="text-muted-foreground">
                  {format.dateTime(new Date(record.value.at), { dateStyle: "medium" })}
                </span>
                <span className="font-medium">{t(`mood.${record.value.mood}` as "mood.1")}</span>
                {record.value.note ? (
                  <span className="text-muted-foreground">· {record.value.note}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
