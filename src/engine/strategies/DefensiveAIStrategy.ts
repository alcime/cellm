import { BaseAIStrategy, AIDecision } from '../AIStrategy';
import { GameState, Cell, PlayerId } from '../types';

export class DefensiveAIStrategy extends BaseAIStrategy {
  constructor(playerId: PlayerId) {
    super(playerId, 'Defensive', {
      aggressiveness: 0.3,
      riskTolerance: 0.2,
      economicFocus: 0.6,
      coordinationLevel: 0.4,
      defensiveBonus: 1.5
    });
  }

  public makeDecisions(gameState: GameState): AIDecision[] {
    const aiCells = gameState.cells.filter(cell => cell.owner === this.playerId);
    const metrics = this.evaluateGameState(gameState);

    console.log(`Defensive AI evaluating ${aiCells.length} cells, threat level: ${metrics.enemyThreatLevel}`);

    const decisions: AIDecision[] = [];

    // First priority: reinforce cells under attack or threatened
    this.addDefensiveReinforcements(decisions, gameState);

    // Second priority: conservative expansion only if safe
    if (metrics.enemyThreatLevel < metrics.totalUnits * 0.3) {
      this.addSafeExpansion(decisions, gameState);
    }

    return this.coordinateAttacks(decisions, gameState);
  }

  private addDefensiveReinforcements(decisions: AIDecision[], gameState: GameState): void {
    const aiCells = gameState.cells.filter(cell => cell.owner === this.playerId);
    const threatenedCells = this.findThreatenedCells(gameState);

    for (const threatened of threatenedCells) {
      // Find neighbor cells that can reinforce (within range)
      const neighborRange = 180; // Must match GameEngine's neighbor range
      const reinforcers = aiCells.filter(cell => {
        const distance = this.calculateDistance(cell.position, threatened.position);
        return distance <= neighborRange && cell.units > 3 && cell.id !== threatened.id;
      });

      for (const reinforcer of reinforcers) {
        const unitsToSend = Math.floor((reinforcer.units - 2) / 2); // Keep strong defense
        if (unitsToSend > 0) {
          decisions.push({
            sourceCellId: reinforcer.id,
            targetCellId: threatened.id,
            unitCount: unitsToSend,
            priority: 9, // High priority for defense
            type: 'reinforce'
          });
        }
      }
    }
  }

  private findThreatenedCells(gameState: GameState): Cell[] {
    const aiCells = gameState.cells.filter(cell => cell.owner === this.playerId);
    const enemyCells = gameState.cells.filter(cell => 
      cell.owner !== this.playerId && cell.owner !== 'neutral'
    );

    return aiCells.filter(aiCell => {
      // Check if cell is under direct attack
      const isUnderAttack = gameState.battles.some(b => b.cellId === aiCell.id);
      if (isUnderAttack) return true;

      // Check if nearby enemies pose a threat
      const nearbyEnemies = enemyCells.filter(enemy => {
        const distance = this.calculateDistance(aiCell.position, enemy.position);
        return distance < 200 && enemy.units >= aiCell.units * 0.8;
      });

      return nearbyEnemies.length > 0;
    });
  }

  private addSafeExpansion(decisions: AIDecision[], gameState: GameState): void {
    const aiCells = gameState.cells.filter(cell => cell.owner === this.playerId);

    for (const aiCell of aiCells) {
      if (aiCell.units <= 5) continue; // Need substantial force for safe expansion

      const safeTarget = this.findSafeTarget(aiCell, gameState);
      if (safeTarget) {
        const requiredUnits = safeTarget.units * 5; // Very conservative 5x advantage
        
        if (aiCell.units > requiredUnits + 3) { // Keep strong defense
          const unitsToSend = Math.floor((aiCell.units - 3) / 3); // Send only 1/3 of excess
          
          decisions.push({
            sourceCellId: aiCell.id,
            targetCellId: safeTarget.id,
            unitCount: unitsToSend,
            priority: 3, // Low priority for expansion
            type: 'expand'
          });
        }
      }
    }
  }

  private findSafeTarget(sourceCell: Cell, gameState: GameState): Cell | null {
    const neutralCells = gameState.cells.filter(cell => cell.owner === 'neutral');
    const enemyCells = gameState.cells.filter(cell => 
      cell.owner !== this.playerId && cell.owner !== 'neutral'
    );

    // Find neighbor neutral cells that are safe from enemies
    const neighborRange = 180; // Must match GameEngine's neighbor range
    const safeCells = neutralCells.filter(neutral => {
      const distanceFromSource = this.calculateDistance(sourceCell.position, neutral.position);
      if (distanceFromSource > neighborRange) return false; // Must be neighbor

      // Check if any enemies are nearby
      const nearbyEnemies = enemyCells.filter(enemy => {
        const distanceFromEnemy = this.calculateDistance(neutral.position, enemy.position);
        return distanceFromEnemy < 250;
      });

      return nearbyEnemies.length === 0; // Only expand to truly safe areas
    });

    if (safeCells.length === 0) return null;

    // Return weakest safe target
    safeCells.sort((a, b) => a.units - b.units);
    return safeCells[0];
  }

  protected applyCoordinationRules(attackers: AIDecision[], targetCellId: string, gameState: GameState): AIDecision[] {
    const targetCell = gameState.cells.find(c => c.id === targetCellId);
    if (!targetCell) return attackers;

    // Check if this is reinforcement (friendly target)
    if (targetCell.owner === this.playerId) {
      return attackers; // All reinforcements proceed
    }

    const totalUnits = attackers.reduce((sum, a) => sum + a.unitCount, 0);
    const requiredUnits = targetCell.units * 4; // Conservative 4x advantage required
    
    if (totalUnits >= requiredUnits) {
      return attackers; // All proceed if overwhelming advantage
    } else {
      return []; // Cancel unsafe attacks
    }
  }
}