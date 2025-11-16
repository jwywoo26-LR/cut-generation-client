'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type TabType = 'single' | 'multi' | 'zip';

export default function MosaicTesterPage() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<TabType>('single');

  // Single image state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedImageUrl, setProcessedImageUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Multi image state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isProcessingMulti, setIsProcessingMulti] = useState(false);
  const [processedImageUrls, setProcessedImageUrls] = useState<string[]>([]);
  const [multiError, setMultiError] = useState<string>('');

  // ZIP upload state
  const [selectedZipFile, setSelectedZipFile] = useState<File | null>(null);
  const [isProcessingZip, setIsProcessingZip] = useState(false);
  const [zipError, setZipError] = useState<string>('');
  const [zipProgress, setZipProgress] = useState<string>('');

  // Check if user is already authenticated
  useEffect(() => {
    const authStatus = sessionStorage.getItem('mosaicTesterAuth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError('');

    try {
      const response = await fetch('/api/auth/mosaic-tester', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        setIsAuthenticated(true);
        sessionStorage.setItem('mosaicTesterAuth', 'true');
        setPassword('');
      } else {
        const data = await response.json();
        setAuthError(data.error || 'Invalid password');
      }
    } catch (error) {
      setAuthError('Authentication failed. Please try again.');
      console.error('Auth error:', error);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('mosaicTesterAuth');
    setPassword('');
    setAuthError('');
  };

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
              Mosaic Tester
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              Please enter the password to access the mosaic tester
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                placeholder="Enter password"
                disabled={isAuthLoading}
              />
            </div>

            {authError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                <div className="text-red-800 dark:text-red-200 text-sm">
                  {authError}
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isAuthLoading || !password.trim()}
                className={`
                  group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500
                  ${isAuthLoading || !password.trim()
                    ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                  }
                `}
              >
                {isAuthLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Authenticating...
                  </div>
                ) : (
                  'Access Mosaic Tester'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Single Image Handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }

      setSelectedFile(file);
      setError('');
      setProcessedImageUrl('');

      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleProcess = async () => {
    if (!selectedFile) {
      setError('Please select an image first');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Convert image to base64
      const reader = new FileReader();
      const imageDataPromise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      const imageData = await imageDataPromise;

      // Call mosaic processing API
      const response = await fetch('/api/mosaic-process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: imageData,
          modelName: 'segnext_l_model_A_363_pair_1110_iter_80000'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process image');
      }

      const result = await response.json();
      console.log('API response:', result);

      if (result.success && result.resultUrl) {
        // Set the processed image URL (S3 URL from API)
        console.log('Setting processed image URL:', result.resultUrl);
        setProcessedImageUrl(result.resultUrl);
        console.log('Processing complete:', {
          taskId: result.taskId,
          maskRatio: result.maskRatio,
          resultUrl: result.resultUrl
        });
      } else {
        console.log('No result URL found. Result object:', result);
        throw new Error(result.error || 'No result URL returned');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
      console.error('Processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setProcessedImageUrl('');
    setError('');

    // Clean up object URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  };

  // Multi Image Handlers
  const handleMultiFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) return;

    // Validate all files are images
    const invalidFiles = files.filter(file => !file.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      setMultiError(`${invalidFiles.length} file(s) are not valid images`);
      return;
    }

    setSelectedFiles(files);
    setMultiError('');
    setProcessedImageUrls([]);

    // Create preview URLs
    const urls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);
  };

  const handleProcessMulti = async () => {
    if (selectedFiles.length === 0) {
      setMultiError('Please select images first');
      return;
    }

    setIsProcessingMulti(true);
    setMultiError('');
    setProcessedImageUrls([]); // Reset processed URLs

    try {
      // Process images one by one to show results progressively
      const processedUrls: string[] = [];
      let successCount = 0;
      let failedCount = 0;

      for (let index = 0; index < selectedFiles.length; index++) {
        const file = selectedFiles[index];
        console.log(`Processing image ${index + 1}/${selectedFiles.length}: ${file.name}`);

        try {
          // Convert file to base64
          const reader = new FileReader();
          const imageDataPromise = new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              const result = reader.result as string;
              resolve(result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          const imageData = await imageDataPromise;

          // Call single image processing API
          const response = await fetch('/api/mosaic-process', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              imageData: imageData,
              modelName: 'segnext_l_model_A_363_pair_1110_iter_80000'
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to process image');
          }

          const result = await response.json();

          if (result.success && result.resultUrl) {
            processedUrls.push(result.resultUrl);
            successCount++;
            console.log(`✅ Processed ${index + 1}/${selectedFiles.length}: ${file.name}`);
          } else {
            processedUrls.push(''); // Empty string for failed images
            failedCount++;
            console.error(`❌ Failed ${index + 1}/${selectedFiles.length}: ${file.name}`);
          }

          // Update UI with the current progress
          setProcessedImageUrls([...processedUrls]);

        } catch (err) {
          processedUrls.push(''); // Empty string for failed images
          failedCount++;
          console.error(`❌ Error processing ${file.name}:`, err);

          // Update UI even on error
          setProcessedImageUrls([...processedUrls]);
        }
      }

      console.log(`✅ Processing complete: ${successCount} succeeded, ${failedCount} failed`);
      if (failedCount > 0) {
        setMultiError(`Warning: ${failedCount} image(s) failed to process`);
      }

    } catch (err) {
      setMultiError(err instanceof Error ? err.message : 'Processing failed');
      console.error('Batch processing error:', err);
    } finally {
      setIsProcessingMulti(false);
    }
  };

  const handleResetMulti = () => {
    setSelectedFiles([]);
    setPreviewUrls([]);
    setProcessedImageUrls([]);
    setMultiError('');

    // Clean up object URLs
    previewUrls.forEach(url => URL.revokeObjectURL(url));
  };

  const removeImage = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newUrls = previewUrls.filter((_, i) => i !== index);

    // Clean up the removed URL
    URL.revokeObjectURL(previewUrls[index]);

    setSelectedFiles(newFiles);
    setPreviewUrls(newUrls);

    // Remove corresponding processed image if exists
    if (processedImageUrls.length > index) {
      setProcessedImageUrls(processedImageUrls.filter((_, i) => i !== index));
    }
  };

  // ZIP Upload Handlers
  const handleZipFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.zip')) {
        setZipError('Please select a valid ZIP file');
        return;
      }

      setSelectedZipFile(file);
      setZipError('');
      setZipProgress('');
    }
  };

  const handleZipProcess = async () => {
    if (!selectedZipFile) {
      setZipError('Please select a ZIP file first');
      return;
    }

    setIsProcessingZip(true);
    setZipError('');
    setZipProgress('Uploading ZIP file...');

    try {
      const formData = new FormData();
      formData.append('zipFile', selectedZipFile);
      formData.append('modelName', 'segnext_l_model_A_363_pair_1110_iter_80000');

      setZipProgress('Processing images (this may take several minutes)...');

      const response = await fetch('/api/batch-mosaic-zip', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'ZIP processing failed');
      }

      setZipProgress('Downloading result...');

      // Download the result ZIP file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mosaic_results_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setZipProgress('✅ Download complete! Check your downloads folder.');

    } catch (err) {
      setZipError(err instanceof Error ? err.message : 'ZIP processing failed');
      console.error('ZIP processing error:', err);
    } finally {
      setIsProcessingZip(false);
    }
  };

  const handleResetZip = () => {
    setSelectedZipFile(null);
    setZipError('');
    setZipProgress('');
  };

  const tabs = [
    { id: 'single' as TabType, label: 'Single Image' },
    { id: 'multi' as TabType, label: 'Multi Image' },
    { id: 'zip' as TabType, label: 'ZIP Batch' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <Link
                href="/main"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Mosaic Tester
              </h1>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Tab Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-8">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                    ${activeTab === tab.id
                      ? 'border-green-500 text-green-600 dark:text-green-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300'
                    }
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'single' ? (
              <SingleImageTester
                selectedFile={selectedFile}
                previewUrl={previewUrl}
                isProcessing={isProcessing}
                processedImageUrl={processedImageUrl}
                error={error}
                onFileSelect={handleFileSelect}
                onProcess={handleProcess}
                onReset={handleReset}
              />
            ) : activeTab === 'multi' ? (
              <MultiImageTester
                selectedFiles={selectedFiles}
                previewUrls={previewUrls}
                isProcessing={isProcessingMulti}
                processedImageUrls={processedImageUrls}
                error={multiError}
                onFileSelect={handleMultiFileSelect}
                onProcess={handleProcessMulti}
                onReset={handleResetMulti}
                onRemoveImage={removeImage}
              />
            ) : (
              <ZipBatchTester
                selectedZipFile={selectedZipFile}
                isProcessing={isProcessingZip}
                progress={zipProgress}
                error={zipError}
                onFileSelect={handleZipFileSelect}
                onProcess={handleZipProcess}
                onReset={handleResetZip}
              />
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-3">
            About Mosaic Tester
          </h3>
          <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <li>• <strong>Single Image Mode:</strong> Test individual images for mosaic detection and processing</li>
            <li>• <strong>Multi Image Mode:</strong> Batch process multiple images at once</li>
            <li>• <strong>ZIP Batch Mode:</strong> Upload a ZIP file with images → Get back a ZIP with inputs, outputs, and CSV tracking</li>
            <li>• Compare original and processed results side-by-side</li>
            <li>• Supports common image formats (JPEG, PNG, WebP)</li>
            <li>• Real-time processing feedback</li>
            <li>• Note: This is a testing interface - actual mosaic processing API to be implemented</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Single Image Tester Component
interface SingleImageTesterProps {
  selectedFile: File | null;
  previewUrl: string;
  isProcessing: boolean;
  processedImageUrl: string;
  error: string;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onProcess: () => void;
  onReset: () => void;
}

function SingleImageTester({
  selectedFile,
  previewUrl,
  isProcessing,
  processedImageUrl,
  error,
  onFileSelect,
  onProcess,
  onReset
}: SingleImageTesterProps) {
  const handleDownload = () => {
    if (!processedImageUrl) return;

    const link = document.createElement('a');
    link.href = processedImageUrl;
    link.download = selectedFile?.name.replace(/\.[^/.]+$/, '_processed.jpg') || 'processed_image.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Upload Test Image
        </h2>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label
              htmlFor="single-file-upload"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg cursor-pointer transition-colors"
            >
              Select Image
            </label>
            <input
              id="single-file-upload"
              type="file"
              accept="image/*"
              onChange={onFileSelect}
              className="hidden"
            />

            {selectedFile && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {selectedFile.name}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({(selectedFile.size / 1024).toFixed(2)} KB)
                </span>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="text-red-800 dark:text-red-200">
                <strong>Error:</strong> {error}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onProcess}
              disabled={!selectedFile || isProcessing}
              className={`
                px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2
                ${!selectedFile || isProcessing
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
                }
              `}
            >
              {isProcessing && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {isProcessing ? 'Processing...' : 'Process Image'}
            </button>

            <button
              onClick={onReset}
              disabled={!selectedFile}
              className={`
                px-6 py-3 rounded-lg font-medium transition-colors
                ${!selectedFile
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-gray-600 hover:bg-gray-700 text-white'
                }
              `}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Two Column Layout for Images */}
      {previewUrl && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Uploaded Image */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
              Uploaded Image
            </h3>
            <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
              <img
                src={previewUrl}
                alt="Original"
                className="w-full h-auto"
              />
            </div>
            <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
              Original • {selectedFile?.name}
            </div>
          </div>

          {/* Mosaic Result */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Mosaic Result
              </h3>
              {processedImageUrl && (
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
              )}
            </div>

            {processedImageUrl ? (
              <>
                <div className="border-2 border-green-500 dark:border-green-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
                  <img
                    src={processedImageUrl}
                    alt="Processed"
                    className="w-full h-auto"
                  />
                </div>
                <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    Processing complete
                  </p>
                </div>
              </>
            ) : (
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg h-64 flex items-center justify-center bg-white dark:bg-gray-800">
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">Processed image will appear here</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Multi Image Tester Component
interface MultiImageTesterProps {
  selectedFiles: File[];
  previewUrls: string[];
  isProcessing: boolean;
  processedImageUrls: string[];
  error: string;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onProcess: () => void;
  onReset: () => void;
  onRemoveImage: (index: number) => void;
}

function MultiImageTester({
  selectedFiles,
  previewUrls,
  isProcessing,
  processedImageUrls,
  error,
  onFileSelect,
  onProcess,
  onReset,
  onRemoveImage
}: MultiImageTesterProps) {
  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Upload Multiple Test Images
        </h2>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label
              htmlFor="multi-file-upload"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg cursor-pointer transition-colors"
            >
              Select Images
            </label>
            <input
              id="multi-file-upload"
              type="file"
              accept="image/*"
              multiple
              onChange={onFileSelect}
              className="hidden"
            />

            {selectedFiles.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {selectedFiles.length} image{selectedFiles.length > 1 ? 's' : ''} selected
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({(selectedFiles.reduce((sum, file) => sum + file.size, 0) / 1024).toFixed(2)} KB total)
                </span>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="text-red-800 dark:text-red-200">
                <strong>Error:</strong> {error}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onProcess}
              disabled={selectedFiles.length === 0 || isProcessing}
              className={`
                px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2
                ${selectedFiles.length === 0 || isProcessing
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
                }
              `}
            >
              {isProcessing && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {isProcessing ? 'Processing...' : `Process ${selectedFiles.length} Image${selectedFiles.length > 1 ? 's' : ''}`}
            </button>

            <button
              onClick={onReset}
              disabled={selectedFiles.length === 0}
              className={`
                px-6 py-3 rounded-lg font-medium transition-colors
                ${selectedFiles.length === 0
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-gray-600 hover:bg-gray-700 text-white'
                }
              `}
            >
              Reset All
            </button>
          </div>
        </div>
      </div>

      {/* Image Grid */}
      {previewUrls.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Images ({previewUrls.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {previewUrls.map((url, index) => (
              <div key={index} className="relative">
                <div className="space-y-2">
                  {/* Original Image */}
                  <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700 p-2">
                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Original</div>
                    <img
                      src={url}
                      alt={`Original ${index + 1}`}
                      className="w-full h-40 object-cover rounded"
                    />
                  </div>

                  {/* Processed Image */}
                  {processedImageUrls[index] ? (
                    <div className="border-2 border-green-500 dark:border-green-600 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700 p-2">
                      <div className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">Processed ✓</div>
                      <img
                        src={processedImageUrls[index]}
                        alt={`Processed ${index + 1}`}
                        className="w-full h-40 object-cover rounded"
                      />
                    </div>
                  ) : isProcessing ? (
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg h-40 flex items-center justify-center bg-gray-50 dark:bg-gray-700">
                      <div className="text-center text-gray-500 dark:text-gray-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p className="text-xs">Processing...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg h-40 flex items-center justify-center bg-gray-50 dark:bg-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
                    </div>
                  )}

                  {/* Remove button */}
                  <button
                    onClick={() => onRemoveImage(index)}
                    disabled={isProcessing}
                    className={`absolute top-2 right-2 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full transition-opacity ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title="Remove image"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  {/* Image info */}
                  <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    {selectedFiles[index]?.name}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {processedImageUrls.length > 0 && (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200">
                ✅ Processing complete for {processedImageUrls.length} image{processedImageUrls.length > 1 ? 's' : ''}!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ZIP Batch Tester Component
function ZipBatchTester({
  selectedZipFile,
  isProcessing,
  progress,
  error,
  onFileSelect,
  onProcess,
  onReset,
}: {
  selectedZipFile: File | null;
  isProcessing: boolean;
  progress: string;
  error: string;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onProcess: () => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Upload ZIP File
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select ZIP file containing images
            </label>
            <input
              type="file"
              accept=".zip"
              onChange={onFileSelect}
              disabled={isProcessing}
              className="block w-full text-sm text-gray-900 dark:text-gray-100
                       border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer
                       bg-gray-50 dark:bg-gray-700
                       focus:outline-none focus:ring-2 focus:ring-green-500
                       disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              ZIP file should contain images in any folder structure. The structure will be preserved in the output.
            </p>
          </div>

          {selectedZipFile && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                📦 Selected: <span className="font-medium">{selectedZipFile.name}</span>
                <span className="text-xs ml-2">
                  ({(selectedZipFile.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {progress && !error && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200">{progress}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={onProcess}
              disabled={!selectedZipFile || isProcessing}
              className={`
                flex-1 px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2
                ${!selectedZipFile || isProcessing
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
                }
              `}
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                'Process ZIP'
              )}
            </button>

            <button
              onClick={onReset}
              disabled={!selectedZipFile || isProcessing}
              className={`
                px-6 py-3 rounded-lg font-medium transition-colors
                ${!selectedZipFile || isProcessing
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-gray-600 hover:bg-gray-700 text-white'
                }
              `}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-200 mb-3">
          📋 How it works
        </h3>
        <ol className="space-y-2 text-sm text-yellow-800 dark:text-yellow-200 list-decimal list-inside">
          <li>Upload a ZIP file containing images (any folder structure)</li>
          <li>The system will process all images through mosaic detection</li>
          <li>Download the result ZIP containing:
            <ul className="ml-6 mt-1 space-y-1 list-disc list-inside">
              <li><code className="bg-yellow-100 dark:bg-yellow-900/40 px-1 rounded">inputs/</code> - Original images (structure preserved)</li>
              <li><code className="bg-yellow-100 dark:bg-yellow-900/40 px-1 rounded">outputs/</code> - Processed images (structure preserved)</li>
              <li><code className="bg-yellow-100 dark:bg-yellow-900/40 px-1 rounded">results.csv</code> - Processing metadata and tracking</li>
            </ul>
          </li>
          <li>Processing may take several minutes depending on the number of images</li>
        </ol>
      </div>
    </div>
  );
}
