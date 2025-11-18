"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TryCatch = exports.errorMiddleware = void 0;
const errorHandler_js_1 = __importDefault(require("../utils/errorHandler.js"));
const app_js_1 = require("../app.js");
const client_1 = require("@prisma/client");
const errorMiddleware = (err, req, res, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
next) => {
    // Handle Prisma errors
    if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
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
            ...(app_js_1.envMode === "DEVELOPMENT" && { error: err.message, code: err.code }),
        };
        return res.status(statusCode).json(response);
    }
    // Handle custom ErrorHandler
    if (err instanceof errorHandler_js_1.default) {
        const response = {
            success: false,
            message: err.message || "Internal Server Error",
        };
        if (app_js_1.envMode === "DEVELOPMENT") {
            response.error = err.stack;
        }
        return res.status(err.statusCode || 500).json(response);
    }
    // Handle generic errors
    const response = {
        success: false,
        message: err.message || "Internal Server Error",
    };
    if (app_js_1.envMode === "DEVELOPMENT") {
        response.error = err.stack;
    }
    return res.status(500).json(response);
};
exports.errorMiddleware = errorMiddleware;
const TryCatch = (passedFunc) => async (req, res, next) => {
    try {
        await passedFunc(req, res, next);
    }
    catch (error) {
        next(error);
    }
};
exports.TryCatch = TryCatch;
