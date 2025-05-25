import React, { useState, useEffect } from 'react';
import { PathData, CellData } from '../types';

interface PathProps {
  path: PathData;
  cells: CellData[];
}

const Path: React.FC<PathProps> = ({ path, cells }) => {
  const [isActive, setIsActive] = useState(false);
  const [pulseCount, setPulseCount] = useState(0);
  
  const sourceCell = cells.find(cell => cell.id === path.sourceCellId);
  const targetCell = cells.find(cell => cell.id === path.targetCellId);
  
  if (!sourceCell || !targetCell) {
    return null;
  }
  
  
  // Visual effect when a unit is sent along this path
  useEffect(() => {
    if (path.active) {
      setIsActive(true);
      
      const timeout = setTimeout(() => {
        setIsActive(false);
      }, 1000); // Active visual for 1 second
      
      setPulseCount(prev => prev + 1);
      
      return () => clearTimeout(timeout);
    }
  }, [path.active, path.lastUnitSent]);
  
  // Use SVG to properly render curved or straight paths that match unit movement
  const dx = targetCell.x - sourceCell.x;
  const dy = targetCell.y - sourceCell.y;
  
  // Determine path type (same logic as unit movement)
  const pathType = path.pathType || 'straight';
  
  let pathString = '';
  if (pathType === 'curved') {
    // Use same curve calculation as unit movement
    const midX = (sourceCell.x + targetCell.x) / 2;
    const midY = (sourceCell.y + targetCell.y) / 2;
    
    // Same perpendicular offset as used in unit movement
    const perpX = -dy * 0.3;
    const perpY = dx * 0.3;
    
    const ctrlX = midX + perpX;
    const ctrlY = midY + perpY;
    
    
    pathString = `M${sourceCell.x},${sourceCell.y} Q${ctrlX},${ctrlY} ${targetCell.x},${targetCell.y}`;
  } else {
    pathString = `M${sourceCell.x},${sourceCell.y} L${targetCell.x},${targetCell.y}`;
  }
  
  return (
    <>
      {/* SVG path that matches unit movement exactly */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1
        }}
      >
        <path
          d={pathString}
          stroke={path.owner === 'player' ? 'rgba(76, 175, 80, 0.8)' : 'rgba(244, 67, 54, 0.8)'}
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          opacity={isActive ? 1 : 0.7}
        />
      </svg>
      
      {/* Connection dots */}
      <div
        style={{
          position: 'absolute',
          left: `${sourceCell.x}px`,
          top: `${sourceCell.y}px`,
          width: '8px',
          height: '8px',
          backgroundColor: path.owner === 'player' ? '#4caf50' : '#f44336',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 2
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: `${targetCell.x}px`,
          top: `${targetCell.y}px`,
          width: '8px',
          height: '8px',
          backgroundColor: path.owner === 'player' ? '#4caf50' : '#f44336',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 2
        }}
      />
    </>
  );
};

export default Path;