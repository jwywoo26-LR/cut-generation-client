import { NextResponse } from 'next/server';
import { SYSTEM_PROMPTS, SystemPromptType } from '@/lib/systemPrompts';

interface GrokAPIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface CategoryAdjustment {
  recommendations?: string[];
  removals?: string[];
  description?: string;
}

interface StyleRule {
  rowStart: number;
  rowEnd: number;
  subject?: CategoryAdjustment;
  facial_expression?: CategoryAdjustment;
  clothing?: CategoryAdjustment;
  nudity?: CategoryAdjustment;
  angle?: CategoryAdjustment;
  action?: CategoryAdjustment;
  objects?: CategoryAdjustment;
  background?: CategoryAdjustment;
}

const CATEGORIES = ['subject', 'facial_expression', 'clothing', 'nudity', 'angle', 'action', 'objects', 'background'] as const;

function buildStyleAwarePrompt(basePrompt: string, styleRules: StyleRule[], rowNumber: number): { prompt: string; appliedRules: StyleRule[] } {
  // Filter rules that apply to this row
  const applicableRules = styleRules.filter(
    rule => rowNumber >= rule.rowStart && rowNumber <= rule.rowEnd
  );

  if (applicableRules.length === 0) {
    return { prompt: basePrompt, appliedRules: [] };
  }

  // Build style adjustment section
  const styleSection: string[] = [
    '',
    '=== STYLE ADJUSTMENTS FOR THIS IMAGE ===',
    'Apply the following style rules when generating tags:'
  ];

  for (const rule of applicableRules) {
    styleSection.push(`\nRule for rows ${rule.rowStart}-${rule.rowEnd}:`);

    for (const category of CATEGORIES) {
      const categoryRule = rule[category];
      if (categoryRule) {
        styleSection.push(`  ${category.toUpperCase()}:`);
        if (categoryRule.description) {
          styleSection.push(`    Guidance: ${categoryRule.description}`);
        }
        if (categoryRule.recommendations && categoryRule.recommendations.length > 0) {
          styleSection.push(`    INCLUDE these tags: ${categoryRule.recommendations.join(', ')}`);
        }
        if (categoryRule.removals && categoryRule.removals.length > 0) {
          styleSection.push(`    EXCLUDE/AVOID: ${categoryRule.removals.join(', ')}`);
        }
      }
    }
  }

  styleSection.push('');
  styleSection.push('Apply these style adjustments while analyzing the image. The final tag list should reflect both the image content AND these style rules.');
  styleSection.push('===================================');

  return {
    prompt: basePrompt + styleSection.join('\n'),
    appliedRules: applicableRules
  };
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
    const { tableName, recordIds, styleRules = [], rangeStart, rangeEnd } = await request.json() as {
      tableName: string;
      recordIds?: string[];
      styleRules?: StyleRule[];
      rangeStart?: number;
      rangeEnd?: number;
    };

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
    
    // Filter records that need prompt generation
    const recordsNeedingPrompts = airtableData.records.filter((record: { id: string; fields: Record<string, unknown> }) => {
      // Must have reference image
      const hasReference = record.fields.reference_image_attached && 
                          Array.isArray(record.fields.reference_image_attached) && 
                          record.fields.reference_image_attached.length > 0;
      
      const hasInitialPrompt = record.fields.initial_prompt && 
                              String(record.fields.initial_prompt).trim() !== '';
      const status = String(record.fields.status || '');
      
      // Records that need prompt generation:
      // 1. Have reference image
      // 2. Either: No initial_prompt yet, OR status is "True" (allowing regeneration)
      // 3. Not currently processing (not initial_request_sent or generation_request_sent)
      const isProcessing = status === 'initial_request_sent' || status === 'generation_request_sent';
      const allowsGeneration = !hasInitialPrompt || status === '' || status === 'True';
      
      return hasReference && allowsGeneration && !isProcessing;
    });

    if (recordsNeedingPrompts.length === 0) {
      return NextResponse.json({
        message: 'No records found that need prompt generation',
        processedCount: 0
      });
    }

    // Sort records by reference_image for consistent row numbering
    recordsNeedingPrompts.sort((a: { fields: Record<string, unknown> }, b: { fields: Record<string, unknown> }) => {
      const aName = String(a.fields.reference_image || '');
      const bName = String(b.fields.reference_image || '');
      return aName.localeCompare(bName);
    });

    // Create a map of record IDs to row numbers (1-based) BEFORE range filtering
    const recordRowMap = new Map<string, number>();
    recordsNeedingPrompts.forEach((record: { id: string }, index: number) => {
      recordRowMap.set(record.id, index + 1);
    });

    // Apply range filtering if specified (filter by row position in the sorted list)
    let filteredRecords = recordsNeedingPrompts;
    if (rangeStart !== undefined || rangeEnd !== undefined) {
      const start = rangeStart || 1;
      const end = rangeEnd || recordsNeedingPrompts.length;
      filteredRecords = recordsNeedingPrompts.filter((_: unknown, index: number) => {
        const rowNumber = index + 1;
        return rowNumber >= start && rowNumber <= end;
      });
    }

    if (filteredRecords.length === 0) {
      return NextResponse.json({
        message: `No records found in range ${rangeStart || 1}-${rangeEnd || recordsNeedingPrompts.length} that need prompt generation`,
        processedCount: 0
      });
    }

    // Replace recordsNeedingPrompts with filtered records for processing
    const recordsToProcess = filteredRecords;

    const results: Array<{
      recordId: string;
      rowNumber?: number;
      status: 'success' | 'error';
      initialPrompt?: string;
      appliedRulesCount?: number;
      error?: string;
    }> = [];

    // First, set status to "initial_request_sent" for all records to prevent duplicates
    for (const record of recordsToProcess) {
      try {
        await fetch(`https://api.airtable.com/v0/${baseId}/${tableName}/${record.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fields: { status: 'initial_request_sent' }
          })
        });
      } catch (error) {
        console.error(`Failed to update status for record ${record.id}:`, error);
      }
    }
    
    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendProgress = (data: unknown) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        // Send initial progress
        sendProgress({
          type: 'start',
          total: recordsToProcess.length,
        });

        // Process each record
        for (let index = 0; index < recordsToProcess.length; index++) {
          const record = recordsToProcess[index];

          try {
            // Get reference image URL
            const referenceImageField = record.fields.reference_image_attached;
            let imageUrl = '';

            if (referenceImageField && Array.isArray(referenceImageField) && referenceImageField.length > 0) {
              imageUrl = referenceImageField[0].url;
            }

            if (!imageUrl) {
              console.log(`Skipping record ${record.id}: No reference image found`);
              // Set status to "False" for records without reference images
              await fetch(`https://api.airtable.com/v0/${baseId}/${tableName}/${record.id}`, {
                method: 'PATCH',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  fields: { status: 'False' }
                })
              });

              sendProgress({
                type: 'progress',
                current: index + 1,
                total: recordsToProcess.length,
                recordId: record.id,
                status: 'skipped',
                message: 'No reference image found',
              });

              results.push({
                recordId: record.id,
                status: 'error' as const,
                error: 'No reference image found'
              });
              continue;
            }

            // Get row number for this record
            const rowNumber = recordRowMap.get(record.id) || 1;

            // Build style-aware prompt if style rules are provided
            const basePrompt = SYSTEM_PROMPTS[SystemPromptType.TAG_INITIAL_GENERATION];
            const { prompt: styleAwarePrompt, appliedRules } = buildStyleAwarePrompt(
              basePrompt,
              styleRules,
              rowNumber
            );

            // Generate prompt using Grok API with style-aware prompt
            const grokResponse = await grokClient.evaluateImagePrompt(
              imageUrl,
              styleAwarePrompt,
              `Reference: ${record.fields.reference_image || ''}, Row: ${rowNumber}`
            );

            // Extract prompt content
            let initialPrompt = '';

            if (grokResponse.choices && grokResponse.choices.length > 0) {
              initialPrompt = grokResponse.choices[0].message.content;
            }

            // Prepare applied rules as JSON string for storage
            const appliedStyleRulesJson = appliedRules.length > 0
              ? JSON.stringify(appliedRules, null, 2)
              : '';

            // Update the record in Airtable with generated prompt and applied rules
            const updatePayload: { fields: Record<string, string> } = {
              fields: {
                initial_prompt: initialPrompt,
                applied_style_rules: appliedStyleRulesJson,
              }
            };

            let updateResponse = await fetch(`https://api.airtable.com/v0/${baseId}/${tableName}/${record.id}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(updatePayload)
            });

            // If update fails, try without applied_style_rules (field might not exist in older tables)
            if (!updateResponse.ok) {
              const errorText = await updateResponse.text();
              console.error(`Airtable update error for record ${record.id}:`, errorText);

              // Retry without applied_style_rules field
              if (errorText.includes('applied_style_rules') || errorText.includes('UNKNOWN_FIELD_NAME')) {
                console.log(`Retrying update without applied_style_rules for record ${record.id}`);
                const fallbackPayload = {
                  fields: {
                    initial_prompt: initialPrompt,
                  }
                };

                updateResponse = await fetch(`https://api.airtable.com/v0/${baseId}/${tableName}/${record.id}`, {
                  method: 'PATCH',
                  headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(fallbackPayload)
                });

                if (!updateResponse.ok) {
                  const fallbackError = await updateResponse.text();
                  throw new Error(`Failed to update record ${record.id}: ${fallbackError}`);
                }
              } else {
                throw new Error(`Failed to update record ${record.id}: ${errorText}`);
              }
            }

            const result = {
              recordId: record.id,
              rowNumber,
              status: 'success' as const,
              initialPrompt,
              appliedRulesCount: appliedRules.length
            };

            results.push(result);

            // Send progress update
            sendProgress({
              type: 'progress',
              current: index + 1,
              total: recordsToProcess.length,
              recordId: record.id,
              status: 'success',
            });

          } catch (error) {
            console.error(`Error processing record ${record.id}:`, error);

            // Set status to "False" on error
            try {
              await fetch(`https://api.airtable.com/v0/${baseId}/${tableName}/${record.id}`, {
                method: 'PATCH',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  fields: { status: 'False' }
                })
              });
            } catch (statusError) {
              console.error(`Failed to set error status for record ${record.id}:`, statusError);
            }

            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            results.push({
              recordId: record.id,
              status: 'error' as const,
              error: errorMessage
            });

            // Send progress update with error
            sendProgress({
              type: 'progress',
              current: index + 1,
              total: recordsToProcess.length,
              recordId: record.id,
              status: 'error',
              error: errorMessage,
            });
          }
        }

        // Send completion
        sendProgress({
          type: 'complete',
          results,
          processedCount: results.length,
        });

        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in prompt generation:', error);
    return NextResponse.json(
      { error: 'Failed to generate prompts' },
      { status: 500 }
    );
  }
}