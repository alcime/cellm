export type CellOwner = 'player' | 'enemy' | 'neutral';

export type CellType = 'standard' | 'factory' | 'fortress' | 'teleporter';

export interface CellData {
  id: string;
  x: number;
  y: number;
  units: number;
  owner: CellOwner;
  unitGrowthRate: number; // units added per second
  conquestUnits?: number; // Units after conquest (attackers - defenders)
  cellType: CellType;     // Type of cell with special abilities
  
  // Battle animation properties
  inBattle?: boolean;     // Whether cell is currently in battle
  attackers?: number;     // Number of attacking units in current battle
  defenders?: number;     // Number of defending units in current battle
  battleProgress?: number; // 0-1 progress through battle animation
  battleOwner?: CellOwner; // Owner who initiated the battle
  
  // Special attributes for different cell types
  factoryMultiplier?: number; // For factory: multiplier for unit production
  fortressDefense?: number;   // For fortress: defense bonus multiplier
  teleporterTarget?: string;  // For teleporter: target teleporter cell ID
}

export interface PathData {
  id: string;
  sourceCellId: string;
  targetCellId: string;
  unitTransferRate: number; // units transferred per second
  owner: CellOwner;
  
  // Enhanced visualization properties
  pathType: 'straight' | 'curved';
  pathStrength: 'weak' | 'medium' | 'strong'; // Visual indicator of path strength
  active: boolean; // Whether path is currently active
  lastUnitSent: number; // Timestamp of last unit sent
}

export interface UnitData {
  id: string;
  owner: CellOwner;
  position: {
    x: number;
    y: number;
  };
  targetCellId: string;
  progress: number; // 0 to 1
  units: number; // Number of units being sent in a block
  
  // Enhanced visualization properties
  trailEffect: boolean; // Whether unit leaves a trail
  pulseEffect: boolean; // Whether unit pulses as it moves
  size: number; // Visual size override
  
  // Teleportation tracking
  teleportationPath?: string[]; // IDs of teleporters this unit has passed through
}

// Battle animation system
export interface BattleData {
  id: string;
  cellId: string;
  attackers: {
    owner: CellOwner;
    initialUnits: number;
    currentUnits: number;
  };
  defenders: {
    owner: CellOwner;
    initialUnits: number;
    currentUnits: number;
  };
  progress: number; // 0 to 1
  startTime: number;
  duration: number; // in milliseconds
  resolved: boolean;
}