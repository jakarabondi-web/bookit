"use client";

import * as React from "react";
import { MediaPurpose } from "@/domain/media";
import type { BindingContext } from "@/domain/design-studio/bindings";
import { ImageUpload } from "@/components/ui/image-upload";

/**
 * The occasion.
 *
 * Everything typed here flows into the design through its bindings, and through
 * every other piece the suite will carry — so a venue is entered once and the
 * invitation, the details card and the welcome sign all say the same thing.
 *
 * It is deliberately a form rather than something the prompt console handles.
 * "Change the venue to Villa Rosa" is not a design instruction, and routing
 * facts through a language model is how a guest ends up at the wrong address.
 */

export interface OccasionDetailsProps {
  data: BindingContext;
  onChange: (data: BindingContext) => void;
  photo: { src: string | null; onChange: (url: string | null) => void } | null;
}

export function OccasionDetails({ data, onChange, photo }: OccasionDetailsProps) {
  const setCouple = (key: keyof BindingContext["couple"], value: string) => {
    const couple = { ...data.couple, [key]: value };
    // Initials follow the names until someone sets them by hand.
    if (key !== "initials" && data.couple.initials === derivedInitials(data.couple)) {
      couple.initials = derivedInitials(couple);
    }
    onChange({ ...data, couple });
  };

  const setEvent = (key: keyof BindingContext["event"], value: string) =>
    onChange({ ...data, event: { ...data.event, [key]: value } });

  return (
    <div className="flex flex-col gap-7 px-5 py-6">
      <Group title="Who" note="The names as they should appear on the card.">
        <Field
          id="first-name"
          label="First name"
          value={data.couple.firstName}
          onChange={(value) => setCouple("firstName", value)}
        />
        <Field
          id="second-name"
          label="Second name"
          value={data.couple.secondName}
          onChange={(value) => setCouple("secondName", value)}
        />
        <Field
          id="initials"
          label="Monogram"
          value={data.couple.initials}
          onChange={(value) => setCouple("initials", value)}
          hint="Two letters, or two with an ampersand."
        />
        <Field
          id="hosts"
          label="Host line"
          value={data.event.hosts}
          onChange={(value) => setEvent("hosts", value)}
          hint="Who is doing the inviting — “Together with their families”."
        />
      </Group>

      <Group title="When" note="Written out for the card, and short for the details line.">
        <Field
          id="date-long"
          label="Date, written"
          value={data.event.dateLong}
          onChange={(value) => setEvent("dateLong", value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field
            id="date"
            label="Date, short"
            value={data.event.date}
            onChange={(value) => setEvent("date", value)}
          />
          <Field
            id="time"
            label="Time"
            value={data.event.time}
            onChange={(value) => setEvent("time", value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field
            id="numeral"
            label="Day"
            value={data.event.dateNumeral}
            onChange={(value) => setEvent("dateNumeral", value)}
          />
          <Field
            id="month"
            label="Month"
            value={data.event.month}
            onChange={(value) => setEvent("month", value)}
          />
        </div>
      </Group>

      <Group title="Where">
        <Field
          id="venue"
          label="Venue"
          value={data.event.venue}
          onChange={(value) => setEvent("venue", value)}
        />
        <Field
          id="address"
          label="Address"
          value={data.event.address}
          onChange={(value) => setEvent("address", value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field
            id="city"
            label="Town"
            value={data.event.city}
            onChange={(value) => setEvent("city", value)}
          />
          <Field
            id="country"
            label="Country"
            value={data.event.country}
            onChange={(value) => setEvent("country", value)}
          />
        </div>
      </Group>

      <Group title="The rest">
        <Field
          id="dress-code"
          label="Dress code"
          value={data.event.dressCode}
          onChange={(value) => setEvent("dressCode", value)}
        />
        <Field
          id="rsvp-by"
          label="RSVP by"
          value={data.event.rsvpBy}
          onChange={(value) => setEvent("rsvpBy", value)}
        />
        <Field
          id="hashtag"
          label="Hashtag"
          value={data.event.hashtag}
          onChange={(value) => setEvent("hashtag", value)}
        />
      </Group>

      {photo ? (
        <Group title="Photograph" note="Fills the frame on the design. Kept private until you publish.">
          <ImageUpload
            id="studio-photo"
            label="Photograph"
            purpose={MediaPurpose.ECARD_PHOTO}
            value={photo.src}
            onChange={photo.onChange}
            hint="Portrait crops best — the frame on this design is taller than it is wide."
          />
        </Group>
      ) : null}
    </div>
  );
}

function derivedInitials(couple: BindingContext["couple"]): string {
  const first = couple.firstName.trim().charAt(0).toUpperCase();
  const second = couple.secondName.trim().charAt(0).toUpperCase();
  if (!first && !second) return "";
  return `${first} & ${second}`;
}

function Group({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{title}</h3>
      {note ? <p className="mt-1 text-xs leading-relaxed text-muted">{note}</p> : null}
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </section>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[11px] font-medium uppercase tracking-[0.12em] text-muted"
      >
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink outline-none transition-[border-color,box-shadow] placeholder:text-muted focus-visible:border-ink/30 focus-visible:ring-2 focus-visible:ring-ink/10"
      />
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
