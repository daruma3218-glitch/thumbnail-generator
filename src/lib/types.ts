// === Gemini Model Selection ===
export type GeminiModel = 'pro' | 'flash';

export const GEMINI_MODELS: Record<GeminiModel, { id: string; label: string; description: string }> = {
  pro: {
    id: 'gemini-3-pro-image-preview',
    label: 'Pro',
    description: '高品質・低速',
  },
  flash: {
    id: 'gemini-3.1-flash-image-preview',
    label: 'Flash',
    description: '高速・低コスト',
  },
};

// === Parts Extraction Types ===
export interface TextElement {
  id: string;
  type: 'catchphrase' | 'number' | 'power_word' | 'question' | 'cta';
  content: string;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
}

export interface VisualElement {
  id: string;
  type: 'person_expression' | 'background' | 'color_scheme' | 'layout' | 'object' | 'icon';
  description: string;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ExtractedParts {
  hook: string;
  targetEmotion: string;
  textElements: TextElement[];
  visualElements: VisualElement[];
  suggestedDirection: string;
}

// === Creative Directions Types ===
export interface CreativeDirection {
  id: string;
  typeId?: string; // ThumbnailTypeId — この方向性が従う型
  approach: string; // e.g. "感情訴求", "情報インパクト", "好奇心刺激"
  psychologicalAngle: string; // 心理的アプローチの詳細説明
  conceptSummary: string; // 日本語での方向性サマリー
  promptEn: string; // Gemini用英語プロンプト
  keyVisualElements: string[]; // 主要ビジュアル要素
  expectedImpact: string; // 期待される効果
}

export interface DirectionsResult {
  directions: CreativeDirection[];
  reasoning: string; // なぜこの3方向を選んだかの説明
}

export interface RefinementDirection {
  id: string;
  refinementAxis: string; // "構図変更" | "テキスト変更" | "色彩・ムード変更"
  changeSummary: string; // 何を変えたかの説明
  conceptSummary: string; // 日本語での方向性サマリー
  promptEn: string; // Gemini用英語プロンプト（生成モード用）
  editInstructionEn?: string; // Gemini用英語編集指示（画像編集モード用）
  keyChanges: string[]; // 主な変更点
}

export interface RefinementResult {
  directions: RefinementDirection[];
  reasoning: string;
}

// === Reference Image Types ===
export type ImageUsageType =
  | 'character'  // キャラクター・人物をそのまま配置
  | 'style'      // 色味・雰囲気・デザインスタイルを参考
  | 'layout'     // 構図・レイアウトを参考
  | 'product';   // 商品・書籍・ロゴなどをそのまま配置

export const IMAGE_USAGE_OPTIONS: { value: ImageUsageType; label: string; description: string; emoji: string }[] = [
  { value: 'character', label: 'キャラ・人物', description: 'この人物をそのままサムネに配置', emoji: '👤' },
  { value: 'style', label: 'スタイル参考', description: '色味・雰囲気・デザインを参考にする', emoji: '🎨' },
  { value: 'layout', label: '構図参考', description: 'レイアウトや配置を参考にする', emoji: '📐' },
  { value: 'product', label: '商品・ロゴ', description: '書籍やロゴをそのまま配置', emoji: '📦' },
];

export interface ReferenceImage {
  name: string;
  dataUrl: string;
  usage: ImageUsageType;
}

// === Image Generation Types ===
export interface PromptVariation {
  id: string;
  promptEn: string;
  directionSummaryJa: string;
  creativeAngle: string;
}

export interface GeneratedThumbnail {
  id: string;
  promptVariation: PromptVariation;
  base64Data: string;
  dataUrl: string;
  localPath?: string;
}

// === Session State ===
export interface IterationRound {
  roundNumber: number;
  concept: string;
  directions: CreativeDirection[] | RefinementDirection[];
  thumbnails: GeneratedThumbnail[];
  selectedThumbnailId?: string;
  mode?: 'generate' | 'edit'; // 生成モード or 画像編集モード
}

export type AppStep =
  | 'input'
  | 'extracting'
  | 'confirming_parts'
  | 'recommending_type'
  | 'selecting_type'
  | 'copywriting'
  | 'designing'
  | 'previewing'
  | 'generating'
  | 'selecting'
  | 'refining'
  | 'refine_previewing';

// === Session Storage Types ===
export interface SavedSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  script: string;
  originalConcept: string;
  extractedParts: ExtractedParts | null;
  referenceImages: ReferenceImage[];
  iterations: IterationRound[];
  previewThumbnailDataUrl?: string;
  selectedType?: string; // 後方互換（旧セッション用）
  selectedTypes?: string[]; // ThumbnailTypeId[] — 選択された3型
}

export interface SessionListItem {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  previewThumbnailDataUrl?: string;
  iterationCount: number;
}

// === Structured Feedback Types ===
export type QuickAction =
  | 'enlarge_person'     // 人物をもっと大きく
  | 'change_layout'      // 構図を変えて
  | 'change_colors'      // 配色を変えて
  | 'change_text'        // テキスト内容を変えて
  | 'change_mood'        // 雰囲気をガラッと変えて
  | 'change_background'; // 背景を変えて

export interface StructuredFeedback {
  /** スライダー値: 0 = 変更なし、-2〜+2 */
  sliders: {
    textSize: number;
    brightness: number;
    saturation: number;
    complexity: number;
    impact: number;
  };
  /** クイック指示: 選択されたもののみ */
  quickActions: QuickAction[];
  /** 自由記述（任意） */
  freeText: string;
}

export const SLIDER_CONFIG: {
  key: keyof StructuredFeedback['sliders'];
  label: string;
  leftLabel: string;
  rightLabel: string;
  leftEmoji: string;
  rightEmoji: string;
}[] = [
  { key: 'textSize', label: '文字サイズ', leftLabel: '小さく', rightLabel: '大きく', leftEmoji: '🔤', rightEmoji: '🔠' },
  { key: 'brightness', label: '明るさ', leftLabel: '暗く', rightLabel: '明るく', leftEmoji: '🌙', rightEmoji: '☀️' },
  { key: 'saturation', label: '色の鮮やかさ', leftLabel: '淡く', rightLabel: '鮮やかに', leftEmoji: '🩶', rightEmoji: '🌈' },
  { key: 'complexity', label: '情報量', leftLabel: 'シンプル', rightLabel: '情報多め', leftEmoji: '◻️', rightEmoji: '📊' },
  { key: 'impact', label: 'インパクト', leftLabel: '控えめ', rightLabel: '強烈', leftEmoji: '🤫', rightEmoji: '💥' },
];

export const QUICK_ACTION_OPTIONS: {
  value: QuickAction;
  label: string;
  emoji: string;
}[] = [
  { value: 'enlarge_person', label: '人物を大きく', emoji: '👤' },
  { value: 'change_layout', label: '構図を変えて', emoji: '📐' },
  { value: 'change_colors', label: '配色を変えて', emoji: '🎨' },
  { value: 'change_text', label: 'テキスト変更', emoji: '✏️' },
  { value: 'change_mood', label: '雰囲気チェンジ', emoji: '🔄' },
  { value: 'change_background', label: '背景を変えて', emoji: '📸' },
];

// === API Request/Response ===
export interface DirectionsRequest {
  concept: string;
  stylePrinciples?: string;
  hasReferenceImages?: boolean;
  copywriterOutput?: {
    mainCopies: Array<{ text: string; trigger: string; effectiveness: string }>;
    subTexts: string[];
    reasoning: string;
  };
}

export interface RefineRequest {
  originalConcept: string;
  selectedDirection: {
    id: string;
    promptEn: string;
    approach?: string;
    conceptSummary?: string;
  };
  userFeedback: string;
  stylePrinciples?: string;
  hasReferenceImages?: boolean;
  imageUsageTypes?: ImageUsageType[];
  copywriterOutput?: {
    mainCopies: Array<{ text: string; trigger: string; effectiveness: string }>;
    subTexts: string[];
    reasoning: string;
  };
  previousFeedbacks?: string[];
  selectedType?: string; // リファイン時は単一型（その方向性のtypeId）
}

export interface GenerateRequest {
  prompts: PromptVariation[];
}

export interface ExtractPartsRequest {
  title: string;
  script: string;
}
