import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, finalize, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { DummyJsonTodosResponse, MetadataResponse, MetadataTodoItem, RawTodo } from '../models/api.model';
import { DashboardStats, Project, ProjectStatus } from '../models/project.model';
import { CreateTaskDto, Task, TaskPriority } from '../models/task.model';
import { TodoApiService } from './todo-api.service';

@Injectable({
  providedIn: 'root'
})
export class TaskStateService {
  private readonly projectsSubject = new BehaviorSubject<Project[]>([]);
  private readonly currentTasksSubject = new BehaviorSubject<Task[]>([]);
  private readonly currentPaginationSubject = new BehaviorSubject<{
    total: number;
    limit: number;
    skip: number;
    page: number;
    totalPages: number;
  }>({
    total: 0,
    limit: environment.defaultPageSize,
    skip: 0,
    page: 1,
    totalPages: 1
  });

  private readonly isProjectsLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly isTasksLoadingSubject = new BehaviorSubject<boolean>(false);
  private readonly projectsErrorSubject = new BehaviorSubject<string | null>(null);
  private readonly tasksErrorSubject = new BehaviorSubject<string | null>(null);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);
  private readonly simulateFailureSubject = new BehaviorSubject<boolean>(environment.simulateApiFailure);

  private localCreatedTasks = new Map<number, Task[]>();
  private modifiedTasksMap = new Map<string | number, Partial<Task>>();
  private deletedTaskIds = new Set<string | number>();
  private customProjects: Project[] = [];

  private readonly STORAGE_KEY_TASKS = 'ledger_local_created_tasks_v1';
  private readonly STORAGE_KEY_MODS = 'ledger_modified_tasks_v1';
  private readonly STORAGE_KEY_DELETED = 'ledger_deleted_task_ids_v1';
  private readonly STORAGE_KEY_PROJECTS = 'ledger_custom_projects_v1';

  readonly projects$ = this.projectsSubject.asObservable();
  readonly currentTasks$ = this.currentTasksSubject.asObservable();
  readonly currentPagination$ = this.currentPaginationSubject.asObservable();
  readonly isProjectsLoading$ = this.isProjectsLoadingSubject.asObservable();
  readonly isTasksLoading$ = this.isTasksLoadingSubject.asObservable();
  readonly projectsError$ = this.projectsErrorSubject.asObservable();
  readonly tasksError$ = this.tasksErrorSubject.asObservable();
  readonly error$ = this.tasksErrorSubject.asObservable();
  readonly simulateFailure$ = this.simulateFailureSubject.asObservable();

  readonly dashboardStats$: Observable<DashboardStats> = this.projects$.pipe(
    map(projects => this.calculateDashboardStats(projects))
  );

  constructor(private readonly apiService: TodoApiService) {
    this.loadPersistedState();
  }

  private loadPersistedState(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;

      const tasksRaw = localStorage.getItem(this.STORAGE_KEY_TASKS);
      if (tasksRaw) {
        const parsed = JSON.parse(tasksRaw) as Record<string, Task[]>;
        Object.keys(parsed).forEach(userIdStr => {
          this.localCreatedTasks.set(Number(userIdStr), parsed[userIdStr]);
        });
      }

      const modsRaw = localStorage.getItem(this.STORAGE_KEY_MODS);
      if (modsRaw) {
        const parsed = JSON.parse(modsRaw) as Record<string, Partial<Task>>;
        Object.keys(parsed).forEach(idStr => {
          const numId = Number(idStr);
          const key = isNaN(numId) ? idStr : numId;
          this.modifiedTasksMap.set(key, parsed[idStr]);
        });
      }

      const delRaw = localStorage.getItem(this.STORAGE_KEY_DELETED);
      if (delRaw) {
        const parsed = JSON.parse(delRaw) as (string | number)[];
        parsed.forEach(id => this.deletedTaskIds.add(id));
      }

      const projRaw = localStorage.getItem(this.STORAGE_KEY_PROJECTS);
      if (projRaw) {
        this.customProjects = JSON.parse(projRaw) as Project[];
      }
    } catch {
    }
  }

  private savePersistedState(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;

      const tasksObj: Record<string, Task[]> = {};
      this.localCreatedTasks.forEach((tasks, userId) => {
        tasksObj[String(userId)] = tasks;
      });
      localStorage.setItem(this.STORAGE_KEY_TASKS, JSON.stringify(tasksObj));

      const modsObj: Record<string, Partial<Task>> = {};
      this.modifiedTasksMap.forEach((mod, id) => {
        modsObj[String(id)] = mod;
      });
      localStorage.setItem(this.STORAGE_KEY_MODS, JSON.stringify(modsObj));

      localStorage.setItem(this.STORAGE_KEY_DELETED, JSON.stringify(Array.from(this.deletedTaskIds)));
      localStorage.setItem(this.STORAGE_KEY_PROJECTS, JSON.stringify(this.customProjects));
    } catch {
    }
  }

  toggleSimulateFailure(value?: boolean): void {
    const nextVal = value !== undefined ? value : !this.simulateFailureSubject.value;
    this.simulateFailureSubject.next(nextVal);
  }

  get simulateFailure(): boolean {
    return this.simulateFailureSubject.value;
  }

  clearError(): void {
    this.tasksErrorSubject.next(null);
    this.errorSubject.next(null);
  }

  clearProjectsError(): void {
    this.projectsErrorSubject.next(null);
  }

  clearAllErrors(): void {
    this.projectsErrorSubject.next(null);
    this.tasksErrorSubject.next(null);
    this.errorSubject.next(null);
  }

  setError(message: string): void {
    this.tasksErrorSubject.next(message);
    this.errorSubject.next(message);
  }

  loadProjects(forceRefresh = false): Observable<Project[]> {
    if (this.projectsSubject.value.length > 0 && !forceRefresh) {
      this.projectsErrorSubject.next(null);
      return of(this.projectsSubject.value);
    }

    this.isProjectsLoadingSubject.next(true);
    this.projectsErrorSubject.next(null);

    return this.apiService.getProjectMetadata(this.simulateFailure).pipe(
      map(response => this.groupMetadataIntoProjects(response.todos)),
      tap(projects => {
        this.projectsSubject.next(projects);
        this.isProjectsLoadingSubject.next(false);
      }),
      catchError(err => {
        this.isProjectsLoadingSubject.next(false);
        this.projectsErrorSubject.next(err.message || 'Failed to load projects');
        return throwError(() => err);
      })
    );
  }

  getProjectById(userId: number): Project | undefined {
    return this.projectsSubject.value.find(p => p.id === userId);
  }

  isCustomProject(userId: number): boolean {
    return userId > 207 || this.customProjects.some(p => p.id === userId);
  }

  createProject(name: string, initialTaskTitle?: string): Project {
    const currentProjects = this.projectsSubject.value;
    const allKnownIds = [
      ...currentProjects.map(p => p.id),
      ...this.customProjects.map(p => p.id),
      ...Array.from(this.localCreatedTasks.keys()),
      207
    ];
    const nextId = Math.max(...allKnownIds) + 1;
    const projectName = name?.trim() || `Project — User ${nextId}`;

    let totalTasks = 0;
    let pendingTasks = 0;

    if (initialTaskTitle && initialTaskTitle.trim().length > 0) {
      totalTasks = 1;
      pendingTasks = 1;
      const initialTask: Task = {
        id: this.generateUniqueTaskId(),
        todo: initialTaskTitle.trim(),
        completed: false,
        userId: nextId,
        priority: 'Medium',
        dueDate: new Date().toISOString().split('T')[0],
        formattedDueDate: 'Today',
        isOverdue: false,
        isLocal: true
      };
      this.localCreatedTasks.set(nextId, [initialTask]);
    }

    const newProject: Project = {
      id: nextId,
      name: projectName,
      totalTasks,
      completedTasks: 0,
      pendingTasks,
      status: 'Not Started',
      progressPercentage: 0,
      updatedAtText: 'Created just now'
    };

    this.customProjects = [newProject, ...this.customProjects];
    this.savePersistedState();
    this.projectsSubject.next([newProject, ...currentProjects]);
    return newProject;
  }

  loadUserTasks(
    userId: number,
    limit: number = environment.defaultPageSize,
    skip: number = 0
  ): Observable<{ tasks: Task[]; total: number }> {
    this.isTasksLoadingSubject.next(true);
    this.tasksErrorSubject.next(null);
    this.errorSubject.next(null);

    if (this.isCustomProject(userId)) {
      const localTasks = (this.localCreatedTasks.get(userId) || [])
        .filter(t => !this.deletedTaskIds.has(t.id))
        .map(t => {
          const mod = this.modifiedTasksMap.get(t.id);
          return mod ? { ...t, ...mod } : t;
        });

      const total = localTasks.length;
      const pagedTasks = localTasks.slice(skip, skip + limit);
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const currentPage = Math.floor(skip / limit) + 1;

      this.currentPaginationSubject.next({
        total,
        limit,
        skip,
        page: currentPage,
        totalPages
      });
      this.currentTasksSubject.next(pagedTasks);
      this.isTasksLoadingSubject.next(false);
      return of({ tasks: pagedTasks, total });
    }

    return this.apiService.getUserTasks(userId, limit, skip, this.simulateFailure).pipe(
      map(response => {
        let tasks: Task[] = response.todos.map(t => this.enrichRawTodo(t));

        tasks = tasks.filter(t => !this.deletedTaskIds.has(t.id));

        tasks = tasks.map(t => {
          const mod = this.modifiedTasksMap.get(t.id);
          return mod ? { ...t, ...mod } : t;
        });

        const localTasks = (this.localCreatedTasks.get(userId) || []).filter(
          t => !this.deletedTaskIds.has(t.id)
        );
        const adjustedTotal = Math.max(0, response.total + localTasks.length - this.getDeletedCountForUser(userId));

        if (skip === 0) {
          tasks = [...localTasks, ...tasks];
          tasks = tasks.slice(0, limit);
        }

        const totalPages = Math.max(1, Math.ceil(adjustedTotal / limit));
        const currentPage = Math.floor(skip / limit) + 1;

        this.currentPaginationSubject.next({
          total: adjustedTotal,
          limit,
          skip,
          page: currentPage,
          totalPages
        });

        this.currentTasksSubject.next(tasks);
        return { tasks, total: adjustedTotal };
      }),
      finalize(() => {
        this.isTasksLoadingSubject.next(false);
      }),
      catchError(err => {
        const localTasks = (this.localCreatedTasks.get(userId) || []).filter(
          t => !this.deletedTaskIds.has(t.id)
        );
        if (localTasks.length > 0) {
          this.currentTasksSubject.next(localTasks.slice(skip, skip + limit));
          this.currentPaginationSubject.next({
            total: localTasks.length,
            limit,
            skip,
            page: 1,
            totalPages: Math.max(1, Math.ceil(localTasks.length / limit))
          });
        }
        this.tasksErrorSubject.next(err.message || 'Failed to load tasks for this project.');
        this.errorSubject.next(err.message || 'Failed to load tasks for this project.');
        return throwError(() => err);
      })
    );
  }

  generateUniqueTaskId(): string {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `task_${timestamp}_${randomSuffix}`;
  }

  createTask(dto: CreateTaskDto): Observable<Task> {
    this.errorSubject.next(null);

    const localId = this.generateUniqueTaskId();
    const newTask: Task = {
      id: localId,
      todo: dto.todo,
      completed: dto.completed,
      userId: dto.userId,
      priority: dto.priority,
      dueDate: dto.dueDate,
      formattedDueDate: this.formatDueDate(dto.dueDate),
      isOverdue: this.checkIsOverdue(dto.dueDate, dto.completed),
      isLocal: true
    };

    const previousTasks = [...this.currentTasksSubject.value];
    const previousPagination = { ...this.currentPaginationSubject.value };
    const previousProjects = [...this.projectsSubject.value];

    const updatedTasks = [newTask, ...previousTasks];
    this.currentTasksSubject.next(updatedTasks);

    const existing = this.localCreatedTasks.get(dto.userId) || [];
    this.localCreatedTasks.set(dto.userId, [newTask, ...existing]);
    this.savePersistedState();

    this.currentPaginationSubject.next({
      ...previousPagination,
      total: previousPagination.total + 1,
      totalPages: Math.max(1, Math.ceil((previousPagination.total + 1) / previousPagination.limit))
    });

    this.updateProjectCounts(dto.userId, { deltaTotal: 1, deltaPending: dto.completed ? 0 : 1, deltaCompleted: dto.completed ? 1 : 0 });

    if (this.isCustomProject(dto.userId) && !this.simulateFailure) {
      return of(newTask);
    }

    return this.apiService.createTask(
      { todo: dto.todo, completed: dto.completed, userId: dto.userId },
      this.simulateFailure
    ).pipe(
      map(() => {
        return newTask;
      }),
      catchError(err => {
        this.currentTasksSubject.next(previousTasks);
        this.currentPaginationSubject.next(previousPagination);
        this.projectsSubject.next(previousProjects);

        const cache = this.localCreatedTasks.get(dto.userId) || [];
        this.localCreatedTasks.set(dto.userId, cache.filter(t => t.id !== localId));
        this.savePersistedState();

        const errorMsg = `Failed to create task: ${err.message}. Optimistic changes rolled back.`;
        this.errorSubject.next(errorMsg);
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  updateTaskDetails(
    task: Task,
    updates: { todo: string; priority: TaskPriority; dueDate: string }
  ): Observable<Task> {
    const targetId = task.id;
    const previousTasks = [...this.currentTasksSubject.value];

    const updatedTask: Task = {
      ...task,
      todo: updates.todo.trim(),
      priority: updates.priority,
      dueDate: updates.dueDate,
      formattedDueDate: this.formatDueDate(updates.dueDate),
      isOverdue: this.checkIsOverdue(updates.dueDate, task.completed),
      isUpdating: true
    };

    this.currentTasksSubject.next(
      previousTasks.map(t => (t.id === targetId ? updatedTask : t))
    );

    const userLocalTasks = this.localCreatedTasks.get(task.userId);
    if (userLocalTasks && userLocalTasks.some(t => t.id === targetId)) {
      this.localCreatedTasks.set(
        task.userId,
        userLocalTasks.map(t => (t.id === targetId ? updatedTask : t))
      );
    }

    this.modifiedTasksMap.set(targetId, {
      todo: updates.todo.trim(),
      priority: updates.priority,
      dueDate: updates.dueDate,
      formattedDueDate: this.formatDueDate(updates.dueDate),
      isOverdue: this.checkIsOverdue(updates.dueDate, task.completed)
    });
    this.savePersistedState();

    if (this.isCustomProject(task.userId) && !this.simulateFailure) {
      const finalTasks = this.currentTasksSubject.value.map(t =>
        t.id === targetId ? { ...updatedTask, isUpdating: false } : t
      );
      this.currentTasksSubject.next(finalTasks);
      return of({ ...updatedTask, isUpdating: false });
    }

    const numericId = typeof targetId === 'number' ? targetId : 1;
    return this.apiService.updateTask(numericId, { todo: updates.todo.trim() }, this.simulateFailure).pipe(
      map(() => {
        const finalTasks = this.currentTasksSubject.value.map(t =>
          t.id === targetId ? { ...updatedTask, isUpdating: false } : t
        );
        this.currentTasksSubject.next(finalTasks);
        return { ...updatedTask, isUpdating: false };
      }),
      catchError(err => {
        this.currentTasksSubject.next(previousTasks);
        this.modifiedTasksMap.delete(targetId);
        this.savePersistedState();

        const errorMsg = `Failed to update task "${updates.todo}": ${err.message}. Changes rolled back.`;
        this.errorSubject.next(errorMsg);
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  toggleTaskCompletion(task: Task): Observable<Task> {
    const targetId = task.id;
    const targetCompleted = !task.completed;

    const previousTasks = [...this.currentTasksSubject.value];
    const previousProjects = [...this.projectsSubject.value];

    const updatedTasks = previousTasks.map(t => {
      if (t.id === targetId) {
        return {
          ...t,
          completed: targetCompleted,
          isOverdue: this.checkIsOverdue(t.dueDate, targetCompleted),
          isUpdating: true
        };
      }
      return t;
    });
    this.currentTasksSubject.next(updatedTasks);

    const userLocalTasks = this.localCreatedTasks.get(task.userId);
    if (userLocalTasks && userLocalTasks.some(t => t.id === targetId)) {
      this.localCreatedTasks.set(
        task.userId,
        userLocalTasks.map(t => (t.id === targetId ? { ...t, completed: targetCompleted } : t))
      );
    }

    this.modifiedTasksMap.set(targetId, {
      completed: targetCompleted,
      isOverdue: this.checkIsOverdue(task.dueDate, targetCompleted)
    });
    this.savePersistedState();

    this.updateProjectCounts(task.userId, {
      deltaCompleted: targetCompleted ? 1 : -1,
      deltaPending: targetCompleted ? -1 : 1
    });

    if (this.isCustomProject(task.userId) && !this.simulateFailure) {
      const finalTasks = this.currentTasksSubject.value.map(t =>
        t.id === targetId ? { ...t, isUpdating: false } : t
      );
      this.currentTasksSubject.next(finalTasks);
      return of({ ...task, completed: targetCompleted, isUpdating: false });
    }

    const numericId = typeof targetId === 'number' ? targetId : 1;
    return this.apiService.updateTask(numericId, { completed: targetCompleted }, this.simulateFailure).pipe(
      map(() => {
        const finalTasks = this.currentTasksSubject.value.map(t =>
          t.id === targetId ? { ...t, isUpdating: false } : t
        );
        this.currentTasksSubject.next(finalTasks);
        return { ...task, completed: targetCompleted, isUpdating: false };
      }),
      catchError(err => {
        this.currentTasksSubject.next(previousTasks);
        this.projectsSubject.next(previousProjects);
        this.modifiedTasksMap.delete(targetId);
        this.savePersistedState();

        const errorMsg = `Failed to update task "${task.todo}": ${err.message}. Changes rolled back.`;
        this.errorSubject.next(errorMsg);
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  deleteTask(task: Task): Observable<boolean> {
    const targetId = task.id;

    const previousTasks = [...this.currentTasksSubject.value];
    const previousPagination = { ...this.currentPaginationSubject.value };
    const previousProjects = [...this.projectsSubject.value];

    const updatedTasks = previousTasks.filter(t => t.id !== targetId);
    this.currentTasksSubject.next(updatedTasks);
    this.deletedTaskIds.add(targetId);

    const userLocalTasks = this.localCreatedTasks.get(task.userId);
    if (userLocalTasks) {
      this.localCreatedTasks.set(
        task.userId,
        userLocalTasks.filter(t => t.id !== targetId)
      );
    }
    this.savePersistedState();

    const newTotal = Math.max(0, previousPagination.total - 1);
    this.currentPaginationSubject.next({
      ...previousPagination,
      total: newTotal,
      totalPages: Math.max(1, Math.ceil(newTotal / previousPagination.limit))
    });

    this.updateProjectCounts(task.userId, {
      deltaTotal: -1,
      deltaCompleted: task.completed ? -1 : 0,
      deltaPending: task.completed ? 0 : -1
    });

    if (this.isCustomProject(task.userId) && !this.simulateFailure) {
      return of(true);
    }

    const numericId = typeof targetId === 'number' ? targetId : 1;
    return this.apiService.deleteTask(numericId, this.simulateFailure).pipe(
      map(() => true),
      catchError(err => {
        this.currentTasksSubject.next(previousTasks);
        this.currentPaginationSubject.next(previousPagination);
        this.projectsSubject.next(previousProjects);
        this.deletedTaskIds.delete(targetId);
        this.savePersistedState();

        const errorMsg = `Failed to delete task: ${err.message}. Task restored.`;
        this.errorSubject.next(errorMsg);
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  private groupMetadataIntoProjects(todos: MetadataTodoItem[]): Project[] {
    const grouped = new Map<number, { completed: number; total: number }>();

    for (const item of todos) {
      if (this.deletedTaskIds.has(item.id)) continue;

      const current = grouped.get(item.userId) || { completed: 0, total: 0 };
      current.total += 1;
      const mod = this.modifiedTasksMap.get(item.id);
      const isCompleted = mod && mod.completed !== undefined ? mod.completed : item.completed;
      if (isCompleted) {
        current.completed += 1;
      }
      grouped.set(item.userId, current);
    }

    this.localCreatedTasks.forEach((tasks, userId) => {
      const activeTasks = tasks.filter(t => !this.deletedTaskIds.has(t.id));
      const current = grouped.get(userId) || { completed: 0, total: 0 };
      current.total += activeTasks.length;
      activeTasks.forEach(t => {
        const mod = this.modifiedTasksMap.get(t.id);
        const isComp = mod && mod.completed !== undefined ? mod.completed : t.completed;
        if (isComp) {
          current.completed += 1;
        }
      });
      grouped.set(userId, current);
    });

    const projects: Project[] = [];
    grouped.forEach((counts, userId) => {
      const pending = Math.max(0, counts.total - counts.completed);
      const progress = counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0;
      let status: ProjectStatus = 'In Progress';
      if (counts.completed === counts.total && counts.total > 0) {
        status = 'Completed';
      } else if (counts.completed === 0) {
        status = 'Not Started';
      }

      const customProj = this.customProjects.find(cp => cp.id === userId);
      const name = customProj ? customProj.name : `Project — User ${userId}`;

      projects.push({
        id: userId,
        name,
        totalTasks: counts.total,
        completedTasks: counts.completed,
        pendingTasks: pending,
        status,
        progressPercentage: progress,
        updatedAtText: customProj?.updatedAtText || this.getRelativeUpdatedText(userId)
      });
    });

    for (const cp of this.customProjects) {
      if (!projects.some(p => p.id === cp.id)) {
        projects.push(cp);
      }
    }

    return projects.sort((a, b) => {
      const aCustom = this.isCustomProject(a.id);
      const bCustom = this.isCustomProject(b.id);
      if (aCustom && !bCustom) return -1;
      if (!aCustom && bCustom) return 1;
      return a.id - b.id;
    });
  }

  private calculateDashboardStats(projects: Project[]): DashboardStats {
    let totalTasks = 0;
    let completedTasks = 0;
    let notStartedCount = 0;
    let inProgressCount = 0;
    let completedCount = 0;

    for (const p of projects) {
      totalTasks += p.totalTasks;
      completedTasks += p.completedTasks;
      if (p.status === 'Completed') {
        completedCount += p.totalTasks;
      } else if (p.status === 'Not Started') {
        notStartedCount += p.totalTasks;
      } else {
        inProgressCount += p.totalTasks;
      }
    }

    const pendingTasks = Math.max(0, totalTasks - completedTasks);
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const overdueTasks = Math.round(pendingTasks * 0.16);

    const notStartedPercent = totalTasks > 0 ? Math.round((notStartedCount / totalTasks) * 100) : 0;
    const inProgressPercent = totalTasks > 0 ? Math.round((inProgressCount / totalTasks) * 100) : 0;
    const completedPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      totalProjects: projects.length,
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      completionRate,
      tasksByStatus: {
        notStarted: notStartedCount,
        notStartedPercent,
        inProgress: inProgressCount,
        inProgressPercent,
        completed: completedTasks,
        completedPercent
      },
      projectsSnapshot: projects.slice(0, 4)
    };
  }

  private enrichRawTodo(raw: RawTodo): Task {
    const priority = this.deriveDeterministicPriority(raw.id);
    const dueDate = this.deriveDeterministicDueDate(raw.id);
    const isOverdue = this.checkIsOverdue(dueDate, raw.completed);

    return {
      id: raw.id,
      todo: raw.todo,
      completed: raw.completed,
      userId: raw.userId,
      priority,
      dueDate,
      formattedDueDate: this.formatDueDate(dueDate),
      isOverdue,
      isLocal: false,
      isUpdating: false
    };
  }

  private deriveDeterministicPriority(id: number): TaskPriority {
    const mod = id % 3;
    if (mod === 0) return 'High';
    if (mod === 1) return 'Medium';
    return 'Low';
  }

  private deriveDeterministicDueDate(id: number): string {
    const baseDay = (id * 3) % 28 + 1;
    const month = (id % 2 === 0) ? '08' : '09';
    const dayStr = baseDay < 10 ? `0${baseDay}` : `${baseDay}`;
    return `2026-${month}-${dayStr}`;
  }

  private formatDueDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthIdx = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        return `${monthNames[monthIdx] || ''} ${day}`;
      }
    } catch {
    }
    return dateStr;
  }

  private checkIsOverdue(dateStr: string, completed: boolean): boolean {
    if (completed || !dateStr) return false;
    const dueDate = new Date(dateStr).getTime();
    const today = new Date('2026-09-17').getTime();
    return dueDate < today;
  }

  private getRelativeUpdatedText(userId: number): string {
    const samples = ['Updated 2h ago', 'Updated 6h ago', 'Updated 1d ago', 'Updated 3h ago', 'Updated 5d ago', 'Updated 1w ago'];
    return samples[userId % samples.length];
  }

  private updateProjectCounts(
    userId: number,
    deltas: { deltaTotal?: number; deltaCompleted?: number; deltaPending?: number }
  ): void {
    const projects = this.projectsSubject.value.map(p => {
      if (p.id === userId) {
        const newTotal = Math.max(0, p.totalTasks + (deltas.deltaTotal || 0));
        const newCompleted = Math.max(0, p.completedTasks + (deltas.deltaCompleted || 0));
        const newPending = Math.max(0, p.pendingTasks + (deltas.deltaPending || 0));
        const progress = newTotal > 0 ? Math.round((newCompleted / newTotal) * 100) : 0;
        let status: ProjectStatus = 'In Progress';
        if (newCompleted === newTotal && newTotal > 0) {
          status = 'Completed';
        } else if (newCompleted === 0) {
          status = 'Not Started';
        }
        return {
          ...p,
          totalTasks: newTotal,
          completedTasks: newCompleted,
          pendingTasks: newPending,
          progressPercentage: progress,
          status
        };
      }
      return p;
    });

    this.projectsSubject.next(projects);

    let customUpdated = false;
    this.customProjects = this.customProjects.map(cp => {
      if (cp.id === userId) {
        customUpdated = true;
        const updated = projects.find(p => p.id === userId);
        return updated ? { ...updated } : cp;
      }
      return cp;
    });

    if (customUpdated) {
      this.savePersistedState();
    }
  }

  private getDeletedCountForUser(userId: number): number {
    return Array.from(this.deletedTaskIds).filter(id => {
      const task = this.currentTasksSubject.value.find(t => t.id === id);
      return task && task.userId === userId;
    }).length;
  }
}
