"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quickNoteSyncSchema = exports.quickNoteUpdateSchema = exports.quickNoteSchema = exports.cycleEntrySchema = void 0;
const zod_1 = require("zod");
exports.cycleEntrySchema = zod_1.z.object({
    date: zod_1.z.string().datetime(),
    isPeriod: zod_1.z.boolean(),
    flowIntensity: zod_1.z.enum(["light", "medium", "heavy", "spotting"]).optional(),
    symptoms: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    notes: zod_1.z.string().optional(),
});
exports.quickNoteSchema = zod_1.z.object({
    date: zod_1.z.string().datetime(),
    title: zod_1.z.string().min(1, "Title is required"),
    icon: zod_1.z.string().min(1, "Icon is required"),
    text: zod_1.z.string().optional(),
    reminder: zod_1.z.boolean().default(false),
    reminderTime: zod_1.z.union([
        zod_1.z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format. Use HH:mm"),
        zod_1.z.null(),
    ]).optional(),
});
exports.quickNoteUpdateSchema = exports.quickNoteSchema.partial().extend({
    date: zod_1.z.string().datetime().optional(),
    title: zod_1.z.string().min(1).optional(),
    icon: zod_1.z.string().min(1).optional(),
});
exports.quickNoteSyncSchema = zod_1.z.object({
    notes: zod_1.z.array(exports.quickNoteSchema.extend({
        id: zod_1.z.string().optional(), // ID may be provided for updates
    })),
});
