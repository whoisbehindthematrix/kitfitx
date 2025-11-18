"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cycleEntrySchema = void 0;
const zod_1 = require("zod");
exports.cycleEntrySchema = zod_1.z.object({
    date: zod_1.z.string().datetime(),
    isPeriod: zod_1.z.boolean(),
    flowIntensity: zod_1.z.enum(["light", "medium", "heavy", "spotting"]).optional(),
    symptoms: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    notes: zod_1.z.string().optional(),
});
