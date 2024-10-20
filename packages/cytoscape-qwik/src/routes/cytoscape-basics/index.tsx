import {$, component$, noSerialize, NoSerialize, useContext, useOnDocument, useSignal} from '@builder.io/qwik';
import type {DocumentHead} from '@builder.io/qwik-city';
import {sayHi} from '@loro-explore/shared/utils';
import {AkarIconsGithubOutlineFill} from '@loro-explore/shared/icons';
import {GreetLayout} from '@loro-explore/shared/layouts';
import {LightDarkMode} from '@loro-explore/shared/components';
import {edges, nodes} from '~/utils/nodes-edges';
import CytoscapeComponent from '../../components/cytoscape-component';
import {EdgeDefinition, NodeDefinition} from 'cytoscape';
import {DarkModeContext} from '~/routes/layout';

export default component$(() => {
  const darkMode = useContext(DarkModeContext);
  const greeting = useSignal<string>('');
  const cyNodes = useSignal<NoSerialize<NodeDefinition[]>>(noSerialize([]));
  const cyEdges = useSignal<NoSerialize<EdgeDefinition[]>>(noSerialize([]));
  
  useOnDocument('DOMContentLoaded', $(() => {
    greeting.value = sayHi('Cytoscape!');
    cyNodes.value = noSerialize(nodes);
    cyEdges.value = noSerialize(edges);
  }));
  
  const onNodesChange = $((nodes: any) => {
    console.log({nodes});
  });
  const onEdgeChange = $((edges: any) => {
    console.log({edges});
  });
  
  
  return (
   <div class={'w-full bg-gray-50 dark:text-teal-50 dark:bg-[#212121]'}>
     <GreetLayout
       greeting={greeting.value}
     >
       <div q:slot={'header'} class={'flex w-full items-center justify-between'}>
         <a
           href="https://github.com/jermsam/loro-explore/tree/main/packages/cytoscape-qwik/src/routes/cytoscape-basics/index.tsx"
           target="_blank">
           <AkarIconsGithubOutlineFill class={'cursor-pointer text-2xl'}/>
         </a>
  
         <LightDarkMode
           mode={darkMode.value}
           onModeChange$={(mode) => darkMode.value = mode}
         />
       </div>
       <div class={'w-full h-5/6 border bg-white dark:bg-[#181818] border-gray-300 rounded-lg shadow-md'}>
         <CytoscapeComponent
           nodes={cyNodes.value}
           edges={cyEdges.value}
           onNodesChange$={onNodesChange}
           onEdgesChange$={onEdgeChange}
           onConnect$={(params) => {
             console.log({params});
           }}
         />
       </div>
     </GreetLayout>
   </div>
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
