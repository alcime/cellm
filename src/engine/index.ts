// Main exports for the cell game engine
export { GameEngine } from './GameEngine';
export { AIStrategy, BaseAIStrategy, SimpleAIStrategy } from './AIStrategy';
export type { IAIStrategy } from './AIStrategy';
export { AIStrategyManager } from './AIStrategyManager';
export type { StrategyType, AIPlayerConfig } from './AIStrategyManager';
export { AggressiveAIStrategy } from './strategies/AggressiveAIStrategy';
export { DefensiveAIStrategy } from './strategies/DefensiveAIStrategy';
export { EconomicAIStrategy } from './strategies/EconomicAIStrategy';
export { SwarmAIStrategy } from './strategies/SwarmAIStrategy';
export * from './types';
export { Game } from './components/Game';
export { Cell } from './components/Cell';
export { Unit } from './components/Unit';
export { Path } from './components/Path';