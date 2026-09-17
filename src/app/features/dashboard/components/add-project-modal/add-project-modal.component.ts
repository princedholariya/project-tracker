import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-add-project-modal',
  templateUrl: './add-project-modal.component.html',
  styleUrls: ['./add-project-modal.component.scss']
})
export class AddProjectModalComponent implements OnInit {
  @Output() projectCreated = new EventEmitter<{ name: string; initialTask?: string }>();
  @Output() cancel = new EventEmitter<void>();

  projectForm!: FormGroup;

  constructor(private readonly fb: FormBuilder) {}

  ngOnInit(): void {
    this.projectForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      initialTask: ['']
    });
  }

  get isNameInvalid(): boolean {
    const ctrl = this.projectForm.get('name');
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.cancel.emit();
    }
  }

  onSubmit(): void {
    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      return;
    }

    const val = this.projectForm.value;
    this.projectCreated.emit({
      name: val.name.trim(),
      initialTask: val.initialTask ? val.initialTask.trim() : undefined
    });
  }
}

