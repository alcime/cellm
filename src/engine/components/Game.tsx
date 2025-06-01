import React, { useEffect, useState, useCallback } from 'react';
import { GameEngine } from '../GameEngine';
import { GameState, GameConfig, Cell as CellType, CellType as CellTypeData } from '../types';
import { StrategyType } from '../AIStrategyManager';
import { Cell } from './Cell';
import { Unit } from './Unit';
import { Path } from './Path';
import { BattleVisualization } from './BattleVisualization';
import { AIStrategySelector } from './AIStrategySelector';
import { GameSetup } from '../../components/GameSetup';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Play, Pause, Square, RotateCcw, Settings, Info, Zap, HelpCircle } from 'lucide-react';

interface GameProps {
  config?: Partial<GameConfig>;
}

export const Game: React.FC<GameProps> = ({ config = {} }) => {
  const [gameEngine] = useState(() => {
    const defaultConfig: GameConfig = {
      mapSize: { width: 1200, height: 800 },
      cellTypes: createDefaultCellTypes(),
      unitSpeed: 0.5, // Base movement speed (slower for smoother animation)
      productionInterval: 3, // seconds
      battleDuration: 4, // Base duration, but calculated dynamically
      ...config
    };
    return new GameEngine(defaultConfig);
  });

  const [gameState, setGameState] = useState<GameState>(gameEngine.getState());
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [showStrategySelector, setShowStrategySelector] = useState(false);
  const [currentStrategy, setCurrentStrategy] = useState<StrategyType>('simple');
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [autoPlaySpeed, setAutoPlaySpeed] = useState(1.0);
  const [gameStarted, setGameStarted] = useState(false);
  const [showSetup, setShowSetup] = useState(true);
  const [showGameInfo, setShowGameInfo] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showRangeIndicator, setShowRangeIndicator] = useState<string | null>(null);

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

  // Initialize game but don't start automatically
  useEffect(() => {
    const cells = createInitialCells();
    gameEngine.setCells(cells);

    return () => {
      gameEngine.stop();
    };
  }, [gameEngine]);

  // Auto-play effect
  useEffect(() => {
    if (!isAutoPlaying || !gameStarted || gameState.winner) {
      return;
    }

    const interval = setInterval(() => {
      // Have the AI make decisions for the player too
      gameEngine.aiMakeDecisions();
    }, Math.max(500, 2000 / autoPlaySpeed)); // Minimum 500ms between decisions

    return () => clearInterval(interval);
  }, [isAutoPlaying, gameStarted, gameState.winner, autoPlaySpeed, gameEngine]);

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
      setShowRangeIndicator(null);
    } else {
      // Select cell and show range indicator
      const cell = gameState.cells.find(c => c.id === cellId);
      if (cell && cell.owner === 'player') {
        setSelectedCellId(cellId);
        setShowRangeIndicator(cellId);
      } else {
        // Clicked on non-player cell, show its range anyway
        setShowRangeIndicator(cellId);
        // Clear range indicator after 2 seconds
        setTimeout(() => setShowRangeIndicator(null), 2000);
      }
    }

    gameEngine.clickCell(cellId);
  }, [selectedCellId, gameState.cells, gameEngine]);

  const handleStart = () => {
    if (!gameStarted) {
      gameEngine.start();
      setGameStarted(true);
      setShowSetup(false);
    }
  };

  const handleStop = () => {
    gameEngine.stop();
    gameEngine.removeAIPlayer('player'); // Clean up player AI
    setGameStarted(false);
    setIsAutoPlaying(false);
  };

  const handleRestart = () => {
    gameEngine.stop();
    gameEngine.removeAIPlayer('player'); // Clean up player AI
    const cells = createInitialCells();
    gameEngine.setCells(cells);
    setSelectedCellId(null);
    setGameStarted(false);
    setIsAutoPlaying(false);
    setShowSetup(true);
  };

  const toggleAutoPlay = () => {
    if (!gameStarted) {
      handleStart();
    }
    
    if (!isAutoPlaying) {
      // Enable auto-play: add player as AI
      gameEngine.addAIPlayer({ playerId: 'player', strategyType: currentStrategy });
    } else {
      // Disable auto-play: remove player from AI
      gameEngine.removeAIPlayer('player');
    }
    
    setIsAutoPlaying(!isAutoPlaying);
  };

  const handleStrategyChange = (newStrategy: StrategyType) => {
    setCurrentStrategy(newStrategy);
    gameEngine.switchAIStrategy('enemy', newStrategy);
    console.log(`Switched AI to ${newStrategy} strategy`);
  };

  // Handle clicks on empty space to deselect cells (always define this hook)
  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    // Only deselect if clicking on the background itself (not child elements)
    if (e.target === e.currentTarget) {
      setSelectedCellId(null);
      setShowRangeIndicator(null);
    }
  }, []);

  const availableStrategies = [
    { type: 'simple' as StrategyType, name: 'Simple', description: 'Balanced approach with standard aggression' },
    { type: 'aggressive' as StrategyType, name: 'Aggressive', description: 'High aggression, rapid attacks' },
    { type: 'defensive' as StrategyType, name: 'Defensive', description: 'Conservative, defense-focused' },
    { type: 'economic' as StrategyType, name: 'Economic', description: 'Growth and high-value territories' },
    { type: 'swarm' as StrategyType, name: 'Swarm', description: 'Coordinated multi-unit attacks' }
  ];

  // Show setup screen if not started
  if (showSetup) {
    return (
      <GameSetup
        currentStrategy={currentStrategy}
        onStrategyChange={handleStrategyChange}
        onStartGame={handleStart}
        availableStrategies={availableStrategies}
      />
    );
  }

  return (
    <div 
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        backgroundColor: '#f0f0f0',
        overflow: 'hidden'
      }}
      onClick={handleBackgroundClick}
    >
      {/* Compact Floating Toolbar */}
      <div className="absolute top-4 left-4 z-50 flex items-center gap-2">
        {/* Main Controls */}
        <div className="flex items-center bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border">
          {!gameStarted ? (
            <Button onClick={handleStart} size="sm" className="rounded-r-none">
              <Play className="h-4 w-4" />
            </Button>
          ) : (
            <Button 
              onClick={toggleAutoPlay} 
              size="sm"
              variant={isAutoPlaying ? "destructive" : "default"}
              className="rounded-r-none"
            >
              {isAutoPlaying ? <Pause className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
            </Button>
          )}
          
          {gameStarted && (
            <Button onClick={handleStop} size="sm" variant="secondary" className="rounded-none border-l">
              <Square className="h-4 w-4" />
            </Button>
          )}
          
          <Button onClick={handleRestart} size="sm" variant="outline" className="rounded-none border-l">
            <RotateCcw className="h-4 w-4" />
          </Button>
          
          <Button 
            onClick={() => setShowGameInfo(!showGameInfo)} 
            size="sm" 
            variant="ghost"
            className="rounded-l-none border-l"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>

        {/* Speed Control (when auto-playing) */}
        {isAutoPlaying && (
          <div className="flex items-center bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border px-3 py-2">
            <span className="text-xs font-medium mr-2">{autoPlaySpeed.toFixed(1)}x</span>
            <input
              type="range"
              min="0.5"
              max="5"
              step="0.5"
              value={autoPlaySpeed}
              onChange={(e) => setAutoPlaySpeed(parseFloat(e.target.value))}
              className="w-16 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        )}

        {/* Winner Badge */}
        {gameState.winner && (
          <div className="bg-green-500 text-white px-3 py-2 rounded-lg shadow-lg font-medium text-sm">
            🏆 {gameState.winner} wins!
          </div>
        )}
      </div>

      {/* Expandable Game Info Panel */}
      {showGameInfo && (
        <Card className="absolute top-16 left-4 z-40 bg-white/95 backdrop-blur-sm w-48">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              Game Info
              <Button 
                onClick={() => setShowGameInfo(false)} 
                size="sm" 
                variant="ghost" 
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div><strong>Turn:</strong> {gameState.turn}</div>
            <div><strong>Phase:</strong> {gameState.gamePhase}</div>
            <div><strong>Status:</strong> {gameStarted ? (isAutoPlaying ? 'Auto-Playing' : 'Manual') : 'Stopped'}</div>
            <div><strong>Strategy:</strong> {currentStrategy}</div>
            <Button 
              onClick={() => setShowStrategySelector(!showStrategySelector)} 
              size="sm"
              variant="outline"
              className="w-full mt-2"
            >
              <Settings className="h-3 w-3 mr-1" />
              Change AI
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Compact Help Button */}
      <div className="absolute top-4 right-4 z-50">
        <Button 
          onClick={() => setShowInstructions(!showInstructions)} 
          size="sm" 
          variant="outline"
          className="bg-white/90 backdrop-blur-sm"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </div>

      {/* Expandable Instructions Panel */}
      {showInstructions && (
        <Card className="absolute top-16 right-4 z-40 bg-white/95 backdrop-blur-sm max-w-[220px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              Instructions
              <Button 
                onClick={() => setShowInstructions(false)} 
                size="sm" 
                variant="ghost" 
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <p>Click your green cells, then click target to send 60% of units</p>
            <div className="space-y-1">
              <p>⚙️ = Factory (2x production)</p>
              <p>🛡️ = Fortress (1.5x defense)</p>
            </div>
            <p className="text-xs text-gray-600 pt-1 border-t">
              Battle Duration: 4s (2x advantage) to 10s (balanced)
            </p>
          </CardContent>
        </Card>
      )}

      {/* AI Strategy Selector */}
      {showStrategySelector && (
        <>
          {/* Backdrop to catch clicks outside */}
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 199
            }}
            onClick={() => setShowStrategySelector(false)}
          />
          <div style={{
            position: 'absolute',
            top: 200,
            left: 20,
            zIndex: 200
          }}>
            <AIStrategySelector
              currentStrategy={currentStrategy}
              onStrategyChange={handleStrategyChange}
              availableStrategies={gameEngine.listAvailableStrategies()}
              disabled={gameState.gamePhase !== 'playing'}
            />
          </div>
        </>
      )}

      {/* Paths */}
      {gameState.paths.map(path => (
        <Path key={path.id} path={path} cells={gameState.cells} />
      ))}

      {/* Range Indicator */}
      {showRangeIndicator && (() => {
        const cell = gameState.cells.find(c => c.id === showRangeIndicator);
        if (!cell) return null;
        
        return (
          <div
            style={{
              position: 'absolute',
              left: cell.position.x - 180, // neighborRange radius
              top: cell.position.y - 180,
              width: 360, // neighborRange diameter
              height: 360,
              border: '2px dashed rgba(59, 130, 246, 0.6)',
              borderRadius: '50%',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              pointerEvents: 'none',
              zIndex: 5
            }}
          />
        );
      })()}

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
    }
  ];
}

function createInitialCells(): CellType[] {
  const cellTypes = createDefaultCellTypes();
  const [standard, factory, fortress] = cellTypes;
  const cells: CellType[] = [];

  // Range is 180px, so cells need to be within that distance to be neighbors
  
  // ======= PLAYER STARTING CLUSTER (Left side) =======
  // Player home base
  cells.push({
    id: generateId(),
    position: { x: 120, y: 300 },
    units: 15,
    owner: 'player',
    type: standard
  });
  
  // Player forward positions (within 180px range)
  cells.push({
    id: generateId(),
    position: { x: 280, y: 250 }, // 160px from home base
    units: 8,
    owner: 'player',
    type: standard
  });
  
  cells.push({
    id: generateId(),
    position: { x: 280, y: 350 }, // 160px from home base
    units: 8,
    owner: 'player',
    type: standard
  });

  // ======= ENEMY STARTING CLUSTER (Right side) =======
  // Enemy home base
  cells.push({
    id: generateId(),
    position: { x: 1080, y: 300 },
    units: 15,
    owner: 'enemy',
    type: standard
  });
  
  // Enemy forward positions (within 180px range)
  cells.push({
    id: generateId(),
    position: { x: 920, y: 250 }, // 160px from enemy base
    units: 8,
    owner: 'enemy',
    type: standard
  });
  
  cells.push({
    id: generateId(),
    position: { x: 920, y: 350 }, // 160px from enemy base
    units: 8,
    owner: 'enemy',
    type: standard
  });

  // ======= NEUTRAL EXPANSION CHAIN (Center corridor) =======
  // This creates a connected path through the center
  
  // Left expansion targets (reachable from player forward positions)
  cells.push({
    id: generateId(),
    position: { x: 420, y: 200 }, // 140px from player forward
    units: 3,
    owner: 'neutral',
    type: factory
  });
  
  cells.push({
    id: generateId(),
    position: { x: 420, y: 400 }, // 140px from player forward
    units: 4,
    owner: 'neutral',
    type: standard
  });

  // Intermediate stepping stones (connect expansion to center)
  cells.push({
    id: generateId(),
    position: { x: 520, y: 250 }, // 100px from left expansion, 141px from center
    units: 5,
    owner: 'neutral',
    type: standard
  });
  
  cells.push({
    id: generateId(),
    position: { x: 520, y: 350 }, // 100px from left expansion, 141px from center
    units: 4,
    owner: 'neutral',
    type: standard
  });

  // Center strategic positions
  cells.push({
    id: generateId(),
    position: { x: 600, y: 300 }, // Central fortress
    units: 12,
    owner: 'neutral',
    type: fortress
  });
  
  cells.push({
    id: generateId(),
    position: { x: 600, y: 150 }, // 150px from center
    units: 6,
    owner: 'neutral',
    type: standard
  });
  
  cells.push({
    id: generateId(),
    position: { x: 600, y: 450 }, // 150px from center
    units: 5,
    owner: 'neutral',
    type: standard
  });

  // Right intermediate stepping stones (mirror left side)
  cells.push({
    id: generateId(),
    position: { x: 680, y: 250 }, // 100px from right expansion, 141px from center
    units: 4,
    owner: 'neutral',
    type: standard
  });
  
  cells.push({
    id: generateId(),
    position: { x: 680, y: 350 }, // 100px from right expansion, 141px from center
    units: 5,
    owner: 'neutral',
    type: standard
  });

  // Right expansion targets (reachable from enemy forward positions)
  cells.push({
    id: generateId(),
    position: { x: 780, y: 200 }, // 140px from enemy forward
    units: 4,
    owner: 'neutral',
    type: standard
  });
  
  cells.push({
    id: generateId(),
    position: { x: 780, y: 400 }, // 140px from enemy forward
    units: 3,
    owner: 'neutral',
    type: factory
  });

  // ======= FLANKING OPPORTUNITIES =======
  // Northern route
  cells.push({
    id: generateId(),
    position: { x: 400, y: 80 },
    units: 2,
    owner: 'neutral',
    type: standard
  });
  
  cells.push({
    id: generateId(),
    position: { x: 600, y: 80 }, // 200px from northern, but connects via 600,150
    units: 1,
    owner: 'neutral',
    type: factory
  });
  
  cells.push({
    id: generateId(),
    position: { x: 800, y: 80 },
    units: 2,
    owner: 'neutral',
    type: standard
  });

  // Southern route
  cells.push({
    id: generateId(),
    position: { x: 400, y: 520 },
    units: 2,
    owner: 'neutral',
    type: standard
  });
  
  cells.push({
    id: generateId(),
    position: { x: 600, y: 520 }, // 70px from 600,450
    units: 1,
    owner: 'neutral',
    type: factory
  });
  
  cells.push({
    id: generateId(),
    position: { x: 800, y: 520 },
    units: 2,
    owner: 'neutral',
    type: standard
  });

  // ======= RESOURCE PRIZES (High value, well defended) =======
  // Northern factory cluster
  cells.push({
    id: generateId(),
    position: { x: 300, y: 120 }, // Links northern route to player side
    units: 6,
    owner: 'neutral',
    type: factory
  });
  
  // Southern factory cluster  
  cells.push({
    id: generateId(),
    position: { x: 900, y: 480 }, // Links southern route to enemy side
    units: 6,
    owner: 'neutral',
    type: factory
  });

  return cells;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}