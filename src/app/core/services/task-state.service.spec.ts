import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CreateTaskDto, Task } from '../models/task.model';
import { TaskStateService } from './task-state.service';
import { TodoApiService } from './todo-api.service';

describe('TaskStateService', () => {
  let service: TaskStateService;
  let apiServiceSpy: jasmine.SpyObj<TodoApiService>;

  beforeEach(() => {
    try {
      localStorage.clear();
    } catch {}

    const spy = jasmine.createSpyObj('TodoApiService', [
      'getProjectMetadata',
      'getUserTasks',
      'createTask',
      'updateTask',
      'deleteTask'
    ]);

    TestBed.configureTestingModule({
      providers: [
        TaskStateService,
        { provide: TodoApiService, useValue: spy }
      ]
    });

    service = TestBed.inject(TaskStateService);
    apiServiceSpy = TestBed.inject(TodoApiService) as jasmine.SpyObj<TodoApiService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Create task with unique identifiers', () => {
    it('should generate distinct local IDs for multiple tasks and avoid overwriting', (done) => {
      apiServiceSpy.createTask.and.returnValue(
        of({ id: 151, todo: 'Task from server', completed: false, userId: 1 })
      );

      const task1Dto: CreateTaskDto = {
        todo: 'First created task',
        completed: false,
        userId: 1,
        priority: 'High',
        dueDate: '2026-09-25'
      };

      const task2Dto: CreateTaskDto = {
        todo: 'Second created task',
        completed: false,
        userId: 1,
        priority: 'Medium',
        dueDate: '2026-09-26'
      };

      service.createTask(task1Dto).subscribe((task1) => {
        expect(task1.id).toBeDefined();
        expect(task1.id).not.toBe(151);

        service.createTask(task2Dto).subscribe((task2) => {
          expect(task2.id).toBeDefined();
          expect(task2.id).not.toBe(151);
          expect(task1.id).not.toEqual(task2.id);

          service.currentTasks$.subscribe(tasks => {
            expect(tasks.length).toBe(2);
            expect(tasks[0].id).toEqual(task2.id);
            expect(tasks[1].id).toEqual(task1.id);
            done();
          });
        });
      });
    });
  });

  describe('Optimistic updates and rollback', () => {
    it('should optimistically toggle completion, then roll back state when API fails', (done) => {
      const initialTask: Task = {
        id: 1,
        todo: 'Test optimistic rollback',
        completed: false,
        userId: 1,
        priority: 'Medium',
        dueDate: '2026-09-20'
      };

      (service as any).currentTasksSubject.next([initialTask]);

      apiServiceSpy.updateTask.and.returnValue(
        throwError(() => new Error('Simulated HTTP 500 failure'))
      );

      service.toggleTaskCompletion(initialTask).subscribe({
        next: () => {
          fail('Should have failed due to simulated API error');
        },
        error: (err) => {
          expect(err).toBeDefined();

          service.currentTasks$.subscribe(tasks => {
            const taskInStore = tasks.find(t => t.id === 1);
            expect(taskInStore?.completed).toBe(false);
            done();
          });
        }
      });
    });

    it('should roll back added task if API creation fails', (done) => {
      apiServiceSpy.createTask.and.returnValue(
        throwError(() => new Error('Creation failed'))
      );

      const dto: CreateTaskDto = {
        todo: 'Doomed task',
        completed: false,
        userId: 1,
        priority: 'Low',
        dueDate: '2026-09-28'
      };

      service.createTask(dto).subscribe({
        next: () => {
          fail('Expected failure');
        },
        error: () => {
          service.currentTasks$.subscribe(tasks => {
            expect(tasks.length).toBe(0);
            done();
          });
        }
      });
    });

    it('should roll back task edits if API update fails', (done) => {
      const initialTask: Task = {
        id: 10,
        todo: 'Original Title',
        completed: false,
        userId: 1,
        priority: 'Low',
        dueDate: '2026-09-22'
      };

      (service as any).currentTasksSubject.next([initialTask]);

      apiServiceSpy.updateTask.and.returnValue(
        throwError(() => new Error('Update failed'))
      );

      service.updateTaskDetails(initialTask, {
        todo: 'Updated Title',
        priority: 'High',
        dueDate: '2026-09-25'
      }).subscribe({
        next: () => fail('Expected failure'),
        error: () => {
          service.currentTasks$.subscribe(tasks => {
            const task = tasks.find(t => t.id === 10);
            expect(task?.todo).toBe('Original Title');
            expect(task?.priority).toBe('Low');
            done();
          });
        }
      });
    });
  });

  describe('Derived Dashboard Stats', () => {
    it('should calculate aggregate metrics reactively from projects list', (done) => {
      const mockTodos = [
        { id: 1, completed: true, userId: 1 },
        { id: 2, completed: false, userId: 1 },
        { id: 3, completed: true, userId: 2 }
      ];

      apiServiceSpy.getProjectMetadata.and.returnValue(
        of({ todos: mockTodos, total: 3, skip: 0, limit: 0 })
      );

      service.loadProjects().subscribe(() => {
        service.dashboardStats$.subscribe(stats => {
          expect(stats.totalProjects).toBe(2);
          expect(stats.totalTasks).toBe(3);
          expect(stats.completedTasks).toBe(2);
          expect(stats.pendingTasks).toBe(1);
          expect(stats.completionRate).toBe(67);
          done();
        });
      });
    });
  });

  describe('Custom Projects & Task Visibility', () => {
    it('should create custom project with initial task and serve tasks locally without API call', (done) => {
      const project = service.createProject('New Website Project', 'Design landing page');

      expect(project.id).toBeGreaterThan(207);
      expect(project.name).toBe('New Website Project');
      expect(project.totalTasks).toBe(1);
      expect(service.isCustomProject(project.id)).toBe(true);

      service.loadUserTasks(project.id).subscribe(({ tasks, total }) => {
        expect(apiServiceSpy.getUserTasks).not.toHaveBeenCalled();
        expect(total).toBe(1);
        expect(tasks.length).toBe(1);
        expect(tasks[0].todo).toBe('Design landing page');
        expect(tasks[0].userId).toBe(project.id);
        done();
      });
    });

    it('should add subsequent tasks to custom project without external API call when simulateFailure is false', (done) => {
      const project = service.createProject('App Build');
      const newTaskDto: CreateTaskDto = {
        todo: 'Configure build pipeline',
        completed: false,
        userId: project.id,
        priority: 'High',
        dueDate: '2026-09-30'
      };

      service.createTask(newTaskDto).subscribe(task => {
        expect(apiServiceSpy.createTask).not.toHaveBeenCalled();
        expect(task.todo).toBe('Configure build pipeline');
        expect(task.userId).toBe(project.id);

        service.loadUserTasks(project.id).subscribe(({ tasks, total }) => {
          expect(total).toBe(1);
          expect(tasks[0].todo).toBe('Configure build pipeline');
          done();
        });
      });
    });
  });
});
