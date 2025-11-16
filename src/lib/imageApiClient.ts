/**
 * Image API Client - TypeScript/Next.js Port
 * Ported from Python ImageAPIClient
 */

export interface ImageTaskResponse {
  synth_id?: string;
  task_id?: string;
  status?: string;
  image_urls?: string[];
  image_url?: string;
  progress?: number;
  result_s3_url?: string;
  save_s3_url?: string;
  mask_ratio?: number;
  error_info?: string;
  celery_task_id?: string;
  queue?: string;
}

export interface CreateImageTaskParams {
  prompt: string;
  simple_tag_ids?: string[];
  width?: number;
  height?: number;
  body_model_id?: string;
  face_model_id?: string;
}

export interface GenerateImageWithReferenceParams {
  prompt: string;
  reference_image_base64: string;
  body_model_id?: string;
  width?: number;
  height?: number;
  simple_tag_ids?: string[];
  fast_mode?: boolean;
}

export interface CreateImageEditTaskParams {
  image_origin_s3_url: string;
  edit_type?: 'censor_image' | 'takes_off';
  gender?: 'male' | 'female';
  seed?: number;
  steps?: number;
  cfg?: number;
  megapixels?: number;
  region?: string;
  callback_response_metadata?: Record<string, any>;
  client_callback_url?: string;
}

export class ImageAPIClient {
  private baseUrl: string;
  private apiKey: string;
  private headers: Record<string, string>;
  private debugPrinted: boolean = false;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = baseUrl || process.env.AI_API_URL || '';
    this.apiKey = apiKey || process.env.AI_API_KEY || '';

    if (!this.baseUrl || !this.apiKey) {
      throw new Error('API_BASE_URL and API_KEY must be set in environment variables');
    }

    this.headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    console.log('🔧 API Configuration:');
    console.log(`   Base URL: ${this.baseUrl}`);
    console.log(`   API Key: ${this.apiKey.substring(0, 20)}...`);
  }

  /**
   * Create an image generation task
   */
  async createImageTask(params: CreateImageTaskParams): Promise<ImageTaskResponse> {
    const {
      prompt,
      simple_tag_ids = [],
      width = 1024,
      height = 1024,
      body_model_id = 'train-8fd14700969b4d35b31927a8282b748a',
      face_model_id = '',
    } = params;

    const url = `${this.baseUrl}/api/v1/image-tasks/`;

    const payload = {
      prompt,
      simple_tag_ids,
      width,
      height,
      body_model_id,
      face_model_id,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  /**
   * Generate image with reference image
   */
  async generateImageWithReference(
    params: GenerateImageWithReferenceParams
  ): Promise<ImageTaskResponse> {
    const {
      prompt,
      reference_image_base64,
      body_model_id = 'train-7f9911080f9e479198be762001437b16',
      width = 1024,
      height = 1024,
      simple_tag_ids = [],
      fast_mode = false,
    } = params;

    const url = `${this.baseUrl}/api/image-generation/reference`;

    const payload = {
      body_model_id,
      reference_image_base64,
      prompt,
      width,
      height,
      simple_tag_ids,
      fast_mode,
    };

    try {
      // Add timeout (5s connection, 30s read)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000);

      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  /**
   * Check task status
   */
  async checkTaskStatus(synthId: string): Promise<ImageTaskResponse> {
    const url = `${this.baseUrl}/api/v1/image-tasks/${synthId}/status`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Status check failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      // Debug: print full response for first completed task
      if (result.status === 'completed' && !this.debugPrinted) {
        console.log('\n🔍 DEBUG - Full API Response for completed task:');
        console.log('   Keys:', Object.keys(result));
        console.log('   Full response:', result);
        this.debugPrinted = true;
      }

      return result;
    } catch (error) {
      console.error('Status check failed:', error);
      throw error;
    }
  }

  /**
   * Check reference task status
   */
  async checkReferenceTaskStatus(synthId: string): Promise<ImageTaskResponse> {
    return this.checkTaskStatus(synthId);
  }

  /**
   * Create an image edit task (mosaic processing, etc.)
   */
  async createImageEditTask(params: CreateImageEditTaskParams): Promise<ImageTaskResponse> {
    const {
      image_origin_s3_url,
      edit_type = 'censor_image',
      gender,
      seed,
      steps,
      cfg,
      megapixels,
      region,
      callback_response_metadata,
      client_callback_url,
    } = params;

    const payload: any = {
      image_origin_s3_url,
      edit_type,
    };

    if (gender) payload.gender = gender;
    if (seed !== undefined) payload.seed = seed;
    if (steps !== undefined) payload.steps = steps;
    if (cfg !== undefined) payload.cfg = cfg;
    if (megapixels !== undefined) payload.megapixels = megapixels;
    if (region) payload.region = region;
    if (callback_response_metadata) payload.callback_response_metadata = callback_response_metadata;
    if (client_callback_url) payload.client_callback_url = client_callback_url;

    const url = `${this.baseUrl}/api/v1/image-edit/`;

    console.log('🔍 Request Details:');
    console.log('   URL:', url);
    console.log('   Payload:', payload);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Image edit task creation failed: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Image edit task creation failed:', error);
      throw error;
    }
  }

  /**
   * Get image edit status
   */
  async getImageEditStatus(taskId: string): Promise<ImageTaskResponse> {
    const url = `${this.baseUrl}/api/v1/image-edit/${taskId}`;

    console.log('🔍 Status Request Details:');
    console.log('   URL:', url);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers,
      });

      console.log('   Response Status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Image edit status check failed: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Image edit status check failed:', error);
      throw error;
    }
  }

  /**
   * Wait for image edit task completion with polling
   */
  async waitForImageEditCompletion(
    taskId: string,
    pollInterval: number = 5,
    timeout: number = 300
  ): Promise<ImageTaskResponse> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout * 1000) {
      const statusData = await this.getImageEditStatus(taskId);
      const status = statusData.status;
      const progress = statusData.progress || 0;

      console.log(`🔄 Image edit status: ${status}, Progress: ${progress}%`);

      if (progress === 100) {
        console.log('✅ Image editing completed!');
        return statusData;
      } else if (progress < 0) {
        const errorInfo = statusData.error_info || 'Unknown error';
        throw new Error(`Image edit task failed: ${errorInfo}`);
      }

      // Wait before next check
      await new Promise((resolve) => setTimeout(resolve, pollInterval * 1000));
    }

    throw new Error(`Image edit task ${taskId} did not complete within ${timeout} seconds`);
  }

  /**
   * Process image edit synchronously and return result S3 URL
   */
  async processImageEditSync(
    imageOriginS3Url: string,
    editType: 'censor_image' | 'takes_off' = 'censor_image',
    maxWaitTime: number = 600,
    pollInterval: number = 10,
    additionalParams?: Partial<CreateImageEditTaskParams>
  ): Promise<string> {
    console.log(`🎨 Starting image editing: ${editType}`);

    // Create task
    const taskData = await this.createImageEditTask({
      image_origin_s3_url: imageOriginS3Url,
      edit_type: editType,
      ...additionalParams,
    });

    const taskId = taskData.task_id;
    if (!taskId) {
      throw new Error(`No task_id in response: ${JSON.stringify(taskData)}`);
    }

    console.log(`📝 Image edit task created: ${taskId}`);

    // Poll for completion
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitTime * 1000) {
      const statusResponse = await this.getImageEditStatus(taskId);
      const status = statusResponse.status;
      const elapsedSec = Math.floor((Date.now() - startTime) / 1000);

      console.log(`⏳ Status: ${status} (elapsed: ${elapsedSec}s)`);

      if (status === 100 || statusResponse.progress === 100) {
        // Completed
        const resultS3Url = statusResponse.save_s3_url || statusResponse.result_s3_url;
        if (resultS3Url) {
          console.log('✅ Image editing completed!');
          return resultS3Url;
        } else {
          throw new Error('No result URL in completed response');
        }
      } else if (typeof status === 'number' && status < 0) {
        // Failed
        const errorInfo = statusResponse.error_info || 'Unknown error';
        throw new Error(`Image editing failed: ${errorInfo}`);
      }

      // Wait before next check
      await new Promise((resolve) => setTimeout(resolve, pollInterval * 1000));
    }

    throw new Error(`Image editing timed out after ${maxWaitTime} seconds`);
  }

  /**
   * Download image from URL
   */
  async downloadImage(imageUrl: string): Promise<Buffer> {
    try {
      const response = await fetch(imageUrl);

      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status} - ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error('Failed to download image:', error);
      throw error;
    }
  }

  /**
   * Encode image to base64
   */
  static encodeImageToBase64(buffer: Buffer): string {
    return buffer.toString('base64');
  }

  /**
   * Complete workflow: create task, wait, and return image URL
   */
  async generateAndGetImageUrl(
    prompt: string,
    width: number = 1024,
    height: number = 1024,
    maxWaitTime: number = 300,
    pollInterval: number = 5
  ): Promise<string> {
    console.log(`🎨 Creating image generation task for: ${prompt.substring(0, 50)}...`);

    // Create the task
    const taskResult = await this.createImageTask({
      prompt,
      width,
      height,
    });

    const synthId = taskResult.synth_id;
    if (!synthId) {
      throw new Error(`No synth_id in response: ${JSON.stringify(taskResult)}`);
    }

    console.log(`📝 Task created with ID: ${synthId}`);

    // Poll for completion
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitTime * 1000) {
      const statusResponse = await this.checkTaskStatus(synthId);
      const status = statusResponse.status;
      const elapsedSec = Math.floor((Date.now() - startTime) / 1000);

      console.log(`⏳ Status: ${status} (elapsed: ${elapsedSec}s)`);

      if (status === 'completed') {
        // Get the generated image URL
        const imageUrls = statusResponse.image_urls || [];
        if (imageUrls.length === 0) {
          throw new Error('No image URLs in completed response');
        }

        const imageUrl = imageUrls[0];
        console.log(`✅ Image generated: ${imageUrl}`);
        return imageUrl;
      } else if (status === 'failed') {
        throw new Error(`Task failed: ${JSON.stringify(statusResponse)}`);
      }

      // Wait before next check
      await new Promise((resolve) => setTimeout(resolve, pollInterval * 1000));
    }

    throw new Error(`Task timed out after ${maxWaitTime} seconds`);
  }
}
