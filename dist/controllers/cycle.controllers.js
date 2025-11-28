"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncQuickNotes = exports.deleteQuickNote = exports.updateQuickNote = exports.createQuickNote = exports.getQuickNotes = exports.getCycleEntries = exports.addCycleEntry = void 0;
const prismaClient_1 = __importDefault(require("../lib/prismaClient"));
const cycleSchemas_validation_1 = require("../validation/cycleSchemas.validation");
const zod_1 = require("zod");
const errorHandler_js_1 = __importDefault(require("../utils/errorHandler.js"));
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
// ===========================================
// QUICK NOTES CONTROLLERS
// ===========================================
const getQuickNotes = async (req, res) => {
    try {
        const userId = req.user?.sub;
        if (!userId) {
            throw new errorHandler_js_1.default("User not authenticated", 401);
        }
        const dateParam = req.query.date;
        const where = { userId };
        // If date parameter is provided, filter by that date
        if (dateParam) {
            const date = new Date(dateParam);
            if (isNaN(date.getTime())) {
                throw new errorHandler_js_1.default("Invalid date format. Use YYYY-MM-DD", 400);
            }
            // Set start of day
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            // Set end of day
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            where.date = {
                gte: startOfDay,
                lt: endOfDay,
            };
        }
        const notes = await prismaClient_1.default.quickNote.findMany({
            where,
            orderBy: { date: "desc" },
        });
        res.json({
            success: true,
            data: notes,
        });
    }
    catch (err) {
        if (err instanceof errorHandler_js_1.default) {
            throw err;
        }
        throw new errorHandler_js_1.default(err instanceof Error ? err.message : "Failed to fetch quick notes", 500);
    }
};
exports.getQuickNotes = getQuickNotes;
const createQuickNote = async (req, res) => {
    try {
        const userId = req.user?.sub;
        if (!userId) {
            throw new errorHandler_js_1.default("User not authenticated", 401);
        }
        const parseResult = cycleSchemas_validation_1.quickNoteSchema.safeParse(req.body);
        if (!parseResult.success) {
            throw new errorHandler_js_1.default("Invalid quick note data: " + parseResult.error.issues.map((e) => e.message).join(", "), 400);
        }
        const noteData = parseResult.data;
        const note = await prismaClient_1.default.quickNote.create({
            data: {
                userId,
                date: new Date(noteData.date),
                title: noteData.title,
                icon: noteData.icon,
                text: noteData.text || null,
                reminder: noteData.reminder,
                reminderTime: noteData.reminderTime || null,
            },
        });
        res.status(201).json({
            success: true,
            data: note,
        });
    }
    catch (err) {
        if (err instanceof errorHandler_js_1.default) {
            throw err;
        }
        throw new errorHandler_js_1.default(err instanceof Error ? err.message : "Failed to create quick note", 500);
    }
};
exports.createQuickNote = createQuickNote;
const updateQuickNote = async (req, res) => {
    try {
        const userId = req.user?.sub;
        if (!userId) {
            throw new errorHandler_js_1.default("User not authenticated", 401);
        }
        const { id } = req.params;
        const parseResult = cycleSchemas_validation_1.quickNoteUpdateSchema.safeParse(req.body);
        if (!parseResult.success) {
            throw new errorHandler_js_1.default("Invalid quick note data: " + parseResult.error.issues.map((e) => e.message).join(", "), 400);
        }
        const updateData = parseResult.data;
        // Check if note exists and belongs to user
        const existingNote = await prismaClient_1.default.quickNote.findFirst({
            where: { id, userId },
        });
        if (!existingNote) {
            throw new errorHandler_js_1.default("Quick note not found", 404);
        }
        // Prepare update data
        const dataToUpdate = {};
        if (updateData.date) {
            dataToUpdate.date = new Date(updateData.date);
        }
        if (updateData.title !== undefined) {
            dataToUpdate.title = updateData.title;
        }
        if (updateData.icon !== undefined) {
            dataToUpdate.icon = updateData.icon;
        }
        if (updateData.text !== undefined) {
            dataToUpdate.text = updateData.text || null;
        }
        if (updateData.reminder !== undefined) {
            dataToUpdate.reminder = updateData.reminder;
        }
        if (updateData.reminderTime !== undefined) {
            dataToUpdate.reminderTime = updateData.reminderTime || null;
        }
        const updatedNote = await prismaClient_1.default.quickNote.update({
            where: { id },
            data: dataToUpdate,
        });
        res.json({
            success: true,
            data: updatedNote,
        });
    }
    catch (err) {
        if (err instanceof errorHandler_js_1.default) {
            throw err;
        }
        throw new errorHandler_js_1.default(err instanceof Error ? err.message : "Failed to update quick note", 500);
    }
};
exports.updateQuickNote = updateQuickNote;
const deleteQuickNote = async (req, res) => {
    try {
        const userId = req.user?.sub;
        if (!userId) {
            throw new errorHandler_js_1.default("User not authenticated", 401);
        }
        const { id } = req.params;
        // Check if note exists and belongs to user
        const existingNote = await prismaClient_1.default.quickNote.findFirst({
            where: { id, userId },
        });
        if (!existingNote) {
            throw new errorHandler_js_1.default("Quick note not found", 404);
        }
        await prismaClient_1.default.quickNote.delete({
            where: { id },
        });
        res.json({
            success: true,
            message: "Quick note deleted successfully",
        });
    }
    catch (err) {
        if (err instanceof errorHandler_js_1.default) {
            throw err;
        }
        throw new errorHandler_js_1.default(err instanceof Error ? err.message : "Failed to delete quick note", 500);
    }
};
exports.deleteQuickNote = deleteQuickNote;
const syncQuickNotes = async (req, res) => {
    try {
        const userId = req.user?.sub;
        if (!userId) {
            throw new errorHandler_js_1.default("User not authenticated", 401);
        }
        const parseResult = cycleSchemas_validation_1.quickNoteSyncSchema.safeParse(req.body);
        if (!parseResult.success) {
            throw new errorHandler_js_1.default("Invalid sync data: " + parseResult.error.issues.map((e) => e.message).join(", "), 400);
        }
        const { notes } = parseResult.data;
        const syncedNotes = [];
        // Process each note
        for (const noteData of notes) {
            if (noteData.id) {
                // Update existing note
                const existingNote = await prismaClient_1.default.quickNote.findFirst({
                    where: { id: noteData.id, userId },
                });
                if (existingNote) {
                    const updated = await prismaClient_1.default.quickNote.update({
                        where: { id: noteData.id },
                        data: {
                            date: new Date(noteData.date),
                            title: noteData.title,
                            icon: noteData.icon,
                            text: noteData.text || null,
                            reminder: noteData.reminder,
                            reminderTime: noteData.reminderTime || null,
                        },
                    });
                    syncedNotes.push(updated);
                }
            }
            else {
                // Create new note
                const created = await prismaClient_1.default.quickNote.create({
                    data: {
                        userId,
                        date: new Date(noteData.date),
                        title: noteData.title,
                        icon: noteData.icon,
                        text: noteData.text || null,
                        reminder: noteData.reminder,
                        reminderTime: noteData.reminderTime || null,
                    },
                });
                syncedNotes.push(created);
            }
        }
        res.json({
            success: true,
            message: "Quick notes synced successfully",
            data: syncedNotes,
        });
    }
    catch (err) {
        if (err instanceof errorHandler_js_1.default) {
            throw err;
        }
        throw new errorHandler_js_1.default(err instanceof Error ? err.message : "Failed to sync quick notes", 500);
    }
};
exports.syncQuickNotes = syncQuickNotes;
