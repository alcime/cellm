import { useState, useEffect, useCallback } from 'react';
import { 
  CellData, 
  PathData, 
  UnitData, 
  CellOwner, 
  CellType, 
  BattleData, 
  MapDefinition 
} from '../types';
import { generateId, calculateDistance } from '../utils/helpers';
import { predefinedMaps, getMapById } from '../maps/mapDefinitions';

// Define transaction types for cell conquest
interface CombatTransaction {
  targetCellId: string;
  originalCell: CellData;
  attackerUnits: { owner: CellOwner, units: number }[];
  friendlyUnits: { owner: CellOwner, units: number }[];
  result: {
    newUnits: number;
    newOwner: CellOwner;
    wasConquered: boolean;
    conquestUnits?: number;
  };
}

// Battle animation configuration
const BATTLE_DURATION = 3000; // ms
const BATTLE_TICKS = 30; // How many calculation ticks during battle

// Combat logic functions
const calculateCombatResult = (
  cell: CellData,
  attackers: { owner: CellOwner, units: number }[]
): { newUnits: number, newOwner: CellOwner, conquestUnits?: number } => {
  if (!attackers.length) {
    return { newUnits: cell.units, newOwner: cell.owner };
  }

  // Sort attackers by owner priority (player > enemy > neutral) for consistent resolution
  const sortedAttackers = [...attackers].sort((a, b) => {
    // Player has highest priority in multi-faction conflicts
    if (a.owner === 'player' && b.owner !== 'player') return -1;
    if (a.owner !== 'player' && b.owner === 'player') return 1;
    // Enemy has second priority
    if (a.owner === 'enemy' && b.owner === 'neutral') return -1;
    if (a.owner === 'neutral' && b.owner === 'enemy') return 1;
    return 0;
  });

  // Calculate total attacking strength
  const totalAttackers = sortedAttackers.reduce((sum, unit) => sum + unit.units, 0);
  const defenderUnits = Math.max(0, cell.units); // Ensure non-negative
  const attackerOwner = sortedAttackers[0].owner; // Use highest priority attacker for ownership

  console.log(`\n  BATTLE: ${totalAttackers} attacking units (${attackerOwner}) vs ${defenderUnits} defending units (${cell.owner})`);
  
  // Safety check - both values should be non-negative
  if (totalAttackers < 0 || defenderUnits < 0) {
    console.error(`COMBAT ERROR: Invalid unit values - attackers: ${totalAttackers}, defenders: ${defenderUnits}`);
  }

  let newUnits: number;
  let newOwner: CellOwner;
  let conquestUnits: number | undefined;

  // Combat resolution logic
  if (totalAttackers > defenderUnits) {
    // Attackers win
    newUnits = totalAttackers - defenderUnits;
    newOwner = attackerOwner;
    conquestUnits = newUnits;
    console.log(`  ATTACKER VICTORY: ${totalAttackers} - ${defenderUnits} = ${newUnits} units remain`);
    console.log(`  OWNERSHIP CHANGE: ${cell.owner} -> ${newOwner}`);
  } else if (totalAttackers < defenderUnits) {
    // Defenders win
    newUnits = defenderUnits - totalAttackers;
    newOwner = cell.owner;
    console.log(`  DEFENDER VICTORY: ${defenderUnits} - ${totalAttackers} = ${newUnits} units remain`);
    console.log(`  OWNERSHIP UNCHANGED: ${cell.owner}`);
  } else {
    // Tie - consistent rules
    if (cell.owner === 'neutral') {
      newUnits = 1;
      newOwner = attackerOwner;
      conquestUnits = newUnits;
      console.log(`  TIE (NEUTRAL): Attacker takes with 1 unit`);
      console.log(`  OWNERSHIP CHANGE: ${cell.owner} -> ${newOwner}`);
    } else if (cell.owner === 'enemy' && attackerOwner === 'player') {
      newUnits = 1;
      newOwner = attackerOwner;
      conquestUnits = newUnits;
      console.log(`  TIE (PLAYER vs ENEMY): Player wins with 1 unit`);
      console.log(`  OWNERSHIP CHANGE: ${cell.owner} -> ${newOwner}`);
    } else {
      newUnits = 1;
      newOwner = cell.owner;
      console.log(`  TIE (OTHER): Defender keeps with 1 unit`);
      console.log(`  OWNERSHIP UNCHANGED: ${cell.owner}`);
    }
  }

  // Ensure non-negative results
  newUnits = Math.max(1, newUnits);

  return { newUnits, newOwner, conquestUnits };
};

// Process reinforcements from friendly units
const processReinforcements = (
  cell: CellData,
  reinforcements: { owner: CellOwner, units: number }[],
  currentOwner: CellOwner,
  currentUnits: number
): number => {
  if (!reinforcements.length) return currentUnits;

  // Only reinforce if the owner matches
  const validReinforcements = reinforcements.filter(unit => unit.owner === currentOwner);
  
  if (validReinforcements.length === 0) {
    console.log(`  REINFORCEMENT SKIPPED: Cell owner (${currentOwner}) doesn't match available reinforcements`);
    return currentUnits;
  }

  // Calculate total reinforcements
  const totalReinforcements = validReinforcements.reduce((sum, unit) => sum + unit.units, 0);
  const newUnits = currentUnits + totalReinforcements;
  
  console.log(`  APPLYING REINFORCEMENTS: ${currentUnits} + ${totalReinforcements} = ${newUnits}`);
  return newUnits;
};

// Main transaction processing function
const processCellTransaction = (transaction: CombatTransaction): CellData => {
  const { originalCell, attackerUnits, friendlyUnits } = transaction;
  
  console.log(`\n==== PROCESSING CELL ${originalCell.id} ====`);
  console.log(`Target cell current state: ${originalCell.units} units, owner: ${originalCell.owner}`);
  console.log(`Processing ${attackerUnits.length} attacking units and ${friendlyUnits.length} reinforcing units`);

  // First handle combat (if any attackers present)
  const combatResult = calculateCombatResult(originalCell, attackerUnits);
  
  // Then handle reinforcements based on new ownership
  const finalUnits = processReinforcements(
    originalCell,
    friendlyUnits,
    combatResult.newOwner,
    combatResult.newUnits
  );

  // Determine if ownership changed
  const wasConquered = originalCell.owner !== combatResult.newOwner;
  
  // Log final state
  console.log(`\n  === FINAL STATE ===`);
  console.log(`  Units: ${originalCell.units} → ${finalUnits}`);
  console.log(`  Owner: ${originalCell.owner} → ${combatResult.newOwner}`);
  console.log(`  Conquered: ${wasConquered ? 'YES' : 'NO'}`);
  console.log(`  Animation value: ${wasConquered ? combatResult.conquestUnits : 'N/A'}`);
  console.log(`  ====================\n`);

  // Return updated cell state
  return {
    ...originalCell,
    units: finalUnits,
    owner: combatResult.newOwner,
    unitGrowthRate: 1, // Consistent growth rate
    conquestUnits: wasConquered ? combatResult.conquestUnits : undefined
  };
};

/**
 * Create a random map with the specified number of cells
 */
const createRandomCells = (count: number): CellData[] => {
  const cells: CellData[] = [];
  
  // Define cell type distribution
  const specialCellCount = Math.min(Math.floor(count * 0.4), count - 2); // 40% special cells, but at least leave 2 standard
  const factoryCount = Math.floor(specialCellCount * 0.4); // 40% of special cells are factories
  const fortressCount = Math.floor(specialCellCount * 0.3); // 30% of special cells are fortresses
  const teleporterCount = specialCellCount - factoryCount - fortressCount; // Remaining are teleporters
  
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
  
  // Create player's first cell
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
};

/**
 * Load a predefined map from a MapDefinition
 */
const loadPredefinedMap = (mapDefinition: MapDefinition): CellData[] => {
  console.log(`Loading predefined map: ${mapDefinition.name}`);
  const cells: CellData[] = [];
  const defaultGrowthRate = mapDefinition.defaultUnitGrowthRate || 1;
  
  // Create a dictionary to store teleporter cells by their index in the definition
  const teleportersByIndex: { [index: number]: CellData } = {};
  
  // Process each cell in the map definition
  mapDefinition.cells.forEach((cellDef, index) => {
    // Generate a unique ID if not provided
    const id = cellDef.id || generateId();
    
    // Create the basic cell data
    const cell: CellData = {
      id,
      x: cellDef.x,
      y: cellDef.y,
      units: cellDef.initialUnits,
      owner: cellDef.owner,
      unitGrowthRate: defaultGrowthRate,
      cellType: cellDef.cellType
    };
    
    // Add special attributes based on cell type
    if (cellDef.cellType === 'factory') {
      cell.factoryMultiplier = cellDef.factoryMultiplier || 2;
      cell.unitGrowthRate = defaultGrowthRate * 1.5; // Factories have higher base growth
    } else if (cellDef.cellType === 'fortress') {
      cell.fortressDefense = cellDef.fortressDefense || 1.5;
    } else if (cellDef.cellType === 'teleporter') {
      // Store the teleporter by its index for later pairing
      teleportersByIndex[index] = cell;
    }
    
    cells.push(cell);
  });
  
  // Process teleporter pairs
  Object.entries(teleportersByIndex).forEach(([indexStr, cell]) => {
    const index = parseInt(indexStr);
    const cellDef = mapDefinition.cells[index];
    
    if (cellDef.teleporterPair !== undefined) {
      const targetIndex = cellDef.teleporterPair;
      const targetCell = teleportersByIndex[targetIndex];
      
      if (targetCell) {
        // Set up bidirectional teleporter links
        cell.teleporterTarget = targetCell.id;
        targetCell.teleporterTarget = cell.id;
      } else {
        console.warn(`Teleporter target index ${targetIndex} not found for teleporter at index ${index}`);
      }
    }
  });
  
  return cells;
};

/**
 * Create initial cells based on either a predefined map or random generation
 */
const createInitialCells = (count: number, mapId?: string): CellData[] => {
  // If mapId is provided, try to load that specific map
  if (mapId) {
    const mapDefinition = getMapById(mapId);
    if (mapDefinition) {
      return loadPredefinedMap(mapDefinition);
    }
    console.warn(`Map with ID ${mapId} not found, falling back to random map`);
  }
  
  // Fall back to random map generation
  return createRandomCells(count);
};

export const useGameLogic = (initialCellCount: number = 10, mapId?: string) => {
  const [cells, setCells] = useState<CellData[]>([]);
  const [paths, setPaths] = useState<PathData[]>([]);
  const [units, setUnits] = useState<UnitData[]>([]);
  const [battles, setBattles] = useState<BattleData[]>([]);
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [winner, setWinner] = useState<CellOwner | null>(null);
  const [currentMapId, setCurrentMapId] = useState<string | undefined>(mapId);
  
  // Initialize game
  useEffect(() => {
    setCells(createInitialCells(initialCellCount, currentMapId));
  }, [initialCellCount, currentMapId]);
  
  // Process battles
  const processBattles = useCallback(() => {
    // Skip if no battles
    if (battles.length === 0) return;
    
    // Update battles progress
    setBattles(prevBattles => {
      const now = Date.now();
      const updatedBattles = prevBattles.map(battle => {
        // Calculate battle progress
        const elapsed = now - battle.startTime;
        const progress = Math.min(1, elapsed / battle.duration);
        
        // Improved calculation for more realistic and accurate battle animation
        // Determine who's winning
        const attackersWinning = battle.attackers.initialUnits > battle.defenders.initialUnits;
        const isTie = battle.attackers.initialUnits === battle.defenders.initialUnits;
        
        // Calculate attack and defense ratios
        const attackRatio = battle.attackers.initialUnits / Math.max(1, battle.defenders.initialUnits);
        const defenseRatio = battle.defenders.initialUnits / Math.max(1, battle.attackers.initialUnits);
        
        let attackerUnits, defenderUnits;
        
        if (attackersWinning) {
          // Attackers are winning - they should lose troops slower than defenders
          // The stronger side loses units proportionally to the weaker side's strength
          attackerUnits = Math.max(1, Math.round(
            battle.attackers.initialUnits - (progress * battle.defenders.initialUnits)
          ));
          
          // Defenders lose all units by the end of the battle
          defenderUnits = Math.max(0, Math.round(
            battle.defenders.initialUnits * (1 - progress)
          ));
        } else if (isTie) {
          // In a tie, both sides lose units at the same rate, but ensure at least 1 unit survives
          // based on the battle resolution rules in the game
          const winnerOwner = 
            battle.defenders.owner === 'neutral' || 
            (battle.defenders.owner === 'enemy' && battle.attackers.owner === 'player') ? 
            battle.attackers.owner : battle.defenders.owner;
            
          if (winnerOwner === battle.attackers.owner) {
            attackerUnits = Math.max(1, Math.round(battle.attackers.initialUnits * (1 - progress * 0.9)));
            defenderUnits = Math.max(0, Math.round(battle.defenders.initialUnits * (1 - progress)));
          } else {
            attackerUnits = Math.max(0, Math.round(battle.attackers.initialUnits * (1 - progress)));
            defenderUnits = Math.max(1, Math.round(battle.defenders.initialUnits * (1 - progress * 0.9)));
          }
        } else {
          // Defenders are winning - they should lose troops slower
          attackerUnits = Math.max(0, Math.round(
            battle.attackers.initialUnits * (1 - progress)
          ));
          
          defenderUnits = Math.max(1, Math.round(
            battle.defenders.initialUnits - (progress * battle.attackers.initialUnits)
          ));
        }
        
        // Ensure final state matches the battle outcome
        if (progress > 0.95) {
          if (attackersWinning) {
            attackerUnits = Math.max(1, attackerUnits);
            defenderUnits = 0;
          } else if (!isTie) {
            attackerUnits = 0;
            defenderUnits = Math.max(1, defenderUnits);
          }
        }
        
        // Update cell battle state
        setCells(prevCells => {
          return prevCells.map(cell => {
            if (cell.id === battle.cellId) {
              return {
                ...cell,
                inBattle: true,
                battleProgress: progress,
                attackers: attackerUnits,
                defenders: defenderUnits,
                battleOwner: battle.attackers.owner
              };
            }
            return cell;
          });
        });
        
        // Check if battle is complete
        if (progress >= 1) {
          // Apply final result to cell
          setCells(prevCells => {
            return prevCells.map(cell => {
              if (cell.id === battle.cellId) {
                // Determine winner
                const attackersWin = battle.attackers.initialUnits > battle.defenders.initialUnits;
                const isTie = battle.attackers.initialUnits === battle.defenders.initialUnits;
                
                let newOwner = cell.owner;
                let newUnits = 0;
                
                if (attackersWin) {
                  newOwner = battle.attackers.owner;
                  newUnits = Math.ceil(battle.attackers.initialUnits - battle.defenders.initialUnits);
                } else if (!attackersWin && !isTie) {
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
                
                return {
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
              }
              return cell;
            });
          });
          
          // Mark battle as resolved
          return {
            ...battle,
            progress,
            resolved: true,
            attackers: {
              ...battle.attackers,
              currentUnits: 0
            },
            defenders: {
              ...battle.defenders,
              currentUnits: 0
            }
          };
        }
        
        // Update battle progress
        return {
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
        };
      });
      
      // Remove resolved battles
      return updatedBattles.filter(battle => !battle.resolved);
    });
  }, [battles, setCells, setBattles]);
  
  // Game loop - update cells, paths, units, and battles
  useEffect(() => {
    if (gameOver) return;
    
    const gameInterval = setInterval(() => {
      // Process any ongoing battles
      processBattles();
      
      // Update cell units based on growth rate
      setCells(prevCells => {
        return prevCells.map(cell => {
          if (cell.owner === 'neutral' || cell.inBattle) return cell;
          
          // Apply factory multiplier if applicable
          const growthRate = cell.cellType === 'factory' 
            ? cell.unitGrowthRate * (cell.factoryMultiplier || 1) 
            : cell.unitGrowthRate;
          
          return {
            ...cell,
            units: cell.units + growthRate / 10 // Divided by 10 for smoother growth
          };
        });
      });
      
      // Skip automatic unit generation from paths since we're now sending unit blocks
      // We'll keep paths for visual representation only
      
      // Update unit positions and handle cell captures
      setUnits(prevUnits => {
        const updatedUnits: UnitData[] = [];
        // Track which units have reached their target cells
        const arrivedUnits: { [cellId: string]: { friendly: UnitData[], enemy: UnitData[] } } = {};
        
        // First pass - collect all units that have arrived at their targets
        console.log('------- NEW GAME TICK - PROCESSING UNITS -------');
        console.log(`Processing ${prevUnits.length} units`);
        
        for (const unit of prevUnits) {
          const targetCell = cells.find(cell => cell.id === unit.targetCellId);
          if (!targetCell) {
            console.log(`WARNING: Target cell not found for unit ${unit.id}`);
            continue;
          }
          
          const sourceCell = cells.find(cell => {
            return paths.some(path => 
              path.targetCellId === targetCell.id && 
              path.sourceCellId === cell.id
            );
          });
          
          if (!sourceCell) {
            console.log(`WARNING: Source cell not found for unit ${unit.id}`);
            continue;
          }
          
          // Update unit progress
          const newProgress = unit.progress + 0.017;
          
          if (newProgress >= 1) {
            // Unit has arrived at its target - collect for batch processing
            const targetId = targetCell.id;
            
            if (!arrivedUnits[targetId]) {
              arrivedUnits[targetId] = { friendly: [], enemy: [] };
              console.log(`NEW ARRIVAL DESTINATION: Cell ${targetId}, owner: ${targetCell.owner}, units: ${targetCell.units}`);
            }
            
            // Separate friendly reinforcements from enemy attackers
            const isTargetFriendly = targetCell.owner === unit.owner;
            console.log(`Unit ${unit.id} (${unit.units} units, owner: ${unit.owner}) arrived at ${isTargetFriendly ? 'friendly' : 'enemy'} cell ${targetId}`);
            
            if (isTargetFriendly) {
              arrivedUnits[targetId].friendly.push(unit);
            } else {
              arrivedUnits[targetId].enemy.push(unit);
            }
          } else {
            // Unit is still moving - update its position based on the path type
            // Check if the path is curved
            const path = paths.find(p => 
              p.sourceCellId === sourceCell.id && 
              p.targetCellId === targetCell.id
            );
            
            let newX, newY;
            
            // Log debug information
            console.log('DEBUG: UNIT MOVEMENT');
            console.log(`  Source cell (${sourceCell.id}): x=${sourceCell.x}, y=${sourceCell.y}`);
            console.log(`  Target cell (${targetCell.id}): x=${targetCell.x}, y=${targetCell.y}`);
            console.log(`  Progress: ${newProgress.toFixed(2)}`);
            
            // Get the path type (straight or curved)
            const pathType = path?.pathType || 'straight';
            
            if (pathType === 'curved') {
              // Use quadratic bezier curve calculation for smooth curved movement
              // P = (1-t)²P₁ + 2(1-t)tP₂ + t²P₃
              
              // Calculate midpoint with perpendicular offset (same as in Path.tsx)
              const dx = targetCell.x - sourceCell.x;
              const dy = targetCell.y - sourceCell.y;
              const midX = (sourceCell.x + targetCell.x) / 2;
              const midY = (sourceCell.y + targetCell.y) / 2;
              
              // Same perpendicular offset as used in path rendering
              const perpX = -dy * 0.3;
              const perpY = dx * 0.3;
              
              // Control point (P₂)
              const ctrlX = midX + perpX;
              const ctrlY = midY + perpY;
              
              // Calculate point along the curve at progress t
              const t = newProgress;
              const mt = 1 - t;
              
              // Quadratic bezier formula
              newX = mt * mt * sourceCell.x + 2 * mt * t * ctrlX + t * t * targetCell.x;
              newY = mt * mt * sourceCell.y + 2 * mt * t * ctrlY + t * t * targetCell.y;
              
              console.log(`  Curved path: t=${t}, control=(${ctrlX},${ctrlY})`);
              console.log(`  Calculated position: (${newX.toFixed(2)},${newY.toFixed(2)})`);
            } else {
              // Simple linear interpolation for straight paths
              newX = sourceCell.x + (targetCell.x - sourceCell.x) * newProgress;
              newY = sourceCell.y + (targetCell.y - sourceCell.y) * newProgress;
              console.log(`  Linear path: (${newX.toFixed(2)},${newY.toFixed(2)})`);
            }
            
            updatedUnits.push({
              ...unit,
              position: { x: newX, y: newY },
              progress: newProgress,
              trailEffect: unit.trailEffect || false,
              pulseEffect: unit.pulseEffect || false,
              size: unit.size || Math.min(Math.max(14, unit.units * 1.5), 36)
            });
          }
        }
        
        // Second pass - process all arrived units for each target cell in a single atomic update
        console.log(`PROCESSING ARRIVALS: ${Object.keys(arrivedUnits).length} cells have units arriving`);
        
        Object.keys(arrivedUnits).forEach(targetId => {
          console.log(`\n==== PROCESSING CELL ${targetId} ====`);
          
          const targetCell = cells.find(cell => cell.id === targetId);
          if (!targetCell) {
            console.log(`ERROR: Could not find target cell ${targetId} in cells array!`);
            return;
          }
          
          console.log(`Target cell current state: ${targetCell.units} units, owner: ${targetCell.owner}`);
          
          // Count friendly/enemy arrivals for this cell
          const friendlyCount = arrivedUnits[targetId].friendly.length;
          const enemyCount = arrivedUnits[targetId].enemy.length;
          console.log(`Arrivals: ${friendlyCount} friendly units, ${enemyCount} enemy units`);
          
          setCells(prevCells => {
            console.log(`\n  ==== setCells triggered for ${targetId} ====`);
            
            // Find the latest cell state in this render cycle
            const latestCellState = prevCells.find(c => c.id === targetId);
            if (!latestCellState) {
              console.error(`CRITICAL ERROR: Cell ${targetId} not found in prevCells!`);
              return prevCells; // Return unchanged
            }
            
            console.log(`  Latest cell state in prevCells: ${latestCellState.units} units, owner: ${latestCellState.owner}`);
            
            return prevCells.map(cell => {
              if (cell.id !== targetId) return cell;
              
              // =================== IMPORTANT CHANGE ===================
              // We use the cell from prevCells (the current state snapshot)
              // This ensures all calculations use the proper starting values
              const originalCell = cell;
              console.log(`  Original cell state for calculation: ${originalCell.units} units, owner: ${originalCell.owner}`);
              
              // Start with original cell state
              let newUnits = originalCell.units;
              let newOwner = originalCell.owner;
              
              // Prepare transaction data
              const attackerUnits = arrivedUnits[targetId].enemy.map(unit => ({ 
                owner: unit.owner, 
                units: unit.units 
              }));
              
              const friendlyUnits = arrivedUnits[targetId].friendly.map(unit => ({ 
                owner: unit.owner, 
                units: unit.units 
              }));
              
              // Log all units involved
              if (attackerUnits.length > 0) {
                console.log(`\n  ** COMBAT SEQUENCE **`);
                attackerUnits.forEach((unit, idx) => {
                  console.log(`  Attacking unit ${idx+1}: ${unit.units} units, owner: ${unit.owner}`);
                });
              }
              
              if (friendlyUnits.length > 0) {
                console.log(`\n  ** REINFORCEMENTS **`);
                friendlyUnits.forEach((unit, idx) => {
                  console.log(`  Reinforcement unit ${idx+1}: ${unit.units} units, owner: ${unit.owner}`);
                });
              }
              
              // Check if the cell is already in battle
              if (originalCell.inBattle) {
                console.log(`Cell ${targetId} is already in battle, skipping transaction`);
                return originalCell;
              }
              
              // If only friendly units are arriving at an owned cell, directly add reinforcements
              if (attackerUnits.length === 0 && friendlyUnits.length > 0 && 
                  friendlyUnits[0].owner === originalCell.owner) {
                
                const totalReinforcements = friendlyUnits.reduce((sum, unit) => sum + unit.units, 0);
                console.log(`Adding ${totalReinforcements} friendly reinforcements directly`);
                
                return {
                  ...originalCell,
                  units: originalCell.units + totalReinforcements
                };
              }
              
              // If enemy units arriving, start a battle
              if (attackerUnits.length > 0) {
                // Start a battle instead of immediate conquest
                const attackingUnits = attackerUnits.reduce((sum, unit) => sum + unit.units, 0);
                const attackingOwner = attackerUnits[0].owner;
                const defendingUnits = originalCell.units;
                
                // Apply fortress defense bonus if applicable
                const adjustedDefendingUnits = originalCell.cellType === 'fortress' 
                  ? Math.round(defendingUnits * (originalCell.fortressDefense || 1)) 
                  : defendingUnits;
                
                if (adjustedDefendingUnits > defendingUnits) {
                  console.log(`Fortress defense bonus applied: ${defendingUnits} → ${adjustedDefendingUnits}`);
                }
                
                // Create a new battle
                const battleId = generateId();
                
                console.log(`Starting battle at cell ${targetId}: ${attackingUnits} ${attackingOwner} units vs ${adjustedDefendingUnits} ${originalCell.owner} units`);
                
                setBattles(prevBattles => [
                  ...prevBattles,
                  {
                    id: battleId,
                    cellId: targetId,
                    attackers: {
                      owner: attackingOwner,
                      initialUnits: attackingUnits,
                      currentUnits: attackingUnits
                    },
                    defenders: {
                      owner: originalCell.owner,
                      initialUnits: adjustedDefendingUnits,
                      currentUnits: adjustedDefendingUnits
                    },
                    progress: 0,
                    startTime: Date.now(),
                    duration: BATTLE_DURATION,
                    resolved: false
                  }
                ]);
                
                // Return the cell with battle flag
                return {
                  ...originalCell,
                  inBattle: true,
                  battleProgress: 0,
                  attackers: attackingUnits,
                  defenders: adjustedDefendingUnits,
                  battleOwner: attackingOwner
                };
              }
              
              // If no attackers or friendly reinforcements, just return the original cell
              return originalCell;
            });
          });
        });
        
        return updatedUnits;
      });
      
      // Check win/lose condition
      const playerCells = cells.filter(cell => cell.owner === 'player');
      const enemyCells = cells.filter(cell => cell.owner === 'enemy');
      
      if (playerCells.length === 0 && cells.length > 0) {
        setGameOver(true);
        setWinner('enemy');
      } else if (enemyCells.length === 0 && cells.length > 0 && playerCells.length > 0) {
        setGameOver(true);
        setWinner('player');
      }
      
    }, 100); // 10 updates per second
    
    return () => clearInterval(gameInterval);
  }, [cells, paths, gameOver]);
  
  // Handle cell selection and path creation
  const handleCellClick = useCallback((cellId: string) => {
    const clickedCell = cells.find(cell => cell.id === cellId);
    if (!clickedCell) return;
    
    if (selectedCellId) {
      const sourceCell = cells.find(cell => cell.id === selectedCellId);
      
      if (sourceCell && sourceCell.owner === 'player' && cellId !== selectedCellId) {
        // Check if a path already exists between these cells
        const existingPath = paths.find(path => 
          path.sourceCellId === selectedCellId && 
          path.targetCellId === cellId
        );
        
        if (existingPath) {
          // Remove existing path
          setPaths(prevPaths => prevPaths.filter(path => path.id !== existingPath.id));
        } else {
          // Calculate units to send (60% of source cell's units)
          const unitsToSend = Math.floor(sourceCell.units * 0.6);
          console.log(`Sending ${unitsToSend} units from ${sourceCell.units} total`);
          
          if (unitsToSend > 0) {
            // Update source cell by subtracting the units being sent
            setCells(prevCells => {
              return prevCells.map(cell => {
                if (cell.id === sourceCell.id) {
                  const remaining = cell.units - unitsToSend;
                  console.log(`Source cell will have ${remaining} units remaining`);
                  return {
                    ...cell,
                    units: remaining
                  };
                }
                return cell;
              });
            });
            
            // Create a single unit block to send
            const targetCell = cells.find(cell => cell.id === cellId);
            if (targetCell) {
              console.log(`Target cell has ${targetCell.units} units and owner ${targetCell.owner}`);
              const newUnit: UnitData = {
                id: generateId(),
                owner: sourceCell.owner,
                position: { x: sourceCell.x, y: sourceCell.y },
                targetCellId: targetCell.id,
                progress: 0,
                units: unitsToSend,
                trailEffect: true,
                pulseEffect: unitsToSend > 10,
                size: Math.min(Math.max(14, unitsToSend * 1.5), 36)
              };
              
              setUnits(prevUnits => [...prevUnits, newUnit]);
            }
            
            // Create new path for future transfers (but don't send immediately)
            setPaths(prevPaths => [
              ...prevPaths,
              {
                id: generateId(),
                sourceCellId: selectedCellId,
                targetCellId: cellId,
                unitTransferRate: 0, // Set to 0 initially, can be adjusted later if needed
                owner: 'player',
                pathType: Math.random() > 0.5 ? 'curved' : 'straight', // Randomly choose path type
                pathStrength: unitsToSend > 10 ? 'strong' : unitsToSend > 5 ? 'medium' : 'weak', // Path strength based on units
                active: true, // Activate the path for visual effect
                lastUnitSent: Date.now() // Track when the unit was sent
              }
            ]);
          }
        }
      }
      
      setSelectedCellId(null);
    } else {
      // Select the cell if it's owned by the player
      if (clickedCell.owner === 'player') {
        setSelectedCellId(cellId);
      }
    }
  }, [selectedCellId, cells, paths]);
  
  // Restart game
  const restartGame = useCallback((newMapId?: string) => {
    // If a new map ID is provided, update the current map
    if (newMapId !== undefined) {
      setCurrentMapId(newMapId);
    }
    
    // Reset game state
    setCells(createInitialCells(initialCellCount, newMapId || currentMapId));
    setPaths([]);
    setUnits([]);
    setSelectedCellId(null);
    setGameOver(false);
    setWinner(null);
  }, [initialCellCount, currentMapId]);
  
  // Change to a specific map
  const changeMap = useCallback((newMapId: string) => {
    setCurrentMapId(newMapId);
    restartGame(newMapId);
  }, [restartGame]);
  
  // Add some basic AI for enemy
  useEffect(() => {
    if (gameOver) return;
    
    const aiInterval = setInterval(() => {
      const enemyCells = cells.filter(cell => cell.owner === 'enemy');
      
      if (enemyCells.length === 0) return;
      
      // Create paths from enemy cells to nearby cells
      enemyCells.forEach(enemyCell => {
        const targetableCells = cells.filter(cell => 
          cell.id !== enemyCell.id && 
          cell.owner !== 'enemy' && 
          calculateDistance(enemyCell.x, enemyCell.y, cell.x, cell.y) < 300
        );
        
        if (targetableCells.length > 0) {
          // Sort by nearest distance
          targetableCells.sort((a, b) => 
            calculateDistance(enemyCell.x, enemyCell.y, a.x, a.y) - 
            calculateDistance(enemyCell.x, enemyCell.y, b.x, b.y)
          );
          
          const targetCell = targetableCells[0];
          
          // Check if a path already exists
          const existingPath = paths.find(path => 
            path.sourceCellId === enemyCell.id && 
            path.targetCellId === targetCell.id
          );
          
          if (!existingPath && enemyCell.units > 5) {
            // Calculate units to send (60% of enemy cell's units)
            const unitsToSend = Math.floor(enemyCell.units * 0.6);
            console.log(`Enemy sending ${unitsToSend} units from ${enemyCell.units} total`);
            
            if (unitsToSend > 0) {
              // Update enemy cell by subtracting the units being sent
              setCells(prevCells => {
                return prevCells.map(cell => {
                  if (cell.id === enemyCell.id) {
                    const remaining = cell.units - unitsToSend;
                    console.log(`Enemy cell will have ${remaining} units remaining`);
                    return {
                      ...cell,
                      units: remaining
                    };
                  }
                  return cell;
                });
              });
              
              // Create a single unit block to send
              console.log(`Enemy target cell has ${targetCell.units} units and owner ${targetCell.owner}`);
              const newEnemyUnit: UnitData = {
                id: generateId(),
                owner: 'enemy',
                position: { x: enemyCell.x, y: enemyCell.y },
                targetCellId: targetCell.id,
                progress: 0,
                units: unitsToSend,
                trailEffect: false,
                pulseEffect: unitsToSend > 10,
                size: Math.min(Math.max(14, unitsToSend * 1.5), 36)
              };
              
              setUnits(prevUnits => [...prevUnits, newEnemyUnit]);
              
              // Create new path for future
              setPaths(prevPaths => [
                ...prevPaths,
                {
                  id: generateId(),
                  sourceCellId: enemyCell.id,
                  targetCellId: targetCell.id,
                  unitTransferRate: 0,
                  owner: 'enemy',
                  pathType: Math.random() > 0.5 ? 'curved' : 'straight',
                  pathStrength: unitsToSend > 10 ? 'strong' : unitsToSend > 5 ? 'medium' : 'weak',
                  active: true,
                  lastUnitSent: Date.now()
                }
              ]);
            }
          }
        }
      });
    }, 5000); // AI makes decisions every 5 seconds
    
    return () => clearInterval(aiInterval);
  }, [cells, paths, gameOver]);
  
  return {
    cells,
    paths,
    units,
    selectedCellId,
    gameOver,
    winner,
    handleCellClick,
    restartGame,
    changeMap,
    currentMapId,
    availableMaps: predefinedMaps
  };
};