import { NextResponse } from 'next/server';

interface UploadImageResponse {
  s3_url: string;
}

class ImageUploadClient {
  private baseUrl: string;
  private apiKey: string;
  private headers: Record<string, string>;

  constructor() {
    this.baseUrl = process.env.AI_API_URL || '';
    this.apiKey = process.env.AI_API_KEY || '';

    if (!this.baseUrl || !this.apiKey) {
      throw new Error("AI_API_URL and AI_API_KEY must be set in environment variables");
    }

    this.headers = {
      "Authorization": `Bearer ${this.apiKey}`,
      "Content-Type": "application/json"
    };
  }

  async uploadImage(imageBase64: string): Promise<UploadImageResponse> {
    const url = `${this.baseUrl}/api/v1/upload-image`;

    const payload = {
      image_base64: imageBase64
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Image upload failed: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Image upload failed:', error);
      throw error;
    }
  }
}

export async function POST(request: Request) {
  try {
    const { imageData } = await request.json();

    if (!imageData) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }

    // Initialize upload client
    const uploadClient = new ImageUploadClient();

    // Extract base64 data (remove data:image/...;base64, prefix if present)
    let imageBase64 = imageData;
    if (imageData.includes('base64,')) {
      imageBase64 = imageData.split('base64,')[1];
    }

    console.log('Uploading image to S3...');

    // Upload image to S3
    const uploadResult = await uploadClient.uploadImage(imageBase64);

    console.log('Image uploaded successfully:', uploadResult.s3_url);

    return NextResponse.json({
      success: true,
      s3_url: uploadResult.s3_url
    });

  } catch (error) {
    console.error('Error uploading image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      {
        success: false,
        error: `Failed to upload image: ${errorMessage}`
      },
      { status: 500 }
    );
  }
}
