import { GeminiModel, GEMINI_MODELS, GeneratedThumbnail, ImageUsageType, PromptVariation } from './types';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

function getGeminiEndpoint(model: GeminiModel = 'pro'): string {
  return `${GEMINI_BASE_URL}/${GEMINI_MODELS[model].id}:generateContent`;
}

const MAX_RETRIES = 3;
const RETRY_INITIAL_WAIT_MS = 5000;

interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{
        text?: string;
        inlineData?: {
          mimeType: string;
          data: string;
        };
      }>;
    };
    finishReason?: string;
  }>;
  promptFeedback?: {
    blockReason?: string;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  };
  error?: { message: string; code: number };
}

const SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
];

// Technical quality suffix appended to every Gemini generation prompt
const QUALITY_SUFFIX = `

CRITICAL REQUIREMENTS:
- All text overlays MUST be in Japanese (日本語). Never use English text on the thumbnail.
- Text must be large, bold, with thick black outlines for readability at small sizes.
- Use high-contrast, saturated colors. Avoid muted or pastel colors.
- Keep composition bold and simple. One clear focal point.
- Photorealistic, professional YouTube thumbnail quality. High detail, sharp focus.
- 16:9 aspect ratio.

NEGATIVE PROMPT (AVOID these at all costs):
- No cheap CGI or 3D-rendered look. No plastic skin textures.
- No blurry, illegible, or overlapping text. No English text.
- No cluttered compositions with too many elements.
- No stock photo aesthetic. No generic corporate feel.
- No washed-out, low-contrast, or pastel color palettes.
- No watermarks, borders, or frames.
- No small, thin, or hard-to-read fonts.
- No artificial-looking lighting or flat shadows.
- No anime/cartoon style unless explicitly requested.
- No centered-and-boring layouts. Use dynamic angles and asymmetry.`;

// Lightweight quality suffix for image editing (preserve the original, only change what's asked)
const EDIT_QUALITY_SUFFIX = `

IMPORTANT RULES FOR THIS EDIT:
- Keep all text in Japanese (日本語). Never switch to English text.
- Maintain the overall composition and style unless explicitly asked to change it.
- Make ONLY the requested changes. Do not add or remove elements unless asked.
- Output must be 16:9 aspect ratio, professional YouTube thumbnail quality.`;

/** Parse base64 data from a dataUrl or raw base64 string */
function parseBase64Image(imgBase64: string): { mimeType: string; data: string } {
  let mimeType = 'image/png';
  let data = imgBase64;
  if (imgBase64.startsWith('data:')) {
    const match = imgBase64.match(/^data:(image\/[^;]+);base64,/);
    if (match) {
      mimeType = match[1];
      data = imgBase64.replace(/^data:image\/[^;]+;base64,/, '');
    }
  }
  return { mimeType, data };
}

/** Build per-usage-type instruction for Gemini */
function buildRefImageInstruction(usageTypes: ImageUsageType[]): string {
  const counts: Record<ImageUsageType, number> = { character: 0, style: 0, layout: 0, product: 0 };
  for (const u of usageTypes) counts[u]++;

  const sections: string[] = [];

  if (counts.character > 0) {
    sections.push(`CHARACTER/PERSON IMAGES (${counts.character}):
- You MUST place the exact character/person from these reference images into the thumbnail.
- Keep the character's exact appearance: same face, hair, outfit, art style, proportions.
- Do NOT redesign or alter the character. Copy their visual identity exactly.
- The character should be the PRIMARY SUBJECT of the thumbnail.
- Only change background, lighting, composition, and text overlay around them.`);
  }

  if (counts.product > 0) {
    sections.push(`PRODUCT/LOGO IMAGES (${counts.product}):
- Place the product, book, or logo from these reference images into the thumbnail exactly as shown.
- Keep the exact design, colors, text, and proportions of the product.
- Make it clearly visible and prominent in the composition.`);
  }

  if (counts.style > 0) {
    sections.push(`STYLE REFERENCE IMAGES (${counts.style}):
- Use these images as STYLE REFERENCE ONLY. Do NOT copy the subjects.
- Match the color palette, mood, lighting quality, and visual atmosphere.
- Apply the same design aesthetic (gradients, textures, contrast levels, saturation).
- The final thumbnail should FEEL like these images but with DIFFERENT content.`);
  }

  if (counts.layout > 0) {
    sections.push(`LAYOUT REFERENCE IMAGES (${counts.layout}):
- Use these images as LAYOUT/COMPOSITION REFERENCE ONLY.
- Mirror the arrangement: where text is placed, where the subject sits, use of negative space.
- Apply similar framing, angles, and visual hierarchy.
- The actual content should match the video concept, not the reference.`);
  }

  if (sections.length === 0) return '';

  return `

REFERENCE IMAGE INSTRUCTIONS (MANDATORY - DO NOT IGNORE):
${usageTypes.length} reference image(s) have been provided above.
${sections.join('\n\n')}`;
}

// ======== Common Gemini request/response handling ========

interface GeminiImageResult {
  base64Data: string;
  mimeType: string;
  dataUrl: string;
}

async function callGeminiWithImage(
  parts: Array<Record<string, unknown>>,
  apiKey: string,
  model: GeminiModel = 'pro',
): Promise<GeminiImageResult> {
  const endpoint = getGeminiEndpoint(model);
  const requestBody = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        aspectRatio: '16:9',
        imageSize: '2K',
      },
    },
    safetySettings: SAFETY_SETTINGS,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${endpoint}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (response.status === 429 || response.status === 503) {
        const waitMs = RETRY_INITIAL_WAIT_MS * (attempt + 1);
        console.log(`Gemini ${response.status} - retry ${attempt + 1}/${MAX_RETRIES} after ${waitMs / 1000}s`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Gemini API error ${response.status}: ${errorBody}`);
      }

      const data: GeminiResponse = await response.json();

      if (data.error) {
        throw new Error(`Gemini API error: ${data.error.message}`);
      }

      const candidates = data.candidates;
      if (!candidates || candidates.length === 0) {
        const blockReason = data.promptFeedback?.blockReason || 'unknown';
        const safetyRatings = data.promptFeedback?.safetyRatings
          ?.map(r => `${r.category}:${r.probability}`)
          .join(', ') || 'none';
        console.error(`[Gemini] No candidates. blockReason=${blockReason}, safetyRatings=[${safetyRatings}]`);
        console.error(`[Gemini] Full promptFeedback:`, JSON.stringify(data.promptFeedback, null, 2));
        throw new Error(`Gemini blocked (${blockReason}). Safety: ${safetyRatings}`);
      }

      const responseParts = candidates[0].content.parts;
      const imagePart = responseParts.find((p) => p.inlineData);

      if (!imagePart || !imagePart.inlineData) {
        throw new Error('No image data in Gemini response');
      }

      const { mimeType, data: base64Data } = imagePart.inlineData;
      return {
        base64Data,
        mimeType,
        dataUrl: `data:${mimeType};base64,${base64Data}`,
      };
    } catch (err) {
      lastError = err as Error;
      if (attempt < MAX_RETRIES - 1) {
        const waitMs = RETRY_INITIAL_WAIT_MS * (attempt + 1);
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }
  }

  throw lastError || new Error('Failed after retries');
}

async function buildResult(
  imageResult: GeminiImageResult,
  promptVariation: PromptVariation,
): Promise<GeneratedThumbnail> {
  const thumbnailId = uuidv4();
  const savePath = await saveThumbnailToFile(thumbnailId, imageResult.base64Data, imageResult.mimeType);
  return {
    id: thumbnailId,
    promptVariation,
    base64Data: imageResult.base64Data,
    dataUrl: imageResult.dataUrl,
    localPath: savePath,
  };
}

// ======== Generation (from-scratch) ========

export async function generateThumbnail(
  prompt: PromptVariation,
  apiKey: string,
  referenceImagesBase64?: string[],
  imageUsageTypes?: ImageUsageType[],
  model: GeminiModel = 'pro',
): Promise<GeneratedThumbnail> {
  const hasRefImages = referenceImagesBase64 && referenceImagesBase64.length > 0;
  const parts: Array<Record<string, unknown>> = [];

  if (hasRefImages) {
    for (const imgBase64 of referenceImagesBase64) {
      const parsed = parseBase64Image(imgBase64);
      parts.push({ inlineData: { mimeType: parsed.mimeType, data: parsed.data } });
    }
  }

  let refImageInstruction = '';
  if (hasRefImages) {
    const usages = imageUsageTypes && imageUsageTypes.length === referenceImagesBase64.length
      ? imageUsageTypes
      : referenceImagesBase64.map(() => 'character' as ImageUsageType);
    refImageInstruction = buildRefImageInstruction(usages);
  }

  const fullPrompt = prompt.promptEn + refImageInstruction + QUALITY_SUFFIX;
  parts.push({ text: fullPrompt });

  const imageResult = await callGeminiWithImage(parts, apiKey, model);
  return buildResult(imageResult, prompt);
}

export async function generateAllThumbnails(
  prompts: PromptVariation[],
  apiKey: string,
  referenceImagesBase64?: string[],
  imageUsageTypes?: ImageUsageType[],
  model: GeminiModel = 'pro',
): Promise<GeneratedThumbnail[]> {
  const results = await Promise.allSettled(
    prompts.map((p, i) =>
      new Promise<GeneratedThumbnail>((resolve, reject) => {
        setTimeout(() => {
          generateThumbnail(p, apiKey, referenceImagesBase64, imageUsageTypes, model).then(resolve).catch(reject);
        }, i * 500);
      })
    )
  );

  return collectResults(results);
}

// ======== Editing (modify existing image) ========

export async function editThumbnail(
  sourceImageBase64: string,
  editInstruction: string,
  apiKey: string,
  promptVariation: PromptVariation,
  referenceImagesBase64?: string[],
  imageUsageTypes?: ImageUsageType[],
  model: GeminiModel = 'pro',
): Promise<GeneratedThumbnail> {
  const parts: Array<Record<string, unknown>> = [];

  // Source image FIRST
  const sourceParsed = parseBase64Image(sourceImageBase64);
  parts.push({ inlineData: { mimeType: sourceParsed.mimeType, data: sourceParsed.data } });

  // Additional reference images (if any)
  if (referenceImagesBase64 && referenceImagesBase64.length > 0) {
    for (const imgBase64 of referenceImagesBase64) {
      const parsed = parseBase64Image(imgBase64);
      parts.push({ inlineData: { mimeType: parsed.mimeType, data: parsed.data } });
    }
  }

  // Build edit instruction with ref image context
  let refInstruction = '';
  if (referenceImagesBase64 && referenceImagesBase64.length > 0 && imageUsageTypes) {
    refInstruction = buildRefImageInstruction(imageUsageTypes);
  }

  const fullInstruction = `Edit this YouTube thumbnail image as follows:\n${editInstruction}${refInstruction}${EDIT_QUALITY_SUFFIX}`;
  parts.push({ text: fullInstruction });

  const imageResult = await callGeminiWithImage(parts, apiKey, model);
  return buildResult(imageResult, promptVariation);
}

export async function editAllThumbnails(
  sourceImageBase64: string,
  editInstructions: string[],
  apiKey: string,
  promptVariations: PromptVariation[],
  referenceImagesBase64?: string[],
  imageUsageTypes?: ImageUsageType[],
  model: GeminiModel = 'pro',
): Promise<GeneratedThumbnail[]> {
  const results = await Promise.allSettled(
    editInstructions.map((instruction, i) =>
      new Promise<GeneratedThumbnail>((resolve, reject) => {
        setTimeout(() => {
          editThumbnail(
            sourceImageBase64, instruction, apiKey, promptVariations[i],
            referenceImagesBase64, imageUsageTypes, model,
          ).then(resolve).catch(reject);
        }, i * 500);
      })
    )
  );

  return collectResults(results);
}

// ======== Utils ========

function collectResults(results: PromiseSettledResult<GeneratedThumbnail>[]): GeneratedThumbnail[] {
  const thumbnails: GeneratedThumbnail[] = [];
  const errors: string[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      thumbnails.push(result.value);
    } else {
      errors.push(result.reason?.message || 'Unknown error');
    }
  }

  if (thumbnails.length === 0) {
    throw new Error(`All image operations failed: ${errors.join('; ')}`);
  }

  return thumbnails;
}

async function saveThumbnailToFile(
  id: string,
  base64Data: string,
  mimeType: string
): Promise<string> {
  const ext = mimeType === 'image/png' ? 'png' : 'jpg';
  const dir = path.join(process.cwd(), 'public', 'generated-thumbnails');
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${id}.${ext}`);
  const buffer = Buffer.from(base64Data, 'base64');
  await writeFile(filePath, buffer);
  return `/api/image/${id}`;
}
