import { Client, Worker, Task, ValidationError } from '@/types';

export class DataValidator {
  private errors: ValidationError[] = [];
  private warnings: ValidationError[] = [];

  validateAll(clients: Client[], workers: Worker[], tasks: Task[]): { errors: ValidationError[]; warnings: ValidationError[] } {
    this.errors = [];
    this.warnings = [];

    // Core validations
    this.validateRequiredColumns(clients, workers, tasks);
    this.validateDuplicateIDs(clients, workers, tasks);
    this.validateMalformedData(clients, workers, tasks);
    this.validateOutOfRangeValues(clients, workers, tasks);
    this.validateJSONFormat(clients, workers, tasks);
    this.validateCrossReferences(clients, workers, tasks);
    this.validateCircularDependencies(tasks);
    this.validateWorkerOverload(workers, tasks);
    this.validatePhaseSlotSaturation(workers, tasks);
    this.validateSkillCoverage(workers, tasks);
    this.validateMaxConcurrency(tasks, workers);

    return { errors: this.errors, warnings: this.warnings };
  }

  private addError(entityType: 'client' | 'worker' | 'task', entityId: string, field: string, message: string, rowIndex: number, columnIndex: number) {
    this.errors.push({
      entityType,
      entityId,
      field,
      message,
      severity: 'error',
      rowIndex,
      columnIndex
    });
  }

  private addWarning(entityType: 'client' | 'worker' | 'task', entityId: string, field: string, message: string, rowIndex: number, columnIndex: number) {
    this.warnings.push({
      entityType,
      entityId,
      field,
      message,
      severity: 'warning',
      rowIndex,
      columnIndex
    });
  }

  private validateRequiredColumns(clients: Client[], workers: Worker[], tasks: Task[]) {
    const requiredClientFields = ['ClientID', 'ClientName', 'PriorityLevel', 'RequestedTaskIDs', 'GroupTag', 'AttributesJSON'];
    const requiredWorkerFields = ['WorkerID', 'WorkerName', 'Skills', 'AvailableSlots', 'MaxLoadPerPhase', 'WorkerGroup', 'QualificationLevel'];
    const requiredTaskFields = ['TaskID', 'TaskName', 'Category', 'Duration', 'RequiredSkills', 'PreferredPhases', 'MaxConcurrent'];

    clients.forEach((client, index) => {
      requiredClientFields.forEach((field, colIndex) => {
        if (!client[field as keyof Client] || String(client[field as keyof Client]).trim() === '') {
          this.addError('client', client.ClientID, field, `Missing required field: ${field}`, index, colIndex);
        }
      });
    });

    workers.forEach((worker, index) => {
      requiredWorkerFields.forEach((field, colIndex) => {
        if (!worker[field as keyof Worker] || String(worker[field as keyof Worker]).trim() === '') {
          this.addError('worker', worker.WorkerID, field, `Missing required field: ${field}`, index, colIndex);
        }
      });
    });

    tasks.forEach((task, index) => {
      requiredTaskFields.forEach((field, colIndex) => {
        if (!task[field as keyof Task] || String(task[field as keyof Task]).trim() === '') {
          this.addError('task', task.TaskID, field, `Missing required field: ${field}`, index, colIndex);
        }
      });
    });
  }

  private validateDuplicateIDs(clients: Client[], workers: Worker[], tasks: Task[]) {
    const clientIds = new Set<string>();
    const workerIds = new Set<string>();
    const taskIds = new Set<string>();

    clients.forEach((client, index) => {
      if (clientIds.has(client.ClientID)) {
        this.addError('client', client.ClientID, 'ClientID', 'Duplicate ClientID found', index, 0);
      }
      clientIds.add(client.ClientID);
    });

    workers.forEach((worker, index) => {
      if (workerIds.has(worker.WorkerID)) {
        this.addError('worker', worker.WorkerID, 'WorkerID', 'Duplicate WorkerID found', index, 0);
      }
      workerIds.add(worker.WorkerID);
    });

    tasks.forEach((task, index) => {
      if (taskIds.has(task.TaskID)) {
        this.addError('task', task.TaskID, 'TaskID', 'Duplicate TaskID found', index, 0);
      }
      taskIds.add(task.TaskID);
    });
  }

  private validateMalformedData(clients: Client[], workers: Worker[], tasks: Task[]) {
    // Validate AvailableSlots format
    workers.forEach((worker, index) => {
      try {
        const slots = JSON.parse(worker.AvailableSlots);
        if (!Array.isArray(slots) || !slots.every(slot => typeof slot === 'number' && slot > 0)) {
          this.addError('worker', worker.WorkerID, 'AvailableSlots', 'AvailableSlots must be an array of positive numbers', index, 3);
        }
      } catch {
        this.addError('worker', worker.WorkerID, 'AvailableSlots', 'AvailableSlots must be valid JSON array', index, 3);
      }
    });

    // Validate PreferredPhases format
    tasks.forEach((task, index) => {
      try {
        const phases = JSON.parse(task.PreferredPhases);
        if (!Array.isArray(phases) || !phases.every(phase => typeof phase === 'number' && phase > 0)) {
          this.addError('task', task.TaskID, 'PreferredPhases', 'PreferredPhases must be an array of positive numbers', index, 5);
        }
      } catch {
        this.addError('task', task.TaskID, 'PreferredPhases', 'PreferredPhases must be valid JSON array', index, 5);
      }
    });
  }

  private validateOutOfRangeValues(clients: Client[], workers: Worker[], tasks: Task[]) {
    clients.forEach((client, index) => {
      if (client.PriorityLevel < 1 || client.PriorityLevel > 5) {
        this.addError('client', client.ClientID, 'PriorityLevel', 'PriorityLevel must be between 1 and 5', index, 2);
      }
    });

    workers.forEach((worker, index) => {
      if (worker.MaxLoadPerPhase < 1) {
        this.addError('worker', worker.WorkerID, 'MaxLoadPerPhase', 'MaxLoadPerPhase must be at least 1', index, 4);
      }
    });

    tasks.forEach((task, index) => {
      if (task.Duration < 1) {
        this.addError('task', task.TaskID, 'Duration', 'Duration must be at least 1', index, 3);
      }
      if (task.MaxConcurrent < 1) {
        this.addError('task', task.TaskID, 'MaxConcurrent', 'MaxConcurrent must be at least 1', index, 6);
      }
    });
  }

  private validateJSONFormat(clients: Client[], workers: Worker[], tasks: Task[]) {
    clients.forEach((client, index) => {
      try {
        JSON.parse(client.AttributesJSON);
      } catch {
        this.addError('client', client.ClientID, 'AttributesJSON', 'AttributesJSON must be valid JSON', index, 5);
      }
    });
  }

  private validateCrossReferences(clients: Client[], workers: Worker[], tasks: Task[]) {
    const taskIds = new Set(tasks.map(t => t.TaskID));

    clients.forEach((client, index) => {
      const requestedTasks = client.RequestedTaskIDs.split(',').map(t => t.trim()).filter(t => t);
      requestedTasks.forEach(taskId => {
        if (!taskIds.has(taskId)) {
          this.addError('client', client.ClientID, 'RequestedTaskIDs', `Requested task ${taskId} does not exist`, index, 3);
        }
      });
    });
  }

  private validateCircularDependencies(tasks: Task[]) {
    // This is a simplified check - in a real implementation, you'd need more sophisticated graph analysis
    const taskIds = new Set(tasks.map(t => t.TaskID));
    tasks.forEach((task, index) => {
      // Check if task references itself in any way
      if (task.TaskName.includes(task.TaskID) || task.Category.includes(task.TaskID)) {
        this.addWarning('task', task.TaskID, 'TaskName', 'Potential circular dependency detected', index, 1);
      }
    });
  }

  private validateWorkerOverload(workers: Worker[], tasks: Task[]) {
    workers.forEach((worker, index) => {
      try {
        const availableSlots = JSON.parse(worker.AvailableSlots);
        if (availableSlots.length < worker.MaxLoadPerPhase) {
          this.addWarning('worker', worker.WorkerID, 'MaxLoadPerPhase', 
            `Worker may be overloaded: ${availableSlots.length} slots available but max load is ${worker.MaxLoadPerPhase}`, index, 4);
        }
      } catch {
        // Error already caught in malformed data validation
      }
    });
  }

  private validatePhaseSlotSaturation(workers: Worker[], tasks: Task[]) {
    // Calculate total worker capacity per phase
    const phaseCapacity: { [phase: number]: number } = {};
    
    workers.forEach(worker => {
      try {
        const slots = JSON.parse(worker.AvailableSlots);
        slots.forEach((slot: number) => {
          phaseCapacity[slot] = (phaseCapacity[slot] || 0) + worker.MaxLoadPerPhase;
        });
      } catch {
        // Error already caught
      }
    });

    // Calculate total task demand per phase
    const phaseDemand: { [phase: number]: number } = {};
    tasks.forEach(task => {
      try {
        const phases = JSON.parse(task.PreferredPhases);
        phases.forEach((phase: number) => {
          phaseDemand[phase] = (phaseDemand[phase] || 0) + task.Duration * task.MaxConcurrent;
        });
      } catch {
        // Error already caught
      }
    });

    // Check for saturation
    Object.keys(phaseDemand).forEach(phaseStr => {
      const phase = parseInt(phaseStr);
      if (phaseDemand[phase] > (phaseCapacity[phase] || 0)) {
        this.addWarning('task', 'GLOBAL', 'PreferredPhases', 
          `Phase ${phase} may be oversaturated: demand ${phaseDemand[phase]} > capacity ${phaseCapacity[phase] || 0}`, 0, 5);
      }
    });
  }

  private validateSkillCoverage(workers: Worker[], tasks: Task[]) {
    const workerSkills = new Set<string>();
    workers.forEach(worker => {
      const skillsStr = typeof worker.Skills === 'string' ? worker.Skills : '';
      skillsStr.split(',').map(s => s.trim()).filter(s => s).forEach(skill => {
        workerSkills.add(skill.toLowerCase());
      });
    });

    tasks.forEach((task, index) => {
      const requiredSkillsStr = typeof task.RequiredSkills === 'string' ? task.RequiredSkills : '';
      const requiredSkills = requiredSkillsStr.split(',').map(s => s.trim()).filter(s => s);
      const missingSkills = requiredSkills.filter(skill => !workerSkills.has(skill.toLowerCase()));
      
      if (missingSkills.length > 0) {
        this.addError('task', task.TaskID, 'RequiredSkills', 
          `No workers available with skills: ${missingSkills.join(', ')}`, index, 4);
      }
    });
  }

  private validateMaxConcurrency(tasks: Task[], workers: Worker[]) {
    tasks.forEach((task, index) => {
      const requiredSkillsStr = typeof task.RequiredSkills === 'string' ? task.RequiredSkills : '';
      const requiredSkills = requiredSkillsStr.split(',').map(s => s.trim()).filter(s => s);
      const qualifiedWorkers = workers.filter(worker => 
        requiredSkills.some(skill => {
          const skillsStr = typeof worker.Skills === 'string' ? worker.Skills : '';
          return skillsStr.split(',').map(s => s.trim()).some(workerSkill => 
            workerSkill.toLowerCase() === skill.toLowerCase()
          );
        })
      );

      if (qualifiedWorkers.length < task.MaxConcurrent) {
        this.addWarning('task', task.TaskID, 'MaxConcurrent', 
          `MaxConcurrent (${task.MaxConcurrent}) exceeds available qualified workers (${qualifiedWorkers.length})`, index, 6);
      }
    });
  }
}

export const validator = new DataValidator(); 