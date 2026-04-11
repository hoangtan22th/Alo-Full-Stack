// src/routes/group.routes.ts
import { Router } from "express";
import multer from "multer";
import * as groupController from "../controllers/group.controller";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Quản lý thông tin nhóm
router.post(
  "/api/v1/groups",
  upload.single("avatarFile"),
  groupController.createGroup,
);
router.put(
  "/api/v1/groups/:groupId",
  upload.single("avatarFile"),
  groupController.updateGroup,
);

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
router.get("/api/v1/groups/me", groupController.getMyGroups);
router.get("/api/v1/groups/:groupId", groupController.getGroupById);

// Join requests
router.post(
  "/api/v1/groups/:groupId/join-requests",
  groupController.requestJoinGroup,
);
router.get(
  "/api/v1/groups/:groupId/join-requests",
  groupController.getJoinRequests,
);
router.post(
  "/api/v1/groups/:groupId/join-requests/:userId/approve",
  groupController.approveJoinRequest,
);
router.delete(
  "/api/v1/groups/:groupId/join-requests/:userId/reject",
  groupController.rejectJoinRequest,
);

// Cài đặt phê duyệt tham gia
router.put(
  "/api/v1/groups/:groupId/approval-setting",
  groupController.updateApprovalSetting,
);

// Cài đặt tham gia bằng link
router.put(
  "/api/v1/groups/:groupId/link-setting",
  groupController.updateLinkSetting,
);

// Lấy hoặc tạo hội thoại 1-1
router.post(
  "/api/v1/groups/direct",
  groupController.getOrCreateDirectConversation,
);

export default router;
