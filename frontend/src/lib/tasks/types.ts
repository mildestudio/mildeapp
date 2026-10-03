export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'SUBMITTED' | 'REVISION_REQUESTED' | 'APPROVED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskActivityType = 'CREATED' | 'STARTED' | 'SUBMITTED' | 'REVISION_REQUESTED' | 'APPROVED';

export interface TaskSummary {
	id: string;
	projectId: string;
	project: { id: string; name: string };
	title: string;
	description: string | null;
	status: TaskStatus;
	priority: TaskPriority;
	dueDate: string | null;
	createdAt: string;
	updatedAt: string;
	assignee: { workspaceMemberId: string; name: string };
	submittedAt: string | null;
	submittedBy: string | null;
}

export interface TaskDetail extends Omit<TaskSummary, 'assignee' | 'submittedAt' | 'submittedBy'> {
	viewerRole: 'OWNER' | 'EMPLOYEE';
	assignee: { workspaceMemberId: string; user: { id: string; name: string } };
	assigneeProjectMemberId: string;
	createdBy: { workspaceMemberId: string; user: { id: string; name: string } };
	activities: TaskActivity[];
}

export interface TaskActivity {
	id: string;
	type: TaskActivityType;
	comment: string | null;
	createdAt: string;
	actor: { name: string };
}

export interface CreateTaskInput {
	title: string;
	description: string | null;
	assigneeId: string;
	priority: TaskPriority;
	dueDate: string | null;
}

export type UpdateTaskInput = Partial<Omit<CreateTaskInput, 'assigneeId'>> & { assigneeId?: string };
