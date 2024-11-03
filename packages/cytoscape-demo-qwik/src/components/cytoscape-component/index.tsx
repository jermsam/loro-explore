import {
  component$,
  useSignal,
  useTask$,
  $, NoSerialize, noSerialize, useOn, useOnDocument, QRL,
} from '@builder.io/qwik';
import cytoscape, {Core, CytoscapeOptions, EdgeDefinition, NodeDefinition} from 'cytoscape';
import  diff  from 'deep-diff';
import get from 'lodash/get';
import forEach from 'lodash/forEach';
import { toJson } from './json';
import { patch } from './patch';
import clsx from 'clsx';
import {getEffectiveBackgroundColor, isDarkColor} from '@loro-explore/shared/utils';
import {isServer} from '@builder.io/qwik/build';

export type Node = Pick<NodeDefinition, 'position' | 'data'>
export type Edge = Pick<EdgeDefinition,  'data'>

/**
 * The `CytoscapeComponent` is a Qwik component that allows for the declarative creation
 * and modification of a Cytoscape instance, a graph visualization.
 */

export interface CytoscapeComponentOptions {
  cytoscapeOptions: NoSerialize<CytoscapeOptions>;
  onCytoscapeChanges$?: QRL<(cy: Core) => void>;
  class?: string;
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

const updateCytoscape = async ( cy: any, prevProps: any, newProps: any) => {
    if (!cy) return;
    patch(cy, prevProps, newProps, diff, toJson, get, forEach);
  };



export default component$<CytoscapeComponentOptions>((props) => {
  const containerRef = useContainerElementHook();
  const cySignal = useSignal<NoSerialize<Core>>();
  const prevPropsSignal = useSignal<NoSerialize<CytoscapeOptions>>();
  

  // Initialize Cytoscape instance when the component becomes visible on the client
  useTask$(async ({track}) => {
    track(()=>props.cytoscapeOptions)
    if(isServer) return
    const container = containerRef.value;
    if (!container) return;
    
    const cy = cytoscape({
      container,
      ...props.cytoscapeOptions, // Spread all Cytoscape options from props
    });
    
    cySignal.value = noSerialize(cy);
    await updateCytoscape(cySignal.value, null, props.cytoscapeOptions);
    
    // Call the cy callback with the Cytoscape instance
    if (props.onCytoscapeChanges$) {
      await props.onCytoscapeChanges$(cy);
    }
    
    return () => {
      cy.destroy();
    };
  });
  
  // Update Cytoscape instance when props change
  useTask$(async ({ track }) => {
    const cy = cySignal.value;
    if (!cy) return;
    
    // Track all props
    Object.keys(props).forEach((key) => {
      track(() => props.cytoscapeOptions?.[key as keyof CytoscapeOptions]);
    });
    
    await updateCytoscape(cy, prevPropsSignal.value, props.cytoscapeOptions);
    prevPropsSignal.value = props.cytoscapeOptions;
  });
  
  
  
  return <div ref={containerRef} class={clsx('w-full h-full bg-dotted-grid ', props.class)}  ></div>;
});
