
import {component$, Slot} from '@builder.io/qwik';
import {Separator} from '@qwik-ui/headless';

export interface GreetLayoutProps {
  greeting: string;
}

export const GreetLayout = component$<GreetLayoutProps>((props) => {
    return (
        <div class={'p-5 max-w-screen-xl  flex flex-col items-center justify-center mx-auto'}>
          <h1>{props.greeting}</h1>
          <Separator orientation="horizontal" class="separator-top h-[0.1rem] bg-gray-300 dark:bg-gray-50  w-full"/>
          <Slot name={'header'}/>
          <div class={'h-[90vh] w-full flex flex-col items-center justify-center'}>
            <Slot/>
          </div>
        </div>
    )
});


