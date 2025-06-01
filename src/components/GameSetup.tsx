import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { StrategyType } from '../engine/AIStrategyManager';
import { Play, Settings, Info } from 'lucide-react';

interface GameSetupProps {
  currentStrategy: StrategyType;
  onStrategyChange: (strategy: StrategyType) => void;
  onStartGame: () => void;
  availableStrategies: { type: StrategyType; name: string; description: string }[];
}

const strategyDescriptions: Record<StrategyType, string> = {
  simple: "Balanced approach with standard aggression and expansion",
  aggressive: "High aggression strategy that prioritizes rapid attacks",
  defensive: "Conservative strategy focusing on defense and safe expansion", 
  economic: "Growth-focused strategy targeting high-value territories",
  swarm: "Coordinated multi-unit attacks for overwhelming force"
};

export const GameSetup: React.FC<GameSetupProps> = ({
  currentStrategy,
  onStrategyChange,
  onStartGame,
  availableStrategies
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-6xl font-bold text-white tracking-tight">
            Cell<span className="text-purple-400">M</span>
          </h1>
          <p className="text-xl text-slate-300">
            Strategic cellular warfare simulator
          </p>
        </div>

        {/* Main Setup Card */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-white flex items-center justify-center gap-2">
              <Settings className="h-6 w-6" />
              Game Setup
            </CardTitle>
            <CardDescription className="text-slate-300">
              Choose your AI strategy and start playing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Strategy Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-white">AI Strategy</label>
              <Select value={currentStrategy} onValueChange={onStrategyChange}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Select an AI strategy" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {availableStrategies.map((strategy) => (
                    <SelectItem 
                      key={strategy.type} 
                      value={strategy.type}
                      className="text-white hover:bg-slate-700"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{strategy.name}</span>
                        <span className="text-xs text-slate-400">{strategy.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Strategy Description */}
              <div className="p-4 bg-purple-500/20 rounded-lg border border-purple-400/30">
                <p className="text-sm text-purple-100">
                  <Info className="h-4 w-4 inline mr-2" />
                  {strategyDescriptions[currentStrategy]}
                </p>
              </div>
            </div>

            {/* Start Button */}
            <Button 
              onClick={onStartGame}
              size="lg"
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-4 text-lg"
            >
              <Play className="h-5 w-5 mr-2" />
              Start Game
            </Button>
          </CardContent>
        </Card>

        {/* Game Instructions */}
        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardHeader>
            <CardTitle className="text-lg text-white">How to Play</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-300">
            <p>• Click your green cells, then click a target to send 60% of units</p>
            <p>• ⚙️ Factory cells provide 2x production rate</p>
            <p>• 🛡️ Fortress cells provide 1.5x defense bonus</p>
            <p>• Battle duration varies from 4s (2x advantage) to 10s (balanced forces)</p>
            <p>• You can enable auto-play to watch AI vs AI battles</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};