'use strict';

/* If you're a developer coming into this file, a lot of it might be unfamiliar
 * to you. This is a very light framework around web components, using HTML
 * templates. This is the "base" class. I'm using this to reduce boilerplate and
 * to make sure that my actual UI components don't have any common bugs. */
function ComponentFactory ({
  parent = HTMLElement, /* What to extend from */
  template, /* What to use as the HTML template */

  attributes = {}, /* Attribute changed callbacks: { name: function } */
  events = {}, /* Arbitrary event listeners: { id: { event: function } } */
  methods = {}, /* arbitrary methods that can be called externally (bound to this): { name: function } */

  /* Methods */
  setup, /* called in connectedCallback */
}) {
  class FactoryClass extends parent {
    static get observedAttributes () {
      /* Correctly wire observed attributes to parent */
      return Object.keys(attributes).concat(super.observedAttributes);
    }

    constructor () {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      shadow.appendChild(template.content.cloneNode(true));
    }
    connectedCallback() {
      super.connectedCallback?.();

      if (setup) { setup.call(this); } /* For non-attribute setup (which should be rare) */

      /* Fire off initial connection event for each observed attribute. */
      this.constructor.observedAttributes?.forEach((attribute) => {
        const value = this.getAttribute(attribute);
        this.attributeChangedCallback(this, value, undefined);
      });

      /* Attach event listeners */
      Object.keys(events).forEach((id) => {
        const element = this.getElementById(id);
        if (!element) { return; }

        Object.keys(events[id]).forEach((event) => {
          element.addEventListener(event, events[id][event], false);
        });
      });
    }

    attributeChangedCallback(name, prev, value) {
      super.attributeChangedCallback?.();

      /* Allow simpler attribute change event bindings */
      if (attributes[name] && prev !== value) {
        attributes[name].call(this, this, value, prev);
      }
    }
  }

  /* Attach custom methods */
  Object.keys(methods).forEach((name) => {
    FactoryClass.prototype[name] = methods[name];
  });

  return FactoryClass;
}

export default ComponentFactory;
