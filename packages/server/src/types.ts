import { z } from 'zod';
import {
  AVATAR_OPTIONS,
  COLOR_OPTIONS,
  MAP_SIZE_OPTIONS,
  MAX_PLAYERS_OPTIONS,
} from '@roborally/shared';

export const PlayerSettingsSchema = z.object({
  name: z.string().min(1).max(12),
  avatar: z.enum(AVATAR_OPTIONS),
  color: z.enum(COLOR_OPTIONS),
});

export const CreateRoomSchema = z.object({
  name: z.string().min(1).max(20),
  mapSize: z.union([z.enum(MAP_SIZE_OPTIONS.map(String) as [string, ...string[]]), z.number()]).transform(Number),
  maxPlayers: z.union([z.enum(MAX_PLAYERS_OPTIONS.map(String) as [string, ...string[]]), z.number()]).transform(Number),
});

export const JoinRoomSchema = z.object({
  code: z.string().length(4).toUpperCase(),
  playerName: z.string().min(1).max(12),
  playerAvatar: z.enum(AVATAR_OPTIONS),
  playerColor: z.enum(COLOR_OPTIONS),
});

export const ProgramDataSchema = z.object({
  registers: z.array(
    z.object({
      id: z.string(),
      type: z.enum(['u_turn', 'rotate_left', 'rotate_right', 'forward_1', 'forward_2', 'forward_3', 'backup_1', 'backup_2', 'backup_3', 'power_down']),
      priority: z.number(),
    }).nullable()
  ).length(5),
  powerDown: z.boolean(),
});

export const ChatMessageSchema = z.object({
  message: z.string().min(1).max(200),
});

export type PlayerSettings = z.infer<typeof PlayerSettingsSchema>;
export type CreateRoomInput = z.infer<typeof CreateRoomSchema>;
export type JoinRoomInput = z.infer<typeof JoinRoomSchema>;
export type ProgramDataInput = z.infer<typeof ProgramDataSchema>;
export type ChatMessageInput = z.infer<typeof ChatMessageSchema>;
