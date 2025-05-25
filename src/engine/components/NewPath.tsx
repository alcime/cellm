import React from 'react';
import { Path, Cell } from '../types';

interface PathProps {
  path: Path;
  cells: Cell[];
}

export const NewPath: React.FC<PathProps> = ({ path, cells }) => {
  const sourceCell = cells.find(c => c.id === path.sourceCellId);
  const targetCell = cells.find(c => c.id === path.targetCellId);

  if (!sourceCell || !targetCell) {
    return null;
  }

  // Calculate path string for SVG
  const pathString = calculatePathString(
    sourceCell.position,
    targetCell.position,
    path.type
  );

  const color = getPathColor(path.owner);

  return (
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
        stroke={color}
        strokeWidth={path.thickness || 4}
        fill="none"
        strokeLinecap="round"
        opacity={path.active ? 0.8 : 0.5}
        strokeDasharray={path.active ? 'none' : '5,5'}
      />
      
      {/* Connection dots */}
      <circle
        cx={sourceCell.position.x}
        cy={sourceCell.position.y}
        r="4"
        fill={color}
        opacity="0.9"
      />
      <circle
        cx={targetCell.position.x}
        cy={targetCell.position.y}
        r="4"
        fill={color}
        opacity="0.9"
      />
    </svg>
  );
};

function calculatePathString(
  source: { x: number; y: number },
  target: { x: number; y: number },
  pathType: 'straight' | 'curved'
): string {
  if (pathType === 'straight') {
    return `M${source.x},${source.y} L${target.x},${target.y}`;
  } else {
    // Curved path using same logic as unit movement
    const midX = (source.x + target.x) / 2;
    const midY = (source.y + target.y) / 2;
    
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const perpX = -dy * 0.3;
    const perpY = dx * 0.3;
    
    const ctrlX = midX + perpX;
    const ctrlY = midY + perpY;
    
    return `M${source.x},${source.y} Q${ctrlX},${ctrlY} ${target.x},${target.y}`;
  }
}

function getPathColor(owner: string): string {
  switch (owner) {
    case 'player': return '#4caf50';
    case 'enemy': return '#f44336';
    case 'neutral': return '#9e9e9e';
    default: return '#2196f3';
  }
}