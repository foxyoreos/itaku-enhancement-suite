(function () {
  'use strict';

  /* Read settings. */
  const self = document.querySelector('script[data-key="search-fixes.js"]');
  const fixCopyPaste = self.getAttribute('data-tag_search_copy_paste') == "true";
  const deduplicateSuggestions = self.getAttribute('data-tag_search_filter_duplicates') == "true";

  // const triggerRender = (() => {
  //   const context = document.querySelector('mat-sidenav-container').__ngContext__[8];
  //   return () => {
  //     context.renderer.delegate.eventManager._zone.onMicrotaskEmpty.emit();
  //   }
  // })();

  const AppTagSearchParent = customElements.get('app-tag-search') || HTMLElement;
  class AppTagSearch extends AppTagSearchParent {
    static observedAttributes = [];
    constructor() {
      super();
      this.__ItakuES__ = {};
    }

    connectedCallback() {
      const self = this.__ItakuES__;
      self.searchElement = this.children[0];
      self.searchComponent = self.searchElement.__ngContext__[8];

      /* Deduplicate search results */
      if (deduplicateSuggestions) {
        self.tagSuggestions = null;
        self.currentTags = self.searchComponent.currentTags;
        Object.defineProperty(self.searchComponent, 'tagSuggestions', {
          get () { return self.tagSuggestions; },
          set (value) {
            self.currentTags = self.searchComponent.currentTags ?
              self.searchComponent.currentTags.map((tag) => tag.name) : [];

            self.tagSuggestions = value.filter((suggestion) => {
              if (suggestion.synonymous_to) {
                return !self.currentTags.includes(suggestion.synonymous_to.name);
              }

              return !self.currentTags.includes(suggestion.name);
            });

            return self.tagSuggestions;
          }
        });
      }

      /* Allow easier copy/paste */
      if (fixCopyPaste) {
        this.addEventListener('copy', (event) => {
          const tags = self.searchComponent.currentTags
                .map((tag) => tag.name).join(' ');
          event.clipboardData.setData('text/plain', tags);
          event.preventDefault();
        });

        this.addEventListener('paste', (event) => {
          const tagText = event.clipboardData.getData('text');
          const tags = tagText.split(' ');
          if (tags.length > 1) {
            self.searchComponent.addTags(tags.map((tag) => ({ name: tag })));
            event.preventDefault();
          }
        });
      }
    }
  }

  customElements.define('app-tag-search', AppTagSearch);

 //  const AppTagSuggestionsParent = customElements.get('app-tag-suggestions') || HTMLElement;
 //  class AppTagSuggestions extends AppTagSuggestionsParent {
 //    static observedAttributes = [];
 //    constructor() {
 //      super();
 //      this.__ItakuES__ = {};
 //    }

 //    connectedCallback() {
 //      const self = this.__ItakuES__;
 //      self.componentElement = this.children[0];
 //      self.suggestComponent = self.componentElement.__ngContext__[8];

 //      self.tagSuggestions = [];
 //      self.currentTags = [];
 //      Object.defineProperty(self.suggestComponent, 'defaultSuggestedTags', {
 //        get () { return self.tagSuggestions; },
 //        set (value) {
 //          console.log(value);
 //          self.currentTags = self.suggestComponent.currentTags ?
 //            self.suggestComponent.currentTags.map((tag) => tag.name) : [];

 //          self.tagSuggestions = value.filter((suggestion) => {
 //            if (suggestion.synonymous_to) {
 //              return !self.currentTags.includes(suggestion.synonymous_to.name);
 //            }

 //            return !self.currentTags.includes(suggestion.name);
 //          });

 //          return self.tagSuggestions;
 //        }
 //      });
 //    }
 //  }

 // customElements.define('app-tag-suggestions', AppTagSuggestions);
})();
