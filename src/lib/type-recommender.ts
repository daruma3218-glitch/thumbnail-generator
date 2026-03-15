/**
 * 型推薦エージェント
 *
 * 動画のタイトル・抽出パーツを元に、
 * 8つのサムネイル型から最適な型を推薦する。
 */
import Anthropic from '@anthropic-ai/sdk';
import { AGENT_MODEL } from './claude';
import { ExtractedParts } from './types';
import { ThumbnailTypeId, THUMBNAIL_TYPE_LIST } from './thumbnail-types';

export interface TypeRanking {
  typeId: ThumbnailTypeId;
  score: number;
  reasoning: string;
}

export interface TypeRecommendation {
  recommendedType: ThumbnailTypeId;
  reasoning: string;
  rankings: TypeRanking[];
}

const typeListText = THUMBNAIL_TYPE_LIST.map(t =>
  `- ${t.id}: ${t.name}\n  概要: ${t.shortDescription}\n  向いているコンテンツ: ${t.suitableFor.join('、')}`,
).join('\n');

const TYPE_RECOMMENDER_PROMPT = `あなたはYouTubeサムネイルの型（テンプレート）推薦エキスパートです。
動画のタイトル・原稿分析データに基づいて、最適なサムネイル型を1つ推薦してください。

## 利用可能な8つの型
${typeListText}

## 推薦基準
1. 動画の内容タイプとの適合性（数字が主役→T01、警告系→T02、比較→T04等）
2. 抽出されたテキスト要素との相性（数字要素の有無、疑問文の有無等）
3. ターゲット感情との一致（恐怖→T02、変化→T03、好奇心→T07等）
4. 原稿から読み取れるコンテンツ構造

## 重要なルール
- 必ず8型すべてにスコア（1〜10）を付けること
- 最もスコアが高い型をrecommendedTypeにすること
- 明確な理由を日本語で述べること
- 迷った場合は、よりインパクトが強い型を優先する

## 出力形式（JSON厳密出力。JSON以外は出力しないこと）
{
  "recommendedType": "T01",
  "reasoning": "推薦理由の説明（2〜3文）",
  "rankings": [
    { "typeId": "T01", "score": 9, "reasoning": "短い理由" },
    { "typeId": "T02", "score": 7, "reasoning": "短い理由" },
    { "typeId": "T03", "score": 5, "reasoning": "短い理由" },
    { "typeId": "T04", "score": 3, "reasoning": "短い理由" },
    { "typeId": "T05", "score": 6, "reasoning": "短い理由" },
    { "typeId": "T06", "score": 4, "reasoning": "短い理由" },
    { "typeId": "T07", "score": 2, "reasoning": "短い理由" },
    { "typeId": "T08", "score": 5, "reasoning": "短い理由" }
  ]
}`;

export async function recommendType(
  title: string,
  parts: ExtractedParts,
  anthropicKey: string,
): Promise<TypeRecommendation> {
  const client = new Anthropic({ apiKey: anthropicKey });

  const partsText = [
    `フック: ${parts.hook}`,
    `ターゲット感情: ${parts.targetEmotion}`,
    `テキスト要素: ${parts.textElements.map(t => `${t.content}(${t.type}/${t.priority})`).join('、')}`,
    `ビジュアル要素: ${parts.visualElements.map(v => `${v.description}(${v.type})`).join('、')}`,
    `方向性: ${parts.suggestedDirection}`,
  ].join('\n');

  const userMessage = `以下の動画情報を分析し、最適なサムネイル型を推薦してください。

【動画タイトル】
${title}

【抽出済みパーツ】
${partsText}

JSONのみを出力してください。`;

  const response = await client.messages.create({
    model: AGENT_MODEL,
    max_tokens: 2048,
    system: TYPE_RECOMMENDER_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const textContent = response.content.find(c => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude (type recommender)');
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Type recommender did not return valid JSON');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  const rankings: TypeRanking[] = (parsed.rankings || []).map(
    (r: Record<string, unknown>) => ({
      typeId: r.typeId as ThumbnailTypeId,
      score: (r.score as number) || 0,
      reasoning: (r.reasoning as string) || '',
    }),
  );

  return {
    recommendedType: (parsed.recommendedType as ThumbnailTypeId) || 'T01',
    reasoning: (parsed.reasoning as string) || '',
    rankings,
  };
}
