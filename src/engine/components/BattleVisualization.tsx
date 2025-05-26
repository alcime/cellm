import React from 'react';
import { Battle, Position } from '../types';

interface BattleVisualizationProps {
  battle: Battle;
  cellPosition: Position;
}

export const BattleVisualization: React.FC<BattleVisualizationProps> = ({ battle, cellPosition }) => {
  // Use the actual target cell position as the center
  const centerPosition = cellPosition;
  
  // Get cell position (assuming we can find it from battle.cellId)
  // For now, we'll calculate positions around the battle center
  const battleRadius = 80; // Distance from cell center for battle positioning
  
  const renderAttackers = () => {
    return battle.attackers.map((attacker, index) => {
      // Position attackers in a circle around the cell
      const angle = (index / battle.attackers.length) * 2 * Math.PI;
      const x = attacker.battlePosition?.x || (centerPosition.x + Math.cos(angle) * battleRadius);
      const y = attacker.battlePosition?.y || (centerPosition.y + Math.sin(angle) * battleRadius);
      
      return (
        <div key={attacker.id}>
          {/* Attacker unit */}
          <div
            style={{
              position: 'absolute',
              left: x - 15,
              top: y - 15,
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              backgroundColor: getOwnerColor(attacker.owner),
              border: '2px solid #fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold',
              color: 'white',
              textShadow: '1px 1px 2px black',
              zIndex: 20,
              animation: 'battle-pulse 0.5s infinite alternate'
            }}
          >
            {Math.floor(attacker.unitCount)}
          </div>
          
          {/* Unit count bar above attacker */}
          <div
            style={{
              position: 'absolute',
              left: x - 20,
              top: y - 35,
              width: '40px',
              height: '6px',
              backgroundColor: '#333',
              borderRadius: '3px',
              overflow: 'hidden',
              zIndex: 21
            }}
          >
            <div
              style={{
                width: `${Math.max(0, Math.min(100, (attacker.unitCount / getInitialUnitCount(attacker)) * 100))}%`,
                height: '100%',
                backgroundColor: getOwnerColor(attacker.owner),
                transition: 'width 0.3s ease'
              }}
            />
          </div>
          
        </div>
      );
    });
  };
  
  const renderDefenderIndicator = () => {
    const defenderPercentage = Math.max(0, (battle.defenderUnits / getInitialDefenderCount(battle)) * 100);
    
    return (
      <div>
        {/* Defender health bar above cell */}
        <div
          style={{
            position: 'absolute',
            left: centerPosition.x - 30,
            top: centerPosition.y - 50,
            width: '60px',
            height: '8px',
            backgroundColor: '#333',
            borderRadius: '4px',
            border: '1px solid #fff',
            overflow: 'hidden',
            zIndex: 25
          }}
        >
          <div
            style={{
              width: `${defenderPercentage}%`,
              height: '100%',
              backgroundColor: getOwnerColor(battle.defenderOwner),
              transition: 'width 0.3s ease'
            }}
          />
        </div>
        
        {/* Defender label */}
        <div
          style={{
            position: 'absolute',
            left: centerPosition.x - 15,
            top: centerPosition.y - 65,
            fontSize: '10px',
            fontWeight: 'bold',
            color: '#fff',
            textShadow: '1px 1px 2px black',
            textAlign: 'center',
            zIndex: 26
          }}
        >
          {Math.floor(Math.max(0, battle.defenderUnits))}
        </div>
        
      </div>
    );
  };
  
  const renderBattleProgress = () => {
    return (
      <div>
        <div
          style={{
            position: 'absolute',
            left: centerPosition.x - 40,
            top: centerPosition.y + 40,
            width: '80px',
            height: '4px',
            backgroundColor: '#333',
            borderRadius: '2px',
            border: '1px solid #fff',
            overflow: 'hidden',
            zIndex: 27
          }}
        >
          <div
            style={{
              width: `${battle.progress * 100}%`,
              height: '100%',
              backgroundColor: '#ffeb3b',
              transition: 'width 0.1s ease'
            }}
          />
        </div>
        
      </div>
    );
  };
  
  return (
    <div>
      {renderAttackers()}
      {renderDefenderIndicator()}
      {renderBattleProgress()}
      
      {/* Battle effects */}
      <div
        style={{
          position: 'absolute',
          left: centerPosition.x - 5,
          top: centerPosition.y - 5,
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: '#ff9800',
          zIndex: 18,
          animation: 'battle-explosion 0.8s infinite'
        }}
      />
    </div>
  );
};

function getOwnerColor(owner: string): string {
  switch (owner) {
    case 'player': return '#4caf50';
    case 'enemy': return '#f44336';
    case 'neutral': return '#9e9e9e';
    default: return '#2196f3';
  }
}

// Helper functions for getting initial unit counts
function getInitialUnitCount(unit: any): number {
  return unit.initialUnitCount || unit.unitCount || 1;
}

function getInitialDefenderCount(battle: Battle): number {
  return (battle as any).initialDefenderUnits || battle.defenderUnits || 1;
}