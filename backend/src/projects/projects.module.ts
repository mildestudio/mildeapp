import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { ProjectController } from './project.controller';
import { ProjectMembersController } from './project-members.controller';
import { ProjectMembersService } from './project-members.service';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
	imports: [PrismaModule, WorkspacesModule],
	controllers: [ProjectsController, ProjectController, ProjectMembersController],
	providers: [ProjectsService, ProjectMembersService],
	exports: [ProjectsService],
})
export class ProjectsModule {}
