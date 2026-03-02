import Anthropic from '@anthropic-ai/sdk';
import { AGENT_MODEL } from './claude';
import { ExtractedParts } from './types';

const EXTRACT_PARTS_PROMPT = `あなたはYouTubeサムネイルの専門分析者です。
動画のタイトルと原稿（台本）を分析し、効果的なサムネイルに必要な「パーツ」を抽出してください。

分析の観点:
1. 視聴者の注意を引くフック（感情的な核心）は何か
2. サムネイルに載せるべきテキスト要素（キャッチコピー、数字、パワーワード、疑問文、CTA）
3. サムネイルに含めるべきビジュアル要素（人物の表情、背景、配色、レイアウト、オブジェクト、アイコン）
4. ターゲット視聴者にどんな感情を喚起すべきか
5. テキスト要素はモバイルサイズ（168x94px）で読める短さか（最大3〜5語）
6. 数字や具体的データは視聴者の好奇心を刺激するか
7. 感情的インパクトの強いパワーワードはあるか

ルール:
- テキスト要素は3〜6個程度抽出する
- ビジュアル要素は3〜6個程度抽出する
- 各要素にpriority（high/medium/low）を付ける
- 原稿から具体的な数字やキーワードを拾う
- 抽象的ではなく、サムネイルに直接使える具体的な要素を出す
- テキスト要素のcontentは必ず5語以内に凝縮する（長いフレーズはサムネイルで読めない）
- 数字があれば必ず抽出する（数字はCTRに最も効果的な要素）
- 人物の表情指示は「驚き顔」ではなく「目を見開き口を大きく開けた驚愕の表情」のように具体的に書く
- ビジュアル要素のdescriptionは、画像生成AIが理解できる具体的な指示文にする

出力形式（このJSON形式で厳密に出力してください。JSON以外は出力しないでください）:
{
  "hook": "（この動画の感情的フック・注目ポイントを一文で）",
  "targetEmotion": "（視聴者に喚起したい感情を一言で）",
  "textElements": [
    {
      "id": "t1",
      "type": "catchphrase | number | power_word | question | cta",
      "content": "（サムネイルに載せるテキスト）",
      "reasoning": "（なぜこのテキストが効果的か）",
      "priority": "high | medium | low"
    }
  ],
  "visualElements": [
    {
      "id": "v1",
      "type": "person_expression | background | color_scheme | layout | object | icon",
      "description": "（ビジュアル要素の具体的な説明）",
      "reasoning": "（なぜこの要素が効果的か）",
      "priority": "high | medium | low"
    }
  ],
  "suggestedDirection": "（全体的なサムネイルの方向性を1〜2文で）"
}`;

export async function extractParts(
  title: string,
  script: string,
  anthropicKey: string,
): Promise<ExtractedParts> {
  const client = new Anthropic({ apiKey: anthropicKey });

  // Truncate script if too long (keep first 8000 chars)
  const truncatedScript = script.length > 8000
    ? script.slice(0, 8000) + '\n\n...（以降省略）'
    : script;

  const userMessage = `以下の動画タイトルと原稿を分析し、サムネイルに必要なパーツを抽出してください。

【動画タイトル】
${title}

【原稿・台本】
${truncatedScript}

JSONのみを出力してください。`;

  const response = await client.messages.create({
    model: AGENT_MODEL,
    max_tokens: 2048,
    system: EXTRACT_PARTS_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const textContent = response.content.find(c => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Claude did not return valid JSON');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    hook: parsed.hook || '',
    targetEmotion: parsed.targetEmotion || '',
    textElements: (parsed.textElements || []).map((t: Record<string, unknown>) => ({
      id: t.id as string,
      type: t.type as string,
      content: t.content as string,
      reasoning: t.reasoning as string,
      priority: t.priority as string,
    })),
    visualElements: (parsed.visualElements || []).map((v: Record<string, unknown>) => ({
      id: v.id as string,
      type: v.type as string,
      description: v.description as string,
      reasoning: v.reasoning as string,
      priority: v.priority as string,
    })),
    suggestedDirection: parsed.suggestedDirection || '',
  };
}
