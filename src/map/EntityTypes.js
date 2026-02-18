/**
 * EntityTypes.js
 * Registry of all entity types and their visual/collision properties.
 *
 * To add a new entity type:
 *   1. Add an entry here with color, solid, and label.
 *   2. Add instances to data/map/sampleMap.js.
 *   No other files need to change.
 */

export const EntityTypes = {
  wall: {
    color: '#7c7c7c',
    borderColor: '#555',
    solid: true,
    border: false,   // walls tile together — borders on overlapping segments create internal lines
    label: 'Wall',
  },
  tree: {
    color: '#2d6a4f',
    borderColor: '#1b4332',
    solid: true,
    border: true,    // standalone entity — border makes it visually distinct
    label: 'Tree',
  },
  // Example future types (uncomment to enable):
  // water: { color: '#48cae4', borderColor: '#023e8a', solid: false, border: false, label: 'Water' },
  // chest: { color: '#e9c46a', borderColor: '#f4a261', solid: true,  border: true,  label: 'Chest' },
};
