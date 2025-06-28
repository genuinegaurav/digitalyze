import { BusinessRule, Client, Worker, Task } from '@/types';

export interface RuleTemplate {
  type: BusinessRule['type'];
  name: string;
  description: string;
  parameters: RuleParameter[];
  naturalLanguagePatterns: string[];
}

export interface RuleParameter {
  name: string;
  type: 'string' | 'number' | 'array' | 'boolean';
  required: boolean;
  description: string;
}

export class RulesEngine {
  private ruleTemplates: RuleTemplate[] = [
    {
      type: 'coRun',
      name: 'Co-Run Tasks',
      description: 'Tasks that must run together in the same phase',
      parameters: [
        { name: 'taskIds', type: 'array', required: true, description: 'Array of task IDs that must run together' }
      ],
      naturalLanguagePatterns: [
        'tasks {taskIds} must run together',
        '{taskIds} should be executed simultaneously',
        'run {taskIds} in the same phase'
      ]
    },
    {
      type: 'slotRestriction',
      name: 'Slot Restriction',
      description: 'Restrict certain groups to specific time slots',
      parameters: [
        { name: 'groupType', type: 'string', required: true, description: 'Type of group (client or worker)' },
        { name: 'groupName', type: 'string', required: true, description: 'Name of the group' },
        { name: 'minCommonSlots', type: 'number', required: true, description: 'Minimum common slots required' }
      ],
      naturalLanguagePatterns: [
        '{groupType} group {groupName} needs at least {minCommonSlots} common slots',
        'restrict {groupType} {groupName} to {minCommonSlots} slots minimum'
      ]
    },
    {
      type: 'loadLimit',
      name: 'Load Limit',
      description: 'Limit the maximum load for a worker group per phase',
      parameters: [
        { name: 'workerGroup', type: 'string', required: true, description: 'Worker group name' },
        { name: 'maxSlotsPerPhase', type: 'number', required: true, description: 'Maximum slots per phase' }
      ],
      naturalLanguagePatterns: [
        'limit {workerGroup} workers to {maxSlotsPerPhase} slots per phase',
        '{workerGroup} group cannot exceed {maxSlotsPerPhase} slots'
      ]
    },
    {
      type: 'phaseWindow',
      name: 'Phase Window',
      description: 'Restrict a task to specific phases',
      parameters: [
        { name: 'taskId', type: 'string', required: true, description: 'Task ID' },
        { name: 'allowedPhases', type: 'array', required: true, description: 'Array of allowed phase numbers' }
      ],
      naturalLanguagePatterns: [
        'task {taskId} can only run in phases {allowedPhases}',
        'restrict {taskId} to phases {allowedPhases}'
      ]
    },
    {
      type: 'patternMatch',
      name: 'Pattern Match',
      description: 'Apply rules based on pattern matching',
      parameters: [
        { name: 'regex', type: 'string', required: true, description: 'Regular expression pattern' },
        { name: 'ruleTemplate', type: 'string', required: true, description: 'Template rule to apply' },
        { name: 'parameters', type: 'array', required: false, description: 'Additional parameters' }
      ],
      naturalLanguagePatterns: [
        'apply {ruleTemplate} to tasks matching {regex}',
        'use pattern {regex} to apply {ruleTemplate}'
      ]
    },
    {
      type: 'precedenceOverride',
      name: 'Precedence Override',
      description: 'Override global precedence rules for specific cases',
      parameters: [
        { name: 'entityType', type: 'string', required: true, description: 'Type of entity (client, worker, task)' },
        { name: 'entityId', type: 'string', required: true, description: 'Entity ID' },
        { name: 'priority', type: 'number', required: true, description: 'Priority level (1-10)' }
      ],
      naturalLanguagePatterns: [
        'give {entityType} {entityId} priority {priority}',
        'override precedence for {entityType} {entityId} to {priority}'
      ]
    }
  ];

  parseNaturalLanguageRule(query: string, data: { clients: Client[]; workers: Worker[]; tasks: Task[] }): BusinessRule | null {
    const normalizedQuery = query.toLowerCase();
    
    // Try to match against templates
    for (const template of this.ruleTemplates) {
      for (const pattern of template.naturalLanguagePatterns) {
        const match = this.matchPattern(pattern, normalizedQuery, data);
        if (match) {
          return {
            id: this.generateRuleId(),
            type: template.type,
            name: template.name,
            description: query,
            config: match,
            priority: 1,
            enabled: true
          };
        }
      }
    }

    return null;
  }

  private matchPattern(pattern: string, query: string, data: { clients: Client[]; workers: Worker[]; tasks: Task[] }): Record<string, any> | null {
    // Simple pattern matching - in a real implementation, you'd use more sophisticated NLP
    const config: Record<string, any> = {};
    
    // Extract task IDs
    const taskIds = data.tasks.map(t => t.TaskID);
    const taskIdMatch = taskIds.find(id => query.includes(id.toLowerCase()));
    if (taskIdMatch) {
      config.taskId = taskIdMatch;
    }

    // Extract worker groups
    const workerGroups = [...new Set(data.workers.map(w => w.WorkerGroup))];
    const workerGroupMatch = workerGroups.find(group => query.includes(group.toLowerCase()));
    if (workerGroupMatch) {
      config.workerGroup = workerGroupMatch;
    }

    // Extract client groups
    const clientGroups = [...new Set(data.clients.map(c => c.GroupTag))];
    const clientGroupMatch = clientGroups.find(group => query.includes(group.toLowerCase()));
    if (clientGroupMatch) {
      config.groupName = clientGroupMatch;
      config.groupType = 'client';
    }

    // Extract numbers
    const numberMatch = query.match(/\d+/);
    if (numberMatch) {
      const num = parseInt(numberMatch[0]);
      if (query.includes('slot') || query.includes('load')) {
        config.maxSlotsPerPhase = num;
        config.minCommonSlots = num;
      } else if (query.includes('priority')) {
        config.priority = num;
      } else if (query.includes('phase')) {
        config.allowedPhases = [num];
      }
    }

    // Extract multiple task IDs for co-run
    if (query.includes('together') || query.includes('simultaneously')) {
      const foundTaskIds = taskIds.filter(id => query.includes(id.toLowerCase()));
      if (foundTaskIds.length > 1) {
        config.taskIds = foundTaskIds;
      }
    }

    return Object.keys(config).length > 0 ? config : null;
  }

  generateRuleRecommendations(data: { clients: Client[]; workers: Worker[]; tasks: Task[] }): BusinessRule[] {
    const recommendations: BusinessRule[] = [];

    // Analyze task patterns for co-run recommendations
    const taskCategories = data.tasks.reduce((acc, task) => {
      acc[task.Category] = (acc[task.Category] || []).concat(task);
      return acc;
    }, {} as Record<string, Task[]>);

    Object.entries(taskCategories).forEach(([category, tasks]) => {
      if (tasks.length > 1) {
        recommendations.push({
          id: this.generateRuleId(),
          type: 'coRun',
          name: `${category} Tasks Co-Run`,
          description: `Tasks in ${category} category often run together`,
          config: { taskIds: tasks.map(t => t.TaskID) },
          priority: 2,
          enabled: false
        });
      }
    });

    // Analyze worker overload patterns
    const workerGroups = data.workers.reduce((acc, worker) => {
      acc[worker.WorkerGroup] = (acc[worker.WorkerGroup] || []).concat(worker);
      return acc;
    }, {} as Record<string, Worker[]>);

    Object.entries(workerGroups).forEach(([group, workers]) => {
      const avgLoad = workers.reduce((sum, w) => sum + w.MaxLoadPerPhase, 0) / workers.length;
      if (avgLoad > 3) {
        recommendations.push({
          id: this.generateRuleId(),
          type: 'loadLimit',
          name: `${group} Load Limit`,
          description: `${group} workers have high average load (${avgLoad.toFixed(1)})`,
          config: { workerGroup: group, maxSlotsPerPhase: Math.floor(avgLoad * 0.8) },
          priority: 3,
          enabled: false
        });
      }
    });

    // Analyze phase preferences
    const phasePreferences = data.tasks.reduce((acc, task) => {
      try {
        const phases = JSON.parse(task.PreferredPhases);
        phases.forEach((phase: number) => {
          acc[phase] = (acc[phase] || []).concat(task);
        });
      } catch {
        // Invalid JSON, skip
      }
      return acc;
    }, {} as Record<number, Task[]>);

    Object.entries(phasePreferences).forEach(([phase, tasks]) => {
      if (tasks.length > 3) {
        recommendations.push({
          id: this.generateRuleId(),
          type: 'phaseWindow',
          name: `Phase ${phase} Window`,
          description: `Phase ${phase} has ${tasks.length} preferred tasks`,
          config: { taskId: tasks[0].TaskID, allowedPhases: [parseInt(phase)] },
          priority: 2,
          enabled: false
        });
      }
    });

    // Analyze skill gaps
    const allSkills = new Set<string>();
    data.workers.forEach(worker => {
      worker.Skills.split(',').map(s => s.trim()).filter(s => s).forEach(skill => {
        allSkills.add(skill.toLowerCase());
      });
    });

    data.tasks.forEach(task => {
      const requiredSkills = task.RequiredSkills.split(',').map(s => s.trim()).filter(s => s);
      const missingSkills = requiredSkills.filter(skill => !allSkills.has(skill.toLowerCase()));
      
      if (missingSkills.length > 0) {
        recommendations.push({
          id: this.generateRuleId(),
          type: 'precedenceOverride',
          name: `Skill Gap Alert`,
          description: `Task ${task.TaskID} requires missing skills: ${missingSkills.join(', ')}`,
          config: { entityType: 'task', entityId: task.TaskID, priority: 10 },
          priority: 5,
          enabled: false
        });
      }
    });

    return recommendations.slice(0, 10); // Limit to 10 recommendations
  }

  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getRuleTemplates(): RuleTemplate[] {
    return this.ruleTemplates;
  }

  validateRule(rule: BusinessRule, data: { clients: Client[]; workers: Worker[]; tasks: Task[] }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (rule.type) {
      case 'coRun':
        if (!rule.config.taskIds || !Array.isArray(rule.config.taskIds)) {
          errors.push('Co-run rule requires taskIds array');
        } else {
          const taskIds = new Set(data.tasks.map(t => t.TaskID));
          rule.config.taskIds.forEach((id: string) => {
            if (!taskIds.has(id)) {
              errors.push(`Task ID ${id} does not exist`);
            }
          });
        }
        break;

      case 'slotRestriction':
        if (!rule.config.groupType || !rule.config.groupName) {
          errors.push('Slot restriction requires groupType and groupName');
        }
        if (!rule.config.minCommonSlots || rule.config.minCommonSlots < 1) {
          errors.push('Slot restriction requires minCommonSlots >= 1');
        }
        break;

      case 'loadLimit':
        if (!rule.config.workerGroup) {
          errors.push('Load limit requires workerGroup');
        }
        if (!rule.config.maxSlotsPerPhase || rule.config.maxSlotsPerPhase < 1) {
          errors.push('Load limit requires maxSlotsPerPhase >= 1');
        }
        break;

      case 'phaseWindow':
        if (!rule.config.taskId) {
          errors.push('Phase window requires taskId');
        }
        if (!rule.config.allowedPhases || !Array.isArray(rule.config.allowedPhases)) {
          errors.push('Phase window requires allowedPhases array');
        }
        break;

      case 'precedenceOverride':
        if (!rule.config.entityType || !rule.config.entityId) {
          errors.push('Precedence override requires entityType and entityId');
        }
        if (!rule.config.priority || rule.config.priority < 1 || rule.config.priority > 10) {
          errors.push('Precedence override requires priority between 1 and 10');
        }
        break;
    }

    return { valid: errors.length === 0, errors };
  }
}

export const rulesEngine = new RulesEngine(); 