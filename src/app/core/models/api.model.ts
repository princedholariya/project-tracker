export interface RawTodo {
  id: number;
  todo: string;
  completed: boolean;
  userId: number;
}

export interface DummyJsonTodosResponse {
  todos: RawTodo[];
  total: number;
  skip: number;
  limit: number;
}

export interface MetadataTodoItem {
  id: number;
  completed: boolean;
  userId: number;
}

export interface MetadataResponse {
  todos: MetadataTodoItem[];
  total: number;
  skip: number;
  limit: number;
}

export interface PaginationParams {
  limit: number;
  skip: number;
}

export interface DeleteTodoResponse {
  id: number;
  todo?: string;
  completed?: boolean;
  userId?: number;
  isDeleted: boolean;
  deletedOn?: string;
}

