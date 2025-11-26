import { NextResponse } from 'next/server';

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

interface GrokAPIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

class GrokTextAPIClient {
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

  async evaluateText(prompt: string, temperature: number = 0.3): Promise<GrokAPIResponse> {
    const messages = [
      {
        role: "user",
        content: prompt
      }
    ];

    const payload = {
      model: "grok-2-1212",
      messages: messages,
      temperature: temperature
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

function buildStyleAdjustmentPrompt(
  originalTags: string,
  styleRules: StyleRule[],
  rowNumber: number
): string {
  const promptParts = [
    "You are an expert tag adjuster for image generation prompts.",
    "Your task is to modify the given tags based on style rules while preserving the original meaning.",
    "",
    `ORIGINAL TAGS: ${originalTags}`,
    "",
    "STYLE RULES TO APPLY:"
  ];

  const categories = ['subject', 'facial_expression', 'clothing', 'nudity', 'angle', 'action', 'objects', 'background'] as const;

  for (const rule of styleRules) {
    if (rowNumber >= rule.rowStart && rowNumber <= rule.rowEnd) {
      promptParts.push(`\nFor rows ${rule.rowStart}-${rule.rowEnd}:`);

      for (const category of categories) {
        const categoryRule = rule[category];
        if (categoryRule) {
          promptParts.push(`  ${category.toUpperCase()}:`);
          if (categoryRule.description) {
            promptParts.push(`    Description: ${categoryRule.description}`);
          }
          if (categoryRule.recommendations && categoryRule.recommendations.length > 0) {
            promptParts.push(`    Recommend adding: ${categoryRule.recommendations.join(', ')}`);
          }
          if (categoryRule.removals && categoryRule.removals.length > 0) {
            promptParts.push(`    Remove/Replace: ${categoryRule.removals.join(', ')}`);
          }
        }
      }
    }
  }

  promptParts.push("");
  promptParts.push("INSTRUCTIONS:");
  promptParts.push("1. Apply the style rules intelligently - don't just mechanically add/remove tags");
  promptParts.push("2. Maintain coherence and flow of the tag list");
  promptParts.push("3. If a removal rule mentions a concept, remove related tags too");
  promptParts.push("4. If a recommendation makes sense given the image context, add it naturally");
  promptParts.push("5. Keep the same comma-separated format");
  promptParts.push("");
  promptParts.push("OUTPUT FORMAT (exactly these lines):");
  promptParts.push("ADJUSTED_TAGS: tag1, tag2, tag3, ...");
  promptParts.push("REASONING: Brief explanation of changes made");
  promptParts.push("ADDED: tag_a, tag_b (or None)");
  promptParts.push("REMOVED: tag_x, tag_y (or None)");

  return promptParts.join('\n');
}

function parseAdjustmentResponse(
  response: GrokAPIResponse,
  originalTags: string
): { adjustedTags: string; reasoning: string; added: string[]; removed: string[] } {
  try {
    if (!response.choices || response.choices.length === 0) {
      throw new Error("No response from AI");
    }

    const content = response.choices[0].message.content;

    let adjustedTags = originalTags;
    let reasoning = "AI adjustment completed";
    let added: string[] = [];
    let removed: string[] = [];

    const lines = content.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("ADJUSTED_TAGS:")) {
        adjustedTags = trimmedLine.replace("ADJUSTED_TAGS:", "").trim();
        adjustedTags = adjustedTags.replace(/^[\[\]"']+|[\[\]"']+$/g, '');
        adjustedTags = adjustedTags.split(',').map(tag => tag.trim()).filter(Boolean).join(', ');
      } else if (trimmedLine.startsWith("REASONING:")) {
        reasoning = trimmedLine.replace("REASONING:", "").trim();
      } else if (trimmedLine.startsWith("ADDED:")) {
        const addedStr = trimmedLine.replace("ADDED:", "").trim();
        if (addedStr && addedStr.toLowerCase() !== "none") {
          added = addedStr.split(',').map(tag => tag.trim()).filter(Boolean);
        }
      } else if (trimmedLine.startsWith("REMOVED:")) {
        const removedStr = trimmedLine.replace("REMOVED:", "").trim();
        if (removedStr && removedStr.toLowerCase() !== "none") {
          removed = removedStr.split(',').map(tag => tag.trim()).filter(Boolean);
        }
      }
    }

    return { adjustedTags, reasoning, added, removed };
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    return { adjustedTags: originalTags, reasoning: "Failed to parse AI response", added: [], removed: [] };
  }
}

export async function POST(request: Request) {
  try {
    const { tableName, styleRules } = await request.json();

    if (!tableName) {
      return NextResponse.json(
        { error: 'Table name is required' },
        { status: 400 }
      );
    }

    if (!styleRules || !Array.isArray(styleRules) || styleRules.length === 0) {
      return NextResponse.json(
        { error: 'Style rules are required' },
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
    const grokClient = new GrokTextAPIClient();

    // Fetch all records from Airtable
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}`;
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

    // Filter records that have initial_prompt
    const recordsWithPrompts = airtableData.records.filter(
      (record: { id: string; fields: Record<string, unknown> }) => {
        const hasInitialPrompt = record.fields.initial_prompt &&
                                String(record.fields.initial_prompt).trim() !== '';
        return hasInitialPrompt;
      }
    );

    if (recordsWithPrompts.length === 0) {
      return NextResponse.json({
        message: 'No records found with initial prompts',
        processedCount: 0
      });
    }

    // Sort records by reference_image for consistent row numbering
    recordsWithPrompts.sort((a: { fields: Record<string, unknown> }, b: { fields: Record<string, unknown> }) => {
      const aName = String(a.fields.reference_image || '');
      const bName = String(b.fields.reference_image || '');
      return aName.localeCompare(bName);
    });

    const results = [];

    // Process each record
    for (let i = 0; i < recordsWithPrompts.length; i++) {
      const record = recordsWithPrompts[i];
      const rowNumber = i + 1; // 1-based row number

      try {
        const initialPrompt = String(record.fields.initial_prompt);

        // Check if any style rule applies to this row
        const applicableRules = styleRules.filter(
          (rule: StyleRule) => rowNumber >= rule.rowStart && rowNumber <= rule.rowEnd
        );

        if (applicableRules.length === 0) {
          // No rules apply, skip this record
          results.push({
            recordId: record.id,
            rowNumber,
            status: 'skipped',
            reason: 'No style rules apply to this row'
          });
          continue;
        }

        // Build prompt for AI adjustment
        const prompt = buildStyleAdjustmentPrompt(initialPrompt, applicableRules, rowNumber);

        // Get AI adjustment
        const grokResponse = await grokClient.evaluateText(prompt);

        // Parse response
        const { adjustedTags, reasoning, added, removed } = parseAdjustmentResponse(grokResponse, initialPrompt);

        // Update the record in Airtable with restyled_prompt
        const updatePayload = {
          fields: {
            restyled_prompt: adjustedTags
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
          rowNumber,
          status: 'success',
          originalPrompt: initialPrompt,
          adjustedPrompt: adjustedTags,
          reasoning,
          added,
          removed
        });

      } catch (error) {
        console.error(`Error processing record ${record.id}:`, error);
        results.push({
          recordId: record.id,
          rowNumber,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    return NextResponse.json({
      message: `Processed ${results.length} records: ${successCount} success, ${skippedCount} skipped, ${errorCount} errors`,
      processedCount: successCount,
      skippedCount,
      errorCount,
      results
    });

  } catch (error) {
    console.error('Error in style adjustment:', error);
    return NextResponse.json(
      { error: 'Failed to apply style adjustments' },
      { status: 500 }
    );
  }
}
