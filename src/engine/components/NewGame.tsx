import React, { useEffect, useState, useCallback } from 'react';
import { GameEngine } from '../GameEngine';
import { GameState, GameConfig, Cell, CellType } from '../types';
import { NewCell } from './NewCell';
import { NewUnit } from './NewUnit';
import { NewPath } from './NewPath';

interface NewGameProps {
  config?: Partial<GameConfig>;
}

export const NewGame: React.FC<NewGameProps> = ({ config = {} }) => {
  const [gameEngine] = useState(() => {
    const defaultConfig: GameConfig = {
      mapSize: { width: 1200, height: 800 },
      cellTypes: createDefaultCellTypes(),
      unitSpeed: 0.8, // units per second
      productionInterval: 3, // seconds
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

    return () => {
      gameEngine.off('state_changed', handleStateChange);
      gameEngine.off('cell_captured', handleStateChange);
      gameEngine.off('units_arrived', handleStateChange);
      gameEngine.off('production_cycle', handleStateChange);
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
          ⚙️ = Factory (faster production)<br/>
          🛡️ = Fortress (stronger defense)<br/>
          🌀 = Teleporter (instant transport)
        </p>
      </div>

      {/* Paths */}
      {gameState.paths.map(path => (
        <NewPath key={path.id} path={path} cells={gameState.cells} />
      ))}

      {/* Cells */}
      {gameState.cells.map(cell => (
        <NewCell
          key={cell.id}
          cell={cell}
          isSelected={cell.id === selectedCellId}
          onClick={handleCellClick}
        />
      ))}

      {/* Units */}
      {gameState.units.map(unit => (
        <NewUnit key={unit.id} unit={unit} />
      ))}
    </div>
  );
};

// Helper functions
function createDefaultCellTypes(): CellType[] {
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

function createInitialCells(gameEngine: GameEngine): Cell[] {
  const cellTypes = createDefaultCellTypes();
  const cells: Cell[] = [];

  // Create player starting cell
  cells.push({
    id: generateId(),
    position: { x: 200, y: 400 },
    units: 10,
    owner: 'player',
    type: cellTypes[0] // standard
  });

  // Create enemy starting cell
  cells.push({
    id: generateId(),
    position: { x: 1000, y: 400 },
    units: 15,
    owner: 'enemy',
    type: cellTypes[0] // standard
  });

  // Create neutral cells with different types
  for (let i = 0; i < 8; i++) {
    const typeIndex = Math.floor(Math.random() * cellTypes.length);
    const x = 300 + Math.random() * 600;
    const y = 150 + Math.random() * 500;

    // Ensure cells aren't too close together
    const tooClose = cells.some(cell => 
      gameEngine.distance(cell.position, { x, y }) < 120
    );

    if (!tooClose) {
      cells.push({
        id: generateId(),
        position: { x, y },
        units: Math.floor(Math.random() * 5) + 1,
        owner: 'neutral',
        type: cellTypes[typeIndex]
      });
    }
  }

  return cells;
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}