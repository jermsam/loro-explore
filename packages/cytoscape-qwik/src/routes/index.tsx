import {$, component$, noSerialize, NoSerialize, useOnDocument, useSignal} from '@builder.io/qwik';
import type {DocumentHead} from '@builder.io/qwik-city';
import {sayHi} from '@loro-explore/shared/utils';
import {GreetLayout} from '@loro-explore/shared/layouts';
import { LoroDoc} from 'loro-crdt';
import {AkarIconsGithubOutlineFill} from '@loro-explore/shared/icons'

export default component$(() => {
  const greeting = useSignal<string>('');
  const loro = useSignal<NoSerialize<LoroDoc>>();
  const view = useSignal<HTMLDivElement>();
 
  
  useOnDocument('DOMContentLoaded', $(()=>{
    loro.value = noSerialize(new LoroDoc())
    if(!loro.value) return
    greeting.value = sayHi('Loro!');

  }))
  

  return (
    <GreetLayout greeting={greeting.value}>
      <div q:slot={'header'} class={'flex'}>
        <a href="https://github.com/jermsam/loro-explore/tree/main/packages/cytoscape-qwik/src/routes/index.tsx" target="_blank">
          <AkarIconsGithubOutlineFill class={'cursor-pointer text-2xl'}/>
        </a>
      </div>
      <div class={'w-full h-5/6 border bg-amber-50 border-gray-300 rounded-lg shadow-md'} ref={view}/>
    </GreetLayout>
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
