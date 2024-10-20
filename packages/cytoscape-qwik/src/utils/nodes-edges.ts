/**
 * Elements JSON https://js.cytoscape.org/#notation/elements-json
 */

import type {EdgeDefinition, NodeDefinition} from 'cytoscape';

export const nodes: NodeDefinition[] = [
  {
    position: {x: 0, y: 9},
    data: {id: '1', label: 'A'},
  },
  {
    position: {x: 125, y: 125},
    data: {id: '2', label: 'B'},
  },
  {
    position: {x: 0, y: 250},
    data: {id: '3', label: 'C'},
  },
  {
    position: {x: -125, y: 125},
    data: {id: '4', label: 'D'},
  },
];

export const edges: EdgeDefinition[] = [
  {
    data: {id: 'e1-2', source: '1', target: '2'},
  },
];


