import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { DeleteTodoResponse, DummyJsonTodosResponse, MetadataResponse, RawTodo } from '../models/api.model';

@Injectable({
  providedIn: 'root'
})
export class TodoApiService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  /**
   * One-time metadata call to fetch all todos trimmed to userId and completed status
   * Endpoint: GET /todos?limit=0&select=userId,completed
   */
  getProjectMetadata(simulateFailure = false): Observable<MetadataResponse> {
    if (simulateFailure) {
      return this.http.get<MetadataResponse>(`${this.baseUrl}/http/500`).pipe(
        catchError(this.handleError)
      );
    }

    const url = `${this.baseUrl}/todos?limit=0&select=userId,completed`;
    return this.http.get<MetadataResponse>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Server-side paginated fetch for a specific project (user)
   * Endpoint: GET /todos/user/:userId?limit={limit}&skip={skip}
   */
  getUserTasks(
    userId: number,
    limit: number = environment.defaultPageSize,
    skip: number = 0,
    simulateFailure = false
  ): Observable<DummyJsonTodosResponse> {
    if (simulateFailure) {
      return this.http.get<DummyJsonTodosResponse>(`${this.baseUrl}/http/500`).pipe(
        catchError(this.handleError)
      );
    }

    const url = `${this.baseUrl}/todos/user/${userId}?limit=${limit}&skip=${skip}`;
    return this.http.get<DummyJsonTodosResponse>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Fetch a single task by ID
   * Endpoint: GET /todos/:id
   */
  getTaskById(id: number | string, simulateFailure = false): Observable<RawTodo> {
    if (simulateFailure) {
      return this.http.get<RawTodo>(`${this.baseUrl}/http/500`).pipe(
        catchError(this.handleError)
      );
    }

    const url = `${this.baseUrl}/todos/${id}`;
    return this.http.get<RawTodo>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Create a new task
   * Endpoint: POST /todos/add
   * Note: DummyJSON returns simulated response (usually id: 151)
   */
  createTask(
    payload: { todo: string; completed: boolean; userId: number },
    simulateFailure = false
  ): Observable<RawTodo> {
    if (simulateFailure) {
      return this.http.post<RawTodo>(`${this.baseUrl}/http/500`, payload).pipe(
        catchError(this.handleError)
      );
    }

    const url = `${this.baseUrl}/todos/add`;
    return this.http.post<RawTodo>(url, payload).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Update task status or details
   * Endpoint: PATCH /todos/:id
   */
  updateTask(
    id: number | string,
    changes: { completed?: boolean; todo?: string },
    simulateFailure = false
  ): Observable<RawTodo> {
    if (simulateFailure) {
      return this.http.patch<RawTodo>(`${this.baseUrl}/http/500`, changes).pipe(
        catchError(this.handleError)
      );
    }

    const url = `${this.baseUrl}/todos/${id}`;
    return this.http.patch<RawTodo>(url, changes).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Delete a task
   * Endpoint: DELETE /todos/:id
   */
  deleteTask(
    id: number | string,
    simulateFailure = false
  ): Observable<DeleteTodoResponse> {
    if (simulateFailure) {
      return this.http.delete<DeleteTodoResponse>(`${this.baseUrl}/http/500`).pipe(
        catchError(this.handleError)
      );
    }

    const url = `${this.baseUrl}/todos/${id}`;
    return this.http.delete<DeleteTodoResponse>(url).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unexpected network error occurred';
    if (error.error instanceof ErrorEvent) {
      // Client-side or network error
      errorMessage = `Client error: ${error.error.message}`;
    } else {
      // Backend returned an unsuccessful response code
      errorMessage = error.status === 500
        ? 'Simulated Server Error (HTTP 500) triggered.'
        : `API error (HTTP ${error.status}): ${error.message || 'Request failed'}`;
    }
    return throwError(() => new Error(errorMessage));
  }
}
