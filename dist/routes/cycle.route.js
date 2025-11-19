"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const cycle_controllers_1 = require("../controllers/cycle.controllers");
const router = express_1.default.Router();
router.post("/", auth_middleware_1.authMiddleware, cycle_controllers_1.addCycleEntry);
router.get("/", auth_middleware_1.authMiddleware, cycle_controllers_1.getCycleEntries);
exports.default = router;
