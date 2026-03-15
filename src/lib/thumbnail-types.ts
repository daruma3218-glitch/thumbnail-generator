/**
 * サムネイル型（テンプレート）定義
 *
 * 8つのサムネイルパターンを構造化データとして保持。
 * 各型には構造・配色・フォント・レイアウトルール、
 * および Gemini プロンプト用の英語制約断片が含まれる。
 */

export type ThumbnailTypeId = 'T01' | 'T02' | 'T03' | 'T04' | 'T05' | 'T06' | 'T07' | 'T08';

export interface ThumbnailTypeSpec {
  id: ThumbnailTypeId;
  name: string;
  shortDescription: string;
  suitableFor: string[];
  structure: {
    layout: string;
    sections: string[];
    focalPoint: string;
  };
  colorRules: {
    background: string;
    accent: string;
    textColor: string;
    mood: string;
  };
  fontRules: {
    mainText: string;
    numberStyle: string;
    hierarchy: string;
  };
  layoutRules: {
    composition: string;
    textPlacement: string;
    personPlacement: string;
  };
  /** Gemini プロンプトの [COMPOSITION] / [COLOR SCHEME] / [TEXT PLACEMENT] に注入する英語制約 */
  promptConstraints: {
    compositionEn: string;
    colorSchemeEn: string;
    textPlacementEn: string;
  };
}

export const THUMBNAIL_TYPES: Record<ThumbnailTypeId, ThumbnailTypeSpec> = {
  T01: {
    id: 'T01',
    name: 'ビッグナンバー型',
    shortDescription: '数字を画面の主役に据え、大きさで価値・インパクトを直感させる',
    suitableFor: ['月収・売上', '資産額', '節約額', '人数', '期間', 'スコア'],
    structure: {
      layout: '縦3段: 上段サブコピー → 中段数字+単位 → 下段結論補足',
      sections: ['サブコピー（上段・小）', '数字+単位（中段・超大）', '結論コピー（下段・小）'],
      focalPoint: '数字（画面の50〜60%を占有）',
    },
    colorRules: {
      background: '黒 or 深いネイビー or ダークグリーン（暗色系）',
      accent: '赤',
      textColor: '数字: 黄色(#FFD700) or 白、サブテキスト: 白',
      mood: 'ハイコントラスト・ドラマチック',
    },
    fontRules: {
      mainText: '極太ゴシック、白縁取り+黒影の二重アウトライン',
      numberStyle: '極太ゴシック（他要素の3〜5倍サイズ）',
      hierarchy: '数字 > キャッチフレーズ > サブテキスト',
    },
    layoutRules: {
      composition: '縦3段レイアウト固定、数字を画面中央やや上に配置、余白最小限',
      textPlacement: '上段小テキスト → 中央巨大数字 → 下段補足',
      personPlacement: '人物なし or 背景に小さく配置',
    },
    promptConstraints: {
      compositionEn: 'Strict vertical 3-tier layout. The number dominates the center, occupying 50-60% of the frame. Sub-copy at the top (small), conclusion text at the bottom (small). Minimal whitespace — fill the frame with text elements. No person as focal point.',
      colorSchemeEn: 'Dark background (black, deep navy, or dark green). Main number in bright yellow (#FFD700) or white. Sub-text in white. Red accent for emphasis. High-contrast, dramatic mood. No pastel or muted colors.',
      textPlacementEn: 'Top tier: small white sub-copy text. Center tier: MASSIVE number + unit in yellow or white, extra-bold Gothic font, 3-5x larger than other text, thick white outline + black shadow double outline. Bottom tier: small conclusion text in white or red. All text in Japanese.',
    },
  },
  T02: {
    id: 'T02',
    name: '警告バナー型',
    shortDescription: '恐怖・緊急訴求で視線を止める赤バナー型',
    suitableFor: ['病気・症状', '投資リスク', 'NG行動', 'やってはいけないこと', '危険な習慣'],
    structure: {
      layout: '上段赤帯バナー → 中段メインワード → 下段選数バッジ',
      sections: ['赤い横帯バナー+警告コピー（上段）', 'メインワード（中段・超大）', '選数バッジ（右下）'],
      focalPoint: 'メインワード（画面の40〜50%占有）',
    },
    colorRules: {
      background: '黒 or ダークパープル（不安・緊張感）',
      accent: '赤帯(#CC0000)、選数バッジ黄色',
      textColor: 'メインワード: 白 or 赤、バナー内: 白',
      mood: '不安・緊張・緊急感',
    },
    fontRules: {
      mainText: '極太ゴシック（赤 or 白）、縁取りアウトライン必須',
      numberStyle: '選数バッジ: 黄色背景+黒文字 or 赤背景+白文字',
      hierarchy: '赤帯警告 > メインワード > 選数バッジ',
    },
    layoutRules: {
      composition: '赤帯は画面最上部必須、メインワードは中央大きく、選数は右下角丸バッジ',
      textPlacement: '赤帯内: 白文字警告コピー、中央: 超大メインワード、右下: 選数バッジ',
      personPlacement: '人物なし or 背景にシルエット',
    },
    promptConstraints: {
      compositionEn: 'Red horizontal banner bar across the very top of the frame (mandatory). Large main keyword/phrase dominating the center, occupying 40-50% of the frame. Small rounded badge with a number ("○選") in the bottom-right corner. Dark, ominous atmosphere.',
      colorSchemeEn: 'Dark background (black or dark purple) creating anxiety and tension. Bright red (#CC0000) banner bar at top with white text. Main word in white or red. Yellow badge (#FFD700) with black text in bottom-right, or red badge with white text. High contrast, urgent mood.',
      textPlacementEn: 'Top red banner: medium-bold white Gothic warning text (e.g., "知らないと危険"). Center: MASSIVE main keyword in extra-bold white or red Gothic with mandatory outline. Bottom-right: small rounded badge with selection count. All text in Japanese with thick outlines.',
    },
  },
  T03: {
    id: 'T03',
    name: 'ビフォーアフター矢印型',
    shortDescription: '変化・成長を矢印で可視化し、結果への期待感を生む',
    suitableFor: ['収入アップ', 'スキル習得', 'ダイエット', '資産形成', '副業成功事例'],
    structure: {
      layout: '左右分割 or 上下分割: BEFORE → 矢印 → AFTER',
      sections: ['BEFORE状態（小・暗い）', '矢印（中央・太い）', 'AFTER状態（大・明るい）', '変化量テキスト'],
      focalPoint: '矢印とAFTER状態',
    },
    colorRules: {
      background: '黒 or 暗めの単色',
      accent: '矢印: 黄色(#FFD700)',
      textColor: 'BEFORE: グレー or 暗色、AFTER: 白 or 黄色',
      mood: '変化・成長・希望',
    },
    fontRules: {
      mainText: 'AFTER側: 極太ゴシック（BEFORE側の2倍以上）',
      numberStyle: '変化量を数値で明示',
      hierarchy: 'AFTER数値 > 矢印 > BEFORE数値',
    },
    layoutRules: {
      composition: '左右分割 or 上下分割、矢印は中央に大きく、AFTER側に視線が来るよう誘導',
      textPlacement: 'BEFORE側: 小さく暗い数字/テキスト、AFTER側: 大きく明るい数字/テキスト',
      personPlacement: '人物なし or BEFORE/AFTER両方に小さく',
    },
    promptConstraints: {
      compositionEn: 'Split layout (left-right or top-bottom). BEFORE state on the left/top (smaller, subdued). Large bold arrow in the center pointing from BEFORE to AFTER. AFTER state on the right/bottom (larger, prominent). Eye flow guided toward the AFTER result. The arrow is a major visual element, not just a decoration.',
      colorSchemeEn: 'Dark background (black or dark solid color). BEFORE side in gray or dark muted tones. Arrow in bright yellow (#FFD700), thick and prominent. AFTER side in white or bright yellow (vivid, hopeful). High contrast between BEFORE (dark/small) and AFTER (bright/large). Mood: transformation, growth, hope.',
      textPlacementEn: 'BEFORE text: small gray or dark-colored number/text in Japanese. AFTER text: large bold white or yellow number/text in Japanese (2x+ larger than BEFORE). Change amount explicitly shown as numbers. Arrow: thick yellow, center of frame. All text with outlines for readability.',
    },
  },
  T04: {
    id: 'T04',
    name: '対決・比較分割型',
    shortDescription: '2〜3つの選択肢を画面分割で対峙させ「どちら派？」を生む',
    suitableFor: ['商品比較', 'サービス比較', '生活スタイル比較', '投資方法比較', 'ツール比較'],
    structure: {
      layout: '画面を2分割（or 3分割）+ 中央境界 + 下部疑問コピー',
      sections: ['選択肢A（左半分）', '選択肢B（右半分）', '中央区切り「VS」等', '下部疑問コピー'],
      focalPoint: '中央の対決要素（VS等）',
    },
    colorRules: {
      background: '左右で異なる背景色 or 写真',
      accent: '中央境界: 白',
      textColor: 'ラベル: 白極太、下部: 白 or 黄色',
      mood: '対立・選択・ワクワク感',
    },
    fontRules: {
      mainText: '各選択肢ラベル: 白極太ゴシック',
      numberStyle: '中央区切り「VS」「？？？」: 白・大きめ',
      hierarchy: 'VS/区切り > 選択肢ラベル > 疑問コピー',
    },
    layoutRules: {
      composition: '必ず画面を2分割（or 3分割）、境界線は細い白線 or 自然な分割',
      textPlacement: '各選択肢ラベルは各半面内、疑問コピーは下部に全幅で独立配置',
      personPlacement: '各半面に1人ずつ or アイコン/写真',
    },
    promptConstraints: {
      compositionEn: 'Screen split exactly in half (or thirds). Left side: Option A with its own background color or photo. Right side: Option B with a contrasting background. Center divider with "VS", arrow, or "???" symbol. Bottom section spanning full width for the question copy. Clear visual separation between the two sides.',
      colorSchemeEn: 'Each side has a distinctly different background color or photo to emphasize contrast. Center divider element in white. Labels in white with high contrast. Bottom text in white or yellow. Mood: rivalry, competition, excitement of choice.',
      textPlacementEn: 'Each option labeled in extra-bold white Gothic text within its half. Center: large white "VS" or comparison symbol. Bottom: full-width question copy in extra-bold white or yellow Gothic (e.g., "どっちが○○？"). All text in Japanese with thick outlines.',
    },
  },
  T05: {
    id: 'T05',
    name: '〇選リスト予告型',
    shortDescription: '「何個ある」を先に見せて網羅性・具体性を予告する',
    suitableFor: ['おすすめランキング', '注意点まとめ', 'テクニック集', '本・アプリ・商品紹介'],
    structure: {
      layout: '上部丸数字 → 中段メインテーマ → 右下選数バッジ',
      sections: ['丸数字①②③…（上部横一列）', 'メインテーマテキスト（中段・大）', '「〇選」バッジ（右下・大きめ）'],
      focalPoint: 'メインテーマテキスト + 選数バッジ',
    },
    colorRules: {
      background: '白（明るい系）or 黒（暗い系）',
      accent: '選数バッジ: 赤 or 黄色',
      textColor: 'メイン: 黒（白背景時）or 白（黒背景時）',
      mood: '整理・網羅・期待感',
    },
    fontRules: {
      mainText: '極太ゴシック（大）',
      numberStyle: '丸数字: 中サイズ、選数: 極太ゴシック（メインより大きくても可）',
      hierarchy: '選数バッジ > メインテーマ > 丸数字',
    },
    layoutRules: {
      composition: '丸数字は上部横並びで「数の多さ」を予告、選数バッジは右下 or 中央下部に独立',
      textPlacement: '丸数字: 上部横一列、メインテーマ: 中央、選数バッジ: 右下',
      personPlacement: '人物なし or 背景に小さく',
    },
    promptConstraints: {
      compositionEn: 'Circle numbers (①②③...) arranged horizontally at the top of the frame to preview the count. Main theme text large in the center. Large selection count badge ("○選") in the bottom-right or center-bottom, standing independently. Background can be solid color or photograph.',
      colorSchemeEn: 'Background: either bright white or dark black. Circle numbers: white outlined circles with black text, or black filled circles with white text. Selection badge: red or yellow background with contrasting text. Main text: black (on white bg) or white (on dark bg). Clean, organized mood.',
      textPlacementEn: 'Top row: medium-sized circle numbers (①②③...) in a horizontal line. Center: large extra-bold Gothic main theme text in Japanese. Bottom-right: large selection count badge in extra-bold Gothic (e.g., "5選", "10選"), can be larger than main text. All text with outlines.',
    },
  },
  T06: {
    id: 'T06',
    name: 'タイポグラフィ1点突破型',
    shortDescription: '1〜4文字の巨大テキストだけで感情を揺さぶる最もシンプルな型',
    suitableFor: ['「崩壊」「暴露」「終わり」「革命」など感情的インパクトワード'],
    structure: {
      layout: '背景 + メインワード1つのみ（+ 極小サブコピー）',
      sections: ['メインワード（超大・画面の50〜70%）', 'サブコピー（超小・下部添え）'],
      focalPoint: 'メインワード（唯一の主役）',
    },
    colorRules: {
      background: '黒 or 赤 or ダーク系写真',
      accent: '赤（メインワード or 背景）',
      textColor: 'メインワード: 白 or 赤（縁取り必須）、サブ: 白細字',
      mood: '衝撃・圧倒・シンプル',
    },
    fontRules: {
      mainText: '極太ゴシック（画面高さの50〜70%）、白縁取り+黒影二重アウトライン',
      numberStyle: '数字なし',
      hierarchy: 'メインワード >>> サブコピー',
    },
    layoutRules: {
      composition: '装飾・アイコン・バッジは原則なし、文字が画像を食うサイズ、余白は意図的',
      textPlacement: 'メインワード: 画面中央、サブコピー: メインの1/6以下で下部に添え',
      personPlacement: '人物なし（テキストのみ）',
    },
    promptConstraints: {
      compositionEn: 'Extremely minimal composition. ONE massive word dominates 50-70% of the entire frame. No icons, badges, decorations, or visual elements. Intentional whitespace as part of the composition. The text IS the image. Optional: very subtle dark background photo behind the text.',
      colorSchemeEn: 'Background: black, red, or dark moody photograph. Main word: white or red with mandatory thick outlines. Sub-copy: thin white. Mood: shock, overwhelming impact, bold simplicity. No gradients or complex color schemes.',
      textPlacementEn: 'Center: ONE massive Japanese word (1-4 characters) in extra-bold Gothic, occupying 50-70% of frame height, white outline + black shadow double outline mandatory. Bottom: tiny sub-copy (1/6 the size of main word), thin white text. Nothing else. All text in Japanese.',
    },
  },
  T07: {
    id: 'T07',
    name: 'Q&A答えます型',
    shortDescription: '複数の疑問を列挙して「全部答える」と宣言し視聴動機を作る',
    suitableFor: ['FAQ形式', '初心者向け解説', 'よくある疑問への回答', 'ノウハウ系'],
    structure: {
      layout: '質問3つ縦一列 + 下部CTA「全部答えます！」',
      sections: ['質問①（丸アイコン+テキスト）', '質問②', '質問③', 'CTA（下部・超大・赤）'],
      focalPoint: 'CTA「全部答えます！」',
    },
    colorRules: {
      background: '白（視認性最優先）',
      accent: '丸アイコン: 赤 or 緑、CTA: 赤',
      textColor: '質問: 黒 or 濃いグレー、CTA: 赤',
      mood: '親しみ・信頼・期待',
    },
    fontRules: {
      mainText: '質問: 中太ゴシック（読みやすさ優先）',
      numberStyle: 'CTA: 極太ゴシック（質問の2倍以上）',
      hierarchy: 'CTA > 質問テキスト > 丸アイコン',
    },
    layoutRules: {
      composition: '質問3つ左揃え縦一列、CTAは下部に独立全幅配置',
      textPlacement: '質問: 左揃え縦並び（各行に丸アイコン）、CTA: 下部全幅',
      personPlacement: '人物なし or 右側に小さく',
    },
    promptConstraints: {
      compositionEn: 'Three questions listed vertically, left-aligned, each preceded by a colored circle icon (red or green). Below the questions, a large CTA section spanning full width. Clean, organized layout. Questions should look like a readable list, not cluttered.',
      colorSchemeEn: 'White or very light background for maximum readability. Question text in black or dark gray. Circle icons in red or green. CTA text in red. Clean, friendly, trustworthy mood. No dark or dramatic colors.',
      textPlacementEn: 'Three question lines in medium-bold Japanese Gothic, left-aligned vertically (e.g., "○○って何？", "△△はどうすれば？"). Each with a colored circle bullet. Bottom: large CTA in extra-bold red Gothic (2x+ question text size), e.g., "全部答えます！". All text in Japanese.',
    },
  },
  T08: {
    id: 'T08',
    name: '実績バッジ＋人物型',
    shortDescription: '人物写真と実績数字バッジで信頼感と権威性を一瞬で伝える',
    suitableFor: ['チャンネル紹介', '実体験・体験談', 'ノウハウ公開', 'インタビュー', 'Vlog系'],
    structure: {
      layout: '実績バッジ（左上/左下）+ 人物写真（中央〜右）+ テキストバー（下部）',
      sections: ['実績バッジ（赤背景×白文字）', '人物写真（表情豊か）', 'テキストオーバーレイ（下部黒半透明バー）'],
      focalPoint: '人物の表情',
    },
    colorRules: {
      background: '実写写真（スタジオ・現場・自然光）',
      accent: 'バッジ: 赤背景+白文字 or 黄色背景+黒文字',
      textColor: '下部テキスト: 白（半透明黒バー上）',
      mood: '信頼・権威・親しみ',
    },
    fontRules: {
      mainText: '下部タイトル: 極太ゴシック（白）',
      numberStyle: 'バッジ: 中太ゴシック（小〜中）',
      hierarchy: '人物 > 下部タイトル > バッジ',
    },
    layoutRules: {
      composition: '人物は顔が見える大きさで中央〜右、バッジは左上か左下、下部1/3に情報集中',
      textPlacement: 'バッジ: 左上 or 左下、下部: 半透明黒バー+白テキスト',
      personPlacement: '人物は必ず顔が見える大きさ、中央〜右に配置',
    },
    promptConstraints: {
      compositionEn: 'Person/face prominently positioned center-to-right, large enough to clearly see facial expression (expressive, engaging). Achievement badge in the top-left or bottom-left corner. Bottom third: semi-transparent black bar spanning full width with text overlay. Photo-realistic quality.',
      colorSchemeEn: 'Background: real photograph (studio, natural setting, natural light). Badge: red background with white text, or yellow background with black text. Bottom bar: semi-transparent black (#000000 at 60-70% opacity) with white text. All text with subtle shadow to stand out from photo. Mood: trust, authority, approachability.',
      textPlacementEn: 'Top-left or bottom-left: achievement badge in medium-bold Gothic (e.g., "登録者○万人", "累計○万部"). Bottom bar: content title in extra-bold white Gothic text on semi-transparent black bar. All text in Japanese with shadow for photo readability.',
    },
  },
};

export const THUMBNAIL_TYPE_LIST = Object.values(THUMBNAIL_TYPES);
