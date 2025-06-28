'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, Users, Briefcase, Settings, Download, Search, Sparkles } from 'lucide-react';
import { Client, Worker, Task, ValidationError, BusinessRule, PrioritizationWeights } from '@/types';
import { parseFile, transformClientData, transformWorkerData, transformTaskData } from '@/utils/parsers';
import { validator } from '@/utils/validators';
import { aiSearch } from '@/utils/ai-search';
import { rulesEngine } from '@/utils/rules-engine';
import { dataExporter } from '@/utils/export';
import DataGrid from '@/components/DataGrid';
import ValidationPanel from '@/components/ValidationPanel';
import SearchPanel from '@/components/SearchPanel';
import RulesPanel from '@/components/RulesPanel';
import PrioritizationPanel from '@/components/PrioritizationPanel';
import FileUpload from '@/components/FileUpload';

export default function Home() {
  const [data, setData] = useState<{
    clients: Client[];
    workers: Worker[];
    tasks: Task[];
  }>({ clients: [], workers: [], tasks: [] });
  
  const [validationResults, setValidationResults] = useState<{
    errors: ValidationError[];
    warnings: ValidationError[];
  }>({ errors: [], warnings: [] });
  
  const [rules, setRules] = useState<BusinessRule[]>([]);
  const [weights, setWeights] = useState<PrioritizationWeights>({
    priorityLevel: 0.3,
    fulfillment: 0.25,
    fairness: 0.2,
    costEfficiency: 0.15,
    speed: 0.1,
    workloadBalance: 0.1
  });
  
  const [activeTab, setActiveTab] = useState<'data' | 'validation' | 'search' | 'rules' | 'prioritization'>('data');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    clients: Client[];
    workers: Worker[];
    tasks: Task[];
  }>({ clients: [], workers: [], tasks: [] });

  const handleFileUpload = useCallback(async (file: File, entityType: 'clients' | 'workers' | 'tasks') => {
    try {
      const rawData = await parseFile(file);
      const headers = Object.keys(rawData[0] || {});
      
      let transformedData: Client[] | Worker[] | Task[];
      switch (entityType) {
        case 'clients':
          transformedData = transformClientData(rawData, headers);
          break;
        case 'workers':
          transformedData = transformWorkerData(rawData, headers);
          break;
        case 'tasks':
          transformedData = transformTaskData(rawData, headers);
          break;
      }
      
      setData(prev => ({
        ...prev,
        [entityType]: transformedData
      }));
      
      // Run validation
      const validation = validator.validateAll(
        entityType === 'clients' ? transformedData as Client[] : data.clients,
        entityType === 'workers' ? transformedData as Worker[] : data.workers,
        entityType === 'tasks' ? transformedData as Task[] : data.tasks
      );
      setValidationResults(validation);
      
    } catch (error) {
      console.error('Error processing file:', error);
      alert(`Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [data.clients, data.workers, data.tasks]);

  const handleDataUpdate = useCallback((entityType: 'clients' | 'workers' | 'tasks', updatedData: any[]) => {
    setData(prev => ({
      ...prev,
      [entityType]: updatedData
    }));
    
    // Re-run validation
    const validation = validator.validateAll(
      entityType === 'clients' ? updatedData : data.clients,
      entityType === 'workers' ? updatedData : data.workers,
      entityType === 'tasks' ? updatedData : data.tasks
    );
    setValidationResults(validation);
  }, [data.clients, data.workers, data.tasks]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const results = aiSearch.search(data, query);
      setSearchResults(results);
    } else {
      setSearchResults({ clients: [], workers: [], tasks: [] });
    }
  }, [data]);

  const handleRuleAdd = useCallback((rule: BusinessRule) => {
    setRules(prev => [...prev, rule]);
  }, []);

  const handleRuleUpdate = useCallback((ruleId: string, updates: Partial<BusinessRule>) => {
    setRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, ...updates } : rule
    ));
  }, []);

  const handleRuleDelete = useCallback((ruleId: string) => {
    setRules(prev => prev.filter(rule => rule.id !== ruleId));
  }, []);

  const handleExport = useCallback(() => {
    const exportData = {
      clients: data.clients,
      workers: data.workers,
      tasks: data.tasks,
      rules,
      weights
    };
    
    const timestamp = new Date().toISOString().split('T')[0];
    dataExporter.exportAll(exportData, `data_alchemist_export_${timestamp}`);
  }, [data, rules, weights]);

  // Only show data grid and run validation if all three are uploaded
  const allDataUploaded = data.clients.length > 0 && data.workers.length > 0 && data.tasks.length > 0;

  const hasData = data.clients.length > 0 || data.workers.length > 0 || data.tasks.length > 0;
  const hasErrors = validationResults.errors.length > 0;
  const hasWarnings = validationResults.warnings.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* File Upload Section */}
        {!allDataUploaded && (
          <div className="mb-12">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-extrabold text-gray-900 mb-3 tracking-tight">
                Transform Your Spreadsheets with AI
              </h2>
              <p className="text-lg text-black font-bold mb-8 max-w-2xl mx-auto">
                Upload your CSV or Excel files for clients, workers, and tasks. Our AI will help you clean, validate, and optimize your data for resource allocation.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <FileUpload
                title="Clients"
                description="Upload client data with priorities and task requests"
                icon={<Users className="w-8 h-8" />}
                onUpload={(file: File) => handleFileUpload(file, 'clients')}
                acceptedTypes=".csv,.xlsx,.xls"
              />
              <FileUpload
                title="Workers"
                description="Upload worker data with skills and availability"
                icon={<Briefcase className="w-8 h-8" />}
                onUpload={(file: File) => handleFileUpload(file, 'workers')}
                acceptedTypes=".csv,.xlsx,.xls"
              />
              <FileUpload
                title="Tasks"
                description="Upload task data with requirements and constraints"
                icon={<FileText className="w-8 h-8" />}
                onUpload={(file: File) => handleFileUpload(file, 'tasks')}
                acceptedTypes=".csv,.xlsx,.xls"
              />
            </div>
          </div>
        )}
        {/* Data Management Section */}
        {allDataUploaded && (
          <>
            {/* Navigation Tabs */}
            <div className="mb-8">
              <nav className="flex space-x-8 border-b border-gray-200 bg-white rounded-t-lg shadow-sm px-4 py-2">
                {[
                  { id: 'data', label: 'Data Grid', icon: <FileText className="w-4 h-4" /> },
                  { id: 'validation', label: 'Validation', icon: <Settings className="w-4 h-4" />, badge: validationResults.errors.length + validationResults.warnings.length },
                  { id: 'search', label: 'AI Search', icon: <Search className="w-4 h-4" /> },
                  { id: 'rules', label: 'Business Rules', icon: <Settings className="w-4 h-4" /> },
                  { id: 'prioritization', label: 'Prioritization', icon: <Settings className="w-4 h-4" /> }
                ].map((tab) => (
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
                    {tab.badge && tab.badge > 0 && (
                      <span className="bg-gray-100 text-black font-bold text-xs px-2 py-0.5 rounded-full">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
            {/* Tab Content */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-100 p-6">
              {activeTab === 'data' && (
                <DataGrid
                  data={data}
                  onDataUpdate={handleDataUpdate}
                  validationResults={validationResults}
                />
              )}
              
              {activeTab === 'validation' && (
                <ValidationPanel
                  errors={validationResults.errors}
                  warnings={validationResults.warnings}
                  data={data}
                  onDataUpdate={handleDataUpdate}
                />
              )}
              
              {activeTab === 'search' && (
                <SearchPanel
                  data={data}
                  searchQuery={searchQuery}
                  searchResults={searchResults}
                  onSearch={handleSearch}
                  onDataUpdate={handleDataUpdate}
                />
              )}
              
              {activeTab === 'rules' && (
                <RulesPanel
                  rules={rules}
                  data={data}
                  onRuleAdd={handleRuleAdd}
                  onRuleUpdate={handleRuleUpdate}
                  onRuleDelete={handleRuleDelete}
                />
              )}
              
              {activeTab === 'prioritization' && (
                <PrioritizationPanel
                  weights={weights}
                  onWeightsChange={setWeights}
                />
              )}
        </div>
          </>
        )}
      </main>
    </div>
  );
}
