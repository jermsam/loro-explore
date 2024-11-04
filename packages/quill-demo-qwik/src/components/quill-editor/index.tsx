import {$, component$, QRL, useOnDocument, useSignal} from '@builder.io/qwik';
import Quill, {QuillOptions} from 'quill';
import {isBrowser} from '@builder.io/qwik/build';

export interface QuillEditorProps {
  options: Omit<QuillOptions, 'registry'>;
  quill$?: QRL<(quillInstance: Quill) => void>;
}

export default component$<QuillEditorProps>((props) => {
  const editorContainer = useSignal<HTMLDivElement>();
  
  useOnDocument('DOMContentLoaded', $(async () => {
    if (!isBrowser || !editorContainer.value) return;
    const q = new Quill(editorContainer.value, props.options);
    if (props.quill$) {
      await props.quill$(q);
    }
  }));
  
  return (
    <div ref={editorContainer} />
  );
});


