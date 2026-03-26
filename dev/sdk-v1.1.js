/**
 * ZYNQ SDK v1.1
 * Handles Remote Registry Fetching, Alias Resolution, and Custom Element Definition.
 */

(function() {
  'use strict';

  // 1. THE REGISTRY ENGINE
  window.ZynqSDK = {
    _registry: null,
    // De bron van de games data
    _registryUrl: 'https://un-zynq.github.io/games.json',
    // De basismap waar de mappen g1, g2, etc. staan
    _cdnBase: 'https://un-zynq.github.io/',

    // Fetch the games.json from the GitHub pages URL
    getRegistry: async function() {
      if (this._registry) return this._registry;
      
      try {
        const res = await fetch(this._registryUrl);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        
        this._registry = await res.json();
        return this._registry;
      } catch (err) {
        console.error("ZYNQ SDK: Failed to load remote registry.", err);
        return {};
      }
    },

    // Resolve an alias (e.g., "1v1-lol") to the remote folder URL
    resolveAlias: async function(alias) {
      const registry = await this.getRegistry();
      
      let folderKey = null;
      for (const [key, games] of Object.entries(registry)) {
        if (Array.isArray(games) && games.includes(alias)) {
          folderKey = key;
          break;
        }
      }

      if (!folderKey) {
        console.warn(`ZYNQ SDK: Alias "${alias}" not found in registry.`);
        return null;
      }

      // Geeft bijv. terug: https://un-zynq.github.io/g1/1v1-lol/
      return `${this._cdnBase}${folderKey}/${alias}/`;
    }
  };

  // 2. THE CUSTOM ELEMENT
  class ZynqGame extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) {
            this.init();
            observer.disconnect();
          }
        }, { rootMargin: "200px" });
        observer.observe(this);
      } else {
        this.init();
      }
    }

    async init() {
      const alias = this.getAttribute('alias');
      
      if (!alias) {
        this.renderError("Missing 'alias' attribute.");
        return;
      }

      this.renderLoader();

      const url = await window.ZynqSDK.resolveAlias(alias);

      if (url) {
        this.renderIframe(url);
      } else {
        this.renderError(`Game "${alias}" not found.`);
      }
    }

    renderLoader() {
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: block; width: 100%; height: 100%; min-height: 300px; background: #0a0a0c; position: relative; border-radius: 8px; overflow: hidden; }
          .core-loader { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; font-family: sans-serif; color: #71717a; font-size: 14px; }
          .spinner { width: 24px; height: 24px; border: 3px solid #27272a; border-top-color: #6366f1; border-radius: 50%; margin: 0 auto 12px; animation: spin 0.8s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
        </style>
        <div class="core-loader">
          <div class="spinner"></div>
          Laden...
        </div>
      `;
    }

    renderIframe(url) {
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: block; width: 100%; height: 100%; overflow: hidden; background: #000; border-radius: 8px; }
          iframe { width: 100%; height: 100%; border: none; }
        </style>
        <iframe src="${url}" allowfullscreen loading="lazy" allow="autoplay; gamepad; keyboard"></iframe>
      `;
    }

    renderError(msg) {
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: flex; align-items: center; justify-content: center; height: 300px; background: #09090b; color: #ef4444; font-family: monospace; font-size: 13px; padding: 20px; text-align: center; border: 1px dashed #3f3f46; border-radius: 8px; }
        </style>
        <div>
          <strong style="color: #fff">SDK Error</strong><br>${msg}
        </div>
      `;
    }
  }

  // Define the element
  if (!customElements.get('zynq-game')) {
    customElements.define('zynq-game', ZynqGame);
  }

})();
