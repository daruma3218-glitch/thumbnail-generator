import Anthropic from '@anthropic-ai/sdk';
import { CLAUDE_MODEL } from './claude';
import { ExtractedParts } from './types';
import { ThumbnailTypeId, THUMBNAIL_TYPES } from './thumbnail-types';

/**
 * ③ コピーライター・エージェント
 *
 * extract-partsの出力を受け取り、CTR最適化された日本語キャッチコピーを生成する。
 * サムネイル上で使用する短いテキスト（2〜5語）を複数パターン生成し、
 * promptEngineerに渡す。
 */

export interface CopywriterOutput {
  /** メインキャッチコピー候補（3パターン） */
  mainCopies: CopyCandidate[];
  /** サブテキスト候補（数字・補足情報） */
  subTexts: string[];
  /** コピーの設計意図 */
  reasoning: string;
}

export interface CopyCandidate {
  text: string;
  /** どの心理トリガーを使っているか */
  trigger: string;
  /** なぜCTR向上に効くか */
  effectiveness: string;
}

const COPYWRITER_PROMPT = `あなたはYouTubeサムネイル専門のコピーライターです。
動画の分析データを元に、サムネイル上に載せるCTR最適化された日本語テキストを設計してください。

## コピーの鉄則
1. **2〜5語以内**に凝縮する（モバイル168x94pxで読めるサイズ）
2. **感情トリガー**を必ず1つ入れる:
   - 恐怖: 「知らないと危険」「やばい」「絶対NG」
   - 驚き: 「まさかの」「衝撃」「○○だった」
   - 好奇心: 「なぜ？」「○○の正体」「実は...」
   - 緊急性: 「今すぐ」「○○前に見て」
   - 数字: 「○万円」「○○%」「たった○日」
3. **具体的な数字**があれば必ず使う（数字はCTRに最も効果的）
4. 文末は**体言止め or 問いかけ**にする（「〜です」「〜ます」は禁止）
5. **ひらがな・カタカナ混在**で視認性を上げる
6. 漢字は最小限（画数が多い漢字は潰れる）

## 出力形式（JSON厳密出力。JSON以外は出力しないこと）
{
  "mainCopies": [
    {
      "text": "キャッチコピー（2〜5語）",
      "trigger": "使用した心理トリガー",
      "effectiveness": "CTR向上の理由"
    }
  ],
  "subTexts": ["補助テキスト1", "補助テキスト2"],
  "reasoning": "全体のコピー設計意図"
}`;

export async function generateCopy(
  title: string,
  parts: ExtractedParts,
  anthropicKey: string,
  selectedTypes?: ThumbnailTypeId[],
): Promise<CopywriterOutput> {
  const client = new Anthropic({ apiKey: anthropicKey });

  let systemPrompt = COPYWRITER_PROMPT;
  if (selectedTypes && selectedTypes.length > 0) {
    const typeInfos = selectedTypes.map((typeId, index) => {
      const typeSpec = THUMBNAIL_TYPES[typeId];
      return `### 型${index + 1}: ${typeSpec.name}（${typeId}）
- テキスト階層: ${typeSpec.fontRules.hierarchy}
- 構造: ${typeSpec.structure.sections.join(' → ')}
- フォーカルポイント: ${typeSpec.structure.focalPoint}`;
    });
    systemPrompt += `\n\n## 選択された${selectedTypes.length}つのサムネイル型（全型のコピーパターンをカバーすること）
${typeInfos.join('\n\n')}
- メインコピー3パターンは、それぞれ異なる型に最適化されたものを含めること
- 各型で効果的なコピーパターンを考慮すること`;
  }

  const userMessage = `以下の動画分析データを元に、サムネイル用のキャッチコピーを設計してください。

【動画タイトル】
${title}

【感情的フック】
${parts.hook}

【ターゲット感情】
${parts.targetEmotion}

【抽出済みテキスト要素】
${parts.textElements.map(t => `- [${t.priority}] ${t.content}（${t.type}）`).join('\n')}

【方向性】
${parts.suggestedDirection}

メインキャッチコピーを3パターン（それぞれ異なる心理トリガー使用）と、
補助テキスト（数字・具体的データ）を生成してください。
JSONのみを出力してください。`;

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const textContent = response.content.find(c => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude (copywriter)');
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Claude copywriter did not return valid JSON');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    mainCopies: (parsed.mainCopies || []).map((c: Record<string, string>) => ({
      text: c.text || '',
      trigger: c.trigger || '',
      effectiveness: c.effectiveness || '',
    })),
    subTexts: parsed.subTexts || [],
    reasoning: parsed.reasoning || '',
  };
}
