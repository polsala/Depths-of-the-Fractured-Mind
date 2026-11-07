// One path contract for the current art/audio set. Future atlases and animation
// metadata can extend this manifest without coupling game rules to the DOM.
export function assetUrl(relativePath: string): string {
  const base = import.meta.env.BASE_URL || "/";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  return `${normalizedBase}${relativePath.replace(/^\//, "")}`;
}

export const MUSIC_BY_DEPTH: Record<number, string> = {
  1: "depth1_ambient",
  2: "depth2_archive",
  3: "depth3_ward",
  4: "depth4_mirrors",
  5: "core_heart",
};

export const OBJECT_SPRITES = {
  chest: assetUrl("assets/sprites/objects/chest.png"),
  stairsUp: assetUrl("assets/tilesets/floors/strais_up.png"),
  stairsDown: assetUrl("assets/tilesets/floors/strais_down.png"),
  vendor: assetUrl("assets/sprites/characters/npc/vendor.png"),
  keeper: assetUrl("assets/sprites/characters/npc/vendor.png"), // Reuse existing NPC art until the Pack 5 atlas pass.
};

export const DEPTH_TEXTURES: Record<number, { wall: string; floor: string; door?: string; wallAlt?: string }> = {
  1: {
    wall: assetUrl("assets/textures/depth1/d1_wall_base_threshold.png"),
    wallAlt: assetUrl("assets/textures/depth1/d1_wall_warning_stripes.png"),
    floor: assetUrl("assets/textures/depth1/d1_floor_linoleum.png"),
    door: assetUrl("assets/textures/depth1/d1_door_metal_security.png"),
  },
  2: {
    wall: assetUrl("assets/textures/depth2/d2_wall_archive_cabinets.png"),
    floor: assetUrl("assets/textures/depth2/d2_floor_office_tiles.png"),
    door: assetUrl("assets/textures/depth2/d2_door_records.png"),
  },
  3: {
    wall: assetUrl("assets/textures/depth3/d3_wall_hospital.png"),
    wallAlt: assetUrl("assets/textures/depth3/d3_wall_padded_cell.png"),
    floor: assetUrl("assets/textures/depth3/d3_floor_hospital_tiles.png"),
    door: assetUrl("assets/textures/depth3/d3_door_medical.png"),
  },
  4: {
    wall: assetUrl("assets/textures/depth4/d4_wall_mirrored_panels.png"),
    wallAlt: assetUrl("assets/textures/depth4/d4_wall_fractured_mirror.png"),
    floor: assetUrl("assets/textures/depth4/d4_floor_dark_reflective.png"),
  },
  5: {
    wall: assetUrl("assets/textures/depth5/d5_wall_biomech.png"),
    floor: assetUrl("assets/textures/depth5/d5_floor_metal_grate.png"),
    door: assetUrl("assets/textures/depth5/d5_door_core_bulkhead.png"),
  },
};

export const GLOBAL_TEXTURES = {
  ceiling: assetUrl("assets/textures/global/ceiling_concrete_panels.png"),
  overlay: assetUrl("assets/textures/global/global_overlay_cracks.png"),
};
