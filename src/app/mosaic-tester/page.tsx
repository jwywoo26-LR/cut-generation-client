'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SingleImageTester } from './components/SingleImageTester';
import { ExamplesSection } from './components/ExamplesSection';
import { ImageModal } from './components/ImageModal';
import { MultiImageTester } from './components/MultiImageTester';
import { ZipBatchTester } from './components/ZipBatchTester';

type TabType = 'single' | 'multi' | 'zip';

export default function MosaicTesterPage() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [userAccount, setUserAccount] = useState<string>('');

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

  // Modal state for viewing images
  const [modalImageUrl, setModalImageUrl] = useState<string>('');
  const [modalImageTitle, setModalImageTitle] = useState<string>('');

  // ZIP upload state
  // const [selectedZipFile, setSelectedZipFile] = useState<File | null>(null);
  // const [isProcessingZip, setIsProcessingZip] = useState(false);
  // const [zipError, setZipError] = useState<string>('');
  // const [zipProgress, setZipProgress] = useState<string>('');

  // Check if user is already authenticated
  useEffect(() => {
    const authStatus = sessionStorage.getItem('mosaicTesterAuth');
    const savedAccount = sessionStorage.getItem('mosaicTesterAccount');
    if (authStatus === 'true' && savedAccount) {
      setIsAuthenticated(true);
      setUserAccount(savedAccount);
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
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsAuthenticated(true);
        setUserAccount(data.email);
        sessionStorage.setItem('mosaicTesterAuth', 'true');
        sessionStorage.setItem('mosaicTesterAccount', data.email);
        setEmail('');
        setPassword('');
      } else {
        const data = await response.json();
        setAuthError(data.error || 'Invalid email or password');
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
    setUserAccount('');
    sessionStorage.removeItem('mosaicTesterAuth');
    sessionStorage.removeItem('mosaicTesterAccount');
    setEmail('');
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
              Mosaic Tester
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              Please sign in to access the mosaic tester
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="sr-only">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  placeholder="Email address"
                  disabled={isAuthLoading}
                />
              </div>
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
                  placeholder="Password"
                  disabled={isAuthLoading}
                />
              </div>
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
                disabled={isAuthLoading || !email.trim() || !password.trim()}
                className={`
                  group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500
                  ${isAuthLoading || !email.trim() || !password.trim()
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

      // Call mosaic processing API with account information
      const response = await fetch('/api/mosaic-process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: imageData,
          account: userAccount
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
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

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files);

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
      setError('Failed to load example image');
      console.error('Example load error:', err);
    }
  };

  // ZIP Upload Handlers
  // const handleZipFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = e.target.files?.[0];
  //   if (file) {
  //     if (!file.name.endsWith('.zip')) {
  //       setZipError('Please select a valid ZIP file');
  //       return;
  //     }

  //     setSelectedZipFile(file);
  //     setZipError('');
  //     setZipProgress('');
  //   }
  // };

  // const handleZipProcess = async () => {
  //   if (!selectedZipFile) {
  //     setZipError('Please select a ZIP file first');
  //     return;
  //   }

  //   setIsProcessingZip(true);
  //   setZipError('');
  //   setZipProgress('Uploading ZIP file...');

  //   try {
  //     const formData = new FormData();
  //     formData.append('zipFile', selectedZipFile);
  //     formData.append('modelName', 'segnext_l_model_A_363_pair_1110_iter_80000');

  //     setZipProgress('Processing images (this may take several minutes)...');

  //     const response = await fetch('/api/batch-mosaic-zip', {
  //       method: 'POST',
  //       body: formData,
  //     });

  //     if (!response.ok) {
  //       const errorData = await response.json();
  //       throw new Error(errorData.error || 'ZIP processing failed');
  //     }

  //     setZipProgress('Downloading result...');

  //     // Download the result ZIP file
  //     const blob = await response.blob();
  //     const url = window.URL.createObjectURL(blob);
  //     const a = document.createElement('a');
  //     a.href = url;
  //     a.download = `mosaic_results_${Date.now()}.zip`;
  //     document.body.appendChild(a);
  //     a.click();
  //     window.URL.revokeObjectURL(url);
  //     document.body.removeChild(a);

  //     setZipProgress('✅ Download complete! Check your downloads folder.');

  //   } catch (err) {
  //     setZipError(err instanceof Error ? err.message : 'ZIP processing failed');
  //     console.error('ZIP processing error:', err);
  //   } finally {
  //     setIsProcessingZip(false);
  //   }
  // };

  // const handleResetZip = () => {
  //   setSelectedZipFile(null);
  //   setZipError('');
  //   setZipProgress('');
  // };

  const tabs = [
    { id: 'single' as TabType, label: 'Single Image' },
    // { id: 'multi' as TabType, label: 'Multi Image' },
    // { id: 'zip' as TabType, label: 'ZIP Batch' }
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
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {userAccount}
              </span>
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
                onOpenModal={openModal}
              />
            ) : null
            // : activeTab === 'multi' ? (
            //   <MultiImageTester
            //     selectedFiles={selectedFiles}
            //     previewUrls={previewUrls}
            //     isProcessing={isProcessingMulti}
            //     processedImageUrls={processedImageUrls}
            //     error={multiError}
            //     onFileSelect={handleMultiFileSelect}
            //     onProcess={handleProcessMulti}
            //     onReset={handleResetMulti}
            //     onRemoveImage={removeImage}
            //     onDragOver={handleDragOver}
            //     onDrop={handleDrop}
            //     onOpenModal={openModal}
            //   />
            // ) : null
            // : (
            //   <ZipBatchTester
            //     selectedZipFile={selectedZipFile}
            //     isProcessing={isProcessingZip}
            //     progress={zipProgress}
            //     error={zipError}
            //     onFileSelect={handleZipFileSelect}
            //     onProcess={handleZipProcess}
            //     onReset={handleResetZip}
            //   />
            // )
            }
          </div>
        </div>

        {/* Examples Section */}
        <ExamplesSection onExampleClick={handleExampleClick} />
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

