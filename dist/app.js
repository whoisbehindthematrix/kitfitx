import express from "express";
import helmet from "helmet";
import cors from "cors";
import { errorMiddleware } from "./middlewares/error.js";
import morgan from "morgan";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.route";
import cycleRoutes from "./routes/cycle.route";
import foodRoutes from "./routes/food.route";
import profileRoutes from "./routes/profile.route";
import prisma from "./lib/prismaClient";
dotenv.config({ path: "./.env" });
export const envMode = process.env.NODE_ENV?.trim() || "DEVELOPMENT";
const port = process.env.PORT || 3000;
const app = express();
app.use(helmet({
    contentSecurityPolicy: envMode !== "DEVELOPMENT",
    crossOriginEmbedderPolicy: envMode !== "DEVELOPMENT",
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: "*", credentials: true }));
app.use(morgan("dev"));
// ---------- Routes ----------
app.use("/api/auth", authRoutes);
app.use("/api/cycle", cycleRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/food", foodRoutes);
app.get("/", (req, res) => {
    res.send("Hello, World!");
});
// ---------- Health Check ----------
app.get("/health", async (req, res) => {
    try {
        await prisma.$queryRaw `SELECT 1`; // simple DB ping
        res.status(200).send({ status: "ok", database: "connected" });
    }
    catch (err) {
        console.error("Health check failed:", err);
        res.status(500).send({ status: "error", database: "disconnected" });
    }
});
// your routes here
// app.use("*", (req, res) => {
//   res.status(404).json({
//     success: false,
//     message: "Page not found",
//   });
// });
app.use(errorMiddleware);
app.listen(port, () => console.log("Server is working on Port:" + port + " in " + envMode + " Mode."));
