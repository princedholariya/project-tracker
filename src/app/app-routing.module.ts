import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProjectExistsGuard } from './core/guards/project-exists.guard';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { NotFoundComponent } from './features/not-found/not-found.component';
import { ProjectDetailComponent } from './features/project-detail/project-detail.component';
import { ProjectListComponent } from './features/projects/project-list.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    title: 'Dashboard — Ledger'
  },
  {
    path: 'projects',
    component: ProjectListComponent,
    title: 'Projects — Ledger'
  },
  {
    path: 'projects/:userId',
    component: ProjectDetailComponent,
    canActivate: [ProjectExistsGuard],
    title: 'Project Details — Ledger'
  },
  {
    path: '**',
    component: NotFoundComponent,
    title: 'Not Found — Ledger'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
