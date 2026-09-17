import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { CreateTaskDto, Task, TaskPriority } from '../../../../core/models/task.model';

export function notInPastValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  const parts = String(control.value).split('-');
  if (parts.length !== 3) return null;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const selectedDate = new Date(year, month, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (selectedDate.getTime() < today.getTime()) {
    return { pastDate: true };
  }
  return null;
}

@Component({
  selector: 'app-task-form',
  templateUrl: './task-form.component.html',
  styleUrls: ['./task-form.component.scss']
})
export class TaskFormComponent implements OnInit {
  @Input() userId!: number;
  @Input() isSubmitting = false;
  @Input() taskToEdit: Task | null = null;

  @Output() taskCreated = new EventEmitter<CreateTaskDto>();
  @Output() taskUpdated = new EventEmitter<{ task: Task; updates: { todo: string; priority: TaskPriority; dueDate: string } }>();
  @Output() cancel = new EventEmitter<void>();

  taskForm!: FormGroup;
  readonly priorities: TaskPriority[] = ['Low', 'Medium', 'High'];

  constructor(private readonly fb: FormBuilder) {}

  ngOnInit(): void {
    const initialTitle = this.taskToEdit ? this.taskToEdit.todo : '';
    const initialPriority = this.taskToEdit ? this.taskToEdit.priority : 'Medium';
    const initialDate = this.taskToEdit && this.taskToEdit.dueDate
      ? this.taskToEdit.dueDate
      : this.getDefaultFutureDate();

    // When editing an existing task, don't flag its existing due date as invalid if it was set in past
    const dateValidators = this.taskToEdit
      ? [Validators.required]
      : [Validators.required, notInPastValidator];

    this.taskForm = this.fb.group({
      todo: [initialTitle, [Validators.required, Validators.minLength(3)]],
      dueDate: [initialDate, dateValidators],
      priority: [initialPriority, [Validators.required]]
    });
  }

  get isTitleInvalid(): boolean {
    const ctrl = this.taskForm.get('todo');
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  get isDueDateInvalid(): boolean {
    const ctrl = this.taskForm.get('dueDate');
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  setPriority(p: TaskPriority): void {
    this.taskForm.patchValue({ priority: p });
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.cancel.emit();
    }
  }

  onSubmit(): void {
    if (this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      return;
    }

    const val = this.taskForm.value;

    if (this.taskToEdit) {
      this.taskUpdated.emit({
        task: this.taskToEdit,
        updates: {
          todo: val.todo.trim(),
          priority: val.priority,
          dueDate: val.dueDate
        }
      });
    } else {
      const dto: CreateTaskDto = {
        todo: val.todo.trim(),
        completed: false,
        userId: this.userId,
        priority: val.priority,
        dueDate: val.dueDate
      };
      this.taskCreated.emit(dto);
    }
  }

  private getDefaultFutureDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
