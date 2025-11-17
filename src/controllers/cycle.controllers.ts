import { Request, Response } from "express";
import prisma from "../lib/prismaClient";
import { cycleEntrySchema } from "../validation/cycleSchemas.validation";
import { ZodError } from "zod";

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
