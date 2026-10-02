-- CreateEnum
CREATE TYPE "HotspotType" AS ENUM ('NAVIGATION', 'INFO');

-- CreateTable
CREATE TABLE "ProjectSpace" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectSpace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectScene" (
    "id" TEXT NOT NULL,
    "projectSpaceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "panoramaUrl" TEXT,
    "thumbnailUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "initialYaw" DOUBLE PRECISION,
    "initialPitch" DOUBLE PRECISION,
    "initialFov" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectScene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SceneHotspot" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "HotspotType" NOT NULL,
    "yaw" DOUBLE PRECISION NOT NULL,
    "pitch" DOUBLE PRECISION NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "targetSceneId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SceneHotspot_pkey" PRIMARY KEY ("id")
);

-- Navigation links must always have a destination; deleting it cascades the link.
ALTER TABLE "SceneHotspot" ADD CONSTRAINT "SceneHotspot_navigation_target_check"
CHECK ("type" <> 'NAVIGATION' OR "targetSceneId" IS NOT NULL);

-- CreateIndex
CREATE INDEX "ProjectSpace_projectId_sortOrder_idx" ON "ProjectSpace"("projectId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectSpace_id_projectId_key" ON "ProjectSpace"("id", "projectId");

-- CreateIndex
CREATE INDEX "ProjectScene_projectSpaceId_sortOrder_idx" ON "ProjectScene"("projectSpaceId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectScene_id_projectId_key" ON "ProjectScene"("id", "projectId");

-- CreateIndex
CREATE INDEX "SceneHotspot_sceneId_idx" ON "SceneHotspot"("sceneId");

-- CreateIndex
CREATE INDEX "SceneHotspot_targetSceneId_idx" ON "SceneHotspot"("targetSceneId");

-- AddForeignKey
ALTER TABLE "ProjectSpace" ADD CONSTRAINT "ProjectSpace_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectScene" ADD CONSTRAINT "ProjectScene_projectSpaceId_projectId_fkey" FOREIGN KEY ("projectSpaceId", "projectId") REFERENCES "ProjectSpace"("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneHotspot" ADD CONSTRAINT "SceneHotspot_sceneId_projectId_fkey" FOREIGN KEY ("sceneId", "projectId") REFERENCES "ProjectScene"("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneHotspot" ADD CONSTRAINT "SceneHotspot_targetSceneId_projectId_fkey" FOREIGN KEY ("targetSceneId", "projectId") REFERENCES "ProjectScene"("id", "projectId") ON DELETE CASCADE ON UPDATE CASCADE;
