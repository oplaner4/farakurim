import * as z from "zod";
import type { Venue, VenueFile } from "@/content/types/venues";
import { kebabIdSchema } from "@/lib/shared/schema";
import { foldPlace } from "./checks";

// The rules of the venue list, in one place: src/content/venues.ts checks src/content/venues.json with them when the
// site loads it, and the venue scripts check a new venue and the file before they write.

const text = z.string().trim().min(1);

export const venueSchema = z.strictObject({
  id: kebabIdSchema,
  name: text,
  address: z.strictObject({
    streetAddress: text.optional(),
    part: text.optional(),
    postalCode: z
      .string()
      .regex(/^\d{3} \d{2}$/, 'must be "123 45"')
      .optional(),
    municipality: text,
    country: text,
  }),
  position: z.strictObject({ lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) }),
  aliases: z.array(text).optional(),
  catalogueHref: z.url().optional(),
}) satisfies z.ZodType<Venue>;

export const venueFileSchema = z.strictObject({ venues: z.array(venueSchema) }).superRefine(({ venues }, ctx) => {
  venues.forEach((venue, i) => {
    const earlier = venues.slice(0, i);
    if (earlier.some((v) => v.id === venue.id)) {
      ctx.addIssue({ code: "custom", path: ["venues", i, "id"], message: `${venue.id} is already taken` });
    }
    // An alias is matched within its municipality, so it must not mean another venue there: not another's name, nor
    // an alias of one before it (the later of two equal aliases is the one reported).
    const { municipality } = venue.address;
    for (const alias of venue.aliases ?? []) {
      const same = (t: string) => foldPlace(t) === foldPlace(alias);
      const other = venues.find(
        (v, j) =>
          j !== i &&
          v.address.municipality === municipality &&
          (same(v.name) || (j < i && (v.aliases ?? []).some(same))),
      );
      if (other) {
        ctx.addIssue({
          code: "custom",
          path: ["venues", i, "aliases"],
          message: `"${alias}" already means ${other.id} in ${municipality}`,
        });
      }
    }
  });
}) satisfies z.ZodType<VenueFile>;
