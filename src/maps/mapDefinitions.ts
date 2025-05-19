import { MapDefinition, CellOwner, CellType } from '../types';
import { generateId } from '../utils/helpers';

// Helper function to ensure window dimensions are available (or use defaults)
const getWindowDimensions = (): { width: number, height: number } => {
  if (typeof window !== 'undefined') {
    return {
      width: window.innerWidth,
      height: window.innerHeight
    };
  }
  return { width: 1024, height: 768 }; // Default fallback dimensions
};

// Predefined maps collection
export const predefinedMaps: MapDefinition[] = [
  // Basic duel map (2 players)
  {
    id: 'basic_duel',
    name: 'Basic Duel',
    description: 'A simple 1v1 map with a few neutral cells',
    defaultUnitGrowthRate: 1,
    cells: [
      // Player's starting cell (left side)
      {
        x: getWindowDimensions().width * 0.2,
        y: getWindowDimensions().height * 0.5,
        initialUnits: 10,
        owner: 'player',
        cellType: 'standard'
      },
      // Enemy's starting cell (right side)
      {
        x: getWindowDimensions().width * 0.8,
        y: getWindowDimensions().height * 0.5,
        initialUnits: 10,
        owner: 'enemy',
        cellType: 'standard'
      },
      // Center factory (slightly higher production)
      {
        x: getWindowDimensions().width * 0.5,
        y: getWindowDimensions().height * 0.5,
        initialUnits: 5,
        owner: 'neutral',
        cellType: 'factory',
        factoryMultiplier: 2
      },
      // Two neutral cells (top and bottom)
      {
        x: getWindowDimensions().width * 0.5,
        y: getWindowDimensions().height * 0.25,
        initialUnits: 3,
        owner: 'neutral',
        cellType: 'standard'
      },
      {
        x: getWindowDimensions().width * 0.5,
        y: getWindowDimensions().height * 0.75,
        initialUnits: 3,
        owner: 'neutral',
        cellType: 'standard'
      }
    ]
  },
  
  // Fortress battle (asymmetric map)
  {
    id: 'fortress_battle',
    name: 'Fortress Battle',
    description: 'Player must capture an enemy fortress protected by satellite cells',
    defaultUnitGrowthRate: 1,
    cells: [
      // Player's starting cell
      {
        x: getWindowDimensions().width * 0.2,
        y: getWindowDimensions().height * 0.5,
        initialUnits: 15,
        owner: 'player',
        cellType: 'factory',
        factoryMultiplier: 1.5
      },
      // Enemy's main fortress (high defense)
      {
        x: getWindowDimensions().width * 0.8,
        y: getWindowDimensions().height * 0.5,
        initialUnits: 20,
        owner: 'enemy',
        cellType: 'fortress',
        fortressDefense: 2
      },
      // Enemy supporting cells (triangular formation)
      {
        x: getWindowDimensions().width * 0.7,
        y: getWindowDimensions().height * 0.3,
        initialUnits: 8,
        owner: 'enemy',
        cellType: 'standard'
      },
      {
        x: getWindowDimensions().width * 0.7,
        y: getWindowDimensions().height * 0.7,
        initialUnits: 8,
        owner: 'enemy',
        cellType: 'standard'
      },
      // Neutral cells
      {
        x: getWindowDimensions().width * 0.5,
        y: getWindowDimensions().height * 0.3,
        initialUnits: 5,
        owner: 'neutral',
        cellType: 'standard'
      },
      {
        x: getWindowDimensions().width * 0.5,
        y: getWindowDimensions().height * 0.7,
        initialUnits: 5,
        owner: 'neutral',
        cellType: 'standard'
      },
      {
        x: getWindowDimensions().width * 0.4,
        y: getWindowDimensions().height * 0.5,
        initialUnits: 7,
        owner: 'neutral',
        cellType: 'factory',
        factoryMultiplier: 1.5
      }
    ]
  },
  
  // Teleporter network map
  {
    id: 'teleporter_network',
    name: 'Teleporter Network',
    description: 'Use teleporters to navigate a complex network of cells',
    defaultUnitGrowthRate: 1,
    cells: [
      // Player's starting cell
      {
        x: getWindowDimensions().width * 0.1,
        y: getWindowDimensions().height * 0.5,
        initialUnits: 12,
        owner: 'player',
        cellType: 'standard'
      },
      // Enemy's starting cell
      {
        x: getWindowDimensions().width * 0.9,
        y: getWindowDimensions().height * 0.5,
        initialUnits: 12,
        owner: 'enemy',
        cellType: 'standard'
      },
      // Teleporter pair 1 (horizontal edges)
      {
        x: getWindowDimensions().width * 0.25,
        y: getWindowDimensions().height * 0.5,
        initialUnits: 3,
        owner: 'neutral',
        cellType: 'teleporter',
        teleporterPair: 3 // Paired with index 3
      },
      {
        x: getWindowDimensions().width * 0.75,
        y: getWindowDimensions().height * 0.5,
        initialUnits: 3,
        owner: 'neutral',
        cellType: 'teleporter',
        teleporterPair: 2 // Paired with index 2
      },
      // Teleporter pair 2 (vertical edges)
      {
        x: getWindowDimensions().width * 0.5,
        y: getWindowDimensions().height * 0.25,
        initialUnits: 3,
        owner: 'neutral',
        cellType: 'teleporter',
        teleporterPair: 5 // Paired with index 5
      },
      {
        x: getWindowDimensions().width * 0.5,
        y: getWindowDimensions().height * 0.75,
        initialUnits: 3,
        owner: 'neutral',
        cellType: 'teleporter',
        teleporterPair: 4 // Paired with index 4
      },
      // Center factory - high value target
      {
        x: getWindowDimensions().width * 0.5,
        y: getWindowDimensions().height * 0.5,
        initialUnits: 10,
        owner: 'neutral',
        cellType: 'factory',
        factoryMultiplier: 2.5
      },
      // Additional neutral cells
      {
        x: getWindowDimensions().width * 0.35,
        y: getWindowDimensions().height * 0.35,
        initialUnits: 5,
        owner: 'neutral',
        cellType: 'standard'
      },
      {
        x: getWindowDimensions().width * 0.65,
        y: getWindowDimensions().height * 0.35,
        initialUnits: 5,
        owner: 'neutral',
        cellType: 'standard'
      },
      {
        x: getWindowDimensions().width * 0.35,
        y: getWindowDimensions().height * 0.65,
        initialUnits: 5,
        owner: 'neutral',
        cellType: 'standard'
      },
      {
        x: getWindowDimensions().width * 0.65,
        y: getWindowDimensions().height * 0.65,
        initialUnits: 5,
        owner: 'neutral',
        cellType: 'standard'
      }
    ]
  },
  
  // Grid map (tactical positioning)
  {
    id: 'grid_map',
    name: 'Grid Battle',
    description: 'A grid-based map with strategic positions',
    defaultUnitGrowthRate: 1,
    cells: [
      // Player's corner
      {
        x: getWindowDimensions().width * 0.2,
        y: getWindowDimensions().height * 0.2,
        initialUnits: 15,
        owner: 'player',
        cellType: 'standard'
      },
      // Enemy's corner
      {
        x: getWindowDimensions().width * 0.8,
        y: getWindowDimensions().height * 0.8,
        initialUnits: 15,
        owner: 'enemy',
        cellType: 'standard'
      },
      // Grid of neutral cells (3x3)
      // Top row
      {
        x: getWindowDimensions().width * 0.2,
        y: getWindowDimensions().height * 0.5,
        initialUnits: 5,
        owner: 'neutral',
        cellType: 'standard'
      },
      {
        x: getWindowDimensions().width * 0.5,
        y: getWindowDimensions().height * 0.5,
        initialUnits: 8,
        owner: 'neutral',
        cellType: 'factory',
        factoryMultiplier: 1.5
      },
      {
        x: getWindowDimensions().width * 0.8,
        y: getWindowDimensions().height * 0.5,
        initialUnits: 5,
        owner: 'neutral',
        cellType: 'standard'
      },
      // Middle row
      {
        x: getWindowDimensions().width * 0.5,
        y: getWindowDimensions().height * 0.2,
        initialUnits: 5,
        owner: 'neutral',
        cellType: 'standard'
      },
      {
        x: getWindowDimensions().width * 0.5,
        y: getWindowDimensions().height * 0.8,
        initialUnits: 5,
        owner: 'neutral',
        cellType: 'standard'
      },
      // Corner fortresses
      {
        x: getWindowDimensions().width * 0.2,
        y: getWindowDimensions().height * 0.8,
        initialUnits: 10,
        owner: 'neutral',
        cellType: 'fortress',
        fortressDefense: 1.5
      },
      {
        x: getWindowDimensions().width * 0.8,
        y: getWindowDimensions().height * 0.2,
        initialUnits: 10,
        owner: 'neutral',
        cellType: 'fortress',
        fortressDefense: 1.5
      }
    ]
  }
];

// Function to get a map by ID
export function getMapById(mapId: string): MapDefinition | undefined {
  return predefinedMaps.find(map => map.id === mapId);
}

// Function to get a random map
export function getRandomMap(): MapDefinition {
  const randomIndex = Math.floor(Math.random() * predefinedMaps.length);
  return predefinedMaps[randomIndex];
}