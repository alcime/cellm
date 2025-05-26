# Cell Conquest Game

A strategic cell-based game built with React and TypeScript featuring a clean, extensible game engine.

## Features

- **Clean Architecture**: Modular, extensible game engine
- **Multiple Cell Types**: Standard, Factory, Fortress, Teleporter
- **Real-time Gameplay**: Unit production, movement, and combat
- **Perfect Coordinate System**: No alignment issues between visuals and logic
- **Strategy Game Ready**: Built for easy extension with resources, diplomacy, tech trees

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Game Mechanics

### Cell Types

- **Standard**: Basic cell with normal production and defense
- **Factory** (⚙️): Produces units 2x faster
- **Fortress** (🛡️): 50% defensive bonus against attacks  
- **Teleporter** (🌀): Instantly transports units to connected teleporter

### Gameplay

1. Click on your cells (green) to select them
2. Click on target cells to send 60% of your units
3. Capture enemy cells by overwhelming their defenses
4. Win by capturing all enemy cells

## Development

### Clean Engine Architecture

The game features a completely rewritten engine focused on:
- **Consistent Coordinates**: Simple, predictable positioning system
- **Event-Driven**: Extensible event system for game mechanics
- **Type Safety**: Full TypeScript support with clear interfaces
- **Strategy Ready**: Built-in support for resources, diplomacy, technology

### Project Structure

```
src/
├── App.tsx           # Main application component
├── engine/           # Game engine core
│   ├── GameEngine.ts # Central game logic and state management
│   ├── types.ts      # TypeScript interfaces and types
│   ├── index.ts      # Public API exports
│   └── components/   # React components
│       ├── Game.tsx  # Main game component
│       ├── Cell.tsx  # Cell rendering
│       ├── Unit.tsx  # Unit rendering  
│       └── Path.tsx  # Path visualization
├── index.tsx         # Application entry point
└── styles.css        # Global styles
```

### Extending for Strategy Games

The engine is designed to easily support:

```typescript
// Resources and economy
resources: { [playerId: string]: { [resourceType: string]: number } }

// Technology and research  
research: { [playerId: string]: string[] }

// Diplomacy between players
diplomacy: { [key: string]: 'ally' | 'enemy' | 'neutral' }

// Multiple unit types
unitType: 'infantry' | 'vehicle' | 'aircraft'

// Building construction
buildings: string[]
```

## Building for Production

```bash
npm run build
```

This creates optimized files in the `dist` directory.

## Architecture Benefits

✅ **No coordinate alignment bugs** - Everything uses the same simple system  
✅ **Easy to extend** - Clean interfaces and event system  
✅ **Type safe** - Full TypeScript coverage  
✅ **Predictable** - Clear separation of concerns  
✅ **Testable** - Modular architecture  

## Technologies Used

- React 18
- TypeScript
- Webpack 5
- Clean Architecture Principles