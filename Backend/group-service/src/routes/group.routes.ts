// src/routes/group.routes.ts
import { Router } from "express";
import * as groupController from "../controllers/group.controller";

const router = Router();

// Quản lý thông tin nhóm
router.post("/", groupController.createGroup);

// Quản lý thành viên trong nhóm
router.post("/:groupId/members", groupController.addMember);
router.delete("/:groupId/members/:userId", groupController.removeMember);
router.put("/:groupId/members/:userId/role", groupController.updateRole);
router.delete("/:groupId", groupController.deleteGroup);
router.post("/assign-leader", groupController.assignNewLeader);

export default router;
