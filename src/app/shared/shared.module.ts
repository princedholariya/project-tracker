import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BadgeComponent } from './components/badge/badge.component';
import { LoadingSpinnerComponent } from './components/loading-spinner/loading-spinner.component';
import { ErrorAlertComponent } from './components/error-alert/error-alert.component';
import { EmptyStateComponent } from './components/empty-state/empty-state.component';
import { PaginationComponent } from './components/pagination/pagination.component';
import { ConfirmationModalComponent } from './components/confirmation-modal/confirmation-modal.component';
import { TaskCardComponent } from './components/task-card/task-card.component';

@NgModule({
  declarations: [
    BadgeComponent,
    LoadingSpinnerComponent,
    ErrorAlertComponent,
    EmptyStateComponent,
    PaginationComponent,
    ConfirmationModalComponent,
    TaskCardComponent
  ],
  imports: [
    CommonModule,
    RouterModule
  ],
  exports: [
    BadgeComponent,
    LoadingSpinnerComponent,
    ErrorAlertComponent,
    EmptyStateComponent,
    PaginationComponent,
    ConfirmationModalComponent,
    TaskCardComponent
  ]
})
export class SharedModule {}
