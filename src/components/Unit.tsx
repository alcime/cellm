import React from 'react';
import { UnitData } from '../types';

interface UnitProps {
  unit: UnitData;
}

const Unit: React.FC<UnitProps> = ({ unit }) => {
  return (
    <div
      className={`unit ${unit.owner}`}
      style={{
        left: `${unit.position.x}px`,
        top: `${unit.position.y}px`
      }}
    />
  );
};

export default Unit;