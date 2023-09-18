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
  setup: function () {
    /* Extra control for collapse */

    /* Collapse handler */
    const collapse = this.shadowRoot.querySelector('#collapse');
    const body = this.shadowRoot.querySelector('.body');
    const baseHeight = 1000;
    const baseSpeed = 0.5;
    let currentHeight = baseHeight;
    let currentSpeed = baseSpeed;

    /* Start collapsed. */
    if (collapse.checked) { body.style.maxHeight = '0'; }
    body.style.transition = `max-height ${currentSpeed}s linear`

    collapse.addEventListener('change', (event) => {
      if (event.target.checked) { /* Set proper height value if we're closing */
        currentHeight = body.getBoundingClientRect().height;
        currentSpeed = baseSpeed * currentHeight / baseHeight;
        body.style.maxHeight = `${currentHeight}px`;
        body.style.transition = `max-height ${currentSpeed}s linear`
        setTimeout(() => {
          body.style.maxHeight = '0';
        }, 0);
        return;
      }

      /* Start the animation. */
      body.style.maxHeight = '0';
      setTimeout(() => {
        body.style.maxHeight = `${currentHeight}px`;

        /* If we're opening, wait for the animation to finish and then set height back to "auto" */
        const timeout = currentSpeed * 1000 + 100;
        setTimeout(() => {
          if (!collapse.checked) {
            body.style.maxHeight = 'fit-content';
          }
        }, timeout);

      }, 0);
    });
  }
});

customElements.define('layout-section', LayoutSection);
export default LayoutSection;
