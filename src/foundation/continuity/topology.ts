import type { ID } from "../core/contracts";

export interface SpatialAnchor {
  id: ID;
  label: string;
  kind: "point" | "surface" | "portal" | "zone" | "path";
}

export interface SpatialRelation {
  from: ID;
  to: ID;
  relation: "connected-to" | "inside" | "outside" | "left-of" | "right-of" | "ahead-of" | "behind" | "faces";
  bidirectional?: boolean;
}

export interface LocationTopology {
  locationId: ID;
  anchors: SpatialAnchor[];
  relations: SpatialRelation[];
}

export function hasAnchor(topology: LocationTopology, anchorId: ID): boolean {
  return topology.anchors.some((anchor) => anchor.id === anchorId);
}

export function relationExists(
  topology: LocationTopology,
  from: ID,
  to: ID,
  relation: SpatialRelation["relation"]
): boolean {
  return topology.relations.some((item) => {
    const direct = item.from === from && item.to === to && item.relation === relation;
    const reverse = item.bidirectional && item.from === to && item.to === from && item.relation === relation;
    return direct || Boolean(reverse);
  });
}
