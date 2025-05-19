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
  // Add debugging for path rendering
  console.log('DEBUG: PATH RENDERING');
  console.log(`  Path from ${sourceCell.id} to ${targetCell.id}`);
  console.log(`  Source position: ${sourceCell.x},${sourceCell.y}`);
  console.log(`  Target position: ${targetCell.x},${targetCell.y}`);
  
  const dx = targetCell.x - sourceCell.x;
  const dy = targetCell.y - sourceCell.y;
  console.log(`  Delta: dx=${dx}, dy=${dy}`);
  
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  console.log(`  Distance: ${distance.toFixed(2)}, Angle: ${angle.toFixed(2)} degrees`);
  
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
    
    // Ensure path starts and ends at exact cell centers
    // These coordinates have accurate transforms applied
    const pathString = `M${sourceCell.x},${sourceCell.y} Q${ctrlX},${ctrlY} ${targetCell.x},${targetCell.y}`;
    console.log(`  Curved path string: ${pathString}`);
    
    pathElement = (
      <svg className="path-svg" style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: -1,
        overflow: 'visible' // Ensure markers don't get clipped
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
          strokeLinecap="round" // Rounded ends for smoother appearance
        />
        
        {/* Flow markers - small circles along the path */}
        {Array.from({ length: 3 }).map((_, i) => (
          <circle 
            key={i}
            className={`path-marker ${path.owner}`}
            r={4}
            style={{
              animation: `flow-along-path 3s infinite linear ${i * 0.8}s`,
              opacity: isActive ? 1 : 0.5,
              filter: 'drop-shadow(0 0 2px white)' // Add glow for better visibility
            }}
          >
            <animateMotion
              dur="3s" 
              repeatCount="indefinite" 
              path={pathString}
              rotate="auto" // Align with path direction
            />
          </circle>
        ))}
      </svg>
    );
  } else {
    // Improved straight path with SVG for better precision
    // SVG provides more precise rendering than using div elements and transforms
    const pathString = `M${sourceCell.x},${sourceCell.y} L${targetCell.x},${targetCell.y}`;
    console.log(`  Straight path string: ${pathString}`);
    
    pathElement = (
      <svg className="path-svg" style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: -1,
        overflow: 'visible' // Ensure markers don't get clipped
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
          strokeLinecap="round" // Rounded ends for smoother appearance
          style={{
            opacity: isActive ? 1 : 0.7,
            transition: 'all 0.3s ease',
            filter: isActive ? `drop-shadow(0 0 8px rgba(${path.owner === 'player' ? '76, 175, 80' : '244, 67, 54'}, 0.7))` : 'none'
          }}
        />
        
        {/* Flow markers for both straight SVG paths */}
        {Array.from({ length: 3 }).map((_, i) => (
          <circle 
            key={i}
            className={`path-marker ${path.owner}`}
            r={4}
            style={{
              animation: `flow-along-path 3s infinite linear ${i * 0.8}s`,
              opacity: isActive ? 1 : 0.5,
              filter: 'drop-shadow(0 0 2px white)' // Add glow for better visibility
            }}
          >
            <animateMotion
              dur="3s" 
              repeatCount="indefinite" 
              path={pathString}
              rotate="auto" // Align with path direction
            />
          </circle>
        ))}
        
        {/* Pulse animation for active paths */}
        {isActive && (
          <circle
            className={`path-pulse ${path.owner}`}
            r={8}
            style={{
              animation: `pulse-along-path 1s ease-out forwards`,
              opacity: 0.8
            }}
            key={pulseCount} // Force re-animation on new unit sent
          >
            <animateMotion
              dur="1s"
              repeatCount="1"
              path={pathString}
              keyPoints="0;1"
              keyTimes="0;1"
              calcMode="linear"
            />
          </circle>
        )}
      </svg>
    );
  }
  
  return pathElement;
};

export default Path;