import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { DashboardStats, Project } from '../../core/models/project.model';
import { TaskStateService } from '../../core/services/task-state.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  readonly stats$: Observable<DashboardStats> = this.stateService.dashboardStats$;
  readonly isLoading$: Observable<boolean> = this.stateService.isProjectsLoading$;
  readonly error$: Observable<string | null> = this.stateService.projectsError$;

  isAddProjectModalOpen = false;

  constructor(
    private readonly stateService: TaskStateService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.stateService.clearProjectsError();
    this.stateService.loadProjects().subscribe();
  }

  openAddProjectModal(): void {
    this.isAddProjectModalOpen = true;
  }

  closeAddProjectModal(): void {
    this.isAddProjectModalOpen = false;
  }

  onProjectCreated(data: { name: string; initialTask?: string }): void {
    const newProject = this.stateService.createProject(data.name, data.initialTask);
    this.closeAddProjectModal();
    this.router.navigate(['/projects', newProject.id]);
  }

  getSnapshotProgressColor(project: Project): string {
    if (project.progressPercentage === 100) return 'green';
    if (project.progressPercentage === 0) return 'gray';
    return 'orange'; // Matching orange progress bar in Figma for in-progress snapshot
    return 'orange';
  }
}
