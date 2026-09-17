import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-badge',
  templateUrl: './badge.component.html',
  styleUrls: ['./badge.component.scss']
})
export class BadgeComponent {
  @Input() label = '';
  @Input() type: 'status' | 'priority' = 'status';

  get badgeClasses(): string {
    const clean = (this.label || '').toLowerCase().replace(/[\s-]/g, '');
    return `badge-${clean}`;
  }
}
