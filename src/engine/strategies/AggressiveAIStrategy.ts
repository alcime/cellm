import { BaseAIStrategy, AIDecision } from '../AIStrategy';
import { GameState, Cell, PlayerId } from '../types';

export class AggressiveAIStrategy extends BaseAIStrategy {
  constructor(playerId: PlayerId) {
    super(playerId, 'Aggressive', {
      aggressiveness: 0.9,
      riskTolerance: 0.8,
      economicFocus: 0.2,
      coordinationLevel: 0.9,
      defensiveBonus: 0.8
    });
  }

  public makeDecisions(gameState: GameState): AIDecision[] {
    const aiCells = gameState.cells.filter(cell => cell.owner === this.playerId);
    const metrics = this.evaluateGameState(gameState);

    console.log(`Aggressive AI evaluating ${aiCells.length} cells`);

    const decisions: AIDecision[] = [];

    // Prioritize weakest enemies first for quick expansion
    for (const aiCell of aiCells) {
      if (aiCell.units <= 2) continue; // Keep minimal defense

      const weakestTarget = this.findWeakestTarget(aiCell, gameState);
      if (weakestTarget) {
        const decision = this.evaluateAggressiveAttack(aiCell, weakestTarget, gameState);
        if (decision) {
          decisions.push(decision);
        }
      }
    }

    return this.coordinateAttacks(decisions, gameState);
  }

  private findWeakestTarget(sourceCell: Cell, gameState: GameState): Cell | null {
    const enemyCells = gameState.cells.filter(cell => 
      cell.owner !== this.playerId && cell.owner !== 'neutral'
    );
    const neutralCells = gameState.cells.filter(cell => cell.owner === 'neutral');
    
    // Prioritize weak enemies over neutrals
    const allTargets = [...enemyCells, ...neutralCells].filter(target => {
      const distance = this.calculateDistance(sourceCell.position, target.position);
      return distance < 300; // Only consider nearby targets
    });

    if (allTargets.length === 0) return null;

    // Sort by units (ascending) to find weakest
    allTargets.sort((a, b) => a.units - b.units);
    return allTargets[0];
  }

  private evaluateAggressiveAttack(sourceCell: Cell, targetCell: Cell, gameState: GameState): AIDecision | null {
    // Aggressive strategy: attack with just 1.5x advantage
    const requiredUnits = Math.ceil(targetCell.units * 1.5);
    
    if (sourceCell.units > requiredUnits + 1) { // Keep 1 unit for defense
      // Send most units, keep minimal defense
      const unitsToSend = sourceCell.units - 1;
      
      return {
        sourceCellId: sourceCell.id,
        targetCellId: targetCell.id,
        unitCount: unitsToSend,
        priority: targetCell.owner === 'neutral' ? 6 : 8, // Higher priority for enemy cells
        type: 'attack'
      };
    }

    return null;
  }

  protected applyCoordinationRules(attackers: AIDecision[], targetCellId: string, gameState: GameState): AIDecision[] {
    const targetCell = gameState.cells.find(c => c.id === targetCellId);
    if (!targetCell) return attackers;

    const totalUnits = attackers.reduce((sum, a) => sum + a.unitCount, 0);
    
    // Aggressive coordination: proceed with any advantage
    if (totalUnits > targetCell.units) {
      return attackers; // All attackers proceed if any advantage
    } else {
      // Even risky attacks proceed with aggressive strategy
      return attackers.filter(a => a.unitCount >= targetCell.units * 0.8);
    }
  }
}