"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const story_controller_1 = require("../controllers/story.controller");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
// Danh sách MIME type được phép cho Story
const ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif', 'image/jpg', 'image/svg+xml',
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v', 'video/3gpp', 'video/avi', 'video/mpeg',
    'application/octet-stream',
];
const fileFilter = (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        const err = new Error(`Loại file không được hỗ trợ cho Story: ${file.mimetype}`);
        err.status = 400;
        cb(err);
    }
};
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB cho Story
        files: 1, // Mỗi Story chỉ 1 file
    },
});
// ============ Story Management ============
// Đăng Story mới (1 ảnh hoặc 1 video)
router.post('/', upload.single('file'), story_controller_1.storyController.createStory);
// Lấy story feed (của bản thân + bạn bè, nhóm theo user)
router.get('/feed', story_controller_1.storyController.getStoryFeed);
// Lấy danh sách story đã lưu trữ (để trước các route param :storyId)
router.get('/archive', story_controller_1.storyController.getArchivedStories);
// Đăng lại story từ kho lưu trữ
router.post('/:storyId/repost', story_controller_1.storyController.repostStory);
// Lấy stories của một user cụ thể
router.get('/user/:targetUserId', story_controller_1.storyController.getUserStories);
// Đánh dấu đã xem story
router.post('/:storyId/view', story_controller_1.storyController.viewStory);
// Thả cảm xúc story
router.post('/:storyId/react', story_controller_1.storyController.reactToStory);
// Lấy danh sách người xem story (chỉ chủ story)
router.get('/:storyId/viewers', story_controller_1.storyController.getStoryViewers);
// Lấy chi tiết một story cụ thể
router.get('/:storyId', story_controller_1.storyController.getStoryDetails);
// Xóa vĩnh viễn story (khỏi DB + S3)
router.delete('/:storyId/permanent', story_controller_1.storyController.permanentDeleteStory);
// Xóa story (chuyển vào lưu trữ)
router.delete('/:storyId', story_controller_1.storyController.deleteStory);
exports.default = router;
//# sourceMappingURL=story.routes.js.map