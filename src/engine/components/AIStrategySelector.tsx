import React, { useState } from 'react';
import { StrategyType } from '../AIStrategyManager';

interface AIStrategySelectorProps {
  currentStrategy?: StrategyType;
  onStrategyChange: (strategy: StrategyType) => void;
  availableStrategies: { type: StrategyType; name: string; description: string }[];
  disabled?: boolean;
}

export const AIStrategySelector: React.FC<AIStrategySelectorProps> = ({
  currentStrategy = 'simple',
  onStrategyChange,
  availableStrategies,
  disabled = false
}) => {
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyType>(currentStrategy);

  const handleStrategyChange = (strategy: StrategyType) => {
    setSelectedStrategy(strategy);
    onStrategyChange(strategy);
  };

  return (
    <div className="ai-strategy-selector">
      <h3>AI Strategy</h3>
      <div className="strategy-options">
        {availableStrategies.map((strategy) => (
          <div
            key={strategy.type}
            className={`strategy-option ${
              selectedStrategy === strategy.type ? 'selected' : ''
            } ${disabled ? 'disabled' : ''}`}
            onClick={() => !disabled && handleStrategyChange(strategy.type)}
          >
            <div className="strategy-name">{strategy.name}</div>
            <div className="strategy-description">{strategy.description}</div>
          </div>
        ))}
      </div>
      
      <style>{`
        .ai-strategy-selector {
          padding: 20px;
          background: rgba(0, 0, 0, 0.8);
          border-radius: 8px;
          color: white;
          min-width: 300px;
        }
        
        .ai-strategy-selector h3 {
          margin: 0 0 15px 0;
          color: #00ff88;
        }
        
        .strategy-options {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .strategy-option {
          padding: 12px;
          border: 2px solid #333;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          background: rgba(255, 255, 255, 0.05);
        }
        
        .strategy-option:hover:not(.disabled) {
          border-color: #00ff88;
          background: rgba(0, 255, 136, 0.1);
        }
        
        .strategy-option.selected {
          border-color: #00ff88;
          background: rgba(0, 255, 136, 0.2);
        }
        
        .strategy-option.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .strategy-name {
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 4px;
          color: #00ff88;
        }
        
        .strategy-description {
          font-size: 12px;
          color: #ccc;
          line-height: 1.3;
        }
      `}</style>
    </div>
  );
};