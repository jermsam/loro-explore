import {
  $,
  component$,
  noSerialize,
  NoSerialize,
  useOnDocument,
  useSignal,
  useTask$,
} from '@builder.io/qwik';
import type {DocumentHead} from '@builder.io/qwik-city';
import {sayHi} from '@loro-explore/shared/utils';
import {GreetLayout} from '@loro-explore/shared/layouts';
import {LoroDoc, OpId} from 'loro-crdt';
import {AkarIconsGithubOutlineFill} from '@loro-explore/shared/icons';
// @ts-ignore
import jsonUpdates from '/seph-blog-updates.json?url&raw';
import {Slider} from '@loro-explore/shared/components';
import {throttle} from 'throttle-debounce';
import {isServer} from '@builder.io/qwik/build';
import 'quill/dist/quill.snow.css';
import QuillEditor from '~/components/quill-editor';
import Quill from 'quill';
import Scroll from 'quill/blots/scroll';
import Block from 'quill/blots/block';
import Break from 'quill/blots/break';
import Container from 'quill/blots/container';
import Inline from 'quill/blots/inline';
import Cursor from 'quill/blots/cursor';
import Text from 'quill/blots/text';


export default component$(() => {
  const greeting = useSignal<string>('');
  const loro = useSignal<NoSerialize<LoroDoc>>();
  const view = useSignal<HTMLDivElement>();
  const lastId = useSignal<undefined | OpId>();
  const version = useSignal<number>(-1);
  const maxVersion = useSignal<number>(0);
  const checkoutTime = useSignal<number>(0);
  const text = useSignal<string>('');
  
  useTask$(({track, cleanup}) => {
    if (isServer || !view.value) return;
    track(() => view.value);
    view.value.scrollTop = view.value.scrollHeight;
    cleanup(() => {
      view.value = undefined;
    });
  });
  
  useOnDocument('DOMContentLoaded', $(() => {
    loro.value = noSerialize(new LoroDoc());
    if (!loro.value) return;
    greeting.value = sayHi('Loro Quill Demo!');
    console.log(jsonUpdates);
    loro.value.importJsonUpdates(jsonUpdates);
    lastId.value = loro.value.frontiers()[0];
    maxVersion.value = lastId.value.counter;
    loro.value.checkout([]);
    text.value = '';
  }));
  
  const handleValueChange = $((v: number[]) => {
    const checkout = throttle(100, (counter: number) => {
      if (loro.value) {
        const start = performance.now();
        if (counter === -1) {
          loro.value.checkout([]);
        } else {
          loro.value.checkout([{
            peer: lastId.value?.peer as any,
            counter,
          }]);
        }
        checkoutTime.value = (performance.now() - start);
        text.value = loro.value.getText('text').toString();
      }
    });
    version.value = v[0];
    checkout(v[0]);
  });
  
  return (
    <GreetLayout greeting={greeting.value}>
      <div q:slot={'header'} class={'flex'}>
        <a href="https://github.com/jermsam/loro-explore/tree/main/packages/time-travel-demo-qwik/src/routes/index.tsx"
           target="_blank">
          <AkarIconsGithubOutlineFill class={'cursor-pointer text-2xl'}/>
        </a>
      </div>
      <div class={'flex justify-between mt-2 w-full'}>
        <span style={{}}>Current Version {version}</span>{' '}
        <span style={{}}>Max Version {maxVersion}</span>
      </div>
      <div class={'flex justify-between '} style={{fontFamily: 'monospace'}}>
        <span style={{marginRight: '2em'}}>Checkout duration: {checkoutTime.value.toFixed(2)} ms</span>
        <span>Text length: {text.value.length}</span>
      </div>
      <Slider
        value={[version.value]}
        max={maxVersion.value}
        min={-1}
        onValueChange={handleValueChange}
        sliderThumbColor={'fir'}
        sliderTrackActiveColor={'fir'}
      />
      <div class="w-full p-5 h-5/6 border bg-amber-50 border-gray-300 rounded-b-lg shadow-md overflow-y-auto"
           ref={view}>
        <div class="relative mt-2 transform scale-[1.0] origin-top-left">
          <div
            class="w-full bg-green-50  break-words text-wrap text-[11px] whitespace-pre-wrap transform scale-[0.8] origin-top-left absolute top-0 left-0"
          >
            <QuillEditor
              options={{
                debug: 'info',
                theme: 'snow',
                modules: {
                  toolbar: true,
                },
                placeholder: 'Compose an epic...',
              }}
              quill$={(quillInstance) => {
                if (isServer) return;
                const Parchment = Quill.import('parchment');
                // Essential formats
                const registry = new Parchment.Registry();
                registry.register(
                  Scroll,
                  Block,
                  Break,
                  Container,
                  Cursor,
                  Inline,
                  Text,
                );
                quillInstance.options.registry = registry;
              }}
            />
          </div>
          <div
            class={'w-full break-words whitespace-pre-wrap origin-top-left absolute top-0 left-0 transform scale-[0.1] translate-x-[84%]'}
          >
            {text.value}
          </div>
          <div
            class={'w-full break-words whitespace-pre-wrap origin-top-left absolute top-0 left-0 transform scale-[0.05] translate-x-[95%]'}
          >
            {text.value}
          </div>
        </div>
      </div>
    </GreetLayout>
  );
});

export const head: DocumentHead = {
  title: 'Loro | Quill Demo Qwik',
  meta: [
    {
      name: 'description',
      content: 'Qwik site description',
    },
  ],
};
