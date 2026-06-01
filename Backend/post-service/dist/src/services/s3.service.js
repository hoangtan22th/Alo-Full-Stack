"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFileFromS3 = exports.uploadFileToS3 = exports.BUCKET_NAME = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const uuid_1 = require("uuid");
const aws_1 = __importDefault(require("../config/aws"));
exports.BUCKET_NAME = process.env.AWS_BUCKET_NAME || process.env.AWS_S3_BUCKET || "btl-alo-chat";
/**
 * Upload file lên S3 với retry logic
 * - Video: thêm ContentDisposition inline để stream trực tiếp trên trình duyệt
 * - Retry tối đa 3 lần nếu upload thất bại
 */
const uploadFileToS3 = async (fileBuffer, mimetype, originalName, folder = "posts", maxRetries = 3) => {
    const extension = originalName.split(".").pop() || "bin";
    const normalizedOriginalName = originalName.split(".")[0]?.replace(/[^a-zA-Z0-9_-]/g, "_") || "unnamed";
    const fileName = `${folder}/${(0, uuid_1.v4)()}_${normalizedOriginalName}.${extension}`;
    const isVideo = mimetype.startsWith("video/");
    const command = new client_s3_1.PutObjectCommand({
        Bucket: exports.BUCKET_NAME,
        Key: fileName,
        Body: fileBuffer,
        ContentType: mimetype,
        // Cho phép trình duyệt hiển thị/stream trực tiếp thay vì download
        ContentDisposition: isVideo ? "inline" : undefined,
    });
    // Retry logic cho trường hợp S3 timeout hoặc lỗi mạng tạm thời
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await aws_1.default.send(command);
            return `https://${exports.BUCKET_NAME}.s3.${process.env.AWS_REGION || "ap-southeast-1"}.amazonaws.com/${fileName}`;
        }
        catch (error) {
            lastError = error;
            console.error(`[uploadFileToS3] Attempt ${attempt}/${maxRetries} failed for ${fileName}:`, error);
            if (attempt < maxRetries) {
                // Exponential backoff: 1s, 2s, 4s
                const delay = Math.pow(2, attempt - 1) * 1000;
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }
    throw new Error(`Không thể upload file lên S3 sau ${maxRetries} lần thử: ${lastError?.message || 'Unknown error'}`);
};
exports.uploadFileToS3 = uploadFileToS3;
const deleteFileFromS3 = async (fileUrl) => {
    try {
        if (!fileUrl)
            return;
        const region = process.env.AWS_REGION || "ap-southeast-1";
        const s3Domain = `https://${exports.BUCKET_NAME}.s3.${region}.amazonaws.com/`;
        if (fileUrl.startsWith(s3Domain)) {
            const fileKey = fileUrl.replace(s3Domain, "");
            const command = new client_s3_1.DeleteObjectCommand({
                Bucket: exports.BUCKET_NAME,
                Key: decodeURIComponent(fileKey),
            });
            await aws_1.default.send(command);
        }
    }
    catch (error) {
        console.error(`[deleteFileFromS3] Lỗi khi xóa file khỏi S3:`, error);
    }
};
exports.deleteFileFromS3 = deleteFileFromS3;
//# sourceMappingURL=s3.service.js.map