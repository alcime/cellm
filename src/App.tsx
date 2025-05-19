import React from 'react';
import Game from './components/Game';
import './styles.css';

const App: React.FC = () => {
  return (
    <div className="app">
      <Game />
    </div>
  );
};

export default App;