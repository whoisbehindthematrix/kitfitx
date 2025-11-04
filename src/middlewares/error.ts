import { NextFunction, Request, Response } from "express";
import ErrorHandler from "@/utils/errorHandler.js";
import { envMode } from "@/app.js";
import { Prisma } from "../generated/prisma";

export const errorMiddleware = (
  err: Error | ErrorHandler | Prisma.PrismaClientKnownRequestError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    let message = "Database operation failed";
    let statusCode = 500;

    switch (err.code) {
      case "P2002":
        message = "Unique constraint violation";
        statusCode = 409;
        break;
      case "P2025":
        message = "Record not found";
        statusCode = 404;
        break;
      default:
        message = err.message || "Database error occurred";
        statusCode = 500;
    }

    const response = {
      success: false,
      message,
      ...(envMode === "DEVELOPMENT" && { error: err.message, code: err.code }),
    };

    return res.status(statusCode).json(response);
  }

  // Handle custom ErrorHandler
  if (err instanceof ErrorHandler) {
    const response: {
      success: boolean;
      message: string;
      error?: string;
    } = {
      success: false,
      message: err.message || "Internal Server Error",
    };

    if (envMode === "DEVELOPMENT") {
      response.error = err.stack;
    }

    return res.status(err.statusCode || 500).json(response);
  }

  // Handle generic errors
  const response: {
    success: boolean;
    message: string;
    error?: string;
  } = {
    success: false,
    message: err.message || "Internal Server Error",
  };

  if (envMode === "DEVELOPMENT") {
    response.error = err.stack;
  }

  return res.status(500).json(response);
};

type ControllerType = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void | Response<unknown, Record<string, unknown>>>;

export const TryCatch =
  (passedFunc: ControllerType) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await passedFunc(req, res, next);
    } catch (error) {
      next(error);
    }
  };