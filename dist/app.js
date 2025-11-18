"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.envMode = void 0;
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const error_js_1 = require("./middlewares/error.js");
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_route_1 = __importDefault(require("./routes/auth.route"));
const cycle_route_1 = __importDefault(require("./routes/cycle.route"));
const food_route_1 = __importDefault(require("./routes/food.route"));
const profile_route_1 = __importDefault(require("./routes/profile.route"));
const prismaClient_1 = __importDefault(require("./lib/prismaClient"));
dotenv_1.default.config({ path: "./.env" });
exports.envMode = process.env.NODE_ENV?.trim() || "DEVELOPMENT";
const port = process.env.PORT || 3000;
const app = (0, express_1.default)();
app.use((0, helmet_1.default)({
    contentSecurityPolicy: exports.envMode !== "DEVELOPMENT",
    crossOriginEmbedderPolicy: exports.envMode !== "DEVELOPMENT",
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cors_1.default)({ origin: "*", credentials: true }));
app.use((0, morgan_1.default)("dev"));
// ---------- Routes ----------
app.use("/api/auth", auth_route_1.default);
app.use("/api/cycle", cycle_route_1.default);
app.use("/api/profile", profile_route_1.default);
app.use("/api/food", food_route_1.default);
app.get("/", (req, res) => {
    res.send("Hello, World!");
});
// ---------- Health Check ----------
app.get("/health", async (req, res) => {
    try {
        await prismaClient_1.default.$queryRaw `SELECT 1`; // simple DB ping
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
app.use(error_js_1.errorMiddleware);
app.listen(port, () => console.log("Server is working on Port:" + port + " in " + exports.envMode + " Mode."));
