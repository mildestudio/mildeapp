import { IsEnum } from 'class-validator';
import { WorkspaceRole } from '@prisma/client';

export class UpdateWorkspaceMemberDto {
	@IsEnum(WorkspaceRole)
	role!: WorkspaceRole;
}
