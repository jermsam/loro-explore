import {$, component$, useOnDocument, useSignal} from '@builder.io/qwik';
import type {DocumentHead} from '@builder.io/qwik-city';
import {sayHi} from '@loro-explore/shared/utils';
import cytoscape from 'cytoscape';
import {AkarIconsGithubOutlineFill} from '@loro-explore/shared/icons';
import {GreetLayout} from '@loro-explore/shared/layouts';

export default component$(() => {
  const greeting = useSignal<string>('');
  const view = useSignal<HTMLDivElement>();
  
  
  useOnDocument('DOMContentLoaded', $(()=>{
    greeting.value = sayHi('Cytoscape!');
    
    // Initialize Cytoscape
    const cy = cytoscape({
      container: view.value,
      elements: [
        // list of initial nodes and edges
        { data: { id: 'A', label: 'A' }, position: { x: 250, y: 100 } },
        { data: { id: 'B', label: 'B' }, position: { x: 450, y: 200 } },
        { data: { id: 'C', label: 'C' }, position: { x: 300, y: 400 } },
        { data: { id: 'D', label: 'D' }, position: { x: 100, y: 200 } },
        { data: { source: 'A', target: 'B' } },
      ],
      style: [
        {
          selector: 'node',
          style: {
            shape: 'rectangle',
            width: '100px',
            height: '40px',
            'background-color': '#fff',
            'border-color': '#333',
            'border-width': '1px',
            label: 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '14px',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 2,
            'line-color': '#333',
            'target-arrow-color': '#333',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
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
      ],
      layout: {
        name: 'preset', // Use preset to allow manual positioning
        padding: 50,
      },
      userZoomingEnabled: true,
      userPanningEnabled: true,
    });
    // Enable dragging of nodes
    cy.nodes().on('drag', (event) => {
      const node = event.target;
      console.log(`Node ${node.id()} dragged to: `, node.position());
    });
    
    // Add event listener for clicking on nodes or edges
    cy.on('tap', 'node', (event) => {
      const node = event.target;
      alert(`You clicked on ${node.data('label')}`);
    });
    
    // Add ports to nodes
    const addPorts = (nodeId: string, positions: { x: number; y: number }[]) => {
      positions.forEach((pos, i) => {
        cy.add({
          group: 'nodes',
          data: { id: `${nodeId}_port_${i}`, parent: nodeId },
          position: { x: pos.x, y: pos.y },
          classes: 'port',
        });
      });
    };
    
    addPorts('A', [
      { x: 250, y: 120 },
      { x: 350, y: 120 },
    ]); // Add ports for A
    addPorts('B', [
      { x: 450, y: 220 },
      { x: 550, y: 220 },
    ]); // Add ports for B
    addPorts('C', [
      { x: 300, y: 420 },
      { x: 400, y: 420 },
    ]); // Add ports for C
    addPorts('D', [
      { x: 100, y: 220 },
      { x: 200, y: 220 },
    ]);
  }))
  
  
  return (
    <GreetLayout greeting={greeting.value}>
      <div q:slot={'header'} class={'flex'}>
        <a href="https://github.com/jermsam/loro-explore/tree/main/packages/cytoscape-qwik/src/routes/cytoscape-basics/index.tsx" target="_blank">
          <AkarIconsGithubOutlineFill class={'cursor-pointer text-2xl'}/>
        </a>
      </div>
      <div class={'w-full h-5/6 border bg-amber-50 border-gray-300 rounded-lg shadow-md'} ref={view}/>
    </GreetLayout>
  );
});

export const head: DocumentHead = {
  title: 'Cytoscape | Qwik',
  meta: [
    {
      name: 'description',
      content: 'Qwik site description',
    },
  ],
};
