import { NextResponse } from 'next/server';
import { writeFile, mkdir, rm, readdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { readPsd, writePsdBuffer, initializeCanvas } from 'ag-psd';
import { createCanvas, loadImage, CanvasRenderingContext2D as NodeCanvasRenderingContext2D } from 'canvas';
import { getSoundEffectSystemPrompt } from '@/lib/sound-effect/system-prompt';

// Initialize ag-psd with node-canvas
initializeCanvas(createCanvas as unknown as (width: number, height: number) => HTMLCanvasElement);

interface SoundEffectSelection {
  nsfw_onomatopoeia: string[];
  moaning: string[];
  moaning_text: string[];
}

interface ProcessingDetail {
  psdFilename: string;
  soundEffects: SoundEffectSelection;
}

export async function POST(request: Request) {
  const tempDir = path.join(process.cwd(), 'temp', `sound-effect-${Date.now()}`);
  const inputDir = path.join(tempDir, 'input_psds');
  const outputDir = path.join(tempDir, 'output_psds');
  const tempPngDir = path.join(tempDir, 'composite_pngs');

  const processingDetails: ProcessingDetail[] = [];

  try {
    // Get the uploaded ZIP file
    const formData = await request.formData();
    const zipFile = formData.get('zipFile') as File;

    if (!zipFile) {
      return NextResponse.json(
        { error: 'No ZIP file provided' },
        { status: 400 }
      );
    }

    // Create temp directories
    await mkdir(tempDir, { recursive: true });
    await mkdir(inputDir, { recursive: true });
    await mkdir(outputDir, { recursive: true });
    await mkdir(tempPngDir, { recursive: true });

    // Save uploaded ZIP file
    const zipBuffer = Buffer.from(await zipFile.arrayBuffer());
    const uploadedZipPath = path.join(tempDir, 'input.zip');
    await writeFile(uploadedZipPath, zipBuffer);

    // Extract ZIP to input directory
    const zip = new AdmZip(uploadedZipPath);
    zip.extractAllTo(inputDir, true);

    console.log('📦 ZIP extracted to:', inputDir);

    // Get all PSD files
    const files = await readdir(inputDir);
    const psdFiles = files.filter(f => f.toLowerCase().endsWith('.psd'));

    console.log(`Found ${psdFiles.length} PSD files`);

    // Process each PSD file
    for (const psdFilename of psdFiles) {
      const psdPath = path.join(inputDir, psdFilename);
      console.log(`Processing: ${psdFilename}`);

      try {
        // Step 1: Convert PSD to composite PNG
        const pngPath = await convertPsdToPng(psdPath, tempPngDir, psdFilename);
        console.log(`  ✓ Converted to PNG: ${path.basename(pngPath)}`);

        // Step 2: Select sound effects using Grok API
        const selectedEffects = await selectSoundEffects(pngPath);
        const totalEffects =
          selectedEffects.nsfw_onomatopoeia.length +
          selectedEffects.moaning.length +
          selectedEffects.moaning_text.length;
        console.log(`  ✓ Selected ${totalEffects} sound effects`);

        // Store processing details
        processingDetails.push({
          psdFilename,
          soundEffects: selectedEffects,
        });

        // Step 3: Add sound effects to PSD
        if (totalEffects > 0) {
          await addSoundEffectsToPsd(psdPath, selectedEffects, outputDir, psdFilename, tempDir);
          console.log(`  ✓ Added sound effects to PSD`);
        } else {
          // No sound effects detected, copy original
          const psdBuffer = await readFile(psdPath);
          await writeFile(path.join(outputDir, psdFilename), psdBuffer);
          console.log(`  ✓ No effects detected, copied original`);
        }
      } catch (error) {
        console.error(`  ✗ Error processing ${psdFilename}:`, error);
        // Copy original on error
        const psdBuffer = await readFile(psdPath);
        await writeFile(path.join(outputDir, psdFilename), psdBuffer);
      }
    }

    // Create output ZIP file
    const outputZip = new AdmZip();

    // Add all PSD files from output directory to ZIP
    const outputZipPath = path.join(tempDir, 'output_with_effects.zip');
    outputZip.addLocalFolder(outputDir);
    outputZip.writeZip(outputZipPath);

    console.log('✅ Output ZIP created:', outputZipPath);

    // Read the output ZIP file
    const outputBuffer = await readFile(outputZipPath);

    // Clean up temp directory
    await rm(tempDir, { recursive: true, force: true });

    // Return the ZIP file with processing details in custom headers
    // Base64 encode the processing details to handle non-ASCII characters (Korean filenames)
    const processingDetailsBase64 = Buffer.from(JSON.stringify(processingDetails)).toString('base64');

    return new NextResponse(new Uint8Array(outputBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="psds_with_sound_effects.zip"',
        'X-Total-PSDs': psdFiles.length.toString(),
        'X-Processing-Details': processingDetailsBase64,
      },
    });

  } catch (error) {
    console.error('Sound effect processing error:', error);

    // Clean up on error
    try {
      if (existsSync(tempDir)) {
        await rm(tempDir, { recursive: true, force: true });
      }
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }

    return NextResponse.json(
      {
        error: 'Sound effect processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function renderLayersManually(
  layers: unknown[],
  ctx: NodeCanvasRenderingContext2D,
  _width: number,
  _height: number
): Promise<void> {
  for (const layer of layers) {
    const typedLayer = layer as { canvas?: unknown; hidden?: boolean; name?: string; left?: number; top?: number; right?: number; bottom?: number };
    if (typedLayer.canvas && !typedLayer.hidden) {
      try {
        const layerCanvas = typedLayer.canvas as { getContext?: (type: string) => NodeCanvasRenderingContext2D | null; width?: number; height?: number };

        // Try to extract image data from the layer canvas
        if (layerCanvas.getContext) {
          const layerCtx = layerCanvas.getContext('2d');
          if (layerCtx) {
            const layerWidth = (typedLayer.right ?? 0) - (typedLayer.left ?? 0) || layerCanvas.width || 0;
            const layerHeight = (typedLayer.bottom ?? 0) - (typedLayer.top ?? 0) || layerCanvas.height || 0;

            const layerImageData = layerCtx.getImageData(0, 0, layerWidth, layerHeight);
            ctx.putImageData(layerImageData, typedLayer.left || 0, typedLayer.top || 0);
          }
        }
      } catch {
        console.warn(`    Failed to render layer: ${typedLayer.name || 'unknown'}`);
      }
    }
  }
}

async function convertPsdToPng(
  psdPath: string,
  outputDir: string,
  filename: string
): Promise<string> {
  // Read PSD file
  const psdBuffer = await readFile(psdPath);
  const psd = readPsd(psdBuffer, { skipCompositeImageData: false });

  const width = psd.width || 800;
  const height = psd.height || 600;

  console.log(`    PSD dimensions: ${width}x${height}`);

  // Create canvas
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Fill with white background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, width, height);

  // Try to use composite image data from PSD
  if (psd.canvas) {
    try {
      // ag-psd provides canvas with pixel data - extract it properly
      const psdCanvas = psd.canvas as { getContext?: (type: string) => NodeCanvasRenderingContext2D | null };

      // Check if canvas has getContext method (it's a node-canvas Canvas)
      if (psdCanvas.getContext) {
        const psdCtx = psdCanvas.getContext('2d');
        if (psdCtx) {
          const psdImageData = psdCtx.getImageData(0, 0, width, height);
          ctx.putImageData(psdImageData, 0, 0);
          console.log('    ✓ Used composite image data');
        }
      } else {
        // If no getContext, try direct pixel data access
        console.warn('    Composite canvas has no getContext, trying manual rendering');
        throw new Error('No getContext available');
      }
    } catch {
      console.warn('    Could not use composite image, rendering layers manually');
      // Fallback: render layers manually using pixel data
      if (psd.children) {
        await renderLayersManually(psd.children, ctx, width, height);
      }
    }
  } else {
    console.warn('    No composite canvas found, rendering layers manually');
    // Render layers manually
    if (psd.children) {
      await renderLayersManually(psd.children, ctx, width, height);
    }
  }

  // Save as PNG
  const pngFilename = filename.replace(/\.psd$/i, '.png');
  const pngPath = path.join(outputDir, pngFilename);
  const buffer = canvas.toBuffer('image/png');
  await writeFile(pngPath, buffer);

  console.log(`    ✓ Saved PNG: ${pngFilename} (${buffer.length} bytes)`);

  return pngPath;
}

async function selectSoundEffects(imagePath: string): Promise<SoundEffectSelection> {
  const grokApiKey = process.env.GROK_API_KEY;

  if (!grokApiKey) {
    console.warn('GROK_API_KEY not configured, skipping sound effect selection');
    return { nsfw_onomatopoeia: [], moaning: [], moaning_text: [] };
  }

  try {
    // Read image and convert to base64
    const imageBuffer = await readFile(imagePath);
    const base64Image = imageBuffer.toString('base64');

    // Get system prompt with CSV references
    const systemPrompt = getSoundEffectSystemPrompt();

    // Call Grok API with vision model
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${grokApiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-2-vision-1212',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Grok API error:', response.status, errorText);
      return { nsfw_onomatopoeia: [], moaning: [], moaning_text: [] };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const selection = JSON.parse(jsonMatch[0]) as SoundEffectSelection;
      return selection;
    }

    return { nsfw_onomatopoeia: [], moaning: [], moaning_text: [] };
  } catch (error) {
    console.error('Error selecting sound effects:', error);
    return { nsfw_onomatopoeia: [], moaning: [], moaning_text: [] };
  }
}

async function fetchSoundEffectImageFromAirtable(filename: string): Promise<string | null> {
  const airtableToken = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;

  if (!airtableToken || !baseId) {
    console.warn('Airtable credentials not configured');
    return null;
  }

  try {
    // Query Airtable for the filename in the sound_effect table
    const tableName = 'sound_effect';
    const encodedTableName = encodeURIComponent(tableName);
    const url = `https://api.airtable.com/v0/${baseId}/${encodedTableName}?filterByFormula={filename}="${filename}"`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${airtableToken}`,
      },
    });

    if (!response.ok) {
      console.error(`Airtable API error for ${filename}:`, response.status);
      return null;
    }

    const data = await response.json();

    if (data.records && data.records.length > 0) {
      const record = data.records[0];
      const imageField = record.fields.image_attachment;

      if (imageField && imageField.length > 0) {
        return imageField[0].url;
      }
    }

    console.warn(`No image found in Airtable for filename: ${filename}`);
    return null;
  } catch (error) {
    console.error(`Error fetching from Airtable for ${filename}:`, error);
    return null;
  }
}

async function downloadImage(imageUrl: string, outputPath: string): Promise<void> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  await writeFile(outputPath, Buffer.from(buffer));
}

async function addSoundEffectsToPsd(
  psdPath: string,
  selectedEffects: SoundEffectSelection,
  outputDir: string,
  filename: string,
  tempDir: string
): Promise<void> {
  // Read original PSD
  const psdBuffer = await readFile(psdPath);
  const psd = readPsd(psdBuffer);

  // Add a new layer for each sound effect
  if (!psd.children) {
    psd.children = [];
  }

  const tempImagesDir = path.join(tempDir, 'effect_images');
  await mkdir(tempImagesDir, { recursive: true });

  // Collect all filenames
  const allFilenames = [
    ...selectedEffects.nsfw_onomatopoeia,
    ...selectedEffects.moaning,
    ...selectedEffects.moaning_text,
  ];

  console.log(`    Processing ${allFilenames.length} sound effect images`);

  for (const effectFilename of allFilenames) {
    try {
      // Fetch image URL from Airtable
      const imageUrl = await fetchSoundEffectImageFromAirtable(effectFilename);

      if (!imageUrl) {
        console.warn(`    ⚠ Skipping ${effectFilename}: No URL from Airtable`);
        continue;
      }

      // Download image to temp
      const tempImagePath = path.join(tempImagesDir, effectFilename);
      await downloadImage(imageUrl, tempImagePath);

      // Load image with canvas
      const image = await loadImage(tempImagePath);

      // Create canvas with image dimensions
      const canvas = createCanvas(image.width, image.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);

      // Add layer to PSD at random position (you may want to implement better positioning logic)
      const psdWidth = psd.width || 800;
      const psdHeight = psd.height || 600;

      // Random position within PSD bounds
      const maxX = Math.max(0, psdWidth - image.width);
      const maxY = Math.max(0, psdHeight - image.height);
      const randomX = Math.floor(Math.random() * (maxX + 1));
      const randomY = Math.floor(Math.random() * (maxY + 1));

      psd.children.push({
        name: effectFilename.replace('.png', ''),
        left: randomX,
        top: randomY,
        right: randomX + image.width,
        bottom: randomY + image.height,
        canvas: canvas as unknown as HTMLCanvasElement,
        blendMode: 'normal',
        opacity: 255,
      });

      console.log(`    ✓ Added ${effectFilename}`);
    } catch (error) {
      console.error(`    ✗ Error adding ${effectFilename}:`, error);
    }
  }

  // Write modified PSD
  const outputBuffer = writePsdBuffer(psd);
  const outputPath = path.join(outputDir, filename);
  await writeFile(outputPath, Buffer.from(outputBuffer));
}

export const config = {
  api: {
    bodyParser: false,
  },
};
