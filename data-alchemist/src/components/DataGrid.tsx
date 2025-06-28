'use client';

import { useState } from 'react';
import { Edit2, Save, X, Users, Briefcase, FileText } from 'lucide-react';
import { Client, Worker, Task, ValidationError } from '@/types';

interface DataGridProps {
  data: {
    clients: Client[];
    workers: Worker[];
    tasks: Task[];
  };
  onDataUpdate: (entityType: 'clients' | 'workers' | 'tasks', updatedData: any[]) => void;
  validationResults: {
    errors: ValidationError[];
    warnings: ValidationError[];
  };
}

export default function DataGrid({ data, onDataUpdate, validationResults }: DataGridProps) {
  const [activeTab, setActiveTab] = useState<'clients' | 'workers' | 'tasks'>('clients');
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const tabs = [
    { id: 'clients', label: 'Clients', icon: <Users className="w-4 h-4" />, count: data.clients.length },
    { id: 'workers', label: 'Workers', icon: <Briefcase className="w-4 h-4" />, count: data.workers.length },
    { id: 'tasks', label: 'Tasks', icon: <FileText className="w-4 h-4" />, count: data.tasks.length }
  ];

  const getCurrentData = () => {
    switch (activeTab) {
      case 'clients': return data.clients;
      case 'workers': return data.workers;
      case 'tasks': return data.tasks;
    }
  };

  const getHeaders = () => {
    const currentData = getCurrentData();
    if (currentData.length === 0) return [];
    return Object.keys(currentData[0]);
  };

  const getValidationErrors = (rowIndex: number, field: string) => {
    return validationResults.errors.filter(
      error => error.entityType === activeTab.slice(0, -1) && 
               error.rowIndex === rowIndex && 
               error.field === field
    );
  };

  const getValidationWarnings = (rowIndex: number, field: string) => {
    return validationResults.warnings.filter(
      warning => warning.entityType === activeTab.slice(0, -1) && 
                 warning.rowIndex === rowIndex && 
                 warning.field === field
    );
  };

  const handleEdit = (rowIndex: number, field: string, value: string) => {
    setEditingCell({ row: rowIndex, col: field });
    setEditValue(value);
  };

  const handleSave = () => {
    if (!editingCell) return;

    const currentData = getCurrentData();
    const updatedData = [...currentData];
    updatedData[editingCell.row] = {
      ...updatedData[editingCell.row],
      [editingCell.col]: editValue
    };

    onDataUpdate(activeTab, updatedData);
    setEditingCell(null);
    setEditValue('');
  };

  const handleCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const renderCell = (item: any, field: string, rowIndex: number) => {
    const isEditing = editingCell?.row === rowIndex && editingCell?.col === field;
    const errors = getValidationErrors(rowIndex, field);
    const warnings = getValidationWarnings(rowIndex, field);
    const hasError = errors.length > 0;
    const hasWarning = warnings.length > 0;

    if (isEditing) {
      return (
        <div className="flex items-center space-x-1">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyPress}
            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
            autoFocus
          />
          <button
            onClick={handleSave}
            className="p-1 text-green-600 hover:text-green-700"
          >
            <Save className="w-3 h-3" />
          </button>
          <button
            onClick={handleCancel}
            className="p-1 text-red-600 hover:text-red-700"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between group">
        <span className={`text-sm font-semibold ${hasError ? 'text-red-800' : hasWarning ? 'text-yellow-900' : 'text-black'}`}>
          {String(item[field])}
        </span>
        <button
          onClick={() => handleEdit(rowIndex, field, String(item[field]))}
          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 transition-opacity"
        >
          <Edit2 className="w-3 h-3" />
        </button>
      </div>
    );
  };

  const currentData = getCurrentData();
  const headers = getHeaders();

  if (currentData.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-gray-400 mb-4">
          {activeTab === 'clients' && <Users className="w-12 h-12 mx-auto" />}
          {activeTab === 'workers' && <Briefcase className="w-12 h-12 mx-auto" />}
          {activeTab === 'tasks' && <FileText className="w-12 h-12 mx-auto" />}
        </div>
        <p className="text-gray-500">No {activeTab} data available</p>
        <p className="text-sm text-gray-400">Upload a file to get started</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Tab Navigation */}
      <div className="mb-6">
        <nav className="flex space-x-8 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {headers.map((header) => (
                <th
                  key={header}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentData.map((item, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                {headers.map((header) => {
                  const errors = getValidationErrors(rowIndex, header);
                  const warnings = getValidationWarnings(rowIndex, header);
                  const hasError = errors.length > 0;
                  const hasWarning = warnings.length > 0;

                  return (
                    <td
                      key={header}
                      className={`px-6 py-4 whitespace-nowrap text-sm ${
                        hasError ? 'bg-red-50' : hasWarning ? 'bg-yellow-50' : ''
                      }`}
                    >
                      {renderCell(item, header, rowIndex)}
                      {(hasError || hasWarning) && (
                        <div className="mt-1">
                          {errors.map((error, index) => (
                            <p key={index} className="text-xs text-red-600">
                              {error.message}
                            </p>
                          ))}
                          {warnings.map((warning, index) => (
                            <p key={index} className="text-xs text-yellow-600">
                              {warning.message}
                            </p>
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="mt-6 flex items-center justify-between text-sm text-gray-500">
        <div>
          Showing {currentData.length} {activeTab}
        </div>
        <div className="flex items-center space-x-4">
          {validationResults.errors.length > 0 && (
            <span className="text-red-600">
              {validationResults.errors.length} errors
            </span>
          )}
          {validationResults.warnings.length > 0 && (
            <span className="text-yellow-600">
              {validationResults.warnings.length} warnings
            </span>
          )}
        </div>
      </div>
    </div>
  );
} 