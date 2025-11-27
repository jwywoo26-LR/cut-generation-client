import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Load CSV file content as a string
 */
function loadCsvContent(filename: string): string {
  try {
    const csvPath = join(process.cwd(), 'src/lib/sound-effect/csvs', filename);
    return readFileSync(csvPath, 'utf-8');
  } catch (error) {
    console.warn(`Warning: Could not load CSV file ${filename}:`, error);
    return '';
  }
}

/**
 * Get all reference CSV contents formatted for the system prompt
 */
export function getAllReferenceCsvs(): string {
  let result = '';

  // Onomatopoeia CSV
  const onomatopoeia = loadCsvContent('nsfw_onomatopoeia.csv');
  if (onomatopoeia) {
    result += '=== NSFW Onomatopoeia Reference ===\n\n';
    result += onomatopoeia;
    result += '\n\n';
  }

  // Moaning CSV
  const moaning = loadCsvContent('moaning.csv');
  if (moaning) {
    result += '=== Moaning Reference ===\n\n';
    result += moaning;
    result += '\n\n';
  }

  // Moaning Text CSV
  const moaningText = loadCsvContent('moaning_text.csv');
  if (moaningText) {
    result += '=== Moaning Text Reference ===\n\n';
    result += moaningText;
    result += '\n\n';
  }

  return result || 'No reference CSV files found.';
}

/**
 * Get the complete system prompt with CSV references injected
 */
export function getSoundEffectSystemPrompt(): string {
  const referenceCsvs = getAllReferenceCsvs();

  return `
You are a sound effect selector for 2D Japanese anime-style hentai manga/webtoon content.
Reference CSV files containing available sound effects:
    ${referenceCsvs}

Your task:
1. Analyze the provided image(s), which depict 2D Japanese anime-style hentai scenes. Focus on identifying:
   - The stage of sexual activity (e.g., before_caress, during_caress, before_insertion, beginning_insertion, during_insertion, before_orgasm, during_orgasm, after_orgasm, or similar based on visual cues like body positions, expressions, actions, and fluids).
   - Involved body parts (e.g., penis, pussy, mouth, breast, hand, body, heart) from poses, contact points, and interactions.
   - Intensity and type of action (e.g., intensive, regular, slow, sudden, reactions like vibrating, ejaculating, breathing, moaning).
   - Frequency indicators: Prioritize effects with 'frequent' in the 'etc' column for common or repeated sounds in similar scenes.
   - Overall context: Match to 'layer_name' and 'etc' descriptions for onomatopoeic sounds, moans, or text that fit the visual narrative (e.g., insertion sounds for penetration scenes, heart beats for anticipation, loud moans for climax).

2. Select appropriate sound effects from the reference CSVs that best match the analyzed scene. Ensure selections align with the 'stage', 'body_part', 'category', and 'etc' columns.
3. Return ONLY the 'filename' column values from the CSVs.
4. Selection quantities:
   - 4-10 files from nsfw_onomatopoeia category (focus on body sounds, insertions, reactions; prefer frequent ones for dynamic scenes).
   - 4-7 files from moaning category (focus on vocal expressions like breathing, quiet/medium/loud moans; match intensity to scene climax level).
   - 3-5 files from moaning_text category (focus on textual exclamations; use for character dialogue-like elements in the scene).

Return format: JSON object with categorized arrays of filenames

Example response:
{
    "nsfw_onomatopoeia": ["DMM효과음_001-45.png", "DMM효과음_001-78.png", "DMM효과음_001-102.png"],
    "moaning": ["DMM효과음_001-120.png", "DMM효과음_001-135.png"],
    "moaning_text": ["DMM효과음_001-150.png", "DMM효과음_001-155.png"]
}

Return ONLY valid JSON object. Ensure all filenames exist in the reference CSVs. Do not select duplicates unless the scene strongly warrants repetition.
`.trim();
}

/**
 * Convert filenames to full file paths with subdirectory structure
 *
 * Converts: "DMM효과음_001-45.png"
 * To: "resources/sound_effect/extracted/DMM효과음_001/DMM효과음_001-45.png"
 */
export function convertFilenamesToFullPaths(
  filenames: string[],
  baseDir: string = 'resources/sound_effect/extracted'
): string[] {
  const fullPaths: string[] = [];

  for (const filename of filenames) {
    // Extract the PSD name from filename (e.g., "DMM효과음_001" from "DMM효과음_001-45.png")
    if (filename.includes('-')) {
      const psdName = filename.substring(0, filename.lastIndexOf('-'));
      // Construct path: base_dir/psd_name/filename
      const fullPath = join(process.cwd(), baseDir, psdName, filename);
      fullPaths.push(fullPath);
    } else {
      // Fallback: if no dash, just use base directory
      const fullPath = join(process.cwd(), baseDir, filename);
      fullPaths.push(fullPath);
    }
  }

  return fullPaths;
}
