"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const post_controller_1 = require("../controllers/post.controller");
const comment_controller_1 = require("../controllers/comment.controller");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
// Danh sách MIME type được phép upload
const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/svg+xml',
];
const ALLOWED_VIDEO_TYPES = [
    'video/mp4',
    'video/webm',
    'video/quicktime', // .mov
    'video/x-msvideo', // .avi
    'video/x-matroska', // .mkv
    'video/3gpp', // .3gp
];
const ALL_ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];
// File filter: chỉ cho phép image và video hợp lệ
const fileFilter = (req, file, cb) => {
    if (ALL_ALLOWED_TYPES.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error(`Loại file không được hỗ trợ: ${file.mimetype}. Chỉ chấp nhận ảnh (JPEG, PNG, GIF, WebP) và video (MP4, WebM, MOV, AVI).`));
    }
};
// Cấu hình multer để lưu file tạm trong bộ nhớ (memoryStorage) trước khi đẩy lên S3
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024, // Giới hạn 100MB cho mỗi file (ảnh/video)
        files: 10, // Tối đa 10 files mỗi request
    },
});
// ============ Spotify Token ============
router.get('/spotify/token', post_controller_1.postController.getSpotifyToken);
// ============ Post Management ============
router.post('/', upload.array('files', 10), post_controller_1.postController.createPost);
router.put('/:postId', upload.array('files', 10), post_controller_1.postController.editPost);
router.delete('/:postId', post_controller_1.postController.deletePost);
// ============ Feed & Dòng thời gian ============
router.get('/feed', post_controller_1.postController.getHomeFeed);
router.get('/user/:userId', post_controller_1.postController.getUserTimeline);
router.get('/:postId', post_controller_1.postController.getPostDetails);
// ============ Reactions (Mới) ============
router.post('/:postId/react', post_controller_1.postController.reactToPost);
// ============ Likes (Backward compatible) ============
router.post('/:postId/like', post_controller_1.postController.toggleLikePost);
// ============ Comment Management ============
router.post('/:postId/comments', upload.single('file'), comment_controller_1.commentController.createComment);
router.get('/:postId/comments', comment_controller_1.commentController.getCommentsByPost);
router.delete('/comments/:commentId', comment_controller_1.commentController.deleteComment);
router.post('/comments/:commentId/react', comment_controller_1.commentController.reactToComment);
exports.default = router;
//# sourceMappingURL=post.routes.js.map