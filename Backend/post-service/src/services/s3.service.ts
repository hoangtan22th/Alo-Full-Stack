import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import s3Client from "../config/aws";

export const BUCKET_NAME = process.env.AWS_BUCKET_NAME || process.env.AWS_S3_BUCKET || "btl-alo-chat";

/**
 * Upload file lên S3 với retry logic
 * - Video: thêm ContentDisposition inline để stream trực tiếp trên trình duyệt
 * - Retry tối đa 3 lần nếu upload thất bại
 */
export const uploadFileToS3 = async (
  fileBuffer: Buffer,
  mimetype: string,
  originalName: string,
  folder: string = "posts",
  maxRetries: number = 3,
): Promise<string> => {
  const extension = originalName.split(".").pop() || "bin";
  const normalizedOriginalName = originalName.split(".")[0]?.replace(/[^a-zA-Z0-9_-]/g, "_") || "unnamed";
  const fileName = `${folder}/${uuidv4()}_${normalizedOriginalName}.${extension}`;

  const isVideo = mimetype.startsWith("video/");

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileName,
    Body: fileBuffer,
    ContentType: mimetype,
    // Cho phép trình duyệt hiển thị/stream trực tiếp thay vì download
    ContentDisposition: isVideo ? "inline" : undefined,
  });

  // Retry logic cho trường hợp S3 timeout hoặc lỗi mạng tạm thời
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await s3Client.send(command);
      return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || "ap-southeast-1"}.amazonaws.com/${fileName}`;
    } catch (error) {
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

export const deleteFileFromS3 = async (fileUrl: string): Promise<void> => {
  try {
    if (!fileUrl) return;

    const region = process.env.AWS_REGION || "ap-southeast-1";
    const s3Domain = `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/`;

    if (fileUrl.startsWith(s3Domain)) {
      const fileKey = fileUrl.replace(s3Domain, "");
      const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: decodeURIComponent(fileKey),
      });

      await s3Client.send(command);
    }
  } catch (error) {
    console.error(`[deleteFileFromS3] Lỗi khi xóa file khỏi S3:`, error);
  }
};
