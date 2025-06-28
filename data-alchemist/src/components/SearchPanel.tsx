'use client';

import { useState } from 'react';
import { Client, Worker, Task } from '@/types';
import { aiSearch } from '@/utils/ai-search';
import { Search, Sparkles, Loader2, Check } from 'lucide-react';

interface SearchPanelProps {
  data: {
    clients: Client[];
    workers: Worker[];
    tasks: Task[];
  };
  searchQuery: string;
  searchResults: {
    clients: Client[];
    workers: Worker[];
    tasks: Task[];
  };
  onSearch: (query: string) => void;
  onDataUpdate?: (entityType: 'clients' | 'workers' | 'tasks', updatedData: any[]) => void;
}

export default function SearchPanel({ data, searchQuery, searchResults, onSearch, onDataUpdate }: SearchPanelProps) {
  const [input, setInput] = useState(searchQuery);
  const suggestions = aiSearch.getQuerySuggestions(data);

  // AI modification state
  const [modInput, setModInput] = useState('');
  const [modLoading, setModLoading] = useState(false);
  const [modifications, setModifications] = useState<any[]>([]);
  const [modError, setModError] = useState<string | null>(null);
  const [modApplied, setModApplied] = useState(false);

  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSearch = async () => {
    setSearchLoading(true);
    setSearchError(null);
    try {
      const res = await fetch('/api/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: input, ...data })
      });
      const json = await res.json();
      if (json.clients && json.workers && json.tasks) {
        onSearch(input);
        // Directly update the results in the parent if needed, or you can lift state up
      } else if (json.error) {
        setSearchError(json.error);
      } else {
        setSearchError('Unknown error');
      }
    } catch (e) {
      setSearchError('Failed to fetch AI search results.');
    } finally {
      setSearchLoading(false);
    }
  };

  // Run LLM-powered modification
  const runModification = async () => {
    setModLoading(true);
    setModError(null);
    setModifications([]);
    setModApplied(false);
    try {
      const res = await fetch('/api/ai-modify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: modInput, ...data })
      });
      const json = await res.json();
      if (json.modifications) {
        setModifications(json.modifications);
      } else {
        setModError(json.error || 'Unknown error');
      }
    } catch (e) {
      setModError('Failed to fetch AI modification.');
    } finally {
      setModLoading(false);
    }
  };

  // Apply all modifications
  const applyModifications = () => {
    if (!onDataUpdate) return;
    let updated = { ...data };
    for (const mod of modifications) {
      const entityKey = (mod.entityType + 's') as 'clients' | 'workers' | 'tasks';
      const idField = mod.entityType.charAt(0).toUpperCase() + mod.entityType.slice(1) + 'ID';
      updated[entityKey] = updated[entityKey].map((item: any) =>
        item[idField] === mod.entityId ? { ...item, [mod.field]: mod.newValue } : item
      );
    }
    // Call update for each entity type that changed
    (['clients', 'workers', 'tasks'] as const).forEach(type => {
      if (updated[type] !== data[type]) {
        onDataUpdate(type, updated[type]);
      }
    });
    setModApplied(true);
  };

  return (
    <div className="p-6">
      <h2 className="text-lg font-bold mb-4 text-blue-800">AI Natural Language Search</h2>
      <div className="flex items-center space-x-2 mb-4">
        <input
          type="text"
          value={input}
          onChange={handleInput}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="e.g. All tasks with duration more than 1 phase and phase 2 in preferred phases"
          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSearch}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          disabled={searchLoading}
        >
          {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </button>
      </div>
      {searchError && <p className="text-red-600 mt-2 text-sm">{searchError}</p>}
      <div className="mb-4">
        <h3 className="text-sm font-bold mb-2 text-blue-900">Suggestions</h3>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => { setInput(s); onSearch(s); }}
              className="bg-gray-100 hover:bg-blue-100 text-blue-900 px-3 py-1 rounded text-xs font-semibold"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-bold mb-2 text-blue-900">Results</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h4 className="font-bold text-blue-900 mb-1">Clients</h4>
            <ul className="text-xs space-y-1">
              {searchResults.clients.map((c, i) => (
                <li key={i} className="bg-blue-50 rounded px-2 py-1 text-blue-900 font-semibold">{c.ClientName} (ID: {c.ClientID})</li>
              ))}
              {searchResults.clients.length === 0 && <li className="text-blue-900 font-bold">No results</li>}
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-purple-900 mb-1">Workers</h4>
            <ul className="text-xs space-y-1">
              {searchResults.workers.map((w, i) => (
                <li key={i} className="bg-purple-50 rounded px-2 py-1 text-purple-900 font-semibold">{w.WorkerName} (ID: {w.WorkerID})</li>
              ))}
              {searchResults.workers.length === 0 && <li className="text-purple-900 font-bold">No results</li>}
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-green-900 mb-1">Tasks</h4>
            <ul className="text-xs space-y-1">
              {searchResults.tasks.map((t, i) => (
                <li key={i} className="bg-green-50 rounded px-2 py-1 text-green-900 font-semibold">{t.TaskName} (ID: {t.TaskID})</li>
              ))}
              {searchResults.tasks.length === 0 && <li className="text-green-900 font-bold">No results</li>}
            </ul>
          </div>
        </div>
      </div>

      {/* AI Data Modification Section */}
      <div className="mt-8">
        <h2 className="text-lg font-bold mb-2 flex items-center gap-2 text-yellow-700"><Sparkles className="w-5 h-5 text-yellow-500" /> AI Data Modification</h2>
        <div className="flex items-center space-x-2 mb-2">
          <input
            type="text"
            value={modInput}
            onChange={e => setModInput(e.target.value)}
            placeholder="e.g. Set all clients in GroupA to PriorityLevel 5"
            className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
          <button
            onClick={runModification}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded flex items-center gap-1"
            disabled={modLoading}
          >
            {modLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>Suggest Changes</span>
          </button>
        </div>
        {modError && <p className="text-red-600 mt-2 text-sm">{modError}</p>}
        {modifications.length > 0 && (
          <div className="mt-4">
            <h3 className="text-md font-semibold mb-2 text-yellow-700">AI-Suggested Modifications</h3>
            <ul className="space-y-2">
              {modifications.map((mod, i) => (
                <li key={i} className="border-l-4 pl-3 py-2 bg-yellow-50 border-yellow-400 rounded flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs text-gray-500">[{mod.entityType} #{mod.entityId}]</span> <br />
                    <span className="font-semibold text-gray-700">{mod.field}:</span> <span className="text-blue-700">{mod.newValue}</span>
                    <span className="ml-2 text-xs text-gray-500">{mod.reason}</span>
                  </div>
                </li>
              ))}
            </ul>
            {onDataUpdate && (
              <button
                onClick={applyModifications}
                className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-1"
                disabled={modApplied}
              >
                <Check className="w-4 h-4" /> Apply All Changes
              </button>
            )}
            {modApplied && <p className="text-green-700 mt-2 text-sm">Changes applied!</p>}
          </div>
        )}
      </div>
    </div>
  );
} 