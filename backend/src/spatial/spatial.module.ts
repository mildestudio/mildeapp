import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectsModule } from '../projects/projects.module';
import { ProjectSpacesController, SpacesController, ScenesController, HotspotsController } from './spatial.controller';
import { SpatialService } from './spatial.service';

@Module({
  imports: [PrismaModule, ProjectsModule],
  controllers: [ProjectSpacesController, SpacesController, ScenesController, HotspotsController],
  providers: [SpatialService],
})
export class SpatialModule {}

