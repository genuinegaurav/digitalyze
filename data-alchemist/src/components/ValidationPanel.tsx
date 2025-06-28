'use client';

import { useState } from 'react';
import { ValidationError, Client, Worker, Task } from '@/types';
import { Sparkles, Loader2 } from 'lucide-react';

interface ValidationPanelProps {
  errors: ValidationError[];
  warnings: ValidationError[];
  data: {
    clients: Client[];
    workers: Worker[];
    tasks: Task[];
  };
  onDataUpdate: (entityType: 'clients' | 'workers' | 'tasks', updatedData: any[]) => void;
}

export default function ValidationPanel({ errors, warnings, data, onDataUpdate }: ValidationPanelProps) {
  const grouped = [
    { label: 'Errors', items: errors, color: 'red' },
    { label: 'Warnings', items: warnings, color: 'yellow' }
  ];

  // AI validation state
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const runAiValidation = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiSuggestions([]);
    try {
      const res = await fetch('/api/ai-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (json.suggestions) {
        setAiSuggestions(json.suggestions);
      } else {
        setAiError(json.error || 'Unknown error');
      }
    } catch (e) {
      setAiError('Failed to fetch AI validation.');
    } finally {
      setAiLoading(false);
    }
  };

  // One-click fix for AI suggestions
  const applyAiFix = (suggestion: any) => {
    const { entityType, entityId, field, suggestedFix } = suggestion;
    if (!suggestedFix) return;
    // Only allow valid entity keys
    const entityKey = (entityType + 's') as 'clients' | 'workers' | 'tasks';
    const idField = entityType.charAt(0).toUpperCase() + entityType.slice(1) + 'ID';
    const updated = data[entityKey].map((item: any) =>
      item[idField] === entityId
        ? { ...item, [field]: String(suggestedFix.value ?? suggestedFix.description ?? '') }
        : item
    );
    console.log(`Updated ${entityKey} after AI fix:`, updated);
    onDataUpdate(entityKey, updated);
  };

  return (
    <div className="p-6">
      <h2 className="text-lg font-bold mb-4">Validation Summary</h2>
      {grouped.map(group => (
        <div key={group.label} className="mb-6">
          <h3 className={`text-md font-semibold mb-2 ${group.label === 'Errors' ? 'text-red-800' : 'text-yellow-900'}`}>{group.label} ({group.items.length})</h3>
          {group.items.length === 0 ? (
            <p className="text-black font-bold text-sm">No {group.label.toLowerCase()} found.</p>
          ) : (
            <ul className="space-y-2">
              {group.items.map((item, idx) => (
                <li key={idx} className={`border-l-4 pl-3 py-2 bg-${group.color}-50 border-${group.color}-400 rounded`}>
                  <span className={`font-mono text-xs font-bold ${group.label === 'Errors' ? 'text-red-900' : 'text-yellow-900'}`}>[{item.entityType} #{item.entityId}]</span> <br />
                  <span className={`font-semibold ${group.label === 'Errors' ? 'text-red-900' : 'text-yellow-900'}`}>{item.field}:</span> <span className="text-black">{item.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      {/* AI Validation Section */}
      <div className="mb-6">
        <button
          onClick={runAiValidation}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          disabled={aiLoading}
        >
          {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          <span>Run AI Validation</span>
        </button>
        {aiError && <p className="text-red-600 mt-2 text-sm">{aiError}</p>}
        {Array.isArray(aiSuggestions) && aiSuggestions.length > 0 && (
          <div className="mt-4">
            <h3 className="text-md font-semibold mb-2 text-blue-700">AI Suggestions</h3>
            <ul className="space-y-2">
              {aiSuggestions.map((s, i) => (
                <li key={i} className="border-l-4 pl-3 py-2 bg-blue-50 border-blue-400 rounded flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs text-black font-bold">[{s.entityType} #{s.entityId}]</span> <br />
                    <span className="font-semibold text-gray-700">{s.field}:</span> {s.message}
                    {s.suggestedFix && (
                      <span className="ml-2 text-xs text-green-700">Suggestion: {s.suggestedFix.description || JSON.stringify(s.suggestedFix)}</span>
                    )}
                  </div>
                  {s.suggestedFix && (
                    <button
                      onClick={() => applyAiFix(s)}
                      className="ml-4 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs"
                    >
                      Apply Fix
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
} 