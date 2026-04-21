// src/routes/group.routes.ts
import { Router } from "express";
import multer from "multer";
import * as groupController from "../controllers/group.controller";
import * as labelController from "../controllers/label.controller";
import * as pinnedController from "../controllers/pinned.controller";
import * as noteController from "../controllers/note.controller";
import * as reminderController from "../controllers/reminder.controller";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// --- Quản lý Nhãn (Labels) ---
// Phải đặt trước các route có tham số :groupId để tránh xung đột
router.get("/api/v1/groups/labels", labelController.getLabels);
router.post("/api/v1/groups/labels", labelController.createLabel);
router.put("/api/v1/groups/labels/:id", labelController.updateLabel);
router.delete("/api/v1/groups/labels/:id", labelController.deleteLabel);

// Gán nhãn cho cuộc hội thoại
router.get(
  "/api/v1/groups/conversations/labels",
  labelController.getConversationLabels,
);
router.post(
  "/api/v1/groups/conversations/:conversationId/label",
  labelController.assignLabel,
);

// --- Ghim cuộc hội thoại ---
router.get(
  "/api/v1/groups/conversations/pinned",
  pinnedController.getPinnedList,
);
router.post(
  "/api/v1/groups/conversations/:conversationId/pin",
  pinnedController.togglePin,
);

// Quản lý thông tin nhóm
router.post(
  "/api/v1/groups",
  upload.single("avatarFile"),
  groupController.createGroup,
);
router.get("/api/v1/groups/me", groupController.getMyGroups);
router.post(
  "/api/v1/groups/direct",
  groupController.getOrCreateDirectConversation,
);
router.post("/api/v1/groups/assign-leader", groupController.assignNewLeader);

// --- Admin APIs ---
router.get("/api/v1/groups/admin/search", groupController.searchGroupsAdmin);
router.get("/api/v1/groups/admin/stats", groupController.getGroupStatsAdmin);
router.put(
  "/api/v1/groups/admin/:groupId/ban",
  groupController.toggleBanGroupAdmin,
);

// Các route có :groupId (PHẢI ĐẶT SAU CÁC ROUTE TĨNH)
router.get("/api/v1/groups/:groupId", groupController.getGroupById);
router.get("/api/v1/groups/:groupId/link-info", groupController.getGroupInfoForLink);
router.put(
  "/api/v1/groups/:groupId",
  upload.single("avatarFile"),
  groupController.updateGroup,
);
router.post("/api/v1/groups/:groupId/clear", groupController.clearConversation);
router.put(
  "/api/v1/groups/:groupId/folder",
  groupController.updateConversationFolder,
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
router.delete(
  "/api/v1/groups/:groupId/members/:userId/unblock",
  groupController.unblockMember,
);
router.delete("/api/v1/groups/:groupId", groupController.deleteGroup);

// Invitations
router.get("/api/v1/groups/invitations/me", groupController.getMyInvitations);
router.post(
  "/api/v1/groups/:groupId/invitations",
  groupController.inviteToGroup,
);
router.post(
  "/api/v1/groups/:groupId/invitations/accept",
  groupController.acceptInvitation,
);
router.post(
  "/api/v1/groups/:groupId/invitations/decline",
  groupController.declineInvitation,
);
router.get(
  "/api/v1/groups/join-requests/me",
  groupController.getMySentJoinRequests,
);
router.get(
  "/api/v1/groups/invitations/sent",
  groupController.getMySentInvitations,
);
router.post(
  "/api/v1/groups/:groupId/join-requests",
  groupController.requestJoinGroup,
);
router.delete(
  "/api/v1/groups/:groupId/join-requests/me",
  groupController.cancelJoinRequest,
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

// Cài đặt xem lịch sử tin nhắn
router.put(
  "/api/v1/groups/:groupId/history-setting",
  groupController.updateHistorySetting,
);

// Cài đặt nâng cao của nhóm
router.put("/api/v1/groups/:groupId/settings", groupController.updateSettings);

// --- Quản lý Ghi chú (Notes) ---
router.get(
  "/api/v1/groups/:groupId/notes",
  noteController.getNotesByConversation,
);
router.post("/api/v1/groups/:groupId/notes", noteController.createNote);
router.put("/api/v1/groups/notes/:noteId", noteController.updateNote);
router.delete("/api/v1/groups/notes/:noteId", noteController.deleteNote);

// --- Quản lý Nhắc hẹn (Reminders) ---
router.get(
  "/api/v1/groups/:groupId/reminders",
  reminderController.getRemindersByConversation,
);
router.post(
  "/api/v1/groups/:groupId/reminders",
  reminderController.createReminder,
);
router.put(
  "/api/v1/groups/reminders/:reminderId",
  reminderController.updateReminder,
);
router.delete(
  "/api/v1/groups/reminders/:reminderId",
  reminderController.deleteReminder,
);

export default router;
