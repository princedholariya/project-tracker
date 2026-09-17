export type TaskPriority = 'Low' | 'Medium' | 'High';

export interface Task {
  id: string | number;
  todo: string;
  completed: boolean;
  userId: number;
  priority: TaskPriority;
  dueDate: string;
  formattedDueDate?: string;
  isOverdue?: boolean;
  isLocal?: boolean;
  isUpdating?: boolean;
  isDeleting?: boolean;
}

export interface CreateTaskDto {
  todo: string;
  completed: boolean;
  userId: number;
  priority: TaskPriority;
  dueDate: string;
}

export interface UpdateTaskDto {
  todo?: string;
  completed?: boolean;
  priority?: TaskPriority;
  dueDate?: string;
}
