import React from 'react';
import { Cell as CellData } from '../types';

interface CellProps {
  cell: CellData;
  isSelected: boolean;
  onClick: (cellId: string) => void;
}

export const Cell: React.FC<CellProps> = ({ cell, isSelected, onClick }) => {
  const handleClick = () => {
    onClick(cell.id);
  };

  // Simple, direct positioning - no transforms
  const style: React.CSSProperties = {
    position: 'absolute',
    left: cell.position.x - 30, // Center the 60px cell
    top: cell.position.y - 30,
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    border: isSelected ? '3px solid #ffeb3b' : '2px solid #000',
    backgroundColor: getCellColor(cell.owner),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 'bold',
    color: 'white',
    textShadow: '1px 1px 2px black',
    cursor: 'pointer',
    userSelect: 'none',
    zIndex: 10,
    boxShadow: isSelected ? '0 0 10px #ffeb3b' : '0 2px 4px rgba(0,0,0,0.3)'
  };

  return (
    <div style={style} onClick={handleClick}>
      <div style={{ textAlign: 'center' }}>
        {getCellIcon(cell.type)}
        <div style={{ fontSize: '12px', lineHeight: '1' }}>
          {Math.floor(cell.units)}
        </div>
      </div>
    </div>
  );
};

function getCellColor(owner: string): string {
  switch (owner) {
    case 'player': return '#4caf50';
    case 'enemy': return '#f44336';
    case 'neutral': return '#9e9e9e';
    default: return '#2196f3';
  }
}

function getCellIcon(cellType: any): string {
  if (cellType.special?.factory) return '⚙️';
  if (cellType.special?.fortress) return '🛡️';
  return '';
}