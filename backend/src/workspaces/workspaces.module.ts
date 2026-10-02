import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkspaceMembersController } from './workspace-members.controller';
import { WorkspaceMembersService } from './workspace-members.service';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';

@Module({
	imports: [PrismaModule],
	controllers: [WorkspacesController, WorkspaceMembersController],
	providers: [WorkspacesService, WorkspaceMembersService],
	exports: [WorkspacesService],
})
export class WorkspacesModule {}
