import React, { useCallback } from 'react';
import { UnitData } from '../types';

interface UnitProps {
  unit: UnitData;
  onCreateTrail: (x: number, y: number, owner: 'player' | 'enemy' | 'neutral', size: number) => void;
}

// Memoize the Unit component to prevent unnecessary re-renders
const Unit: React.FC<UnitProps> = React.memo(({ unit, onCreateTrail }) => {
  // Get visual properties or use defaults
  const size = unit.size || Math.min(Math.max(14, unit.units * 1.5), 36);
  const trailEffect = unit.trailEffect || false;
  const pulseEffect = unit.pulseEffect || false;
  
  // Use React's own timer hook instead of directly manipulating DOM
  React.useEffect(() => {
    if (!trailEffect) return;
    
    // Create trail effects using the callback instead of direct DOM manipulation
    const trailInterval = setInterval(() => {
      onCreateTrail(unit.position.x, unit.position.y, unit.owner, size * 0.8);
    }, 150); // Slightly less frequent for performance
    
    // Proper cleanup
    return () => clearInterval(trailInterval);
  }, [trailEffect, unit.position.x, unit.position.y, unit.owner, size, onCreateTrail]);
  
  return (
    <div
      className={`unit ${unit.owner} ${pulseEffect ? 'pulse-effect' : ''}`}
      style={{
        left: `${unit.position.x}px`,
        top: `${unit.position.y}px`,
        width: `${size}px`,
        height: `${size}px`,
        boxShadow: `0 0 ${size/3}px ${unit.owner === 'player' ? '#4caf50' : '#f44336'}`,
        border: `1px solid ${unit.owner === 'player' ? '#2e7d32' : '#c62828'}`,
        transform: 'translate(-50%, -50%)', // Center the unit on its position coordinates
        zIndex: 15
      }}
    >
      {unit.units > 1 && ( // Show count for all units with more than 1
        <span style={{ 
          fontSize: `${Math.max(size/2.5, 8)}px`,
          fontWeight: 'bold',
          color: 'white',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textShadow: '0 0 3px black',
          userSelect: 'none'
        }}>
          {unit.units}
        </span>
      )}
      
      {/* Unit glow effect for stronger units */}
      {unit.units > 10 && (
        <div className="unit-glow" style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          animation: 'unit-glow 1.5s infinite alternate',
          background: `radial-gradient(circle, ${unit.owner === 'player' ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)'} 0%, transparent 70%)`,
          transform: 'scale(1.5)',
          pointerEvents: 'none'
        }} />
      )}
    </div>
  );
});

export default Unit;