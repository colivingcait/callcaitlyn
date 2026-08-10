"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { syncContactToQuoAction } from "@/app/(app)/contacts/actions";
import { contactSchema, type ContactFormValues } from "@/lib/validation/contact";
import { Button, Input, Label, Select, Textarea, Card } from "@/components/ui";
import { CONTACT_TYPE_LABELS, TIMELINE_LABELS, REPRESENTING_LABELS, LEAD_SOURCES, cn } from "@/lib/utils";
import type { ContactWithRelations, PipelineStage, Tag } from "@/types/database";

export function ContactForm({
  contact,
  stages,
  tags,
}: {
  contact?: ContactWithRelations;
  stages: PipelineStage[];
  tags: Tag[];
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    contact?.contact_tags.map((ct) => ct.tags.id) ?? [],
  );

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: contact
      ? {
          first_name: contact.first_name,
          last_name: contact.last_name ?? "",
          email: contact.email ?? "",
          phone: contact.phone ?? "",
          secondary_phone: contact.secondary_phone ?? "",
          contact_type: contact.contact_type,
          representing: contact.representing,
          listing_address: contact.listing_address ?? "",
          listing_timeline: contact.listing_timeline,
          stage_id: contact.stage_id,
          lead_source: contact.lead_source ?? "",
          budget_min: contact.budget_min ?? undefined,
          budget_max: contact.budget_max ?? undefined,
          areas_of_interest: (contact.areas_of_interest ?? []).join(", "),
          timeline: contact.timeline,
          next_follow_up_at: contact.next_follow_up_at ? contact.next_follow_up_at.slice(0, 10) : "",
          birthday: contact.birthday ?? "",
          address_line1: contact.address_line1 ?? "",
          address_line2: contact.address_line2 ?? "",
          city: contact.city ?? "",
          state: contact.state ?? "",
          postal_code: contact.postal_code ?? "",
          notes: contact.notes ?? "",
        }
      : {
          contact_type: "buyer",
          representing: "buyer",
          timeline: "unknown",
          stage_id: stages[0]?.id ?? null,
        },
  });

  const representing = watch("representing");
  const showListingFields = representing === "seller" || representing === "both";

  async function onSubmit(values: ContactFormValues) {
    setSubmitting(true);
    setServerError("");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setServerError("Your session expired. Please sign in again.");
      setSubmitting(false);
      return;
    }

    const payload = {
      owner_id: user.id,
      first_name: values.first_name,
      last_name: values.last_name || "",
      email: values.email || null,
      phone: values.phone || null,
      secondary_phone: values.secondary_phone || null,
      contact_type: values.contact_type,
      representing: values.representing || null,
      listing_address: values.listing_address || null,
      listing_timeline: values.listing_timeline || null,
      stage_id: values.stage_id || null,
      lead_source: values.lead_source || null,
      budget_min: values.budget_min && !Number.isNaN(values.budget_min) ? values.budget_min : null,
      budget_max: values.budget_max && !Number.isNaN(values.budget_max) ? values.budget_max : null,
      areas_of_interest: values.areas_of_interest
        ? values.areas_of_interest.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      timeline: values.timeline,
      next_follow_up_at: values.next_follow_up_at ? new Date(values.next_follow_up_at).toISOString() : null,
      birthday: values.birthday || null,
      address_line1: values.address_line1 || null,
      address_line2: values.address_line2 || null,
      city: values.city || null,
      state: values.state || null,
      postal_code: values.postal_code || null,
      notes: values.notes || null,
    };

    let contactId = contact?.id;

    if (contact) {
      const { error } = await supabase.from("contacts").update(payload).eq("id", contact.id);
      if (error) {
        setServerError(error.message);
        setSubmitting(false);
        return;
      }
    } else {
      const { data, error } = await supabase.from("contacts").insert(payload).select("id").single();
      if (error || !data) {
        setServerError(error?.message ?? "Could not create contact.");
        setSubmitting(false);
        return;
      }
      contactId = data.id;
    }

    if (contactId) {
      await supabase.from("contact_tags").delete().eq("contact_id", contactId);
      if (selectedTagIds.length > 0) {
        await supabase
          .from("contact_tags")
          .insert(selectedTagIds.map((tagId) => ({ contact_id: contactId, tag_id: tagId })));
      }
    }

    if (contactId && payload.phone) void syncContactToQuoAction(contactId);

    router.push(`/contacts/${contactId}`);
    router.refresh();
  }

  function toggleTag(id: string) {
    setSelectedTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pb-10">
      <Card className="space-y-4">
        <h2 className="text-sm font-semibold text-neutral-700">Basics</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="first_name">First name</Label>
            <Input id="first_name" {...register("first_name")} />
            {errors.first_name && <p className="mt-1 text-xs text-red-600">{errors.first_name.message}</p>}
          </div>
          <div>
            <Label htmlFor="last_name">Last name</Label>
            <Input id="last_name" {...register("last_name")} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" type="tel" {...register("phone")} placeholder="(555) 555-1234" />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message as string}</p>}
          </div>
        </div>
        <div>
          <Label htmlFor="secondary_phone">Secondary phone</Label>
          <Input id="secondary_phone" type="tel" {...register("secondary_phone")} />
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-sm font-semibold text-neutral-700">Pipeline</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="contact_type">Type</Label>
            <Select id="contact_type" {...register("contact_type")}>
              {Object.entries(CONTACT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="stage_id">Stage</Label>
            <Select id="stage_id" {...register("stage_id")}>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="representing">Representing</Label>
            <Select id="representing" {...register("representing")}>
              <option value="">Not applicable</option>
              {Object.entries(REPRESENTING_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="lead_source">Lead source</Label>
            <Input id="lead_source" list="lead-sources" {...register("lead_source")} />
            <datalist id="lead-sources">
              {LEAD_SOURCES.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
        </div>
        <div>
          <Label htmlFor="timeline">Timeline</Label>
          <Select id="timeline" {...register("timeline")}>
            {Object.entries(TIMELINE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="next_follow_up_at">Next follow-up</Label>
          <Input id="next_follow_up_at" type="date" {...register("next_follow_up_at")} />
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-sm font-semibold text-neutral-700">Buying details</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="budget_min">Budget min</Label>
            <Input id="budget_min" type="number" step="1000" {...register("budget_min")} />
          </div>
          <div>
            <Label htmlFor="budget_max">Budget max</Label>
            <Input id="budget_max" type="number" step="1000" {...register("budget_max")} />
          </div>
        </div>
        <div>
          <Label htmlFor="areas_of_interest">Areas of interest</Label>
          <Input id="areas_of_interest" {...register("areas_of_interest")} placeholder="Comma-separated, e.g. Downtown, Riverside" />
        </div>
      </Card>

      {showListingFields && (
        <Card className="space-y-4">
          <h2 className="text-sm font-semibold text-neutral-700">Listing details</h2>
          <div>
            <Label htmlFor="listing_address">Listing address</Label>
            <Input id="listing_address" {...register("listing_address")} placeholder="What are they selling?" />
          </div>
          <div>
            <Label htmlFor="listing_timeline">Listing timeline</Label>
            <Select id="listing_timeline" {...register("listing_timeline")}>
              <option value="">Unknown</option>
              {Object.entries(TIMELINE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </Card>
      )}

      <Card className="space-y-4">
        <h2 className="text-sm font-semibold text-neutral-700">Address</h2>
        <Input {...register("address_line1")} placeholder="Address line 1" />
        <Input {...register("address_line2")} placeholder="Address line 2" />
        <div className="grid grid-cols-3 gap-3">
          <Input {...register("city")} placeholder="City" />
          <Input {...register("state")} placeholder="State" />
          <Input {...register("postal_code")} placeholder="ZIP" />
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-700">Tags</h2>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => {
            const active = selectedTagIds.includes(tag.id);
            return (
              <button
                type="button"
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition",
                  active ? "border-transparent text-white" : "border-neutral-200 text-neutral-600",
                )}
                style={active ? { backgroundColor: tag.color } : undefined}
              >
                {tag.name}
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-700">Notes</h2>
        <div>
          <Label htmlFor="birthday">Birthday</Label>
          <Input id="birthday" type="date" {...register("birthday")} />
        </div>
        <Textarea rows={4} {...register("notes")} placeholder="Anything else worth remembering…" />
      </Card>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <div className="flex gap-3">
        <Button type="submit" size="lg" disabled={submitting} className="flex-1">
          {submitting ? "Saving…" : contact ? "Save changes" : "Add contact"}
        </Button>
      </div>
    </form>
  );
}
