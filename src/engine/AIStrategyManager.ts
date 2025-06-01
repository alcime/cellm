import { PlayerId } from './types';
import { IAIStrategy, SimpleAIStrategy } from './AIStrategy';
import { AggressiveAIStrategy } from './strategies/AggressiveAIStrategy';
import { DefensiveAIStrategy } from './strategies/DefensiveAIStrategy';
import { EconomicAIStrategy } from './strategies/EconomicAIStrategy';
import { SwarmAIStrategy } from './strategies/SwarmAIStrategy';

export type StrategyType = 'simple' | 'aggressive' | 'defensive' | 'economic' | 'swarm';

export interface AIPlayerConfig {
  playerId: PlayerId;
  strategyType: StrategyType;
  customConfig?: Partial<import('./AIStrategy').AIStrategyConfig>;
}

export class AIStrategyManager {
  private strategies: Map<PlayerId, IAIStrategy> = new Map();

  public addAIPlayer(config: AIPlayerConfig): void {
    const strategy = this.createStrategy(config.playerId, config.strategyType, config.customConfig);
    this.strategies.set(config.playerId, strategy);
    
    console.log(`Added AI player ${config.playerId} with ${strategy.name} strategy`);
  }

  public removeAIPlayer(playerId: PlayerId): void {
    this.strategies.delete(playerId);
    console.log(`Removed AI player ${playerId}`);
  }

  public getStrategy(playerId: PlayerId): IAIStrategy | null {
    return this.strategies.get(playerId) || null;
  }

  public getAllStrategies(): IAIStrategy[] {
    return Array.from(this.strategies.values());
  }

  public getAIPlayers(): PlayerId[] {
    return Array.from(this.strategies.keys());
  }

  public updateStrategyConfig(playerId: PlayerId, newConfig: Partial<import('./AIStrategy').AIStrategyConfig>): boolean {
    const strategy = this.strategies.get(playerId);
    if (!strategy) return false;

    // Update the config (note: this would require the strategy to support config updates)
    Object.assign(strategy.config, newConfig);
    
    console.log(`Updated strategy config for ${playerId}:`, newConfig);
    return true;
  }

  public switchStrategy(playerId: PlayerId, newStrategyType: StrategyType): boolean {
    if (!this.strategies.has(playerId)) return false;

    const newStrategy = this.createStrategy(playerId, newStrategyType);
    this.strategies.set(playerId, newStrategy);
    
    console.log(`Switched ${playerId} to ${newStrategy.name} strategy`);
    return true;
  }

  private createStrategy(playerId: PlayerId, strategyType: StrategyType, customConfig?: Partial<import('./AIStrategy').AIStrategyConfig>): IAIStrategy {
    let strategy: IAIStrategy;

    switch (strategyType) {
      case 'aggressive':
        strategy = new AggressiveAIStrategy(playerId);
        break;
      case 'defensive':
        strategy = new DefensiveAIStrategy(playerId);
        break;
      case 'economic':
        strategy = new EconomicAIStrategy(playerId);
        break;
      case 'swarm':
        strategy = new SwarmAIStrategy(playerId);
        break;
      case 'simple':
      default:
        strategy = new SimpleAIStrategy(playerId);
        break;
    }

    // Apply custom configuration if provided
    if (customConfig) {
      Object.assign(strategy.config, customConfig);
    }

    return strategy;
  }

  public getStrategyInfo(playerId: PlayerId): { name: string; config: import('./AIStrategy').AIStrategyConfig } | null {
    const strategy = this.strategies.get(playerId);
    if (!strategy) return null;

    return {
      name: strategy.name,
      config: { ...strategy.config } // Return copy to prevent external modification
    };
  }

  public listAvailableStrategies(): { type: StrategyType; name: string; description: string }[] {
    return [
      {
        type: 'simple',
        name: 'Simple',
        description: 'Balanced approach with moderate aggression and coordination'
      },
      {
        type: 'aggressive',
        name: 'Aggressive',
        description: 'High aggression, quick expansion, risky attacks'
      },
      {
        type: 'defensive',
        name: 'Defensive',
        description: 'Conservative, focuses on defense and safe expansion'
      },
      {
        type: 'economic',
        name: 'Economic',
        description: 'Prioritizes growth and high-value territories'
      },
      {
        type: 'swarm',
        name: 'Swarm',
        description: 'Coordinated multi-unit attacks for overwhelming force'
      }
    ];
  }
}