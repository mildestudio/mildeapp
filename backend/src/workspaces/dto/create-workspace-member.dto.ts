import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { WorkspaceRole } from '@prisma/client';

export class CreateWorkspaceMemberDto {
	@IsString()
	@IsNotEmpty()
	userId!: string;

	@IsEnum(WorkspaceRole)
	role!: WorkspaceRole;
}
