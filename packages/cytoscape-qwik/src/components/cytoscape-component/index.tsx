import {$, component$, NoSerialize, QRL, Signal, useOn, useOnDocument, useSignal} from '@builder.io/qwik';
import {Core, type EdgeDefinition, type NodeDefinition} from 'cytoscape';
import {getEffectiveBackgroundColor, isDarkColor} from '@loro-explore/shared/utils';


export interface FitViewportOptions {
  padding?: number;   // Padding around the viewport
  zoom?: number;      // Optional zoom level
  minZoom?: number;   // Minimum zoom level
  maxZoom?: number;   // Maximum zoom level
}

export interface CytoscapeComponent {
  nodes: NoSerialize<NodeDefinition[]>;
  edges: NoSerialize<EdgeDefinition[]>;
  className?: string;
  onNodesChange$?: QRL<(nodes: NoSerialize<NodeDefinition[]>) => void>;
  onEdgesChange$?: QRL<(edges: NoSerialize<EdgeDefinition[]>) => void>;
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
  
  useOnDocument('darkModeToggle', $(
    async (event) => {
      if (!canvas.value) return;
      if ('detail' in event) {
        const currentBgColor = getEffectiveBackgroundColor(canvas.value);
        if (currentBgColor !== lastBgColor.value) {
          lastBgColor.value = currentBgColor; // Update the last background color
          
          // Determine dot color based on background color luminance
          const dotColor = isDarkColor(currentBgColor) ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)';
          console.log({dotColor});
          // Update the background image to change dot color
          canvas.value.style.backgroundImage = `
          radial-gradient(circle, ${dotColor} 1px, transparent 1px),
          radial-gradient(circle, ${dotColor} 1px, transparent 1px)
        `;
        }
      }
    },
  ));
  
  useOnDocument('load', $(() => {
    
    if (!canvas.value) return;
    
    lastBgColor.value = getEffectiveBackgroundColor(canvas.value);
    
    // Setup MutationObserver to track changes in 'style' attribute
    const observer = new MutationObserver(() => {
      if (!canvas.value) return;
      // const currentBgColor = getEffectiveBackgroundColor(canvas.value);
      
      // Update only if background color has changed
      
    });
    
    // Observe changes to the 'style' attribute
    observer.observe(canvas.value, {attributes: true, attributeFilter: ['style']});
    
    
    // Cleanup observer when component is unmounted
    return () => observer.disconnect();
  }));
  
  return canvas;
}

export function useCytoscapeComponentHook(canvas: Signal<HTMLDivElement | undefined>) {
  const cyInstance = useSignal<NoSerialize<Core>>();
  // if (!cyInstance.value && view.value) {
  //   const serializedNodes = props.nodes?.values() as ArrayIterator<NodeDefinition>
  //   const serializedEdges = props.edges?.values() as ArrayIterator<EdgeDefinition>
  //   const cy = cytoscape({
  //     container: view.value,
  //     elements: {
  //       nodes: Array.from(serializedNodes),
  //       edges: Array.from(serializedEdges),
  //     },
  //     style: [
  //       {
  //         selector: 'node',
  //         style: {
  //           shape: 'rectangle',
  //           width: '100px',
  //           height: '40px',
  //           'background-color': '#fff',
  //           'border-color': '#333',
  //           'border-width': '1px',
  //           label: 'data(label)',
  //           'text-valign': 'center',
  //           'text-halign': 'center',
  //           'font-size': '14px',
  //         },
  //       },
  //       {
  //         selector: 'edge',
  //         style: {
  //           width: 2,
  //           'line-color': '#333',
  //           'target-arrow-color': '#333',
  //           'target-arrow-shape': 'triangle',
  //           'curve-style': 'bezier',
  //         },
  //       },
  //       {
  //         selector: '.port',
  //         style: {
  //           'background-color': '#333',
  //           width: '10px',
  //           height: '10px',
  //           shape: 'ellipse',
  //           'border-width': 0,
  //         },
  //       },
  //     ],
  //     layout: {
  //       name: 'preset', // Use preset to allow manual positioning
  //       padding: 50,
  //     },
  //     userZoomingEnabled: true,
  //     userPanningEnabled: true,
  //   })
  //   cyInstance.value = noSerialize(cy);
  //
  //   // Handle nodes
  //   cyInstance.value?.on('dragfree', 'node', async (e) => {
  //     if (!props.onNodesChange$) return;
  //     const nodes = cyInstance.value?.nodes().map((node) => ({
  //       data: node.data(),
  //       position: node.position(),
  //     }));
  //     console.log(nodes);
  //     // await props.onNodesChange(nodes || []);
  //   });
  //   // Handle edges
  //   cyInstance.value?.on('add', 'edge', async (e) => {
  //     if (!props.onEdgesChange$) return;
  //     const edges = cyInstance.value?.edges().map((edge) => ({
  //       data: edge.data(),
  //     }));
  //     console.log(edges);
  //     // await props.onEdgesChange(edges || []);
  //   });
  //
  //   // Handle connections
  //   if (props.onConnect$) {
  //     cyInstance.value?.on('tap', 'node', (event) => {
  //       const sourceNode = event.target;
  //       if (sourceNode) {
  //         cyInstance.value?.on('tap', 'node', (targetEvent) => {
  //           const targetNode = targetEvent.target;
  //           const params = {source: sourceNode.id(), target: targetNode.id()};
  //           props.onConnect$ && props.onConnect$(params);
  //         });
  //       }
  //     });
  //   }
  //   // Automatically fit the view to the graph when rendered
  //   if (props.fitView) {
  //     cyInstance.value?.fit(undefined, props.fitViewOptions?.padding || 0.4);
  //   }
  // } else if (cyInstance.value) {
  //   // If Cytoscape already exists, update nodes and edges
  //   cyInstance.value.json({
  //     elements: {
  //       nodes: props.nodes,
  //       edges: props.edges,
  //     },
  //   });
  //
  //   if (props.fitView) {
  //     cyInstance.value.fit(undefined, props.fitViewOptions?.padding || 0.4);
  //   }
  // }
  return cyInstance;
}

export default component$<CytoscapeComponent>((props) => {
  const canvas = useContainerElementHook();
  const cyInstance = useCytoscapeComponentHook(canvas);
  
  useOnDocument('DOMContentLoaded', $(() => {
    if(!cyInstance.value) return
  }));
  
  return (
    <div class={`w-full h-full bg-dotted-grid ${props.className || ''}`} ref={canvas}/>
  );
});

