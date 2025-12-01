'use client';

import { useState, useEffect, useCallback } from 'react';

interface NSFWRecord {
  id: string;
  angle1: string;
  angle2: string;
  action1: string;
  generated_tags: string;
  prompt: string;
  image_attachment?: {
    url: string;
    filename: string;
  }[];
}

export default function NSFWDBManagerPage() {
  const [records, setRecords] = useState<NSFWRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<NSFWRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Search states
  const [searchAngle1, setSearchAngle1] = useState<string>('');
  const [searchAngle2, setSearchAngle2] = useState<string>('');
  const [searchAction1, setSearchAction1] = useState<string>('');
  const [searchTags, setSearchTags] = useState<string>('');
  const [searchPrompt, setSearchPrompt] = useState<string>('');

  // Create new record states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRecord, setNewRecord] = useState({
    angle1: '',
    angle2: 'front',
    action1: '',
    generated_tags: '',
    prompt: '',
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<NSFWRecord | null>(null);
  const [editedRecord, setEditedRecord] = useState<NSFWRecord | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 20;

  // Fetch all records
  const fetchRecords = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/airtable/get-records?tableName=nsfw_db_manager');
      if (!response.ok) throw new Error('Failed to fetch records');

      const data = await response.json();

      // Transform Airtable records to our format
      const transformedRecords = (data.records || []).map((record: { id: string; fields?: { angle1?: string; angle2?: string; action1?: string; generated_tags?: string; prompt?: string; image_attachment?: { url: string; filename: string }[] } }) => ({
        id: record.id,
        angle1: record.fields?.angle1 || '',
        angle2: record.fields?.angle2 || '',
        action1: record.fields?.action1 || '',
        generated_tags: record.fields?.generated_tags || '',
        prompt: record.fields?.prompt || '',
        image_attachment: record.fields?.image_attachment || null,
      }));

      setRecords(transformedRecords);
      setFilteredRecords(transformedRecords);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = records;

    if (searchAngle1.trim()) {
      filtered = filtered.filter(record =>
        record.angle1?.toLowerCase().includes(searchAngle1.toLowerCase())
      );
    }

    if (searchAngle2.trim()) {
      filtered = filtered.filter(record =>
        record.angle2?.toLowerCase().includes(searchAngle2.toLowerCase())
      );
    }

    if (searchAction1.trim()) {
      filtered = filtered.filter(record =>
        record.action1?.toLowerCase().includes(searchAction1.toLowerCase())
      );
    }

    if (searchTags.trim()) {
      filtered = filtered.filter(record =>
        record.generated_tags?.toLowerCase().includes(searchTags.toLowerCase())
      );
    }

    if (searchPrompt.trim()) {
      filtered = filtered.filter(record =>
        record.prompt?.toLowerCase().includes(searchPrompt.toLowerCase())
      );
    }

    setFilteredRecords(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchAngle1, searchAngle2, searchAction1, searchTags, searchPrompt, records]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentRecords = filteredRecords.slice(startIndex, endIndex);

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle copy to clipboard
  const handleCopy = async (text: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Update record
  const handleUpdateRecord = async () => {
    if (!editedRecord) return;

    setIsUpdating(true);
    setError('');

    try {
      const response = await fetch('/api/airtable/update-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName: 'nsfw_db_manager',
          recordId: editedRecord.id,
          fields: {
            angle1: editedRecord.angle1,
            angle2: editedRecord.angle2,
            action1: editedRecord.action1,
            generated_tags: editedRecord.generated_tags,
            prompt: editedRecord.prompt,
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to update record');

      // Update local state
      setRecords(prevRecords =>
        prevRecords.map(r => (r.id === editedRecord.id ? editedRecord : r))
      );
      setSelectedRecord(editedRecord);
      setEditedRecord(null);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update record');
    } finally {
      setIsUpdating(false);
    }
  };

  // Navigate to previous/next record
  const handlePreviousRecord = useCallback(() => {
    if (!selectedRecord) return;
    const currentIndex = filteredRecords.findIndex(r => r.id === selectedRecord.id);
    if (currentIndex > 0) {
      setSelectedRecord(filteredRecords[currentIndex - 1]);
    }
  }, [selectedRecord, filteredRecords]);

  const handleNextRecord = useCallback(() => {
    if (!selectedRecord) return;
    const currentIndex = filteredRecords.findIndex(r => r.id === selectedRecord.id);
    if (currentIndex < filteredRecords.length - 1) {
      setSelectedRecord(filteredRecords[currentIndex + 1]);
    }
  }, [selectedRecord, filteredRecords]);

  // Keyboard navigation
  useEffect(() => {
    if (!selectedRecord) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === '<') {
        e.preventDefault();
        handlePreviousRecord();
      } else if (e.key === 'ArrowRight' || e.key === '>') {
        e.preventDefault();
        handleNextRecord();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedRecord(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRecord, filteredRecords, handlePreviousRecord, handleNextRecord]);

  // Create new record
  const handleCreateRecord = async () => {
    // Validate required fields
    if (!newRecord.angle2) {
      setError('Angle2 is required');
      return;
    }
    if (!newRecord.action1) {
      setError('Action is required');
      return;
    }
    if (!newRecord.generated_tags) {
      setError('Generated tags are required');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      let imageUrl = null;

      // Upload image first if selected
      if (selectedImage) {
        const formData = new FormData();
        formData.append('file', selectedImage);

        const uploadResponse = await fetch('/api/s3/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) throw new Error('Failed to upload image');

        const uploadData = await uploadResponse.json();
        imageUrl = uploadData.url;
      }

      // Create record with or without image
      const response = await fetch('/api/airtable/create-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName: 'nsfw_db_manager',
          fields: newRecord,
          imageUrl: imageUrl,
        }),
      });

      if (!response.ok) throw new Error('Failed to create record');

      // Reset form and refresh
      setNewRecord({
        angle1: '',
        angle2: 'front',
        action1: '',
        generated_tags: '',
        prompt: '',
      });
      setSelectedImage(null);
      setImagePreview(null);
      setShowCreateForm(false);
      fetchRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create record');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start gap-4">
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
              NSFW DB Manager
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Search and manage NSFW database records
            </p>
          </div>
        </div>

        {/* Search Filters */}
        <div className="mb-6 p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Search Filters
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Angle 1
              </label>
              <select
                value={searchAngle1}
                onChange={(e) => setSearchAngle1(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All</option>
                <option value="below">Below</option>
                <option value="above">Above</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Angle 2
              </label>
              <select
                value={searchAngle2}
                onChange={(e) => setSearchAngle2(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All</option>
                <option value="front">Front</option>
                <option value="back">Back</option>
                <option value="side">Side</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Action
              </label>
              <input
                type="text"
                value={searchAction1}
                onChange={(e) => setSearchAction1(e.target.value)}
                placeholder="e.g., standing, sitting..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Generated Tags
              </label>
              <input
                type="text"
                value={searchTags}
                onChange={(e) => setSearchTags(e.target.value)}
                placeholder="Search in tags..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Prompt
              </label>
              <input
                type="text"
                value={searchPrompt}
                onChange={(e) => setSearchPrompt(e.target.value)}
                placeholder="Search in prompt..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredRecords.length} of {records.length} records
            </p>
            <button
              onClick={() => {
                setSearchAngle1('');
                setSearchAngle2('');
                setSearchAction1('');
                setSearchTags('');
                setSearchPrompt('');
              }}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Create New Record Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {showCreateForm ? 'Cancel' : 'Create New Record'}
          </button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div className="mb-6 p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Create New Record
            </h3>

            {/* Image Upload */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Image Attachment
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300"
              />
              {imagePreview && (
                <div className="mt-3">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-w-xs rounded-lg border border-gray-300 dark:border-gray-600"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Angle 1 <span className="text-gray-500 text-xs">(optional)</span>
                </label>
                <select
                  value={newRecord.angle1}
                  onChange={(e) => setNewRecord({ ...newRecord, angle1: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">None</option>
                  <option value="below">Below</option>
                  <option value="above">Above</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Angle 2 <span className="text-red-500">*</span>
                </label>
                <select
                  value={newRecord.angle2}
                  onChange={(e) => setNewRecord({ ...newRecord, angle2: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="front">Front</option>
                  <option value="back">Back</option>
                  <option value="side">Side</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Action <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newRecord.action1}
                  onChange={(e) => setNewRecord({ ...newRecord, action1: e.target.value })}
                  placeholder="e.g., standing, sitting..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Generated Tags <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newRecord.generated_tags}
                  onChange={(e) => setNewRecord({ ...newRecord, generated_tags: e.target.value })}
                  rows={4}
                  placeholder="Enter tags (comma separated or multi-line)"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Prompt <span className="text-gray-500 text-xs">(optional)</span>
                </label>
                <textarea
                  value={newRecord.prompt}
                  onChange={(e) => setNewRecord({ ...newRecord, prompt: e.target.value })}
                  rows={4}
                  placeholder="Enter prompt description (optional)"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <button
              onClick={handleCreateRecord}
              disabled={isUploading}
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                'Create Record'
              )}
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}

        {/* Records Table */}
        {!isLoading && filteredRecords.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No records found. Try adjusting your search filters.
          </div>
        )}

        {!isLoading && filteredRecords.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Angle 1
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Angle 2
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Tags
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Prompt
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Image
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {currentRecords.map((record, index) => (
                    <tr
                      key={record.id}
                      onClick={(e) => {
                        // Don't open modal if clicking on buttons
                        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('img')) {
                          return;
                        }
                        setSelectedRecord(record);
                      }}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {startIndex + index + 1}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {record.angle1 ? (
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                            {record.angle1}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                          {record.angle2}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs">
                          {record.action1}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300 max-w-xs">
                        <div className="flex items-center gap-2">
                          <span className="truncate">
                            {record.generated_tags.substring(0, 50)}{record.generated_tags.length > 50 ? '...' : ''}
                          </span>
                          <button
                            onClick={() => handleCopy(record.generated_tags, `tags-${record.id}`)}
                            className="flex-shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            title="Copy tags"
                          >
                            {copiedField === `tags-${record.id}` ? (
                              <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {record.prompt ? (
                          <div className="flex items-center gap-2">
                            <span>
                              {record.prompt.substring(0, 10)}{record.prompt.length > 10 ? '...' : ''}
                            </span>
                            <button
                              onClick={() => handleCopy(record.prompt, `prompt-${record.id}`)}
                              className="flex-shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                              title="Copy prompt"
                            >
                              {copiedField === `prompt-${record.id}` ? (
                                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {record.image_attachment && record.image_attachment.length > 0 ? (
                          <img
                            src={record.image_attachment[0].url}
                            alt="Thumbnail"
                            className="h-12 w-12 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setExpandedImageUrl(record.image_attachment![0].url)}
                          />
                        ) : (
                          <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                            <span className="text-gray-400 dark:text-gray-500 text-xs">No img</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredRecords.length)} of {filteredRecords.length} records
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    First
                  </button>

                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>

                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Last
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Image Expansion Modal */}
        {expandedImageUrl && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
            onClick={() => setExpandedImageUrl(null)}
          >
            <div className="relative max-w-4xl max-h-full">
              <button
                onClick={() => setExpandedImageUrl(null)}
                className="absolute -top-10 right-0 text-white hover:text-gray-300 text-2xl font-bold"
              >
                ✕
              </button>
              <img
                src={expandedImageUrl}
                alt="Expanded view"
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {selectedRecord && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
            onClick={() => {
              setSelectedRecord(null);
              setEditedRecord(null);
            }}
          >
            <div
              className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {editedRecord ? 'Edit Record' : 'Record Details'}
                </h2>

                {/* Action Buttons */}
                <div className="flex items-center gap-4">
                  {!editedRecord ? (
                    <button
                      onClick={() => setEditedRecord({ ...selectedRecord })}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleUpdateRecord}
                        disabled={isUpdating}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isUpdating ? (
                          <>
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Saving...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Save
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setEditedRecord(null)}
                        disabled={isUpdating}
                        className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex items-center gap-4 border-l border-gray-300 dark:border-gray-600 pl-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePreviousRecord}
                      disabled={filteredRecords.findIndex(r => r.id === selectedRecord.id) === 0}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Previous record"
                    >
                      <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {filteredRecords.findIndex(r => r.id === selectedRecord.id) + 1} / {filteredRecords.length}
                    </span>
                    <button
                      onClick={handleNextRecord}
                      disabled={filteredRecords.findIndex(r => r.id === selectedRecord.id) === filteredRecords.length - 1}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Next record"
                    >
                      <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  <button
                    onClick={() => setSelectedRecord(null)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Two Column Layout: Information | Image */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column: Information */}
                  <div className="space-y-6">
                  {/* Angle 1 */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Angle 1
                    </label>
                    {editedRecord ? (
                      <select
                        value={editedRecord.angle1}
                        onChange={(e) => setEditedRecord({ ...editedRecord, angle1: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">None</option>
                        <option value="below">Below</option>
                        <option value="above">Above</option>
                      </select>
                    ) : (
                      selectedRecord.angle1 ? (
                        <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                          {selectedRecord.angle1}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">Not set</span>
                      )
                    )}
                  </div>

                  {/* Angle 2 */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Angle 2
                    </label>
                    {editedRecord ? (
                      <select
                        value={editedRecord.angle2}
                        onChange={(e) => setEditedRecord({ ...editedRecord, angle2: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="front">Front</option>
                        <option value="back">Back</option>
                        <option value="side">Side</option>
                      </select>
                    ) : (
                      <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                        {selectedRecord.angle2}
                      </span>
                    )}
                  </div>

                  {/* Action */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Action
                    </label>
                    {editedRecord ? (
                      <input
                        type="text"
                        value={editedRecord.action1}
                        onChange={(e) => setEditedRecord({ ...editedRecord, action1: e.target.value })}
                        placeholder="e.g., standing, sitting..."
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    ) : (
                      <span className="inline-block px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                        {selectedRecord.action1}
                      </span>
                    )}
                  </div>

                  {/* Generated Tags */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Generated Tags
                      </label>
                      {!editedRecord && (
                        <button
                          onClick={() => handleCopy(selectedRecord.generated_tags, 'modal-tags')}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                          title="Copy tags"
                        >
                          {copiedField === 'modal-tags' ? (
                            <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                    {editedRecord ? (
                      <textarea
                        value={editedRecord.generated_tags}
                        onChange={(e) => setEditedRecord({ ...editedRecord, generated_tags: e.target.value })}
                        rows={6}
                        placeholder="Enter tags..."
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    ) : (
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 p-3 rounded">
                        {selectedRecord.generated_tags}
                      </p>
                    )}
                  </div>

                  {/* Prompt */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Prompt
                      </label>
                      {!editedRecord && selectedRecord.prompt && (
                        <button
                          onClick={() => handleCopy(selectedRecord.prompt, 'modal-prompt')}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                          title="Copy prompt"
                        >
                          {copiedField === 'modal-prompt' ? (
                            <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                    {editedRecord ? (
                      <textarea
                        value={editedRecord.prompt}
                        onChange={(e) => setEditedRecord({ ...editedRecord, prompt: e.target.value })}
                        rows={6}
                        placeholder="Enter prompt (optional)..."
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    ) : (
                      selectedRecord.prompt ? (
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 p-3 rounded">
                          {selectedRecord.prompt}
                        </p>
                      ) : (
                        <p className="text-gray-400 dark:text-gray-500 text-sm">No prompt provided</p>
                      )
                    )}
                  </div>

                  {/* Record ID */}
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                      Record ID
                    </label>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-mono break-all">
                      {selectedRecord.id}
                    </p>
                  </div>
                  </div>

                  {/* Right Column: Image */}
                  <div className="lg:sticky lg:top-6 lg:self-start">
                    {selectedRecord.image_attachment && selectedRecord.image_attachment.length > 0 ? (
                      <img
                        src={selectedRecord.image_attachment[0].url}
                        alt="Record image"
                        className="w-full rounded-lg shadow-lg"
                      />
                    ) : (
                      <div className="w-full aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                        <span className="text-gray-400 dark:text-gray-500">No image</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
