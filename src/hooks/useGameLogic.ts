import { useState, useEffect, useCallback } from 'react';
import { CellData, PathData, UnitData, CellOwner } from '../types';

// Helper functions
const generateId = (): string => Math.random().toString(36).substring(2, 9);

const calculateDistance = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

const createInitialCells = (count: number): CellData[] => {
  const cells: CellData[] = [];
  
  // Create player's first cell
  cells.push({
    id: generateId(),
    x: window.innerWidth * 0.2,
    y: window.innerHeight * 0.5,
    units: 10,
    owner: 'player',
    unitGrowthRate: 1
  });
  
  // Create enemy and neutral cells
  for (let i = 1; i < count; i++) {
    const isEnemy = i === 1; // Make the second cell an enemy cell
    
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
    
    cells.push({
      id: generateId(),
      x,
      y,
      units: isEnemy ? 15 : Math.floor(Math.random() * 5) + 1,
      owner: isEnemy ? 'enemy' : 'neutral',
      unitGrowthRate: isEnemy ? 0.8 : 0.5
    });
  }
  
  return cells;
};

export const useGameLogic = (initialCellCount: number = 10) => {
  const [cells, setCells] = useState<CellData[]>([]);
  const [paths, setPaths] = useState<PathData[]>([]);
  const [units, setUnits] = useState<UnitData[]>([]);
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [winner, setWinner] = useState<CellOwner | null>(null);
  
  // Initialize game
  useEffect(() => {
    setCells(createInitialCells(initialCellCount));
  }, [initialCellCount]);
  
  // Game loop - update cells, paths, and units
  useEffect(() => {
    if (gameOver) return;
    
    const gameInterval = setInterval(() => {
      // Update cell units based on growth rate
      setCells(prevCells => {
        return prevCells.map(cell => {
          if (cell.owner === 'neutral') return cell;
          
          return {
            ...cell,
            units: cell.units + cell.unitGrowthRate / 10 // Divided by 10 for smoother growth
          };
        });
      });
      
      // Process paths and create new units
      setPaths(prevPaths => {
        return prevPaths.map(path => {
          const sourceCell = cells.find(cell => cell.id === path.sourceCellId);
          
          if (sourceCell && sourceCell.units >= 1 && sourceCell.owner === path.owner) {
            setCells(prevCells => {
              return prevCells.map(cell => {
                if (cell.id === sourceCell.id) {
                  return {
                    ...cell,
                    units: cell.units - path.unitTransferRate / 10
                  };
                }
                return cell;
              });
            });
            
            // Create a new unit
            const targetCell = cells.find(cell => cell.id === path.targetCellId);
            if (targetCell) {
              setUnits(prevUnits => [
                ...prevUnits,
                {
                  id: generateId(),
                  owner: path.owner,
                  position: { x: sourceCell.x, y: sourceCell.y },
                  targetCellId: targetCell.id,
                  progress: 0
                }
              ]);
            }
          }
          
          return path;
        });
      });
      
      // Update unit positions and handle cell captures
      setUnits(prevUnits => {
        const updatedUnits: UnitData[] = [];
        
        for (const unit of prevUnits) {
          const targetCell = cells.find(cell => cell.id === unit.targetCellId);
          if (!targetCell) continue;
          
          const sourceCell = cells.find(cell => {
            return paths.some(path => 
              path.targetCellId === targetCell.id && 
              path.sourceCellId === cell.id
            );
          });
          
          if (!sourceCell) continue;
          
          // Update unit progress
          const newProgress = unit.progress + 0.01;
          
          if (newProgress >= 1) {
            // Unit reached the target cell
            setCells(prevCells => {
              return prevCells.map(cell => {
                if (cell.id === targetCell.id) {
                  let newUnits = cell.units;
                  let newOwner = cell.owner;
                  
                  if (cell.owner === unit.owner) {
                    // Add unit to friendly cell
                    newUnits += 1;
                  } else {
                    // Attack enemy or neutral cell
                    newUnits -= 1;
                    
                    // Cell captured
                    if (newUnits <= 0) {
                      newUnits = 1;
                      newOwner = unit.owner;
                    }
                  }
                  
                  return {
                    ...cell,
                    units: newUnits,
                    owner: newOwner
                  };
                }
                return cell;
              });
            });
          } else {
            // Interpolate position
            const newX = sourceCell.x + (targetCell.x - sourceCell.x) * newProgress;
            const newY = sourceCell.y + (targetCell.y - sourceCell.y) * newProgress;
            
            updatedUnits.push({
              ...unit,
              position: { x: newX, y: newY },
              progress: newProgress
            });
          }
        }
        
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
          // Create new path
          setPaths(prevPaths => [
            ...prevPaths,
            {
              id: generateId(),
              sourceCellId: selectedCellId,
              targetCellId: cellId,
              unitTransferRate: 1,
              owner: 'player'
            }
          ]);
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
  const restartGame = useCallback(() => {
    setCells(createInitialCells(initialCellCount));
    setPaths([]);
    setUnits([]);
    setSelectedCellId(null);
    setGameOver(false);
    setWinner(null);
  }, [initialCellCount]);
  
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
            // Create new enemy path
            setPaths(prevPaths => [
              ...prevPaths,
              {
                id: generateId(),
                sourceCellId: enemyCell.id,
                targetCellId: targetCell.id,
                unitTransferRate: 1,
                owner: 'enemy'
              }
            ]);
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
    restartGame
  };
};