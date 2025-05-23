import React, { useState, useEffect, useMemo } from 'react';
import { PathData, CellData } from '../types';

interface PathProps {
  path: PathData;
  cells: CellData[];
}

// Cell radius in pixels (30px radius since cell width/height is 60px)
const CELL_RADIUS = 30;

const Path: React.FC<PathProps> = ({ path, cells }) => {
  const [isActive, setIsActive] = useState(false);
  const [pulseCount, setPulseCount] = useState(0);
  
  const sourceCell = cells.find(cell => cell.id === path.sourceCellId);
  const targetCell = cells.find(cell => cell.id === path.targetCellId);
  
  if (!sourceCell || !targetCell) {
    return null;
  }
  
  // Removed debug logging
  
  // Calculate path geometry with proper cell edge connections
  const pathGeometry = useMemo(() => {
    // Cell centers (cells use left/top positioning with translate(-50%, -50%))
    // So the actual center is at the left/top values
    const sourceCenterX = sourceCell.x;
    const sourceCenterY = sourceCell.y;
    const targetCenterX = targetCell.x;
    const targetCenterY = targetCell.y;
    
    // Calculate direction vector
    const dx = targetCenterX - sourceCenterX;
    const dy = targetCenterY - sourceCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Avoid division by zero for cells at same position
    if (distance === 0) {
      return null;
    }
    
    // Normalize direction vector
    const dirX = dx / distance;
    const dirY = dy / distance;
    
    // Calculate connection points on cell circumferences
    const sourceConnectX = sourceCenterX + dirX * CELL_RADIUS;
    const sourceConnectY = sourceCenterY + dirY * CELL_RADIUS;
    const targetConnectX = targetCenterX - dirX * CELL_RADIUS;
    const targetConnectY = targetCenterY - dirY * CELL_RADIUS;
    
    // Determine path type
    const pathType = path.pathType || 'straight';
    
    if (pathType === 'curved') {
      // Calculate control point for bezier curve
      const midX = (sourceConnectX + targetConnectX) / 2;
      const midY = (sourceConnectY + targetConnectY) / 2;
      
      // Create perpendicular offset for curve
      const perpX = -dirY * distance * 0.2; // Perpendicular to direction
      const perpY = dirX * distance * 0.2;
      
      const ctrlX = midX + perpX;
      const ctrlY = midY + perpY;
      
      return {
        type: 'curved' as const,
        pathString: `M${sourceConnectX},${sourceConnectY} Q${ctrlX},${ctrlY} ${targetConnectX},${targetConnectY}`,
        sourcePoint: { x: sourceConnectX, y: sourceConnectY },
        targetPoint: { x: targetConnectX, y: targetConnectY },
        controlPoint: { x: ctrlX, y: ctrlY }
      };
    } else {
      return {
        type: 'straight' as const,
        pathString: `M${sourceConnectX},${sourceConnectY} L${targetConnectX},${targetConnectY}`,
        sourcePoint: { x: sourceConnectX, y: sourceConnectY },
        targetPoint: { x: targetConnectX, y: targetConnectY }
      };
    }
  }, [sourceCell.x, sourceCell.y, targetCell.x, targetCell.y, path.pathType]);
  
  // Get path strength visualization class
  const strengthClass = path.pathStrength || 'medium';
  
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
  
  // Return null if path geometry couldn't be calculated
  if (!pathGeometry) {
    return null;
  }
  
  // Calculate simple line properties
  const dx = targetCell.x - sourceCell.x;
  const dy = targetCell.y - sourceCell.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  
  return (
    <>
      {/* Simple CSS line */}
      <div
        style={{
          position: 'absolute',
          left: `${sourceCell.x}px`,
          top: `${sourceCell.y}px`,
          width: `${distance}px`,
          height: '4px',
          backgroundColor: path.owner === 'player' ? 'rgba(76, 175, 80, 0.8)' : 'rgba(244, 67, 54, 0.8)',
          transform: `rotate(${angle}deg)`,
          transformOrigin: '0 50%',
          pointerEvents: 'none',
          zIndex: 1,
          borderRadius: '2px',
          opacity: isActive ? 1 : 0.7
        }}
      />
      
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