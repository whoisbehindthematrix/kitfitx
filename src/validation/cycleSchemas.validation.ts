import { z } from "zod";

export const cycleEntrySchema = z.object({
  date: z.string().datetime(),
  isPeriod: z.boolean(),
  flowIntensity: z.enum(["light", "medium", "heavy", "spotting"]).optional(),
  symptoms: z.record(z.string(), z.any()).optional(),
  notes: z.string().optional(),
});

export type CycleEntryInput = z.infer<typeof cycleEntrySchema>;

export const quickNoteSchema = z.object({
  date: z.string().datetime(),
  title: z.string().min(1, "Title is required"),
  icon: z.string().min(1, "Icon is required"),
  text: z.string().optional(),
  reminder: z.boolean().default(false),
  reminderTime: z.union([
    z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format. Use HH:mm"),
    z.null(),
  ]).optional(),
});

export const quickNoteUpdateSchema = quickNoteSchema.partial().extend({
  date: z.string().datetime().optional(),
  title: z.string().min(1).optional(),
  icon: z.string().min(1).optional(),
});

export const quickNoteSyncSchema = z.object({
  notes: z.array(quickNoteSchema.extend({
    id: z.string().optional(), // ID may be provided for updates
  })),
});

export type QuickNoteInput = z.infer<typeof quickNoteSchema>;
export type QuickNoteUpdateInput = z.infer<typeof quickNoteUpdateSchema>;
export type QuickNoteSyncInput = z.infer<typeof quickNoteSyncSchema>;
