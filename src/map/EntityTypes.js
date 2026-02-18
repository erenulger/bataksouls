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
    border: false,        // walls tile together — borders on overlapping segments create internal lines
    triggerable: false,
    label: 'Wall',
  },
  tree: {
    color: '#2d6a4f',
    borderColor: '#1b4332',
    solid: true,
    border: true,         // standalone entity — border makes it visually distinct
    triggerable: false,
    label: 'Tree',
  },
  enemy: {
    color: '#c1121f',
    borderColor: '#780000',
    solid: false,         // player walks through them — collision handled by TriggerSystem
    border: true,
    triggerable: true,    // TriggerSystem fires combatStart on contact
    label: 'Enemy',
  },
  // Example future triggerable types:
  // npc:   { color: '#4cc9f0', borderColor: '#4361ee', solid: false, border: true, triggerable: true,  label: 'NPC'   },
  // chest: { color: '#e9c46a', borderColor: '#f4a261', solid: true,  border: true, triggerable: false, label: 'Chest' },
};
