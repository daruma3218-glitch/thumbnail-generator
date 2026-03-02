import { ExtractedParts } from './types';

/**
 * Build a rich concept string from title + extracted parts.
 * This string replaces the old simple "concept" and flows through
 * the entire meeting/refinement pipeline automatically.
 */
export function buildConceptFromParts(
  title: string,
  parts: ExtractedParts,
): string {
  let concept = `【動画タイトル】\n${title}\n\n`;

  concept += `【感情的フック】\n${parts.hook}\n\n`;
  concept += `【ターゲット感情】${parts.targetEmotion}\n\n`;

  concept += `【テキスト要素（サムネイルに載せるべき文言）】\n`;
  for (const t of parts.textElements) {
    concept += `- [${t.priority}] ${t.content}（${t.type}）: ${t.reasoning}\n`;
  }

  concept += `\n【ビジュアル要素（サムネイルに含めるべき視覚要素）】\n`;
  for (const v of parts.visualElements) {
    concept += `- [${v.priority}] ${v.description}（${v.type}）: ${v.reasoning}\n`;
  }

  concept += `\n【提案方向性】\n${parts.suggestedDirection}`;

  concept += `\n\n※日本人向けYouTubeサムネイル。テキストは日本語で短く（3〜5語）。大胆でシンプルに。`;

  return concept;
}
