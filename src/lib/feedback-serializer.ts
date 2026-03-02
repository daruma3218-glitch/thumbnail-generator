import { StructuredFeedback, QuickAction, SLIDER_CONFIG, QUICK_ACTION_OPTIONS } from './types';

/**
 * 構造化フィードバックを日本語の指示テキストに変換する。
 * イテレーション・ディレクターに渡すための自然言語変換。
 *
 * 出力例:
 * 【調整指示】文字サイズ: かなり大きく(+2), 明るさ: やや暗く(-1)
 * 【変更指示】人物をもっと大きく, 配色を変えて
 * 【補足】赤系の配色にしてほしい
 */
export function serializeFeedback(fb: StructuredFeedback): string {
  const sections: string[] = [];

  // 1. スライダー調整（0以外のみ出力）
  const sliderParts: string[] = [];
  for (const config of SLIDER_CONFIG) {
    const value = fb.sliders[config.key];
    if (value === 0) continue;

    const intensity = Math.abs(value) >= 2 ? 'かなり' : 'やや';
    const direction = value > 0 ? config.rightLabel : config.leftLabel;
    sliderParts.push(`${config.label}: ${intensity}${direction}(${value > 0 ? '+' : ''}${value})`);
  }
  if (sliderParts.length > 0) {
    sections.push(`【調整指示】${sliderParts.join(', ')}`);
  }

  // 2. クイック指示（選択されたもののみ）
  if (fb.quickActions.length > 0) {
    const actionLabels = fb.quickActions.map(action => {
      const option = QUICK_ACTION_OPTIONS.find(o => o.value === action);
      return option ? option.label : action;
    });
    sections.push(`【変更指示】${actionLabels.join(', ')}`);
  }

  // 3. 自由記述
  if (fb.freeText.trim()) {
    sections.push(`【補足】${fb.freeText.trim()}`);
  }

  return sections.join('\n');
}

/**
 * 構造化フィードバックが有効かどうか判定する。
 * スライダー操作、クイック指示選択、テキスト入力のいずれか1つ以上が必要。
 */
export function isFeedbackValid(fb: StructuredFeedback): boolean {
  const hasSliderChange = Object.values(fb.sliders).some(v => v !== 0);
  const hasQuickAction = fb.quickActions.length > 0;
  const hasText = fb.freeText.trim().length > 0;
  return hasSliderChange || hasQuickAction || hasText;
}

/**
 * 初期状態の構造化フィードバックを生成する。
 */
export function createEmptyFeedback(): StructuredFeedback {
  return {
    sliders: {
      textSize: 0,
      brightness: 0,
      saturation: 0,
      complexity: 0,
      impact: 0,
    },
    quickActions: [],
    freeText: '',
  };
}

// ======== Gemini Edit Mode (Round 4+) ========

/** Slider key → English edit instruction mapping */
const SLIDER_EDIT_MAP: Record<
  keyof StructuredFeedback['sliders'],
  { slight_neg: string; strong_neg: string; slight_pos: string; strong_pos: string }
> = {
  textSize: {
    slight_neg: 'Make all text overlays slightly smaller',
    strong_neg: 'Make all text overlays significantly smaller, reduce text dominance',
    slight_pos: 'Make all text overlays slightly larger and bolder',
    strong_pos: 'Make all text overlays significantly larger, bolder, with thicker outlines. Text should dominate the image',
  },
  brightness: {
    slight_neg: 'Make the overall image slightly darker and moodier',
    strong_neg: 'Make the image much darker with dramatic shadows and moody atmosphere',
    slight_pos: 'Make the overall image slightly brighter and more vibrant',
    strong_pos: 'Make the image much brighter with vivid lighting and energetic atmosphere',
  },
  saturation: {
    slight_neg: 'Slightly reduce color saturation for a more muted look',
    strong_neg: 'Significantly desaturate colors for a cinematic, muted tone',
    slight_pos: 'Slightly increase color saturation for more vivid colors',
    strong_pos: 'Significantly boost color saturation. Make colors extremely vivid and eye-catching',
  },
  complexity: {
    slight_neg: 'Simplify the composition slightly, reduce minor elements',
    strong_neg: 'Drastically simplify: remove clutter, keep only the main subject and key text',
    slight_pos: 'Add slightly more visual detail and informational elements',
    strong_pos: 'Add more visual elements, data, and details to make it information-rich',
  },
  impact: {
    slight_neg: 'Make the overall tone slightly calmer and more subdued',
    strong_neg: 'Make it much calmer, professional, and understated',
    slight_pos: 'Increase visual impact: make it slightly more dramatic and attention-grabbing',
    strong_pos: 'Maximize visual impact: extreme contrast, dramatic lighting, bold composition. Make it impossible to ignore',
  },
};

/** Quick action → English edit instruction mapping */
const QUICK_ACTION_EDIT_MAP: Record<QuickAction, string> = {
  enlarge_person: 'Make the main person/character significantly larger and more prominent in the frame',
  change_layout: 'Rearrange the composition: change where the subject and text are positioned. Try a different layout',
  change_colors: 'Change the color palette completely. Use a different color scheme while maintaining the same content',
  change_text: 'Change the text content and styling. Use different typography, positioning, and emphasis',
  change_mood: 'Change the overall mood and atmosphere dramatically. Different lighting, tone, and emotional feel',
  change_background: 'Replace the background with a completely different scene while keeping the main subject',
};

/**
 * 構造化フィードバックをGemini画像編集向けの英語指示文に変換する。
 * Round 4+で⑤イテレーション・ディレクターをスキップし、直接Geminiへ送る。
 */
export function serializeFeedbackForGeminiEdit(fb: StructuredFeedback): string {
  const instructions: string[] = [];

  // 1. Slider adjustments → specific edit instructions
  for (const config of SLIDER_CONFIG) {
    const value = fb.sliders[config.key];
    if (value === 0) continue;

    const map = SLIDER_EDIT_MAP[config.key];
    if (value === -1) instructions.push(map.slight_neg);
    else if (value <= -2) instructions.push(map.strong_neg);
    else if (value === 1) instructions.push(map.slight_pos);
    else if (value >= 2) instructions.push(map.strong_pos);
  }

  // 2. Quick actions → specific edit instructions
  for (const action of fb.quickActions) {
    const instruction = QUICK_ACTION_EDIT_MAP[action];
    if (instruction) instructions.push(instruction);
  }

  // 3. Free text (translate intent)
  if (fb.freeText.trim()) {
    instructions.push(`Additional request: ${fb.freeText.trim()}`);
  }

  if (instructions.length === 0) {
    return 'Make subtle improvements to this thumbnail while keeping the same composition and style.';
  }

  return instructions.join('. ') + '.';
}
