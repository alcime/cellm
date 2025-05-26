import React, { useEffect, useState, useCallback } from 'react';
import { GameEngine } from '../GameEngine';
import { GameState, GameConfig, Cell as CellType, CellType as CellTypeData } from '../types';
import { Cell } from './Cell';
import { Unit } from './Unit';
import { Path } from './Path';
import { BattleVisualization } from './BattleVisualization';

interface GameProps {
  config?: Partial<GameConfig>;
}

export const Game: React.FC<GameProps> = ({ config = {} }) => {
  const [gameEngine] = useState(() => {
    const defaultConfig: GameConfig = {
      mapSize: { width: 1200, height: 800 },
      cellTypes: createDefaultCellTypes(),
      unitSpeed: 0.8, // units per second
      productionInterval: 3, // seconds
      battleDuration: 4, // Base duration, but calculated dynamically
      ...config
    };
    return new GameEngine(defaultConfig);
  });

  const [gameState, setGameState] = useState<GameState>(gameEngine.getState());
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);

  // Subscribe to game state changes
  useEffect(() => {
    const handleStateChange = () => {
      setGameState(gameEngine.getState());
    };

    gameEngine.on('state_changed', handleStateChange);
    gameEngine.on('cell_captured', handleStateChange);
    gameEngine.on('units_arrived', handleStateChange);
    gameEngine.on('production_cycle', handleStateChange);
    gameEngine.on('battle_started', handleStateChange);
    gameEngine.on('battle_progress', handleStateChange);
    gameEngine.on('battle_ended', handleStateChange);

    return () => {
      gameEngine.off('state_changed', handleStateChange);
      gameEngine.off('cell_captured', handleStateChange);
      gameEngine.off('units_arrived', handleStateChange);
      gameEngine.off('production_cycle', handleStateChange);
      gameEngine.off('battle_started', handleStateChange);
      gameEngine.off('battle_progress', handleStateChange);
      gameEngine.off('battle_ended', handleStateChange);
    };
  }, [gameEngine]);

  // Initialize game
  useEffect(() => {
    const cells = createInitialCells(gameEngine);
    gameEngine.setCells(cells);
    gameEngine.start();

    return () => {
      gameEngine.stop();
    };
  }, [gameEngine]);

  // Handle cell clicks
  const handleCellClick = useCallback((cellId: string) => {
    if (selectedCellId) {
      const sourceCell = gameState.cells.find(c => c.id === selectedCellId);
      const targetCell = gameState.cells.find(c => c.id === cellId);

      if (sourceCell && sourceCell.owner === 'player' && cellId !== selectedCellId) {
        // Send units
        const unitsToSend = Math.floor(sourceCell.units * 0.6);
        if (unitsToSend > 0) {
          gameEngine.sendUnits(selectedCellId, cellId, unitsToSend);
        }
      }

      setSelectedCellId(null);
    } else {
      // Select cell if owned by player
      const cell = gameState.cells.find(c => c.id === cellId);
      if (cell && cell.owner === 'player') {
        setSelectedCellId(cellId);
      }
    }

    gameEngine.clickCell(cellId);
  }, [selectedCellId, gameState.cells, gameEngine]);

  const handleRestart = () => {
    gameEngine.stop();
    const cells = createInitialCells(gameEngine);
    gameEngine.setCells(cells);
    setSelectedCellId(null);
    gameEngine.start();
  };

  return (
    <div 
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        backgroundColor: '#f0f0f0',
        overflow: 'hidden'
      }}
    >
      {/* Game Status */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 100,
        background: 'rgba(255,255,255,0.9)',
        padding: '10px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div><strong>Turn:</strong> {gameState.turn}</div>
        <div><strong>Phase:</strong> {gameState.gamePhase}</div>
        {gameState.winner && <div><strong>Winner:</strong> {gameState.winner}</div>}
        <button onClick={handleRestart} style={{ marginTop: '10px' }}>
          Restart Game
        </button>
      </div>

      {/* Instructions */}
      <div style={{
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 100,
        background: 'rgba(255,255,255,0.9)',
        padding: '10px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        maxWidth: '200px'
      }}>
        <h4 style={{ margin: '0 0 10px 0' }}>Instructions</h4>
        <p style={{ margin: '5px 0', fontSize: '12px' }}>
          Click your green cells, then click target to send 60% of units
        </p>
        <p style={{ margin: '5px 0', fontSize: '12px' }}>
          ⚙️ = Factory (2x production)<br/>
          🛡️ = Fortress (1.5x defense)<br/>
          🌀 = Teleporter (special mechanics)
        </p>
        <p style={{ margin: '5px 0', fontSize: '11px', color: '#666' }}>
          Battle Duration: 4s (2x advantage) to 10s (balanced)
        </p>
      </div>

      {/* Paths */}
      {gameState.paths.map(path => (
        <Path key={path.id} path={path} cells={gameState.cells} />
      ))}

      {/* Cells */}
      {gameState.cells.map(cell => (
        <Cell
          key={cell.id}
          cell={cell}
          isSelected={cell.id === selectedCellId}
          onClick={handleCellClick}
        />
      ))}

      {/* Units */}
      {gameState.units.map(unit => (
        <Unit key={unit.id} unit={unit} />
      ))}

      {/* Battles */}
      {gameState.battles.map(battle => {
        const targetCell = gameState.cells.find(c => c.id === battle.cellId);
        return targetCell ? (
          <BattleVisualization key={battle.id} battle={battle} cellPosition={targetCell.position} />
        ) : null;
      })}
    </div>
  );
};

// Helper functions
function createDefaultCellTypes(): CellTypeData[] {
  return [
    {
      id: 'standard',
      name: 'Standard',
      productionMultiplier: 1,
      defenseBonus: 1
    },
    {
      id: 'factory',
      name: 'Factory',
      productionMultiplier: 2,
      defenseBonus: 1,
      special: { factory: true }
    },
    {
      id: 'fortress',
      name: 'Fortress',
      productionMultiplier: 1,
      defenseBonus: 1.5,
      special: { fortress: true }
    },
    {
      id: 'teleporter',
      name: 'Teleporter',
      productionMultiplier: 1,
      defenseBonus: 1,
      special: { teleport: true }
    }
  ];
}

function createInitialCells(gameEngine: GameEngine): CellType[] {
  const cellTypes = createDefaultCellTypes();
  const [standard, factory, fortress, teleporter] = cellTypes;
  const cells: CellType[] = [];

  // Player starting area (left side)
  cells.push({
    id: generateId(),
    position: { x: 150, y: 300 },
    units: 12,
    owner: 'player',
    type: standard
  });

  // Enemy starting area (right side)  
  cells.push({
    id: generateId(),
    position: { x: 1050, y: 300 },
    units: 12,
    owner: 'enemy',
    type: standard
  });

  // Strategic neutral cells in center area
  
  // Row 1 (top) - Mixed types for testing
  cells.push({
    id: generateId(),
    position: { x: 400, y: 150 },
    units: 3,
    owner: 'neutral',
    type: factory // Fast production
  });
  
  cells.push({
    id: generateId(),
    position: { x: 600, y: 150 },
    units: 8,
    owner: 'neutral',
    type: fortress // Strong defense
  });
  
  cells.push({
    id: generateId(),
    position: { x: 800, y: 150 },
    units: 2,
    owner: 'neutral',
    type: teleporter // Special mechanics
  });

  // Row 2 (center) - Key strategic positions
  cells.push({
    id: generateId(),
    position: { x: 350, y: 300 },
    units: 5,
    owner: 'neutral',
    type: standard
  });
  
  cells.push({
    id: generateId(),
    position: { x: 600, y: 300 },
    units: 6,
    owner: 'neutral',
    type: fortress // Central fortress
  });
  
  cells.push({
    id: generateId(),
    position: { x: 850, y: 300 },
    units: 4,
    owner: 'neutral',
    type: standard
  });

  // Row 3 (bottom) - Resource and testing cells
  cells.push({
    id: generateId(),
    position: { x: 400, y: 450 },
    units: 1,
    owner: 'neutral',
    type: factory // Easy to capture factory
  });
  
  cells.push({
    id: generateId(),
    position: { x: 600, y: 450 },
    units: 3,
    owner: 'neutral',
    type: standard
  });
  
  cells.push({
    id: generateId(),
    position: { x: 800, y: 450 },
    units: 2,
    owner: 'neutral',
    type: teleporter
  });

  // Flanking positions
  cells.push({
    id: generateId(),
    position: { x: 300, y: 500 },
    units: 4,
    owner: 'neutral',
    type: standard
  });
  
  cells.push({
    id: generateId(),
    position: { x: 900, y: 100 },
    units: 3,
    owner: 'neutral',
    type: factory
  });

  return cells;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}