/**
 * Direction utilities for player orientation
 */

import type { Direction } from "./renderer";

/**
 * Rotate direction 90 degrees clockwise
 */
export function rotateClockwise(direction: Direction): Direction {
  const rotations: Record<Direction, Direction> = {
    north: "east",
    east: "south",
    south: "west",
    west: "north",
  };
  return rotations[direction];
}

/**
 * Rotate direction 90 degrees counter-clockwise
 */
export function rotateCounterClockwise(direction: Direction): Direction {
  const rotations: Record<Direction, Direction> = {
    north: "west",
    west: "south",
    south: "east",
    east: "north",
  };
  return rotations[direction];
}

/**
 * Get the arrow symbol for a direction
 */
export function getDirectionArrow(direction: Direction): string {
  const arrows: Record<Direction, string> = {
    north: "↑",
    east: "→",
    south: "↓",
    west: "←",
  };
  return arrows[direction];
}

/**
 * Get the full name of a direction
 */
export function getDirectionName(direction: Direction): string {
  const names: Record<Direction, string> = {
    north: "North",
    east: "East",
    south: "South",
    west: "West",
  };
  return names[direction];
}
