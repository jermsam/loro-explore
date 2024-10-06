import {component$, useSignal, useTask$} from '@builder.io/qwik';
import type { DocumentHead } from "@builder.io/qwik-city";
import { sayHi } from "@loro-explore/shared";
import { Separator } from '@qwik-ui/headless';
export default component$(() => {
  const greeting = useSignal<string>('')
  useTask$(() => {
    greeting.value = sayHi('Loro!');
  });
  return (
    <>
      <h1 class={'text-red-700'}>{greeting}</h1>
      <Separator orientation="horizontal" class="separator-top h-1 bg-red-700 w-full" />
      <div>
        Can't wait to see what you build with qwik!
        <br />
        Happy coding.
      </div>
      
    </>
  );
});

export const head: DocumentHead = {
  title: "Welcome to Qwik",
  meta: [
    {
      name: "description",
      content: "Qwik site description",
    },
  ],
};
