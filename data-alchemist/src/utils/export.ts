import { ExportData, Client, Worker, Task, BusinessRule, PrioritizationWeights } from '@/types';
import * as XLSX from 'xlsx';

export class DataExporter {
  exportToCSV(data: Client[] | Worker[] | Task[], filename: string): void {
    const csvContent = this.convertToCSV(data);
    this.downloadFile(csvContent, filename, 'text/csv');
  }

  exportToExcel(data: { clients: Client[]; workers: Worker[]; tasks: Task[] }, filename: string): void {
    const workbook = XLSX.utils.book_new();
    
    // Add clients sheet
    const clientsSheet = XLSX.utils.json_to_sheet(data.clients);
    XLSX.utils.book_append_sheet(workbook, clientsSheet, 'Clients');
    
    // Add workers sheet
    const workersSheet = XLSX.utils.json_to_sheet(data.workers);
    XLSX.utils.book_append_sheet(workbook, workersSheet, 'Workers');
    
    // Add tasks sheet
    const tasksSheet = XLSX.utils.json_to_sheet(data.tasks);
    XLSX.utils.book_append_sheet(workbook, tasksSheet, 'Tasks');
    
    // Generate Excel file
    XLSX.writeFile(workbook, filename);
  }

  exportRules(rules: BusinessRule[], weights: PrioritizationWeights, filename: string): void {
    const rulesData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      rules: rules.filter(rule => rule.enabled),
      weights,
      metadata: {
        totalRules: rules.length,
        enabledRules: rules.filter(rule => rule.enabled).length,
        ruleTypes: [...new Set(rules.map(rule => rule.type))]
      }
    };

    const jsonContent = JSON.stringify(rulesData, null, 2);
    this.downloadFile(jsonContent, filename, 'application/json');
  }

  exportAll(data: ExportData, baseFilename: string): void {
    // Export individual CSV files
    this.exportToCSV(data.clients, `${baseFilename}_clients.csv`);
    this.exportToCSV(data.workers, `${baseFilename}_workers.csv`);
    this.exportToCSV(data.tasks, `${baseFilename}_tasks.csv`);
    
    // Export rules
    this.exportRules(data.rules, data.weights, `${baseFilename}_rules.json`);
    
    // Export Excel file with all sheets
    this.exportToExcel({
      clients: data.clients,
      workers: data.workers,
      tasks: data.tasks
    }, `${baseFilename}_complete.xlsx`);
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        // Handle special cases for CSV formatting
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
  }

  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Generate a comprehensive export report
  generateExportReport(data: ExportData): string {
    const report = {
      summary: {
        totalClients: data.clients.length,
        totalWorkers: data.workers.length,
        totalTasks: data.tasks.length,
        totalRules: data.rules.length,
        enabledRules: data.rules.filter(r => r.enabled).length
      },
      validation: {
        clientsWithErrors: 0,
        workersWithErrors: 0,
        tasksWithErrors: 0
      },
      rules: {
        byType: data.rules.reduce((acc, rule) => {
          acc[rule.type] = (acc[rule.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      },
      weights: data.weights,
      recommendations: this.generateRecommendations(data)
    };

    return JSON.stringify(report, null, 2);
  }

  private generateRecommendations(data: ExportData): string[] {
    const recommendations: string[] = [];

    // Analyze data patterns and provide recommendations
    const clientPriorities = data.clients.map(c => c.PriorityLevel);
    const avgPriority = clientPriorities.reduce((sum, p) => sum + p, 0) / clientPriorities.length;
    
    if (avgPriority > 4) {
      recommendations.push('High average client priority detected. Consider load balancing strategies.');
    }

    const workerLoads = data.workers.map(w => w.MaxLoadPerPhase);
    const avgLoad = workerLoads.reduce((sum, l) => sum + l, 0) / workerLoads.length;
    
    if (avgLoad > 3) {
      recommendations.push('High average worker load detected. Consider adding more workers or load limits.');
    }

    const taskDurations = data.tasks.map(t => t.Duration);
    const maxDuration = Math.max(...taskDurations);
    
    if (maxDuration > 5) {
      recommendations.push('Long duration tasks detected. Consider breaking them into smaller tasks.');
    }

    const enabledRules = data.rules.filter(r => r.enabled);
    if (enabledRules.length === 0) {
      recommendations.push('No business rules enabled. Consider adding rules for better resource allocation.');
    }

    return recommendations;
  }
}

export const dataExporter = new DataExporter(); 