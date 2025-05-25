import React, { useState, useEffect, useRef } from 'react';
import { CellData, CellType } from '../types';

interface CellProps {
  cell: CellData;
  isSelected: boolean;
  onClick: (id: string) => void;
}

// Memoize the Cell component to prevent unnecessary re-renders
const Cell: React.FC<CellProps> = React.memo(({ cell, isSelected, onClick }) => {
  // Animation state - separate from game state
  const [animationState, setAnimationState] = useState({
    isConquered: false,
    battleProgress: 0,
    attackingUnits: 0,
    defendingUnits: 0
  });
  
  // Track previous values for comparison
  const previousOwnerRef = useRef(cell.owner);
  const previousBattleStateRef = useRef({
    inBattle: cell.inBattle,
    battleProgress: cell.battleProgress || 0
  });
  
  // Detect when a cell changes ownership
  useEffect(() => {
    if (previousOwnerRef.current !== cell.owner) {
      
      // Start conquest animation
      setAnimationState(prev => ({
        ...prev,
        isConquered: true
      }));
      
      // Reset the animation after it completes
      const timeout = setTimeout(() => {
        setAnimationState(prev => ({
          ...prev,
          isConquered: false
        }));
      }, 800);
      
      // Update the previous owner reference
      previousOwnerRef.current = cell.owner;
      
      return () => clearTimeout(timeout);
    }
  }, [cell.owner, cell.id]);
  
  // Synchronized battle animation based on cell battle state
  useEffect(() => {
    // Only update animation if battle state or progress has changed
    if (previousBattleStateRef.current.inBattle !== cell.inBattle || 
        previousBattleStateRef.current.battleProgress !== cell.battleProgress) {
      
      // Update previous value reference
      previousBattleStateRef.current = {
        inBattle: cell.inBattle,
        battleProgress: cell.battleProgress || 0
      };
      
      if (cell.inBattle) {
        // Calculate smooth battle animation values
        const progress = cell.battleProgress || 0;
        
        // Improved battle animation calculation for more accurate numbers
        // Get the raw numbers from the cell
        const attackersStart = cell.attackers || 0;
        const defendersStart = cell.defenders || 0;
        
        // Determine who's winning for proper animation
        const attackersWinning = attackersStart > defendersStart;
        const ratio = attackersWinning ? 
          (defendersStart / Math.max(1, attackersStart)) : 
          (attackersStart / Math.max(1, defendersStart));
        
        // Calculate unit reduction for winner and loser
        // Winner should reduce at a slower rate (proportional to their advantage)
        let attackingUnits, defendingUnits;
        
        if (attackersWinning) {
          // Attackers are winning - they deplete more slowly
          attackingUnits = Math.max(1, Math.round(attackersStart - (progress * defendersStart)));
          defendingUnits = Math.max(0, Math.round(defendersStart * (1 - progress)));
        } else {
          // Defenders are winning - they deplete more slowly
          attackingUnits = Math.max(0, Math.round(attackersStart * (1 - progress)));
          defendingUnits = Math.max(1, Math.round(defendersStart - (progress * attackersStart)));
        }
        
        // Ensure winner always has at least 1 unit left at the end
        if (progress > 0.9) {
          if (attackersWinning) {
            attackingUnits = Math.max(1, attackingUnits);
            defendingUnits = 0;
          } else {
            attackingUnits = 0;
            defendingUnits = Math.max(1, defendingUnits);
          }
        }
        
        // Update animation state
        setAnimationState(prev => ({
          ...prev,
          battleProgress: progress,
          attackingUnits,
          defendingUnits
        }));
      } else {
        // Reset battle animation state when battle ends
        setAnimationState(prev => ({
          ...prev,
          battleProgress: 0,
          attackingUnits: 0,
          defendingUnits: 0
        }));
      }
    }
  }, [cell.inBattle, cell.battleProgress, cell.attackers, cell.defenders]);
  
  const handleClick = React.useCallback(() => {
    onClick(cell.id);
  }, [cell.id, onClick]);

  // Scale size slightly based on number of units and selection state
  const scale = isSelected ? 1.2 : 1;
  
  // Get cell type icon based on cell type
  const getCellTypeIcon = React.useCallback(() => {
    switch (cell.cellType) {
      case 'factory':
        return '⚙️'; // Factory icon
      case 'fortress':
        return '🛡️'; // Fortress icon
      case 'teleporter':
        return '🌀'; // Teleporter icon
      default:
        return null;
    }
  }, [cell.cellType]);
  
  // Create battle visual elements
  const getBattleElements = React.useCallback(() => {
    if (!cell.inBattle) return null;
    
    // Use animation state values for smooth rendering
    const { battleProgress, attackingUnits, defendingUnits } = animationState;
    
    // Calculate appropriate size based on cell units
    const maxUnits = Math.max(attackingUnits, defendingUnits);
    // Increase font size and make it responsive to unit count
    const fontSize = Math.min(Math.max(14, 10 + Math.min(maxUnits / 5, 10)), 24);
    
    return (
      <div className="battle-container">
        {/* Enlarged attacker indicator */}
        <div className="battle-attackers" style={{ 
          opacity: 1 - battleProgress,
          backgroundColor: cell.battleOwner === 'player' ? '#4caf50' : '#f44336',
          fontSize: `${fontSize}px`,
          padding: '4px 8px',
          boxShadow: '0 0 5px rgba(0, 0, 0, 0.5)',
          fontWeight: 'bold',
          minWidth: '30px',
          textAlign: 'center',
          top: '-8px',
          left: '-8px'
        }}>
          {attackingUnits}
        </div>
        
        <div className="battle-progress" style={{ 
          width: `${battleProgress * 100}%`,
          height: '6px' // Slightly thicker progress bar
        }} />
        
        {/* Enlarged defender indicator */}
        <div className="battle-defenders" style={{ 
          opacity: 1 - battleProgress * 0.8,
          fontSize: `${fontSize}px`,
          padding: '4px 8px',
          boxShadow: '0 0 5px rgba(0, 0, 0, 0.5)',
          fontWeight: 'bold',
          minWidth: '30px',
          textAlign: 'center',
          bottom: '-8px',
          right: '-8px'
        }}>
          {defendingUnits}
        </div>
      </div>
    );
  }, [cell.inBattle, cell.battleOwner, animationState]);
  
  // Get border style based on cell type
  const getCellBorder = React.useCallback(() => {
    switch (cell.cellType) {
      case 'factory':
        return '4px double #ffeb3b'; // Yellow double border for factory
      case 'fortress':
        return '4px ridge #8d6e63'; // Brown ridge border for fortress
      case 'teleporter':
        return '4px dashed #2196f3'; // Blue dashed border for teleporter
      default:
        return undefined;
    }
  }, [cell.cellType]);
  
  // Get unit count display value
  const getDisplayedUnitCount = React.useMemo(() => {
    if (animationState.isConquered && cell.conquestUnits !== undefined) {
      return Math.floor(cell.conquestUnits);
    }
    return Math.floor(cell.units);
  }, [cell.units, cell.conquestUnits, animationState.isConquered]);
  

  return (
    <div
      className={`cell ${cell.owner} ${cell.cellType} ${isSelected ? 'selected' : ''} ${animationState.isConquered ? 'conquered' : ''} ${cell.inBattle ? 'in-battle' : ''}`}
      style={{
        left: `${cell.x}px`,
        top: `${cell.y}px`,
        transform: `translate(-50%, -50%) scale(${scale})`, // Center the cell on its coordinates
        boxShadow: isSelected ? '0 0 10px 5px rgba(255, 255, 0, 0.7)' : undefined,
        border: getCellBorder()
      }}
      onClick={handleClick}
    >
      {/* Cell type indicator */}
      {getCellTypeIcon() && (
        <div className="cell-type-indicator">
          {getCellTypeIcon()}
        </div>
      )}
      
      {/* Unit count */}
      <span style={{ 
        fontSize: `${Math.min(24, 16 + Math.min(cell.units / 10, 1) * 8)}px`,
        fontWeight: 'bold',
        textShadow: '0 0 3px rgba(0, 0, 0, 0.5)',
        position: 'relative',
        zIndex: 5
      }}>
        {getDisplayedUnitCount}
      </span>
      
      {/* Battle animation elements */}
      {getBattleElements()}
    </div>
  );
});

export default Cell;