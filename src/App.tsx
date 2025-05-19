import React from 'react';
import Game from './components/Game';
import './styles.css';

/**
 * Main App component for the Cell Conquest game
 * 
 * Features:
 * - Different cell types (factory, fortress, teleporter)
 * - Animated battles with gradual unit depletion
 * - Enhanced path visualization
 * - Teleportation effects
 */
const App: React.FC = () => {
  return (
    <div className="app">
      <Game />
      <div className="game-instructions">
        <h3>Cell Conquest</h3>
        <p>Click your cells to select, then click target cells to send units</p>
        <p><span className="special-indicator">⚙️</span> Factory: Produces units faster</p>
        <p><span className="special-indicator">🛡️</span> Fortress: Stronger defense</p>
        <p><span className="special-indicator">🌀</span> Teleporter: Transports units instantly</p>
      </div>
    </div>
  );
};

export default App;