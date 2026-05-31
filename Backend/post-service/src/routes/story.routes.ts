import { Router } from 'express';
import { storyController } from '../controllers/story.controller';
import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';

const router = Router();

// Danh sách MIME type được phép cho Story
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif', 'image/jpg', 'image/svg+xml',
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v', 'video/3gpp', 'video/avi', 'video/mpeg',
  'application/octet-stream',
];

const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error(`Loại file không được hỗ trợ cho Story: ${file.mimetype}`);
    (err as any).status = 400;
    cb(err);
  }
};

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB cho Story
    files: 1,                     // Mỗi Story chỉ 1 file
  },
});

// ============ Story Management ============

// Đăng Story mới (1 ảnh hoặc 1 video)
router.post('/', upload.single('file'), storyController.createStory);

// Lấy story feed (của bản thân + bạn bè, nhóm theo user)
router.get('/feed', storyController.getStoryFeed);

// Lấy danh sách story đã lưu trữ (để trước các route param :storyId)
router.get('/archive', storyController.getArchivedStories);

// Đăng lại story từ kho lưu trữ
router.post('/:storyId/repost', storyController.repostStory);

// Lấy stories của một user cụ thể
router.get('/user/:targetUserId', storyController.getUserStories);

// Đánh dấu đã xem story
router.post('/:storyId/view', storyController.viewStory);

// Thả cảm xúc story
router.post('/:storyId/react', storyController.reactToStory);

// Lấy danh sách người xem story (chỉ chủ story)
router.get('/:storyId/viewers', storyController.getStoryViewers);

// Lấy chi tiết một story cụ thể
router.get('/:storyId', storyController.getStoryDetails);

// Xóa vĩnh viễn story (khỏi DB + S3)
router.delete('/:storyId/permanent', storyController.permanentDeleteStory);

// Xóa story (chuyển vào lưu trữ)
router.delete('/:storyId', storyController.deleteStory);

export default router;
