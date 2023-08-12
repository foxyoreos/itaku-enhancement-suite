import ComponentFactory from "./Base.js";

const LayoutSection = ComponentFactory({
  template: document.querySelector('#layout-section'),
  attributes: {
    title: (self, value) => {
      self.shadowRoot.querySelector('#title').innerText = value;
    },
    description: (self, value) => {
      self.shadowRoot.querySelector('#description').innerText = value;
    }
  },
});

customElements.define('layout-section', LayoutSection);
export default LayoutSection;
