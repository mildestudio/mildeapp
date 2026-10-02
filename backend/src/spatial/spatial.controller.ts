import { ApiCookieAuth, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateSpaceDto, UpdateSpaceDto, CreateSceneDto, UpdateSceneDto, CreateHotspotDto, UpdateHotspotDto } from './dto/spatial.dto';
import { SpatialService } from './spatial.service';

@ApiTags('Spaces')
@ApiCookieAuth('cookieAuth')
@ApiUnauthorizedResponse({ description: 'A valid HttpOnly login cookie is required.' })
@Controller('projects/:projectId/spaces')
@UseGuards(JwtAuthGuard)
export class ProjectSpacesController {
  constructor(private readonly spatial: SpatialService) {}
  @ApiOperation({ summary: "Read this project's spaces and ordered scenes" })
  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string) {
    return this.spatial.listSpaces(user.id, projectId);
  }
  @ApiOperation({ summary: "Create a project space (OWNER only)" })
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string, @Body() input: CreateSpaceDto) {
    return this.spatial.createSpace(user.id, projectId, input);
  }
}

@ApiTags('Spaces')
@ApiCookieAuth('cookieAuth')
@ApiUnauthorizedResponse({ description: 'A valid HttpOnly login cookie is required.' })
@Controller('spaces')
@UseGuards(JwtAuthGuard)
export class SpacesController {
  constructor(private readonly spatial: SpatialService) {}
  @ApiOperation({ summary: "Edit a space (OWNER only)" })
  @Patch(':spaceId')
  update(@CurrentUser() user: AuthenticatedUser, @Param('spaceId') spaceId: string, @Body() input: UpdateSpaceDto) {
    return this.spatial.updateSpace(user.id, spaceId, input);
  }
  @ApiOperation({ summary: "Delete a space and its scenes/hotspots (OWNER only)" })
  @Delete(':spaceId')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('spaceId') spaceId: string) {
    return this.spatial.deleteSpace(user.id, spaceId);
  }
  @ApiOperation({ summary: "Read scenes in a space (owner or assigned member)" })
  @Get(':spaceId/scenes')
  listScenes(@CurrentUser() user: AuthenticatedUser, @Param('spaceId') spaceId: string) {
    return this.spatial.listScenes(user.id, spaceId);
  }
  @ApiOperation({ summary: "Create a scene in a space (OWNER only)" })
  @Post(':spaceId/scenes')
  createScene(@CurrentUser() user: AuthenticatedUser, @Param('spaceId') spaceId: string, @Body() input: CreateSceneDto) {
    return this.spatial.createScene(user.id, spaceId, input);
  }
}

@ApiTags('Scenes')
@ApiCookieAuth('cookieAuth')
@ApiUnauthorizedResponse({ description: 'A valid HttpOnly login cookie is required.' })
@Controller('scenes')
@UseGuards(JwtAuthGuard)
export class ScenesController {
  constructor(private readonly spatial: SpatialService) {}
  @ApiOperation({ summary: "Read a scene with its hotspots (owner or assigned member)" })
  @Get(':sceneId')
  get(@CurrentUser() user: AuthenticatedUser, @Param('sceneId') sceneId: string) {
    return this.spatial.getScene(user.id, sceneId);
  }
  @ApiOperation({ summary: "Edit scene metadata (OWNER only)" })
  @Patch(':sceneId')
  update(@CurrentUser() user: AuthenticatedUser, @Param('sceneId') sceneId: string, @Body() input: UpdateSceneDto) {
    return this.spatial.updateScene(user.id, sceneId, input);
  }
  @ApiOperation({ summary: "Delete a scene and incoming navigation links (OWNER only)" })
  @Delete(':sceneId')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('sceneId') sceneId: string) {
    return this.spatial.deleteScene(user.id, sceneId);
  }
  @ApiOperation({ summary: "Create INFO or NAVIGATION hotspot; navigation requires a same-project target (OWNER only)" })
  @Post(':sceneId/hotspots')
  addHotspot(@CurrentUser() user: AuthenticatedUser, @Param('sceneId') sceneId: string, @Body() input: CreateHotspotDto) {
    return this.spatial.createHotspot(user.id, sceneId, input);
  }
}

@ApiTags('Hotspots')
@ApiCookieAuth('cookieAuth')
@ApiUnauthorizedResponse({ description: 'A valid HttpOnly login cookie is required.' })
@Controller('hotspots')
@UseGuards(JwtAuthGuard)
export class HotspotsController {
  constructor(private readonly spatial: SpatialService) {}
  @ApiOperation({ summary: "Edit a hotspot; target must remain in the same project (OWNER only)" })
  @Patch(':hotspotId')
  update(@CurrentUser() user: AuthenticatedUser, @Param('hotspotId') hotspotId: string, @Body() input: UpdateHotspotDto) {
    return this.spatial.updateHotspot(user.id, hotspotId, input);
  }
  @ApiOperation({ summary: "Delete a hotspot (OWNER only)" })
  @Delete(':hotspotId')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('hotspotId') hotspotId: string) {
    return this.spatial.deleteHotspot(user.id, hotspotId);
  }
}
