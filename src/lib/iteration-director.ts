import Anthropic from '@anthropic-ai/sdk';
import { CLAUDE_MODEL } from './claude';
import { CopywriterOutput } from './copywriter';
import { ImageUsageType } from './types';

/**
 * ⑤ イテレーション・ディレクター
 *
 * フィードバックラウンドごとに「マスタープロンプト」を再構築する。
 * チャット履歴を蓄積するのではなく、元のプロンプト+FBを統合して
 * 単一のクリーンなマスタープロンプトに再構築（リファクタリング）する。
 *
 * これにより：
 * - プロンプトが膨張しない
 * - 矛盾するFBが整理される
 * - 毎回最適なプロンプトでGeminiに送れる
 */

export interface IterationDirectorInput {
  /** 元の動画コンセプト */
  originalConcept: string;
  /** 選択されたサムネイルの元プロンプト */
  currentPromptEn: string;
  /** 選択されたサムネイルの方向性情報 */
  currentApproach: string;
  currentSummary: string;
  /** ユーザーのフィードバック */
  userFeedback: string;
  /** コピーライターの出力（あれば） */
  copywriterOutput?: CopywriterOutput;
  /** 参考画像の有無 */
  hasReferenceImages: boolean;
  /** 参考画像の用途タイプ */
  imageUsageTypes?: ImageUsageType[];
  /** 過去のFB履歴（要約済み） */
  previousFeedbacks?: string[];
  /** 画像編集モード（Round 4+）: editInstructionEn も出力する */
  editMode?: boolean;
}

export interface IterationDirectorOutput {
  /** 再構築されたマスタープロンプト（3バリエーション） */
  refinedPrompts: RefinedPrompt[];
  /** どうFBを解釈・統合したかの説明 */
  reasoning: string;
}

export interface RefinedPrompt {
  id: string;
  /** 改善軸 */
  refinementAxis: string;
  /** 何を変えたかの説明 */
  changeSummary: string;
  /** 日本語サマリー */
  conceptSummary: string;
  /** Gemini用の完全に再構築されたプロンプト */
  promptEn: string;
  /** Gemini画像編集用の英語指示（editMode時のみ） */
  editInstructionEn?: string;
  /** 主な変更点 */
  keyChanges: string[];
}

const ITERATION_DIRECTOR_PROMPT = `あなたはYouTubeサムネイルのイテレーション・ディレクターです。

## あなたの役割
ユーザーのフィードバックを受けて、Gemini画像生成用の「マスタープロンプト」を**完全に再構築**します。
チャット履歴を蓄積するのではなく、元のプロンプトとフィードバックを統合して、
**単一のクリーンで最適化されたプロンプト**を3つのバリエーションで生成します。

## 再構築のルール
1. 元のプロンプトの良い部分は維持する
2. ユーザーのフィードバックを**全て**反映する
3. 矛盾するフィードバックがあれば、最新のものを優先する
4. 過去のフィードバック履歴があれば、累積的に反映する
5. 3つのバリエーションはそれぞれ**異なる改善軸**で改善する:
   - 構図・レイアウト変更
   - テキスト・コピー変更
   - 色彩・ムード変更
6. promptEnは完全な自己完結型のプロンプトにする（「前回から○○を変更」のような差分表現は禁止）

## 構造化フィードバックの解釈ルール
ユーザーのフィードバックには以下のセクションが含まれることがある:
- **【調整指示】**: スライダーによる数値調整。+1=やや、+2=かなり、-1=やや、-2=かなり。
  例: 「文字サイズ: かなり大きく(+2)」→ promptEnのテキスト指示を bold, extra-large, dominant に変更
  例: 「明るさ: やや暗く(-1)」→ ライティングをやや暗め・ムーディーに
  例: 「インパクト: かなり強烈(+2)」→ 色彩・表情・テキスト全てを極端に強調
- **【変更指示】**: 特定の要素を変更する指示。該当するプロンプト要素を大幅に書き換える。
- **【補足】**: 自由記述。最優先で反映する。
これらのセクションがない場合は、従来通りの自由記述フィードバックとして解釈する。

## promptEnのフォーマット
- 「Generate a YouTube thumbnail image for a Japanese audience」で始める
- 具体的な構図・色彩・ライティングを映画的に描写する
- **テキストは必ず日本語**。太い縁取り必須。3〜5語以内
- 人物がいる場合は感情表現を誇張する
- 大胆でシンプル。要素を絞り1つの焦点に集中
- プロンプトは創造的に。テンプレート的な表現を避ける

## 出力形式（JSON厳密出力。JSON以外は出力しないこと）
{
  "reasoning": "フィードバックをどう解釈し、どう再構築したかの説明",
  "refinedPrompts": [
    {
      "id": "iter-1",
      "refinementAxis": "構図変更 | テキスト変更 | 色彩・ムード変更",
      "changeSummary": "この改善で何を変えたかの説明",
      "conceptSummary": "日本語での改善方向性サマリー",
      "promptEn": "Generate a YouTube thumbnail image for a Japanese audience. ...",
      "editInstructionEn": "(editMode時のみ) Edit this thumbnail: ...",
      "keyChanges": ["変更点1", "変更点2", "変更点3"]
    }
  ]
}`;

export async function runIterationDirector(
  input: IterationDirectorInput,
  anthropicKey: string,
): Promise<IterationDirectorOutput> {
  const client = new Anthropic({ apiKey: anthropicKey });

  let systemPrompt = ITERATION_DIRECTOR_PROMPT;

  // editMode: Round 4+ では画像編集向けの指示も生成する
  if (input.editMode) {
    systemPrompt += `

## 画像編集モード（重要）
このラウンドでは画像編集モードです。選択されたサムネイルをベースに「部分編集」します。
各バリエーションにeditInstructionEnフィールドを**必ず**出力してください。

editInstructionEnのルール:
- 英語で記述する
- 「Edit this YouTube thumbnail:」で始める
- 元画像の何を変えるかを**具体的に**指示する
- 変えない部分は指示しない（元画像がそのまま維持される）
- 各バリエーションで異なる編集を提案する
- 例: "Edit this YouTube thumbnail: Increase all text overlays by 40%, make them bolder with thicker outlines. Slightly darken the background to improve text contrast."
- promptEnも引き続き出力する（フォールバック用）`;
  }

  if (input.hasReferenceImages) {
    const usages = input.imageUsageTypes || ['character' as ImageUsageType];
    const hasChar = usages.includes('character');
    const hasProduct = usages.includes('product');
    const hasStyle = usages.includes('style');
    const hasLayout = usages.includes('layout');

    let refPrompt = `\n\n## 参考画像について（重要）\nユーザーが参考画像をアップロードしています。`;
    if (hasChar) refPrompt += `\n- キャラクター/人物画像: そのまま配置。外見を変えず、背景・ライティング・テキストだけ変更。`;
    if (hasProduct) refPrompt += `\n- 商品/書籍/ロゴ画像: そのまま配置。デザインを維持し、目立つ位置に。`;
    if (hasStyle) refPrompt += `\n- スタイル参考画像: 色味・雰囲気・デザインスタイルだけを参考に。被写体はコピーしない。`;
    if (hasLayout) refPrompt += `\n- 構図参考画像: レイアウト・配置だけを参考に。被写体やスタイルはコピーしない。`;
    systemPrompt += refPrompt;
  }

  // Build copy info section if available
  let copyInfo = '';
  if (input.copywriterOutput) {
    const copies = input.copywriterOutput.mainCopies
      .map(c => `「${c.text}」(${c.trigger})`)
      .join('、');
    const subs = input.copywriterOutput.subTexts.join('、');
    copyInfo = `\n\n【コピーライター提案のテキスト】
メインコピー候補: ${copies}
サブテキスト: ${subs}
※これらのテキストをpromptEnのtext overlayとして活用すること。`;
  }

  // Build feedback history section (limit to last 5 to prevent prompt overflow)
  let historySection = '';
  if (input.previousFeedbacks && input.previousFeedbacks.length > 0) {
    const MAX_HISTORY = 5;
    const recentFeedbacks = input.previousFeedbacks.slice(-MAX_HISTORY);
    const skipped = input.previousFeedbacks.length - recentFeedbacks.length;
    const startRound = skipped + 1;
    historySection = `\n\n【過去のフィードバック履歴${skipped > 0 ? `（直近${MAX_HISTORY}件）` : ''}】
${recentFeedbacks.map((fb, i) => `Round ${startRound + i}: ${fb}`).join('\n')}
※最新のフィードバックを最優先しつつ、過去のFBも累積的に反映すること。`;
  }

  const userMessage = `以下の情報を元に、マスタープロンプトを再構築してください。

【動画コンセプト】
${input.originalConcept}

【現在のプロンプト】
アプローチ: ${input.currentApproach}
サマリー: ${input.currentSummary}
promptEn: ${input.currentPromptEn}

【ユーザーのフィードバック】
${input.userFeedback}${copyInfo}${historySection}
${input.hasReferenceImages ? '\n※参考画像がアップロードされています。キャラクター/人物はそのまま使う前提でpromptEnを書いてください。' : ''}
JSONのみを出力してください。`;

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const textContent = response.content.find(c => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude (iteration director)');
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Iteration director did not return valid JSON');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  const refinedPrompts: RefinedPrompt[] = (parsed.refinedPrompts || []).map(
    (d: Record<string, unknown>, i: number) => ({
      id: (d.id as string) || `iter-${i + 1}`,
      refinementAxis: (d.refinementAxis as string) || '',
      changeSummary: (d.changeSummary as string) || '',
      conceptSummary: (d.conceptSummary as string) || '',
      promptEn: (d.promptEn as string) || '',
      editInstructionEn: (d.editInstructionEn as string) || undefined,
      keyChanges: (d.keyChanges as string[]) || [],
    }),
  );

  return {
    refinedPrompts,
    reasoning: (parsed.reasoning as string) || '',
  };
}
