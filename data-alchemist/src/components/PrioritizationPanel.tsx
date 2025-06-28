'use client';

import { PrioritizationWeights } from '@/types';
import { useState } from 'react';

interface PrioritizationPanelProps {
  weights: PrioritizationWeights;
  onWeightsChange: (weights: PrioritizationWeights) => void;
}

const presets = [
  {
    name: 'Maximize Fulfillment',
    weights: {
      priorityLevel: 0.1,
      fulfillment: 0.5,
      fairness: 0.1,
      costEfficiency: 0.1,
      speed: 0.1,
      workloadBalance: 0.1
    }
  },
  {
    name: 'Fair Distribution',
    weights: {
      priorityLevel: 0.15,
      fulfillment: 0.15,
      fairness: 0.4,
      costEfficiency: 0.1,
      speed: 0.1,
      workloadBalance: 0.1
    }
  },
  {
    name: 'Minimize Workload',
    weights: {
      priorityLevel: 0.1,
      fulfillment: 0.1,
      fairness: 0.1,
      costEfficiency: 0.1,
      speed: 0.1,
      workloadBalance: 0.5
    }
  }
];

export default function PrioritizationPanel({ weights, onWeightsChange }: PrioritizationPanelProps) {
  const [localWeights, setLocalWeights] = useState(weights);

  const handleSlider = (key: keyof PrioritizationWeights, value: number) => {
    const updated = { ...localWeights, [key]: value };
    setLocalWeights(updated);
    onWeightsChange(updated);
  };

  const handlePreset = (preset: typeof presets[0]) => {
    setLocalWeights(preset.weights);
    onWeightsChange(preset.weights);
  };

  return (
    <div className="p-6">
      <h2 className="text-lg font-bold mb-4">Prioritization & Weights</h2>
      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-2 text-gray-700">Presets</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {presets.map((preset, i) => (
            <button
              key={i}
              onClick={() => handlePreset(preset)}
              className="bg-gray-100 hover:bg-blue-100 text-gray-700 px-3 py-1 rounded text-xs"
            >
              {preset.name}
            </button>
          ))}
        </div>
        <h3 className="text-sm font-semibold mb-2 text-gray-700">Adjust Weights</h3>
        <div className="space-y-4">
          {Object.entries(localWeights).map(([key, value]) => (
            <div key={key} className="flex items-center space-x-4">
              <label className="w-40 text-sm text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={value}
                onChange={e => handleSlider(key as keyof PrioritizationWeights, parseFloat(e.target.value))}
                className="flex-1"
              />
              <span className="w-12 text-right text-xs text-gray-500">{(value * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
      <div className="text-xs text-gray-400 mt-4">
        <p>These weights will be included in the exported rules.json file for downstream allocation tools.</p>
      </div>
    </div>
  );
} 