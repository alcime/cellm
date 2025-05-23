import React from 'react';
import { CellOwner } from '../types';

interface GameStatusProps {
  gameOver: boolean;
  winner: CellOwner | null;
  onRestart: () => void;
}

const GameStatus: React.FC<GameStatusProps> = ({ gameOver, winner, onRestart }) => {
  if (!gameOver) {
    return (
      <div className="game-status">
        <h3>Cell Conquest</h3>
        <p>Click on your cells (green) to select them, then click on another cell to send units.</p>
        <div style={{ fontSize: '0.8em', marginTop: '8px' }}>
          <p>• When linking cells, 60% of units are sent immediately</p>
          <p>• Cells generate units over time</p>
          <p>• Conquer all enemy cells (red) to win</p>
        </div>
      </div>
    );
  }

  return (
    <div className="game-status">
      <h2>Game Over!</h2>
      <p>{winner === 'player' ? 'You won!' : 'You lost!'}</p>
      <button onClick={onRestart} style={{
        padding: '8px 16px',
        marginTop: '10px',
        backgroundColor: '#4CAF50',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
      }}>
        Play Again
      </button>
    </div>
  );
};

export default GameStatus;