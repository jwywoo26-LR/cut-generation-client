import { NextRequest } from 'next/server';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const GROK_API_KEY = process.env.GROK_API_KEY;

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const sendEvent = async (event: string, data: unknown) => {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    await writer.write(encoder.encode(message));
  };

  // Start processing in background
  (async () => {
    try {
      const { tableName, targetColumn, theme, defaultTags } = await request.json();

      if (!tableName || !targetColumn) {
        await sendEvent('error', { error: 'Missing required fields: tableName and targetColumn' });
        await writer.close();
        return;
      }

      // Fetch all records from the table
      const listUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`;

      const listResponse = await fetch(listUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!listResponse.ok) {
        const errorData = await listResponse.json();
        await sendEvent('error', { error: 'Failed to fetch records from Airtable', details: errorData });
        await writer.close();
        return;
      }

      const listData = await listResponse.json();
      const records = listData.records || [];

      if (records.length === 0) {
        await sendEvent('error', { error: 'No records found in table' });
        await writer.close();
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      // Process each record
      for (let i = 0; i < records.length; i++) {
        const record = records[i];

        try {
          // Generate random prompt using Grok
          const prompt = await generateRandomPrompt(theme, defaultTags);

          // Update the record in Airtable
          const updateUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}/${record.id}`;

          const updateResponse = await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${AIRTABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fields: {
                [targetColumn]: prompt,
              },
            }),
          });

          if (updateResponse.ok) {
            successCount++;
          } else {
            console.error(`Failed to update record ${record.id}`);
            errorCount++;
          }
        } catch (error) {
          console.error(`Error processing record ${record.id}:`, error);
          errorCount++;
        }

        // Send progress update
        await sendEvent('progress', { current: i + 1, total: records.length });

        // Add small delay to avoid rate limiting
        if (i < records.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Send completion event
      await sendEvent('complete', {
        processedCount: records.length,
        successCount,
        errorCount,
      });
    } catch (error) {
      console.error('Random prompt generation error:', error);
      await sendEvent('error', { error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

async function generateRandomPrompt(theme?: string, defaultTags?: string): Promise<string> {
  try {
    const systemPrompt = `You are an EXTREMELY creative AI prompt generator for image generation. Generate WILD, IMAGINATIVE, and UNIQUE prompts that push creative boundaries!

CRITICAL RULES:
1. Generate prompts in comma-separated tag format
2. BE FUCKING CREATIVE! Mix unexpected elements, unusual combinations, wild concepts
3. Include DIVERSE and SURPRISING elements:
   - Unexpected settings (floating islands, underwater cities, dream dimensions, mirror worlds)
   - Unusual moods (surreal, ethereal, chaotic, serene, mysterious, psychedelic)
   - Creative actions (dancing with light, weaving reality, commanding elements, dissolving into particles)
   - Artistic styles (oil painting, watercolor, digital art, anime, semi-realistic, impressionist, cyberpunk, fantasy)
   - Unique lighting (bioluminescent, volumetric, dramatic shadows, rainbow light, starlight, aurora)
   - Unexpected details (glowing tattoos, floating objects, particle effects, energy auras, magical symbols)
4. VARY EVERYTHING - no two prompts should feel similar
5. Mix genres: fantasy + sci-fi, realistic + surreal, traditional + futuristic
${defaultTags ? `6. ALWAYS include these default tags at the start: ${defaultTags}` : ''}
${theme ? `7. Follow this theme but make it EXTRAORDINARY: ${theme}` : '7. Generate COMPLETELY WILD random concepts - surprise me!'}

Examples of CREATIVE prompts:
- 1girl, solo, high quality, masterpiece, floating in galaxy, cosmic dress made of stars, nebula hair, reaching for constellations, surreal, ethereal glow, space aesthetic, dreamy atmosphere
- 1girl, solo, high quality, masterpiece, underwater temple ruins, bioluminescent jellyfish, ancient architecture, swimming pose, flowing robes, mystical blue lighting, particles of light, fantasy
- 1girl, solo, high quality, masterpiece, cyberpunk street at sunset, holographic butterflies, neon graffiti, leather jacket, confident pose, pink and blue lighting, rain reflections, futuristic
- 1girl, solo, high quality, masterpiece, autumn forest spirit, leaves swirling around, glowing amber eyes, ethereal dress made of foliage, magical atmosphere, golden hour, fantasy art
- 1girl, solo, high quality, masterpiece, steampunk airship deck, brass goggles, mechanical wings, clockwork city below, dramatic clouds, adventure theme, vintage aesthetic, detailed machinery
- 1girl, solo, high quality, masterpiece, crystalline ice palace, frosted gown, snowflake crown, aurora borealis, winter magic, shimmering particles, elegant pose, cold color palette
- 1girl, solo, high quality, masterpiece, desert oasis at night, star-filled sky, flowing silk, dancing with fire, mystical symbols, warm and cool contrast, exotic atmosphere
- 1girl, solo, high quality, masterpiece, cherry blossom dimension, petals forming portals, kimono with galaxy pattern, serene expression, pink and purple hues, dreamlike, Japanese aesthetic meets cosmic
- 1girl, solo, high quality, masterpiece, neon rain city, reflective puddles, umbrella made of light, cyberpunk fashion, moody atmosphere, bokeh lights, cinematic composition
- 1girl, solo, high quality, masterpiece, library of infinite books, floating tomes, magical scholar, glowing runes, ancient knowledge, warm candlelight, fantasy academia, detailed environment

PUSH BOUNDARIES! Be bold, be creative, be unexpected!`;

    const userPrompt = theme
      ? `Generate ONE extremely creative and imaginative image prompt following this theme: "${theme}". Make it WILD and UNIQUE! ${defaultTags ? `Start with: ${defaultTags}` : ''} Then add at least 15-20 creative, unexpected tags that create a vivid, extraordinary scene!`
      : `Generate ONE extremely creative, WILD, and completely random image prompt. ${defaultTags ? `Start with: ${defaultTags}` : ''} Then add at least 15-20 creative, unexpected tags that create an absolutely unique and imaginative scene! Mix genres, combine unexpected elements, create something I've never seen before!`;

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-2-1212',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 1.0, // MAXIMUM creativity!
        max_tokens: 300, // More tokens for longer, more detailed prompts
        top_p: 0.95, // High diversity
      }),
    });

    if (!response.ok) {
      throw new Error(`Grok API error: ${response.statusText}`);
    }

    const data = await response.json();
    const generatedPrompt = data.choices?.[0]?.message?.content?.trim();

    if (!generatedPrompt) {
      throw new Error('No prompt generated from Grok');
    }

    // Ensure default tags are included if specified
    if (defaultTags && !generatedPrompt.toLowerCase().includes(defaultTags.toLowerCase())) {
      return `${defaultTags}, ${generatedPrompt}`;
    }

    return generatedPrompt;
  } catch (error) {
    console.error('Error generating random prompt:', error);
    // Fallback to creative random prompts if API fails
    const fallbackPrompts = [
      'floating in aurora dimension, cosmic energy, rainbow light streams, ethereal dress, starlight particles, surreal atmosphere, dreamy colors, fantasy aesthetic',
      'cyberpunk rain city, neon reflections, holographic displays, futuristic outfit, dramatic pose, cinematic lighting, bokeh effect, purple and blue tones',
      'underwater crystal cave, bioluminescent flora, flowing white dress, graceful swimming pose, magical glow, teal and turquoise palette, fantasy setting',
      'cherry blossom storm, petals swirling, traditional meets modern, elegant kimono, dynamic wind effect, pink and gold lighting, Japanese aesthetic',
      'steampunk sky fortress, mechanical wings, brass goggles, adventure theme, golden sunset, dramatic clouds, vintage technology, detailed background',
      'enchanted forest spirit, glowing mushrooms, mystical fog, nature magic, leafy dress, soft green light, peaceful mood, fantasy environment',
      'desert night oasis, star-filled sky, flowing silk robes, fire magic, warm colors, exotic atmosphere, mysterious aura, middle eastern aesthetic',
      'ice palace throne room, crystalline architecture, frosted gown, aurora lights, winter magic, cold blue tones, regal pose, fantasy royalty',
      'library of dreams, floating books, magical scholar, glowing runes, warm candlelight, knowledge theme, fantasy academia, cozy atmosphere',
      'neon dance floor, holographic effects, party lights, energetic pose, vibrant colors, modern fashion, celebration mood, dynamic composition',
    ];
    const fallback = fallbackPrompts[Math.floor(Math.random() * fallbackPrompts.length)];
    return defaultTags ? `${defaultTags}, ${fallback}` : fallback;
  }
}
