import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand
} from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import { Logger } from './logger';

/**
 * Reusable utility class for AWS S3 CRUD storage operations.
 */
export class S3Helper {
  private static s3ClientInstance: S3Client | null = null;
  private static readonly defaultBucketName: string = process.env.AWS_S3_BUCKET_NAME || 'dhruva-qa-artifacts-bucket';

  /**
   * WHAT: Initializes or returns a singleton instance of the AWS S3 client.
   * WHY: Reuses network connections and prevents multiple client instances.
   * HOW: Reads region and credentials from environment variables with IAM fallback.
   */
  private static getS3Client(): S3Client {
    if (!this.s3ClientInstance) {
      this.s3ClientInstance = new S3Client({
        region: process.env.AWS_REGION || 'ap-south-1',
        credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        } : undefined
      });
    }
    return this.s3ClientInstance;
  }

  /**
   * WHAT: Downloads a file from S3 and saves it to a local file path.
   * WHY: Prepares remote master test datasets (e.g. bulk CSVs) for browser file input uploads.
   * HOW: Streams S3 object data to the local target path.
   */
  static async downloadFileFromS3(s3ObjectKey: string, localDestinationPath: string): Promise<string> {
    Logger.info(`Downloading file from S3 key [${s3ObjectKey}] to local path [${localDestinationPath}]`);
    const client = this.getS3Client();
    const command = new GetObjectCommand({
      Bucket: this.defaultBucketName,
      Key: s3ObjectKey
    });

    const response = await client.send(command);
    const directoryPath = path.dirname(localDestinationPath);
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(localDestinationPath);
      const readStream = response.Body as Readable;

      readStream.pipe(writeStream)
        .on('error', (streamError) => {
          Logger.error(`Failed to stream S3 file: ${streamError.message}`);
          reject(streamError);
        })
        .on('finish', () => {
          Logger.info(`Successfully downloaded S3 file to: ${localDestinationPath}`);
          resolve(localDestinationPath);
        });
    });
  }

  /**
   * WHAT: Uploads a local file or artifact directly to an S3 object key.
   * WHY: Archives reports and test output artifacts in cloud storage.
   * HOW: Reads local file stream and executes PutObjectCommand.
   */
  static async uploadFileToS3(localFilePath: string, s3ObjectKey: string): Promise<void> {
    Logger.info(`Uploading file [${localFilePath}] to S3 key [${s3ObjectKey}]`);
    const client = this.getS3Client();
    const fileStream = fs.createReadStream(localFilePath);
    const command = new PutObjectCommand({
      Bucket: this.defaultBucketName,
      Key: s3ObjectKey,
      Body: fileStream
    });

    await client.send(command);
    Logger.info(`Successfully uploaded file to S3 at key: ${s3ObjectKey}`);
  }

  /**
   * WHAT: Deletes a specific object from S3.
   * WHY: Performs test cleanup and teardown for transient test assets.
   * HOW: Executes DeleteObjectCommand against target S3 key.
   */
  static async deleteObjectFromS3(s3ObjectKey: string): Promise<void> {
    Logger.info(`Deleting object from S3 key: ${s3ObjectKey}`);
    const client = this.getS3Client();
    const command = new DeleteObjectCommand({
      Bucket: this.defaultBucketName,
      Key: s3ObjectKey
    });

    await client.send(command);
    Logger.info(`Successfully deleted S3 object key: ${s3ObjectKey}`);
  }
}
