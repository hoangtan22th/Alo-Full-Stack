import { Router } from "express";
import { getBulkPresence } from "../controllers/presence.controller";

const router = Router();

router.post("/bulk", getBulkPresence);

export default router;
