import { BaseAIStrategy, AIDecision } from '../AIStrategy';
import { GameState, Cell, PlayerId } from '../types';

export class EconomicAIStrategy extends BaseAIStrategy {
  constructor(playerId: PlayerId) {
    super(playerId, 'Economic', {
      aggressiveness: 0.4,
      riskTolerance: 0.3,
      economicFocus: 0.9,
      coordinationLevel: 0.6,
      defensiveBonus: 1.2
    });
  }

  public makeDecisions(gameState: GameState): AIDecision[] {
    const aiCells = gameState.cells.filter(cell => cell.owner === this.playerId);
    const metrics = this.evaluateGameState(gameState);

    console.log(`Economic AI evaluating ${aiCells.length} cells, avg units: ${metrics.averageUnitsPerCell.toFixed(1)}`);

    const decisions: AIDecision[] = [];

    // Priority 1: Expand to high-value neutral territories
    this.addEconomicExpansion(decisions, gameState);

    // Priority 2: Consolidate weak positions
    this.addConsolidation(decisions, gameState);

    // Priority 3: Strategic attacks only when economically advantageous
    this.addStrategicAttacks(decisions, gameState);

    return this.coordinateAttacks(decisions, gameState);
  }

  private addEconomicExpansion(decisions: AIDecision[], gameState: GameState): void {
    const aiCells = gameState.cells.filter(cell => cell.owner === this.playerId);
    const neutralCells = gameState.cells.filter(cell => cell.owner === 'neutral');

    // Prioritize high-production neutral cells
    const valuableNeutrals = neutralCells
      .filter(neutral => {
        const productionValue = neutral.type.productionMultiplier || 1;
        return productionValue >= 1; // Focus on decent production
      })
      .sort((a, b) => {
        const aValue = (a.type.productionMultiplier || 1) / Math.max(1, a.units);
        const bValue = (b.type.productionMultiplier || 1) / Math.max(1, b.units);
        return bValue - aValue; // Higher value per unit cost first
      });

    for (const neutral of valuableNeutrals.slice(0, 3)) { // Limit expansion targets
      const bestAttacker = this.findBestEconomicAttacker(neutral, aiCells);
      
      if (bestAttacker) {
        const requiredUnits = neutral.units * 2.5; // Moderate advantage for expansion
        
        if (bestAttacker.units > requiredUnits + 2) {
          const unitsToSend = Math.ceil(requiredUnits);
          
          decisions.push({
            sourceCellId: bestAttacker.id,
            targetCellId: neutral.id,
            unitCount: unitsToSend,
            priority: 7, // High priority for valuable expansion
            type: 'expand'
          });
        }
      }
    }
  }

  private findBestEconomicAttacker(target: Cell, aiCells: Cell[]): Cell | null {
    let bestAttacker: Cell | null = null;
    let bestEfficiency = 0;
    const neighborRange = 180; // Must match GameEngine's neighbor range

    for (const aiCell of aiCells) {
      const distance = this.calculateDistance(aiCell.position, target.position);
      if (distance > neighborRange) continue; // Must be neighbor
      
      // Calculate efficiency: units available / distance
      const availableUnits = Math.max(0, aiCell.units - 3); // Keep some defense
      const efficiency = availableUnits / Math.max(50, distance);
      
      if (efficiency > bestEfficiency && availableUnits > target.units * 2) {
        bestEfficiency = efficiency;
        bestAttacker = aiCell;
      }
    }

    return bestAttacker;
  }

  private addConsolidation(decisions: AIDecision[], gameState: GameState): void {
    const aiCells = gameState.cells.filter(cell => cell.owner === this.playerId);
    
    // Find weak cells that need reinforcement
    const weakCells = aiCells.filter(cell => cell.units < 5);
    const strongCells = aiCells.filter(cell => cell.units > 8);

    for (const weakCell of weakCells) {
      // Find nearest neighbor strong cell to reinforce from
      const neighborRange = 180; // Must match GameEngine's neighbor range
      const nearbyStrong = strongCells
        .map(strong => ({
          cell: strong,
          distance: this.calculateDistance(weakCell.position, strong.position)
        }))
        .filter(item => item.distance <= neighborRange) // Must be neighbor
        .sort((a, b) => a.distance - b.distance);

      if (nearbyStrong.length > 0) {
        const reinforcer = nearbyStrong[0].cell;
        const unitsToSend = Math.floor((reinforcer.units - 5) / 2); // Keep good defense
        
        if (unitsToSend > 0) {
          decisions.push({
            sourceCellId: reinforcer.id,
            targetCellId: weakCell.id,
            unitCount: unitsToSend,
            priority: 6, // Medium-high priority for consolidation
            type: 'reinforce'
          });
        }
      }
    }
  }

  private addStrategicAttacks(decisions: AIDecision[], gameState: GameState): void {
    const aiCells = gameState.cells.filter(cell => cell.owner === this.playerId);
    const enemyCells = gameState.cells.filter(cell => 
      cell.owner !== this.playerId && cell.owner !== 'neutral'
    );

    // Only attack enemies if they threaten our economy or are very weak
    for (const aiCell of aiCells) {
      if (aiCell.units <= 6) continue; // Need substantial force

      const neighborRange = 180; // Must match GameEngine's neighbor range
      const strategicTargets = enemyCells.filter(enemy => {
        const distance = this.calculateDistance(aiCell.position, enemy.position);
        if (distance > neighborRange) return false; // Must be neighbor

        // Target if: very weak OR threatens our territory
        const isVeryWeak = enemy.units <= 2;
        const threatensTerritories = this.checkIfThreatensTerritory(enemy, aiCells);
        
        return isVeryWeak || threatensTerritories;
      });

      for (const target of strategicTargets) {
        const requiredUnits = target.units * 4; // Conservative 4x advantage
        
        if (aiCell.units > requiredUnits + 3) {
          const unitsToSend = Math.ceil(requiredUnits);
          
          decisions.push({
            sourceCellId: aiCell.id,
            targetCellId: target.id,
            unitCount: unitsToSend,
            priority: target.units <= 2 ? 5 : 4, // Higher priority for very weak enemies
            type: 'attack'
          });
        }
      }
    }
  }

  private checkIfThreatensTerritory(enemy: Cell, aiCells: Cell[]): boolean {
    // Check if enemy is close to multiple AI cells (central threat)
    const nearbyAICells = aiCells.filter(aiCell => {
      const distance = this.calculateDistance(enemy.position, aiCell.position);
      return distance < 200;
    });

    return nearbyAICells.length >= 2; // Threatens if near 2+ of our cells
  }

  protected applyCoordinationRules(attackers: AIDecision[], targetCellId: string, gameState: GameState): AIDecision[] {
    const targetCell = gameState.cells.find(c => c.id === targetCellId);
    if (!targetCell) return attackers;

    // Reinforcements always proceed
    if (targetCell.owner === this.playerId) {
      return attackers;
    }

    const totalUnits = attackers.reduce((sum, a) => sum + a.unitCount, 0);
    
    // Economic strategy: only proceed if very cost-effective
    const isHighValue = targetCell.type.productionMultiplier >= 1.5;
    const requiredAdvantage = isHighValue ? 2.5 : 3.5;
    const requiredUnits = targetCell.units * requiredAdvantage;
    
    if (totalUnits >= requiredUnits) {
      return attackers; // Proceed if cost-effective
    } else {
      return []; // Cancel unprofitable attacks
    }
  }
}