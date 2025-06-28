import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Client, Worker, Task, ValidationError } from '@/types';

// AI-enabled header mapping
const headerMappings = {
  clients: {
    'ClientID': ['clientid', 'client_id', 'id', 'client id'],
    'ClientName': ['clientname', 'client_name', 'name', 'client name'],
    'PriorityLevel': ['prioritylevel', 'priority_level', 'priority', 'level'],
    'RequestedTaskIDs': ['requestedtaskids', 'requested_task_ids', 'tasks', 'taskids'],
    'GroupTag': ['grouptag', 'group_tag', 'group', 'tag'],
    'AttributesJSON': ['attributesjson', 'attributes_json', 'attributes', 'json']
  },
  workers: {
    'WorkerID': ['workerid', 'worker_id', 'id', 'worker id'],
    'WorkerName': ['workername', 'worker_name', 'name', 'worker name'],
    'Skills': ['skills', 'skill', 'capabilities'],
    'AvailableSlots': ['availableslots', 'available_slots', 'slots', 'available'],
    'MaxLoadPerPhase': ['maxloadperphase', 'max_load_per_phase', 'maxload', 'load'],
    'WorkerGroup': ['workergroup', 'worker_group', 'group'],
    'QualificationLevel': ['qualificationlevel', 'qualification_level', 'qualification', 'level']
  },
  tasks: {
    'TaskID': ['taskid', 'task_id', 'id', 'task id'],
    'TaskName': ['taskname', 'task_name', 'name', 'task name'],
    'Category': ['category', 'cat', 'type'],
    'Duration': ['duration', 'dur', 'time'],
    'RequiredSkills': ['requiredskills', 'required_skills', 'skills', 'required'],
    'PreferredPhases': ['preferredphases', 'preferred_phases', 'phases', 'preferred'],
    'MaxConcurrent': ['maxconcurrent', 'max_concurrent', 'concurrent', 'max']
  }
};

export function mapHeaders(headers: string[], entityType: keyof typeof headerMappings): string[] {
  const mappings = headerMappings[entityType];
  return headers.map(header => {
    const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const [standardHeader, variations] of Object.entries(mappings)) {
      if (variations.some(v => v.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedHeader)) {
        return standardHeader;
      }
    }
    return header; // Return original if no mapping found
  });
}

export function parseCSV(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error(`CSV parsing errors: ${results.errors.map(e => e.message).join(', ')}`));
        } else {
          resolve(results.data);
        }
      },
      error: (error) => reject(error)
    });
  });
}

export function parseExcel(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          reject(new Error('Excel file must have at least a header row and one data row'));
          return;
        }
        
        const headers = jsonData[0] as string[];
        const rows = jsonData.slice(1) as any[][];
        
        const result = rows.map(row => {
          const obj: any = {};
          headers.forEach((header, index) => {
            obj[header] = row[index];
          });
          return obj;
        });
        
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read Excel file'));
    reader.readAsArrayBuffer(file);
  });
}

export function parseFile(file: File): Promise<any[]> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (extension === 'csv') {
    return parseCSV(file);
  } else if (extension === 'xlsx' || extension === 'xls') {
    return parseExcel(file);
  } else {
    throw new Error('Unsupported file format. Please upload CSV or Excel files.');
  }
}

export function transformClientData(data: any[], headers: string[]): Client[] {
  const mappedHeaders = mapHeaders(headers, 'clients');
  
  return data.map((row, index) => ({
    ClientID: String(row[mappedHeaders[0]] || `CLIENT_${index + 1}`),
    ClientName: String(row[mappedHeaders[1]] || `Client ${index + 1}`),
    PriorityLevel: parseInt(String(row[mappedHeaders[2]] || '3')),
    RequestedTaskIDs: String(row[mappedHeaders[3]] || ''),
    GroupTag: String(row[mappedHeaders[4]] || 'default'),
    AttributesJSON: String(row[mappedHeaders[5]] || '{}')
  }));
}

export function transformWorkerData(data: any[], headers: string[]): Worker[] {
  const mappedHeaders = mapHeaders(headers, 'workers');
  
  return data.map((row, index) => ({
    WorkerID: String(row[mappedHeaders[0]] || `WORKER_${index + 1}`),
    WorkerName: String(row[mappedHeaders[1]] || `Worker ${index + 1}`),
    Skills: String(row[mappedHeaders[2]] || ''),
    AvailableSlots: String(row[mappedHeaders[3]] || '[]'),
    MaxLoadPerPhase: parseInt(String(row[mappedHeaders[4]] || '1')),
    WorkerGroup: String(row[mappedHeaders[5]] || 'default'),
    QualificationLevel: String(row[mappedHeaders[6]] || 'standard')
  }));
}

export function transformTaskData(data: any[], headers: string[]): Task[] {
  const mappedHeaders = mapHeaders(headers, 'tasks');
  
  return data.map((row, index) => ({
    TaskID: String(row[mappedHeaders[0]] || `TASK_${index + 1}`),
    TaskName: String(row[mappedHeaders[1]] || `Task ${index + 1}`),
    Category: String(row[mappedHeaders[2]] || 'general'),
    Duration: parseInt(String(row[mappedHeaders[3]] || '1')),
    RequiredSkills: String(row[mappedHeaders[4]] || ''),
    PreferredPhases: String(row[mappedHeaders[5]] || '[]'),
    MaxConcurrent: parseInt(String(row[mappedHeaders[6]] || '1'))
  }));
} 