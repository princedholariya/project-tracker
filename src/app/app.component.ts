import { Component, OnInit } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { TaskStateService } from './core/services/task-state.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'project-tracker';

  constructor(
    private readonly router: Router,
    private readonly stateService: TaskStateService
  ) {}

  ngOnInit(): void {
    // When navigating between pages (e.g. clicking Dashboard or Projects from an error page),
    // clear transient error states so errors don't poison other pages
    this.router.events.pipe(
      filter(event => event instanceof NavigationStart)
    ).subscribe(() => {
      this.stateService.clearAllErrors();
    });
  }
}
