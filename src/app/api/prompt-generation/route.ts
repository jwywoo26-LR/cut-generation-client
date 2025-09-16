import { NextResponse } from 'next/server';
import { SYSTEM_PROMPTS, SystemPromptType } from '@/lib/systemPrompts';

interface GrokAPIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

class GrokAPIClient {
  private baseUrl = "https://api.x.ai/v1";
  private apiKey: string;
  private headers: Record<string, string>;

  constructor() {
    this.apiKey = process.env.GROK_API_KEY || '';
    
    if (!this.apiKey) {
      throw new Error("GROK_API_KEY must be set in environment variables");
    }
    
    this.headers = {
      "Authorization": `Bearer ${this.apiKey}`,
      "Content-Type": "application/json"
    };
  }

  async evaluateImagePrompt(
    imageUrl: string,
    tagPrompt?: string,
    context: string = "",
    model: string = "grok-2-vision-latest",
    detail: string = "high"
  ): Promise<GrokAPIResponse> {
    
    // Use system prompt from enum structure
    const defaultTagPrompt = SYSTEM_PROMPTS[SystemPromptType.TAG_INITIAL_GENERATION];
    const finalTagPrompt = tagPrompt || defaultTagPrompt;

    // Generate initial prompt
    const response = await this.evaluateImage(
      imageUrl,
      finalTagPrompt,
      context,
      model,
      detail
    );

    return response;
  }

  private async evaluateImage(
    imageUrl: string,
    prompt: string,
    context: string = "",
    model: string = "grok-2-vision-latest",
    detail: string = "high"
  ): Promise<GrokAPIResponse> {
    
    const imageContent = {
      type: "image_url",
      image_url: {
        url: imageUrl,
        detail: detail
      }
    };

    // Build user content with image and prompt
    const userContent = [
      imageContent,
      {
        type: "text",
        text: prompt
      }
    ];

    // Add context if provided
    if (context) {
      userContent.push({
        type: "text",
        text: `Context: ${context}`
      });
    }

    const messages = [
      {
        role: "user",
        content: userContent
      }
    ];

    const payload = {
      model: model,
      messages: messages,
      temperature: 0.5
    };

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Grok API request failed: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Grok API request failed:', error);
      throw error;
    }
  }
}

export async function POST(request: Request) {
  try {
    const { tableName, recordIds } = await request.json();

    if (!tableName) {
      return NextResponse.json(
        { error: 'Table name is required' },
        { status: 400 }
      );
    }

    // Get Airtable configuration
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;

    if (!apiKey || !baseId) {
      return NextResponse.json(
        { error: 'Missing Airtable configuration' },
        { status: 500 }
      );
    }

    // Initialize Grok client
    const grokClient = new GrokAPIClient();

    // Fetch records from Airtable
    const airtableUrl = recordIds && recordIds.length > 0
      ? `https://api.airtable.com/v0/${baseId}/${tableName}?${recordIds.map((id: string) => `filterByFormula=RECORD_ID()="${id}"`).join('&')}`
      : `https://api.airtable.com/v0/${baseId}/${tableName}`;

    const airtableResponse = await fetch(airtableUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!airtableResponse.ok) {
      throw new Error(`Airtable API error: ${airtableResponse.status}`);
    }

    const airtableData = await airtableResponse.json();
    
    // Filter records that need prompt generation (must have reference image but no prompts yet)
    const recordsNeedingPrompts = airtableData.records.filter((record: any) => {
      // Must have reference image
      const hasReference = record.fields.reference_image_attached && 
                          Array.isArray(record.fields.reference_image_attached) && 
                          record.fields.reference_image_attached.length > 0;
      
      // Must NOT have initial_prompt yet
      const hasInitialPrompt = record.fields.initial_prompt && 
                              record.fields.initial_prompt.trim() !== '';
      
      // Check if status allows prompt generation (not currently processing)
      const status = record.fields.status || '';
      const isProcessing = status === 'initial_request_sent' || status === 'prompt_generating';
      
      return hasReference && !hasInitialPrompt && !isProcessing;
    });

    if (recordsNeedingPrompts.length === 0) {
      return NextResponse.json({
        message: 'No records found that need prompt generation',
        processedCount: 0
      });
    }

    const results = [];
    
    // Process each record
    for (const record of recordsNeedingPrompts) {
      try {
        // Get reference image URL
        const referenceImageField = record.fields.reference_image_attached;
        let imageUrl = '';
        
        if (referenceImageField && Array.isArray(referenceImageField) && referenceImageField.length > 0) {
          imageUrl = referenceImageField[0].url;
        }

        if (!imageUrl) {
          console.log(`Skipping record ${record.id}: No reference image found`);
          continue;
        }

        // Generate prompt using Grok API
        const grokResponse = await grokClient.evaluateImagePrompt(
          imageUrl,
          undefined, // Use default prompt
          `Reference: ${record.fields.reference_image || ''}` // Add reference context
        );

        // Extract prompt content
        let initialPrompt = '';

        if (grokResponse.choices && grokResponse.choices.length > 0) {
          initialPrompt = grokResponse.choices[0].message.content;
        }

        // Update the record in Airtable with generated prompt
        const updatePayload = {
          fields: {
            initial_prompt: initialPrompt,
            status: 'prompt_generated'
          }
        };

        const updateResponse = await fetch(`https://api.airtable.com/v0/${baseId}/${tableName}/${record.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatePayload)
        });

        if (!updateResponse.ok) {
          throw new Error(`Failed to update record ${record.id}`);
        }

        results.push({
          recordId: record.id,
          status: 'success',
          initialPrompt
        });

      } catch (error) {
        console.error(`Error processing record ${record.id}:`, error);
        results.push({
          recordId: record.id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      message: `Processed ${results.length} records`,
      processedCount: results.length,
      results
    });

  } catch (error) {
    console.error('Error in prompt generation:', error);
    return NextResponse.json(
      { error: 'Failed to generate prompts' },
      { status: 500 }
    );
  }
}