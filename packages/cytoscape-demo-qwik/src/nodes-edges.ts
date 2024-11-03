export const nodes = [
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

export const edges = [
  {
   data:{
     id: 'e1-2',
     source: '1',
     target: '2',
   }
  },
];


export const stylesheets =
[
  {
    selector: 'node',
    style: {
      'background-color': '#a2b2c3',
      'label': 'data(label)',
      'text-valign': 'center',
      'text-halign': 'center',
      'width': '80px',
      'height': '40px',
      'border-width': 2,
      'border-color': '#a2b2c3',
      'color': '#fff',
      'font-size': '12px',
      // Add smooth transition for position
      'transition-property': 'position',
      'transition-duration': '0.2s', // Adjust as needed
      'transition-timing-function': 'ease-in-out',
    },
  },
  {
    selector: 'edge',
    style: {
      'curve-style': 'unbundled-bezier',
      'control-point-distance': 40,
      'control-point-weight': 0.5,
      'width': 2,
      'line-color': '#a2b2c3',
    },
  },
  {
    selector: '.port',
    style: {
      'background-color': '#333',
      width: '10px',
      height: '10px',
      shape: 'ellipse',
      'border-width': 0,
    },
  },
]
