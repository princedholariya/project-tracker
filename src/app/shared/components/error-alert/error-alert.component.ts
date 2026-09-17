import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-error-alert',
  templateUrl: './error-alert.component.html',
  styleUrls: ['./error-alert.component.scss']
})
export class ErrorAlertComponent {
  @Input() errorMessage: string | null = null;
  @Input() title = 'Unable to load data';
  @Input() canRetry = true;
  @Input() isPageLevel = false;
  @Input() backUrl: string | null = null;
  @Input() debugEndpoint: string | null = null;

  @Output() retry = new EventEmitter<void>();
  @Output() dismiss = new EventEmitter<void>();
}
