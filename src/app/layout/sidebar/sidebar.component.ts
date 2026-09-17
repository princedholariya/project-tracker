import { Component } from '@angular/core';
import { TaskStateService } from '../../core/services/task-state.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  readonly simulateFailure$ = this.stateService.simulateFailure$;

  constructor(private readonly stateService: TaskStateService) {}

  toggleFailure(): void {
    this.stateService.toggleSimulateFailure();
  }
}
