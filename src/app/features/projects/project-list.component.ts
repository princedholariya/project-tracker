import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, combineLatest } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { Project } from '../../core/models/project.model';
import { TaskStateService } from '../../core/services/task-state.service';

@Component({
  selector: 'app-project-list',
  templateUrl: './project-list.component.html',
  styleUrls: ['./project-list.component.scss']
})
export class ProjectListComponent implements OnInit {
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly isLoading$ = this.stateService.isProjectsLoading$;
  readonly error$ = this.stateService.projectsError$;

  isAddProjectModalOpen = false;

  readonly filteredProjects$: Observable<Project[]> = combineLatest([
    this.stateService.projects$,
    this.searchControl.valueChanges.pipe(startWith(''))
  ]).pipe(
    map(([projects, query]) => projects.filter(p => this.filterProject(p, query)))
  );

  private filterProject(p: Project, rawQuery: string): boolean {
    if (!rawQuery) return true;
    const hasTrailingSpace = /\s+$/.test(rawQuery);
    const trimmed = rawQuery.trim().toLowerCase();
    if (!trimmed) return true;

    // Check status match
    if (p.status.toLowerCase().includes(trimmed)) {
      return true;
    }

    // Exact ID match if query is purely numeric
    if (/^\d+$/.test(trimmed)) {
      return p.id === Number(trimmed);
    }

    // Normalize query and project name (replace dashes, colons with spaces)
    const cleanQuery = trimmed.replace(/[—–\-:]/g, ' ');
    const tokens = cleanQuery.split(/\s+/).filter(t => Boolean(t));
    if (tokens.length === 0) return true;

    const cleanName = p.name.toLowerCase().replace(/[—–\-:]/g, ' ').replace(/\s+/g, ' ');

    return tokens.every((token, index) => {
      const isLast = index === tokens.length - 1;
      const isNumber = /^\d+$/.test(token);

      if (isNumber || (isLast && hasTrailingSpace)) {
        const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Word boundary followed by non-digit so "3" does not match "30" or "355"
        const regex = new RegExp(`\\b${escaped}(?!\\d)`, 'i');
        return regex.test(cleanName) || (isNumber && p.id === Number(token));
      } else {
        return cleanName.includes(token);
      }
    });
  }

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
}
