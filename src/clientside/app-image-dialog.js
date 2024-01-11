(function () {
  'use strict';

  const self = document.querySelector('script[data-key="app-image-dialog.js"]');
  const highlightTagMe = self.getAttribute('data-highlight_tagme') == "true";

  const AppImageDetailParent = customElements.get('app-image-detail') || HTMLElement;
  class AppImageDetail extends AppImageDetailParent {
    constructor () {
      super();
      this.__ItakuES__ = {};
    }

    onImageLoad(img) {
      const self = this.__ItakuES__;
      if (!img || !img.tags || !highlightTagMe) { return; }

      const tagMe = img.tags.reduce((result, tag) => {
        return result || tag.name === 'tagme';
      }, false);

      this.classList.toggle('ItakuExtensionSuite__app-image-detail--tagme', tagMe);
      const suggestBtn = this.querySelector('button[data-cy="app-image-detail-suggest-tags-btn"]');
      if (!suggestBtn) { return; }

      let hover = suggestBtn.querySelector('.ItakuExtensionSuite__app-image-detail__TagMeHover');
      if (!hover) {
        hover = document.createElement('span');
        hover.classList.add('ItakuExtensionSuite__app-image-detail__TagMeHover');
        suggestBtn.appendChild(hover);
      }

      hover.textContent = tagMe ?
        'This user has requested help with tagging this image!' :
        'Suggest tags to Add/Remove'
    }

    connectedCallback() {
      const self = this.__ItakuES__;
      self.imageLoader = this.children[0];
      self.imageLoaderComponent = self.imageLoader.__ngContext__[8];

      /* listen for image load event and respond */
      this.onImageLoad(this.image);
      self.imageLoaderComponent.imageChange.subscribe((img) => this.onImageLoad(img));
    }
  }

  customElements.define('app-image-detail', AppImageDetail);
})();
