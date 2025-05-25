import { useReducer, useCallback } from 'react';
import { 
  CellData, 
  PathData, 
  UnitData, 
  BattleData, 
  CellOwner, 
  CellType 
} from '../types';

// Constants
const BATTLE_DURATION = 3000; // ms

// Helper functions
const generateId = (): string => Math.random().toString(36).substring(2, 9);

// State interface
export interface GameState {
  cells: CellData[];
  paths: PathData[];
  units: UnitData[];
  battles: BattleData[];
  selectedCellId: string | null;
  gameOver: boolean;
  winner: CellOwner | null;
  visualEffects: VisualEffect[];
}

// Visual effects for animations
interface VisualEffect {
  id: string;
  type: 'teleport_in' | 'teleport_out' | 'conquest' | 'unit_trail';
  position: { x: number, y: number };
  owner: CellOwner;
  createdAt: number;
  duration: number;
}

// Action types
type GameAction = 
  | { type: 'SELECT_CELL', payload: { cellId: string | null } }
  | { type: 'CREATE_CELLS', payload: { cells: CellData[] } }
  | { type: 'UPDATE_CELL_UNITS', payload: { cells: CellData[] } }
  | { type: 'SEND_UNITS', payload: { sourceCell: CellData, targetCell: CellData, units: number } }
  | { type: 'MOVE_UNITS', payload: { timestamp: number } }
  | { type: 'START_BATTLE', payload: { cellId: string, attackers: { owner: CellOwner, units: number }, defenders: { owner: CellOwner, units: number } } }
  | { type: 'UPDATE_BATTLES', payload: { timestamp: number } }
  | { type: 'ADD_VISUAL_EFFECT', payload: VisualEffect }
  | { type: 'CLEAR_OLD_EFFECTS', payload: { timestamp: number } }
  | { type: 'HANDLE_TELEPORT', payload: { unitId: string, sourceCellId: string, targetCellId: string } }
  | { type: 'CHECK_GAME_OVER' }
  | { type: 'RESTART_GAME', payload: { cellCount: number } };

// Initial state
const initialState: GameState = {
  cells: [],
  paths: [],
  units: [],
  battles: [],
  selectedCellId: null,
  gameOver: false,
  winner: null,
  visualEffects: []
};

// Reducer function
function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SELECT_CELL':
      return {
        ...state,
        selectedCellId: action.payload.cellId
      };
      
    case 'CREATE_CELLS':
      return {
        ...state,
        cells: action.payload.cells
      };
      
    case 'UPDATE_CELL_UNITS':
      // Update cell units based on growth rate, applying special cell properties
      return {
        ...state,
        cells: state.cells.map(cell => {
          // Skip neutral cells and cells in battle
          if (cell.owner === 'neutral' || cell.inBattle) return cell;
          
          // Apply factory multiplier if applicable
          const factoryMultiplier = cell.cellType === 'factory' ? (cell.factoryMultiplier || 1.5) : 1;
          const growthRate = cell.unitGrowthRate * factoryMultiplier;
          
          return {
            ...cell,
            units: cell.units + growthRate / 10 // Divided by 10 for smoother growth
          };
        })
      };
      
    case 'SEND_UNITS': {
      const { sourceCell, targetCell, units: unitsToSend } = action.payload;
      
      // Resolve teleporter destination if target is a teleporter
      let actualTarget = targetCell;
      let resolvedTeleports: string[] = [];
      
      if (targetCell.cellType === 'teleporter' && targetCell.teleporterTarget) {
        // Create a set to track visited teleporters to prevent infinite loops
        const visitedTeleporters = new Set<string>([targetCell.id]);
        actualTarget = targetCell;
        resolvedTeleports.push(targetCell.id);
        
        // Follow teleporter chain
        let nextTeleportId = targetCell.teleporterTarget;
        while (nextTeleportId) {
          // Prevent infinite loops
          if (visitedTeleporters.has(nextTeleportId)) break;
          
          const nextTeleporter = state.cells.find(c => c.id === nextTeleportId);
          if (!nextTeleporter || nextTeleporter.inBattle) break;
          
          visitedTeleporters.add(nextTeleportId);
          resolvedTeleports.push(nextTeleportId);
          actualTarget = nextTeleporter;
          
          // Check if this teleporter points to another
          if (nextTeleporter.cellType === 'teleporter' && nextTeleporter.teleporterTarget) {
            nextTeleportId = nextTeleporter.teleporterTarget;
          } else {
            break;
          }
          
          // Safety limit
          if (resolvedTeleports.length > 5) break;
        }
      }
      
      // Create a new unit
      // Create a unit starting at the source cell's center
      
      const newUnit: UnitData = {
        id: generateId(),
        owner: sourceCell.owner,
        position: { x: sourceCell.x, y: sourceCell.y }, // Start at source cell center
        targetCellId: actualTarget.id,
        progress: 0,
        units: unitsToSend,
        trailEffect: true,
        pulseEffect: unitsToSend > 10,
        size: Math.min(Math.max(14, unitsToSend * 1.5), 36)
      };
      
      // Add teleportation path if any teleporters were used
      if (resolvedTeleports.length > 0) {
        newUnit.teleportationPath = resolvedTeleports;
      }
      
      // Create a new path
      const newPath: PathData = {
        id: generateId(),
        sourceCellId: sourceCell.id,
        targetCellId: actualTarget.id,
        unitTransferRate: 0,
        owner: sourceCell.owner,
        pathType: resolvedTeleports.length > 0 ? 'curved' : (Math.random() > 0.5 ? 'curved' : 'straight'),
        pathStrength: unitsToSend > 10 ? 'strong' : unitsToSend > 5 ? 'medium' : 'weak',
        active: true,
        lastUnitSent: Date.now()
      };
      
      // Add teleport visual effects if needed
      const newEffects: VisualEffect[] = [];
      if (resolvedTeleports.length > 0) {
        // Add teleport effect at each jump in the chain
        for (let i = 0; i < resolvedTeleports.length; i++) {
          const teleporterId = resolvedTeleports[i];
          const teleporter = state.cells.find(c => c.id === teleporterId);
          
          if (teleporter) {
            // Teleport out effect
            newEffects.push({
              id: generateId(),
              type: 'teleport_out',
              position: { x: teleporter.x, y: teleporter.y },
              owner: sourceCell.owner,
              createdAt: Date.now() + i * 200, // Stagger effects in chain
              duration: 500
            });
            
            // Teleport in effect at next destination if there is one
            if (i < resolvedTeleports.length - 1) {
              const nextTeleporterId = resolvedTeleports[i + 1];
              const nextTeleporter = state.cells.find(c => c.id === nextTeleporterId);
              
              if (nextTeleporter) {
                newEffects.push({
                  id: generateId(),
                  type: 'teleport_in',
                  position: { x: nextTeleporter.x, y: nextTeleporter.y },
                  owner: sourceCell.owner,
                  createdAt: Date.now() + i * 200 + 100, // Slightly offset from teleport out
                  duration: 500
                });
              }
            }
          }
        }
      }
      
      return {
        ...state,
        // Update source cell by subtracting units
        cells: state.cells.map(cell => {
          if (cell.id === sourceCell.id) {
            return {
              ...cell,
              units: cell.units - unitsToSend
            };
          }
          return cell;
        }),
        // Add new unit
        units: [...state.units, newUnit],
        // Add new path
        paths: [...state.paths, newPath],
        // Add visual effects if any
        visualEffects: [...state.visualEffects, ...newEffects]
      };
    }
      
    case 'MOVE_UNITS': {
      const { timestamp } = action.payload;
      const updatedUnits: UnitData[] = [];
      const arrivedUnits: Record<string, { friendly: UnitData[], enemy: UnitData[] }> = {};
      
      // Process all units
      for (const unit of state.units) {
        const targetCell = state.cells.find(cell => cell.id === unit.targetCellId);
        if (!targetCell) continue;
        
        // Find source cell from paths
        const sourceCellId = state.paths.find(path => 
          path.targetCellId === targetCell.id && path.owner === unit.owner
        )?.sourceCellId;
        
        if (!sourceCellId) continue;
        
        const sourceCell = state.cells.find(cell => cell.id === sourceCellId);
        if (!sourceCell) continue;
        
        // Update progress
        const newProgress = unit.progress + 0.017; // About 60 FPS
        
        if (newProgress >= 1) {
          // Unit has arrived at target - collect for batch processing
          const targetId = targetCell.id;
          
          if (!arrivedUnits[targetId]) {
            arrivedUnits[targetId] = { friendly: [], enemy: [] };
          }
          
          // Check if unit is friendly or enemy to target
          const isTargetFriendly = targetCell.owner === unit.owner;
          
          if (isTargetFriendly) {
            arrivedUnits[targetId].friendly.push(unit);
          } else {
            arrivedUnits[targetId].enemy.push(unit);
          }
        } else {
          // Unit is still moving - update its position
          
          // Calculate direct path between source and target
          const deltaX = targetCell.x - sourceCell.x;
          const deltaY = targetCell.y - sourceCell.y;
          
          // Interpolate directly along the path
          const newX = sourceCell.x + deltaX * newProgress;
          const newY = sourceCell.y + deltaY * newProgress;
          
          
          updatedUnits.push({
            ...unit,
            position: { x: newX, y: newY },
            progress: newProgress,
            trailEffect: unit.trailEffect,
            pulseEffect: unit.pulseEffect,
            size: unit.size
          });
        }
      }
      
      // Create new state with updated units
      let newState = {
        ...state,
        units: updatedUnits
      };
      
      // Process arrivals for each target cell
      for (const targetId in arrivedUnits) {
        const targetCell = state.cells.find(cell => cell.id === targetId);
        if (!targetCell) continue;
        
        // Skip if cell is already in battle
        if (targetCell.inBattle) continue;
        
        const { friendly, enemy } = arrivedUnits[targetId];
        
        // Case 1: Only friendly reinforcements arriving
        if (enemy.length === 0 && friendly.length > 0) {
          // Make sure the first friendly unit matches the cell owner
          if (friendly[0].owner === targetCell.owner) {
            const totalReinforcements = friendly.reduce((sum, unit) => sum + unit.units, 0);
            
            // Update cell with reinforcements
            newState = {
              ...newState,
              cells: newState.cells.map(cell => {
                if (cell.id === targetId) {
                  return {
                    ...cell,
                    units: cell.units + totalReinforcements
                  };
                }
                return cell;
              })
            };
          }
        }
        
        // Case 2: Enemy units arriving to attack
        else if (enemy.length > 0) {
          // Calculate total attacking units and determine attacker owner
          const totalAttackers = enemy.reduce((sum, unit) => sum + unit.units, 0);
          const attackerOwner = enemy[0].owner;
          
          // Apply fortress defense bonus if applicable
          const defenderUnits = targetCell.units;
          const adjustedDefenderUnits = targetCell.cellType === 'fortress' 
            ? defenderUnits * (targetCell.fortressDefense || 1.5) 
            : defenderUnits;
          
          // Create a new battle
          const newBattle: BattleData = {
            id: generateId(),
            cellId: targetId,
            attackers: {
              owner: attackerOwner,
              initialUnits: totalAttackers,
              currentUnits: totalAttackers
            },
            defenders: {
              owner: targetCell.owner,
              initialUnits: adjustedDefenderUnits,
              currentUnits: adjustedDefenderUnits
            },
            progress: 0,
            startTime: timestamp,
            duration: BATTLE_DURATION,
            resolved: false
          };
          
          // Mark cell as in battle
          newState = {
            ...newState,
            battles: [...newState.battles, newBattle],
            cells: newState.cells.map(cell => {
              if (cell.id === targetId) {
                return {
                  ...cell,
                  inBattle: true,
                  battleProgress: 0,
                  attackers: totalAttackers,
                  defenders: adjustedDefenderUnits,
                  battleOwner: attackerOwner
                };
              }
              return cell;
            })
          };
        }
      }
      
      return newState;
    }
      
    case 'UPDATE_BATTLES': {
      const { timestamp } = action.payload;
      const updatedBattles: BattleData[] = [];
      let updatedCells = [...state.cells];
      const newEffects: VisualEffect[] = [];
      
      // Process all active battles
      for (const battle of state.battles) {
        // Calculate battle progress
        const elapsed = timestamp - battle.startTime;
        const progress = Math.min(1, elapsed / battle.duration);
        
        // Get current cell state
        const cellIndex = updatedCells.findIndex(cell => cell.id === battle.cellId);
        if (cellIndex === -1) continue;
        
        const cell = updatedCells[cellIndex];
        
        // Update battle animation state in the cell
        updatedCells[cellIndex] = {
          ...cell,
          battleProgress: progress
        };
        
        // Calculate current unit counts based on progress
        const attackerUnits = Math.max(0, 
          battle.attackers.initialUnits - (progress * battle.attackers.initialUnits * 
          (battle.attackers.initialUnits < battle.defenders.initialUnits ? 1 : 
           battle.defenders.initialUnits / battle.attackers.initialUnits)));
        
        const defenderUnits = Math.max(0, 
          battle.defenders.initialUnits - (progress * battle.defenders.initialUnits * 
          (battle.defenders.initialUnits < battle.attackers.initialUnits ? 1 : 
           battle.attackers.initialUnits / battle.defenders.initialUnits)));
        
        // Check if battle is complete
        if (progress >= 1) {
          // Determine battle outcome
          const attackersWin = battle.attackers.initialUnits > battle.defenders.initialUnits;
          const isTie = battle.attackers.initialUnits === battle.defenders.initialUnits;
          
          let newOwner = cell.owner;
          let newUnits = 0;
          
          if (attackersWin) {
            newOwner = battle.attackers.owner;
            newUnits = Math.ceil(battle.attackers.initialUnits - battle.defenders.initialUnits);
          } else if (!isTie) {
            newUnits = Math.ceil(battle.defenders.initialUnits - battle.attackers.initialUnits);
          } else {
            // Handle tie based on previous rules
            if (cell.owner === 'neutral') {
              newOwner = battle.attackers.owner;
              newUnits = 1;
            } else if (cell.owner === 'enemy' && battle.attackers.owner === 'player') {
              newOwner = battle.attackers.owner;
              newUnits = 1;
            } else {
              newUnits = 1;
            }
          }
          
          // Update cell with battle results
          updatedCells[cellIndex] = {
            ...cell,
            owner: newOwner,
            units: newUnits,
            inBattle: false,
            battleProgress: 0,
            attackers: undefined,
            defenders: undefined,
            battleOwner: undefined,
            conquestUnits: cell.owner !== newOwner ? newUnits : undefined
          };
          
          // Add conquest effect if ownership changed
          if (cell.owner !== newOwner) {
            newEffects.push({
              id: generateId(),
              type: 'conquest',
              position: { x: cell.x, y: cell.y },
              owner: newOwner,
              createdAt: timestamp,
              duration: 800
            });
          }
        } else {
          // Battle still in progress, update battle state
          updatedBattles.push({
            ...battle,
            progress,
            attackers: {
              ...battle.attackers,
              currentUnits: Math.ceil(attackerUnits)
            },
            defenders: {
              ...battle.defenders,
              currentUnits: Math.ceil(defenderUnits)
            }
          });
        }
      }
      
      return {
        ...state,
        battles: updatedBattles,
        cells: updatedCells,
        visualEffects: [...state.visualEffects, ...newEffects]
      };
    }
      
    case 'ADD_VISUAL_EFFECT':
      return {
        ...state,
        visualEffects: [...state.visualEffects, action.payload]
      };
      
    case 'CLEAR_OLD_EFFECTS': {
      const { timestamp } = action.payload;
      
      // Remove effects that have expired
      return {
        ...state,
        visualEffects: state.visualEffects.filter(effect => {
          const effectEndTime = effect.createdAt + effect.duration;
          return effectEndTime > timestamp;
        })
      };
    }
      
    case 'HANDLE_TELEPORT': {
      const { unitId, sourceCellId, targetCellId } = action.payload;
      
      // Find the unit and cells
      const unit = state.units.find(u => u.id === unitId);
      const sourceCell = state.cells.find(c => c.id === sourceCellId);
      const targetCell = state.cells.find(c => c.id === targetCellId);
      
      if (!unit || !sourceCell || !targetCell) return state;
      
      // Update unit's target and add teleport effects
      return {
        ...state,
        units: state.units.map(u => {
          if (u.id === unitId) {
            return {
              ...u,
              targetCellId,
              teleportationPath: u.teleportationPath ? [...u.teleportationPath, sourceCellId] : [sourceCellId]
            };
          }
          return u;
        }),
        visualEffects: [
          ...state.visualEffects,
          {
            id: generateId(),
            type: 'teleport_out',
            position: { x: sourceCell.x, y: sourceCell.y },
            owner: unit.owner,
            createdAt: Date.now(),
            duration: 500
          },
          {
            id: generateId(),
            type: 'teleport_in',
            position: { x: targetCell.x, y: targetCell.y },
            owner: unit.owner,
            createdAt: Date.now() + 100,
            duration: 500
          }
        ]
      };
    }
      
    case 'CHECK_GAME_OVER': {
      const playerCells = state.cells.filter(cell => cell.owner === 'player');
      const enemyCells = state.cells.filter(cell => cell.owner === 'enemy');
      
      // Check win/lose condition
      if (playerCells.length === 0 && state.cells.length > 0) {
        return {
          ...state,
          gameOver: true,
          winner: 'enemy'
        };
      } else if (enemyCells.length === 0 && state.cells.length > 0 && playerCells.length > 0) {
        return {
          ...state,
          gameOver: true,
          winner: 'player'
        };
      }
      
      return state;
    }
      
    case 'RESTART_GAME':
      // Reset to initial state but with new cells
      return {
        ...initialState
      };
      
    default:
      return state;
  }
}

// Create initial cells
function createInitialCells(count: number): CellData[] {
  const cells: CellData[] = [];
  
  // Define cell type distribution
  const specialCellCount = Math.min(Math.floor(count * 0.4), count - 2);
  const factoryCount = Math.floor(specialCellCount * 0.4);
  const fortressCount = Math.floor(specialCellCount * 0.3);
  const teleporterCount = specialCellCount - factoryCount - fortressCount;
  
  // Assign types sequentially 
  const cellTypes: CellType[] = [
    ...Array(factoryCount).fill('factory'),
    ...Array(fortressCount).fill('fortress'),
    ...Array(teleporterCount).fill('teleporter'),
    ...Array(count - specialCellCount).fill('standard')
  ];
  
  // Shuffle cell types
  for (let i = cellTypes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cellTypes[i], cellTypes[j]] = [cellTypes[j], cellTypes[i]];
  }
  
  // Always make player and enemy start with standard cells
  cellTypes[0] = 'standard';
  cellTypes[1] = 'standard';
  
  // Helper function to calculate distance
  const calculateDistance = (x1: number, y1: number, x2: number, y2: number): number => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  };
  
  // Create player's first cell - coordinates represent center points for units to move to/from
  cells.push({
    id: generateId(),
    x: window.innerWidth * 0.2,
    y: window.innerHeight * 0.5,
    units: 10,
    owner: 'player',
    unitGrowthRate: 1,
    cellType: 'standard'
  });
  
  
  // Create enemy and neutral cells
  for (let i = 1; i < count; i++) {
    const isEnemy = i === 1; // Make the second cell an enemy cell
    const cellType = cellTypes[i];
    
    // Ensure cells aren't too close to each other
    let validPosition = false;
    let x = 0;
    let y = 0;
    
    while (!validPosition) {
      x = Math.random() * (window.innerWidth * 0.8) + (window.innerWidth * 0.1);
      y = Math.random() * (window.innerHeight * 0.8) + (window.innerHeight * 0.1);
      
      validPosition = true;
      for (const cell of cells) {
        if (calculateDistance(x, y, cell.x, cell.y) < 150) {
          validPosition = false;
          break;
        }
      }
    }
    
    // Special attributes based on cell type
    let factoryMultiplier: number | undefined;
    let fortressDefense: number | undefined;
    let teleporterTarget: string | undefined;
    
    if (cellType === 'factory') {
      factoryMultiplier = 2; // Doubles unit production rate
    } else if (cellType === 'fortress') {
      fortressDefense = 1.5; // 50% defensive bonus
    } else if (cellType === 'teleporter') {
      // Teleporter target will be assigned later when all cells are created
      teleporterTarget = undefined;
    }
    
    cells.push({
      id: generateId(),
      x,
      y,
      units: isEnemy ? 15 : Math.floor(Math.random() * 5) + 1,
      owner: isEnemy ? 'enemy' : 'neutral',
      unitGrowthRate: cellType === 'factory' ? 1.5 : 1, // Factories have higher base growth
      cellType,
      factoryMultiplier,
      fortressDefense,
      teleporterTarget
    });
  }
  
  // Assign teleporter pairs
  const teleporters = cells.filter(cell => cell.cellType === 'teleporter');
  for (let i = 0; i < teleporters.length; i += 2) {
    const teleporter1 = teleporters[i];
    // If we have an odd number of teleporters, the last one connects to the first one
    const teleporter2 = i + 1 < teleporters.length ? teleporters[i + 1] : teleporters[0];
    
    teleporter1.teleporterTarget = teleporter2.id;
    teleporter2.teleporterTarget = teleporter1.id;
  }
  
  return cells;
}

// Hook for managing game state
export function useGameState(initialCellCount: number = 10) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  
  // Initialize game
  const initializeGame = useCallback(() => {
    const cells = createInitialCells(initialCellCount);
    dispatch({ type: 'CREATE_CELLS', payload: { cells } });
  }, [initialCellCount]);
  
  // Update game state (called in game loop)
  const updateGame = useCallback((timestamp: number) => {
    // Update cell units based on growth rate
    dispatch({ type: 'UPDATE_CELL_UNITS', payload: { cells: state.cells } });
    
    // Move units and handle arrivals
    dispatch({ type: 'MOVE_UNITS', payload: { timestamp } });
    
    // Update battles
    dispatch({ type: 'UPDATE_BATTLES', payload: { timestamp } });
    
    // Clear old visual effects
    dispatch({ type: 'CLEAR_OLD_EFFECTS', payload: { timestamp } });
    
    // Check game over condition
    dispatch({ type: 'CHECK_GAME_OVER' });
  }, [state.cells]);
  
  // Handle cell selection and unit sending
  const handleCellClick = useCallback((cellId: string) => {
    const clickedCell = state.cells.find(cell => cell.id === cellId);
    if (!clickedCell) return;
    
    if (state.selectedCellId) {
      const sourceCell = state.cells.find(cell => cell.id === state.selectedCellId);
      
      if (sourceCell && sourceCell.owner === 'player' && cellId !== state.selectedCellId) {
        // Check if source cell has enough units
        if (sourceCell.units > 1) {
          // Calculate units to send (60% of source cell's units)
          const unitsToSend = Math.floor(sourceCell.units * 0.6);
          
          // Send units
          dispatch({ 
            type: 'SEND_UNITS', 
            payload: { 
              sourceCell, 
              targetCell: clickedCell, 
              units: unitsToSend 
            } 
          });
        }
      }
      
      // Deselect cell after sending units
      dispatch({ type: 'SELECT_CELL', payload: { cellId: null } });
    } else {
      // Select the cell if it's owned by the player
      if (clickedCell.owner === 'player') {
        dispatch({ type: 'SELECT_CELL', payload: { cellId } });
      }
    }
  }, [state.selectedCellId, state.cells]);
  
  // AI actions
  const performAiActions = useCallback(() => {
    const enemyCells = state.cells.filter(cell => cell.owner === 'enemy');
    
    // Skip if no enemy cells
    if (enemyCells.length === 0) return;
    
    // For each enemy cell, try to attack nearby cells
    enemyCells.forEach(enemyCell => {
      // Skip if cell doesn't have enough units
      if (enemyCell.units <= 5) return;
      
      // Find nearby cells to attack
      const targetableCells = state.cells.filter(cell => 
        cell.id !== enemyCell.id && 
        cell.owner !== 'enemy' &&
        !cell.inBattle && // Skip cells in battle
        calculateDistance(enemyCell.x, enemyCell.y, cell.x, cell.y) < 300
      );
      
      // Skip if no targetable cells
      if (targetableCells.length === 0) return;
      
      // Sort by distance
      targetableCells.sort((a, b) => 
        calculateDistance(enemyCell.x, enemyCell.y, a.x, a.y) - 
        calculateDistance(enemyCell.x, enemyCell.y, b.x, b.y)
      );
      
      // Attack nearest cell
      const targetCell = targetableCells[0];
      const unitsToSend = Math.floor(enemyCell.units * 0.6);
      
      dispatch({ 
        type: 'SEND_UNITS', 
        payload: { 
          sourceCell: enemyCell, 
          targetCell, 
          units: unitsToSend 
        } 
      });
    });
  }, [state.cells]);
  
  // Helper function to calculate distance
  const calculateDistance = (x1: number, y1: number, x2: number, y2: number): number => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  };
  
  // Restart game
  const restartGame = useCallback(() => {
    dispatch({ type: 'RESTART_GAME', payload: { cellCount: initialCellCount } });
    initializeGame();
  }, [initialCellCount, initializeGame]);
  
  return {
    state,
    initializeGame,
    updateGame,
    handleCellClick,
    performAiActions,
    restartGame
  };
}