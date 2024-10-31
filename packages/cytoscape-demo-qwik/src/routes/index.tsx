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
import {nodes as initialNodes, edges as initialEdges} from '../nodes-edges';
import {LightDarkMode, Switch} from '@loro-explore/shared/components';
import {LoroDoc, LoroMap} from 'loro-crdt';
import CytoscapeComponent from '~/components/cytoscape-component';
import {isServer} from '@builder.io/qwik/build';
import {sayHi} from '@loro-explore/shared/utils';

interface FlowComponentProps {
  doc: NoSerialize<LoroDoc>;
}

const FlowComponent = component$<FlowComponentProps>((props) => {
  const doc = useSignal<NoSerialize<LoroDoc>>(props.doc);
  const onClient = useSignal<boolean>(false);
  useTask$(() => {
    if (isServer) return;
    onClient.value = true;
  });
  const nodes = useComputed$(() => {
    if (!doc.value) return [];
    return doc.value.toJSON().nodes;
  });
  const edges = useComputed$(() => {
    if (!doc.value) return [];
    return doc.value.toJSON().edges;
  });
  
  // const onClient = useSignal(false)
  // const config = useComputed$(
  //   () =>
  //     onClient.value && isBrowser &&
  //     noSerialize(
  //       defaultWagmiConfig({
  //         chains: [mainnet],
  //         projectId: import.meta.env.PUBLIC_PROJECT_ID,
  //         metadata,
  //       })
  //     )
  // )
  // useContextProvider(WagmiConfigContext, {config, onClient})
  // const wagmiConfig = useContext(WagmiConfigContext);
  
  
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
       {/* <div style={{marginBottom: 8}}>
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
        }*/}
      </div>
      <div style={{flexGrow: 1}}>
        <CytoscapeComponent
          nodes={nodes.value}
          edges={edges.value}
          fitView
          onConnect$={(params) => {
            console.log({params});
          }}
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

export default component$(() => {
  const darkMode = useContext(DarkModeContext);
  const greeting = useSignal<string>('');
  const connected = useSignal<boolean>(true);
  const connectedRef = useSignal<boolean>(true);
  
  const docA = useComputed$<NoSerialize<LoroDoc>>(() => {
    const doc = new LoroDoc();
    doc.setPeerId(1n);
    const shallowSnapshotBytes = originDoc.export({
      mode: 'shallow-snapshot',
      frontiers: originDoc.frontiers(),
    });
    doc.import(shallowSnapshotBytes);
    return noSerialize(doc);
  });
  
  const docB = useComputed$<NoSerialize<LoroDoc>>(() => {
    const doc = new LoroDoc();
    doc.setPeerId(2n);
    const shallowSnapshotBytes = originDoc.export({
      mode: 'shallow-snapshot',
      frontiers: originDoc.frontiers(),
    });
    doc.import(shallowSnapshotBytes);
    return noSerialize(doc);
  });
  
  useOnDocument('DOMContentLoaded', $(() => {
    greeting.value = sayHi('Loro Cytoscape!');
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
              <FlowComponent doc={docA.value}/>
            </div>
            <div style={{flexGrow: 1}}
                 class={'w-[50%] border bg-white dark:bg-[#181818] border-gray-300 rounded-lg shadow-md'}
            >
              <FlowComponent doc={docB.value}/>
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
