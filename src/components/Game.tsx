import React, { useEffect, useCallback, useState } from 'react';
import Cell from './Cell';
import Path from './Path';
import Unit from './Unit';
import GameStatus from './GameStatus';
import MapSelection from './MapSelection';
import VisualEffects from './VisualEffects';
import { useGameLogic } from '../hooks/useGameLogic';

// Main Game component
const Game: React.FC = () => {
  // Use the game logic hook directly
  const {
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
    availableMaps
  } = useGameLogic(10); // Start with 10 cells
  
  // Track visual effects locally
  const [visualEffects, setVisualEffects] = useState<any[]>([]);
  
  // Create unit trails without DOM manipulation
  const handleCreateTrail = useCallback((x: number, y: number, owner: 'player' | 'enemy' | 'neutral', size: number) => {
    // Add a trail effect to the visualEffects state
    const newEffect = {
      id: Math.random().toString(36).substring(2, 9),
      type: 'unit_trail' as const,
      position: { x, y },
      owner,
      createdAt: Date.now(),
      duration: 1000
    };
    
    // This will be handled by the visualEffects component
    setCustomEffects(prev => [...prev, newEffect]);
  }, []);
  
  // Local state for component-specific effects
  const [customEffects, setCustomEffects] = useState<any[]>([]);
  
  // Clean up expired custom effects
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setCustomEffects(prev => prev.filter(effect => {
        const expirationTime = effect.createdAt + effect.duration;
        return expirationTime > now;
      }));
    }, 1000);
    
    return () => clearInterval(cleanupInterval);
  }, []);
  
  // Handle selecting a random map
  const handlePlayRandom = useCallback(() => {
    restartGame(undefined); // Pass undefined to use random map
  }, [restartGame]);
  
  // Handle selecting a specific map
  const handleSelectMap = useCallback((mapId: string) => {
    changeMap(mapId);
  }, [changeMap]);
  
  return (
    <div className="game-container">
      {/* Render cells */}
      {cells.map(cell => (
        <Cell
          key={cell.id}
          cell={cell}
          isSelected={cell.id === selectedCellId}
          onClick={handleCellClick}
        />
      ))}
      
      {/* Render paths */}
      {paths.map(path => (
        <Path
          key={path.id}
          path={path}
          cells={cells}
        />
      ))}
      
      {/* Render units */}
      {units.map(unit => (
        <Unit
          key={unit.id}
          unit={unit}
          onCreateTrail={handleCreateTrail}
        />
      ))}
      
      {/* Render game status */}
      <GameStatus
        gameOver={gameOver}
        winner={winner}
        onRestart={restartGame}
      />
      
      {/* Map selection component */}
      <div style={{ 
        position: 'absolute', 
        top: '20px', 
        right: '20px',
        zIndex: 20
      }}>
        <MapSelection
          availableMaps={availableMaps}
          currentMapId={currentMapId}
          onSelectMap={handleSelectMap}
          onPlayRandom={handlePlayRandom}
        />
      </div>
      
      {/* Game instructions */}
      <div className="game-instructions">
        <h3>Special Cell Types</h3>
        <p><span className="special-indicator">⚙️</span> Factory: Produces units faster</p>
        <p><span className="special-indicator">🛡️</span> Fortress: Stronger defense</p>
        <p><span className="special-indicator">🌀</span> Teleporter: Instantly transport units</p>
      </div>
      
      {/* Render component-specific effects */}
      <VisualEffects effects={customEffects} />
    </div>
  );
};

export default Game;