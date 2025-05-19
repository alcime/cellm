import React, { useEffect, useCallback, useState } from 'react';
import Cell from './Cell';
import Path from './Path';
import Unit from './Unit';
import GameStatus from './GameStatus';
import VisualEffects from './VisualEffects';
import { useGameState } from '../hooks/useGameState';

// Main Game component
const Game: React.FC = () => {
  // Use the game state hook for centralized state management
  const { 
    state, 
    initializeGame, 
    updateGame, 
    handleCellClick, 
    performAiActions,
    restartGame 
  } = useGameState(10); // Start with 10 cells
  
  // Destructure state
  const { 
    cells, 
    paths, 
    units, 
    selectedCellId, 
    gameOver, 
    winner,
    visualEffects
  } = state;
  
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
  
  // Initialize game on mount
  useEffect(() => {
    initializeGame();
  }, [initializeGame]);
  
  // Game loop
  useEffect(() => {
    if (gameOver) return;
    
    const gameInterval = setInterval(() => {
      updateGame(Date.now());
    }, 100); // 10 updates per second
    
    return () => clearInterval(gameInterval);
  }, [gameOver, updateGame]);
  
  // AI actions at regular intervals
  useEffect(() => {
    if (gameOver) return;
    
    const aiInterval = setInterval(() => {
      performAiActions();
    }, 5000); // AI makes decisions every 5 seconds
    
    return () => clearInterval(aiInterval);
  }, [gameOver, performAiActions]);
  
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
      
      {/* Render visual effects from game state */}
      <VisualEffects effects={visualEffects || []} />
      
      {/* Render component-specific effects */}
      <VisualEffects effects={customEffects} />
    </div>
  );
};

export default Game;