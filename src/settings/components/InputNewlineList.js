import ComponentFactory from "./Base.js";

const methods = {
  bind: function (getter) {
    const input = this.shadowRoot.querySelector('#input');
    input.addEventListener('input', (e) => {
      const value = e.target.value.split('\n');
      getter(value);
    });

    /* Setter to wire into your own event system. */
    return function (value) {
      input.value = value.join('\n')
    }.bind(this);
  }
};

const InputNewlineList = ComponentFactory({
  template: document.querySelector('#input-newline-list'),
  methods: methods,
  attributes: {
    label: (self, value) => {
      self.shadowRoot.querySelector('#label').innerText = value;
    },
    hint: (self, value) => {
      self.shadowRoot.querySelector('#input').setAttribute('placeholder', value);
    }
  },
});

customElements.define('input-newline-list', InputNewlineList);
export default InputNewlineList;
