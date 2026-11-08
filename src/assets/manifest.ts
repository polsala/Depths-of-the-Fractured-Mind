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
  chest: assetUrl("assets/sprites/objects/chest.webp"),
  stairsUp: assetUrl("assets/tilesets/floors/strais_up.webp"),
  stairsDown: assetUrl("assets/tilesets/floors/strais_down.webp"),
  vendor: assetUrl("assets/sprites/characters/npc/vendor.webp"),
  keeper: assetUrl("assets/sprites/characters/npc/vendor.webp"), // Reuse existing NPC art until a dedicated Keeper asset exists.
};

export const DEPTH_TEXTURES: Record<number, { wall: string; floor: string; wallAlt?: string }> = {
  1: {
    wall: assetUrl("assets/textures/depth1/d1_wall_base_threshold.webp"),
    wallAlt: assetUrl("assets/textures/depth1/d1_wall_warning_stripes.webp"),
    floor: assetUrl("assets/textures/depth1/d1_floor_linoleum.webp"),
  },
  2: {
    wall: assetUrl("assets/textures/depth2/d2_wall_archive_cabinets.webp"),
    floor: assetUrl("assets/textures/depth2/d2_floor_office_tiles.webp"),
  },
  3: {
    wall: assetUrl("assets/textures/depth3/d3_wall_hospital.webp"),
    wallAlt: assetUrl("assets/textures/depth3/d3_wall_padded_cell.webp"),
    floor: assetUrl("assets/textures/depth3/d3_floor_hospital_tiles.webp"),
  },
  4: {
    wall: assetUrl("assets/textures/depth4/d4_wall_mirrored_panels.webp"),
    wallAlt: assetUrl("assets/textures/depth4/d4_wall_fractured_mirror.webp"),
    floor: assetUrl("assets/textures/depth4/d4_floor_dark_reflective.webp"),
  },
  5: {
    wall: assetUrl("assets/textures/depth5/d5_wall_biomech.webp"),
    floor: assetUrl("assets/textures/depth5/d5_floor_metal_grate.webp"),
  },
};

export const GLOBAL_TEXTURES = {
  ceiling: assetUrl("assets/textures/global/ceiling_concrete_panels.webp"),
  overlay: assetUrl("assets/textures/global/global_overlay_cracks.webp"),
};
