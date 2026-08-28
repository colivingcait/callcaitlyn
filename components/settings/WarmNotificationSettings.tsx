"use client";

import { useState } from "react";
import { updateWarmNotificationRule } from "@/app/(app)/settings/warm-notification-actions";
import type { WarmNotificationSettings as Settings } from "@/types/database";

const RULES: { key: "rule_triple_open" | "rule_past_client_click" | "rule_hot_twice" | "rule_every_open"; label: string }[] = [
  { key: "rule_triple_open", label: "Three opens of the same email in a day" },
  { key: "rule_past_client_click", label: "A past client clicking after six quiet months" },
  { key: "rule_hot_twice", label: "Anyone Hot / Ready opening twice in a week" },
  { key: "rule_every_open", label: "Every single open" },
];

export function WarmNotificationSettings({ settings }: { settings: Settings | null }) {
  const [values, setValues] = useState({
    rule_triple_open: settings?.rule_triple_open ?? true,
    rule_past_client_click: settings?.rule_past_client_click ?? true,
    rule_hot_twice: settings?.rule_hot_twice ?? true,
    rule_every_open: settings?.rule_every_open ?? false,
  });

  async function toggle(key: (typeof RULES)[number]["key"]) {
    const next = !values[key];
    setValues((v) => ({ ...v, [key]: next }));
    await updateWarmNotificationRule(key, next);
  }

  return (
    <div>
      <p className="mb-2 text-sm text-neutral-500">
        Pushed when someone&apos;s reading your emails without replying - quiet hours 9am-9pm, nothing fires outside that window.
      </p>
      <div className="space-y-2">
        {RULES.map((rule) => (
          <label key={rule.key} className="flex items-center gap-2.5 text-sm text-neutral-700">
            <input type="checkbox" checked={values[rule.key]} onChange={() => toggle(rule.key)} className="h-4 w-4 rounded border-neutral-300" />
            {rule.label}
          </label>
        ))}
      </div>
    </div>
  );
}
