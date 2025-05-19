export type CellOwner = 'player' | 'enemy' | 'neutral';

export interface CellData {
  id: string;
  x: number;
  y: number;
  units: number;
  owner: CellOwner;
  unitGrowthRate: number; // units added per second
}

export interface PathData {
  id: string;
  sourceCellId: string;
  targetCellId: string;
  unitTransferRate: number; // units transferred per second
  owner: CellOwner;
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
}