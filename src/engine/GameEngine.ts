import { GameState, GameConfig, Cell, Unit, Path, Position, PlayerId, GameEvent, CellType, Battle } from './types';

export class GameEngine {
  private state: GameState;
  private config: GameConfig;
  private eventListeners: { [eventType: string]: Function[] } = {};
  private gameLoop: number | null = null;

  constructor(config: GameConfig) {
    this.config = config;
    this.state = this.createInitialState();
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

    // Create moving unit
    const unit: Unit = {
      id: this.generateId(),
      owner: sourceCell.owner,
      position: { ...sourceCell.position },
      targetCellId,
      unitCount,
      progress: 0
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

    for (const unit of this.state.units) {
      const targetCell = this.state.cells.find(c => c.id === unit.targetCellId);
      if (!targetCell) continue;

      // Update progress
      const speed = this.config.unitSpeed * deltaTime;
      unit.progress = Math.min(1, unit.progress + speed);

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
  }

  private calculateUnitPosition(
    source: Position,
    target: Position,
    progress: number,
    pathType: 'straight' | 'curved'
  ): Position {
    if (pathType === 'straight') {
      return {
        x: source.x + (target.x - source.x) * progress,
        y: source.y + (target.y - source.y) * progress
      };
    } else {
      // Curved path using quadratic bezier
      const midX = (source.x + target.x) / 2;
      const midY = (source.y + target.y) / 2;
      
      // Perpendicular offset for curve
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const perpX = -dy * 0.3;
      const perpY = dx * 0.3;
      
      const ctrlX = midX + perpX;
      const ctrlY = midY + perpY;
      
      // Quadratic bezier formula
      const t = progress;
      const mt = 1 - t;
      
      return {
        x: mt * mt * source.x + 2 * mt * t * ctrlX + t * t * target.x,
        y: mt * mt * source.y + 2 * mt * t * ctrlY + t * t * target.y
      };
    }
  }

  private processUnitArrival(unit: Unit): void {
    const targetCell = this.state.cells.find(c => c.id === unit.targetCellId);
    if (!targetCell) return;

    if (targetCell.owner === unit.owner) {
      // Friendly reinforcement
      targetCell.units += unit.unitCount;
      this.emit('units_arrived', { unit, targetCell });
    } else {
      // Start or join battle
      this.startOrJoinBattle(unit, targetCell);
    }
  }

  private startOrJoinBattle(unit: Unit, targetCell: Cell): void {
    // Check if there's already a battle at this cell
    let battle = this.state.battles.find(b => b.cellId === targetCell.id);
    
    if (battle) {
      // Join existing battle
      unit.battleState = 'fighting';
      unit.battlePosition = this.calculateBattlePosition(targetCell.position, battle.attackers.length);
      battle.attackers.push(unit);
      
      // Recalculate battle duration with new forces
      const totalAttackers = battle.attackers.reduce((sum, a) => sum + a.unitCount, 0);
      const newDuration = this.calculateBattleDuration(totalAttackers, battle.defenderUnits);
      battle.duration = newDuration * 1000; // Convert to milliseconds
    } else {
      // Start new battle
      unit.battleState = 'fighting';
      unit.battlePosition = this.calculateBattlePosition(targetCell.position, 0);
      
      const battleDuration = this.calculateBattleDuration(unit.unitCount, targetCell.units);
      
      battle = {
        id: this.generateId(),
        cellId: targetCell.id,
        attackers: [unit],
        defenderUnits: targetCell.units,
        defenderOwner: targetCell.owner,
        startTime: Date.now(),
        duration: battleDuration * 1000, // Convert to milliseconds
        progress: 0
      };
      
      // Store initial values for UI
      (battle as any).initialDefenderUnits = targetCell.units;
      (unit as any).initialUnitCount = unit.unitCount;
      
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

  private updateBattles(deltaTime: number): void {
    const completedBattles: Battle[] = [];

    for (const battle of this.state.battles) {
      const elapsed = Date.now() - battle.startTime;
      battle.progress = Math.min(1, elapsed / battle.duration);

      // Calculate battle damage over time
      this.processBattleDamage(battle, deltaTime);

      this.emit('battle_progress', { battle });

      // Check if battle is complete
      if (battle.progress >= 1 || battle.defenderUnits <= 0 || battle.attackers.every(a => a.unitCount <= 0)) {
        this.resolveBattle(battle);
        completedBattles.push(battle);
      }
    }

    // Remove completed battles
    this.state.battles = this.state.battles.filter(b => !completedBattles.includes(b));
  }

  private processBattleDamage(battle: Battle, deltaTime: number): void {
    const targetCell = this.state.cells.find(c => c.id === battle.cellId);
    if (!targetCell) return;
    
    // Get initial forces
    const initialAttackers = (battle as any).initialAttackerUnits || 
      battle.attackers.reduce((sum, a) => sum + ((a as any).initialUnitCount || a.unitCount), 0);
    const initialDefenders = (battle as any).initialDefenderUnits || battle.defenderUnits;
    
    // Store initial values if not already stored
    if (!(battle as any).initialAttackerUnits) {
      (battle as any).initialAttackerUnits = initialAttackers;
    }

    const defenseBonus = targetCell.type.defenseBonus || 1;
    const effectiveDefenders = initialDefenders * defenseBonus;
    
    // Determine battle outcome and final casualties
    let finalAttackerSurvivors: number, finalDefenderSurvivors: number;
    
    if (initialAttackers > effectiveDefenders) {
      // Attackers win
      finalDefenderSurvivors = 0;
      finalAttackerSurvivors = initialAttackers - effectiveDefenders;
    } else {
      // Defenders win  
      finalAttackerSurvivors = 0;
      finalDefenderSurvivors = initialDefenders - (initialAttackers / defenseBonus);
    }
    
    // Ensure survivors are not negative
    finalAttackerSurvivors = Math.max(0, finalAttackerSurvivors);
    finalDefenderSurvivors = Math.max(0, finalDefenderSurvivors);

    // Apply damage proportionally over time based on battle progress
    const progress = battle.progress;
    
    // Calculate current units based on linear interpolation from initial to final
    const currentDefenders = initialDefenders - (initialDefenders - finalDefenderSurvivors) * progress;
    const currentAttackers = initialAttackers - (initialAttackers - finalAttackerSurvivors) * progress;
    
    // Update defender units
    battle.defenderUnits = Math.max(0, currentDefenders);
    
    // Update attacker units proportionally across all attacking units
    if (initialAttackers > 0) {
      const attackerSurvivalRate = currentAttackers / initialAttackers;
      for (const attacker of battle.attackers) {
        const originalUnits = (attacker as any).initialUnitCount || attacker.unitCount;
        attacker.unitCount = Math.max(0, originalUnits * attackerSurvivalRate);
      }
    }
  }

  private resolveBattle(battle: Battle): void {
    const targetCell = this.state.cells.find(c => c.id === battle.cellId);
    if (!targetCell) return;

    // Calculate final outcome based on initial forces (same logic as damage calculation)
    const initialAttackers = (battle as any).initialAttackerUnits || 
      battle.attackers.reduce((sum, a) => sum + ((a as any).initialUnitCount || a.unitCount), 0);
    const initialDefenders = (battle as any).initialDefenderUnits || battle.defenderUnits;
    const defenseBonus = targetCell.type.defenseBonus || 1;
    const effectiveDefenders = initialDefenders * defenseBonus;

    const totalSurvivingAttackers = battle.attackers.reduce((sum, a) => sum + a.unitCount, 0);

    if (initialAttackers > effectiveDefenders) {
      // Attackers win
      const winningOwner = battle.attackers[0].owner;
      targetCell.owner = winningOwner;
      targetCell.units = Math.max(1, Math.floor(totalSurvivingAttackers));
      this.emit('cell_captured', { cellId: targetCell.id, newOwner: winningOwner });
    } else {
      // Defenders win
      targetCell.units = Math.max(1, Math.floor(battle.defenderUnits));
    }

    // Remove attacking units from the main units array
    this.state.units = this.state.units.filter(u => !battle.attackers.includes(u));

    this.emit('battle_ended', { battle, winner: targetCell.owner });
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
      const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
      lastTime = currentTime;

      // Update units
      this.updateUnits(deltaTime);

      // Update battles
      this.updateBattles(deltaTime);

      // Production every interval
      productionTimer += deltaTime;
      if (productionTimer >= this.config.productionInterval) {
        this.updateProduction();
        productionTimer = 0;
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