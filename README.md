# Cell Conquest Game

A web-based strategy game where you control cells and conquer territories.

## Game Mechanics

- Start with a single cell that generates units over time
- Connect cells by dragging from one to another
- Send units automatically along paths to conquer neutral or enemy cells
- Conquer all enemy cells to win

## How to Play

1. Click on one of your cells (green) to select it
2. Click on another cell to create a path between them
3. Units will automatically transfer along the path
4. When your units reach an enemy or neutral cell, they will attack it
5. Capture all enemy cells to win!

## Development

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Setup

```bash
# Clone the repository
git clone https://github.com/your-username/cellm.git
cd cellm

# Install dependencies
npm install

# Start development server
npm start
```

### Building for Production

```bash
npm run build
```

This will create optimized files in the `dist` directory.

## Technologies Used

- React
- TypeScript
- Webpack