import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import s3Client from "../config/aws.ts";

export const BUCKET_NAME = process.env.AWS_BUCKET_NAME || "btl-alo-chat";

export const uploadFileToS3 = async (
  fileBuffer: Buffer,
  mimetype: string,
  originalName: string,
  folder: string = "messages",
): Promise<string> => {
  const extension = originalName.split(".").pop() || "bin";
  const fileName = `${folder}/${uuidv4()}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileName,
    Body: fileBuffer,
    ContentType: mimetype,
  });

  await s3Client.send(command);

  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || "ap-southeast-1"}.amazonaws.com/${fileName}`;
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
