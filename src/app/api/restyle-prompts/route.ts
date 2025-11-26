import { NextResponse } from 'next/server';

interface RestyleRule {
  id: string;
  rowStart: number;
  rowEnd: number;
  suggestedTags: string[];
  notSuggestedTags: string[];
  removeTags: string[];
  context: string;
}

interface RestyleRequest {
  tableName: string;
  fromColumn: string;
  toColumn: string;
  rules: RestyleRule[];
}

interface AirtableRecord {
  id: string;
  fields: {
    [key: string]: unknown;
  };
}

interface GrokAPIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// Grok API client class (consistent with prompt-generation route)
class GrokAPIClient {
  private baseUrl = 'https://api.x.ai/v1';
  private apiKey: string;
  private headers: Record<string, string>;

  constructor() {
    this.apiKey = process.env.GROK_API_KEY || '';

    if (!this.apiKey) {
      throw new Error('GROK_API_KEY must be set in environment variables');
    }

    this.headers = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async chat(systemPrompt: string, userPrompt: string): Promise<GrokAPIResponse> {
    const payload = {
      model: 'grok-3-mini-fast-beta',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: 0.3,
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Grok API request failed: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }
}

async function restylePrompt(
  grokClient: GrokAPIClient,
  originalPrompt: string,
  rules: RestyleRule[],
  rowIndex: number
): Promise<{ restyled: string; appliedRules: string[]; changes: { added: string[]; removed: string[] } }> {
  // Find applicable rules for this row (1-based indexing for user display)
  const applicableRules = rules.filter(
    (rule) => rowIndex + 1 >= rule.rowStart && rowIndex + 1 <= rule.rowEnd
  );

  if (applicableRules.length === 0) {
    // No rules apply, return original
    return { restyled: originalPrompt, appliedRules: [], changes: { added: [], removed: [] } };
  }

  // Build the prompt for Grok
  const rulesDescription = applicableRules
    .map((rule, i) => {
      const parts: string[] = [];
      if (rule.suggestedTags.length > 0) {
        parts.push(`Suggested tags to add: ${rule.suggestedTags.join(', ')}`);
      }
      if (rule.notSuggestedTags.length > 0) {
        parts.push(`Tags to avoid/discourage: ${rule.notSuggestedTags.join(', ')}`);
      }
      if (rule.removeTags.length > 0) {
        parts.push(`Tags that MUST be removed: ${rule.removeTags.join(', ')}`);
      }
      if (rule.context.trim()) {
        parts.push(`Context/Instructions: ${rule.context}`);
      }
      return `Rule ${i + 1} (rows ${rule.rowStart}-${rule.rowEnd}):\n${parts.join('\n')}`;
    })
    .join('\n\n');

  const systemPrompt = `You are a prompt tag editor for image generation. Your job is to modify comma-separated tag lists based on given rules.

Rules to apply:
${rulesDescription}

Guidelines:
1. Maintain the comma-separated format
2. For "suggested tags": Add them naturally if they fit the context
3. For "not suggested tags": Remove or replace them with appropriate alternatives
4. For "must remove tags": These MUST be removed completely
5. Follow the context/instructions carefully - they explain the intent
6. Keep the overall style and meaning of the prompt
7. Don't add tags that contradict the scene
8. Output ONLY the modified tag list, nothing else`;

  const userPrompt = `Original prompt (row ${rowIndex + 1}):
${originalPrompt}

Apply the rules and output ONLY the modified comma-separated tag list.`;

  try {
    const response = await grokClient.chat(systemPrompt, userPrompt);

    const restyled =
      response.choices && response.choices.length > 0
        ? response.choices[0].message.content.trim()
        : originalPrompt;

    // Calculate what changed
    const originalTags = originalPrompt.split(',').map((t) => t.trim().toLowerCase());
    const newTags = restyled.split(',').map((t) => t.trim().toLowerCase());

    const added = newTags.filter((t) => !originalTags.includes(t));
    const removed = originalTags.filter((t) => !newTags.includes(t));

    return {
      restyled,
      appliedRules: applicableRules.map((r) => `rows ${r.rowStart}-${r.rowEnd}`),
      changes: { added, removed },
    };
  } catch (error) {
    console.error('Error calling Grok for restyle:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  const body: RestyleRequest = await request.json();
  const { tableName, fromColumn, toColumn, rules } = body;

  if (!tableName || !fromColumn || !toColumn) {
    return NextResponse.json(
      { error: 'tableName, fromColumn, and toColumn are required' },
      { status: 400 }
    );
  }

  if (!rules || rules.length === 0) {
    return NextResponse.json({ error: 'At least one restyle rule is required' }, { status: 400 });
  }

  // Get Airtable configuration
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;

  if (!apiKey || !baseId) {
    return NextResponse.json({ error: 'Missing Airtable configuration' }, { status: 500 });
  }

  if (!process.env.GROK_API_KEY) {
    return NextResponse.json({ error: 'Missing Grok API key' }, { status: 500 });
  }

  // Initialize Grok client
  let grokClient: GrokAPIClient;
  try {
    grokClient = new GrokAPIClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initialize Grok client' },
      { status: 500 }
    );
  }

  // Use Server-Sent Events for streaming response
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isControllerClosed = false;

      const sendEvent = (eventType: string, data: Record<string, unknown>) => {
        if (isControllerClosed) {
          console.log(`⚠️ Skipping event '${eventType}' - controller already closed`);
          return;
        }
        try {
          controller.enqueue(encoder.encode(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch (error) {
          console.log(`⚠️ Failed to send event '${eventType}':`, error);
          isControllerClosed = true;
        }
      };

      const closeController = () => {
        if (!isControllerClosed) {
          isControllerClosed = true;
          controller.close();
        }
      };

      try {
        // Fetch records from Airtable
        const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableName}`;

        const airtableResponse = await fetch(airtableUrl, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (!airtableResponse.ok) {
          throw new Error(`Airtable API error: ${airtableResponse.status}`);
        }

        const airtableData = await airtableResponse.json();
        const records = airtableData.records as AirtableRecord[];

        // Filter records that have content in the source column
        const recordsToProcess = records.filter((record) => {
          const sourceContent = record.fields[fromColumn];
          return sourceContent && String(sourceContent).trim() !== '';
        });

        if (recordsToProcess.length === 0) {
          sendEvent('complete', {
            message: `No records found with content in ${fromColumn}`,
            processedCount: 0,
          });
          closeController();
          return;
        }

        console.log(`🎨 Restyle: Processing ${recordsToProcess.length} records`);
        console.log(`📥 From: ${fromColumn} → 📤 To: ${toColumn}`);
        console.log(`📋 Rules: ${rules.length}`);

        sendEvent('progress', { current: 0, total: recordsToProcess.length, status: 'starting' });

        let successCount = 0;
        let errorCount = 0;
        const results: Array<{
          recordId: string;
          rowIndex: number;
          status: string;
          original?: string;
          restyled?: string;
          changes?: { added: string[]; removed: string[] };
          error?: string;
        }> = [];

        // Process each record
        for (let i = 0; i < recordsToProcess.length; i++) {
          const record = recordsToProcess[i];
          const originalPrompt = String(record.fields[fromColumn]);

          try {
            // Get the actual row index from all records
            const actualIndex = records.findIndex((r) => r.id === record.id);

            // Restyle the prompt
            const result = await restylePrompt(grokClient, originalPrompt, rules, actualIndex);

            // Update Airtable
            const updateResponse = await fetch(
              `https://api.airtable.com/v0/${baseId}/${tableName}/${record.id}`,
              {
                method: 'PATCH',
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  fields: {
                    [toColumn]: result.restyled,
                  },
                }),
              }
            );

            if (!updateResponse.ok) {
              throw new Error(`Failed to update record: ${updateResponse.status}`);
            }

            successCount++;
            results.push({
              recordId: record.id,
              rowIndex: actualIndex + 1,
              status: 'success',
              original: originalPrompt.substring(0, 100),
              restyled: result.restyled.substring(0, 100),
              changes: result.changes,
            });

            console.log(`✅ Row ${actualIndex + 1}: Restyled (${result.appliedRules.join(', ') || 'no rules applied'})`);
          } catch (error) {
            errorCount++;
            results.push({
              recordId: record.id,
              rowIndex: i + 1,
              status: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            console.error(`❌ Row ${i + 1}: Error -`, error);
          }

          // Send progress
          sendEvent('progress', {
            current: i + 1,
            total: recordsToProcess.length,
            status: 'processing',
            lastRow: i + 1,
          });

          // Small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        // Send completion event
        sendEvent('complete', {
          message: 'Restyle complete',
          processedCount: recordsToProcess.length,
          successCount,
          errorCount,
          fromColumn,
          toColumn,
          rulesCount: rules.length,
          results,
        });

        closeController();
      } catch (error) {
        sendEvent('error', {
          error: error instanceof Error ? error.message : 'Failed to process restyle',
        });
        closeController();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
