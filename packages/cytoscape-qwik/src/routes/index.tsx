import {
  $,
  component$,
  noSerialize,
  NoSerialize,
  useContext,
  useOnDocument,
  useSignal,
  useTask$,
} from '@builder.io/qwik';
import {DocumentHead, server$} from '@builder.io/qwik-city';
import {sayHi} from '@loro-explore/shared/utils';
import {GreetLayout} from '@loro-explore/shared/layouts';
import {LoroDoc, LoroMap, VersionVector} from 'loro-crdt';
import {
  AkarIconsGithubOutlineFill,
  HugeiconsWifiConnected02,
  HugeiconsWifiDisconnected02,
} from '@loro-explore/shared/icons';
import {nodes as initialNodes, edges as initialEdges} from '~/utils/nodes-edges';

import {EdgeDefinition, NodeDefinition} from 'cytoscape';
import LoroCytoscapeComponent from '~/components/loro-cytoscape-component';
import {DarkModeContext} from '~/routes/layout';
import {LightDarkMode, Switch} from '@loro-explore/shared/components';

export const initOriginDoc = server$(() => {
  const originDoc = new LoroDoc();
  originDoc.setPeerId(0n);
  const loroNodes = originDoc.getList('nodes');
  const loroEdges = originDoc.getList('edges');
  for (let i = 0; i < initialNodes.length; i++) {
    const nodeItem = initialNodes[i];
    const node = loroNodes.insertContainer(i, new LoroMap());
    const pos = node.setContainer('position', new LoroMap());
    const x = nodeItem.position?.x || 0;
    const y = nodeItem.position?.y || 0;
    pos.set('x', x);
    pos.set('y', y);
    const data = node.setContainer('data', new LoroMap());
    const id = nodeItem.data.id;
    const label = nodeItem.data.label;
    data.set('id', id);
    data.set('label', label);
  }
  for (let i = 0; i < initialEdges.length; i++) {
    const edgeItem = initialEdges[i];
    const edge = loroEdges.insertContainer(i, new LoroMap());
    const data = edge.setContainer('data', new LoroMap());
    const id = edgeItem.data.id;
    const source = edgeItem.data.source;
    const target = edgeItem.data.target;
    data.set('id', id);
    data.set('source', source);
    data.set('target', target);
  }
  originDoc.commit();
  return originDoc;
});


export default component$(() => {
  const darkMode = useContext(DarkModeContext);
  const greeting = useSignal<string>('');
  const connected = useSignal<boolean>(true);
  const connectedRef = useSignal<boolean>(true);
  const docA = useSignal<NoSerialize<LoroDoc>>();
  const docB = useSignal<NoSerialize<LoroDoc>>();
  
  const cyNodes = useSignal<NoSerialize<NodeDefinition[]>>(noSerialize(initialNodes));
  const cyEdges = useSignal<NoSerialize<EdgeDefinition[]>>(noSerialize(initialEdges));
  
  useOnDocument('DOMContentLoaded', $(() => {
    greeting.value = sayHi('Loro - Cytoscape!');
  }));
  
  useOnDocument('DOMContentLoaded', $(() => {
    greeting.value = sayHi('Cytoscape!');
  }));
  
  
  useTask$(async () => {
    docA.value = noSerialize(new LoroDoc());
    docA.value?.setPeerId(1n);
    docB.value = noSerialize(new LoroDoc());
    docB.value?.setPeerId(2n);
    const originalDoc = await initOriginDoc();
    const snapshot = originalDoc.export({mode: 'snapshot'}) as Uint8Array;
    
    docA.value?.import(snapshot);
    docB.value?.import(snapshot);
    docA.value?.subscribe((e) => {
      
      if (!connectedRef.value) {
        return;
      }
      setTimeout(() => {
        if (e.by === 'local' && !docA.value?.isDetached()) {
          const docBVersionVector = docB.value?.version() as VersionVector;
          const docASnapshot = docA.value?.export({mode: 'update', start_vv: docBVersionVector}) as Uint8Array;
          docB.value?.import(docASnapshot);
        }
      });
    });
    
    docB.value?.subscribe((e) => {
      if (!connectedRef.value) {
        return;
      }
      setTimeout(() => {
        if (e.by === 'local' && !docA.value?.isDetached()) {
          const docAVersionVector = docA.value?.version() as VersionVector;
          const docBVersion = docB.value?.export({mode: 'update', start_vv: docAVersionVector}) as Uint8Array;
          docA.value?.import(docBVersion);
        }
      });
    });
  });
  
  
  return (
    <div class={'w-full bg-gray-50 dark:text-teal-50 dark:bg-[#212121]'}>
      <GreetLayout greeting={greeting.value}>
        <div q:slot={'header'} class={'flex w-full items-center justify-between'}>
          <div class={'flex gap-10'}>
            <div class={'flex gap-2'} style={{marginRight: 6}}>
              <Switch
                color={'rgb(21 128 61 )'}
                on={connected.value}
                onChange$={(value) => connected.value = value}
              >
                <span q:slot={'off'} class={'text-2xl'}>
                  {connected.value ? <HugeiconsWifiConnected02 class={'text-green-700 dark:text-green-300'}/> : <HugeiconsWifiDisconnected02/>}
                </span>
              </Switch>
            </div>
            
            <a href="https://github.com/jermsam/loro-explore/tree/main/packages/cytoscape-qwik/src/routes/index.tsx"
               target="_blank">
              <AkarIconsGithubOutlineFill class={'cursor-pointer text-2xl'}/>
            </a>
          </div>
          <LightDarkMode
            mode={darkMode.value}
            onModeChange$={(mode) => darkMode.value = mode}
          />
        </div>
        
        <div class={'w-full h-5/6 rounded-lg '}>
          <div class={'flex gap-1 justify-between w-full h-full'}>
            <div style={{
              flexGrow: 1,
            }}
                 class={'w-[50%] border bg-white dark:bg-[#181818] border-gray-300 rounded-lg shadow-md'}
            >
              
              <LoroCytoscapeComponent doc={docA.value} nodes={cyNodes.value} edges={cyEdges.value}/>
            </div>
            <div style={{flexGrow: 1}}
                 class={'w-[50%] border bg-white dark:bg-[#181818] border-gray-300 rounded-lg shadow-md'}
            >
              <LoroCytoscapeComponent doc={docB.value} nodes={cyNodes.value} edges={cyEdges.value}/>
            </div>
          </div>
        </div>
      </GreetLayout>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Loro | Cytoscape Qwik',
  meta: [
    {
      name: 'description',
      content: 'Qwik site description',
    },
  ],
};
