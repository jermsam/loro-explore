import {$, component$, QRL, useOnDocument, useSignal, useTask$} from '@builder.io/qwik';
import {IonMdMoon, IonMdSunny} from '../../icons';
import {isServer} from '@builder.io/qwik/build';

export interface LightDarkModeProps {
  mode: boolean;
  onModeChange$: QRL<(mode: boolean) => void>;
}

export const LightDarkMode = component$<LightDarkModeProps>((props) => {
  const darkMode = useSignal<boolean>(props.mode);
  useTask$(async ({track}) => {
    track(() => darkMode.value);
    if (isServer) return;
    const bodyClass = document.body.classList;
    darkMode.value ? bodyClass.add('dark') : bodyClass.remove('dark');
    const darkString = JSON.stringify(darkMode.value);
    localStorage.setItem('dark-mode', darkString);
    await props.onModeChange$(darkMode.value);
  });
  useOnDocument('DOMContentLoaded', $(() => {
    const darkString = localStorage.getItem('dark-mode') as string;
    const dark = JSON.parse(darkString);
    darkMode.value = !!dark;
  }));
  return (
    <>
      {!darkMode.value ?
        <a onClick$={() => darkMode.value = !darkMode.value}>
          <IonMdSunny
            class="text-4xl cursor-pointer  rounded-full p-2 inline-block transition-transform hover:scale-110"/>
        </a>
        :
        <a onClick$={() => darkMode.value = !darkMode.value}>
          <IonMdMoon
            class="text-4xl cursor-pointer  rounded-full p-2 inline-block transition-transform hover:scale-110"/>
        </a>
      }
    </>
  );
});


