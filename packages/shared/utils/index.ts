export const sayHi = (userName: string) => (`Hi ${userName} 👋`)
export function base64ToBinary(base64: string) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}


// Function to calculate luminance and detect if color is dark or light
export const isDarkColor = (color: string) => {
  // Create a temporary div to get the computed color
  const tempDiv = document.createElement('div');
  tempDiv.style.color = color;
  document.body.appendChild(tempDiv);
  
  // Get the computed RGB color
  const computedColor = getComputedStyle(tempDiv).color;
  document.body.removeChild(tempDiv);
  if(!computedColor || !computedColor.match(/\d+/g)) return false;
  // Extract RGB values from the computed color
  const [r, g, b] = computedColor.match(/\d+/g)?.map(Number) as number[];
  
  // Calculate luminance
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance < 128; // If luminance is below 128, consider it dark
};

export function getEffectiveBackgroundColor(element: HTMLElement) {
  if (!(element instanceof Element)) return '';
  let bgColor = '';
  while (element && (bgColor === '' || bgColor === 'transparent' || bgColor === 'rgba(0, 0, 0, 0)')) {
    bgColor = window.getComputedStyle(element).backgroundColor;
    element = element.parentElement as HTMLElement;
  }
  return bgColor;
}
