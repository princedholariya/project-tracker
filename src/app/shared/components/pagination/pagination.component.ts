import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss']
})
export class PaginationComponent {
  @Input() total = 0;
  @Input() limit = 6;
  @Input() skip = 0;
  @Input() page = 1;
  @Input() totalPages = 1;

  @Output() pageChange = new EventEmitter<number>();

  get fromItem(): number {
    if (this.total === 0) return 0;
    return this.skip + 1;
  }

  get toItem(): number {
    return Math.min(this.skip + this.limit, this.total);
  }

  get isFirstPage(): boolean {
    return this.page <= 1;
  }

  get isLastPage(): boolean {
    // Edge case 4.4a: last page boundary check
    return this.page >= this.totalPages || (this.skip + this.limit) >= this.total;
  }

  get pages(): number[] {
    const pagesCount = Math.max(1, this.totalPages);
    const result: number[] = [];
    for (let i = 1; i <= pagesCount; i++) {
      result.push(i);
    }
    return result;
  }

  onPageClick(targetPage: number): void {
    if (targetPage >= 1 && targetPage <= this.totalPages && targetPage !== this.page) {
      this.pageChange.emit(targetPage);
    }
  }
}
