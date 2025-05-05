/**
 * Pin service with CRUD operations
 */

import { Pin, pins, PinType, pinColors } from "../models/pin";
import { getAll, getById, filterBy } from "./data-service";

/**
 * Get all pins
 */
export function getPins(): Pin[] {
  return getAll<Pin>("pins", pins);
}

/**
 * Get pin by ID
 */
export function getPin(id: number): Pin | undefined {
  return getById<Pin>("pin", id, pins);
}

/**
 * Get pins by type
 */
export function getPinsByType(type: PinType): Pin[] {
  return filterBy<Pin>("pins", "type", type, pins, (pin) => pin.type === type);
}

/**
 * Get pins by user ID
 */
export function getPinsByUser(userId: number): Pin[] {
  return filterBy<Pin>(
    "pins",
    "user",
    userId,
    pins,
    (pin) => pin.user.id === userId
  );
}

/**
 * Get color for pin type
 */
export function getPinColor(type: PinType): string {
  return pinColors[type];
}

/**
 * Get nearby pins based on lat/lng and radius
 */
export function getNearbyPins(lat: number, lng: number, radiusInKm = 5): Pin[] {
  // In a real app, we would calculate distance and filter
  // For demo purposes, we're just returning all pins
  return pins;
}
