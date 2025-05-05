/**
 * Message service with CRUD operations
 */

import { Message, messages } from "../models/message";
import { getAll } from "./data-service";

/**
 * Get all messages
 */
export function getMessages(): Message[] {
  return getAll<Message>("messages", messages);
}
