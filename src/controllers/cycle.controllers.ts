import { Request, Response } from "express";
import prisma from "../lib/prismaClient";
import { cycleEntrySchema, quickNoteSchema, quickNoteUpdateSchema, quickNoteSyncSchema } from "../validation/cycleSchemas.validation";
import { ZodError } from "zod";
import ErrorHandler from "@/utils/errorHandler.js";

export const addCycleEntry = async (req: Request, res: Response) => {
  try {
    const parsed = cycleEntrySchema.parse(req.body);
    const userId = req.user?.sub;

    const entry = await prisma.cycleEntry.create({
      data: {
        userId: userId!,
        date: new Date(parsed.date),
        isPeriod: parsed.isPeriod,
        flowIntensity: parsed.flowIntensity,
  symptoms: parsed.symptoms ? JSON.parse(JSON.stringify(parsed.symptoms)) : undefined,
        notes: parsed.notes,
      },
    });

    res.json(entry);
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: err.issues });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to add cycle entry" });
  }
};

export const getCycleEntries = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.sub;
    const entries = await prisma.cycleEntry.findMany({
      where: { userId },
      orderBy: { date: "desc" },
    });
    res.json(entries);
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch entries" });
  }
};

// ===========================================
// QUICK NOTES CONTROLLERS
// ===========================================

export const getQuickNotes = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      throw new ErrorHandler("User not authenticated", 401);
    }

    const dateParam = req.query.date as string | undefined;

    const where: { userId: string; date?: { gte: Date; lt: Date } } = { userId };

    // If date parameter is provided, filter by that date
    if (dateParam) {
      const date = new Date(dateParam);
      if (isNaN(date.getTime())) {
        throw new ErrorHandler("Invalid date format. Use YYYY-MM-DD", 400);
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

    const notes = await prisma.quickNote.findMany({
      where,
      orderBy: { date: "desc" },
    });

    res.json({
      success: true,
      data: notes,
    });
  } catch (err) {
    if (err instanceof ErrorHandler) {
      throw err;
    }
    throw new ErrorHandler(
      err instanceof Error ? err.message : "Failed to fetch quick notes",
      500
    );
  }
};

export const createQuickNote = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      throw new ErrorHandler("User not authenticated", 401);
    }

    const parseResult = quickNoteSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ErrorHandler(
        "Invalid quick note data: " + parseResult.error.issues.map((e) => e.message).join(", "),
        400
      );
    }

    const noteData = parseResult.data;

    const note = await prisma.quickNote.create({
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
  } catch (err) {
    if (err instanceof ErrorHandler) {
      throw err;
    }
    throw new ErrorHandler(
      err instanceof Error ? err.message : "Failed to create quick note",
      500
    );
  }
};

export const updateQuickNote = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      throw new ErrorHandler("User not authenticated", 401);
    }

    const { id } = req.params;

    const parseResult = quickNoteUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ErrorHandler(
        "Invalid quick note data: " + parseResult.error.issues.map((e) => e.message).join(", "),
        400
      );
    }

    const updateData = parseResult.data;

    // Check if note exists and belongs to user
    const existingNote = await prisma.quickNote.findFirst({
      where: { id, userId },
    });

    if (!existingNote) {
      throw new ErrorHandler("Quick note not found", 404);
    }

    // Prepare update data
    const dataToUpdate: Record<string, unknown> = {};
    
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

    const updatedNote = await prisma.quickNote.update({
      where: { id },
      data: dataToUpdate,
    });

    res.json({
      success: true,
      data: updatedNote,
    });
  } catch (err) {
    if (err instanceof ErrorHandler) {
      throw err;
    }
    throw new ErrorHandler(
      err instanceof Error ? err.message : "Failed to update quick note",
      500
    );
  }
};

export const deleteQuickNote = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      throw new ErrorHandler("User not authenticated", 401);
    }

    const { id } = req.params;

    // Check if note exists and belongs to user
    const existingNote = await prisma.quickNote.findFirst({
      where: { id, userId },
    });

    if (!existingNote) {
      throw new ErrorHandler("Quick note not found", 404);
    }

    await prisma.quickNote.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Quick note deleted successfully",
    });
  } catch (err) {
    if (err instanceof ErrorHandler) {
      throw err;
    }
    throw new ErrorHandler(
      err instanceof Error ? err.message : "Failed to delete quick note",
      500
    );
  }
};

export const syncQuickNotes = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      throw new ErrorHandler("User not authenticated", 401);
    }

    const parseResult = quickNoteSyncSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ErrorHandler(
        "Invalid sync data: " + parseResult.error.issues.map((e) => e.message).join(", "),
        400
      );
    }

    const { notes } = parseResult.data;
    const syncedNotes: unknown[] = [];

    // Process each note
    for (const noteData of notes) {
      if (noteData.id) {
        // Update existing note
        const existingNote = await prisma.quickNote.findFirst({
          where: { id: noteData.id, userId },
        });

        if (existingNote) {
          const updated = await prisma.quickNote.update({
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
      } else {
        // Create new note
        const created = await prisma.quickNote.create({
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
  } catch (err) {
    if (err instanceof ErrorHandler) {
      throw err;
    }
    throw new ErrorHandler(
      err instanceof Error ? err.message : "Failed to sync quick notes",
      500
    );
  }
};
