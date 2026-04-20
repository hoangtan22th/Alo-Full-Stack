import { Router } from "express";
import * as messageController from "../controllers/message.controller";
import multer from "multer";

const router = Router();

// Cấu hình multer để lưu file vào bộ nhớ (memoryStorage) trước khi đẩy lên S3
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 105 * 1024 * 1024, // Giới hạn 105MB (trừ hao config Gateway)
  },
});

router.get("/:conversationId", messageController.getMessageHistory);
router.get("/:conversationId/search", messageController.searchMessages);
router.get("/:conversationId/pinned", messageController.getPinnedMessages);
router.patch("/:messageId/pin", messageController.pinMessage);
router.patch("/:messageId/unpin", messageController.unpinMessage);
router.post("/", messageController.sendMessage);
router.patch("/:messageId/revoke", messageController.revokeMessage);
router.delete("/:messageId/me", messageController.deleteMessageForMe);
router.patch("/:messageId", messageController.editMessage);

// Route upload file lên S3
router.post("/upload", upload.single("file"), messageController.uploadFile);
router.post("/upload/images", upload.array("files", 20), messageController.uploadImages);

// Hành động trên từng ảnh trong album
router.patch("/:messageId/images/:index/revoke", messageController.revokeImageInGroup);
router.delete("/:messageId/images/:index/me", messageController.deleteImageInGroupForMe);

// Route đánh dấu đã đọc tin nhắn
router.patch("/:conversationId/read", messageController.markMessagesAsRead);

// Route cho cảm xúc (Reactions)
router.post("/:messageId/reactions", messageController.reactToMessage);
router.delete("/:messageId/reactions", messageController.clearReactions);

export default router;
