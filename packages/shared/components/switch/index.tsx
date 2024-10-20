import {component$, QRL, Slot, useSignal, useTask$} from '@builder.io/qwik';

export interface SwitchProps {
  on: boolean,
  color?: string,
  onChange$: QRL<(value: boolean) => void>,
}

export const Switch = component$<SwitchProps>((props) => {
  // Signal to track theme state (light or dark)
  const on = useSignal(props.on);
  const color = useSignal<string>(props.color || '#667744');
  
  // Runs when component becomes visible
  useTask$(async ({track}) => {
    track(() => on.value);
    await props.onChange$(on.value);
  });
  
  
  return (
    <div class="flex items-center space-x-2">
      <Slot name={'off'}/>
      <button
        onClick$={() => on.value = !on.value}
        class={`flex  w-12 h-6 bg-gray-300 dark:bg-gray-700 rounded-full transition-colors opacity-75 dark:opacity-100`}
        style={{
          backgroundColor: on.value ? color.value : ''
        }}
      >
        <div
          class={`items-center w-1/2 h-full bg-white shadow-md rounded-full shadow transform transition-transform ${
            on.value ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>
      <Slot name={'on'}/>
    </div>
  )
    ;
});
