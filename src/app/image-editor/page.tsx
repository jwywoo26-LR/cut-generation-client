'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SingleImageEditor } from './components/SingleImageEditor';
import { MultiImageEditor } from './components/MultiImageEditor';
import { ImageModal } from './components/ImageModal';

type TabType = 'single' | 'multi';

export default function ImageEditorPage() {
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

  // Edit settings
  const editType = 'takes_off'; // Always use 'takes_off'
  const [gender, setGender] = useState<string>('female');

  // Modal state
  const [modalImageUrl, setModalImageUrl] = useState<string>('');
  const [modalImageTitle, setModalImageTitle] = useState<string>('');

  // Check if user is already authenticated
  useEffect(() => {
    const authStatus = sessionStorage.getItem('imageEditorAuth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError('');

    try {
      const response = await fetch('/api/auth/image-editor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        setIsAuthenticated(true);
        sessionStorage.setItem('imageEditorAuth', 'true');
        setPassword('');
      } else {
        const data = await response.json();
        setAuthError(data.error || 'Invalid password');
      }
    } catch (error) {
      setAuthError('Authentication failed. Please try again.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('imageEditorAuth');
    setPassword('');
    setAuthError('');
  };

  // Single Image Handlers
  const processImage = async (file: File) => {
    setIsProcessing(true);
    setError('');

    try {
      const reader = new FileReader();
      const imageDataPromise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const imageData = await imageDataPromise;

      const response = await fetch('/api/image-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: imageData,
          editType: editType,
          gender: gender
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Image processing failed');
      }

      const result = await response.json();

      if (result.success && result.resultUrl) {
        setProcessedImageUrl(result.resultUrl);
      } else {
        throw new Error(result.error || 'No result URL returned');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
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

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setSelectedFile(file);
      setError('');
      setProcessedImageUrl('');

      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      await processImage(file);
    }
  };

  // Multi-Image Handlers
  const handleMultiFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const invalidFiles = files.filter(file => !file.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      setMultiError('Please select only valid image files');
      return;
    }

    previewUrls.forEach(url => URL.revokeObjectURL(url));

    setSelectedFiles(files);
    setMultiError('');
    setProcessedImageUrls([]);

    const urls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);

    if (files.length === 0) return;

    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setMultiError('Please drop valid image files');
      return;
    }

    previewUrls.forEach(url => URL.revokeObjectURL(url));

    setSelectedFiles(imageFiles);
    setMultiError('');
    setProcessedImageUrls([]);

    const urls = imageFiles.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);
  };

  const handleProcessMulti = async () => {
    if (selectedFiles.length === 0) {
      setMultiError('Please select images first');
      return;
    }

    setIsProcessing(true);
    setMultiError('');
    const results: string[] = [];

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];

        const reader = new FileReader();
        const imageDataPromise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const imageData = await imageDataPromise;

        const response = await fetch('/api/image-edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageData: imageData,
            editType: editType,
            gender: gender
          }),
        });

        if (!response.ok) {
          throw new Error(`Image ${i + 1} processing failed`);
        }

        const result = await response.json();
        if (result.success && result.resultUrl) {
          results.push(result.resultUrl);
        } else {
          throw new Error(`Image ${i + 1} - no result`);
        }
      }

      setProcessedImageUrls(results);
    } catch (err) {
      setMultiError(err instanceof Error ? err.message : 'Processing failed');
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

    URL.revokeObjectURL(previewUrls[index]);

    setSelectedFiles(newFiles);
    setPreviewUrls(newUrls);

    if (processedImageUrls[index]) {
      const newProcessed = processedImageUrls.filter((_, i) => i !== index);
      setProcessedImageUrls(newProcessed);
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

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
              Image Editor
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              Please sign in to access the image editor
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
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                  group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                  ${isAuthLoading || !password.trim()
                    ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
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
                Image Editor
              </h1>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-6 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Edit Settings</h3>
          <div className="max-w-md">
            {/* Gender */}
            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Gender
              </label>
              <select
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
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
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
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
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
              >
                Multi Image
              </button>
            </nav>
          </div>

          <div className="p-6">
            {selectedTab === 'single' && (
              <SingleImageEditor
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
              <MultiImageEditor
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
          </div>
        </div>
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
