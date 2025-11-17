import ErrorHandler from "../utils/errorHandler.js";
import { envMode } from "../app.js";
import { Prisma } from "../generated/prisma";
export const errorMiddleware = (err, req, res, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
next) => {
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
        const response = {
            success: false,
            message: err.message || "Internal Server Error",
        };
        if (envMode === "DEVELOPMENT") {
            response.error = err.stack;
        }
        return res.status(err.statusCode || 500).json(response);
    }
    // Handle generic errors
    const response = {
        success: false,
        message: err.message || "Internal Server Error",
    };
    if (envMode === "DEVELOPMENT") {
        response.error = err.stack;
    }
    return res.status(500).json(response);
};
export const TryCatch = (passedFunc) => async (req, res, next) => {
    try {
        await passedFunc(req, res, next);
    }
    catch (error) {
        next(error);
    }
};
