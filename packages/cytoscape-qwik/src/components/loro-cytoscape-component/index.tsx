import {$, component$, noSerialize, NoSerialize, useComputed$, useSignal, useTask$} from '@builder.io/qwik';
import {ContainerID, LoroDoc, LoroList, LoroMap, OpId, VersionVector} from 'loro-crdt';
import type {EdgeDefinition, NodeDefinition} from 'cytoscape';
// import {Slider} from '@loro-explore/shared/components';
import CytoscapeComponent from '~/components/cytoscape-component';
import {server$} from '@builder.io/qwik-city';

export interface LoroCytoscapeComponent {
  doc: NoSerialize<LoroDoc>;
  nodes: NoSerialize<NodeDefinition[]>;
  edges: NoSerialize<EdgeDefinition[]>;
}

export const onNodesUpdated = server$((doc: NoSerialize<LoroDoc>, loroNodes: LoroList, nodes: NoSerialize<NodeDefinition[]>) => {
  const n = loroNodes.length;
  let del = 0;
  let changed = false;
  for (let i = 0; i + del < n; i++) {
    const nodeId = loroNodes.get(i - del);
    const map = doc?.getMap(nodeId as ContainerID) as LoroMap<Record<string, unknown>>;
    const id = map.get('id') as string;
    const source = nodes?.find(n => n.data.id === id);
    if (source == null) {
      loroNodes.delete(i, 1);
      changed = true;
      del += 1;
      continue;
    }
    
    const value: NodeDefinition = map.toJSON();
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

export const onEdgesUpdated = server$((doc: NoSerialize<LoroDoc>, loroEdges: LoroList, edges: NoSerialize<EdgeDefinition[]>) => {
  if (loroEdges.length === edges?.length) {
    return;
  }
  
  let changed = false;
  const curEdges: EdgeDefinition[] = loroEdges.toJSON();
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



export default component$<LoroCytoscapeComponent>((props) => {
  const versionVector = useSignal<string>();
  const nodes = useSignal<NoSerialize<NodeDefinition[]>>(noSerialize([]));
  const edges = useSignal<NoSerialize<EdgeDefinition[]>>(noSerialize([]));
  const validFrontiersRef = useSignal<OpId[][]>([]);
  const version = useSignal<number>(0);
  const maxVersion = useSignal<number>(0);
  
  useTask$(({track}) => {
    track(()=>props.doc)
    track(()=>props.nodes)
    track(()=>props.edges)
    // initialization
    const doc = props.doc;
    const docVersionVector = doc?.version() as VersionVector;
    versionVector.value = JSON.stringify(Object.fromEntries(docVersionVector.toJSON()));
    nodes.value = noSerialize(props.nodes);
    edges.value = noSerialize(props.edges);
    
    if (validFrontiersRef.value.length === 0) {
      const opIds = doc?.frontiers() as OpId[];
      validFrontiersRef.value.push(opIds);
    }
  });
  
  useTask$(({track, cleanup}) => {
    track(() => props.doc);
    const doc = props.doc;
    const loroNodes = doc?.getList('nodes') as LoroList<NodeDefinition[]>;
    nodes.value = loroNodes.toJSON();
   
    const loroEdges = doc?.getList('edges') as LoroList<EdgeDefinition[]>;
    edges.value = loroEdges.toJSON();
    const docVersionVector = doc?.version() as VersionVector;
    const lastVersionVector: Map<`${number}`, number> = docVersionVector.toJSON();
    
    const subId = doc?.subscribe((e) => {
      setTimeout(() => {
        
        let docVersionVector = doc.version();
        versionVector.value = JSON.stringify(Object.fromEntries(docVersionVector.toJSON()));
        if (e.by === 'checkout') {
          return;
        }
        docVersionVector = doc.version();
        const newVersionVector = docVersionVector.toJSON();
        let changed = false;
        for (const [peer, counter] of newVersionVector.entries()) {
          const c = lastVersionVector.get(peer) ?? 0;
          if (c >= counter) {
            continue;
          }
          
          for (let i = c; i < counter; i++) {
            validFrontiersRef.value.push([{peer, counter: i}]);
            changed = true;
          }
          lastVersionVector.set(peer, counter);
        }
        if (e.by !== 'local') {
          const loroNodes = doc.getList('nodes');
          nodes.value = loroNodes.toJSON();
          const loroEdges = doc.getList('edges');
          edges.value = loroEdges.toJSON();
          if (changed) {
            maxVersion.value = validFrontiersRef.value.length;
            version.value = validFrontiersRef.value.length;
          }
        }
      });
    });
    
    cleanup(() => {
      doc?.unsubscribe(subId as number);
    });
  });
  
  // const onChangeVersion = $((v: number[]) => {
  //   const doc = props.doc;
  //   const loroNodes = doc?.getList('nodes') as LoroList<NodeDefinition[]>;
  //   const loroEdges = doc?.getList('edges') as LoroList<EdgeDefinition[]>;
  //   const ver = Math.max(v[0], 1) - 1;
  //   if (ver == validFrontiersRef.value.length - 1) {
  //     doc?.checkoutToLatest();
  //   } else {
  //     doc?.checkout(validFrontiersRef.value[ver]);
  //   }
  //   nodes.value = loroNodes.toJSON();
  //   edges.value = loroEdges.toJSON();
  //   version.value = v[0];
  // });
  
  const eq = useComputed$(() => maxVersion == version);
  
  useTask$(async ({track}) => {
    track(() => props.doc);
    track(() => nodes.value);
    track(() => eq.value);
    if (!eq.value) return;
    const doc = props.doc;
    const nodeList = doc?.getList('nodes') as LoroList<unknown>;
    await onNodesUpdated(doc, nodeList, nodes.value);
    maxVersion.value = validFrontiersRef.value.length;
    version.value = validFrontiersRef.value.length;
  });
  
  useTask$(async ({track}) => {
    track(() => props.doc);
    track(() => edges.value);
    track(() => eq.value);
    if (!eq.value) return;
    const doc = props.doc;
    const edgeList = doc?.getList('edges') as LoroList<unknown>;
    await onEdgesUpdated(doc, edgeList, edges.value);
    maxVersion.value = validFrontiersRef.value.length;
    version.value = validFrontiersRef.value.length;
  });
  
  const onNodesChange = $((nodes: any) => {
    nodes.value = nodes;
    // console.log(nodes);
  });
  const onEdgeChange = $((edges: any) => {
    edges.value = edges;
    // console.log(edges);
  });
  
  return (
    <CytoscapeComponent
      nodes={nodes.value}
      edges={edges.value}
      onNodesChange$={eq.value ? onNodesChange : $(() => {
        // 00 -
      })}
      onEdgesChange$={eq.value ? onEdgeChange : $(() => {
        // 01 -
      })}
      fitViewOptions={{
        padding: 0.4,
      }}
      fitView
    />
  );
});


