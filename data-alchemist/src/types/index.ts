export interface Client {
  ClientID: string;
  ClientName: string;
  PriorityLevel: number;
  RequestedTaskIDs: string;
  GroupTag: string;
  AttributesJSON: string;
}

export interface Worker {
  WorkerID: string;
  WorkerName: string;
  Skills: string;
  AvailableSlots: string;
  MaxLoadPerPhase: number;
  WorkerGroup: string;
  QualificationLevel: string;
}

export interface Task {
  TaskID: string;
  TaskName: string;
  Category: string;
  Duration: number;
  RequiredSkills: string;
  PreferredPhases: string;
  MaxConcurrent: number;
}

export interface ValidationError {
  entityType: 'client' | 'worker' | 'task';
  entityId: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
  rowIndex: number;
  columnIndex: number;
}

export interface BusinessRule {
  id: string;
  type: 'coRun' | 'slotRestriction' | 'loadLimit' | 'phaseWindow' | 'patternMatch' | 'precedenceOverride';
  name: string;
  description: string;
  config: Record<string, any>;
  priority: number;
  enabled: boolean;
}

export interface PrioritizationWeights {
  priorityLevel: number;
  fulfillment: number;
  fairness: number;
  costEfficiency: number;
  speed: number;
  workloadBalance: number;
}

export interface ParsedData {
  clients: Client[];
  workers: Worker[];
  tasks: Task[];
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface ExportData {
  clients: Client[];
  workers: Worker[];
  tasks: Task[];
  rules: BusinessRule[];
  weights: PrioritizationWeights;
}

export type DataEntity = Client | Worker | Task;
export type EntityType = 'clients' | 'workers' | 'tasks'; 