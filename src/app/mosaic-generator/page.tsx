'use client';

import { useState, useEffect } from 'react';
import { SingleImageTester } from './components/SingleImageTester';
import { MultiImageTester } from './components/MultiImageTester';
import { ZipBatchTester } from './components/ZipBatchTester';
import { ExamplesSection } from './components/ExamplesSection';
import { ImageModal } from './components/ImageModal';

type TabType = 'single' | 'multi' | 'zip';

export default function MosaicGeneratorPage() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Tab state
  const [selectedTab, setSelectedTab] = useState<TabType>('single');

  // Single image state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedImageUrl, setProcessedImageUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Multi-image state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [processedImageUrls, setProcessedImageUrls] = useState<string[]>([]);
  const [multiError, setMultiError] = useState<string>('');

  // ZIP upload state
  const [selectedZipFile, setSelectedZipFile] = useState<File | null>(null);
  const [isProcessingZip, setIsProcessingZip] = useState(false);
  const [zipError, setZipError] = useState<string>('');
  const [zipProgress, setZipProgress] = useState<string>('');

  // Model selection
  const [modelName, setModelName] = useState<string>(process.env.NEXT_PUBLIC_MOSAIC_MODEL_NAME || 'segnext_l_model_A_363_pair_1110_iter_80000');
  const [maskType, setMaskType] = useState<string>('white_mask');

  // Modal state for viewing images
  const [modalImageUrl, setModalImageUrl] = useState<string>('');
  const [modalImageTitle, setModalImageTitle] = useState<string>('');

  // Check if user is already authenticated
  useEffect(() => {
    const authStatus = sessionStorage.getItem('mosaicGeneratorAuth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError('');

    try {
      const response = await fetch('/api/auth/mosaic-generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        setIsAuthenticated(true);
        sessionStorage.setItem('mosaicGeneratorAuth', 'true');
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
    sessionStorage.removeItem('mosaicGeneratorAuth');
    setPassword('');
    setAuthError('');
  };

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
              Mosaic Generator
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              Please sign in to access the mosaic generator
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
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
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
                  'Sign In'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Single Image Handlers
  const processImage = async (file: File) => {
    setIsProcessing(true);
    setError('');

    try {
      // Convert image to base64
      const reader = new FileReader();
      const imageDataPromise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
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
          modelName: modelName,
          maskType: maskType
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '이미지 처리에 실패했습니다');
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
      setError(err instanceof Error ? err.message : '처리 실패');
      console.error('Processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('올바른 이미지 파일을 선택해주세요');
        return;
      }

      // Clean up old preview URL if exists
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setSelectedFile(file);
      setError('');
      setProcessedImageUrl('');

      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      // Automatically trigger processing
      await processImage(file);
    }
  };

  // Modal Handlers
  const openModal = (imageUrl: string, title: string) => {
    setModalImageUrl(imageUrl);
    setModalImageTitle(title);
  };

  const closeModal = () => {
    setModalImageUrl('');
    setModalImageTitle('');
  };

  // Handle example image click
  const handleExampleClick = async (imageUrl: string, imageName: string) => {
    try {
      // Fetch the image from the public folder
      const response = await fetch(imageUrl);
      const blob = await response.blob();

      // Convert blob to File object
      const file = new File([blob], imageName, { type: blob.type });

      // Clean up old preview URL if exists
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      // Set the file and preview
      setSelectedFile(file);
      setError('');
      setProcessedImageUrl('');

      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      // Automatically trigger processing
      await processImage(file);
    } catch (err) {
      setError('예제 이미지 로드에 실패했습니다');
      console.error('Example load error:', err);
    }
  };

  // Multi-Image Handlers
  const handleMultiFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate all files are images
    const invalidFiles = files.filter(file => !file.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      setMultiError('올바른 이미지 파일만 선택해주세요');
      return;
    }

    // Clean up old preview URLs
    previewUrls.forEach(url => URL.revokeObjectURL(url));

    setSelectedFiles(files);
    setMultiError('');
    setProcessedImageUrls([]);

    // Create preview URLs
    const urls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);

    if (files.length === 0) return;

    // Validate all files are images
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setMultiError('올바른 이미지 파일을 드롭해주세요');
      return;
    }

    // Clean up old preview URLs
    previewUrls.forEach(url => URL.revokeObjectURL(url));

    setSelectedFiles(imageFiles);
    setMultiError('');
    setProcessedImageUrls([]);

    // Create preview URLs
    const urls = imageFiles.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);
  };

  const handleProcessMulti = async () => {
    if (selectedFiles.length === 0) {
      setMultiError('이미지를 먼저 선택해주세요');
      return;
    }

    setIsProcessing(true);
    setMultiError('');
    const results: string[] = [];

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];

        // Convert to base64
        const reader = new FileReader();
        const imageDataPromise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const imageData = await imageDataPromise;

        // Call API
        const response = await fetch('/api/mosaic-process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageData: imageData,
            modelName: modelName,
            maskType: maskType
          }),
        });

        if (!response.ok) {
          throw new Error(`이미지 ${i + 1} 처리 실패`);
        }

        const result = await response.json();
        if (result.success && result.resultUrl) {
          results.push(result.resultUrl);
        } else {
          throw new Error(`이미지 ${i + 1} 결과 없음`);
        }
      }

      setProcessedImageUrls(results);
    } catch (err) {
      setMultiError(err instanceof Error ? err.message : '처리 실패');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetMulti = () => {
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setSelectedFiles([]);
    setPreviewUrls([]);
    setProcessedImageUrls([]);
    setMultiError('');
  };

  const removeImage = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newUrls = previewUrls.filter((_, i) => i !== index);

    // Revoke the removed URL
    URL.revokeObjectURL(previewUrls[index]);

    setSelectedFiles(newFiles);
    setPreviewUrls(newUrls);

    // Also remove processed image if exists
    if (processedImageUrls[index]) {
      const newProcessed = processedImageUrls.filter((_, i) => i !== index);
      setProcessedImageUrls(newProcessed);
    }
  };

  // ZIP Batch Handlers
  const handleZipFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/zip') {
      setSelectedZipFile(file);
      setZipError('');
    } else {
      setZipError('ZIP 파일만 업로드 가능합니다');
    }
  };

  const handleProcessZip = async () => {
    if (!selectedZipFile) {
      setZipError('ZIP 파일을 먼저 선택해주세요');
      return;
    }

    setIsProcessingZip(true);
    setZipError('');
    setZipProgress('ZIP 파일 처리 중...');

    try {
      // Convert ZIP to base64
      const reader = new FileReader();
      const zipDataPromise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(selectedZipFile);
      });

      const zipData = await zipDataPromise;

      // Call API
      const response = await fetch('/api/mosaic-process-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zipData: zipData,
          modelName: modelName,
          maskType: maskType
        }),
      });

      if (!response.ok) {
        throw new Error('ZIP 처리 실패');
      }

      const result = await response.json();
      if (result.success && result.downloadUrl) {
        setZipProgress('완료! 다운로드 시작...');
        // Trigger download
        window.location.href = result.downloadUrl;
      } else {
        throw new Error(result.error || 'ZIP 처리 결과 없음');
      }
    } catch (err) {
      setZipError(err instanceof Error ? err.message : 'ZIP 처리 실패');
    } finally {
      setIsProcessingZip(false);
    }
  };

  const handleResetZip = () => {
    setSelectedZipFile(null);
    setZipError('');
    setZipProgress('');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Mosaic Generator
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Model and Type Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-6 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Processing Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Model Name Input */}
            <div>
              <label htmlFor="model-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Model Name
              </label>
              <input
                id="model-input"
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Enter model name"
              />
            </div>

            {/* Mask Type Selection */}
            <div>
              <label htmlFor="type-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Mask Type
              </label>
              <select
                id="type-select"
                value={maskType}
                onChange={(e) => setMaskType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="white_mask">Gaussian Blur</option>
                <option value="mosaic">Pixel</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-8">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              <button
                onClick={() => setSelectedTab('single')}
                className={`
                  py-4 px-6 text-sm font-medium border-b-2 transition-colors
                  ${selectedTab === 'single'
                    ? 'border-green-500 text-green-600 dark:text-green-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
              >
                Single Image
              </button>
              <button
                onClick={() => setSelectedTab('multi')}
                className={`
                  py-4 px-6 text-sm font-medium border-b-2 transition-colors
                  ${selectedTab === 'multi'
                    ? 'border-green-500 text-green-600 dark:text-green-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
              >
                Multi Image
              </button>
              <button
                onClick={() => setSelectedTab('zip')}
                className={`
                  py-4 px-6 text-sm font-medium border-b-2 transition-colors
                  ${selectedTab === 'zip'
                    ? 'border-green-500 text-green-600 dark:text-green-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
              >
                ZIP Batch
              </button>
            </nav>
          </div>

          <div className="p-6">
            {selectedTab === 'single' && (
              <SingleImageTester
                selectedFile={selectedFile}
                previewUrl={previewUrl}
                isProcessing={isProcessing}
                processedImageUrl={processedImageUrl}
                error={error}
                onFileSelect={handleFileSelect}
                onOpenModal={openModal}
              />
            )}

            {selectedTab === 'multi' && (
              <MultiImageTester
                selectedFiles={selectedFiles}
                previewUrls={previewUrls}
                isProcessing={isProcessing}
                processedImageUrls={processedImageUrls}
                error={multiError}
                onFileSelect={handleMultiFileSelect}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onProcess={handleProcessMulti}
                onReset={handleResetMulti}
                onRemoveImage={removeImage}
                onOpenModal={openModal}
              />
            )}

            {selectedTab === 'zip' && (
              <ZipBatchTester
                selectedZipFile={selectedZipFile}
                isProcessing={isProcessingZip}
                progress={zipProgress}
                error={zipError}
                onFileSelect={handleZipFileSelect}
                onProcess={handleProcessZip}
                onReset={handleResetZip}
              />
            )}
          </div>
        </div>

        {/* Examples Section - Only show for single image tab */}
        {selectedTab === 'single' && (
          <ExamplesSection onExampleClick={handleExampleClick} />
        )}
      </div>

      {/* Image Modal */}
      <ImageModal
        imageUrl={modalImageUrl}
        title={modalImageTitle}
        onClose={closeModal}
      />
    </div>
  );
}

