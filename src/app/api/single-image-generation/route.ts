import { NextResponse } from 'next/server';
import { uploadToS3 } from '@/lib/s3Upload';

interface SingleImageGenerationRequest {
  generationType: 'reference' | 'prompt_only';
  prompt: string;
  bodyModelId: string;
  referenceImageBase64?: string; // Only for reference type
  width?: number;
  height?: number;
  faceModelId?: string;
  simpleTagIds?: string[];
  fastMode?: boolean;
}

interface ImageAPIResponse {
  synth_id?: string;
  status?: string;
  progress?: number;
  image_urls?: string[];
  result_paths?: string[];
}

class ImageAPIClient {
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

  // Prompt-only image generation
  async createImageTask(
    prompt: string,
    bodyModelId: string,
    width: number = 1024,
    height: number = 1024,
    faceModelId: string = "",
    simpleTagIds: string[] = []
  ): Promise<ImageAPIResponse> {
    const payload = {
      prompt: prompt,
      simple_tag_ids: simpleTagIds,
      width: width,
      height: height,
      body_model_id: bodyModelId,
      face_model_id: faceModelId
    };

    const url = `${this.baseUrl}/api/v1/image-tasks/`;

    console.log('Creating prompt-only image task:', {
      url,
      prompt: prompt.substring(0, 50) + '...',
      bodyModelId,
      dimensions: `${width}x${height}`
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Image API request failed: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Prompt-only image generation request failed:', error);
      throw error;
    }
  }

  // Reference image generation
  async generateImageWithReference(
    prompt: string,
    referenceImageBase64: string,
    bodyModelId: string,
    width: number = 1024,
    height: number = 1024,
    fastMode: boolean = false
  ): Promise<ImageAPIResponse> {
    const payload = {
      body_model_id: bodyModelId,
      reference_image_base64: referenceImageBase64,
      prompt: prompt,
      width: width,
      height: height,
      simple_tag_ids: [],
      fast_mode: fastMode
    };

    const url = `${this.baseUrl}/api/image-generation/reference`;

    console.log('Creating reference image generation task:', {
      url,
      prompt: prompt.substring(0, 50) + '...',
      bodyModelId,
      dimensions: `${width}x${height}`,
      fastMode,
      referenceImageSize: referenceImageBase64.length
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
        // Add timeout for large image uploads
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Image API request failed: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Reference image generation request failed:', error);
      throw error;
    }
  }

  async checkTaskStatus(synthId: string): Promise<ImageAPIResponse> {
    const url = `${this.baseUrl}/api/v1/image-tasks/${synthId}/status`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Status check failed: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Status check failed:', error);
      throw error;
    }
  }
}

export async function POST(request: Request) {
  try {
    const body: SingleImageGenerationRequest = await request.json();
    const {
      generationType,
      prompt,
      bodyModelId,
      referenceImageBase64,
      width = 1024,
      height = 1024,
      faceModelId = "",
      simpleTagIds = [],
      fastMode = false
    } = body;

    // Validate required fields
    if (!generationType || !prompt || !bodyModelId) {
      return NextResponse.json(
        { error: 'generationType, prompt, and bodyModelId are required' },
        { status: 400 }
      );
    }

    // Validate generation type
    if (generationType !== 'reference' && generationType !== 'prompt_only') {
      return NextResponse.json(
        { error: 'generationType must be "reference" or "prompt_only"' },
        { status: 400 }
      );
    }

    // For reference generation, base64 image is required
    if (generationType === 'reference' && !referenceImageBase64) {
      return NextResponse.json(
        { error: 'referenceImageBase64 is required for reference generation' },
        { status: 400 }
      );
    }

    // Initialize Image API client
    const imageClient = new ImageAPIClient();

    let taskResponse: ImageAPIResponse;

    // Call appropriate API based on generation type
    if (generationType === 'reference') {
      taskResponse = await imageClient.generateImageWithReference(
        prompt,
        referenceImageBase64!,
        bodyModelId,
        width,
        height,
        fastMode
      );
    } else {
      taskResponse = await imageClient.createImageTask(
        prompt,
        bodyModelId,
        width,
        height,
        faceModelId,
        simpleTagIds
      );
    }

    const synthId = taskResponse.synth_id;
    if (!synthId) {
      throw new Error('No synth_id returned from image generation API');
    }

    console.log(`✅ ${generationType} image task created: ${synthId}`);

    // Poll for completion server-side
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max (60 * 5 seconds)
    let imageUrl = null;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

      const statusResponse = await imageClient.checkTaskStatus(synthId);

      if (statusResponse.status === 'completed' && statusResponse.progress === 100) {
        const urls = statusResponse.result_paths || statusResponse.image_urls || [];
        if (urls.length > 0) {
          imageUrl = urls[0];
          break;
        }
      } else if (statusResponse.status === 'failed') {
        throw new Error(`Image generation failed for synth_id: ${synthId}`);
      }

      attempts++;
    }

    if (!imageUrl) {
      throw new Error(`Timeout waiting for image generation to complete (synth_id: ${synthId})`);
    }

    console.log(`✅ ${generationType} image completed: ${imageUrl}`);

    // Download image from AI API URL
    console.log('Downloading generated image from AI API...');
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download generated image: ${imageResponse.status}`);
    }
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Upload to S3
    console.log('Uploading image to S3...');
    const filename = `generated/${generationType}/${synthId}.png`;
    const s3Url = await uploadToS3(imageBuffer, filename, 'image/png');

    console.log(`✅ Image uploaded to S3: ${s3Url}`);

    return NextResponse.json({
      success: true,
      synth_id: synthId,
      generation_type: generationType,
      image_url: s3Url,
      message: `${generationType} image generation completed successfully`
    });

  } catch (error) {
    console.error('Error in single image generation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: `Failed to create image generation task: ${errorMessage}` },
      { status: 500 }
    );
  }
}
