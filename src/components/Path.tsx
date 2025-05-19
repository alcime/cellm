import React from 'react';
import { PathData, CellData } from '../types';

interface PathProps {
  path: PathData;
  cells: CellData[];
}

const Path: React.FC<PathProps> = ({ path, cells }) => {
  const sourceCell = cells.find(cell => cell.id === path.sourceCellId);
  const targetCell = cells.find(cell => cell.id === path.targetCellId);
  
  if (!sourceCell || !targetCell) {
    return null;
  }
  
  const dx = targetCell.x - sourceCell.x;
  const dy = targetCell.y - sourceCell.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  
  return (
    <div
      className={`path ${path.owner}`}
      style={{
        left: `${sourceCell.x}px`,
        top: `${sourceCell.y}px`,
        width: `${distance}px`,
        transform: `rotate(${angle}deg)`
      }}
    />
  );
};

export default Path;