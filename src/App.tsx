import React from 'react';
import { Game } from './engine';
import './styles.css';

/**
 * Main App component for the Cell Conquest game
 * 
 * Features:
 * - Clean, extensible game engine
 * - Different cell types (factory, fortress, teleporter)
 * - Consistent coordinate system
 * - Ready for strategy game extensions
 */
const App: React.FC = () => {
  return (
    <div className="app">
      <Game />
    </div>
  );
};

export default App;