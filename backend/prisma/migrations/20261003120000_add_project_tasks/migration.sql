-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'SUBMITTED', 'REVISION_REQUESTED', 'APPROVED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TaskActivityType" AS ENUM ('CREATED', 'STARTED', 'SUBMITTED', 'REVISION_REQUESTED', 'APPROVED');

-- Add composite keys used to enforce project, workspace, and role integrity.
CREATE UNIQUE INDEX "WorkspaceMember_id_workspaceId_role_key" ON "WorkspaceMember"("id", "workspaceId", "role");
CREATE UNIQUE INDEX "ProjectMember_id_workspaceMemberId_projectId_workspaceId_key" ON "ProjectMember"("id", "workspaceMemberId", "projectId", "workspaceId");

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "assigneeProjectMemberId" TEXT NOT NULL,
    "assigneeWorkspaceMemberId" TEXT NOT NULL,
    "assigneeRole" "WorkspaceRole" NOT NULL DEFAULT 'EMPLOYEE',
    "createdByWorkspaceMemberId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "dueDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Task_assigneeRole_employee_check" CHECK ("assigneeRole" = 'EMPLOYEE'),
    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskActivity" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "actorWorkspaceMemberId" TEXT NOT NULL,
    "type" "TaskActivityType" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Task_id_workspaceId_key" ON "Task"("id", "workspaceId");
CREATE INDEX "Task_projectId_status_createdAt_idx" ON "Task"("projectId", "status", "createdAt");
CREATE INDEX "Task_assigneeWorkspaceMemberId_status_dueDate_idx" ON "Task"("assigneeWorkspaceMemberId", "status", "dueDate");
CREATE INDEX "Task_workspaceId_status_updatedAt_idx" ON "Task"("workspaceId", "status", "updatedAt");
CREATE INDEX "TaskActivity_taskId_createdAt_id_idx" ON "TaskActivity"("taskId", "createdAt", "id");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_workspaceId_fkey"
    FOREIGN KEY ("projectId", "workspaceId") REFERENCES "Project"("id", "workspaceId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeProjectMemberId_assigneeWorkspaceMemberId_projectId_workspaceId_fkey"
    FOREIGN KEY ("assigneeProjectMemberId", "assigneeWorkspaceMemberId", "projectId", "workspaceId")
    REFERENCES "ProjectMember"("id", "workspaceMemberId", "projectId", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeWorkspaceMemberId_workspaceId_assigneeRole_fkey"
    FOREIGN KEY ("assigneeWorkspaceMemberId", "workspaceId", "assigneeRole")
    REFERENCES "WorkspaceMember"("id", "workspaceId", "role") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdByWorkspaceMemberId_workspaceId_fkey"
    FOREIGN KEY ("createdByWorkspaceMemberId", "workspaceId") REFERENCES "WorkspaceMember"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaskActivity" ADD CONSTRAINT "TaskActivity_taskId_workspaceId_fkey"
    FOREIGN KEY ("taskId", "workspaceId") REFERENCES "Task"("id", "workspaceId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskActivity" ADD CONSTRAINT "TaskActivity_actorWorkspaceMemberId_workspaceId_fkey"
    FOREIGN KEY ("actorWorkspaceMemberId", "workspaceId") REFERENCES "WorkspaceMember"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;
