import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Observable, Subject, combineLatest } from 'rxjs';
import { map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { CreateTaskDto, Task, TaskPriority } from '../../core/models/task.model';
import { TaskStateService } from '../../core/services/task-state.service';

@Component({
  selector: 'app-project-detail',
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.scss']
})
export class ProjectDetailComponent implements OnInit, OnDestroy {
  userId = 1;
  projectTitle = 'Project — User 1';

  readonly tasks$ = this.stateService.currentTasks$;
  readonly pagination$ = this.stateService.currentPagination$;
  readonly isLoading$ = this.stateService.isTasksLoading$;
  readonly error$ = this.stateService.tasksError$;

  isAddTaskModalOpen = false;
  isCreatingTask = false;
  isDeleteModalOpen = false;
  taskToDelete: Task | null = null;
  taskToEdit: Task | null = null;

  get deleteConfirmMessage(): string {
    return `Are you sure you want to delete the task "${this.taskToDelete?.todo || ''}"? This action will be processed against the server.`;
  }

  private readonly pageChange$ = new BehaviorSubject<number>(1);
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly stateService: TaskStateService
  ) {}

  ngOnInit(): void {
    this.stateService.projects$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(projects => {
      const p = projects.find(proj => proj.id === this.userId);
      if (p) {
        this.projectTitle = p.name;
      }
    });

    combineLatest([
      this.route.paramMap,
      this.pageChange$
    ]).pipe(
      takeUntil(this.destroy$),
      map(([params, page]) => {
        const id = Number(params.get('userId')) || 1;
        return { userId: id, page };
      }),
      tap(({ userId }) => {
        this.userId = userId;
        const p = this.stateService.getProjectById(userId);
        this.projectTitle = p ? p.name : `Project — User ${userId}`;
      }),
      switchMap(({ userId, page }) => {
        const limit = environment.defaultPageSize;
        const skip = (page - 1) * limit;
        return this.stateService.loadUserTasks(userId, limit, skip);
      })
    ).subscribe({
      error: () => {}
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackByTaskId(_index: number, task: Task): string | number {
    return task.id;
  }

  onPageChange(newPage: number): void {
    this.pageChange$.next(newPage);
  }

  retryFetch(): void {
    this.pageChange$.next(this.pageChange$.value);
  }

  clearError(): void {
    this.stateService.clearError();
  }

  onToggleComplete(task: Task): void {
    this.stateService.toggleTaskCompletion(task).subscribe({
      error: () => {}
    });
  }

  onDeletePrompt(task: Task): void {
    this.taskToDelete = task;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
    this.taskToDelete = null;
  }

  onConfirmDelete(): void {
    if (!this.taskToDelete) return;
    const task = this.taskToDelete;
    this.closeDeleteModal();

    this.stateService.deleteTask(task).subscribe({
      error: () => {}
    });
  }

  openAddTaskModal(): void {
    this.taskToEdit = null;
    this.isAddTaskModalOpen = true;
  }

  onEditTask(task: Task): void {
    this.taskToEdit = task;
    this.isAddTaskModalOpen = true;
  }

  closeAddTaskModal(): void {
    this.isAddTaskModalOpen = false;
    this.taskToEdit = null;
  }

  onTaskCreated(dto: CreateTaskDto): void {
    this.isCreatingTask = true;
    this.stateService.createTask(dto).subscribe({
      next: () => {
        this.isCreatingTask = false;
        this.closeAddTaskModal();
      },
      error: () => {
        this.isCreatingTask = false;
        this.closeAddTaskModal();
      }
    });
  }

  onTaskUpdated(event: { task: Task; updates: { todo: string; priority: TaskPriority; dueDate: string } }): void {
    this.isCreatingTask = true;
    this.stateService.updateTaskDetails(event.task, event.updates).subscribe({
      next: () => {
        this.isCreatingTask = false;
        this.closeAddTaskModal();
      },
      error: () => {
        this.isCreatingTask = false;
        this.closeAddTaskModal();
      }
    });
  }
}
