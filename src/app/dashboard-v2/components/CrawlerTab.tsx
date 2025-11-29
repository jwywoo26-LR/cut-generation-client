'use client';

import type { CrawlerMode } from '../types';

interface CrawlerTabProps {
  // Crawler state
  crawlerUrl: string;
  crawlerMode: CrawlerMode;
  crawlerPages: number;
  crawlerCategory: string;
  isCrawling: boolean;
  crawlerError: string;
  crawlerResult: {
    csvFile: string;
    csvContent: string;
    recordCount: number;
    mode: string;
    pages: number;
  } | null;

  // Handlers
  onCrawlerUrlChange: (url: string) => void;
  onCrawlerModeChange: (mode: CrawlerMode) => void;
  onCrawlerPagesChange: (pages: number) => void;
  onCrawlerCategoryChange: (category: string) => void;
  onStartCrawl: () => void;
  onDownloadCSV: () => void;
}

export function CrawlerTab({
  crawlerUrl,
  crawlerMode,
  crawlerPages,
  crawlerCategory,
  isCrawling,
  crawlerError,
  crawlerResult,
  onCrawlerUrlChange,
  onCrawlerModeChange,
  onCrawlerPagesChange,
  onCrawlerCategoryChange,
  onStartCrawl,
  onDownloadCSV,
}: CrawlerTabProps) {
  return (
    <div className="space-y-6">
      {/* Crawler Configuration */}
      <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          DMM Crawler Configuration
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Crawl DMM product pages and extract data. Choose mode for different levels of detail.
        </p>

        {/* URL Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Target URL <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={crawlerUrl}
            onChange={(e) => onCrawlerUrlChange(e.target.value)}
            placeholder="https://www.dmm.co.jp/dc/doujin/-/list/..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm placeholder-gray-400"
            disabled={isCrawling}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Enter the DMM product list page URL you want to crawl
          </p>
        </div>

        {/* Mode Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Crawl Mode <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onCrawlerModeChange('base')}
              disabled={isCrawling}
              className={`px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                crawlerMode === 'base'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="font-semibold mb-1">Base</div>
              <div className="text-xs opacity-80">List page only</div>
            </button>
            <button
              onClick={() => onCrawlerModeChange('detail')}
              disabled={isCrawling}
              className={`px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                crawlerMode === 'detail'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="font-semibold mb-1">Detail</div>
              <div className="text-xs opacity-80">+ Product pages</div>
            </button>
            <button
              onClick={() => onCrawlerModeChange('extra')}
              disabled={isCrawling}
              className={`px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                crawlerMode === 'extra'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="font-semibold mb-1">Extra</div>
              <div className="text-xs opacity-80">+ Reviews</div>
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            <p><strong>Base:</strong> Fast - extracts basic info from list page only</p>
            <p><strong>Detail:</strong> Medium - visits each product page for detailed info</p>
            <p><strong>Extra:</strong> Slow - also extracts commentary and reviews</p>
          </div>
        </div>

        {/* Pages Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Pages to Crawl
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={crawlerPages}
            onChange={(e) => onCrawlerPagesChange(parseInt(e.target.value) || 1)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            disabled={isCrawling}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Number of pages to crawl (typically 20-50 products per page)
          </p>
        </div>

        {/* Category Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Category Name (optional)
          </label>
          <input
            type="text"
            value={crawlerCategory}
            onChange={(e) => onCrawlerCategoryChange(e.target.value)}
            placeholder="e.g., ai_manga, fantasy, cyberpunk..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm placeholder-gray-400"
            disabled={isCrawling}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Used for CSV filename and categorization
          </p>
        </div>

        {/* Error Message */}
        {crawlerError && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-sm">
            {crawlerError}
          </div>
        )}

        {/* Start Crawl Button */}
        <button
          onClick={onStartCrawl}
          disabled={isCrawling || !crawlerUrl}
          className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCrawling ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Crawling... This may take several minutes
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Start Crawling
            </>
          )}
        </button>
      </div>

      {/* Crawler Results */}
      {crawlerResult && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Crawl Complete!
          </h3>

          <div className="space-y-3">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Records Found</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{crawlerResult.recordCount}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Mode</div>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 capitalize">{crawlerResult.mode}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Pages Crawled</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{crawlerResult.pages}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">CSV File</div>
                <div className="text-sm font-mono text-gray-900 dark:text-white truncate">{crawlerResult.csvFile}</div>
              </div>
            </div>

            {/* Download Button */}
            <button
              onClick={onDownloadCSV}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download CSV File
            </button>

            {/* CSV Preview */}
            <div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                CSV Preview (first 10 lines):
              </div>
              <pre className="p-3 bg-gray-900 text-green-400 rounded text-xs overflow-x-auto max-h-96 overflow-y-auto font-mono">
                {crawlerResult.csvContent.split('\n').slice(0, 10).join('\n')}
                {crawlerResult.csvContent.split('\n').length > 10 && '\n... (see full CSV in download)'}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            <p className="font-medium mb-1">Tips:</p>
            <p>• Base mode is fastest - use for quick data collection</p>
            <p>• Detail mode provides comprehensive product information</p>
            <p>• Extra mode includes reviews - best for market research</p>
            <p>• Larger page counts will take significantly longer</p>
            <p>• The crawler respects rate limits to avoid blocking</p>
          </div>
        </div>
      </div>
    </div>
  );
}
