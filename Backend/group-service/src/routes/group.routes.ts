// src/routes/group.routes.ts
import { Router } from "express";
import * as groupController from "../controllers/group.controller";

const router = Router();

// Quản lý thông tin nhóm
router.post("/", groupController.createGroup);

// Quản lý thành viên trong nhóm
router.post("/api/v1/groups/:groupId/members", groupController.addMember);
router.delete(
  "/api/v1/groups/:groupId/members/:userId",
  groupController.removeMember,
);
router.put(
  "/api/v1/groups/:groupId/members/:userId/role",
  groupController.updateRole,
);
router.delete("/api/v1/groups/:groupId", groupController.deleteGroup);
router.post("/api/v1/groups/assign-leader", groupController.assignNewLeader);

export default router;
