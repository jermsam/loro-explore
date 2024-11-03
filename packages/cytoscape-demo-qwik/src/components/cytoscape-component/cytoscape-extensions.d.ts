// cytoscape-extensions.d.ts
import * as cytoscape from 'cytoscape';

declare module 'cytoscape' {
  interface SingularElementReturnValue {
    /**
     * Get the element's JSON representation.
     */
    json(): cytoscape.ElementDefinition;
    
    /**
     * Set properties of the element.
     * @param obj An object containing fields to update in the element's data.
     */
    json(obj: Partial<cytoscape.ElementDefinition>): this;
  }
}
