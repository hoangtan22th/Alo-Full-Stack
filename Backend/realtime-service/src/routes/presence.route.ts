import { Router } from "express";
import { getBulkPresence, getMetrics } from "../controllers/presence.controller";

const router = Router();

router.post("/bulk", getBulkPresence);
router.get("/metrics", getMetrics);

export default router;
