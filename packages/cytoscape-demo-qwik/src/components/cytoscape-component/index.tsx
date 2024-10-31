import {
  $,
  component$,
  QRL,
  useOn,
  useOnDocument,
  useSignal,
} from '@builder.io/qwik';
import cytoscape, {type EdgeDefinition, type ElementsDefinition, type NodeDefinition} from 'cytoscape';
import {getEffectiveBackgroundColor, isDarkColor} from '@loro-explore/shared/utils';
export interface FitViewportOptions {
  padding?: number;   // Padding around the viewport
  zoom?: number;      // Optional zoom level
  minZoom?: number;   // Minimum zoom level
  maxZoom?: number;   // Maximum zoom level
}
export type Node = Pick<NodeDefinition, 'position' | 'data'>
export type Edge = Pick<EdgeDefinition,  'data'>
export interface CytoscapeComponent {
  nodes: Node[];
  edges: Edge[];
  className?: string;
  onNodesChange$?: QRL<(nodes: Node[]) => void>;
  onEdgesChange$?: QRL<(edges: Edge[]) => void>;
  onConnect$?: QRL<(params: any) => void>;
  fitViewOptions?: FitViewportOptions;
  fitView?: boolean;
}
export function useContainerElementHook() {
  const canvas = useSignal<HTMLDivElement>();
  const zoomLevel = useSignal<number>(1); // Start at 100% zoom
  const baseGridSize = useSignal<number>(20); // Smaller initial grid size
  const lastBgColor = useSignal<string>('');
  useOn(
    'wheel',
    $((event) => {
      if (!canvas.value) return;
      event.preventDefault();
      zoomLevel.value += event.deltaY * -0.001;
      zoomLevel.value = Math.min(Math.max(0.5, zoomLevel.value), 3); // Limit zoom between 50% and 300%
      canvas.value.style.backgroundSize = `${baseGridSize.value * zoomLevel.value}px ${baseGridSize.value * zoomLevel.value}px`;
    }));
  
  const setDotColor = $((currentBgColor: string) => {
    if (!canvas.value) return;
    // Determine dot color based on background color luminance
    const dotColor = isDarkColor(currentBgColor) ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)';
    // Update the background image to change dot color
    canvas.value.style.backgroundSize = `${baseGridSize.value * zoomLevel.value}px ${baseGridSize.value * zoomLevel.value}px`;
    canvas.value.style.backgroundImage = `
          radial-gradient(circle, ${dotColor} 1px, transparent 1px),
          radial-gradient(circle, ${dotColor} 1px, transparent 1px)
        `;
  });
  
  useOnDocument('darkModeToggle', $(
    async (event) => {
      if (!canvas.value) return;
      if ('detail' in event) {
        const currentBgColor = getEffectiveBackgroundColor(canvas.value);
        if (currentBgColor !== lastBgColor.value) {
          lastBgColor.value = currentBgColor; // Update the last background color
          await setDotColor(currentBgColor);
        }
      }
    },
  ));
  
  useOnDocument('load', $(async () => {
    if (!canvas.value) return;
    lastBgColor.value = getEffectiveBackgroundColor(canvas.value);
    await setDotColor(lastBgColor.value);
  }));
  
  return canvas;
}
const initCytoscape = $((canvas: HTMLDivElement, elements: ElementsDefinition) => {
  return cytoscape({
    container: canvas,
    elements: elements,
    style: [
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
        },
      },
      {
        selector: 'edge',
        style: {
          'curve-style': 'unbundled-bezier', // Smooth, self-adjusting curves
          'control-point-distance': 40, // Adjust for a better curve
          'control-point-weight': 0.5, // Center the curve
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
    ],
    layout: {
      name: 'grid',
      fit: true,
      animate: true,
    },
    userZoomingEnabled: true,
    userPanningEnabled: true,
  });
});
export default component$<CytoscapeComponent>(({
                                                 nodes: nodeProps,
                                                 edges: edgeProps,
                                                 fitViewOptions,
                                                 className,
                                                 onNodesChange$,
                                                 onEdgesChange$,
                                                 onConnect$,
                                               }) => {
  const canvas = useContainerElementHook();

  useOnDocument('DOMContentLoaded', $(async () => {
    if (!canvas.value) return;
    const newElements = {
      nodes: nodeProps,
      edges: edgeProps,
    };
    const cy = await initCytoscape(canvas.value, newElements);
    // fit in space
    cy.fit(undefined, fitViewOptions?.padding || 0.4);
    // Handle nodes
    cy.on('dragfree', 'node', () => {
      const nodes = cy.nodes().map((node) => ({
        data: node.data(),
        position: node.position(),
      }));
      onNodesChange$ && onNodesChange$(nodes);
    });
    
    // Handle edges
    cy.on('add', 'edge', () => {
      const edges = cy?.edges().map((edge) => ({
        data: edge.data(),
      }));
      onEdgesChange$ && onEdgesChange$(edges);
    });
    
    // Handle connections
    
    cy.on('tap', 'node', (event) => {
      const sourceNode = event.target;
      if (sourceNode) {
        cy.on('tap', 'node', (targetEvent) => {
          const targetNode = targetEvent.target;
          const params = {source: sourceNode.id(), target: targetNode.id()};
          onConnect$ && onConnect$(params);
        });
      }
    });
  }));
  
  
  return (
      <div class={`w-full h-full bg-dotted-grid ${className || ''}`} ref={canvas}/>
  );
});
