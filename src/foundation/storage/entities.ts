import type { ID } from "../core/contracts";

export interface ProjectRecord {
  id: ID;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface SceneRecord {
  id: ID;
  projectId: ID;
  title: string;
  order: number;
  createdAt: string;
}

export interface ShotRecord {
  id: ID;
  sceneId: ID;
  order: number;
  createdAt: string;
}

export interface EntityHierarchy {
  projectId: ID;
  sceneId: ID;
  shotId: ID;
  takeId?: ID;
}

export function assertEntityHierarchy(
  scene: SceneRecord,
  shot: ShotRecord,
  projectId: ID
): void {
  if (scene.projectId !== projectId) throw new Error("Scene does not belong to project.");
  if (shot.sceneId !== scene.id) throw new Error("Shot does not belong to scene.");
}
