import React, { useState } from 'react';
import Game from './components/Game';
import { NewGame } from './engine/components/NewGame';
import './styles.css';

/**
 * Main App component for the Cell Conquest game
 * 
 * Features:
 * - Two game engines: original (complex) and new (clean)
 * - Different cell types (factory, fortress, teleporter)
 * - Clean coordinate system and extensible architecture
 */
const App: React.FC = () => {
  const [useNewEngine, setUseNewEngine] = useState(true); // Default to new engine

  return (
    <div className="app">
      {/* Engine selector */}
      <div style={{
        position: 'absolute',
        top: 10,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '10px 20px',
        borderRadius: '20px',
        fontSize: '14px'
      }}>
        <label>
          <input
            type="checkbox"
            checked={useNewEngine}
            onChange={(e) => setUseNewEngine(e.target.checked)}
            style={{ marginRight: '8px' }}
          />
          Use New Clean Engine
        </label>
      </div>

      {useNewEngine ? <NewGame /> : <Game />}
    </div>
  );
};

export default App;