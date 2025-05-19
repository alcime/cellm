import React, { memo } from 'react';

// Interface for visual effects
interface VisualEffect {
  id: string;
  type: 'teleport_in' | 'teleport_out' | 'conquest' | 'unit_trail';
  position: { x: number, y: number };
  owner: 'player' | 'enemy' | 'neutral';
  createdAt: number;
  duration: number;
}

interface VisualEffectsProps {
  effects: VisualEffect[];
}

// Memoized component to prevent unnecessary re-renders
const VisualEffects: React.FC<VisualEffectsProps> = memo(({ effects }) => {
  return (
    <>
      {effects.map(effect => (
        <Effect key={effect.id} effect={effect} />
      ))}
    </>
  );
});

interface EffectProps {
  effect: VisualEffect;
}

// Individual effect component
const Effect: React.FC<EffectProps> = ({ effect }) => {
  const { type, position, owner, duration } = effect;
  
  // Common styles for all effects
  const commonStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${position.x}px`,
    top: `${position.y}px`,
    pointerEvents: 'none',
    zIndex: 20,
    transform: 'translate(-50%, -50%)'
  };
  
  // Render different effects based on type
  switch (type) {
    case 'teleport_in':
      return (
        <div 
          className={`teleport-in-effect ${owner}`}
          style={{
            ...commonStyle,
            animation: `teleport-in ${duration}ms ease-out forwards`
          }}
        />
      );
      
    case 'teleport_out':
      return (
        <div 
          className={`teleport-out-effect ${owner}`}
          style={{
            ...commonStyle,
            animation: `teleport-out ${duration}ms ease-out forwards`
          }}
        />
      );
      
    case 'conquest':
      return (
        <div 
          className={`conquest-effect ${owner}`}
          style={{
            ...commonStyle,
            width: '80px',
            height: '80px',
            animation: `conquest-pulse ${duration}ms ease-out forwards`
          }}
        />
      );
      
    case 'unit_trail':
      const size = '12px';
      return (
        <div 
          className={`unit-trail-effect ${owner}`}
          style={{
            ...commonStyle,
            width: size,
            height: size,
            animation: `fade-trail ${duration}ms forwards`
          }}
        />
      );
      
    default:
      return null;
  }
};

export default VisualEffects;