import React, { useEffect, useCallback, useState, useRef } from 'react';
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
  
  // Panning/dragging state
  const [isPanning, setIsPanning] = useState(false);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [startPanPosition, setStartPanPosition] = useState({ x: 0, y: 0 });
  const [startMousePosition, setStartMousePosition] = useState({ x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState(1); // Default zoom (no zoom)
  const gameContainerRef = useRef<HTMLDivElement>(null);
  
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
  
  // Panning/dragging event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only enable panning with middle mouse button or right click
    if (e.button === 1 || e.button === 2) {
      e.preventDefault(); // Prevent default behavior for right click
      setIsPanning(true);
      setStartMousePosition({ x: e.clientX, y: e.clientY });
      setStartPanPosition({ ...panPosition });
      
      // Change cursor
      if (gameContainerRef.current) {
        gameContainerRef.current.style.cursor = 'grabbing';
      }
    }
  }, [panPosition]);
  
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning) {
      const dx = e.clientX - startMousePosition.x;
      const dy = e.clientY - startMousePosition.y;
      
      setPanPosition({
        x: startPanPosition.x + dx,
        y: startPanPosition.y + dy
      });
    }
  }, [isPanning, startMousePosition, startPanPosition]);
  
  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      
      // Restore cursor
      if (gameContainerRef.current) {
        gameContainerRef.current.style.cursor = 'default';
      }
    }
  }, [isPanning]);
  
  // Also handle mouse leaving the container
  const handleMouseLeave = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      
      // Restore cursor
      if (gameContainerRef.current) {
        gameContainerRef.current.style.cursor = 'default';
      }
    }
  }, [isPanning]);
  
  // Prevent context menu on right-click
  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    return false;
  }, []);
  
  // Handle mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    // Determine zoom direction
    const delta = -Math.sign(e.deltaY) * 0.1;
    const newZoomLevel = Math.max(0.5, Math.min(2, zoomLevel + delta));
    
    // Update zoom level
    setZoomLevel(newZoomLevel);
    
    // Calculate position adjustment to zoom toward cursor
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Scale is changing by factor of newZoomLevel/zoomLevel
    // Adjust pan position to keep point under cursor fixed
    const zoomRatio = newZoomLevel / zoomLevel;
    const panAdjustX = (mouseX - panPosition.x) * (1 - zoomRatio);
    const panAdjustY = (mouseY - panPosition.y) * (1 - zoomRatio);
    
    setPanPosition({
      x: panPosition.x + panAdjustX,
      y: panPosition.y + panAdjustY
    });
  }, [zoomLevel, panPosition]);
  
  // Add keyboard controls for panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const panStep = 50; // How many pixels to pan with each key press
      
      switch (e.key) {
        case 'ArrowUp':
          setPanPosition(prev => ({ ...prev, y: prev.y + panStep }));
          break;
        case 'ArrowDown':
          setPanPosition(prev => ({ ...prev, y: prev.y - panStep }));
          break;
        case 'ArrowLeft':
          setPanPosition(prev => ({ ...prev, x: prev.x + panStep }));
          break;
        case 'ArrowRight':
          setPanPosition(prev => ({ ...prev, x: prev.x - panStep }));
          break;
        case 'Home':  // Reset panning to center
          setPanPosition({ x: 0, y: 0 });
          setZoomLevel(1); // Reset zoom as well
          break;
        case '+':
        case '=': // Common keyboard shortcut for zoom in
          setZoomLevel(prev => Math.min(2, prev + 0.1));
          break;
        case '-':
        case '_': // Common keyboard shortcut for zoom out
          setZoomLevel(prev => Math.max(0.5, prev - 0.1));
          break;
        case '0': // Reset zoom
          setZoomLevel(1);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  return (
    <div 
      className="game-container" 
      ref={gameContainerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onContextMenu={handleContextMenu}
      onWheel={handleWheel}
    >
      {/* Draggable and zoomable game map container */}
      <div 
        className="game-map" 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel})`,
          transformOrigin: 'center center',
          transition: isPanning ? 'none' : 'transform 0.1s ease',
          cursor: isPanning ? 'grabbing' : 'default'
        }}
      >
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
        
        {/* Render component-specific effects */}
        <VisualEffects effects={customEffects} />
      </div>
      
      {/* UI elements that stay fixed (don't move with panning) */}
      <div className="game-ui" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        {/* Render game status */}
        <div style={{ pointerEvents: 'auto' }}>
          <GameStatus
            gameOver={gameOver}
            winner={winner}
            onRestart={restartGame}
          />
        </div>
        
        {/* Map selection component */}
        <div style={{ 
          position: 'absolute', 
          top: '20px', 
          right: '20px',
          zIndex: 20,
          pointerEvents: 'auto'
        }}>
          <MapSelection
            availableMaps={availableMaps}
            currentMapId={currentMapId}
            onSelectMap={handleSelectMap}
            onPlayRandom={handlePlayRandom}
          />
        </div>
        
        {/* Game instructions */}
        <div className="game-instructions" style={{ pointerEvents: 'auto' }}>
          <h3>Special Cell Types</h3>
          <p><span className="special-indicator">⚙️</span> Factory: Produces units faster</p>
          <p><span className="special-indicator">🛡️</span> Fortress: Stronger defense</p>
          <p><span className="special-indicator">🌀</span> Teleporter: Instantly transport units</p>
          <div style={{ marginTop: '10px', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '5px' }}>
            <p><strong>Map Navigation:</strong></p>
            <p>- Right-click + drag to pan the map</p>
            <p>- Mouse wheel to zoom in/out</p>
            <p>- Arrow keys to pan, +/- to zoom</p>
            <p>- Press Home to reset view</p>
          </div>
        </div>
      </div>
      
      {/* Visual indicators for panning and zoom */}
      {isPanning && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '5px 10px',
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          Panning Map...
        </div>
      )}
      
      {/* Zoom level indicator */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        border: '1px solid rgba(0, 0, 0, 0.2)',
        padding: '5px 10px',
        borderRadius: '4px',
        fontSize: '12px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}>
        Zoom: {Math.round(zoomLevel * 100)}%
      </div>
    </div>
  );
};

export default Game;