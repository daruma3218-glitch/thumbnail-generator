import Anthropic from '@anthropic-ai/sdk';
import { CLAUDE_MODEL } from './claude';
import { CopywriterOutput } from './copywriter';
import { CreativeDirection, DirectionsResult, ImageUsageType, RefinementDirection, RefinementResult } from './types';

const MAX_SEARCH_CONTINUATIONS = 3;

const WEB_SEARCH_TOOL: Anthropic.Messages.WebSearchTool20250305 = {
  type: 'web_search_20250305',
  name: 'web_search',
  max_uses: 3,
};

const DIRECTIONS_SYSTEM_PROMPT = `あなたはYouTubeサムネイルのトップクリエイティブディレクターです。
与えられた動画コンセプトに対して、**3つの心理的に対立するクリエイティブ方向性**を設計してください。

## 重要なルール
1. 3つの方向性は**必ず異なる心理的アプローチ**を使うこと
2. 以下の5つの心理的アプローチから3つを選んで使うこと:
   - 感情訴求（恐怖・驚き・感動・怒りなど強い感情で引き込む）
   - 情報インパクト（数字・データ・事実の衝撃で引き込む）
   - 好奇心刺激（謎・疑問・意外性で「見たい」を誘発する）
   - 権威・信頼（専門性・実績・社会的証明で信頼を得る）
   - 対比・ギャップ（ビフォーアフター・常識との矛盾で注目を集める）
3. 各方向性は同じ動画でも**全く違う見え方**になるようにする
4. promptEnは**Geminiの画像生成用プロンプト**。クリエイティブの核心を具体的に書くこと:
   - 「Generate a YouTube thumbnail image for a Japanese audience」で始める
   - 具体的な構図（人物配置、背景、アングル）を映画のワンシーンのように描写する
   - 色彩・ライティング・ムードを具体的に指示する
   - **サムネイル上のテキストは必ず日本語**で書く。例: text overlay reading "衝撃の真実" in bold yellow with thick black outline
   - テキストは短く（日本語3〜5語以内）。太い縁取り必須
   - 人物がいる場合は感情表現を誇張する（例: eyes wide open, mouth agape in shock）
   - 大胆でシンプルな構図。要素を絞って1つの焦点に集中する
   - プロンプトは創造的かつ具体的に。テンプレート的・無難な表現を避ける

## Web検索の活用
- 必要に応じてWeb検索で同ジャンルの人気サムネイル傾向を調査し、差別化に活かす

## 出力形式（JSON厳密出力。JSON以外は出力しないこと）
{
  "reasoning": "なぜこの3つの心理的アプローチを選んだかの説明",
  "directions": [
    {
      "id": "dir-1",
      "approach": "心理的アプローチ名",
      "psychologicalAngle": "このアプローチの詳細説明",
      "conceptSummary": "日本語でのサムネイル方向性サマリー",
      "promptEn": "Generate a YouTube thumbnail image for a Japanese audience. ...",
      "keyVisualElements": ["要素1", "要素2", "要素3"],
      "expectedImpact": "期待される視聴者への効果"
    }
  ]
}`;

const REFINEMENT_SYSTEM_PROMPT = `あなたはYouTubeサムネイルのトップクリエイティブディレクターです。
ユーザーが選んだサムネイルの方向性に対するフィードバックを元に、**3つの異なる改善軸**で改善バリエーションを設計してください。

## 重要なルール
1. 3つの改善バリエーションはそれぞれ**異なる改善軸**で改善すること:
   - 構図・レイアウト変更（人物配置、テキスト位置、視線誘導の改善）
   - テキスト・コピー変更（キャッチコピー、数字の使い方、フォントサイズの改善）
   - 色彩・ムード変更（配色、明暗、雰囲気、感情トーンの改善）
2. 全てのバリエーションにユーザーのフィードバックを反映すること
3. 元の方向性の良い部分は維持しつつ、各軸で大胆に改善すること
4. promptEnは**Geminiの画像生成用プロンプト**。クリエイティブの核心を具体的に書く:
   - 「Generate a YouTube thumbnail image for a Japanese audience」で始める
   - 具体的な構図・色彩・ライティングを映画的に描写する
   - **テキストは必ず日本語**。太い縁取り必須。3〜5語以内
   - 人物がいる場合は感情表現を誇張する
   - 大胆でシンプル。要素を絞り1つの焦点に集中
   - プロンプトは創造的に。テンプレート的な表現を避ける

## 出力形式（JSON厳密出力。JSON以外は出力しないこと）
{
  "reasoning": "フィードバックをどう解釈し、どう改善するかの説明",
  "directions": [
    {
      "id": "ref-1",
      "refinementAxis": "構図変更 | テキスト変更 | 色彩・ムード変更",
      "changeSummary": "この改善で何を変えたかの説明",
      "conceptSummary": "日本語での改善方向性サマリー",
      "promptEn": "Generate a YouTube thumbnail image for a Japanese audience. ...",
      "keyChanges": ["変更点1", "変更点2", "変更点3"]
    }
  ]
}`;

/**
 * Claude呼び出し + web_search pause_turn 継続ループ
 */
async function callClaudeWithSearch(
  client: Anthropic,
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  let messages: Anthropic.Messages.MessageParam[] = [
    { role: 'user', content: userMessage },
  ];

  console.log('[directions] Starting Claude call...');

  let response: Anthropic.Messages.Message;
  try {
    response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      tools: [WEB_SEARCH_TOOL],
      messages,
    });
  } catch (err) {
    console.error('[directions] Initial Claude call failed:', (err as Error).message);
    throw err;
  }

  console.log(`[directions] Initial response: stop_reason=${response.stop_reason}, blocks=${response.content.length}`);

  // Handle pause_turn continuations (web search results)
  let continuations = 0;
  while (response.stop_reason === 'pause_turn' && continuations < MAX_SEARCH_CONTINUATIONS) {
    continuations++;
    console.log(`[directions] Web search continuation ${continuations}/${MAX_SEARCH_CONTINUATIONS}`);

    messages = [
      ...messages,
      { role: 'assistant', content: response.content },
      { role: 'user', content: [{ type: 'text', text: '検索結果を踏まえて、引き続きJSON出力を完成させてください。' }] },
    ];

    try {
      response = await client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 4096,
        system: systemPrompt,
        tools: [WEB_SEARCH_TOOL],
        messages,
      });
      console.log(`[directions] Continuation ${continuations} response: stop_reason=${response.stop_reason}`);
    } catch (err) {
      console.error(`[directions] Continuation ${continuations} failed:`, (err as Error).message);
      throw err;
    }
  }

  // If still pause_turn after max continuations, do one final call WITHOUT tools to force JSON output
  if (response.stop_reason === 'pause_turn') {
    console.log('[directions] Max continuations reached, forcing final response without tools...');
    messages = [
      ...messages,
      { role: 'assistant', content: response.content },
      { role: 'user', content: [{ type: 'text', text: 'Web検索は十分です。これまでの情報を元に、JSON出力のみを返してください。' }] },
    ];

    response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages, // no tools → forces text output
    });
    console.log(`[directions] Final forced response: stop_reason=${response.stop_reason}`);
  }

  // Extract text from the response — collect ALL text blocks
  const textBlocks = response.content.filter(c => c.type === 'text');
  if (textBlocks.length === 0) {
    console.error('[directions] No text blocks found. Content types:', response.content.map(c => c.type));
    throw new Error('No text response from Claude');
  }

  const fullText = textBlocks.map(b => b.type === 'text' ? b.text : '').join('\n');
  console.log(`[directions] Extracted text length: ${fullText.length}`);
  return fullText;
}

/**
 * 3つの対立する方向性を設計
 * カスケード: コンテキスト・リーダー → コピーライター → ④ プロンプト・エンジニア（この関数）
 */
/** Build Claude system prompt section for reference images based on usage types */
function buildRefImageSystemPrompt(imageUsageTypes: ImageUsageType[]): string {
  const counts: Record<ImageUsageType, number> = { character: 0, style: 0, layout: 0, product: 0 };
  for (const u of imageUsageTypes) counts[u]++;

  const sections: string[] = [];

  if (counts.character > 0) {
    sections.push(`### キャラクター・人物画像（${counts.character}枚）
- promptEnで「Place the character from the reference image」と指示する
- キャラクターの**外見を一切変えない**（顔、髪型、服装、体型、画風をそのまま維持）
- 変えるのは**背景・ライティング・構図・テキストオーバーレイ**のみ
- 感情表現（表情）は方向性に合わせて指示してよい`);
  }

  if (counts.product > 0) {
    sections.push(`### 商品・書籍・ロゴ画像（${counts.product}枚）
- promptEnで「Place the product/book/logo from the reference image prominently in the scene」と指示する
- 商品のデザイン・色・テキスト・形状をそのまま維持する
- 商品を目立つ位置に配置し、構図の中で存在感を出す`);
  }

  if (counts.style > 0) {
    sections.push(`### スタイル参考画像（${counts.style}枚）
- 参考画像の**被写体はコピーしない**。色味・雰囲気・デザインスタイルだけを参考にする
- promptEnで「Match the color palette, mood, and visual style of the reference image」と指示する
- 同じ配色、コントラスト、質感、ライティングの雰囲気を再現する`);
  }

  if (counts.layout > 0) {
    sections.push(`### 構図参考画像（${counts.layout}枚）
- 参考画像の**構図・レイアウトだけを参考**にする（被写体やスタイルはコピーしない）
- promptEnで「Follow the composition and layout from the reference image」と指示する
- テキスト配置、人物の位置、余白の使い方を参考にする`);
  }

  return `\n\n## 参考画像について（① ビジョン・アナリスト指示 — 重要）
ユーザーが${imageUsageTypes.length}枚の参考画像をアップロードしています。
参考画像はGeminiに直接渡されます。それぞれの用途に応じてpromptEnを設計すること:

${sections.join('\n\n')}`;
}

export async function designDirections(
  concept: string,
  anthropicKey: string,
  stylePrinciples?: string,
  hasReferenceImages?: boolean,
  copywriterOutput?: CopywriterOutput,
  imageUsageTypes?: ImageUsageType[],
): Promise<DirectionsResult> {
  const client = new Anthropic({ apiKey: anthropicKey });

  let systemPrompt = DIRECTIONS_SYSTEM_PROMPT;
  if (stylePrinciples && stylePrinciples.trim()) {
    systemPrompt += `\n\n## スタイル基本原則（必ず全方向性に適用すること）\n${stylePrinciples}`;
  }
  if (hasReferenceImages && imageUsageTypes && imageUsageTypes.length > 0) {
    systemPrompt += buildRefImageSystemPrompt(imageUsageTypes);
  } else if (hasReferenceImages) {
    // Fallback: no usage types specified, assume character
    systemPrompt += buildRefImageSystemPrompt(['character']);
  }

  // Build copy info section if copywriter output is available
  let copyInfo = '';
  if (copywriterOutput) {
    const copies = copywriterOutput.mainCopies
      .map(c => `「${c.text}」(${c.trigger})`)
      .join('、');
    const subs = copywriterOutput.subTexts.join('、');
    copyInfo = `\n\n【③ コピーライターからの提案テキスト】
メインコピー候補: ${copies}
サブテキスト: ${subs}
※各方向性のpromptEnでは、上記のコピーから最適なものを選んでtext overlayとして使用すること。
  3方向性それぞれ異なるコピーを使い分けること。`;
  }

  const userMessage = `以下の動画コンセプトに対して、3つの心理的に対立するクリエイティブ方向性を設計してください。

【動画コンセプト】
${concept}${copyInfo}
${hasReferenceImages ? '\n※参考画像がアップロードされています。promptEnでは「参考画像のキャラクター/人物をそのまま使う」前提で書いてください。\n' : ''}
JSONのみを出力してください。`;

  const text = await callClaudeWithSearch(client, systemPrompt, userMessage);

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Claude did not return valid JSON');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  const directions: CreativeDirection[] = (parsed.directions || []).map(
    (d: Record<string, unknown>, i: number) => ({
      id: (d.id as string) || `dir-${i + 1}`,
      approach: (d.approach as string) || '',
      psychologicalAngle: (d.psychologicalAngle as string) || '',
      conceptSummary: (d.conceptSummary as string) || '',
      promptEn: (d.promptEn as string) || '',
      keyVisualElements: (d.keyVisualElements as string[]) || [],
      expectedImpact: (d.expectedImpact as string) || '',
    }),
  );

  return {
    directions,
    reasoning: (parsed.reasoning as string) || '',
  };
}

/**
 * 選択された方向性を3軸で改善
 */
export async function designRefinement(
  originalConcept: string,
  selectedDirection: { id: string; promptEn: string; approach?: string; conceptSummary?: string },
  userFeedback: string,
  anthropicKey: string,
  stylePrinciples?: string,
  hasReferenceImages?: boolean,
): Promise<RefinementResult> {
  const client = new Anthropic({ apiKey: anthropicKey });

  let systemPrompt = REFINEMENT_SYSTEM_PROMPT;
  if (stylePrinciples && stylePrinciples.trim()) {
    systemPrompt += `\n\n## スタイル基本原則（必ず全バリエーションに適用すること）\n${stylePrinciples}`;
  }
  if (hasReferenceImages) {
    systemPrompt += `\n\n## 参考画像について（重要）
ユーザーが参考画像（キャラクター・人物・書籍等）をアップロードしています。
promptEnには「参考画像に写っているキャラクター/人物をそのまま配置する」前提で構図を設計すること。
キャラクターの外見を変えず、背景・ライティング・テキストだけを変えること。`;
  }

  const userMessage = `以下の選択されたサムネイル方向性に対して、ユーザーのフィードバックを元に3つの改善バリエーションを設計してください。

【動画コンセプト】
${originalConcept}

【選択された方向性】
- アプローチ: ${selectedDirection.approach || '不明'}
- サマリー: ${selectedDirection.conceptSummary || '不明'}
- 元のプロンプト: ${selectedDirection.promptEn}

【ユーザーのフィードバック】
${userFeedback}
${hasReferenceImages ? '\n※参考画像がアップロードされています。キャラクター/人物はそのまま使う前提でpromptEnを書いてください。' : ''}
JSONのみを出力してください。`;

  const text = await callClaudeWithSearch(client, systemPrompt, userMessage);

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Claude did not return valid JSON');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  const directions: RefinementDirection[] = (parsed.directions || []).map(
    (d: Record<string, unknown>, i: number) => ({
      id: (d.id as string) || `ref-${i + 1}`,
      refinementAxis: (d.refinementAxis as string) || '',
      changeSummary: (d.changeSummary as string) || '',
      conceptSummary: (d.conceptSummary as string) || '',
      promptEn: (d.promptEn as string) || '',
      keyChanges: (d.keyChanges as string[]) || [],
    }),
  );

  return {
    directions,
    reasoning: (parsed.reasoning as string) || '',
  };
}
