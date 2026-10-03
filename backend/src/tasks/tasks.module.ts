import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { ProjectTasksController, TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
	imports: [ProjectsModule, WorkspacesModule],
	controllers: [ProjectTasksController, TasksController],
	providers: [TasksService],
})
export class TasksModule {}
