/**
 * Base Miro Uploader - Shared functionality
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Product, MiroConfig, UploadStats } from './types';

export abstract class BaseMiroUploader {
  protected miroToken: string;
  protected headers: HeadersInit;
  protected s3Client: S3Client;
  protected s3Bucket: string;
  protected s3Prefix: string;
  protected boardId: string | null = null;

  protected stats: UploadStats = {
    totalProducts: 0,
    uploadedImages: 0,
    failedImages: 0,
  };

  constructor(config: MiroConfig, s3Prefix: string) {
    this.miroToken = config.token;
    this.headers = {
      'Authorization': `Bearer ${this.miroToken}`,
      'Content-Type': 'application/json',
    };

    this.s3Client = new S3Client({
      region: config.s3Region,
      credentials: {
        accessKeyId: config.awsAccessKeyId,
        secretAccessKey: config.awsSecretAccessKey,
      },
    });

    this.s3Bucket = config.s3Bucket;
    this.s3Prefix = s3Prefix;
  }

  /**
   * Create a new Miro board
   */
  async createMiroBoard(boardName: string, description: string = ''): Promise<boolean> {
    try {
      const response = await fetch('https://api.miro.com/v2/boards', {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          name: boardName,
          description: description,
        }),
      });

      if (response.status === 201) {
        const data = await response.json();
        this.boardId = data.id;
        const boardUrl = `https://miro.com/app/board/${this.boardId}/`;
        console.log(`  Miro board created: ${boardName}`);
        console.log(`  Board URL: ${boardUrl}`);
        return true;
      } else {
        const errorText = await response.text();
        console.error(`  Miro board creation failed: ${response.status}`, errorText);
        return false;
      }
    } catch (error) {
      console.error('  Miro board creation exception:', error);
      return false;
    }
  }

  /**
   * Upload image to S3 and return presigned URL
   */
  async uploadImageToS3(imageUrl: string, s3Key: string): Promise<string | null> {
    try {
      // Download image
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        this.stats.failedImages++;
        return null;
      }

      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

      // Upload to S3
      const putCommand = new PutObjectCommand({
        Bucket: this.s3Bucket,
        Key: s3Key,
        Body: imageBuffer,
        ContentType: 'image/jpeg',
      });

      await this.s3Client.send(putCommand);

      // Generate presigned URL (7 days)
      const presignedUrl = await getSignedUrl(
        this.s3Client,
        new PutObjectCommand({
          Bucket: this.s3Bucket,
          Key: s3Key,
        }),
        { expiresIn: 604800 }
      );

      this.stats.uploadedImages++;
      return presignedUrl;
    } catch (error) {
      console.error(`  S3 upload failed for ${s3Key}:`, error);
      this.stats.failedImages++;
      return null;
    }
  }

  /**
   * Create a text box on Miro board
   */
  async createTextBox(
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    fillColor: string = '#ffffff',
    _fontSize: number = 12,
    bold: boolean = false
  ): Promise<boolean> {
    if (!this.boardId) {
      console.error('Board ID not set');
      return false;
    }

    const url = `https://api.miro.com/v2/boards/${this.boardId}/shapes`;
    const content = bold ? `<p><strong>${text}</strong></p>` : `<p>${text}</p>`;

    const payload = {
      data: {
        content,
        shape: 'rectangle',
      },
      style: {
        fillColor,
      },
      position: { x, y },
      geometry: {
        width,
        height,
      },
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
      });

      return response.status === 200 || response.status === 201;
    } catch (error) {
      console.error('  Text box creation failed:', error);
      return false;
    }
  }

  /**
   * Add image to Miro board
   */
  async addImageToBoard(
    imageUrl: string,
    x: number,
    y: number,
    width: number,
    title: string = ''
  ): Promise<boolean> {
    if (!this.boardId) {
      console.error('Board ID not set');
      return false;
    }

    const url = `https://api.miro.com/v2/boards/${this.boardId}/images`;
    const payload = {
      data: {
        url: imageUrl,
        title,
      },
      position: { x, y },
      geometry: { width },
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
      });

      return response.status === 200 || response.status === 201;
    } catch (error) {
      console.error('  Image creation failed:', error);
      return false;
    }
  }

  /**
   * Parse CSV content to products
   */
  parseCSV(csvContent: string): Product[] {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const products: Product[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const product: Record<string, string | number | boolean> = {};

      headers.forEach((header, idx) => {
        const value = values[idx]?.trim() || '';

        if (header === 'index') {
          product[header] = parseInt(value) || 0;
        } else if (header === 'is_exclusive') {
          product[header] = value === 'True';
        } else {
          product[header] = value;
        }
      });

      products.push(product as unknown as Product);
      this.stats.totalProducts++;
    }

    return products.sort((a, b) => a.index - b.index);
  }

  /**
   * Display upload statistics
   */
  displayStats(): void {
    console.log('\n  Upload Statistics:');
    console.log(`   Total products: ${this.stats.totalProducts}`);
    if (this.stats.totalCircles !== undefined) {
      console.log(`   Total circles: ${this.stats.totalCircles}`);
    }
    console.log(`   Images uploaded: ${this.stats.uploadedImages}`);
    console.log(`   Images failed: ${this.stats.failedImages}`);
  }

  getBoardUrl(): string | null {
    return this.boardId ? `https://miro.com/app/board/${this.boardId}/` : null;
  }

  abstract uploadToMiro(csvContent: string, categoryName: string): Promise<string | null>;
}
