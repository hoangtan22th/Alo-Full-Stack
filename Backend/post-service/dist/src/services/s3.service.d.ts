export declare const BUCKET_NAME: string;
/**
 * Upload file lên S3 với retry logic
 * - Video: thêm ContentDisposition inline để stream trực tiếp trên trình duyệt
 * - Retry tối đa 3 lần nếu upload thất bại
 */
export declare const uploadFileToS3: (fileBuffer: Buffer, mimetype: string, originalName: string, folder?: string, maxRetries?: number) => Promise<string>;
export declare const deleteFileFromS3: (fileUrl: string) => Promise<void>;
//# sourceMappingURL=s3.service.d.ts.map