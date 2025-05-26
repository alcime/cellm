// Clean, extensible types for the cell game engine

export type PlayerId = 'player' | 'enemy' | 'neutral' | string;

export interface Position {
  x: number;
  y: number;
}

export interface CellType {
  id: string;
  name: string;
  productionMultiplier: number;
  defenseBonus: number;
  maxUnits?: number;
  special?: {
    factory?: boolean;
    fortress?: boolean;
  };
}

export interface Cell {
  id: string;
  position: Position;
  units: number;
  owner: PlayerId;
  type: CellType;
  
  // Strategy game extensions
  resources?: { [resourceType: string]: number };
  buildings?: string[];
  status?: 'normal' | 'under_siege' | 'captured' | 'fortified';
}

export interface Unit {
  id: string;
  owner: PlayerId;
  position: Position;
  targetCellId: string;
  unitCount: number;
  progress: number; // 0-1
  
  // Movement properties
  travelSpeed: number; // units per second based on distance
  
  // Battle state
  battleState?: 'moving' | 'fighting' | 'retreating';
  battlePosition?: Position; // Position during battle (offset from cell)
  
  // Strategy game extensions
  unitType?: string;
  experience?: number;
  equipment?: string[];
}

export interface Path {
  id: string;
  sourceCellId: string;
  targetCellId: string;
  owner: PlayerId;
  active: boolean;
  
  // Visual properties
  type: 'straight' | 'curved';
  color?: string;
  thickness?: number;
}

export interface Battle {
  id: string;
  cellId: string;
  attackers: Unit[];
  defenderUnits: number;
  defenderOwner: PlayerId;
  startTime: number;
  duration: number; // Total battle time in seconds
  progress: number; // 0-1
}

export interface GameState {
  cells: Cell[];
  units: Unit[];
  paths: Path[];
  battles: Battle[]; // Active battles
  
  // Game status
  currentPlayer: PlayerId;
  turn: number;
  gamePhase: 'setup' | 'playing' | 'paused' | 'ended';
  winner?: PlayerId;
  
  // Strategy game extensions
  resources?: { [playerId: string]: { [resourceType: string]: number } };
  research?: { [playerId: string]: string[] };
  diplomacy?: { [key: string]: 'ally' | 'enemy' | 'neutral' };
}

export interface GameConfig {
  mapSize: { width: number; height: number };
  cellTypes: CellType[];
  unitSpeed: number;
  productionInterval: number;
  battleDuration: number; // How long battles take in seconds
  
  // Strategy extensions
  enableResources?: boolean;
  enableDiplomacy?: boolean;
  enableTech?: boolean;
}

// Events for extensibility
export interface GameEvent {
  type: string;
  timestamp: number;
  data: any;
}

export type GameEventType = 
  | 'cell_clicked'
  | 'units_sent'
  | 'cell_captured'
  | 'units_arrived'
  | 'battle_started'
  | 'battle_progress'
  | 'battle_ended'
  | 'production_cycle'
  | 'game_ended';