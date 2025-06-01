import { GameState, Cell, PlayerId } from './types';

export interface AIDecision {
  sourceCellId: string;
  targetCellId: string;
  unitCount: number;
  priority?: number; // 1-10, higher = more important
  type?: 'attack' | 'reinforce' | 'expand';
}

export interface AIStrategyConfig {
  aggressiveness: number; // 0-1, how willing to attack
  riskTolerance: number; // 0-1, how much risk to take
  economicFocus: number; // 0-1, how much to prioritize growth
  coordinationLevel: number; // 0-1, how much to coordinate attacks
  defensiveBonus: number; // multiplier for defensive considerations
}

export interface AIMetrics {
  totalCells: number;
  totalUnits: number;
  cellsUnderAttack: number;
  averageUnitsPerCell: number;
  strongestCell: number;
  weakestCell: number;
  enemyThreatLevel: number;
}

// Base interface for AI strategies
export interface IAIStrategy {
  readonly name: string;
  readonly config: AIStrategyConfig;
  makeDecisions(gameState: GameState): AIDecision[];
  evaluateGameState(gameState: GameState): AIMetrics;
}

// Abstract base class with common functionality
export abstract class BaseAIStrategy implements IAIStrategy {
  protected playerId: PlayerId;
  public readonly name: string;
  public readonly config: AIStrategyConfig;

  constructor(playerId: PlayerId, name: string, config: AIStrategyConfig) {
    this.playerId = playerId;
    this.name = name;
    this.config = config;
  }

  abstract makeDecisions(gameState: GameState): AIDecision[];

  public evaluateGameState(gameState: GameState): AIMetrics {
    const aiCells = gameState.cells.filter(cell => cell.owner === this.playerId);
    const enemyCells = gameState.cells.filter(cell => cell.owner !== this.playerId && cell.owner !== 'neutral');
    
    const totalUnits = aiCells.reduce((sum, cell) => sum + cell.units, 0);
    const cellsUnderAttack = gameState.battles.filter(b => 
      aiCells.some(cell => cell.id === b.cellId)
    ).length;
    
    const unitCounts = aiCells.map(cell => cell.units);
    const strongestCell = Math.max(...unitCounts, 0);
    const weakestCell = Math.min(...unitCounts, 0);
    
    // Calculate enemy threat based on proximity and strength
    let enemyThreatLevel = 0;
    for (const aiCell of aiCells) {
      const nearbyEnemies = enemyCells.filter(enemy => 
        this.calculateDistance(aiCell.position, enemy.position) < 200
      );
      enemyThreatLevel += nearbyEnemies.reduce((sum, enemy) => sum + enemy.units, 0);
    }
    
    return {
      totalCells: aiCells.length,
      totalUnits,
      cellsUnderAttack,
      averageUnitsPerCell: aiCells.length > 0 ? totalUnits / aiCells.length : 0,
      strongestCell,
      weakestCell,
      enemyThreatLevel
    };
  }

  protected calculateDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  protected findClosestNonAllyCell(sourceCell: Cell, gameState: GameState): Cell | null {
    // First filter for neighbor cells only (within range)
    const neighborRange = 180; // Must match GameEngine's neighbor range
    const neighborCells = gameState.cells.filter(cell => 
      cell.owner !== this.playerId && 
      cell.id !== sourceCell.id &&
      this.calculateDistance(sourceCell.position, cell.position) <= neighborRange
    );
    
    if (neighborCells.length === 0) return null;
    return this.getClosestCell(sourceCell, neighborCells);
  }

  protected getNeighbors(sourceCell: Cell, gameState: GameState): Cell[] {
    const neighborRange = 180; // Must match GameEngine's neighbor range
    return gameState.cells.filter(cell => 
      cell.id !== sourceCell.id && 
      this.calculateDistance(sourceCell.position, cell.position) <= neighborRange
    );
  }

  protected getClosestCell(sourceCell: Cell, targetCells: Cell[]): Cell | null {
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

  protected coordinateAttacks(decisions: AIDecision[], gameState: GameState): AIDecision[] {
    if (this.config.coordinationLevel < 0.5) {
      return decisions; // Low coordination, return as-is
    }

    const plannedAttacks = new Map<string, { totalUnits: number, attackers: AIDecision[] }>();

    // Group attacks by target
    for (const decision of decisions) {
      if (!plannedAttacks.has(decision.targetCellId)) {
        plannedAttacks.set(decision.targetCellId, { totalUnits: 0, attackers: [] });
      }
      
      const attack = plannedAttacks.get(decision.targetCellId)!;
      attack.totalUnits += decision.unitCount;
      attack.attackers.push(decision);
    }

    const coordinatedDecisions: AIDecision[] = [];

    // Apply coordination logic
    for (const [targetCellId, attack] of Array.from(plannedAttacks.entries())) {
      if (attack.attackers.length === 1) {
        coordinatedDecisions.push(attack.attackers[0]);
      } else {
        // Multiple attackers - apply coordination rules based on strategy
        coordinatedDecisions.push(...this.applyCoordinationRules(attack.attackers, targetCellId, gameState));
      }
    }

    return coordinatedDecisions;
  }

  protected abstract applyCoordinationRules(attackers: AIDecision[], targetCellId: string, gameState: GameState): AIDecision[];
}

// Simple strategy - the current implementation
export class SimpleAIStrategy extends BaseAIStrategy {
  constructor(playerId: PlayerId) {
    super(playerId, 'Simple', {
      aggressiveness: 0.6,
      riskTolerance: 0.5,
      economicFocus: 0.4,
      coordinationLevel: 0.7,
      defensiveBonus: 1.0
    });
  }

  public makeDecisions(gameState: GameState): AIDecision[] {
    const aiCells = gameState.cells.filter(cell => cell.owner === this.playerId);
    this.evaluateGameState(gameState); // Evaluate for side effects

    console.log(`AI found ${aiCells.length} cells owned by ${this.playerId}`);

    // Generate potential decisions
    const potentialDecisions: AIDecision[] = [];
    for (const aiCell of aiCells) {
      console.log(`Evaluating AI cell ${aiCell.id} with ${aiCell.units} units`);
      const decision = this.evaluateCell(aiCell, gameState);
      if (decision) {
        potentialDecisions.push(decision);
      }
    }

    // Apply coordination if enabled
    return this.coordinateAttacks(potentialDecisions, gameState);
  }

  protected evaluateCell(sourceCell: Cell, gameState: GameState): AIDecision | null {
    const targetCell = this.findClosestNonAllyCell(sourceCell, gameState);
    if (!targetCell) {
      console.log(`No target found for AI cell ${sourceCell.id}`);
      return null;
    }

    console.log(`Target found: ${targetCell.id} (${targetCell.owner}) with ${targetCell.units} units`);

    const requiredUnits = targetCell.units * 3;
    console.log(`Required units for attack: ${requiredUnits}, AI has: ${sourceCell.units}`);
    
    if (sourceCell.units > requiredUnits) {
      const unitsToSend = Math.max(1, Math.floor((sourceCell.units - 1) / 2));
      
      console.log(`AI will send ${unitsToSend} units to attack`);
      
      return {
        sourceCellId: sourceCell.id,
        targetCellId: targetCell.id,
        unitCount: unitsToSend,
        priority: 5,
        type: 'attack'
      };
    } else {
      console.log(`Not enough units to attack - need ${requiredUnits}, have ${sourceCell.units}`);
    }

    return null;
  }

  protected applyCoordinationRules(attackers: AIDecision[], targetCellId: string, gameState: GameState): AIDecision[] {
    const targetCell = gameState.cells.find(c => c.id === targetCellId);
    if (!targetCell) return attackers;

    const totalUnits = attackers.reduce((sum, a) => sum + a.unitCount, 0);
    const requiredUnits = targetCell.units * 2; // 2x advantage for coordinated attacks
    
    if (totalUnits >= requiredUnits) {
      return attackers; // All proceed
    } else if (attackers.length === 1) {
      return []; // Single attacker insufficient
    } else {
      // Only strongest attacker proceeds
      return [attackers.reduce((strongest: AIDecision, current: AIDecision) => 
        current.unitCount > strongest.unitCount ? current : strongest
      )];
    }
  }
}

// Export default strategy for backward compatibility
export class AIStrategy extends SimpleAIStrategy {
  constructor(playerId: PlayerId) {
    super(playerId);
  }
}