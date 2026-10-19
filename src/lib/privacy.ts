/**
 * Sections of the privacy page (PRD 13), each with its statements. The texts
 * live in messages/{id,en}.json under `privacy`; privacy.test.ts checks that
 * the numbers they state match what the code does.
 */
export const PRIVACY_SECTIONS = [
  { id: "summary", title: "summaryTitle", items: ["summary1", "summary2", "summary3", "summary4"] },
  { id: "device", title: "deviceTitle", items: ["device1", "device2", "device3", "device4", "device5"] },
  { id: "account", title: "accountTitle", items: ["account1", "account2", "account3", "account4", "account5"] },
  { id: "ip", title: "ipTitle", items: ["ip1", "ip2"] },
  { id: "metrics", title: "metricsTitle", items: ["metrics1", "metrics2", "metrics3"] },
  { id: "crisis", title: "crisisTitle", items: ["crisis1", "crisis2"] },
  { id: "ai", title: "aiTitle", items: ["ai1", "ai2", "ai3", "ai4"] },
  { id: "providers", title: "providersTitle", items: ["providers1", "providers2", "providers3", "providers4"] },
  { id: "rights", title: "rightsTitle", items: ["rights1", "rights2", "rights3", "rights4"] },
  { id: "law", title: "lawTitle", items: ["law1", "law2"] },
  { id: "contact", title: "contactTitle", items: ["contact1"] },
] as const;
