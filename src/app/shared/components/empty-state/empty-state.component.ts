import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.scss']
})
export class EmptyStateComponent {
  @Input() title = 'No tasks yet';
  @Input() subtitle = "This project doesn't have any tasks. Add the first one to get the ball rolling.";
  @Input() actionText = 'Add your first task';

  @Output() actionClick = new EventEmitter<void>();
}
