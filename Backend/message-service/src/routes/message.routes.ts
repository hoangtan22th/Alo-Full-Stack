import { Router } from 'express';
import * as messageController from '../controllers/message.controller';
import multer from 'multer';

const router = Router();

// Cấu hình multer để lưu file vào bộ nhớ (memoryStorage) trước khi đẩy lên S3
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 105 * 1024 * 1024 // Giới hạn 105MB (trừ hao config Gateway)
  }
});

router.get('/:conversationId', messageController.getMessageHistory);
router.post('/', messageController.sendMessage);
router.delete('/:messageId', messageController.deleteMessage);
router.patch('/:messageId', messageController.editMessage);

// Route upload file lên S3
router.post('/upload', upload.single('file'), messageController.uploadFile);

// Route đánh dấu đã đọc tin nhắn
router.patch('/:conversationId/read', messageController.markMessagesAsRead);

export default router;