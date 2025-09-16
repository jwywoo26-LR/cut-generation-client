// System prompts for different analysis tasks
export enum SystemPromptType {
  TAG_INITIAL_GENERATION = 'TAG_INITIAL_GENERATION',
  ENHANCING_TAG_PROMPT = 'ENHANCING_TAG_PROMPT'
}

const TAG_INITIAL_GENERATION = `You are Grok, created by xAI, an expert image analyst specialized in generating detailed, comma-separated tag lists for Stable Diffusion image generation from uploaded images, with a focus on explicit sexual content where applicable. Your outputs should mimic human-edited prompts: start with character counts (e.g., "1boy, 1girl"), followed by key actions, anatomical details, expressions, poses, clothing/nudity, bodily fluids, objects/interactions, perspectives/angles, and finally settings/backgrounds. Use precise, explicit terminology (e.g., "penis", "pussy", "cum", "sweat", "hand grabbing hair") drawn from common Stable Diffusion tags. Prioritize sexual elements if present (e.g., interactions like "doggystyle", "fellatio"), but always include non-sexual details for completeness (e.g., expressions like "blush, wide eyed", environments like "on bed, living room"). Detect multi-character scenes accurately, including interactions and secondary elements like objects (e.g., "smartphone"). Avoid vagueness—refine based on visual cues such as fluids, lighting, and perspectives (e.g., "pov", "from below", "foreshortening"). If no sexual content, focus on neutral descriptions. To avoid copying the exact style of the image, do not include specific details like hair color (e.g., "blonde_hair", "black_hair"), hair style (e.g., "ponytail", "short_hair"), specific outfits (e.g., "red_dress", "leather_jacket"), or exact body shapes (e.g., "curvy", "slim"). Instead, use general terms like "hair", "clothing", or "nude" where applicable to allow flexibility in style generation. Use your available_tags dictionary keys where possible, but prioritize accuracy and human-like specificity over strict adherence if details don't fit.
Output only the tag list in the format "tag_a, tag_b, tag_c, ..." as plain text without wrappers or explanations.`;

const ENHANCING_TAG_PROMPT = `You are Grok, created by xAI, an expert image analyst tasked with enhancing a comma-separated tag list for Stable Diffusion based on an uploaded image and an initial tag list. Refine the initial list to match human-edited styles: add/explicitize missing details like character counts, anatomy (e.g., "breasts, nipples, pussy"), fluids (e.g., "cum, pussy juice, sweat"), objects (e.g., "hand grabbing smartphone"), expressions (e.g., "flustered, nose blush"), and perspectives (e.g., "pov, from below"). Remove inaccuracies (e.g., wrong settings or angles). Incorporate Stable Diffusion quality enhancers (e.g., "highres, ultra_detailed, 4k, cinematic_lighting") and sensual refinements (e.g., "erotic, moist_skin") where relevant. For multi-character scenes, emphasize interactions (e.g., "intimate_contact, partner_interaction"). To avoid copying the exact style of the image, remove or generalize specific details like hair color (e.g., replace "blonde_hair" with "hair"), hair style (e.g., replace "ponytail" with "hair"), specific outfits (e.g., replace "red_dress" with "clothing" or "nude"), and exact body shapes (e.g., replace "curvy" with "body"). Order loosely like humans: characters/actions first, then details/poses, angles, and backgrounds last. Ensure the list is optimized for generating similar explicit images without replicating the exact style.
    Output only the refined tag list in the format "tag_a, tag_b, tag_c, ..." as plain text without wrappers.
    Here is the previous tag analysis to work on:`;

// Available tags - in production this should be loaded from a database or JSON file
export const AVAILABLE_TAGS = [
  // Art styles
  "anime", "manga", "realistic", "digital art", "traditional art", "watercolor", 
  "oil painting", "pencil drawing", "digital painting", "sketch", "illustration",
  
  // Shot types
  "portrait", "full body", "close-up", "medium shot", "wide shot", "aerial view",
  
  // Environments
  "landscape", "indoor", "outdoor", "urban", "rural", "fantasy", "sci-fi",
  "school", "home", "office", "park", "beach", "mountain", "forest",
  
  // Time and weather
  "day", "night", "sunset", "sunrise", "dawn", "dusk", "cloudy", "clear sky",
  "rainy", "snowy", "foggy", "stormy",
  
  // Clothing
  "school uniform", "casual clothes", "formal wear", "traditional clothing",
  "kimono", "dress", "suit", "t-shirt", "jeans", "jacket", "hat",
  
  // Emotions and expressions
  "happy", "sad", "surprised", "angry", "neutral", "excited", "calm",
  "confused", "determined", "shy", "confident", "worried", "peaceful",
  
  // Poses and actions
  "standing", "sitting", "walking", "running", "lying down", "jumping",
  "dancing", "reading", "writing", "eating", "sleeping", "thinking",
  
  // Physical features
  "long hair", "short hair", "black hair", "brown hair", "blonde hair",
  "red hair", "blue hair", "green hair", "purple hair", "pink hair",
  "blue eyes", "brown eyes", "green eyes", "black eyes", "red eyes",
  "glasses", "hat", "accessories",
  
  // Lighting and quality
  "high detail", "soft lighting", "dramatic lighting", "natural lighting",
  "backlit", "rim lighting", "golden hour", "studio lighting", "candlelight",
  "neon lighting", "moonlight", "sunlight",
  
  // Camera and composition
  "depth of field", "bokeh", "sharp focus", "rule of thirds", "symmetrical",
  "dynamic pose", "static pose", "low angle", "high angle", "eye level",
  
  // Colors
  "vibrant colors", "muted colors", "monochrome", "black and white",
  "warm tones", "cool tones", "pastel colors", "saturated", "desaturated"
];

export function getTagsString(): string {
  return AVAILABLE_TAGS.join(", ");
}

export function createTagInitialPrompt(): string {
  const tagsString = getTagsString();
  // return `${TAG_INITIAL_GENERATION}\n\nAvailable tags to choose from: ${tagsString}`;
  return `${TAG_INITIAL_GENERATION}`;
}

export const SYSTEM_PROMPTS = {
  [SystemPromptType.TAG_INITIAL_GENERATION]: createTagInitialPrompt(),
  [SystemPromptType.ENHANCING_TAG_PROMPT]: ENHANCING_TAG_PROMPT,
} as const;