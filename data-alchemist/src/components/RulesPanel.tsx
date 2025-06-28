'use client';

import { useState } from 'react';
import { BusinessRule, Client, Worker, Task } from '@/types';
import { rulesEngine } from '@/utils/rules-engine';
import { Plus, Trash2, Edit2, Check, X, Sparkles } from 'lucide-react';

interface RulesPanelProps {
  rules: BusinessRule[];
  data: {
    clients: Client[];
    workers: Worker[];
    tasks: Task[];
  };
  onRuleAdd: (rule: BusinessRule) => void;
  onRuleUpdate: (ruleId: string, updates: Partial<BusinessRule>) => void;
  onRuleDelete: (ruleId: string) => void;
}

export default function RulesPanel({ rules, data, onRuleAdd, onRuleUpdate, onRuleDelete }: RulesPanelProps) {
  const [nlInput, setNlInput] = useState('');
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);

  const handleAddRule = () => {
    if (!nlInput.trim()) return;
    const rule = rulesEngine.parseNaturalLanguageRule(nlInput, data);
    if (rule) {
      onRuleAdd(rule);
      setNlInput('');
    } else {
      alert('Could not parse rule from input. Try a different phrasing.');
    }
  };

  const fetchAIRecommendations = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch('/api/ai-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (json.rules && Array.isArray(json.rules)) {
        setAiRecommendations(json.rules);
      } else if (json.error) {
        setAiError(json.error);
      } else {
        setAiError('Unknown error');
      }
    } catch (e) {
      setAiError('Failed to fetch AI rule recommendations.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-lg font-bold mb-4">Business Rules</h2>
      <div className="mb-4 flex items-center space-x-2">
        <input
          type="text"
          value={nlInput}
          onChange={e => setNlInput(e.target.value)}
          placeholder="e.g. Tasks T1 and T2 must run together"
          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleAddRule}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center space-x-1"
        >
          <Plus className="w-4 h-4" />
          <span>Add Rule</span>
        </button>
        <button
          onClick={() => { setShowRecommendations(r => !r); if (!showRecommendations) fetchAIRecommendations(); }}
          className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-2 rounded flex items-center space-x-1"
        >
          <Sparkles className="w-4 h-4" />
          <span>AI Suggestions</span>
        </button>
      </div>
      {showRecommendations && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold mb-2 text-yellow-900">AI Rule Recommendations</h3>
          {aiLoading && <p className="text-yellow-900">Loading...</p>}
          {aiError && <p className="text-red-800 mt-2 text-sm">{aiError}</p>}
          <ul className="space-y-2">
            {aiRecommendations.map((rec, i) => (
              <li key={i} className="bg-yellow-50 border-l-4 border-yellow-400 px-3 py-2 rounded flex items-center justify-between">
                <span className="text-yellow-900 font-semibold">{rec.description}</span>
                <button
                  onClick={() => onRuleAdd({ ...rec, enabled: true })}
                  className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded"
                >
                  Add
                </button>
              </li>
            ))}
            {aiRecommendations.length === 0 && !aiLoading && !aiError && <li className="text-black">No recommendations</li>}
          </ul>
        </div>
      )}
      <div>
        <h3 className="text-sm font-semibold mb-2 text-gray-700">Current Rules</h3>
        <ul className="space-y-2">
          {rules.map((rule, i) => (
            <li key={rule.id} className="bg-gray-50 border-l-4 border-blue-400 px-3 py-2 rounded flex items-center justify-between">
              <div>
                <span className="font-semibold text-blue-700 mr-2">{rule.name}</span>
                <span className="text-xs text-gray-500">({rule.type})</span>
                <div className="text-xs text-gray-600">{rule.description}</div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onRuleUpdate(rule.id, { enabled: !rule.enabled })}
                  className={`text-xs px-2 py-1 rounded ${rule.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}
                >
                  {rule.enabled ? 'Enabled' : 'Disabled'}
                </button>
                <button
                  onClick={() => onRuleDelete(rule.id)}
                  className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded"
                >
                  <Trash2 className="w-3 h-3 inline" /> Delete
                </button>
              </div>
            </li>
          ))}
          {rules.length === 0 && <li className="text-gray-400">No rules defined</li>}
        </ul>
      </div>
    </div>
  );
} 