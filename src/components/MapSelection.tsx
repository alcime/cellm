import React, { useState } from 'react';
import { MapDefinition } from '../types';

interface MapSelectionProps {
  availableMaps: MapDefinition[];
  currentMapId?: string;
  onSelectMap: (mapId: string) => void;
  onPlayRandom: () => void;
}

const MapSelection: React.FC<MapSelectionProps> = ({
  availableMaps,
  currentMapId,
  onSelectMap,
  onPlayRandom
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  const handleSelectMap = (mapId: string) => {
    onSelectMap(mapId);
    setIsOpen(false);
  };

  const handlePlayRandom = () => {
    onPlayRandom();
    setIsOpen(false);
  };

  // Get current map name
  const currentMap = availableMaps.find(map => map.id === currentMapId);
  const currentMapName = currentMap ? currentMap.name : 'Random Map';

  return (
    <div className="map-selection">
      <button 
        className="map-selection-button"
        onClick={toggleOpen}
        style={{
          padding: '8px 16px',
          backgroundColor: '#2196F3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minWidth: '150px'
        }}
      >
        <span>Map: {currentMapName}</span>
        <span style={{ marginLeft: '8px' }}>▼</span>
      </button>

      {isOpen && (
        <div className="map-selection-dropdown" style={{
          position: 'absolute',
          top: '100%',
          left: '0',
          backgroundColor: 'white',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
          borderRadius: '4px',
          zIndex: 100,
          width: '250px',
          marginTop: '5px'
        }}>
          <div style={{ padding: '10px' }}>
            <h4 style={{ margin: '0 0 10px 0' }}>Select Map</h4>
            
            {/* Random map option */}
            <div 
              onClick={handlePlayRandom}
              className="map-option" 
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                marginBottom: '5px',
                backgroundColor: !currentMapId ? '#e3f2fd' : 'transparent',
                borderLeft: !currentMapId ? '4px solid #2196F3' : 'none',
                paddingLeft: !currentMapId ? '8px' : '12px',
                transition: 'all 0.2s'
              }}
            >
              <div>Random Map</div>
              <div style={{ fontSize: '0.8em', opacity: 0.7 }}>Randomly generated map</div>
            </div>
            
            {/* Predefined map options */}
            {availableMaps.map(map => (
              <div 
                key={map.id}
                onClick={() => handleSelectMap(map.id)}
                className="map-option" 
                style={{
                  padding: '8px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginBottom: '5px',
                  backgroundColor: currentMapId === map.id ? '#e3f2fd' : 'transparent',
                  borderLeft: currentMapId === map.id ? '4px solid #2196F3' : 'none',
                  paddingLeft: currentMapId === map.id ? '8px' : '12px',
                  transition: 'all 0.2s'
                }}
              >
                <div>{map.name}</div>
                <div style={{ fontSize: '0.8em', opacity: 0.7 }}>{map.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MapSelection;