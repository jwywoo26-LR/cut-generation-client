'use client';

import { useState } from 'react';
import ResourceManager from './components/ResourceManager';

interface ProcessingDetails {
  psdFilename: string;
  soundEffects: {
    nsfw_onomatopoeia: string[];
    moaning: string[];
    moaning_text: string[];
  };
}

type TabType = 'sound-effect' | 'resource-manager';

export default function SoundEffectPage() {
  const [activeTab, setActiveTab] = useState<TabType>('sound-effect');
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const [processingDetails, setProcessingDetails] = useState<ProcessingDetails[]>([]);
  const [totalPsdCount, setTotalPsdCount] = useState<number>(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.zip')) {
      setZipFile(file);
      setError('');
    } else {
      setError('Please select a valid ZIP file');
      setZipFile(null);
    }
  };

  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    const prefix = type === 'success' ? '[SUCCESS]' : type === 'error' ? '[ERROR]' : '[INFO]';
    setProgress(prev => [...prev, `${timestamp} ${prefix} ${message}`]);
  };

  const handleProcess = async () => {
    if (!zipFile) {
      setError('Please select a ZIP file first');
      return;
    }

    setIsProcessing(true);
    setProgress([]);
    setError('');
    setTotalPsdCount(0);
    setProcessingDetails([]);

    addLog('Starting sound effect processing...', 'info');
    addLog(`ZIP file selected: ${zipFile.name} (${(zipFile.size / 1024 / 1024).toFixed(2)} MB)`, 'info');

    try {
      const formData = new FormData();
      formData.append('zipFile', zipFile);

      addLog('Uploading ZIP file to server...', 'info');
      const uploadStart = Date.now();

      const response = await fetch('/api/sound-effect-process', {
        method: 'POST',
        body: formData,
      });

      const uploadTime = ((Date.now() - uploadStart) / 1000).toFixed(2);
      addLog(`Upload completed in ${uploadTime}s`, 'success');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Processing failed');
      }

      addLog('Processing PSD files...', 'info');

      // Extract processing details from custom headers
      const totalPsds = parseInt(response.headers.get('X-Total-PSDs') || '0');
      const detailsJson = response.headers.get('X-Processing-Details');

      if (totalPsds > 0) {
        setTotalPsdCount(totalPsds);
        addLog(`Found ${totalPsds} PSD file(s) in ZIP`, 'success');
      }

      if (detailsJson) {
        try {
          // Decode Base64 to handle Korean characters
          const decodedJson = atob(detailsJson);
          const details = JSON.parse(decodedJson) as ProcessingDetails[];
          setProcessingDetails(details);
          addLog(`Applied sound effects to ${details.length} file(s)`, 'success');

          details.forEach((detail) => {
            const totalEffects =
              detail.soundEffects.nsfw_onomatopoeia.length +
              detail.soundEffects.moaning.length +
              detail.soundEffects.moaning_text.length;

            addLog(`Processing: ${detail.psdFilename}`, 'info');
            addLog(`  ✓ Selected ${totalEffects} sound effects`, 'success');

            if (detail.soundEffects.nsfw_onomatopoeia.length > 0) {
              addLog(`  ✓ NSFW Onomatopoeia: ${detail.soundEffects.nsfw_onomatopoeia.length} effects`, 'info');
              detail.soundEffects.nsfw_onomatopoeia.forEach(file => {
                addLog(`    ✓ Added ${file}`, 'info');
              });
            }

            if (detail.soundEffects.moaning.length > 0) {
              addLog(`  ✓ Moaning: ${detail.soundEffects.moaning.length} effects`, 'info');
              detail.soundEffects.moaning.forEach(file => {
                addLog(`    ✓ Added ${file}`, 'info');
              });
            }

            if (detail.soundEffects.moaning_text.length > 0) {
              addLog(`  ✓ Moaning Text: ${detail.soundEffects.moaning_text.length} effects`, 'info');
              detail.soundEffects.moaning_text.forEach(file => {
                addLog(`    ✓ Added ${file}`, 'info');
              });
            }
          });
        } catch (e) {
          console.error('Failed to parse processing details:', e);
          addLog('Warning: Could not parse processing details', 'error');
        }
      }

      addLog('Processing completed successfully!', 'success');
      addLog('Preparing download...', 'info');

      // Download the result ZIP file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'psds_with_sound_effects.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      addLog(`Download started: psds_with_sound_effects.zip (${(blob.size / 1024 / 1024).toFixed(2)} MB)`, 'success');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Processing failed';
      setError(errorMsg);
      addLog(errorMsg, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setZipFile(null);
    setProgress([]);
    setError('');
    setProcessingDetails([]);
    setTotalPsdCount(0);
  };

  const handleCopyLogs = () => {
    const logsText = progress.join('\n');
    navigator.clipboard.writeText(logsText);
    alert('Logs copied to clipboard!');
  };

  const handleDownloadLogs = () => {
    const logsText = progress.join('\n');
    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sound-effect-processing-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Sound Effect Processor
          </h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
            Upload a ZIP file containing PSD files to add sound effects
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('sound-effect')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === 'sound-effect'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }
              `}
            >
              Sound Effect
            </button>
            <button
              onClick={() => setActiveTab('resource-manager')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === 'resource-manager'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }
              `}
            >
              Resource Manager
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Sound Effect Tab */}
        {activeTab === 'sound-effect' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {/* Instructions */}
          <div className="mb-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-3">
              How to use:
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-blue-800 dark:text-blue-200">
              <li>Prepare a ZIP file containing PSD files (without sound effects)</li>
              <li>Upload the ZIP file using the button below</li>
              <li>Click &quot;Process&quot; to add sound effects automatically</li>
              <li>Download the result ZIP file containing PSDs with sound effects</li>
            </ol>
          </div>

          {/* File Upload Section */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Upload ZIP File
            </label>
            <div className="flex items-center gap-4">
              <label className="flex-1 cursor-pointer">
                <div className={`
                  border-2 border-dashed rounded-xl p-8 text-center transition-all
                  ${zipFile
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-gray-50 dark:bg-gray-700/50'
                  }
                `}>
                  <input
                    type="file"
                    accept=".zip"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isProcessing}
                  />
                  <div className="text-6xl mb-3">
                    {zipFile ? '📦' : '📁'}
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 font-medium">
                    {zipFile ? zipFile.name : 'Click to select ZIP file'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    {zipFile
                      ? `Size: ${(zipFile.size / 1024 / 1024).toFixed(2)} MB`
                      : 'Only .zip files are accepted'
                    }
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-red-800 dark:text-red-200">
                {error}
              </p>
            </div>
          )}

          {/* Progress Display - Terminal Style */}
          {progress.length > 0 && (
            <div className="mb-6 bg-gray-900 dark:bg-black rounded-xl border border-gray-700 overflow-hidden">
              {/* Terminal Header */}
              <div className="flex items-center justify-between px-4 py-2 bg-gray-800 dark:bg-gray-900 border-b border-gray-700">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <span className="text-sm text-gray-400 ml-2 font-mono">Processing Logs</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyLogs}
                    className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                    title="Copy logs to clipboard"
                  >
                    Copy
                  </button>
                  <button
                    onClick={handleDownloadLogs}
                    className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                    title="Download logs as TXT file"
                  >
                    Download
                  </button>
                </div>
              </div>

              {/* Terminal Body */}
              <div className="p-4 font-mono text-sm max-h-96 overflow-y-auto">
                {progress.map((msg, idx) => {
                  const isSuccess = msg.includes('[SUCCESS]');
                  const isError = msg.includes('[ERROR]');
                  const isInfo = msg.includes('[INFO]');

                  let textColor = 'text-gray-300';
                  if (isSuccess) textColor = 'text-green-400';
                  if (isError) textColor = 'text-red-400';
                  if (isInfo) textColor = 'text-blue-400';

                  return (
                    <div key={idx} className={`${textColor} leading-relaxed`}>
                      {msg}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Processing Details Display */}
          {totalPsdCount > 0 && (
            <div className="mb-6 p-6 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
              <h3 className="text-xl font-bold text-purple-900 dark:text-purple-100 mb-4">
                Processing Summary
              </h3>
              <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg">
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  Total PSD Files: <span className="text-purple-600 dark:text-purple-400">{totalPsdCount}</span>
                </p>
              </div>

              {processingDetails.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-purple-900 dark:text-purple-100">
                    Sound Effects Applied:
                  </h4>
                  {processingDetails.map((detail, idx) => {
                    const totalEffects =
                      detail.soundEffects.nsfw_onomatopoeia.length +
                      detail.soundEffects.moaning.length +
                      detail.soundEffects.moaning_text.length;

                    return (
                      <div
                        key={idx}
                        className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-semibold text-gray-900 dark:text-white">
                            {detail.psdFilename}
                          </h5>
                          <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-sm font-medium">
                            {totalEffects} effects
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {/* NSFW Onomatopoeia */}
                          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                            <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 mb-2">
                              NSFW Onomatopoeia ({detail.soundEffects.nsfw_onomatopoeia.length})
                            </p>
                            {detail.soundEffects.nsfw_onomatopoeia.length > 0 ? (
                              <div className="space-y-1 max-h-32 overflow-y-auto">
                                {detail.soundEffects.nsfw_onomatopoeia.map((file, i) => (
                                  <p key={i} className="text-xs text-amber-700 dark:text-amber-300 truncate">
                                    • {file}
                                  </p>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-amber-600 dark:text-amber-400 italic">None</p>
                            )}
                          </div>

                          {/* Moaning */}
                          <div className="p-3 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
                            <p className="text-xs font-semibold text-pink-800 dark:text-pink-200 mb-2">
                              Moaning ({detail.soundEffects.moaning.length})
                            </p>
                            {detail.soundEffects.moaning.length > 0 ? (
                              <div className="space-y-1 max-h-32 overflow-y-auto">
                                {detail.soundEffects.moaning.map((file, i) => (
                                  <p key={i} className="text-xs text-pink-700 dark:text-pink-300 truncate">
                                    • {file}
                                  </p>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-pink-600 dark:text-pink-400 italic">None</p>
                            )}
                          </div>

                          {/* Moaning Text */}
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <p className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-2">
                              Moaning Text ({detail.soundEffects.moaning_text.length})
                            </p>
                            {detail.soundEffects.moaning_text.length > 0 ? (
                              <div className="space-y-1 max-h-32 overflow-y-auto">
                                {detail.soundEffects.moaning_text.map((file, i) => (
                                  <p key={i} className="text-xs text-blue-700 dark:text-blue-300 truncate">
                                    • {file}
                                  </p>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-blue-600 dark:text-blue-400 italic">None</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleProcess}
              disabled={!zipFile || isProcessing}
              className={`
                flex-1 py-4 px-6 rounded-xl font-semibold text-lg transition-all transform
                ${!zipFile || isProcessing
                  ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white hover:scale-[1.02] shadow-lg hover:shadow-xl'
                }
              `}
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Processing...
                </span>
              ) : (
                '🔊 Process Sound Effects'
              )}
            </button>

            {!isProcessing && (zipFile || progress.length > 0) && (
              <button
                onClick={handleReset}
                className="px-6 py-4 rounded-xl font-semibold text-lg border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
              >
                Reset
              </button>
            )}
          </div>

          {/* Technical Info */}
          <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Technical Information
            </h3>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p>• Extracts PSD files from uploaded ZIP</p>
              <p>• Converts PSDs to composite PNG images for analysis</p>
              <p>• Uses Grok API to detect sound effect locations</p>
              <p>• Applies detected sound effects to original PSDs</p>
              <p>• Returns processed PSDs in a downloadable ZIP file</p>
            </div>
          </div>
        </div>
        )}

        {/* Resource Manager Tab */}
        {activeTab === 'resource-manager' && (
          <ResourceManager />
        )}
      </div>
    </div>
  );
}
