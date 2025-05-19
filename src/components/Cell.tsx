import React from 'react';
import { CellData } from '../types';

interface CellProps {
  cell: CellData;
  isSelected: boolean;
  onClick: (id: string) => void;
}

const Cell: React.FC<CellProps> = ({ cell, isSelected, onClick }) => {
  const handleClick = () => {
    onClick(cell.id);
  };

  return (
    <div
      className={`cell ${cell.owner} ${isSelected ? 'selected' : ''}`}
      style={{
        left: `${cell.x}px`,
        top: `${cell.y}px`,
        transform: isSelected ? 'scale(1.2)' : 'scale(1)',
        boxShadow: isSelected ? '0 0 10px 5px rgba(255, 255, 0, 0.5)' : 'none'
      }}
      onClick={handleClick}
    >
      {Math.floor(cell.units)}
    </div>
  );
};

export default Cell;