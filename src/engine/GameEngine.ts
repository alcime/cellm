import { GameState, GameConfig, Cell, Unit, Path, Position, PlayerId, GameEvent, CellType, Battle } from './types';
import { AIStrategy, IAIStrategy } from './AIStrategy';
import { AIStrategyManager, StrategyType, AIPlayerConfig } from './AIStrategyManager';

export class GameEngine {
  private state: GameState;
  private config: GameConfig;
  private eventListeners: { [eventType: string]: Function[] } = {};
  private gameLoop: number | null = null;
  private aiStrategyManager: AIStrategyManager;
  private aiTimer: number = 0;

  constructor(config: GameConfig) {
    this.config = config;
    this.state = this.createInitialState();
    this.aiStrategyManager = new AIStrategyManager();
    
    // Add default enemy AI
    this.aiStrategyManager.addAIPlayer({
      playerId: 'enemy',
      strategyType: 'simple'
    });
  }

  // ===================
  // STATE MANAGEMENT
  // ===================

  private createInitialState(): GameState {
    return {
      cells: [],
      units: [],
      paths: [],
      battles: [],
      currentPlayer: 'player',
      turn: 1,
      gamePhase: 'setup'
    };
  }

  public getState(): Readonly<GameState> {
    return { ...this.state };
  }

  public setCells(cells: Cell[]): void {
    this.state.cells = [...cells];
    this.emit('state_changed', { cells });
  }

  // ===================
  // COORDINATE SYSTEM
  // ===================

  // Simple, consistent coordinate system - all positions are absolute pixels
  public screenToGame(screenPos: Position): Position {
    return { ...screenPos }; // 1:1 mapping for simplicity
  }

  public gameToScreen(gamePos: Position): Position {
    return { ...gamePos }; // 1:1 mapping for simplicity
  }

  public distance(pos1: Position, pos2: Position): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ===================
  // GAME ACTIONS
  // ===================

  public clickCell(cellId: string): void {
    const cell = this.state.cells.find(c => c.id === cellId);
    if (!cell) return;

    this.emit('cell_clicked', { cellId, cell });
  }

  public sendUnits(sourceCellId: string, targetCellId: string, unitCount: number): boolean {
    const sourceCell = this.state.cells.find(c => c.id === sourceCellId);
    const targetCell = this.state.cells.find(c => c.id === targetCellId);

    if (!sourceCell || !targetCell || sourceCell.units < unitCount) {
      return false;
    }

    // Remove units from source
    sourceCell.units -= unitCount;

    // Calculate distance-based travel speed for consistent travel time
    const distance = this.distance(sourceCell.position, targetCell.position);
    // Aim for consistent 2-3 second travel time regardless of distance
    const targetTravelTime = 2.5; // seconds
    const travelSpeed = 1 / (targetTravelTime * this.config.unitSpeed);

    // Create moving unit
    const unit: Unit = {
      id: this.generateId(),
      owner: sourceCell.owner,
      position: { ...sourceCell.position },
      targetCellId,
      unitCount,
      progress: 0,
      travelSpeed
    };

    // Create or update path
    let path = this.state.paths.find(p => 
      p.sourceCellId === sourceCellId && p.targetCellId === targetCellId
    );

    if (!path) {
      path = {
        id: this.generateId(),
        sourceCellId,
        targetCellId,
        owner: sourceCell.owner,
        active: true,
        type: Math.random() > 0.5 ? 'curved' : 'straight'
      };
      this.state.paths.push(path);
    }

    path.active = true;
    this.state.units.push(unit);

    this.emit('units_sent', { unit, path });
    return true;
  }

  // ===================
  // UNIT MOVEMENT
  // ===================

  private updateUnits(deltaTime: number): void {
    const arrivedUnits: Unit[] = [];
    let hasMovement = false;

    for (const unit of this.state.units) {
      const targetCell = this.state.cells.find(c => c.id === unit.targetCellId);
      if (!targetCell) continue;

      const oldProgress = unit.progress;

      // Update progress with distance-based speed
      const speed = unit.travelSpeed * deltaTime;
      unit.progress = Math.min(1, unit.progress + speed);
      
      // Only update position if there's meaningful movement (reduces jitter)
      if (Math.abs(unit.progress - oldProgress) > 0.001) {
        hasMovement = true;
        
        // Calculate position based on path type
        const sourceCell = this.state.cells.find(c => 
          this.state.paths.some(p => 
            p.targetCellId === unit.targetCellId && 
            p.sourceCellId === c.id &&
            p.owner === unit.owner
          )
        );

        if (sourceCell) {
          const path = this.state.paths.find(p => 
            p.sourceCellId === sourceCell.id && p.targetCellId === targetCell.id
          );

          unit.position = this.calculateUnitPosition(
            sourceCell.position,
            targetCell.position,
            unit.progress,
            path?.type || 'straight'
          );
        }
      }

      // Check if arrived
      if (unit.progress >= 1) {
        arrivedUnits.push(unit);
      }
    }

    // Process arrived units
    for (const unit of arrivedUnits) {
      this.processUnitArrival(unit);
    }

    // Remove arrived units
    this.state.units = this.state.units.filter(u => u.progress < 1);

    // Only emit state change if there was actual movement or unit arrivals
    if (hasMovement || arrivedUnits.length > 0) {
      this.emit('state_changed', { units: this.state.units });
    }
  }

  private calculateUnitPosition(
    source: Position,
    target: Position,
    progress: number,
    pathType: 'straight' | 'curved'
  ): Position {
    // Use linear progress for more consistent movement speed
    // (easing was causing apparent speed changes)
    const easedProgress = progress;
    
    if (pathType === 'straight') {
      return {
        x: source.x + (target.x - source.x) * easedProgress,
        y: source.y + (target.y - source.y) * easedProgress
      };
    } else {
      // Curved path using quadratic bezier with easing
      const midX = (source.x + target.x) / 2;
      const midY = (source.y + target.y) / 2;
      
      // Perpendicular offset for curve
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const perpX = -dy * 0.3;
      const perpY = dx * 0.3;
      
      const ctrlX = midX + perpX;
      const ctrlY = midY + perpY;
      
      // Quadratic bezier formula with easing
      const t = easedProgress;
      const mt = 1 - t;
      
      return {
        x: mt * mt * source.x + 2 * mt * t * ctrlX + t * t * target.x,
        y: mt * mt * source.y + 2 * mt * t * ctrlY + t * t * target.y
      };
    }
  }

  // Smooth easing function for natural movement
  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  private processUnitArrival(unit: Unit): void {
    const targetCell = this.state.cells.find(c => c.id === unit.targetCellId);
    if (!targetCell) return;

    // Check if there's an ongoing battle at this cell
    const ongoingBattle = this.state.battles.find(b => b.cellId === targetCell.id);
    
    if (targetCell.owner === unit.owner && !ongoingBattle) {
      // Friendly reinforcement to peaceful cell
      targetCell.units += unit.unitCount;
      this.emit('units_arrived', { unit, targetCell });
    } else if (targetCell.owner === unit.owner && ongoingBattle) {
      // Friendly reinforcement to cell under attack - join as defender
      this.reinforceDefenders(unit, targetCell, ongoingBattle);
    } else {
      // Enemy cell or neutral - start or join battle as attacker
      this.startOrJoinBattle(unit, targetCell);
    }
  }

  private startOrJoinBattle(unit: Unit, targetCell: Cell): void {
    // Check if there's already a battle at this cell
    let battle = this.state.battles.find(b => b.cellId === targetCell.id);
    
    if (battle) {
      // Join existing battle - don't recalculate duration to avoid timing issues
      unit.battleState = 'fighting';
      unit.battlePosition = this.calculateBattlePosition(targetCell.position, battle.attackers.length);
      
      // Store join time and initial unit count for proportional damage calculation
      (unit as any).joinTime = Date.now();
      (unit as any).initialUnitCount = unit.unitCount;
      (unit as any).joinProgress = battle.progress; // Track when this unit joined
      
      battle.attackers.push(unit);
      
      // Log multi-faction battles for debugging
      const attackerOwners = new Set(battle.attackers.map(a => a.owner));
      if (attackerOwners.size > 1) {
        console.log(`Multi-faction battle at ${targetCell.id}: owners [${Array.from(attackerOwners).join(', ')}]`);
      }
      
      this.emit('battle_joined', { battle, unit, targetCell });
    } else {
      // Start new battle
      unit.battleState = 'fighting';
      unit.battlePosition = this.calculateBattlePosition(targetCell.position, 0);
      
      // Store initial unit count and join time
      (unit as any).initialUnitCount = unit.unitCount;
      (unit as any).joinTime = Date.now();
      (unit as any).joinProgress = 0;
      
      const battleDuration = this.calculateBattleDuration(unit.unitCount, targetCell.units);
      
      battle = {
        id: this.generateId(),
        cellId: targetCell.id,
        attackers: [unit],
        defenderUnits: targetCell.units,
        defenderOwner: targetCell.owner,
        startTime: Date.now(),
        duration: battleDuration * 1000,
        progress: 0
      };
      
      // Store initial values for battle calculations
      (battle as any).initialDefenderUnits = targetCell.units;
      (battle as any).initialAttackerUnits = unit.unitCount;
      
      this.state.battles.push(battle);
      this.emit('battle_started', { battle, targetCell });
    }
  }

  private calculateBattleDuration(attackerUnits: number, defenderUnits: number): number {
    // Calculate force ratio
    const ratio = Math.max(attackerUnits / defenderUnits, defenderUnits / attackerUnits);
    
    // When one side has 2x advantage: 4 seconds
    // When forces are balanced (1:1): 10 seconds
    // Scale proportionally between these values
    const minDuration = 4;  // Quick battle when one side dominates
    const maxDuration = 10; // Longer battle when balanced (gives defenders time to reinforce)
    
    if (ratio >= 2) {
      return minDuration;
    } else {
      // Linear interpolation: as ratio approaches 1, duration approaches maxDuration
      return minDuration + (maxDuration - minDuration) * (2 - ratio) / 1;
    }
  }

  private calculateBattlePosition(cellPosition: Position, attackerIndex: number): Position {
    const battleRadius = 80;
    const angle = (attackerIndex / Math.max(1, attackerIndex + 1)) * 2 * Math.PI;
    
    return {
      x: cellPosition.x + Math.cos(angle) * battleRadius,
      y: cellPosition.y + Math.sin(angle) * battleRadius
    };
  }

  // ===================
  // BATTLE SYSTEM
  // ===================

  private updateBattles(): void {
    const completedBattles: Battle[] = [];

    for (const battle of this.state.battles) {
      const elapsed = Date.now() - battle.startTime;
      battle.progress = Math.min(1, elapsed / battle.duration);

      // Calculate battle damage over time
      this.processBattleDamage(battle);

      this.emit('battle_progress', { battle });

      // Check if battle is complete - only end when time is up
      if (battle.progress >= 1) {
        this.resolveBattle(battle);
        completedBattles.push(battle);
      }
    }

    // Remove completed battles
    this.state.battles = this.state.battles.filter(b => !completedBattles.includes(b));
  }

  private processBattleDamage(battle: Battle): void {
    const targetCell = this.state.cells.find(c => c.id === battle.cellId);
    if (!targetCell) return;
    
    // Calculate total current attacker force from all units that have joined
    let totalCurrentAttackers = 0;
    let totalInitialAttackers = 0;
    
    for (const attacker of battle.attackers) {
      const joinProgress = (attacker as any).joinProgress || 0;
      const initialUnits = (attacker as any).initialUnitCount || attacker.unitCount;
      
      // Only count units that have been in battle for damage calculation
      const timeInBattle = Math.max(0, battle.progress - joinProgress);
      const effectiveParticipation = Math.min(1, timeInBattle / 0.1); // Quick ramp-up
      
      totalCurrentAttackers += initialUnits * effectiveParticipation;
      totalInitialAttackers += initialUnits;
    }
    
    const initialDefenders = (battle as any).initialDefenderUnits || targetCell.units;
    const defenseBonus = targetCell.type.defenseBonus || 1;
    const effectiveDefenders = initialDefenders * defenseBonus;
    
    // Determine battle outcome based on current effective forces
    let finalAttackerSurvivors: number, finalDefenderSurvivors: number;
    
    if (totalCurrentAttackers > effectiveDefenders) {
      // Attackers win
      finalDefenderSurvivors = 0;
      finalAttackerSurvivors = totalCurrentAttackers - effectiveDefenders;
    } else {
      // Defenders win  
      finalAttackerSurvivors = 0;
      finalDefenderSurvivors = initialDefenders - (totalCurrentAttackers / defenseBonus);
    }
    
    // Ensure survivors are not negative
    finalAttackerSurvivors = Math.max(0, finalAttackerSurvivors);
    finalDefenderSurvivors = Math.max(0, finalDefenderSurvivors);

    // Apply damage proportionally over time based on battle progress
    const progress = battle.progress;
    
    // Calculate current defender units
    const currentDefenders = initialDefenders - (initialDefenders - finalDefenderSurvivors) * progress;
    battle.defenderUnits = Math.max(0, currentDefenders);
    
    // Update attacker units individually based on their participation time
    for (const attacker of battle.attackers) {
      const joinProgress = (attacker as any).joinProgress || 0;
      const initialUnits = (attacker as any).initialUnitCount || attacker.unitCount;
      const timeInBattle = Math.max(0, battle.progress - joinProgress);
      
      if (timeInBattle <= 0) {
        // Unit just arrived, no damage yet
        attacker.unitCount = initialUnits;
      } else {
        // Calculate proportional damage based on time in battle
        const battleDamageProgress = Math.min(1, timeInBattle / Math.max(0.1, 1 - joinProgress));
        
        if (totalCurrentAttackers > 0) {
          const unitSurvivalRate = finalAttackerSurvivors / totalCurrentAttackers;
          const finalUnits = initialUnits * unitSurvivalRate;
          attacker.unitCount = Math.max(0, initialUnits - (initialUnits - finalUnits) * battleDamageProgress);
        }
      }
    }
  }

  private resolveBattle(battle: Battle): void {
    const targetCell = this.state.cells.find(c => c.id === battle.cellId);
    if (!targetCell) return;

    // Group attackers by owner to handle multi-player battles correctly
    const attackersByOwner = new Map<string, Unit[]>();
    for (const attacker of battle.attackers) {
      if (!attackersByOwner.has(attacker.owner)) {
        attackersByOwner.set(attacker.owner, []);
      }
      attackersByOwner.get(attacker.owner)!.push(attacker);
    }

    // Calculate effective force for each attacking faction
    const factionForces = new Map<string, { effective: number, surviving: number }>();
    
    for (const [owner, attackers] of Array.from(attackersByOwner.entries())) {
      let effectiveForce = 0;
      let survivingForce = 0;
      
      for (const attacker of attackers) {
        const joinProgress = (attacker as any).joinProgress || 0;
        const initialUnits = (attacker as any).initialUnitCount || attacker.unitCount;
        const timeInBattle = Math.max(0, 1 - joinProgress);
        const effectiveParticipation = Math.min(1, timeInBattle / 0.1);
        
        effectiveForce += initialUnits * effectiveParticipation;
        survivingForce += attacker.unitCount;
      }
      
      factionForces.set(owner, { effective: effectiveForce, surviving: survivingForce });
    }

    const initialDefenders = (battle as any).initialDefenderUnits || targetCell.units;
    const defenseBonus = targetCell.type.defenseBonus || 1;
    const effectiveDefenders = initialDefenders * defenseBonus;

    // Calculate total attacking force
    const totalEffectiveAttackers = Array.from(factionForces.values())
      .reduce((sum, faction) => sum + faction.effective, 0);

    if (totalEffectiveAttackers > effectiveDefenders) {
      // Attackers win - determine which faction gets the cell
      let winningOwner = '';
      let winningForce = 0;
      
      // The faction with the most effective force wins
      for (const [owner, forces] of Array.from(factionForces.entries())) {
        if (forces.effective > winningForce) {
          winningForce = forces.effective;
          winningOwner = owner;
        }
      }
      
      // Winner gets the cell with only their surviving units
      const winnerSurvivors = factionForces.get(winningOwner)?.surviving || 0;
      targetCell.owner = winningOwner;
      targetCell.units = Math.max(1, Math.floor(winnerSurvivors));
      
      this.emit('cell_captured', { 
        cellId: targetCell.id, 
        newOwner: winningOwner,
        battleInfo: {
          factions: Object.fromEntries(factionForces),
          winner: winningOwner,
          winnerUnits: targetCell.units
        }
      });
    } else {
      // Defenders win
      targetCell.units = Math.max(1, Math.floor(battle.defenderUnits));
    }

    // Remove attacking units from the main units array
    this.state.units = this.state.units.filter(u => !battle.attackers.includes(u));

    this.emit('battle_ended', { 
      battle, 
      winner: targetCell.owner,
      factionResults: Object.fromEntries(factionForces)
    });
  }

  // ===================
  // AI STRATEGY MANAGEMENT
  // ===================

  public addAIPlayer(config: AIPlayerConfig): void {
    this.aiStrategyManager.addAIPlayer(config);
  }

  public removeAIPlayer(playerId: PlayerId): void {
    this.aiStrategyManager.removeAIPlayer(playerId);
  }

  public switchAIStrategy(playerId: PlayerId, strategyType: StrategyType): boolean {
    return this.aiStrategyManager.switchStrategy(playerId, strategyType);
  }

  public getAIStrategyInfo(playerId: PlayerId): { name: string; config: import('./AIStrategy').AIStrategyConfig } | null {
    return this.aiStrategyManager.getStrategyInfo(playerId);
  }

  public getAIPlayers(): PlayerId[] {
    return this.aiStrategyManager.getAIPlayers();
  }

  public listAvailableStrategies(): { type: StrategyType; name: string; description: string }[] {
    return this.aiStrategyManager.listAvailableStrategies();
  }

  private reinforceDefenders(unit: Unit, targetCell: Cell, battle: Battle): void {
    // Add reinforcements to the defending cell during battle
    // This affects the defender count in the ongoing battle
    const reinforcementBonus = unit.unitCount;
    
    // Increase defender units in the battle
    battle.defenderUnits += reinforcementBonus;
    
    // Also update the cell units for post-battle
    targetCell.units += reinforcementBonus;
    
    this.emit('defenders_reinforced', { unit, targetCell, battle, reinforcementBonus });
    
    // Remove the reinforcement unit as it's now part of the defense
    this.state.units = this.state.units.filter(u => u.id !== unit.id);
  }

  // ===================
  // PRODUCTION
  // ===================

  private updateProduction(): void {
    for (const cell of this.state.cells) {
      if (cell.owner !== 'neutral') {
        const production = cell.type.productionMultiplier || 1;
        cell.units += production;
        
        // Apply max units limit if defined
        if (cell.type.maxUnits) {
          cell.units = Math.min(cell.units, cell.type.maxUnits);
        }
      }
    }

    this.emit('production_cycle', { cells: this.state.cells });
  }

  // ===================
  // GAME LOOP
  // ===================

  public start(): void {
    if (this.gameLoop) return;

    this.state.gamePhase = 'playing';
    let lastTime = Date.now();
    let productionTimer = 0;

    const loop = () => {
      const currentTime = Date.now();
      let deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
      lastTime = currentTime;

      // Cap deltaTime to prevent huge jumps on frame drops or lag spikes
      deltaTime = Math.min(deltaTime, 0.1); // Max 100ms per frame

      // Update units
      this.updateUnits(deltaTime);

      // Update battles
      this.updateBattles();

      // Production every interval
      productionTimer += deltaTime;
      if (productionTimer >= this.config.productionInterval) {
        this.updateProduction();
        productionTimer = 0;
      }

      // AI decisions every 2 seconds
      this.aiTimer += deltaTime;
      if (this.aiTimer >= 2) {
        this.updateAI();
        this.aiTimer = 0;
      }

      // Check win condition
      this.checkWinCondition();

      if (this.state.gamePhase === 'playing') {
        this.gameLoop = requestAnimationFrame(loop);
      }
    };

    this.gameLoop = requestAnimationFrame(loop);
  }

  public stop(): void {
    if (this.gameLoop) {
      cancelAnimationFrame(this.gameLoop);
      this.gameLoop = null;
    }
    this.state.gamePhase = 'paused';
  }

  private checkWinCondition(): void {
    const playerCells = this.state.cells.filter(c => c.owner === 'player');
    const enemyCells = this.state.cells.filter(c => c.owner === 'enemy');

    if (playerCells.length === 0) {
      this.state.gamePhase = 'ended';
      this.state.winner = 'enemy';
      this.emit('game_ended', { winner: 'enemy' });
    } else if (enemyCells.length === 0) {
      this.state.gamePhase = 'ended';
      this.state.winner = 'player';
      this.emit('game_ended', { winner: 'player' });
    }
  }

  // ===================
  // AI SYSTEM
  // ===================

  private updateAI(): void {
    const aiPlayers = this.aiStrategyManager.getAIPlayers();
    
    for (const playerId of aiPlayers) {
      const strategy = this.aiStrategyManager.getStrategy(playerId);
      if (!strategy) continue;
      
      const decisions = strategy.makeDecisions(this.state);
      
      if (decisions.length > 0) {
        console.log(`${strategy.name} AI (${playerId}) making ${decisions.length} decisions`);
      }
      
      for (const decision of decisions) {
        console.log(`${playerId} sending ${decision.unitCount} units from ${decision.sourceCellId} to ${decision.targetCellId} (${decision.type})`);
        this.sendUnits(decision.sourceCellId, decision.targetCellId, decision.unitCount);
      }
    }
  }

  public aiMakeDecisions(): void {
    this.updateAI();
  }

  // ===================
  // UTILITIES
  // ===================

  private generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }

  // ===================
  // EVENT SYSTEM
  // ===================

  public on(eventType: string, callback: Function): void {
    if (!this.eventListeners[eventType]) {
      this.eventListeners[eventType] = [];
    }
    this.eventListeners[eventType].push(callback);
  }

  public off(eventType: string, callback: Function): void {
    if (this.eventListeners[eventType]) {
      this.eventListeners[eventType] = this.eventListeners[eventType].filter(cb => cb !== callback);
    }
  }

  private emit(eventType: string, data: any): void {
    if (this.eventListeners[eventType]) {
      for (const callback of this.eventListeners[eventType]) {
        callback(data);
      }
    }
  }
}