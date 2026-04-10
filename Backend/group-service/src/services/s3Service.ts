import { PutObjectCommand } from "@aws-sdk/client-s3";
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
