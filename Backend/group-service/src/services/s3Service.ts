import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import s3Client from "../config/aws";

// Thay thế bằng AWS Bucket của bạn
export const BUCKET_NAME = process.env.AWS_BUCKET_NAME || "alo-chat-bucket";

export const uploadImageToS3 = async (
  fileBuffer: Buffer,
  mimetype: string,
  folder: string = "groups",
): Promise<string> => {
  const extension = mimetype.split("/")[1] || "jpg";
  const fileName = `${folder}/${uuidv4()}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileName,
    Body: fileBuffer,
    ContentType: mimetype,
  });

  await s3Client.send(command);

  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
};

export const deleteImageFromS3 = async (imageUrl: string): Promise<void> => {
  try {
    if (!imageUrl) return;

    // AWS Region could be provided manually in the URL format
    const region = process.env.AWS_REGION || "ap-southeast-1"; // example default
    const s3Domain = `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/`;

    if (imageUrl.startsWith(s3Domain)) {
      const fileKey = imageUrl.replace(s3Domain, "");
      const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: decodeURIComponent(fileKey),
      });

      await s3Client.send(command);
      console.log(`[deleteImageFromS3] Đã xóa ảnh cũ thành công: ${fileKey}`);
    }
  } catch (error) {
    console.error(`[deleteImageFromS3] Lỗi khi xóa ảnh khỏi S3:`, error);
  }
};
