import {
  $,
  component$,
  noSerialize,
  NoSerialize, useComputed$,
  useContext, useOnDocument,
  useSignal,
  useTask$,
} from '@builder.io/qwik';
import {DocumentHead, server$} from '@builder.io/qwik-city';
import {GreetLayout} from '@loro-explore/shared/layouts';
import {ContainerID, LoroDoc, LoroList, LoroMap, OpId, VersionVector} from 'loro-crdt';
import {
  AkarIconsGithubOutlineFill,
  HugeiconsWifiConnected02,
  HugeiconsWifiDisconnected02,
} from '@loro-explore/shared/icons';
import {nodes as initialNodes, edges as initialEdges} from '~/utils/nodes-edges';
import {DarkModeContext} from '~/routes/layout';
import {LightDarkMode, Slider, Switch} from '@loro-explore/shared/components';
import CytoscapeComponent, {type Node, type Edge} from '~/components/cytoscape-component';
import {sayHi} from '@loro-explore/shared/utils';

// Create a JSON structure of
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

export const onEdgesUpdated = server$((doc: NoSerialize<LoroDoc>, loroEdges: LoroList, edges: Edge[]) => {
  if (!loroEdges || loroEdges.length === edges?.length) return;
  let changed = false;
  const curEdges: Edge[] = loroEdges.toJSON();
  let del = 0;
  for (let i = 0; i < curEdges.length; i++) {
    const edge = curEdges[i];
    
    if (edges?.find(e => e.data.id === edge.data.id) == null) {
      changed = true;
      loroEdges.delete(i - del, 1);
      del += 1;
    }
  }
  
  for (const edge of edges || []) {
    if (curEdges.find(e => e.data.id === edge.data.id) == null) {
      // insert new edge
      const map = loroEdges.insertContainer(0, new LoroMap());
      const data = map.setContainer('data', new LoroMap());
      data.set('id', edge.data.id);
      data.set('source', edge.data.source);
      data.set('target', edge.data.target);
      changed = true;
    }
  }
  
  if (changed) {
    doc?.commit();
  }
});

export const onNodesUpdated = server$((doc: NoSerialize<LoroDoc>, loroNodes: LoroList, nodes: Node[]) => {
  if (!loroNodes) return;
  const n = loroNodes.length;
  
  let del = 0;
  let changed = false;
  for (let i = 0; i + del < n; i++) {
    
    const node = loroNodes.get(i - del) as LoroMap;
    const nodeId = node.id;
    
    const map = doc?.getMap(nodeId) as LoroMap<Record<string, unknown>>;
    const id = map.get('id') as string;
    
    const source = nodes?.find(n => n.data.id === id);
    if (source == null) {
      loroNodes.delete(i, 1);
      changed = true;
      del += 1;
      continue;
    }
    
    const value: Node = map.toJSON();
    const posId = map.get('position');
    const pos = doc?.getMap(posId as ContainerID);
    const valueX = value.position?.x || 0;
    const sourceX = source.position?.x;
    const valueY = value.position?.y;
    const sourceY = source.position?.y;
    if (valueX !== sourceX || valueY !== sourceY) {
      changed = true;
      pos?.set('x', sourceX);
      pos?.set('y', sourceY);
    }
  }
  
  if (changed) {
    doc?.commit();
  }
});

export interface LoroCytoscape {
  doc: NoSerialize<LoroDoc>;
}


const Flow = component$<LoroCytoscape>((props) => {
  
  const doc = useSignal<NoSerialize<LoroDoc>>(noSerialize(props.doc));
  const v = useSignal<number>(0);
  const maxV = useSignal<number>(0);
  // version vectors
  const vv = useSignal<string | undefined>();
  // valid frontiers
  const vf = useSignal<OpId[][]>([]);
  
  const nodes = useSignal<Node[]>(initialNodes);
  const edges = useSignal<Edge[]>(initialEdges);
 
  useTask$(({track, cleanup}) => {
    track(() => doc.value);
    if (!doc.value) return;
    vv.value = JSON.stringify(Object.fromEntries(doc.value.version().toJSON()));
    if (vf.value.length === 0) {
      const opIds = doc.value.frontiers() as OpId[];
      vf.value.push(opIds);
    }
    nodes.value = doc.value.getList('nodes').toJSON();
    edges.value = doc.value.getList('edges').toJSON();
    const lastVV: Map<`${number}`, number> = doc.value.version().toJSON();
    
    doc.value.subscribe(e => {
      setTimeout(() => {
        if (!doc.value) return;
        const version = doc.value.version().toJSON();
        vv.value = JSON.stringify(Object.fromEntries(version));
        
        if (e.by === 'checkout') return;
        
        const newVV = doc.value.version().toJSON();
        let changed = false;
        for (const [peer, counter] of newVV.entries()) {
          const c = lastVV.get(peer) ?? 0;
          if (c >= counter) {
            continue;
          }
          
          for (let i = c; i < counter; i++) {
            vf.value.push([{peer, counter: i}]);
            changed = true;
          }
          lastVV.set(peer, counter);
        }
        
        if (e.by === 'local') {
          nodes.value = doc.value.getList('nodes').toJSON();
          edges.value = doc.value.getList('edges').toJSON();
          if (changed) {
            maxV.value = vf.value.length;
            v.value = vf.value.length;
          }
        }
      });
    });
    cleanup(() => {
      if (!doc.value) return;
      // doc.value.unsubscribe(subId);
    });
  });
  
  
  const eq = useComputed$(() => maxV.value == v.value);
  
  useTask$(async ({track}) => {
    track(() => doc.value);
    track(() => eq.value);
    track(() => nodes.value);
    if (!doc.value || !eq.value) return;
    const nodeList = doc.value.getList('nodes') as LoroList<unknown>;
    await onNodesUpdated(doc.value, nodeList, nodes.value);
    maxV.value = vf.value.length;
    v.value = vf.value.length;
  });
  
  useTask$(async ({track}) => {
    track(() => doc.value);
    track(() => eq.value);
    track(() => edges.value);
    if (!doc.value || !eq.value) return;
    const edgeList = doc.value.getList('edges') as LoroList<unknown>;
    await onEdgesUpdated(doc.value, edgeList, edges.value);
    maxV.value = vf.value.length;
    v.value = vf.value.length;
  });
  
  const onChangeVersion = $((version: number[]) => {
    if (!doc.value) return;
    const loroNodes = doc.value.getList('nodes') as LoroList<Node[]>;
    const loroEdges = doc.value.getList('edges') as LoroList<Edge[]>;
    const ver = Math.max(version[0], 1) - 1;
    if (ver == vf.value.length - 1) {
      doc.value.checkoutToLatest();
    } else {
      doc.value.checkout(vf.value[ver]);
    }
    nodes.value = loroNodes.toJSON();
    edges.value = loroEdges.toJSON();
    v.value = version[0];
  });
  
  
  const onNodesChange = $((ns: Node[]) => {
    nodes.value = ns;
  });
  const onEdgeChange = $((es: Edge[]) => {
    edges.value = es;
  });
  
  return (
    <div class={'w-full h-full'}
         style={{width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column'}}>
      <div style={{
        position: 'absolute',
        fontSize: 18,
        top: 10,
        width: 360,
        maxWidth: 'calc(100% - 48px)',
        left: '50%',
        zIndex: 2,
        transform: 'translateX(-50%)',
      }}>
        <div style={{marginBottom: 8}}>
          Version vector: {vv.value}
        </div>
        {
          maxV.value > 0 ?
            <Slider
              value={[v.value]}
              max={maxV.value}
              min={0}
              step={0.01}
              onValueChange={onChangeVersion}
            /> :
            undefined
        }
      </div>
      <div style={{flexGrow: 1}}>
        <CytoscapeComponent
          nodes={nodes.value}
          edges={edges.value}
          onNodesChange$={onNodesChange}
          onEdgesChange$={onEdgeChange}
          onConnect$={(params) => {
            console.log({params});
          }}
        />
      </div>
    </div>
  );
});

export default component$(() => {
  const darkMode = useContext(DarkModeContext);
  const greeting = useSignal<string>('');
  const connected = useSignal<boolean>(true);
  const connectedRef = useSignal<boolean>(true);
  const docA = useSignal<NoSerialize<LoroDoc>>();
  const docB = useSignal<NoSerialize<LoroDoc>>();
  
  useOnDocument('DOMContentLoaded', $(() => {
    greeting.value = sayHi('Loro Cytoscape!');
  }));
  
  // Initialize Loro instances and subscriptions
  useTask$(async () => {
    const instanceA = new LoroDoc();
    const instanceB = new LoroDoc();
    instanceA.setPeerId(1n);
    instanceB.setPeerId(2n);
    const originDoc = await initOriginDoc();
    // Import the origin doc snapshot
    const shallowSnapshotBytes = originDoc.export({
      mode: 'shallow-snapshot',
      frontiers: originDoc.frontiers(),
    });
    // or you can use
    // const snapshotBytes = doc.export({ mode: "snapshot" });
    instanceA.import(shallowSnapshotBytes);
    instanceB.import(shallowSnapshotBytes);
    
    // Subscribe to docA changes
    instanceA.subscribe((e) => {
      if (!connectedRef.value) return;
      setTimeout(() => {
        if (e.by === 'local' && !instanceA.isDetached()) {
          const instanceBVV = instanceB.version() as VersionVector;
          const instanceBUint8Array = instanceA.export({mode: 'update', from: instanceBVV});
          instanceB.import(instanceBUint8Array);
        }
      });
    });
    
    // Subscribe to docB changes
    instanceB.subscribe((e) => {
      if (!connectedRef.value) return;
      setTimeout(() => {
        if (e.by === 'local' && !instanceB.isDetached()) {
          const instanceAVV = instanceA.version();
          const instanceAUint8Array = instanceB.export({mode: 'update', from: instanceAVV});
          instanceA.import(instanceAUint8Array);
        }
      });
    });
    
    // Assign instances to signals
    docA.value = noSerialize(instanceA);
    docB.value = noSerialize(instanceB);
  });
  
  const onSwitchChange = $((v: boolean) => {
    if (v && docA.value && docB.value) {
      const docAVV = docA.value.version();
      const docAUint8Array = docB.value.export({mode: 'update', from: docAVV});
      docA.value.import(docAUint8Array);
      
      const docBVV = docB.value.version();
      const docBUint8Array = docA.value.export({mode: 'update', from: docBVV});
      docB.value.import(docBUint8Array);
    }
    connectedRef.value = v;
    connected.value = v;
  });
  
  
  return (
    <div class={'w-full min-h-screen bg-gray-50 dark:text-teal-50 dark:bg-[#212121]'}>
      <GreetLayout greeting={greeting.value}>
        <div q:slot={'header'} class={'flex w-full items-center justify-between'}>
          <div class={'flex gap-10'}>
            <div class={'flex gap-2'} style={{marginRight: 6}}>
              <Switch
                color={'rgb(21 128 61 )'}
                on={connected.value}
                onChange$={onSwitchChange}
              >
                <span q:slot={'off'} class={'text-2xl'}>
                  {connected.value ? <HugeiconsWifiConnected02 class={'text-green-700 dark:text-green-300'}/> :
                    <HugeiconsWifiDisconnected02/>}
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
              <Flow doc={docA.value}/>
            </div>
            <div style={{flexGrow: 1}}
                 class={'w-[50%] border bg-white dark:bg-[#181818] border-gray-300 rounded-lg shadow-md'}
            >
              <Flow doc={docB.value}/>
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
