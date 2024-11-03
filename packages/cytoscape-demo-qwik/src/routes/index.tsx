import {
  $,
  component$, noSerialize,
  NoSerialize, useComputed$, useContext,
  useOnDocument,
  useSignal,
  useTask$,
} from '@builder.io/qwik';
import type {DocumentHead} from '@builder.io/qwik-city';
import {DarkModeContext} from '~/routes/layout';
import {GreetLayout} from '@loro-explore/shared/layouts';

import {
  AkarIconsGithubOutlineFill,
  HugeiconsWifiConnected02,
  HugeiconsWifiDisconnected02,
} from '@loro-explore/shared/icons';
import {nodes as initialNodes, edges as initialEdges, stylesheets} from '../nodes-edges';
import {LightDarkMode, Slider, Switch} from '@loro-explore/shared/components';
import {ContainerID, LoroDoc, LoroList, LoroMap, OpId} from 'loro-crdt';
import CytoscapeComponent, {Node, Edge} from '~/components/cytoscape-component';

import {sayHi} from '@loro-explore/shared/utils';
import {Core, CytoscapeOptions} from 'cytoscape';

interface FlowComponentProps {
  doc: NoSerialize<LoroDoc>;
  nodes: Node[];
  edges: Edge[];
}

const FlowComponent = component$<FlowComponentProps>(({doc, nodes: initNodes, edges: initEdges}) => {
  
  const vv = useSignal(doc ? JSON.stringify(Object.fromEntries(doc.version().toJSON())) : '');
  const vf = useSignal<OpId[][]>([]);
  if (vf.value.length === 0 && doc) {
    vf.value.push(doc.frontiers());
  }
  const nodes = useSignal<Node[]>(initNodes);
  const edges = useSignal<Edge[]>(initEdges);
  const version = useSignal(0);
  const maxVersion = useSignal(0);
  
  const cytoscapeOptions = useComputed$<NoSerialize<Pick<CytoscapeOptions, any>>>(() => {
    return noSerialize({
      elements: {
        nodes: nodes.value,
        edges: edges.value,
      },
      style: stylesheets,
      layout: {
        name: 'preset', // Use preset layout to place nodes manually
      },
      userZoomingEnabled: true,
      userPanningEnabled: true,
      hoverDelay: 150, // time spent hovering over a target node before it is considered selected
      snap: true, // when enabled, the edge can be drawn by just moving close to a target node (can be confusing on compound graphs)
      snapThreshold: 50, // the target node must be less than or equal to this many pixels away from the cursor/finger
      snapFrequency: 15, // the number of times per second (Hz) that snap checks done (lower is less expensive)
      noEdgeEventsInDraw: true, // set events:no to edges during draws, prevents mouseouts on compounds
      disableBrowserGestures: true
    });
  });
  
  
  useTask$(({track}) => {
    track(() => doc);
    if (!doc) return;
    
    nodes.value = doc.toJSON().nodes;
    edges.value = doc.toJSON().edges;
    const lastVV: Map<`${number}`, number> = doc.version().toJSON();
    doc.subscribe(e => {
      setTimeout(() => {
        if (!doc) return;
        const v = doc.version().toJSON();
        vv.value = JSON.stringify(Object.fromEntries(v));
        
        if (e.by === 'checkout') {
          return;
        }
        
        const newVV = doc.version().toJSON();
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
        
        if (e.by !== 'local') {
          nodes.value = doc.toJSON().nodes;
          edges.value = doc.toJSON().edges;
          if (changed) {
            maxVersion.value = vf.value.length;
            version.value = vf.value.length;
          }
        }
      });
    });
  });
  
  
  const eq = useComputed$(() => maxVersion.value == version.value);
  useTask$(async ({track}) => {
    track(() => doc);
    track(() => eq.value);
    track(() => nodes.value);
    if (!doc || !eq.value) return;
    // await props.docChanged$({nodes: nodes.value});
    onNodesUpdated(doc, doc.getList('nodes'), nodes.value);
    maxVersion.value = vf.value.length;
    version.value = vf.value.length;
  });
  
  useTask$(async ({track}) => {
    track(() => doc);
    if (!doc || !eq.value) return;
    track(() => edges.value);
    if (!doc) return;
    onEdgesUpdated(doc, doc.getList('edges'), edges.value);
    // await props.docChanged$({edges: edges.value});
    maxVersion.value = vf.value.length;
    version.value = vf.value.length;
  });
  
  
  const onCytoscapeChanges$ = $((cy: Core) => {
    // fit in space
    // cy.fit(undefined, 0.4);
    // Handle nodes
    cy.on('dragfree', 'node', () => {
      nodes.value = cy.nodes().map((node) => ({
        data: node.data(),
        position: node.position(),
      }));
    });
    
    // Handle edges
    cy.on('add', 'edge', () => {
      edges.value = cy?.edges().map((edge) => ({
        data: edge.data(),
      }));
      
    });
  });
  
  
  const onChangeVersion = $((v: number[]) => {
    if (!doc) return;
    const loroNodes = doc.getList('nodes');
    const loroEdges = doc.getList('edges');
    const ver = Math.max(v[0], 1) - 1;
    if (ver == vf.value.length - 1) {
      doc.checkoutToLatest();
    } else {
      doc.checkout(vf.value[ver]);
    }
    nodes.value = loroNodes.toJSON();
    edges.value = loroEdges.toJSON();
    version.value = v[0];
  });
  return (
    <div class={'w-full h-full relative flex flex-col'}>
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
          maxVersion.value > 0 ?
            <Slider
              value={[version.value]}
              max={maxVersion.value}
              min={0}
              onValueChange={onChangeVersion}
            /> :
            undefined
        }
      </div>
      <div style={{flexGrow: 1}}>
        <CytoscapeComponent
          cytoscapeOptions={cytoscapeOptions.value}
          onCytoscapeChanges$={onCytoscapeChanges$}
        />
      </div>
    </div>
  );
});

const originDoc = new LoroDoc();
originDoc.setPeerId(0n);
const loroNodes = originDoc.getList('nodes');
const loroEdges = originDoc.getList('edges');
let i = 0;
for (const node of initialNodes) {
  const map = loroNodes.insertContainer(i++, new LoroMap());
  const data = map.setContainer('data', new LoroMap());
  data.set('id', node.data.id);
  data.set('label', node.data.label);
  const pos = map.setContainer('position', new LoroMap());
  pos.set('x', node.position.x);
  pos.set('y', node.position.y);
}

i = 0;
for (const edge of initialEdges) {
  const map = loroEdges.insertContainer(i++, new LoroMap());
  const data = map.setContainer('data', new LoroMap());
  data.set('id', edge.data.id);
  data.set('source', edge.data.source);
  data.set('target', edge.data.target);
}

originDoc.commit();

const onNodesUpdated = (doc: LoroDoc, loroNodes: LoroList, nodes: Node[]) => {
  if (!doc) return;
  // const loroNodes: LoroList = doc.getList('nodes');
  const n = loroNodes.length;
  let del = 0;
  let changed = false;
  for (let i = 0; i + del < n; i++) {
    const node = loroNodes.get(i - del) as LoroMap;
    const nodeId = node.id;
    const map = doc.getMap(nodeId as ContainerID);
    const node_data = map.get('data') as LoroMap;
    const id = node_data.get('id') as string;
    const source = nodes.find(n => n.data.id === id);
    if (source == null) {
      loroNodes.delete(i, 1);
      changed = true;
      del += 1;
      continue;
    }
    
    const value: Node = map.toJSON();
    const position = map.get('position') as LoroMap;
    const posId = position.id;
    const pos = doc.getMap(posId as ContainerID);
    if (value.position?.x !== source.position?.x || value.position?.y !== source.position?.y) {
      changed = true;
      pos.set('x', source.position?.x);
      pos.set('y', source.position?.y);
    }
  }
  
  if (changed) {
    doc.commit();
  }
};

function onEdgesUpdated(doc: LoroDoc, loroEdges: LoroList, edges: Edge[]) {
  if (!doc) return;
  // const loroEdges: LoroList = doc.getList('edges');
  if (loroEdges.length === edges.length) {
    return;
  }
  
  let changed = false;
  const curEdges: Edge[] = loroEdges.toJSON();
  let del = 0;
  for (let i = 0; i < curEdges.length; i++) {
    const edge = curEdges[i];
    if (edges.find(e => e.data.id === edge.data.id) == null) {
      changed = true;
      loroEdges.delete(i - del, 1);
      del += 1;
    }
  }
  
  for (const edge of edges) {
    if (curEdges.find(e => e.data.id === edge.data.id) == null) {
      const map = loroEdges.insertContainer(0, new LoroMap());
      map.set('id', edge.data.id);
      map.set('source', edge.data.source);
      map.set('target', edge.data.target);
      changed = true;
    }
  }
  
  if (changed) {
    doc.commit();
  }
}

export default component$(() => {
  const darkMode = useContext(DarkModeContext);
  const greeting = useSignal<string>('');
  const connected = useSignal<boolean>(true);
  const connectedRef = useSignal<boolean>(true);
  const docA = useSignal<NoSerialize<LoroDoc>>();
  const docB = useSignal<NoSerialize<LoroDoc>>();
  
  useOnDocument('DOMContentLoaded', $(() => {
    const doc_a = new LoroDoc();
    doc_a.setPeerId(1n);
    const doc_b = new LoroDoc();
    doc_b.setPeerId(2n);
    
    const shallowSnapshotBytes = originDoc.export({
      mode: 'shallow-snapshot',
      frontiers: originDoc.frontiers(),
    });
    doc_a.import(shallowSnapshotBytes);
    doc_b.import(shallowSnapshotBytes);
    
    docA.value = noSerialize(doc_a);
    docB.value = noSerialize(doc_b);
    if (!docA.value) return;
    if (!docB.value) return;
    docA.value.subscribe((e) => {
      if (!connectedRef.value) {
        return;
      }
      setTimeout(() => {
        if (!docA.value) return;
        if (!docB.value) return;
        if (e.by === 'local' && !docA.value.isDetached()) {
          const docBVV = docB.value.version();
          const docBUint8Array = docA.value.export({mode: 'update', from: docBVV});
          docB.value.import(docBUint8Array);
        }
      });
    });
    docB.value.subscribe((e) => {
      if (!connectedRef.value) {
        return;
      }
      setTimeout(() => {
        if (!docA.value) return;
        if (!docB.value) return;
        if (e.by === 'local' && !docA.value.isDetached()) {
          const docAVV = docA.value.version();
          const docBUint8Array = docB.value.export({mode: 'update', from: docAVV});
          docA.value.import(docBUint8Array);
        }
      });
    });
  }));
  
  
  useOnDocument('DOMContentLoaded', $(() => {
    greeting.value = sayHi('Loro Cytoscape!');
    console.log('stop here');
  }));
  
  
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
              <FlowComponent
                doc={docA.value}
                nodes={initialNodes}
                edges={initialEdges}
              />
            </div>
            <div style={{flexGrow: 1}}
                 class={'w-[50%] border bg-white dark:bg-[#181818] border-gray-300 rounded-lg shadow-md'}
            >
              <FlowComponent
                doc={docB.value}
                nodes={initialNodes}
                edges={initialEdges}
              />
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
