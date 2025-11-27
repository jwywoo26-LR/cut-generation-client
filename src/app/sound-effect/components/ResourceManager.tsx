'use client';

import { useState, useEffect } from 'react';

interface SoundEffectRecord {
  id: string;
  fields: {
    filename: string;
    layer_name: string;
    stage: string;
    body_part: string;
    category: string;
    etc: string;
    image_attachment?: Array<{
      url: string;
      filename: string;
    }>;
  };
}

type TableType = 'moaning_text' | 'moaning' | 'nsfw_onomatopoeia';

export default function ResourceManager() {
  const [activeTable, setActiveTable] = useState<TableType>('nsfw_onomatopoeia');
  const [records, setRecords] = useState<SoundEffectRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    filename: '',
    layer_name: '',
    stage: '',
    body_part: '',
    etc: '',
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    filename: '',
    layer_name: '',
    stage: '',
    body_part: '',
    etc: '',
  });
  const [expandedImageId, setExpandedImageId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    fetchRecords();
  }, [activeTable]);

  const fetchRecords = async () => {
    setIsLoading(true);
    setError('');
    setSearchTerm('');
    setStageFilter('all');

    try {
      const url = `/api/airtable/get-records?tableName=${activeTable}`;
      console.log('Fetching from:', url);
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.details || errorData.error || 'Failed to fetch records');
      }

      const data = await response.json();
      console.log('Fetched data:', data);
      setRecords(data.records || []);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load resources');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setCreateFormData({
      filename: '',
      layer_name: '',
      stage: '',
      body_part: '',
      etc: '',
    });
    setSelectedFile(null);
    setImagePreview(null);
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    setCreateFormData({
      filename: '',
      layer_name: '',
      stage: '',
      body_part: '',
      etc: '',
    });
    setSelectedFile(null);
    setImagePreview(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      alert('Please select a valid image file');
    }
  };

  const handleStartEdit = (record: SoundEffectRecord) => {
    setEditingRecordId(record.id);
    setEditFormData({
      filename: record.fields.filename || '',
      layer_name: record.fields.layer_name || '',
      stage: record.fields.stage || '',
      body_part: record.fields.body_part || '',
      etc: record.fields.etc || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingRecordId(null);
    setEditFormData({
      filename: '',
      layer_name: '',
      stage: '',
      body_part: '',
      etc: '',
    });
  };

  const handleDelete = async (recordId: string) => {
    if (!confirm('Are you sure you want to delete this record?')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/airtable/delete-record?tableName=${activeTable}&recordId=${recordId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to delete record');
      }

      await fetchRecords();
    } catch (err) {
      console.error('Delete error:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete record');
    }
  };

  const handleSaveCreate = async () => {
    if (!selectedFile) {
      alert('Please select an image file');
      return;
    }

    try {
      setUploadingImage(true);

      // Step 1: Upload image to S3
      const formData = new FormData();
      formData.append('file', selectedFile);

      const uploadResponse = await fetch('/api/s3/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.details || errorData.error || 'Failed to upload image');
      }

      const uploadData = await uploadResponse.json();
      const imageUrl = uploadData.url;

      // Step 2: Create record in Airtable with image URL
      const response = await fetch('/api/airtable/create-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName: activeTable,
          fields: {
            ...createFormData,
            category: getTableLabel(activeTable).toLowerCase().replace(' ', '_'),
          },
          imageUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to create record');
      }

      setIsCreating(false);
      setCreateFormData({
        filename: '',
        layer_name: '',
        stage: '',
        body_part: '',
        etc: '',
      });
      setSelectedFile(null);
      setImagePreview(null);
      await fetchRecords();
    } catch (err) {
      console.error('Create error:', err);
      alert(err instanceof Error ? err.message : 'Failed to create record');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveEdit = async (recordId: string) => {
    try {
      const response = await fetch('/api/airtable/update-record', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName: activeTable,
          recordId: recordId,
          fields: editFormData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to update record');
      }

      setEditingRecordId(null);
      await fetchRecords();
    } catch (err) {
      console.error('Update error:', err);
      alert(err instanceof Error ? err.message : 'Failed to update record');
    }
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch =
      record.fields.filename?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.fields.layer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.fields.etc?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStage = stageFilter === 'all' || record.fields.stage === stageFilter;

    return matchesSearch && matchesStage;
  });

  const stages = Array.from(new Set(records.map(r => r.fields.stage).filter(Boolean)));

  const getTableColor = (table: TableType) => {
    switch (table) {
      case 'nsfw_onomatopoeia':
        return {
          badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200',
          tab: 'border-amber-500 text-amber-600 dark:text-amber-400',
        };
      case 'moaning':
        return {
          badge: 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-200',
          tab: 'border-pink-500 text-pink-600 dark:text-pink-400',
        };
      case 'moaning_text':
        return {
          badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200',
          tab: 'border-blue-500 text-blue-600 dark:text-blue-400',
        };
    }
  };

  const getTableLabel = (table: TableType) => {
    switch (table) {
      case 'nsfw_onomatopoeia':
        return 'NSFW Onomatopoeia';
      case 'moaning':
        return 'Moaning';
      case 'moaning_text':
        return 'Moaning Text';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
      {/* Header */}
      <div className="mb-6 p-6 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-purple-900 dark:text-purple-100 mb-2">
              Resource Manager
            </h2>
            <p className="text-purple-800 dark:text-purple-200 text-sm">
              Manage your sound effect resources from Airtable across three categories
            </p>
          </div>
          <button
            onClick={handleStartCreate}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
          >
            + Add New
          </button>
        </div>
      </div>

      {/* Table Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex space-x-8">
          {(['nsfw_onomatopoeia', 'moaning', 'moaning_text'] as TableType[]).map((table) => (
            <button
              key={table}
              onClick={() => setActiveTable(table)}
              className={`
                py-3 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTable === table
                  ? getTableColor(table).tab
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }
              `}
            >
              {getTableLabel(table)}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="md:col-span-2">
          <input
            type="text"
            placeholder="Search by filename, layer name, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {/* Stage Filter */}
        <div>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">All Stages</option>
            {stages.map(stage => (
              <option key={stage} value={stage}>{stage}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredRecords.length} of {records.length} records
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading resources...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Create Form (Inline) */}
      {!isLoading && !error && isCreating && (
        <div className="mb-4 border-2 border-purple-300 dark:border-purple-700 rounded-lg p-4 bg-purple-50 dark:bg-purple-900/10">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-3">New Record</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Filename *
              </label>
              <input
                type="text"
                required
                value={createFormData.filename}
                onChange={(e) => setCreateFormData({ ...createFormData, filename: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Layer Name
              </label>
              <input
                type="text"
                value={createFormData.layer_name}
                onChange={(e) => setCreateFormData({ ...createFormData, layer_name: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Stage
              </label>
              <input
                type="text"
                value={createFormData.stage}
                onChange={(e) => setCreateFormData({ ...createFormData, stage: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Body Part
              </label>
              <input
                type="text"
                value={createFormData.body_part}
                onChange={(e) => setCreateFormData({ ...createFormData, body_part: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description (etc)
              </label>
              <textarea
                value={createFormData.etc}
                onChange={(e) => setCreateFormData({ ...createFormData, etc: e.target.value })}
                rows={2}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Image *
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
              />
              {imagePreview && (
                <div className="mt-2">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-32 h-32 object-contain border border-gray-300 dark:border-gray-600 rounded"
                  />
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSaveCreate}
              disabled={!createFormData.filename || !selectedFile || uploadingImage}
              className="px-4 py-1.5 text-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded transition-colors"
            >
              {uploadingImage ? 'Uploading...' : 'Save'}
            </button>
            <button
              onClick={handleCancelCreate}
              className="px-4 py-1.5 text-sm bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-800 dark:text-white rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Records List */}
      {!isLoading && !error && (
        <div className="space-y-3">
          {filteredRecords.map((record) => {
            const isEditing = editingRecordId === record.id;

            return (
              <div
                key={record.id}
                className={`border rounded-lg p-4 transition-shadow ${
                  isEditing
                    ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/10 border-2'
                    : 'border-gray-200 dark:border-gray-700 hover:shadow-md'
                }`}
              >
                {isEditing ? (
                  /* Edit Mode */
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Filename *
                        </label>
                        <input
                          type="text"
                          required
                          value={editFormData.filename}
                          onChange={(e) => setEditFormData({ ...editFormData, filename: e.target.value })}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Layer Name
                        </label>
                        <input
                          type="text"
                          value={editFormData.layer_name}
                          onChange={(e) => setEditFormData({ ...editFormData, layer_name: e.target.value })}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Stage
                        </label>
                        <input
                          type="text"
                          value={editFormData.stage}
                          onChange={(e) => setEditFormData({ ...editFormData, stage: e.target.value })}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Body Part
                        </label>
                        <input
                          type="text"
                          value={editFormData.body_part}
                          onChange={(e) => setEditFormData({ ...editFormData, body_part: e.target.value })}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Description (etc)
                        </label>
                        <textarea
                          value={editFormData.etc}
                          onChange={(e) => setEditFormData({ ...editFormData, etc: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(record.id)}
                        disabled={!editFormData.filename}
                        className="px-4 py-1.5 text-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-1.5 text-sm bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-800 dark:text-white rounded transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <div className="flex items-start gap-4">
                    {/* Thumbnail */}
                    {record.fields.image_attachment && record.fields.image_attachment.length > 0 && (
                      <div className="flex-shrink-0">
                        <img
                          src={record.fields.image_attachment[0].url}
                          alt={record.fields.filename}
                          className="w-20 h-20 object-contain rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      {/* Filename */}
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">
                        {record.fields.filename}
                      </h3>

                      {/* Layer Name */}
                      {record.fields.layer_name && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                          {record.fields.layer_name}
                        </p>
                      )}

                      {/* Description */}
                      {record.fields.etc && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          {record.fields.etc}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 items-center">
                        {/* Category Badge */}
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getTableColor(activeTable).badge}`}>
                          {getTableLabel(activeTable)}
                        </span>

                        {/* Stage */}
                        {record.fields.stage && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Stage: {record.fields.stage}
                          </span>
                        )}

                        {/* Body Part */}
                        {record.fields.body_part && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Body Part: {record.fields.body_part}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 flex-col sm:flex-row">
                      {record.fields.image_attachment && record.fields.image_attachment.length > 0 && (
                        <button
                          onClick={() => setExpandedImageId(expandedImageId === record.id ? null : record.id)}
                          className="px-3 py-1 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
                        >
                          {expandedImageId === record.id ? 'Collapse' : 'Expand'}
                        </button>
                      )}
                      <button
                        onClick={() => handleStartEdit(record)}
                        className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}

                {/* Expanded Image View */}
                {!isEditing && expandedImageId === record.id && record.fields.image_attachment && record.fields.image_attachment.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-center">
                      <img
                        src={record.fields.image_attachment[0].url}
                        alt={record.fields.filename}
                        className="max-w-full max-h-96 object-contain rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredRecords.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No resources found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Try adjusting your search or filters
          </p>
        </div>
      )}
    </div>
  );
}
