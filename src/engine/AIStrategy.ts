import { GameState, Cell, PlayerId } from './types';

export interface AIDecision {
  sourceCellId: string;
  targetCellId: string;
  unitCount: number;
}

export class AIStrategy {
  private playerId: PlayerId;

  constructor(playerId: PlayerId) {
    this.playerId = playerId;
  }

  public makeDecisions(gameState: GameState): AIDecision[] {
    const decisions: AIDecision[] = [];
    const aiCells = gameState.cells.filter(cell => cell.owner === this.playerId);

    console.log(`AI found ${aiCells.length} cells owned by ${this.playerId}`);

    for (const aiCell of aiCells) {
      console.log(`Evaluating AI cell ${aiCell.id} with ${aiCell.units} units`);
      const decision = this.evaluateCell(aiCell, gameState);
      if (decision) {
        decisions.push(decision);
        console.log(`Decision made: attack ${decision.targetCellId} with ${decision.unitCount} units`);
      } else {
        console.log(`No decision made for cell ${aiCell.id}`);
      }
    }

    return decisions;
  }

  private evaluateCell(sourceCell: Cell, gameState: GameState): AIDecision | null {
    // Find closest non-ally cell
    const targetCell = this.findClosestNonAllyCell(sourceCell, gameState);
    if (!targetCell) {
      console.log(`No target found for AI cell ${sourceCell.id}`);
      return null;
    }

    console.log(`Target found: ${targetCell.id} (${targetCell.owner}) with ${targetCell.units} units`);

    // Check if we have 3x more units than the target
    const requiredUnits = targetCell.units * 3;
    console.log(`Required units for attack: ${requiredUnits}, AI has: ${sourceCell.units}`);
    
    if (sourceCell.units > requiredUnits) {
      // Send half our units, but ensure we keep at least 1
      const unitsToSend = Math.max(1, Math.floor((sourceCell.units - 1) / 2));
      
      console.log(`AI will send ${unitsToSend} units to attack`);
      
      return {
        sourceCellId: sourceCell.id,
        targetCellId: targetCell.id,
        unitCount: unitsToSend
      };
    } else {
      console.log(`Not enough units to attack - need ${requiredUnits}, have ${sourceCell.units}`);
    }

    return null;
  }

  private findClosestNonAllyCell(sourceCell: Cell, gameState: GameState): Cell | null {
    // Consider both enemy and neutral cells as potential targets
    const targetCells = gameState.cells.filter(cell => 
      cell.owner !== this.playerId
    );

    if (targetCells.length === 0) return null;

    return this.getClosestCell(sourceCell, targetCells);
  }

  private getClosestCell(sourceCell: Cell, targetCells: Cell[]): Cell | null {
    if (targetCells.length === 0) return null;

    let closestCell = targetCells[0];
    let closestDistance = this.calculateDistance(sourceCell.position, closestCell.position);

    for (let i = 1; i < targetCells.length; i++) {
      const distance = this.calculateDistance(sourceCell.position, targetCells[i].position);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestCell = targetCells[i];
      }
    }

    return closestCell;
  }

  private calculateDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}