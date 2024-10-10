import { component$, useSignal, QRL, useOnDocument, $ } from '@builder.io/qwik';

interface SliderProps {
  value: number[];
  min: number;
  max: number;
  step?: number;  // Optional step size
  onValueChange?: QRL<(value: number[]) => void>;
  className?: string;
}

export const Slider = component$((props: SliderProps) => {
  const isDragging = useSignal(false);
  const trackRef = useSignal<Element>();
  const value = useSignal(props.value[0]);
  
  // Serialized snapToStep function using $()
  const snapToStep = $((val: number) => {
    const step = props.step || 1; // Default step is 1 if not provided
    return Math.round(val / step) * step;
  });
  
  // Function to move the thumb based on a click on the track
  const moveToClickPosition = $(async (event: MouseEvent) => {
    const track = trackRef.value!;
    const rect = track.getBoundingClientRect();
    const clickPosition = event.clientX - rect.left;
    const newValue = Math.min(Math.max(clickPosition / rect.width * (props.max - props.min) + props.min, props.min), props.max);
    value.value = await snapToStep(newValue);  // Snap to the nearest step
    if (props.onValueChange) {
      props.onValueChange([value.value]);
    }
  });
  
  const onThumbMove = $(async (event: MouseEvent | TouchEvent) => {
    if (!isDragging.value) return;
    const track = trackRef.value!;
    const rect = track.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const newValue = Math.min(Math.max((clientX - rect.left) / rect.width * (props.max - props.min) + props.min, props.min), props.max);
    value.value = await snapToStep(newValue);  // Snap to the nearest step
    if (props.onValueChange) {
      props.onValueChange([value.value]);
    }
  });
  
  const onThumbEnd = $(() => {
    isDragging.value = false;
  });
  
  useOnDocument('mousemove', onThumbMove);
  useOnDocument('touchmove', onThumbMove);
  useOnDocument('mouseup', onThumbEnd);
  useOnDocument('touchend', onThumbEnd);
  
  return (
    <div class={['relative w-full', props.className].join(' ')}>
      <div
        class="h-2 bg-gray-300 rounded-full relative cursor-pointer"
        ref={trackRef}
        onClick$={moveToClickPosition}
      >
        <div class="h-2 bg-indigo-600 rounded-full" style={{ width: `${((value.value - props.min) / (props.max - props.min)) * 100}%` }}></div>
        {props.value.map((_, index) => (
          <div
            key={index}
            class="w-5 h-5 bg-indigo-600 rounded-full absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing"
            style={{ left: `${((value.value - props.min) / (props.max - props.min)) * 100}%` }}
            onMouseDown$={() => isDragging.value = true}
            onTouchStart$={() => isDragging.value = true}
          ></div>
        ))}
      </div>
    </div>
  );
});
