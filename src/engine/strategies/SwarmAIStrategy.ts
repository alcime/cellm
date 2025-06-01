import { BaseAIStrategy, AIDecision } from '../AIStrategy';
import { GameState, Cell, PlayerId } from '../types';

/**
 * SwarmAIStrategy - Example of how to create a new AI strategy
 * 
 * This strategy focuses on coordinated swarm attacks where multiple cells
 * simultaneously attack the same target for overwhelming force.
 */
export class SwarmAIStrategy extends BaseAIStrategy {
  constructor(playerId: PlayerId) {
    super(playerId, 'Swarm', {
      aggressiveness: 0.7,
      riskTolerance: 0.6,
      economicFocus: 0.3,
      coordinationLevel: 1.0, // Maximum coordination
      defensiveBonus: 0.9
    });
  }

  public makeDecisions(gameState: GameState): AIDecision[] {
    const aiCells = gameState.cells.filter(cell => cell.owner === this.playerId);
    const metrics = this.evaluateGameState(gameState);

    console.log(`Swarm AI evaluating ${aiCells.length} cells for coordinated attacks`);

    // Swarm strategy: Find the best target and coordinate multiple attackers
    const targetPriorities = this.analyzeSwarmTargets(gameState);
    const decisions: AIDecision[] = [];

    // For each high-priority target, coordinate swarm attacks
    for (const targetInfo of targetPriorities.slice(0, 2)) { // Focus on top 2 targets
      const swarmDecisions = this.planSwarmAttack(targetInfo.target, aiCells, gameState);
      decisions.push(...swarmDecisions);
    }

    return decisions; // Don't use base coordination - we handle it ourselves
  }

  private analyzeSwarmTargets(gameState: GameState): Array<{target: Cell, priority: number, attackers: Cell[]}> {
    const enemyCells = gameState.cells.filter(cell => 
      cell.owner !== this.playerId && cell.owner !== 'neutral'
    );
    const neutralCells = gameState.cells.filter(cell => cell.owner === 'neutral');
    const aiCells = gameState.cells.filter(cell => cell.owner === this.playerId);

    const allTargets = [...enemyCells, ...neutralCells];
    const targetAnalysis: Array<{target: Cell, priority: number, attackers: Cell[]}> = [];

    for (const target of allTargets) {
      // Find all cells that could participate in swarm attack (within range)
      const potentialAttackers = aiCells.filter(aiCell => {
        const distance = this.calculateDistance(aiCell.position, target.position);
        return distance <= 350 && aiCell.units > 2; // Must have enough units
      });

      if (potentialAttackers.length < 2) continue; // Need at least 2 for swarm

      // Calculate swarm priority based on:
      // 1. Number of attackers available
      // 2. Total attacking force vs target strength
      // 3. Strategic value of target
      const totalSwarmForce = potentialAttackers.reduce((sum, cell) => 
        sum + Math.floor((cell.units - 1) / 2), 0
      );
      
      const forceRatio = totalSwarmForce / Math.max(1, target.units);
      const attackerCount = potentialAttackers.length;
      const strategicValue = target.owner === 'neutral' ? 1 : 2; // Prefer enemies
      const productionValue = target.type.productionMultiplier || 1;

      const priority = forceRatio * attackerCount * strategicValue * productionValue;

      targetAnalysis.push({
        target,
        priority,
        attackers: potentialAttackers
      });
    }

    // Sort by priority (highest first)
    return targetAnalysis.sort((a, b) => b.priority - a.priority);
  }

  private planSwarmAttack(target: Cell, availableAttackers: Cell[], gameState: GameState): AIDecision[] {
    // Find optimal attackers for this swarm
    const attackers = availableAttackers.filter(cell => {
      const distance = this.calculateDistance(cell.position, target.position);
      return distance <= 350 && cell.units > 2;
    });

    if (attackers.length < 2) return []; // Need minimum swarm size

    // Calculate required force for successful swarm attack
    const defenseBonus = target.type.defenseBonus || 1;
    const effectiveDefense = target.units * defenseBonus;
    const requiredTotalForce = Math.ceil(effectiveDefense * 1.8); // 1.8x advantage for swarm

    // Select attackers based on efficiency (distance vs force contribution)
    const attackerEfficiency = attackers.map(attacker => {
      const distance = this.calculateDistance(attacker.position, target.position);
      const availableUnits = Math.floor((attacker.units - 1) / 2);
      const efficiency = availableUnits / (distance / 100 + 1); // Closer = better
      
      return { attacker, availableUnits, efficiency, distance };
    });

    // Sort by efficiency and select best attackers
    attackerEfficiency.sort((a, b) => b.efficiency - a.efficiency);

    const swarmDecisions: AIDecision[] = [];
    let totalSwarmForce = 0;
    let swarmSize = 0;

    for (const { attacker, availableUnits } of attackerEfficiency) {
      if (swarmSize >= 5) break; // Limit swarm size for performance
      
      // Calculate optimal unit count for this attacker
      const unitsToSend = this.calculateSwarmContribution(
        attacker, target, totalSwarmForce, requiredTotalForce, availableUnits
      );

      if (unitsToSend > 0) {
        swarmDecisions.push({
          sourceCellId: attacker.id,
          targetCellId: target.id,
          unitCount: unitsToSend,
          priority: 8, // High priority for swarm attacks
          type: 'attack'
        });

        totalSwarmForce += unitsToSend;
        swarmSize++;

        // Stop if we have enough force
        if (totalSwarmForce >= requiredTotalForce) break;
      }
    }

    // Only proceed if swarm is large enough and strong enough
    if (swarmSize >= 2 && totalSwarmForce >= requiredTotalForce * 0.9) {
      console.log(`Planned swarm attack on ${target.id}: ${swarmSize} attackers, ${totalSwarmForce} total force`);
      return swarmDecisions;
    }

    return []; // Cancel insufficient swarm
  }

  private calculateSwarmContribution(
    attacker: Cell, 
    target: Cell, 
    currentSwarmForce: number, 
    requiredForce: number, 
    maxAvailable: number
  ): number {
    const remainingNeeded = Math.max(0, requiredForce - currentSwarmForce);
    
    // Each attacker contributes based on what's still needed
    const optimalContribution = Math.min(
      maxAvailable,
      Math.ceil(remainingNeeded / 3), // Spread the load
      attacker.units - 1 // Keep at least 1 for defense
    );

    return Math.max(0, optimalContribution);
  }

  protected applyCoordinationRules(attackers: AIDecision[], targetCellId: string, gameState: GameState): AIDecision[] {
    // Swarm strategy handles coordination in planSwarmAttack, so just return as-is
    return attackers;
  }
}