import { z } from "zod";

export const cycleEntrySchema = z.object({
  date: z.string().datetime(),
  isPeriod: z.boolean(),
  flowIntensity: z.enum(["light", "medium", "heavy", "spotting"]).optional(),
  symptoms: z.record(z.any()).optional(),
  notes: z.string().optional(),
});

export type CycleEntryInput = z.infer<typeof cycleEntrySchema>;
