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
  
  // Determine path type - straight or curved
  const pathType = path.pathType || 'straight';
  
  // Get path strength visualization class
  const strengthClass = path.pathStrength || 'medium';
  
  // Calculate distance and angle
  const dx = targetCell.x - sourceCell.x;
  const dy = targetCell.y - sourceCell.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  
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
  
  // For curved paths, we need to calculate control points for bezier curve
  let pathElement;
  
  if (pathType === 'curved') {
    // Calculate a curved SVG path
    const midX = (sourceCell.x + targetCell.x) / 2;
    const midY = (sourceCell.y + targetCell.y) / 2;
    
    // Calculate perpendicular offset for control point
    const perpX = -dy * 0.3; // Offset perpendicular to direction
    const perpY = dx * 0.3;
    
    // Control point is midpoint with perpendicular offset
    const ctrlX = midX + perpX;
    const ctrlY = midY + perpY;
    
    const pathString = `M${sourceCell.x},${sourceCell.y} Q${ctrlX},${ctrlY} ${targetCell.x},${targetCell.y}`;
    
    pathElement = (
      <svg className="path-svg" style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: -1
      }}>
        <path 
          d={pathString} 
          className={`path ${path.owner} ${strengthClass} ${isActive ? 'active' : ''}`}
          fill="none"
          strokeDasharray={strengthClass === 'weak' ? '5,5' : undefined}
          strokeWidth={
            strengthClass === 'strong' ? 8 : 
            strengthClass === 'medium' ? 6 : 4
          }
        />
        
        {/* Flow markers - small circles along the path */}
        {Array.from({ length: 3 }).map((_, i) => (
          <circle 
            key={i}
            className={`path-marker ${path.owner}`}
            r={4}
            style={{
              animation: `flow-along-path 3s infinite linear ${i * 0.8}s`,
              opacity: isActive ? 1 : 0.5
            }}
          >
            <animateMotion
              dur="3s" 
              repeatCount="indefinite" 
              path={pathString}
            />
          </circle>
        ))}
      </svg>
    );
  } else {
    // Straight path with div element
    pathElement = (
      <div
        className={`path ${path.owner} ${strengthClass} ${isActive ? 'active' : ''}`}
        style={{
          left: `${sourceCell.x}px`,
          top: `${sourceCell.y}px`,
          width: `${distance}px`,
          transform: `rotate(${angle}deg)`,
          height: strengthClass === 'strong' ? '8px' : 
                 strengthClass === 'medium' ? '6px' : '4px',
          opacity: isActive ? 1 : 0.7,
          transition: 'all 0.3s ease',
          boxShadow: isActive ? `0 0 8px 2px rgba(${path.owner === 'player' ? '76, 175, 80' : '244, 67, 54'}, 0.7)` : undefined
        }}
      >
        {/* Add flow animation using pseudo-elements in CSS */}
        {isActive && (
          <div 
            className="path-pulse" 
            style={{
              animation: `pulse-along 1s ease-out`
            }} 
            key={pulseCount} // Force re-animation on new unit sent
          />
        )}
      </div>
    );
  }
  
  return pathElement;
};

export default Path;