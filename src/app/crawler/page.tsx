'use client';

import { useState, useEffect } from 'react';

type CrawlerMode = 'base' | 'detail' | 'extra';

export default function CrawlerPage() {
  // Environment detection
  const [isProduction, setIsProduction] = useState(false);

  useEffect(() => {
    // Check if we're in production (Vercel deployment)
    const isProd = process.env.NODE_ENV === 'production' &&
                   typeof window !== 'undefined' &&
                   !window.location.hostname.includes('localhost');
    setIsProduction(isProd);
  }, []);

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Check for saved authentication on mount
  useEffect(() => {
    const savedAuth = localStorage.getItem('crawler_authenticated');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Crawler state
  const [crawlerUrl, setCrawlerUrl] = useState<string>('');
  const [crawlerMode, setCrawlerMode] = useState<CrawlerMode>('base');
  const [crawlerPages, setCrawlerPages] = useState<number>(1);
  const [crawlerCategory, setCrawlerCategory] = useState<string>('');
  const [miroUploadCircle, setMiroUploadCircle] = useState<boolean>(false);
  const [miroUploadRanks, setMiroUploadRanks] = useState<boolean>(false);
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlerError, setCrawlerError] = useState<string>('');

  // Japan IP check state
  const [isCheckingJapan, setIsCheckingJapan] = useState(false);
  const [japanCheckResult, setJapanCheckResult] = useState<{
    isJapan: boolean;
    country: string;
    ip: string;
  } | null>(null);

  const [crawlerResult, setCrawlerResult] = useState<{
    csvFile: string;
    csvContent: string;
    recordCount: number;
    mode: string;
    pages: number;
    miroCircleUploaded?: boolean;
    miroRanksUploaded?: boolean;
  } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (password === process.env.NEXT_PUBLIC_CRAWLER_PASSWORD || password === 'woo0612') {
      setIsAuthenticated(true);
      localStorage.setItem('crawler_authenticated', 'true');
    } else {
      setAuthError('Invalid password');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('crawler_authenticated');
    setPassword('');
  };

  const handleCheckJapanIP = async () => {
    setIsCheckingJapan(true);
    setJapanCheckResult(null);

    try {
      // Use ip-api.com (free, no API key needed)
      const response = await fetch('http://ip-api.com/json/?fields=status,country,countryCode,query');
      const data = await response.json();

      if (data.status === 'success') {
        setJapanCheckResult({
          isJapan: data.countryCode === 'JP',
          country: data.country,
          ip: data.query,
        });
      } else {
        throw new Error('Failed to check IP location');
      }
    } catch (error) {
      console.error('IP check failed:', error);
      // Fallback to ipapi.co
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        setJapanCheckResult({
          isJapan: data.country_code === 'JP',
          country: data.country_name,
          ip: data.ip,
        });
      } catch {
        setCrawlerError('Failed to check IP location. Please check your internet connection.');
      }
    } finally {
      setIsCheckingJapan(false);
    }
  };

  const handleStartCrawl = async () => {
    if (!crawlerUrl) {
      setCrawlerError('Please enter a URL to crawl');
      return;
    }

    const confirmMessage = `Start crawling in ${crawlerMode.toUpperCase()} mode?\n\nURL: ${crawlerUrl}\nPages: ${crawlerPages}\n\nThis may take several minutes depending on mode and page count.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsCrawling(true);
    setCrawlerError('');
    setCrawlerResult(null);

    try {
      const response = await fetch('/api/crawler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: crawlerUrl,
          mode: crawlerMode,
          pages: crawlerPages,
          categoryName: crawlerCategory || 'default',
          miroUploadCircle: miroUploadCircle,
          miroUploadRanks: miroUploadRanks,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to crawl');
      }

      setCrawlerResult({
        csvFile: data.csvFile,
        csvContent: data.csvContent,
        recordCount: data.recordCount,
        mode: data.mode,
        pages: data.pages,
        miroCircleUploaded: data.miroCircleUploaded,
        miroRanksUploaded: data.miroRanksUploaded,
      });

      const miroMessages = [];
      if (data.miroCircleUploaded) miroMessages.push('✓ Uploaded to CIRCLE board');
      if (data.miroRanksUploaded) miroMessages.push('✓ Uploaded to RANKS board');
      const miroMessage = miroMessages.length > 0 ? '\n\n' + miroMessages.join('\n') : '';
      alert(`Crawling complete!\n\nFound ${data.recordCount} products in ${data.mode} mode${miroMessage}`);

    } catch (error) {
      console.error('Failed to crawl:', error);
      setCrawlerError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsCrawling(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!crawlerResult) return;

    const blob = new Blob([crawlerResult.csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', crawlerResult.csvFile);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Show production notice if deployed to Vercel
  if (isProduction) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                DMM Crawler
              </h1>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full mb-6">
                <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-2">
                Crawler Available on Local Server
              </h2>
              <p className="text-purple-700 dark:text-purple-300 mb-4">
                The DMM crawler requires Python and Selenium, which are not available in this cloud deployment.
                Please access the crawler from our local server:
              </p>
              <a
                href="vnc://192.168.0.2/crawler"
                className="inline-flex items-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open Local Crawler Server
              </a>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p className="font-medium text-gray-900 dark:text-white mb-3">Local Server Details:</p>
              <div className="bg-gray-100 dark:bg-gray-700 rounded p-3 font-mono text-xs">
                <p><span className="text-gray-500 dark:text-gray-400">Address:</span> vnc://192.168.0.2/crawler</p>
                <p><span className="text-gray-500 dark:text-gray-400">Network:</span> Local network access required</p>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-4">
                Note: You must be connected to the same network as the local server to access this feature.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                DMM Crawler
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Enter password to access
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter password"
                  autoFocus
                />
              </div>

              {authError && (
                <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-sm">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium transition-colors"
              >
                Login
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-4">
              {/* Go Back Button */}
              <a
                href="/main"
                className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </a>

              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  DMM Crawler
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Crawl DMM product pages and extract data to CSV
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md border border-red-300 dark:border-red-700"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Example Images Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="relative aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
              <img
                src="/data/crawler_ex/detail.png"
                alt="Detail Mode Example"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                <p className="text-white text-sm font-medium">Detail Mode</p>
              </div>
            </div>
            <div className="relative aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
              <img
                src="/data/crawler_ex/circle_uploads.png"
                alt="Circle Uploads Example"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                <p className="text-white text-sm font-medium">Circle Info</p>
              </div>
            </div>
            <div className="relative aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
              <img
                src="/data/crawler_ex/base.png"
                alt="Base Mode Example"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                <p className="text-white text-sm font-medium">Base Mode</p>
              </div>
            </div>
            <div className="relative aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
              <img
                src="/data/crawler_ex/ranks_upload.png"
                alt="Rankings Example"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                <p className="text-white text-sm font-medium">Rankings</p>
              </div>
            </div>
          </div>

          {/* Crawler Configuration */}
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Configuration
            </h3>

            {/* Japan IP Check */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🇯🇵</span>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Japan IP Check</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      DMM requires Japan IP. Check before crawling.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCheckJapanIP}
                  disabled={isCheckingJapan}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isCheckingJapan ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Checking...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                      Check IP Location
                    </>
                  )}
                </button>
              </div>

              {japanCheckResult && (
                <div className={`mt-4 p-3 rounded-lg flex items-center gap-3 ${
                  japanCheckResult.isJapan
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                }`}>
                  {japanCheckResult.isJapan ? (
                    <>
                      <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="font-medium">✓ Connected from Japan</p>
                        <p className="text-xs opacity-75">IP: {japanCheckResult.ip} • Ready to crawl DMM</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <p className="font-medium">✗ Not connected from Japan</p>
                        <p className="text-xs opacity-75">Current: {japanCheckResult.country} ({japanCheckResult.ip}) • Use VPN to connect to Japan</p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* URL Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target URL <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={crawlerUrl}
                onChange={(e) => setCrawlerUrl(e.target.value)}
                placeholder="https://www.dmm.co.jp/dc/doujin/-/list/..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setCrawlerMode('base')}
                  disabled={isCrawling}
                  className={`px-4 py-4 rounded-lg text-sm font-medium transition-colors ${
                    crawlerMode === 'base'
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="font-bold mb-1">Base</div>
                  <div className="text-xs opacity-80">List page only</div>
                  <div className="text-xs opacity-60 mt-1">⚡ Fastest</div>
                </button>
                <button
                  onClick={() => setCrawlerMode('detail')}
                  disabled={isCrawling}
                  className={`px-4 py-4 rounded-lg text-sm font-medium transition-colors ${
                    crawlerMode === 'detail'
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="font-bold mb-1">Detail</div>
                  <div className="text-xs opacity-80">+ Product pages</div>
                  <div className="text-xs opacity-60 mt-1">🔍 Medium</div>
                </button>
                <button
                  onClick={() => setCrawlerMode('extra')}
                  disabled={isCrawling}
                  className={`px-4 py-4 rounded-lg text-sm font-medium transition-colors ${
                    crawlerMode === 'extra'
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="font-bold mb-1">Extra</div>
                  <div className="text-xs opacity-80">+ Reviews</div>
                  <div className="text-xs opacity-60 mt-1">🐢 Slowest</div>
                </button>
              </div>
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded text-xs text-gray-600 dark:text-gray-400">
                <p><strong>Base:</strong> Extracts basic info from list page only (fastest)</p>
                <p><strong>Detail:</strong> Visits each product page for detailed information</p>
                <p><strong>Extra:</strong> Also extracts commentary and reviews (slowest)</p>
              </div>
            </div>

            {/* Pages and Category */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pages to Crawl
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={crawlerPages}
                  onChange={(e) => setCrawlerPages(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={isCrawling}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  20-50 products per page
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category Name
                </label>
                <input
                  type="text"
                  value={crawlerCategory}
                  onChange={(e) => setCrawlerCategory(e.target.value)}
                  placeholder="e.g., ai_manga, fantasy..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={isCrawling}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Optional - for CSV filename
                </p>
              </div>
            </div>

            {/* Miro Upload Toggles */}
            <div className="mb-4 space-y-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                Miro Board Upload Options
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <input
                  type="checkbox"
                  checked={miroUploadCircle}
                  onChange={(e) => setMiroUploadCircle(e.target.checked)}
                  disabled={isCrawling}
                  className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Upload to CIRCLE Board
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Groups products by circle/publisher in clustered layout
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <input
                  type="checkbox"
                  checked={miroUploadRanks}
                  onChange={(e) => setMiroUploadRanks(e.target.checked)}
                  disabled={isCrawling}
                  className="w-5 h-5 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Upload to RANKS Board
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Displays products in 20×6 ranked grid layout
                  </p>
                </div>
              </label>
            </div>

            {/* Error Message */}
            {crawlerError && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded">
                {crawlerError}
              </div>
            )}

            {/* Start Button */}
            <button
              onClick={handleStartCrawl}
              disabled={isCrawling || !crawlerUrl}
              className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCrawling ? (
                <>
                  <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Crawling... This may take several minutes
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Start Crawling
                </>
              )}
            </button>
          </div>

          {/* Results */}
          {crawlerResult && (
            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-green-600 dark:text-green-400">
                  ✓ Crawl Complete!
                </h3>
                <div className="flex gap-2">
                  {crawlerResult.miroCircleUploaded && (
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      CIRCLE Board
                    </span>
                  )}
                  {crawlerResult.miroRanksUploaded && (
                    <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      RANKS Board
                    </span>
                  )}
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg">
                  <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">Records Found</div>
                  <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">{crawlerResult.recordCount}</div>
                </div>
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg">
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Mode</div>
                  <div className="text-3xl font-bold text-blue-900 dark:text-blue-100 capitalize">{crawlerResult.mode}</div>
                </div>
                <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg">
                  <div className="text-xs text-green-600 dark:text-green-400 font-medium">Pages Crawled</div>
                  <div className="text-3xl font-bold text-green-900 dark:text-green-100">{crawlerResult.pages}</div>
                </div>
                <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-lg">
                  <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">CSV File</div>
                  <div className="text-sm font-mono text-gray-900 dark:text-white truncate">{crawlerResult.csvFile}</div>
                </div>
              </div>

              {/* Download Button */}
              <button
                onClick={handleDownloadCSV}
                className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-lg flex items-center justify-center gap-3 mb-6 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download CSV File
              </button>

              {/* CSV Preview */}
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  CSV Preview (first 10 lines):
                </div>
                <pre className="p-4 bg-gray-900 text-green-400 rounded-lg text-xs overflow-x-auto max-h-96 overflow-y-auto font-mono">
                  {crawlerResult.csvContent.split('\n').slice(0, 10).join('\n')}
                  {crawlerResult.csvContent.split('\n').length > 10 && '\n... (see full CSV in download)'}
                </pre>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <p className="font-semibold mb-2">Tips:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Base mode is fastest - use for quick data collection</li>
                  <li>Detail mode provides comprehensive product information</li>
                  <li>Extra mode includes reviews - best for market research</li>
                  <li>Larger page counts will take significantly longer</li>
                  <li>The crawler respects rate limits to avoid blocking</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
