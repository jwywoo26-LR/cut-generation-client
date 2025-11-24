'use client';

import { useState, useEffect } from 'react';
import { SingleImageTester } from './components/SingleImageTester';
import { ExamplesSection } from './components/ExamplesSection';
import { ImageModal } from './components/ImageModal';

export default function MosaicTesterPage() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [userAccount, setUserAccount] = useState<string>('');
  const [usageLimit, setUsageLimit] = useState<number>(0);
  const [currentUsage, setCurrentUsage] = useState<number>(0);

  // Single image state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedImageUrl, setProcessedImageUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Mask type selection
  const [maskType, setMaskType] = useState<string>('white_mask');

  // Modal state for viewing images
  const [modalImageUrl, setModalImageUrl] = useState<string>('');
  const [modalImageTitle, setModalImageTitle] = useState<string>('');

  // Fetch usage status
  const fetchUsageStatus = async (account: string) => {
    try {
      const response = await fetch(`/api/account-status?account=${encodeURIComponent(account)}`);
      if (response.ok) {
        const data = await response.json();
        setUsageLimit(data.data.limit);
        setCurrentUsage(data.data.usage);
      }
    } catch (error) {
      console.error('Failed to fetch usage status:', error);
    }
  };

  // Check if user is already authenticated
  useEffect(() => {
    const authStatus = sessionStorage.getItem('mosaicTesterAuth');
    const savedAccount = sessionStorage.getItem('mosaicTesterAccount');
    if (authStatus === 'true' && savedAccount) {
      setIsAuthenticated(true);
      setUserAccount(savedAccount);
      fetchUsageStatus(savedAccount);
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
        // Fetch usage status after login
        fetchUsageStatus(data.email);
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
      // Check account status and limit
      const statusResponse = await fetch(`/api/account-status?account=${encodeURIComponent(userAccount)}`);

      if (!statusResponse.ok) {
        const statusError = await statusResponse.json();
        throw new Error(statusError.error || '계정 상태 확인에 실패했습니다');
      }

      const statusData = await statusResponse.json();

      if (!statusData.canProcess) {
        throw new Error(`사용 한도에 도달했습니다! ${statusData.data.limit}회 중 ${statusData.data.usage}회를 사용하셨습니다.`);
      }

      // Increment usage
      const incrementResponse = await fetch('/api/account-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ account: userAccount }),
      });

      if (!incrementResponse.ok) {
        const incrementError = await incrementResponse.json();
        throw new Error(incrementError.error || '사용량 업데이트에 실패했습니다');
      }

      const incrementData = await incrementResponse.json();
      // Update local usage state
      setCurrentUsage(incrementData.usage);
      setUsageLimit(incrementData.limit);

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
          account: userAccount,
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Mosaic Tester
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {userAccount}
                </span>
                <span className={`text-xs font-medium ${currentUsage >= usageLimit ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-500'}`}>
                  사용량: {currentUsage} / {usageLimit}
                </span>
              </div>
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
        {/* Mask Type Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-6 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Processing Settings</h3>
          <div className="max-w-xs">
            <label htmlFor="mask-type-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Mask Type
            </label>
            <select
              id="mask-type-select"
              value={maskType}
              onChange={(e) => setMaskType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="white_mask">Gaussian Blur</option>
              <option value="mosaic">Pixel</option>
            </select>
          </div>
        </div>

        {/* Single Image Tester */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-8">
          <div className="p-6">
            <SingleImageTester
              selectedFile={selectedFile}
              previewUrl={previewUrl}
              isProcessing={isProcessing}
              processedImageUrl={processedImageUrl}
              error={error}
              onFileSelect={handleFileSelect}
              onOpenModal={openModal}
            />
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

