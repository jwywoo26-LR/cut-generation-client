import { NextResponse } from 'next/server';

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
    
    console.log('ImageAPIClient initialized with:', { 
      baseUrl: this.baseUrl ? 'SET' : 'MISSING',
      apiKey: this.apiKey ? 'SET' : 'MISSING'
    });
    
    if (!this.baseUrl || !this.apiKey) {
      throw new Error("AI_API_URL and AI_API_KEY must be set in environment variables");
    }
    
    this.headers = {
      "Authorization": `Bearer ${this.apiKey}`,
      "Content-Type": "application/json"
    };
  }

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
      console.error('Image API request failed:', error);
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

  static encodeImageToBase64(imageBuffer: Buffer): string {
    return imageBuffer.toString('base64');
  }
}

// Helper function to get optimal dimensions based on aspect ratio
function getOptimalDimensions(width: number, height: number): { width: number; height: number } {
  const aspectRatio = width / height;
  
  // Define the three optimal size options
  const sizeOptions = [
    { width: 1024, height: 1024, ratio: 1.0 },     // Square
    { width: 896, height: 1152, ratio: 0.778 },    // Portrait  
    { width: 1152, height: 896, ratio: 1.286 }     // Landscape
  ];
  
  // Find the closest aspect ratio match
  let bestMatch = sizeOptions[0];
  let smallestDiff = Math.abs(aspectRatio - bestMatch.ratio);
  
  for (const option of sizeOptions) {
    const diff = Math.abs(aspectRatio - option.ratio);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      bestMatch = option;
    }
  }
  
  console.log(`Original dimensions: ${width}x${height} (ratio: ${aspectRatio.toFixed(3)}) -> Optimal: ${bestMatch.width}x${bestMatch.height} (ratio: ${bestMatch.ratio.toFixed(3)})`);
  
  return { width: bestMatch.width, height: bestMatch.height };
}

// Helper function to get image dimensions from buffer
function getImageDimensionsFromBuffer(buffer: Buffer): { width: number; height: number } {
  // Basic JPEG dimension reading (JPEG starts with FFD8)
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
    // JPEG format - look for SOF markers (Start of Frame)
    for (let i = 2; i < buffer.length - 8; i++) {
      if (buffer[i] === 0xFF && (buffer[i + 1] === 0xC0 || buffer[i + 1] === 0xC2)) {
        const height = (buffer[i + 5] << 8) | buffer[i + 6];
        const width = (buffer[i + 7] << 8) | buffer[i + 8];
        return { width, height };
      }
    }
  }
  
  // Basic PNG dimension reading (PNG signature: 89504E47)
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    // PNG IHDR chunk is at bytes 16-23 for width and 20-23 for height
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height };
  }
  
  // WebP format (starts with "RIFF" and contains "WEBP")
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    // Simple WebP VP8 format
    if (buffer.toString('ascii', 12, 16) === 'VP8 ') {
      const width = buffer.readUInt16LE(26) & 0x3fff;
      const height = buffer.readUInt16LE(28) & 0x3fff;
      return { width, height };
    }
    // WebP VP8L format
    if (buffer.toString('ascii', 12, 16) === 'VP8L') {
      const bits = buffer.readUInt32LE(21);
      const width = (bits & 0x3fff) + 1;
      const height = ((bits >> 14) & 0x3fff) + 1;
      return { width, height };
    }
  }
  
  console.log('Could not determine image dimensions, using default 1024x1024');
  return { width: 1024, height: 1024 };
}

// Helper function to get image dimensions
async function getImageDimensions(imageUrl: string): Promise<{ width: number; height: number }> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const dimensions = getImageDimensionsFromBuffer(buffer);
    console.log(`Detected image dimensions: ${dimensions.width}x${dimensions.height}`);
    return dimensions;
    
  } catch (error) {
    console.error('Error getting image dimensions:', error);
    return { width: 1024, height: 1024 }; // Fallback to square
  }
}

// Helper function to fetch image as base64
async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return ImageAPIClient.encodeImageToBase64(buffer);
  } catch (error) {
    console.error('Error fetching image:', error);
    throw error;
  }
}

// Helper function to upload image to Airtable

export async function POST(request: Request) {
  try {
    const { tableName, recordIds, generationType, modelId, imageCount = 3, promptType = 'initial' } = await request.json();

    if (!tableName || !generationType) {
      return NextResponse.json(
        { error: 'Table name and generation type are required' },
        { status: 400 }
      );
    }

    // Validate imageCount
    if (imageCount < 1 || imageCount > 50) {
      return NextResponse.json(
        { error: 'Image count must be between 1 and 50' },
        { status: 400 }
      );
    }

    if (generationType !== 'initial' && generationType !== 'edited') {
      return NextResponse.json(
        { error: 'Generation type must be "initial" or "edited"' },
        { status: 400 }
      );
    }

    // Get Airtable configuration
    const airtableApiKey = process.env.AIRTABLE_API_KEY;
    const airtableBaseId = process.env.AIRTABLE_BASE_ID;

    if (!airtableApiKey || !airtableBaseId) {
      return NextResponse.json(
        { error: 'Missing Airtable configuration' },
        { status: 500 }
      );
    }

    // Initialize Image API client
    const imageClient = new ImageAPIClient();

    // Fetch records from Airtable (using same pattern as working Records API)
    const encodedTableName = encodeURIComponent(tableName);
    const airtableUrl = recordIds && recordIds.length > 0
      ? `https://api.airtable.com/v0/${airtableBaseId}/${encodedTableName}?maxRecords=50&${recordIds.map((id: string) => `filterByFormula=RECORD_ID()="${id}"`).join('&')}`
      : `https://api.airtable.com/v0/${airtableBaseId}/${encodedTableName}?maxRecords=50`;

    const airtableResponse = await fetch(airtableUrl, {
      headers: {
        'Authorization': `Bearer ${airtableApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!airtableResponse.ok) {
      throw new Error(`Airtable API error: ${airtableResponse.status}`);
    }

    const airtableData = await airtableResponse.json();
    
    // Get available fields from the first record to see what actually exists
    const availableFields = airtableData.records.length > 0 
      ? Object.keys(airtableData.records[0].fields || {})
      : [];
    
    console.log('IMAGE API - Available fields:', availableFields);
    
    
    // Filter records that need image generation
    const promptField = generationType === 'initial' ? 'initial_prompt' : 'edited_prompt';
    const imageFields: string[] = [];
    let imageFieldPrefix: string;
    let maxImages: number;
    
    // Set image field prefix and max images based on generation type
    if (generationType === 'initial') {
      imageFieldPrefix = 'initial_prompt_image';
      maxImages = 5;
    } else {
      imageFieldPrefix = 'edited_prompt_image';
      maxImages = 5;
    }
    
    // Use numbered fields only - assume they exist even if empty (Airtable doesn't return empty fields)
    for (let i = 1; i <= Math.min(imageCount, maxImages); i++) {
      const fieldName = `${imageFieldPrefix}_${i}`;
      imageFields.push(fieldName); // Add all requested fields since empty fields aren't returned by Airtable
    }
    
    // Log warning if requested more than max images
    if (imageCount > maxImages) {
      console.log(`Warning: Maximum ${maxImages} images supported for ${generationType}, generating ${maxImages} images instead of ${imageCount}`);
    }
    
    // Update imageCount to match available fields
    const actualImageCount = imageFields.length;
    console.log(`Available image fields: ${imageFields.join(', ')}`);
    console.log(`Will generate ${actualImageCount} image(s) instead of requested ${imageCount}`);

    const recordsNeedingImages = airtableData.records.filter((record: { id: string; fields: Record<string, unknown> }) => {
      const hasPrompt = record.fields[promptField] && String(record.fields[promptField]).trim() !== '';
      const missingImages = imageFields.some(field => !record.fields[field]);
      
      // Check result_status field to prevent duplicate requests and ensure proper flow
      const resultStatus = String(record.fields.result_status || '');
      
      // Block if currently processing
      if (resultStatus.includes('_request_sent')) {
        return false;
      }
      
      // Different status requirements for initial vs edited vs prompt-only generation
      if (generationType === 'initial') {
        // Allow if result_status is "prompt_generated" (ready for images)
        const allowsGeneration = resultStatus === 'prompt_generated';
        if (!allowsGeneration) {
          return false;
        }
      } else if (generationType === 'edited') {
        // For edited generation, only allow when result_status is "initial_prompt_image_generated" (initial generation complete)
        if (resultStatus !== 'initial_prompt_image_generated') {
          return false;
        }
      }
      
      const result = hasPrompt && missingImages;
      return result;
    });

    if (imageFields.length === 0) {
      return NextResponse.json({
        message: `No numbered image fields found in table. Please add columns: initial_prompt_image_1, initial_prompt_image_2, etc.`,
        availableFields,
        requiredFields: ['initial_prompt_image_1', 'initial_prompt_image_2', 'initial_prompt_image_3', 'initial_prompt_image_4', 'initial_prompt_image_5'],
        processedCount: 0
      }, { status: 400 });
    }

    if (recordsNeedingImages.length === 0) {
      return NextResponse.json({
        message: `No records found that need ${generationType} image generation`,
        processedCount: 0
      });
    }

    const results = [];
    
    // First, update result_status for all records to prevent duplicate requests
    const statusValue = generationType === 'initial' 
      ? 'initial_prompt_image_request_sent'
      : 'edited_prompt_image_request_sent';
    
    for (const record of recordsNeedingImages) {
      try {
        await fetch(`https://api.airtable.com/v0/${airtableBaseId}/${tableName}/${record.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${airtableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fields: {
              result_status: statusValue
            }
          })
        });
      } catch (error) {
        console.error(`Failed to update result_status for record ${record.id}:`, error);
      }
    }
    
    // Process each record
    for (const record of recordsNeedingImages) {
      try {
        const prompt = record.fields[promptField];
        
        // Get reference image
        const referenceImageField = record.fields.reference_image_attached;
        let referenceImageBase64 = '';
        let referenceImageUrl = '';
        
        if (referenceImageField && Array.isArray(referenceImageField) && referenceImageField.length > 0) {
          referenceImageUrl = referenceImageField[0].url;
          referenceImageBase64 = await fetchImageAsBase64(referenceImageUrl);
        } else {
          console.log(`Skipping record ${record.id}: No reference image found`);
          results.push({
            recordId: record.id,
            status: 'error',
            error: 'No reference image found'
          });
          continue;
        }

        // Use provided modelId or default from selected characters field
        let bodyModelId = modelId;
        if (!bodyModelId && record.fields.selected_characters) {
          bodyModelId = String(record.fields.selected_characters);
        }
        
        if (!bodyModelId) {
          bodyModelId = "train-7f9911080f9e479198be762001437b16"; // Default model
        }

        const generatedImages = [];
        
        // Generate images based on actualImageCount (available fields)
        for (let i = 0; i < actualImageCount; i++) {
          try {
            console.log(`Generating ${generationType} image ${i + 1}/${actualImageCount} for record ${record.id}`);
            
            // Get optimal dimensions
            const imageDimensions = await getImageDimensions(referenceImageUrl);
            const optimalDimensions = getOptimalDimensions(imageDimensions.width, imageDimensions.height);
            
            // Start image generation
            const generateResponse = await imageClient.generateImageWithReference(
              prompt,
              referenceImageBase64,
              bodyModelId,
              optimalDimensions.width,
              optimalDimensions.height,
              false
            );

            const synthId = generateResponse.synth_id;
            if (!synthId) {
              throw new Error('No synth_id returned from image generation');
            }

            // Poll for completion (simplified polling - in production you might want to use a job queue)
            let attempts = 0;
            const maxAttempts = 60; // 5 minutes max
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
                throw new Error(`Image generation failed: ${JSON.stringify(statusResponse)}`);
              }
              
              attempts++;
            }

            if (!imageUrl) {
              throw new Error(`Timeout waiting for image generation to complete`);
            }

            generatedImages.push({
              url: imageUrl,
              field: imageFields[i]
            });

          } catch (error) {
            console.error(`Error generating image ${i + 1} for record ${record.id}:`, error);
            generatedImages.push({
              error: error instanceof Error ? error.message : 'Unknown error',
              field: imageFields[i]
            });
          }
        }

        // Update Airtable record with generated images
        const updateFields: Record<string, unknown> = {};
        
        generatedImages.forEach((img, index) => {
          if (img.url) {
            updateFields[imageFields[index]] = [{
              url: img.url
            }];
          }
        });

        if (Object.keys(updateFields).length > 0) {
          // Set result_status after successful generation
          updateFields.result_status = generationType === 'initial' 
            ? 'initial_prompt_image_generated'
            : 'edited_prompt_image_generated';
          
          const updateResponse = await fetch(`https://api.airtable.com/v0/${airtableBaseId}/${tableName}/${record.id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${airtableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fields: updateFields
            })
          });

          if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error(`Airtable update failed for ${record.id}:`, errorText);
            console.error(`Trying to update fields:`, Object.keys(updateFields));
            throw new Error(`Failed to update record ${record.id}: ${updateResponse.status} - ${errorText}`);
          }
        } else {
          // Even if no images were generated, set result_status to completion
          await fetch(`https://api.airtable.com/v0/${airtableBaseId}/${tableName}/${record.id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${airtableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fields: { 
                result_status: generationType === 'initial' 
                  ? 'initial_prompt_image_generated'
                  : 'edited_prompt_image_generated'
              }
            })
          });
        }

        const successCount = generatedImages.filter(img => img.url).length;
        const errorCount = generatedImages.filter(img => img.error).length;

        results.push({
          recordId: record.id,
          status: successCount > 0 ? 'success' : 'error',
          successCount,
          errorCount,
          generatedImages: generatedImages.length
        });

      } catch (error) {
        console.error(`Error processing record ${record.id}:`, error);
        
        // Set result_status to completion on error
        try {
          await fetch(`https://api.airtable.com/v0/${airtableBaseId}/${tableName}/${record.id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${airtableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fields: { 
                result_status: generationType === 'initial' 
                  ? 'initial_prompt_image_generated'
                  : 'edited_prompt_image_generated'
              }
            })
          });
        } catch (statusError) {
          console.error(`Failed to set error status for record ${record.id}:`, statusError);
        }
        
        results.push({
          recordId: record.id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const totalSuccess = results.filter(r => r.status === 'success').length;
    const totalErrors = results.filter(r => r.status === 'error').length;

    return NextResponse.json({
      message: `Processed ${results.length} records for ${generationType} image generation`,
      processedCount: results.length,
      successCount: totalSuccess,
      errorCount: totalErrors,
      results
    });

  } catch (error) {
    console.error('Error in image generation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: `Failed to generate images: ${errorMessage}` },
      { status: 500 }
    );
  }
}