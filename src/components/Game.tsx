import React from 'react';
import Cell from './Cell';
import Path from './Path';
import Unit from './Unit';
import GameStatus from './GameStatus';
import { useGameLogic } from '../hooks/useGameLogic';

const Game: React.FC = () => {
  const {
    cells,
    paths,
    units,
    selectedCellId,
    gameOver,
    winner,
    handleCellClick,
    restartGame
  } = useGameLogic(10); // Start with 10 cells

  return (
    <div className="game-container">
      {cells.map(cell => (
        <Cell
          key={cell.id}
          cell={cell}
          isSelected={cell.id === selectedCellId}
          onClick={handleCellClick}
        />
      ))}
      
      {paths.map(path => (
        <Path
          key={path.id}
          path={path}
          cells={cells}
        />
      ))}
      
      {units.map(unit => (
        <Unit
          key={unit.id}
          unit={unit}
        />
      ))}
      
      <GameStatus
        gameOver={gameOver}
        winner={winner}
        onRestart={restartGame}
      />
    </div>
  );
};

export default Game;