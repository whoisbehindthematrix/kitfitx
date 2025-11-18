"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileSchema = void 0;
const zod_1 = require("zod");
exports.updateProfileSchema = zod_1.z.object({
    fullName: zod_1.z.string().optional(),
    dateOfBirth: zod_1.z.string().datetime().optional(),
    gender: zod_1.z.string().optional(),
    averageCycleLength: zod_1.z.number().optional(),
    periodDuration: zod_1.z.number().optional(),
    targetWeight: zod_1.z.number().optional(),
    activityLevel: zod_1.z.string().optional(),
    unitsSystem: zod_1.z.enum(["metric", "imperial"]).optional(),
});
