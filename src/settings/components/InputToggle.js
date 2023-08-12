import ComponentFactory from "./Base.js";

const methods = {
  bind: function (getter) {
    const input = this.shadowRoot.querySelector('#input');
    input.addEventListener('input', (e) => {
      const value = e.target.checked;
      getter(value);
    });

    /* Setter to wire into your own event system. */
    return function (value) {
      input.checked = value;
    }.bind(this);
  }
};

const InputToggle = ComponentFactory({
  template: document.querySelector('#input-toggle'),
  methods: methods,
  attributes: {
    label: (self, value) => {
      self.shadowRoot.querySelector('#label').innerText = value;
    }
  },
});

customElements.define('input-toggle', InputToggle);
export default InputToggle;
