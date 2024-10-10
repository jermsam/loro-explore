import {$, component$, noSerialize, NoSerialize, useOnDocument, useSignal, useTask$} from '@builder.io/qwik';
import type {DocumentHead} from '@builder.io/qwik-city';
import {sayHi} from '@loro-explore/shared';
import {Separator} from '@qwik-ui/headless';
// @ts-ignore
import jsonUpdates from "/seph-blog-updates.json?url&raw";
import { LoroDoc, OpId} from 'loro-crdt';
import {Slider} from '~/components/slider';
import { throttle } from 'throttle-debounce';

export default component$(() => {
  const greeting = useSignal<string>('');
  const loro = useSignal<NoSerialize<LoroDoc>>();
  const lastId = useSignal<undefined | OpId>();
  const version = useSignal<number>(-1)
  const maxVersion = useSignal<number>(0)
  const checkoutTime = useSignal<number>(0)
  const text = useSignal<string>('');
  const view = useSignal<HTMLDivElement>();
 
  
  useOnDocument('DOMContentLoaded', $(()=>{
    loro.value = noSerialize(new LoroDoc())
    if(!loro.value) return
    greeting.value = sayHi('Loro!');
    loro.value.importJsonUpdates(jsonUpdates);
    lastId.value =loro.value.frontiers()[0];
    maxVersion.value = lastId.value.counter
    loro.value.checkout([]);
    text.value = '';
  }))
  
  const handleValueChange = $((v: number[]) => {
    const checkout = throttle(100, (ver: number) => {
      if(loro.value) {
        const start = performance.now()
        if (ver === -1) {
          loro.value.checkout([]);
        } else {
          loro.value.checkout([{
            peer: lastId.value?.peer  as any,
            counter: ver,
          }]);
        }
        checkoutTime.value = (performance.now() - start);
        text.value = loro.value.getText("text").toString();
      }
    });
    version.value = v[0];
    checkout(v[0]);
  });
  return (
    <div class={'p-5'}>
      <h1 class={'text-red-700'}>{greeting}</h1>
      <Separator orientation="horizontal" class="separator-top h-1 bg-red-700 w-full"/>
      <div class={'w-[calc(100% - 32)] p-4'} ref={view}>
        <Slider
          value={[version.value]}
          max={maxVersion.value}
          min={-1}
          step={0.0001}
          onValueChange={handleValueChange}
        />
        <div class={'flex justify-between mt-2'}>
          <span>Current Version {version.value}</span>{' '}
          <span>Max Version {maxVersion.value}</span>
        </div>
      </div>
      <div class={'flex justify-between mt-2'}>
        <span style={{marginRight: "2em"}}>Checkout duration: {checkoutTime.value.toFixed(2)} ms</span>
        <span>Text length: {text.value.length}</span>
      </div>
      <div class={'relative mt-0 transform scale-105'} style={'transform-origin: 0 0'}>
        <div
          style={{
            width: "100%",
            whiteSpace: "pre-wrap",
            transform: "scale(0.8)",
            transformOrigin: "0 0",
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          {text.value}
        </div>
        <div
          style={{
            width: "100%",
            whiteSpace: "pre-wrap",
            transform: "scale(0.025) translateX(3600%)",
            transformOrigin: "0 0",
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          {text.value}
        </div>
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Welcome to Qwik',
  meta: [
    {
      name: 'description',
      content: 'Qwik site description',
    },
  ],
};
