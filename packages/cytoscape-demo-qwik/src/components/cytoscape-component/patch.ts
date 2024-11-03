import {
  Core,
  ElementDefinition,
  ElementsDefinition,
  LayoutOptions,
} from 'cytoscape';
import { diff } from 'deep-diff';
import get from 'lodash/get';
import forEach from 'lodash/forEach';
type DiffFunction = typeof diff;
type ToJsonFunction<T> = (obj: T | null | undefined) => any;

export const patch = (
  cy: Core,
  prevProps: any,
  newProps: any,
  diffFunc: DiffFunction,
  toJsonFunc: ToJsonFunction<any>,
  getFunc: typeof get,
  forEachFunc: typeof forEach
): void => {
  cy.batch(() => {
    if (isDiffAtKey(prevProps, newProps, diffFunc, 'elements')) {
      patchElements(
        cy,
        getFunc(prevProps, 'elements'),
        getFunc(newProps, 'elements'),
        toJsonFunc,
        getFunc,
        forEachFunc,
        diffFunc
      );
    }
    
    if (isDiffAtKey(prevProps, newProps, diffFunc, 'style')) {
      patchStyle(
        cy,
        getFunc(prevProps, 'style'),
        getFunc(newProps, 'style'),
        toJsonFunc
      );
    }
    
    // Update all other properties of the cy instance
    Object.keys(newProps).forEach((key) => {
      if (
        key !== 'elements' &&
        key !== 'style' &&
        key !== 'layout' &&
        isDiffAtKey(prevProps, newProps, diffFunc, key as keyof Core)
      ) {
        patchJson(
          cy,
          key as keyof Core,
          getFunc(prevProps, key),
          getFunc(newProps, key),
          toJsonFunc
        );
      }
    });
  });
  
  if (isDiffAtKey(prevProps, newProps, diffFunc, 'layout')) {
    patchLayout(
      cy,
      getFunc(prevProps, 'layout'),
      getFunc(newProps, 'layout'),
      toJsonFunc
    );
  }
};

const isDiffAtKey = <T, K extends keyof T>(
  prevProps: T | null | undefined,
  newProps: T | null | undefined,
  diffFunc: DiffFunction,
  key: K
): boolean => {
  return diffFunc(get(prevProps, key), get(newProps, key)) !== undefined;
};

const patchJson = (
  cy: Core,
  key: keyof Core,
  prevVal: any,
  newVal: any,
  toJsonFunc: ToJsonFunction<any>
): void => {
  const setter = cy[key] as (value: any) => any;
  if (typeof setter === 'function') {
    setter.call(cy, toJsonFunc(newVal));
  }
};

const patchLayout = (
  cy: Core,
  prevLayout: any,
  newLayout: any,
  toJsonFunc: ToJsonFunction<any>
): void => {
  const layoutOpts = toJsonFunc(newLayout) as LayoutOptions | null;
  
  if (layoutOpts != null) {
    cy.layout(layoutOpts).run();
  }
};

const patchStyle = (
  cy: Core,
  prevStyle: any,
  newStyle: any,
  toJsonFunc: ToJsonFunction<any>
): void => {
  const style = cy.style();
  
  if (style == null) {
    return;
  }
  
  style.fromJson(toJsonFunc(newStyle)).update();
};

const patchElements = (
  cy: Core,
  prevElements: ElementsDefinition | ElementDefinition[] | null | undefined,
  newElements: ElementsDefinition | ElementDefinition[] | null | undefined,
  toJsonFunc: ToJsonFunction<any>,
  getFunc: typeof get,
  forEachFunc: typeof forEach,
  diffFunc: DiffFunction
): void => {
  const toAdd: ElementDefinition[] = [];
  const toRemove = cy.collection();
  const toUpdate: { id: string; eleData: ElementDefinition }[] = [];
  
  const prevElementsMap = buildElementsMap(prevElements);
  const newElementsMap = buildElementsMap(newElements);
  
  // Determine elements to remove
  forEachFunc(prevElementsMap, (ele, id) => {
    if (!newElementsMap[id]) {
      toRemove.merge(cy.getElementById(id));
    }
  });
  
  // Determine elements to add or update
  forEachFunc(newElementsMap, (ele, id) => {
    if (!prevElementsMap[id]) {
      toAdd.push(toJsonFunc(ele));
    } else if (diffFunc(prevElementsMap[id], ele)) {
      toUpdate.push({ id, eleData: ele });
    }
  });
  
  // Remove elements
  if (toRemove.length > 0) {
    cy.remove(toRemove);
  }
  
  // Add new elements
  if (toAdd.length > 0) {
    cy.add(toAdd);
  }
  
  // Update existing elements
  toUpdate.forEach(({ id, eleData }) => {
    const cyEle = cy.getElementById(id);
    patchElement(cy, cyEle, prevElementsMap[id], eleData, toJsonFunc, getFunc, diffFunc);
  });
};

const buildElementsMap = (
  elements: ElementsDefinition | ElementDefinition[] | null | undefined
): { [id: string]: ElementDefinition } => {
  const elementsMap: { [id: string]: ElementDefinition } = {};
  
  if (Array.isArray(elements)) {
    elements.forEach((ele) => {
      const id = get(ele, 'data.id');
      if (id) {
        elementsMap[id] = ele;
      }
    });
  } else if (elements) {
    ['nodes', 'edges'].forEach((group) => {
      if (elements[group as keyof ElementsDefinition]) {
        (elements[group as keyof ElementsDefinition] as ElementDefinition[]).forEach(
          (ele) => {
            const id = get(ele, 'data.id');
            if (id) {
              elementsMap[id] = ele;
            }
          }
        );
      }
    });
  }
  
  return elementsMap;
};

const patchElement = (
  cy: Core,
  cyEle: cytoscape.SingularElementReturnValue,
  prevEle: ElementDefinition,
  newEle: ElementDefinition,
  toJsonFunc: ToJsonFunction<any>,
  getFunc: typeof get,
  diffFunc: DiffFunction
): void => {
  // Handle edges with changed source or target
  if (cyEle.isEdge()) {
    const prevSource = getFunc(prevEle, 'data.source');
    const newSource = getFunc(newEle, 'data.source');
    const prevTarget = getFunc(prevEle, 'data.target');
    const newTarget = getFunc(newEle, 'data.target');
    
    if (diffFunc(prevSource, newSource) || diffFunc(prevTarget, newTarget)) {
      // Remove and re-add the edge
      cyEle.remove();
      cy.add(newEle);
      return; // Exit the function, as we have handled the edge
    }
  }
  
  const patch: Partial<ElementDefinition> = {};
  const keysToCheck: (keyof ElementDefinition)[] = [
    'data',
    'position',
    'group',
    'selected',
    'selectable',
    'locked',
    'grabbable',
    'classes',
    'scratch',
    'style', // Include 'style' if you need to handle inline styles
    'css',   // For inline CSS styles (though 'style' is more standard)
  ];
  
  keysToCheck.forEach((key) => {
    const prevVal = getFunc(prevEle, key);
    const newVal = getFunc(newEle, key);
    
    if (diffFunc(prevVal, newVal)) {
      patch[key] = toJsonFunc(newVal);
    }
  });
  
  // Apply patches
  if (Object.keys(patch).length > 0) {
    if (patch.data) {
      cyEle.data(patch.data);
    }
    if (patch.position) {
      cyEle.position(patch.position);
    }
    if (patch.selected !== undefined) {
      if (patch.selected) {
        cyEle.select();
      } else {
        cyEle.unselect();
      }
    }
    if (patch.selectable !== undefined) {
      if (patch.selectable) {
        cyEle.selectify();
      } else {
        cyEle.unselectify();
      }
    }
    if (patch.locked !== undefined) {
      if (patch.locked) {
        cyEle.lock();
      } else {
        cyEle.unlock();
      }
    }
    if (patch.grabbable !== undefined) {
      if (patch.grabbable) {
        cyEle.grabify();
      } else {
        cyEle.ungrabify();
      }
    }
    if (patch.classes) {
      cyEle.classes(patch.classes);
    }
    if (patch.scratch) {
      cyEle.scratch(patch.scratch);
    }
    if (patch.group && cyEle.group() !== patch.group) {
      // Changing group is not supported directly; remove and re-add the element
      cyEle.remove();
      cy.add(newEle);
      return;
    }
    if (patch.style) {
      cyEle.style(patch.style);
    }
    if (patch.css) {
      cyEle.css(patch.css);
    }

  }
};
