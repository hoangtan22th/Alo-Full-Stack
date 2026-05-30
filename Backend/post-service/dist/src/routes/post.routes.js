import { Router } from 'express';
import { postController } from '../controllers/post.controller';
import { commentController } from '../controllers/comment.controller';
import multer from 'multer';
const router = Router();
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
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024, // Giới hạn 100MB cho mỗi file (ảnh/video)
        files: 10, // Tối đa 10 files mỗi request
    },
});
// ============ Spotify Token ============
router.get('/spotify/token', postController.getSpotifyToken);
// ============ Post Management ============
router.post('/', upload.array('files', 10), postController.createPost);
router.put('/:postId', upload.array('files', 10), postController.editPost);
router.delete('/:postId', postController.deletePost);
// ============ Feed & Dòng thời gian ============
router.get('/feed', postController.getHomeFeed);
router.get('/user/:userId', postController.getUserTimeline);
router.get('/:postId', postController.getPostDetails);
// ============ Reactions (Mới) ============
router.post('/:postId/react', postController.reactToPost);
// ============ Likes (Backward compatible) ============
router.post('/:postId/like', postController.toggleLikePost);
// ============ Comment Management ============
router.post('/:postId/comments', upload.single('file'), commentController.createComment);
router.get('/:postId/comments', commentController.getCommentsByPost);
router.delete('/comments/:commentId', commentController.deleteComment);
router.post('/comments/:commentId/react', commentController.reactToComment);
export default router;
//# sourceMappingURL=post.routes.js.map