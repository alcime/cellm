# AI Strategy Development Guide

This guide explains how to create new AI strategies for the cell game engine.

## Quick Start: Adding a New Strategy

### 1. Create Your Strategy Class

Create a new file in `src/engine/strategies/YourStrategyName.ts`:

```typescript
import { BaseAIStrategy, AIDecision } from '../AIStrategy';
import { GameState, Cell, PlayerId } from '../types';

export class YourAIStrategy extends BaseAIStrategy {
  constructor(playerId: PlayerId) {
    super(playerId, 'YourStrategyName', {
      aggressiveness: 0.5,    // 0-1: How willing to attack
      riskTolerance: 0.5,     // 0-1: How much risk to take
      economicFocus: 0.5,     // 0-1: Prioritize growth vs combat
      coordinationLevel: 0.5, // 0-1: How much to coordinate attacks
      defensiveBonus: 1.0     // Multiplier for defensive considerations
    });
  }

  public makeDecisions(gameState: GameState): AIDecision[] {
    const aiCells = gameState.cells.filter(cell => cell.owner === this.playerId);
    const decisions: AIDecision[] = [];

    // Your strategy logic here
    for (const cell of aiCells) {
      const decision = this.evaluateCell(cell, gameState);
      if (decision) {
        decisions.push(decision);
      }
    }

    // Apply coordination if needed
    return this.coordinateAttacks(decisions, gameState);
  }

  private evaluateCell(sourceCell: Cell, gameState: GameState): AIDecision | null {
    // Your cell evaluation logic here
    const target = this.findTarget(sourceCell, gameState);
    if (!target) return null;

    return {
      sourceCellId: sourceCell.id,
      targetCellId: target.id,
      unitCount: Math.floor(sourceCell.units / 2),
      priority: 5,           // 1-10 priority
      type: 'attack'         // 'attack' | 'reinforce' | 'expand'
    };
  }

  protected applyCoordinationRules(
    attackers: AIDecision[], 
    targetCellId: string, 
    gameState: GameState
  ): AIDecision[] {
    // Your coordination logic here
    return attackers; // Return which attackers should proceed
  }

  private findTarget(sourceCell: Cell, gameState: GameState): Cell | null {
    // Your target selection logic here
    return this.findClosestNonAllyCell(sourceCell, gameState);
  }
}
```

### 2. Register the Strategy

Add your strategy to `src/engine/AIStrategyManager.ts`:

```typescript
// 1. Import your strategy
import { YourAIStrategy } from './strategies/YourAIStrategy';

// 2. Add to StrategyType union
export type StrategyType = 'simple' | 'aggressive' | 'defensive' | 'economic' | 'swarm' | 'your-strategy';

// 3. Add to createStrategy method
private createStrategy(playerId: PlayerId, strategyType: StrategyType, customConfig?: Partial<import('./AIStrategy').AIStrategyConfig>): IAIStrategy {
  let strategy: IAIStrategy;

  switch (strategyType) {
    // ... existing cases
    case 'your-strategy':
      strategy = new YourAIStrategy(playerId);
      break;
    // ... default case
  }

  // ... rest of method
}

// 4. Add to listAvailableStrategies method
public listAvailableStrategies(): { type: StrategyType; name: string; description: string }[] {
  return [
    // ... existing strategies
    {
      type: 'your-strategy',
      name: 'Your Strategy',
      description: 'Description of what your strategy does'
    }
  ];
}
```

### 3. Export the Strategy

Add your strategy to `src/engine/index.ts`:

```typescript
export { YourAIStrategy } from './strategies/YourAIStrategy';
```

## Strategy Configuration Options

### AIStrategyConfig Properties

- **aggressiveness** (0-1): How eager the AI is to attack
  - 0.2: Very conservative, rarely attacks
  - 0.5: Balanced approach
  - 0.9: Highly aggressive, attacks frequently

- **riskTolerance** (0-1): How much risk the AI accepts
  - 0.2: Only attacks with overwhelming advantage
  - 0.5: Moderate risk acceptance
  - 0.8: Takes high-risk attacks

- **economicFocus** (0-1): Priority on growth vs combat
  - 0.1: Pure military focus
  - 0.5: Balanced growth and combat
  - 0.9: Economic expansion priority

- **coordinationLevel** (0-1): Multi-unit coordination
  - 0.2: Independent cell actions
  - 0.5: Some coordination
  - 1.0: Full swarm coordination

- **defensiveBonus** (0.5-2.0): Defensive multiplier
  - 0.8: Less defensive
  - 1.0: Standard defense
  - 1.5: Extra defensive

### Decision Types

- **'attack'**: Offensive action against enemy/neutral
- **'reinforce'**: Send units to friendly cell
- **'expand'**: Capture neutral territory

### Priority Levels (1-10)

- 1-3: Low priority (expansion, optional actions)
- 4-6: Medium priority (standard attacks)
- 7-8: High priority (strategic targets)
- 9-10: Critical priority (emergency defense)

## Available Helper Methods

### From BaseAIStrategy

```typescript
// Game state analysis
this.evaluateGameState(gameState): AIMetrics

// Distance calculation
this.calculateDistance(pos1, pos2): number

// Target finding
this.findClosestNonAllyCell(sourceCell, gameState): Cell | null
this.getClosestCell(sourceCell, targetCells): Cell | null

// Coordination
this.coordinateAttacks(decisions, gameState): AIDecision[]
```

### GameState Information

```typescript
gameState.cells     // All cells in the game
gameState.units     // Moving units
gameState.battles   // Active battles
gameState.turn      // Current turn number
```

## Example Strategy Patterns

### Aggressive Strategy Pattern
- High aggressiveness (0.8+)
- High risk tolerance (0.7+)
- Target weakest enemies first
- Attack with minimal advantage (1.5x)

### Defensive Strategy Pattern
- Low aggressiveness (0.3-)
- Low risk tolerance (0.3-)
- Reinforce threatened cells
- Only attack with overwhelming advantage (4x+)

### Economic Strategy Pattern
- High economic focus (0.8+)
- Target high-value neutrals
- Consolidate weak positions
- Strategic attacks only

### Swarm Strategy Pattern
- Maximum coordination (1.0)
- Multi-cell synchronized attacks
- Overwhelming force tactics
- Custom coordination logic

## Testing Your Strategy

1. Build the project: `npm run build`
2. Start the game and click "AI Strategy" button
3. Select your strategy from the dropdown
4. Observe the AI behavior and console logs
5. Iterate on your strategy logic

## Advanced Features

### Custom Metrics
Override `evaluateGameState()` to add custom metrics:

```typescript
public evaluateGameState(gameState: GameState): AIMetrics {
  const baseMetrics = super.evaluateGameState(gameState);
  
  // Add custom calculations
  const customMetric = this.calculateCustomMetric(gameState);
  
  return {
    ...baseMetrics,
    customMetric
  };
}
```

### Dynamic Configuration
Adjust strategy parameters based on game state:

```typescript
public makeDecisions(gameState: GameState): AIDecision[] {
  // Increase aggressiveness if losing
  if (this.isLosing(gameState)) {
    this.config.aggressiveness = Math.min(1.0, this.config.aggressiveness + 0.2);
  }
  
  // ... rest of strategy
}
```

This architecture makes it easy to experiment with different AI behaviors and create engaging gameplay scenarios!