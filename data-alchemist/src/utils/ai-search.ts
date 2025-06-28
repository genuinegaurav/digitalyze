import { Client, Worker, Task } from '@/types';

export interface SearchQuery {
  query: string;
  entityType: 'clients' | 'workers' | 'tasks' | 'all';
  filters: SearchFilter[];
}

export interface SearchFilter {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
}

export class AISearchEngine {
  private queryPatterns = {
    // Duration patterns
    duration: /(?:duration|time|length)\s+(?:of\s+)?(?:more\s+than|greater\s+than|>\s*|less\s+than|<\s*|equals?\s*|=\s*)\s*(\d+)/gi,
    
    // Phase patterns
    phase: /(?:phase|phases?)\s+(\d+(?:\s*-\s*\d+)?|\d+(?:\s*,\s*\d+)*)/gi,
    
    // Priority patterns
    priority: /(?:priority|level)\s+(?:of\s+)?(?:more\s+than|greater\s+than|>\s*|less\s+than|<\s*|equals?\s*|=\s*)\s*(\d+)/gi,
    
    // Skill patterns
    skill: /(?:skill|skills?|capability|capabilities)\s+(?:of\s+)?([a-zA-Z\s,]+)/gi,
    
    // Category patterns
    category: /(?:category|type)\s+(?:of\s+)?([a-zA-Z\s]+)/gi,
    
    // Group patterns
    group: /(?:group|tag)\s+(?:of\s+)?([a-zA-Z\s]+)/gi,
    
    // Name patterns
    name: /(?:name|called)\s+(?:of\s+)?([a-zA-Z\s]+)/gi,
    
    // Concurrent patterns
    concurrent: /(?:concurrent|parallel|max\s+concurrent)\s+(?:of\s+)?(?:more\s+than|greater\s+than|>\s*|less\s+than|<\s*|equals?\s*|=\s*)\s*(\d+)/gi,
    
    // Load patterns
    load: /(?:load|max\s+load)\s+(?:of\s+)?(?:more\s+than|greater\s+than|>\s*|less\s+than|<\s*|equals?\s*|=\s*)\s*(\d+)/gi
  };

  parseQuery(query: string): SearchQuery {
    const normalizedQuery = query.toLowerCase();
    const filters: SearchFilter[] = [];
    let entityType: 'clients' | 'workers' | 'tasks' | 'all' = 'all';

    // Determine entity type from query
    if (normalizedQuery.includes('client')) {
      entityType = 'clients';
    } else if (normalizedQuery.includes('worker')) {
      entityType = 'workers';
    } else if (normalizedQuery.includes('task')) {
      entityType = 'tasks';
    }

    // Parse duration filters
    let match;
    while ((match = this.queryPatterns.duration.exec(query)) !== null) {
      const value = parseInt(match[1]);
      const operator = this.extractOperator(match[0]);
      filters.push({
        field: 'Duration',
        operator,
        value
      });
    }

    // Parse phase filters
    while ((match = this.queryPatterns.phase.exec(query)) !== null) {
      const phaseValue = match[1];
      if (phaseValue.includes('-')) {
        const [start, end] = phaseValue.split('-').map(p => parseInt(p.trim()));
        filters.push({
          field: 'PreferredPhases',
          operator: 'in',
          value: Array.from({ length: end - start + 1 }, (_, i) => start + i)
        });
      } else if (phaseValue.includes(',')) {
        const phases = phaseValue.split(',').map(p => parseInt(p.trim()));
        filters.push({
          field: 'PreferredPhases',
          operator: 'in',
          value: phases
        });
      } else {
        filters.push({
          field: 'PreferredPhases',
          operator: 'contains',
          value: parseInt(phaseValue)
        });
      }
    }

    // Parse priority filters
    while ((match = this.queryPatterns.priority.exec(query)) !== null) {
      const value = parseInt(match[1]);
      const operator = this.extractOperator(match[0]);
      filters.push({
        field: 'PriorityLevel',
        operator,
        value
      });
    }

    // Parse skill filters
    while ((match = this.queryPatterns.skill.exec(query)) !== null) {
      const skills = match[1].split(',').map(s => s.trim());
      filters.push({
        field: 'Skills',
        operator: 'contains',
        value: skills
      });
    }

    // Parse category filters
    while ((match = this.queryPatterns.category.exec(query)) !== null) {
      filters.push({
        field: 'Category',
        operator: 'contains',
        value: match[1].trim()
      });
    }

    // Parse group filters
    while ((match = this.queryPatterns.group.exec(query)) !== null) {
      const groupField = entityType === 'clients' ? 'GroupTag' : 'WorkerGroup';
      filters.push({
        field: groupField,
        operator: 'contains',
        value: match[1].trim()
      });
    }

    // Parse name filters
    while ((match = this.queryPatterns.name.exec(query)) !== null) {
      const nameField = entityType === 'clients' ? 'ClientName' : 
                       entityType === 'workers' ? 'WorkerName' : 'TaskName';
      filters.push({
        field: nameField,
        operator: 'contains',
        value: match[1].trim()
      });
    }

    // Parse concurrent filters
    while ((match = this.queryPatterns.concurrent.exec(query)) !== null) {
      const value = parseInt(match[1]);
      const operator = this.extractOperator(match[0]);
      filters.push({
        field: 'MaxConcurrent',
        operator,
        value
      });
    }

    // Parse load filters
    while ((match = this.queryPatterns.load.exec(query)) !== null) {
      const value = parseInt(match[1]);
      const operator = this.extractOperator(match[0]);
      filters.push({
        field: 'MaxLoadPerPhase',
        operator,
        value
      });
    }

    return { query, entityType, filters };
  }

  private extractOperator(text: string): 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' {
    const normalized = text.toLowerCase();
    if (normalized.includes('more than') || normalized.includes('greater than') || normalized.includes('>')) {
      return 'greater_than';
    }
    if (normalized.includes('less than') || normalized.includes('<')) {
      return 'less_than';
    }
    if (normalized.includes('equals') || normalized.includes('=')) {
      return 'equals';
    }
    return 'contains';
  }

  search(data: { clients: Client[]; workers: Worker[]; tasks: Task[] }, query: string): {
    clients: Client[];
    workers: Worker[];
    tasks: Task[];
  } {
    const parsedQuery = this.parseQuery(query);
    const results = {
      clients: data.clients,
      workers: data.workers,
      tasks: data.tasks
    };

    if (parsedQuery.entityType === 'all' || parsedQuery.entityType === 'clients') {
      results.clients = this.applyFilters(data.clients, parsedQuery.filters);
    }
    if (parsedQuery.entityType === 'all' || parsedQuery.entityType === 'workers') {
      results.workers = this.applyFilters(data.workers, parsedQuery.filters);
    }
    if (parsedQuery.entityType === 'all' || parsedQuery.entityType === 'tasks') {
      results.tasks = this.applyFilters(data.tasks, parsedQuery.filters);
    }

    return results;
  }

  private applyFilters<T>(data: T[], filters: SearchFilter[]): T[] {
    return data.filter(item => {
      return filters.every(filter => {
        const value = (item as any)[filter.field];
        return this.matchesFilter(value, filter);
      });
    });
  }

  private matchesFilter(value: any, filter: SearchFilter): boolean {
    switch (filter.operator) {
      case 'equals':
        return value === filter.value;
      case 'contains':
        if (Array.isArray(filter.value)) {
          return filter.value.some((v: any) => 
            String(value).toLowerCase().includes(String(v).toLowerCase())
          );
        }
        return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
      case 'greater_than':
        return Number(value) > Number(filter.value);
      case 'less_than':
        return Number(value) < Number(filter.value);
      case 'in':
        if (Array.isArray(value)) {
          return filter.value.some((v: any) => value.includes(v));
        }
        return filter.value.includes(value);
      case 'not_in':
        if (Array.isArray(value)) {
          return !filter.value.some((v: any) => value.includes(v));
        }
        return !filter.value.includes(value);
      default:
        return true;
    }
  }

  // AI-powered query suggestions
  getQuerySuggestions(data: { clients: Client[]; workers: Worker[]; tasks: Task[] }): string[] {
    const suggestions: string[] = [];

    // Analyze data patterns and generate suggestions
    const taskCategories = [...new Set(data.tasks.map(t => t.Category))];
    const workerGroups = [...new Set(data.workers.map(w => w.WorkerGroup))];
    const clientGroups = [...new Set(data.clients.map(c => c.GroupTag))];

    // Task-related suggestions
    taskCategories.forEach(category => {
      suggestions.push(`Show all ${category} tasks`);
      suggestions.push(`Tasks with category ${category}`);
    });

    // Worker-related suggestions
    workerGroups.forEach(group => {
      suggestions.push(`Workers in ${group} group`);
      suggestions.push(`Show ${group} workers`);
    });

    // Client-related suggestions
    clientGroups.forEach(group => {
      suggestions.push(`Clients in ${group} group`);
      suggestions.push(`Show ${group} clients`);
    });

    // Duration-based suggestions
    const maxDuration = Math.max(...data.tasks.map(t => t.Duration));
    if (maxDuration > 1) {
      suggestions.push(`Tasks with duration more than 1 phase`);
      suggestions.push(`Long duration tasks (more than ${Math.floor(maxDuration / 2)} phases)`);
    }

    // Priority-based suggestions
    suggestions.push(`High priority clients (priority level 4-5)`);
    suggestions.push(`Low priority clients (priority level 1-2)`);

    return suggestions.slice(0, 10); // Limit to 10 suggestions
  }
}

export const aiSearch = new AISearchEngine(); 