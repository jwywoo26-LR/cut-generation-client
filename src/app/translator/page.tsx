'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import TableManagement from './components/TableManagement';
import CharacterManagement from './components/CharacterManagement';
import TranslationRecords from './components/TranslationRecords';

interface AirtableTable {
  id: string;
  name: string;
  primaryFieldId: string;
  fields: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
}

export default function TranslatorPage() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Table management state
  const [tables, setTables] = useState<AirtableTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [isLoadingTables, setIsLoadingTables] = useState(false);

  // Records state
  const [records, setRecords] = useState<AirtableRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);

  // Persona state
  const [availableSeries, setAvailableSeries] = useState<string[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<string>('');
  const [personaRecords, setPersonaRecords] = useState<AirtableRecord[]>([]);
  const [filteredPersonas, setFilteredPersonas] = useState<AirtableRecord[]>([]);
  const [isLoadingPersonas, setIsLoadingPersonas] = useState(false);

  // Check if user is already authenticated
  useEffect(() => {
    const authStatus = sessionStorage.getItem('translatorAuth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Load tables when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadTables();
      loadPersonaSeries();
    }
  }, [isAuthenticated]);

  // Load records when table is selected
  useEffect(() => {
    if (selectedTable) {
      loadRecords();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTable]);

  // Filter personas when series is selected
  useEffect(() => {
    if (selectedSeries) {
      const filtered = personaRecords.filter(
        (record) => record.fields.series === selectedSeries
      );
      setFilteredPersonas(filtered);
    } else {
      setFilteredPersonas([]);
    }
  }, [selectedSeries, personaRecords]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError('');

    try {
      const response = await fetch('/api/translator/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsAuthenticated(true);
        sessionStorage.setItem('translatorAuth', 'true');
      } else {
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
    sessionStorage.removeItem('translatorAuth');
    setPassword('');
  };

  const loadTables = async () => {
    setIsLoadingTables(true);
    try {
      const response = await fetch('/api/airtable/list-tables');
      if (response.ok) {
        const data = await response.json();
        const allTables = data.tables || [];

        // Filter tables to only show those with the correct translator structure
        const requiredFields = ['id', 'kor', 'jpn_formal', 'jpn_friendly', 'jpn_casual', 'jpn_narrative', 'character_name', 'regenerate_status'];
        const translatorTables = allTables.filter((table: AirtableTable) => {
          const tableFieldNames = table.fields.map(f => f.name);
          return requiredFields.every(fieldName => tableFieldNames.includes(fieldName));
        });

        setTables(translatorTables);
      }
    } catch (error) {
      console.error('Failed to load tables:', error);
    } finally {
      setIsLoadingTables(false);
    }
  };

  const loadPersonaSeries = async () => {
    setIsLoadingPersonas(true);
    try {
      const response = await fetch('/api/airtable/get-persona-series');
      if (response.ok) {
        const data = await response.json();
        setPersonaRecords(data.records || []);
        setAvailableSeries(data.availableSeries || []);
      }
    } catch (error) {
      console.error('Failed to load persona series:', error);
    } finally {
      setIsLoadingPersonas(false);
    }
  };

  const loadRecords = async () => {
    if (!selectedTable) return;

    setIsLoadingRecords(true);
    try {
      const response = await fetch(`/api/airtable/get-records?tableName=${encodeURIComponent(selectedTable)}`);
      const data = await response.json();

      if (response.ok) {
        // Sort records by createdTime in ascending order (oldest to latest)
        const sortedRecords = (data.records || []).sort((a: AirtableRecord, b: AirtableRecord) => {
          return new Date(a.createdTime).getTime() - new Date(b.createdTime).getTime();
        });
        setRecords(sortedRecords);
      } else {
        console.error('Failed to load records:', data);
      }
    } catch (error) {
      console.error('Failed to load records:', error);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  // Update a single record locally without refetching all records
  const updateRecordLocally = (recordId: string, updatedFields: Record<string, unknown>) => {
    setRecords(prevRecords =>
      prevRecords.map(record =>
        record.id === recordId
          ? { ...record, fields: { ...record.fields, ...updatedFields } }
          : record
      )
    );
  };

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
              Translator
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              Please enter your password to access the translator
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
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>

            {authError && (
              <div className="text-red-600 dark:text-red-400 text-sm text-center">
                {authError}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isAuthLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAuthLoading ? 'Authenticating...' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Main translator interface
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
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
              Korean to Japanese Translator
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Top Row - Table Management and Character Management */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <TableManagement
            tables={tables}
            selectedTable={selectedTable}
            isLoadingTables={isLoadingTables}
            onTableSelect={setSelectedTable}
            onTableCreated={loadTables}
          />

          <CharacterManagement
            availableSeries={availableSeries}
            selectedSeries={selectedSeries}
            filteredPersonas={filteredPersonas}
            isLoadingPersonas={isLoadingPersonas}
            onSeriesSelect={setSelectedSeries}
            onPersonasUpdated={loadPersonaSeries}
          />
        </div>

        {/* Translation Records - Full Width */}
        <TranslationRecords
          selectedTable={selectedTable}
          selectedSeries={selectedSeries}
          records={records}
          filteredPersonas={filteredPersonas}
          isLoadingRecords={isLoadingRecords}
          onRecordsUpdated={loadRecords}
          onRecordUpdatedLocally={updateRecordLocally}
        />
      </div>
    </div>
  );
}
