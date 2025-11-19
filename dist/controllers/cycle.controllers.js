"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCycleEntries = exports.addCycleEntry = void 0;
const prismaClient_1 = __importDefault(require("../lib/prismaClient"));
const cycleSchemas_validation_1 = require("../validation/cycleSchemas.validation");
const zod_1 = require("zod");
const addCycleEntry = async (req, res) => {
    try {
        const parsed = cycleSchemas_validation_1.cycleEntrySchema.parse(req.body);
        const userId = req.user?.sub;
        const entry = await prismaClient_1.default.cycleEntry.create({
            data: {
                userId: userId,
                date: new Date(parsed.date),
                isPeriod: parsed.isPeriod,
                flowIntensity: parsed.flowIntensity,
                symptoms: parsed.symptoms ? JSON.parse(JSON.stringify(parsed.symptoms)) : undefined,
                notes: parsed.notes,
            },
        });
        res.json(entry);
    }
    catch (err) {
        if (err instanceof zod_1.ZodError) {
            return res.status(400).json({ error: err.issues });
        }
        console.error(err);
        res.status(500).json({ error: "Failed to add cycle entry" });
    }
};
exports.addCycleEntry = addCycleEntry;
const getCycleEntries = async (req, res) => {
    try {
        const userId = req.user?.sub;
        const entries = await prismaClient_1.default.cycleEntry.findMany({
            where: { userId },
            orderBy: { date: "desc" },
        });
        res.json(entries);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch entries" });
    }
};
exports.getCycleEntries = getCycleEntries;
