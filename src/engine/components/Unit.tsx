import React from 'react';
import { Unit as UnitData } from '../types';

interface UnitProps {
  unit: UnitData;
}

export const Unit: React.FC<UnitProps> = ({ unit }) => {
  const size = Math.min(Math.max(16, unit.unitCount * 2), 40);
  
  // Use battlePosition during battles, otherwise use regular position
  const displayPosition = unit.battlePosition || unit.position;
  
  // Simple, direct positioning - no transforms
  const style: React.CSSProperties = {
    position: 'absolute',
    left: displayPosition.x - size / 2, // Center the unit
    top: displayPosition.y - size / 2,
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    backgroundColor: getUnitColor(unit.owner),
    border: `2px solid ${getUnitBorderColor(unit.owner)}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: `${Math.max(8, size / 3)}px`,
    fontWeight: 'bold',
    color: 'white',
    textShadow: '1px 1px 2px black',
    zIndex: 15,
    boxShadow: `0 0 ${size/4}px ${getUnitColor(unit.owner)}`,
    animation: unit.battleState === 'fighting' ? 'battle-pulse 0.5s infinite alternate' : 
               unit.unitCount > 10 ? 'pulse 1s infinite alternate' : 'none'
  };

  return (
    <div style={style}>
      {unit.unitCount > 1 ? unit.unitCount : ''}
    </div>
  );
};

function getUnitColor(owner: string): string {
  switch (owner) {
    case 'player': return '#4caf50';
    case 'enemy': return '#f44336';
    case 'neutral': return '#9e9e9e';
    default: return '#2196f3';
  }
}

function getUnitBorderColor(owner: string): string {
  switch (owner) {
    case 'player': return '#2e7d32';
    case 'enemy': return '#c62828';
    case 'neutral': return '#616161';
    default: return '#1565c0';
  }
}