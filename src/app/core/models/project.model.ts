export type ProjectStatus = 'Not Started' | 'In Progress' | 'Completed';

export interface Project {
  id: number;
  name: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  status: ProjectStatus;
  progressPercentage: number;
  updatedAtText?: string;
}

export interface DashboardStats {
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  completionRate: number;
  tasksByStatus: {
    notStarted: number;
    notStartedPercent: number;
    inProgress: number;
    inProgressPercent: number;
    completed: number;
    completedPercent: number;
  };
  projectsSnapshot: Project[];
}
