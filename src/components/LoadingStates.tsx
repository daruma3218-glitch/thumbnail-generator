'use client';

interface GeneratingLoaderProps {
  message?: string;
}

export function GeneratingLoader({ message = 'サムネイルを生成中...' }: GeneratingLoaderProps) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          </div>
        </div>
        <p className="text-gray-300 font-medium">{message}</p>
        <p className="text-gray-500 text-sm mt-2">
          3枚のサムネイルを並列生成しています。30〜60秒ほどかかります。
        </p>

        {/* Skeleton thumbnails */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="aspect-video bg-gray-800 rounded-lg animate-pulse"
              style={{ animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function CopywritingLoader() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          </div>
        </div>
        <p className="text-gray-300 font-medium">キャッチコピーを設計中...</p>
        <p className="text-gray-500 text-sm mt-2">
          CTR最適化された日本語キャッチコピーを生成しています。
        </p>
      </div>
    </div>
  );
}

export function DesigningLoader() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-green-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
        <p className="text-gray-300 font-medium">クリエイティブ方向性を設計中...</p>
        <p className="text-gray-500 text-sm mt-2">
          3つの心理的に対立するアプローチを設計しています。Web検索も活用中です。
        </p>
      </div>
    </div>
  );
}

export function ExtractingLoader() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          </div>
        </div>
        <p className="text-gray-300 font-medium">パーツを抽出中...</p>
        <p className="text-gray-500 text-sm mt-2">
          タイトルと原稿を分析して、サムネイルの重要パーツを特定しています。
        </p>
      </div>
    </div>
  );
}

export function RecommendingTypeLoader() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          </div>
        </div>
        <p className="text-gray-300 font-medium">最適なサムネイル型を分析中...</p>
        <p className="text-gray-500 text-sm mt-2">
          原稿の内容に最適なサムネイルテンプレートを推薦しています。
        </p>
      </div>
    </div>
  );
}

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-red-950/50 border border-red-800 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-red-400 font-medium">エラーが発生しました</p>
          <p className="text-red-300/70 text-sm mt-1">{message}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-red-900 hover:bg-red-800 text-red-200 rounded-lg text-sm transition-colors"
          >
            リトライ
          </button>
        )}
      </div>
    </div>
  );
}
