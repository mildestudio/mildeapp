import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddProjectMemberDto {
	@IsString()
	@IsNotEmpty()
	@ApiProperty({ description: 'ID from GET /workspaces/:workspaceId/members. Must belong to the project workspace; a User ID is not accepted.' })
	workspaceMemberId!: string;
}
