import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { CreateTaskDto } from '../../../../core/models/task.model';
import { TaskFormComponent } from './task-form.component';

describe('TaskFormComponent', () => {
  let component: TaskFormComponent;
  let fixture: ComponentFixture<TaskFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TaskFormComponent],
      imports: [ReactiveFormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(TaskFormComponent);
    component = fixture.componentInstance;
    component.userId = 1;
    fixture.detectChanges();
  });

  it('should create the form component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with invalid form state because title is empty', () => {
    expect(component.taskForm.valid).toBeFalse();
    expect(component.taskForm.get('todo')?.errors?.['required']).toBeTrue();
  });

  it('should invalidate title with fewer than 3 characters', () => {
    const todoControl = component.taskForm.get('todo');
    todoControl?.setValue('ab');
    expect(todoControl?.valid).toBeFalse();
    expect(todoControl?.errors?.['minlength']).toBeTruthy();

    todoControl?.setValue('abc');
    expect(todoControl?.valid).toBeTrue();
  });

  it('should invalidate due date when set to a past date', () => {
    const dateControl = component.taskForm.get('dueDate');
    dateControl?.setValue('2020-01-01'); // Far in past
    dateControl?.setValue('2020-01-01');
    expect(dateControl?.valid).toBeFalse();
    expect(dateControl?.errors?.['pastDate']).toBeTrue();

    // Future date
    dateControl?.setValue('2028-12-31');
    expect(dateControl?.valid).toBeTrue();
  });

  it('should emit taskCreated event when submitting a valid form', () => {
    spyOn(component.taskCreated, 'emit');

    component.taskForm.patchValue({
      todo: 'Complete Angular project',
      dueDate: '2028-05-15',
      priority: 'High'
    });

    expect(component.taskForm.valid).toBeTrue();

    component.onSubmit();

    const expectedDto: CreateTaskDto = {
      todo: 'Complete Angular project',
      completed: false,
      userId: 1,
      priority: 'High',
      dueDate: '2028-05-15'
    };

    expect(component.taskCreated.emit).toHaveBeenCalledWith(expectedDto);
  });

  it('should initialize with task data and emit taskUpdated when editing', () => {
    spyOn(component.taskUpdated, 'emit');

    component.taskToEdit = {
      id: 5,
      todo: 'Existing Task To Edit',
      completed: false,
      userId: 1,
      priority: 'Low',
      dueDate: '2026-08-15'
    };

    component.ngOnInit();

    expect(component.taskForm.get('todo')?.value).toBe('Existing Task To Edit');
    expect(component.taskForm.get('priority')?.value).toBe('Low');
    expect(component.taskForm.get('dueDate')?.value).toBe('2026-08-15');

    component.taskForm.patchValue({
      todo: 'Modified Task Title',
      priority: 'High'
    });

    component.onSubmit();

    expect(component.taskUpdated.emit).toHaveBeenCalledWith({
      task: component.taskToEdit,
      updates: {
        todo: 'Modified Task Title',
        priority: 'High',
        dueDate: '2026-08-15'
      }
    });
  });
});

