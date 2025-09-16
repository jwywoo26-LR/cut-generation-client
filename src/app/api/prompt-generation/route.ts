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

  async evaluateImageDualPrompts(
    imageUrl: string,
    tagInitialPrompt?: string,
    enhancingTagPrompt?: string,
    context: string = "",
    model: string = "grok-2-vision-latest",
    detail: string = "high"
  ): Promise<{ tag_initial_response: GrokAPIResponse; enhancing_tag_response: GrokAPIResponse }> {
    
    // Use system prompts from enum structure
    const defaultTagInitialPrompt = SYSTEM_PROMPTS[SystemPromptType.TAG_INITIAL_GENERATION];
    const defaultEnhancingPrompt = SYSTEM_PROMPTS[SystemPromptType.ENHANCING_TAG_PROMPT];

    const finalTagInitialPrompt = tagInitialPrompt || defaultTagInitialPrompt;
    const finalEnhancingPrompt = enhancingTagPrompt || defaultEnhancingPrompt;

    // First request - tag initial generation
    const tagInitialResponse = await this.evaluateImage(
      imageUrl,
      finalTagInitialPrompt,
      context,
      model,
      detail
    );

    // Extract content from initial response
    let initialContent = "";
    if (tagInitialResponse.choices && tagInitialResponse.choices.length > 0) {
      initialContent = tagInitialResponse.choices[0].message.content;
    }

    // Second request with enhanced prompt including previous result
    const enhancedPrompt = `${finalEnhancingPrompt}\n\nPrevious tag analysis result:\n${initialContent}`;
    
    const enhancingTagResponse = await this.evaluateImage(
      imageUrl,
      enhancedPrompt,
      context,
      model,
      detail
    );

    return {
      tag_initial_response: tagInitialResponse,
      enhancing_tag_response: enhancingTagResponse
    };
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
    
    // Filter records that need prompt generation (only have reference fields filled)
    const PROMPT_GEN_COLUMNS = [
      'initial_prompt', 'enhanced_prompt', 'edited_prompt', 'selected_characters', 'status',
      'initial_prompt_image_1', 'initial_prompt_image_2', 'initial_prompt_image_3',
      'enhanced_prompt_image_1', 'enhanced_prompt_image_2', 'enhanced_prompt_image_3',
      'edited_prompt_image_1', 'edited_prompt_image_2', 'edited_prompt_image_3',
      'edited_prompt_image_4', 'edited_prompt_image_5'
    ];

    const recordsNeedingPrompts = airtableData.records.filter((record: any) => {
      return PROMPT_GEN_COLUMNS.every(column => {
        const value = record.fields[column];
        return !value || (typeof value === 'string' && value.trim() === '');
      });
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

        // Generate prompts using Grok API
        const grokResponse = await grokClient.evaluateImageDualPrompts(
          imageUrl,
          undefined, // Use default prompts
          undefined,
          `Reference: ${record.fields.reference_image || ''}` // Add reference context
        );

        // Extract prompt content
        let initialPrompt = '';
        let enhancedPrompt = '';

        if (grokResponse.tag_initial_response.choices && grokResponse.tag_initial_response.choices.length > 0) {
          initialPrompt = grokResponse.tag_initial_response.choices[0].message.content;
        }

        if (grokResponse.enhancing_tag_response.choices && grokResponse.enhancing_tag_response.choices.length > 0) {
          enhancedPrompt = grokResponse.enhancing_tag_response.choices[0].message.content;
        }

        // Update the record in Airtable with generated prompts
        const updatePayload = {
          fields: {
            initial_prompt: initialPrompt,
            enhanced_prompt: enhancedPrompt,
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
          initialPrompt,
          enhancedPrompt
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