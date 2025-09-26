'use client';

import { useState, useRef } from 'react';
import { readPsd } from 'ag-psd';


interface ProcessingResult {
  success: boolean;
  processedFiles: number;
  extractedLayers: number;
  error?: string;
}


interface LayerInfo {
  name: string;
  fileName: string;
  hasImage: boolean;
}

interface PsdFileInfo {
  name: string;
  layers: LayerInfo[];
  error?: string;
}

export default function LayerExtractorMain() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [psdFiles, setPsdFiles] = useState<PsdFileInfo[]>([]);
  const [allLayers, setAllLayers] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/zip') {
      setSelectedFile(file);
      setResult(null);
      setError('');
      setPsdFiles([]);
      setAllLayers([]);

      // Automatically analyze the ZIP file
      analyzeZipFile(file);
    } else {
      setError('Please select a ZIP file containing PSD/PSB files');
    }
  };

  const analyzeZipFile = async (file: File) => {
    setIsAnalyzing(true);
    setError('');

    try {
      const JSZip = (await import('jszip')).default;
      const zipData = await file.arrayBuffer();

      console.log('ZIP file size:', zipData.byteLength, 'bytes');

      const zip = await JSZip.loadAsync(zipData, {
        checkCRC32: false // Skip CRC check for faster loading
      });

      const psdFileNames = Object.keys(zip.files).filter(
        name => !zip.files[name].dir &&
               (name.toLowerCase().endsWith('.psd') || name.toLowerCase().endsWith('.psb')) &&
               !name.startsWith('__MACOSX/') &&
               !name.startsWith('._') &&
               !name.includes('/.DS_Store')
      );

      console.log('Found PSD files:', psdFileNames);

      if (psdFileNames.length === 0) {
        throw new Error('No PSD or PSB files found in the ZIP');
      }

      const analyzedFiles: PsdFileInfo[] = [];
      const uniqueLayers = new Set<string>();

      for (const psdFileName of psdFileNames) {
        try {
          console.log(`Analyzing ${psdFileName}...`);
          const psdFile = zip.files[psdFileName];

          if (!psdFile) {
            throw new Error(`File ${psdFileName} not found in ZIP`);
          }

          const psdData = await psdFile.async('arraybuffer');
          console.log(`${psdFileName} size:`, psdData.byteLength, 'bytes');

          // Validate PSD signature
          const signature = new Uint8Array(psdData.slice(0, 4));
          const signatureStr = String.fromCharCode(...signature);

          if (signatureStr !== '8BPS') {
            throw new Error(`Invalid PSD signature in ${psdFileName}: expected '8BPS', got '${signatureStr}'`);
          }

          // Parse PSD with minimal data to get layer info
          const psd = readPsd(psdData, {
            skipLayerImageData: true, // Skip image data for faster analysis
            skipCompositeImageData: true
          });

          console.log(`${psdFileName} parsed successfully:`, {
            width: psd.width,
            height: psd.height,
            layerCount: psd.children?.length || 0
          });

          const layers: LayerInfo[] = [];

          if (psd.children) {
            for (const layer of psd.children) {
              const layerName = layer.name || 'Unnamed';
              layers.push({
                name: layerName,
                fileName: psdFileName,
                hasImage: !!layer.canvas
              });
              uniqueLayers.add(layerName);
            }
          }

          analyzedFiles.push({
            name: psdFileName,
            layers: layers
          });

        } catch (error) {
          console.error(`Error analyzing ${psdFileName}:`, error);
          analyzedFiles.push({
            name: psdFileName,
            layers: [],
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      setPsdFiles(analyzedFiles);
      setAllLayers(Array.from(uniqueLayers).sort());

    } catch (error) {
      console.error('Error analyzing ZIP file:', error);
      setError(error instanceof Error ? error.message : 'Failed to analyze ZIP file');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const processFilesWithMosaicDeletion = async () => {
    if (!selectedFile) {
      setError('Please select a ZIP file first');
      return;
    }

    if (psdFiles.length === 0) {
      setError('Please wait for file analysis to complete');
      return;
    }

    // Set config to delete 모자이크 layer
    const layersToDelete = allLayers.includes('모자이크') ? ['모자이크'] : [];

    console.log('Processing with mosaic deletion config:', { layersToDelete });

    setIsProcessing(true);
    setError('');
    setProgress(0);
    setResult(null);

    try {
      // Import JSZip dynamically
      const JSZip = (await import('jszip')).default;

      // Read the ZIP file
      const zipData = await selectedFile.arrayBuffer();
      const zip = await JSZip.loadAsync(zipData);

      const psdFiles = Object.keys(zip.files).filter(
        name => !zip.files[name].dir &&
               (name.toLowerCase().endsWith('.psd') || name.toLowerCase().endsWith('.psb')) &&
               !name.startsWith('__MACOSX/') &&
               !name.startsWith('._') &&
               !name.includes('/.DS_Store')
      );

      if (psdFiles.length === 0) {
        throw new Error('No PSD or PSB files found in the ZIP');
      }

      const processedFiles: { name: string; canvas?: HTMLCanvasElement; error?: string }[] = [];
      let processedCount = 0;

      for (const psdFileName of psdFiles) {
        setProgress((processedCount / psdFiles.length) * 90);

        try {
          // Extract PSD file from ZIP
          const psdFile = zip.files[psdFileName];

          if (!psdFile) {
            throw new Error(`File ${psdFileName} not found in ZIP`);
          }

          const psdData = await psdFile.async('arraybuffer');
          console.log(`Processing ${psdFileName}, size: ${psdData.byteLength} bytes`);

          // Validate PSD signature
          const signature = new Uint8Array(psdData.slice(0, 4));
          const signatureStr = String.fromCharCode(...signature);

          if (signatureStr !== '8BPS') {
            throw new Error(`Invalid PSD signature in ${psdFileName}: expected '8BPS', got '${signatureStr}'`);
          }

          // Parse PSD with ag-psd
          const psd = readPsd(psdData, {
            skipLayerImageData: false,
            skipCompositeImageData: false
          });

          console.log(`Processing ${psdFileName}:`, {
            width: psd.width,
            height: psd.height,
            layerCount: psd.children?.length || 0,
            layerNames: psd.children?.map(l => l.name) || []
          });

          // No layer extraction in this simplified version - just combine layers

          // Simple approach: combine all layers except 모자이크
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;

          canvas.width = psd.width || 800;
          canvas.height = psd.height || 600;

          console.log(`Combining layers (excluding mosaic)...`);

          // Go through layers bottom to top (reverse order)
          if (psd.children) {
            const layers = [...psd.children].reverse();

            for (const layer of layers) {
              const layerName = layer.name || '';

              // Skip mosaic layer (모자이크)
              if (layerName === '모자이크') {
                console.log(`Skipping mosaic layer: ${layerName}`);
                continue;
              }

              // Draw layer if it has image data
              if (layer.canvas) {
                console.log(`Drawing layer: ${layerName}`);
                ctx.drawImage(layer.canvas, layer.left || 0, layer.top || 0);
              }
            }
          }

          const finalCanvas = canvas;

          processedFiles.push({
            name: psdFileName,
            canvas: finalCanvas
          });

        } catch (error) {
          console.error(`Error processing ${psdFileName}:`, error);
          processedFiles.push({
            name: psdFileName,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }

        processedCount++;
      }

      // Create download ZIP
      await createDownloadZip(processedFiles);

      setResult({
        success: true,
        processedFiles: processedFiles.filter(f => f.canvas).length,
        extractedLayers: 0
      });
      setProgress(100);

    } catch (error) {
      console.error('Error processing files:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsProcessing(false);
    }
  };


  const createDownloadZip = async (
    processedFiles: { name: string; canvas?: HTMLCanvasElement; error?: string }[]
  ) => {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    // Add processed files (without mosaic layer)
    for (const file of processedFiles) {
      if (file.canvas) {
        const blob = await new Promise<Blob>((resolve) => {
          file.canvas!.toBlob((blob) => resolve(blob!), 'image/png');
        });

        const fileName = file.name.replace(/\.(psd|psb)$/i, '_clean.png');
        zip.file(fileName, blob);
      }
    }

    // Generate and download ZIP
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'clean_images_modified_mosaic.zip';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };


  const clearFiles = () => {
    setSelectedFile(null);
    setResult(null);
    setError('');
    setProgress(0);
    setPsdFiles([]);
    setAllLayers([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* File Upload Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Upload PSD/PSB Files
        </h2>

        <div className="space-y-4">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-300"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Upload a ZIP file containing PSD or PSB files
            </p>
          </div>

          {selectedFile && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Selected file: <strong>{selectedFile.name}</strong>
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Size: {Math.round(selectedFile.size / 1024 / 1024 * 100) / 100} MB
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Analyzing Progress */}
      {isAnalyzing && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-gray-700 dark:text-gray-300">Analyzing PSD files...</span>
          </div>
        </div>
      )}

      {/* PSD Files Overview */}
      {psdFiles.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            PSD Files Overview
          </h2>

          <div className="space-y-3">
            {psdFiles.map((psdFile, index) => (
              <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    📄 {psdFile.name}
                  </h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {psdFile.layers.length} layers
                  </span>
                </div>

                {psdFile.error ? (
                  <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                    Error: {psdFile.error}
                  </div>
                ) : (
                  <div className="mt-2">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      Layer order (top → bottom):
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {psdFile.layers.map((layer, layerIndex) => (
                        <span
                          key={layerIndex}
                          className={`
                            px-2 py-1 text-xs rounded-md relative
                            ${layer.hasImage
                              ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                              : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                            }
                          `}
                        >
                          <span className="text-xs opacity-60">#{layerIndex + 1}</span> {layer.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processing Actions */}
      {allLayers.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Layer Processing Actions
          </h2>

          <div className="space-y-4">
            {/* Status Display */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🗑️</span>
                  <h3 className="font-medium text-gray-900 dark:text-white">Mosaic Layer</h3>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {allLayers.includes('모자이크') ? (
                    <span className="text-green-600 dark:text-green-400">✓ Found in files</span>
                  ) : (
                    <span className="text-orange-600 dark:text-orange-400">⚠ Not found</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Will be automatically removed from output
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📄</span>
                  <h3 className="font-medium text-gray-900 dark:text-white">Clean Files</h3>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {psdFiles.length} PSD file{psdFiles.length !== 1 ? 's' : ''} ready
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Output as PNG files with modified mosaic
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  // Directly call processFiles with 모자이크 deletion
                  await processFilesWithMosaicDeletion();
                }}
                disabled={!selectedFile || isProcessing || isAnalyzing}
                className={`
                  px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2
                  ${!selectedFile || isProcessing || isAnalyzing
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                  }
                `}
              >
                {isProcessing && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>🗑️</span>
                {isProcessing ? 'Removing Mosaic...' : 'Remove Mosaic & Download'}
              </button>

              <button
                onClick={clearFiles}
                disabled={isProcessing || isAnalyzing}
                className="px-4 py-2 rounded-lg font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Clear
              </button>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400">
              Click &quot;Remove Mosaic &amp; Download&quot; to automatically process all PSD files and download a ZIP containing PNG versions with modified mosaic.
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {isProcessing && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Processing PSD files...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="text-red-800 dark:text-red-200">
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Processing Results
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {result.processedFiles}
              </div>
              <div className="text-sm text-green-800 dark:text-green-300">
                Files Processed
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {result.extractedLayers}
              </div>
              <div className="text-sm text-blue-800 dark:text-blue-300">
                Layers Extracted
              </div>
            </div>
          </div>

          {result.error && (
            <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <div className="text-yellow-800 dark:text-yellow-200 text-sm">
                <strong>Warning:</strong> {result.error}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
          How to Use Mosaic Layer Remover
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>1. Create a ZIP file containing your PSD or PSB files</li>
          <li>2. Upload the ZIP file using the file selector above</li>
          <li>3. Wait for automatic analysis to detect mosaic layers</li>
          <li>4. Click &quot;Remove Mosaic &amp; Download&quot; to process files</li>
          <li>5. Download clean PNG files with modified mosaic layers</li>
        </ul>
        <div className="mt-4 text-xs text-blue-700 dark:text-blue-300">
          <p><strong>Supported formats:</strong> PSD, PSB</p>
          <p><strong>What it does:</strong> Automatically detects and removes mosaic layers (named &quot;모자이크&quot;) from your PSD files, then combines all remaining layers into PNG images with modified mosaic.</p>
        </div>
      </div>
    </div>
  );
}