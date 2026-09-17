import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { TaskStateService } from '../services/task-state.service';

@Injectable({
  providedIn: 'root'
})
export class ProjectExistsGuard implements CanActivate {
  constructor(
    private readonly stateService: TaskStateService,
    private readonly router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot
  ): Observable<boolean> {
    const rawId = route.paramMap.get('userId');
    const userId = Number(rawId);

    if (!rawId || isNaN(userId) || userId <= 0) {
      this.router.navigate(['/projects']);
      return of(false);
    }

    return this.stateService.loadProjects().pipe(
      map(projects => {
        const exists = projects.some(p => p.id === userId);
        if (!exists) {
          this.stateService.setError(`Project with User ID "${userId}" does not exist.`);
          this.router.navigate(['/projects']);
          return false;
        }
        return true;
      }),
      catchError(() => of(true))
    );
  }
}
