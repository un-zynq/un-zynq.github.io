/**
 * ZYNQ SDK v1.0
 * Handles Alias Resolution, Data Fetching, and Custom Element Definition.
 */

(function() {
  'use strict';

  // 1. THE REGISTRY ENGINE
  // This object manages the game data
  window.ZynqSDK = {
    _registry: null,
    _basePath: document.querySelector('base') ? document.querySelector('base').href : window.location.origin + '/',

    // Fetch the games.json file once and cache it
    getRegistry: async function() {
      if (this._registry) return this._registry;
      
      try {
        const res = await fetch(this._basePath + 'games.json');
        if (!res.ok) throw new Error('Network error');
        
        this._registry = await res.json();
        return this._registry;
      } catch (err) {
        console.error("ZYNQ SDK: Failed to load registry.", err);
        return {};
      }
    },

    // Resolve an alias (e.g., "geometry-dash") to a full URL
    resolveAlias: async function(alias) {
      const registry = await this.getRegistry();
      
      // Find the folder key (g1, g2, etc) that contains this game
      let folderKey = null;
      
      for (const [key, games] of Object.entries(registry)) {
        if (games.includes(alias)) {
          folderKey = key;
          break;
        }
      }

      if (!folderKey) {
        console.warn(`ZYNQ SDK: Alias "${alias}" not found.`);
        return null;
      }

      return `${this._basePath}${folderKey}/${alias}/`;
    }
  };

  // 2. THE CUSTOM ELEMENT
  class ZynqGame extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' }); // Isolation
      this._resolvedUrl = null;
    }

    connectedCallback() {
      // Check for IntersectionObserver (Lazy Loading)
      // If browser doesn't support it, load immediately
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) {
            this.init();
            observer.disconnect();
          }
        }, { rootMargin: "200px" }); // Start loading 200px before visible
        
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

      // Use the SDK to resolve the URL
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
          :host { display: block; width: 100%; height: 100%; min-height: 300px; background: #0a0a0c; position: relative; }
          .core-loader { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; font-family: 'Inter', sans-serif; color: #71717a; font-size: 14px; }
          .spinner { width: 20px; height: 20px; border: 2px solid #27272a; border-top-color: #6366f1; border-radius: 50%; margin: 0 auto 12px; animation: spin 0.8s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
        </style>
        <div class="core-loader">
          <div class="spinner"></div>
          Initializing...
        </div>
      `;
    }

    renderIframe(url) {
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: block; width: 100%; height: 100%; overflow: hidden; }
          iframe { width: 100%; height: 100%; border: none; background: #000; }
        </style>
        <iframe src="${url}" allowfullscreen loading="lazy"></iframe>
      `;
    }

    renderError(msg) {
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: flex; align-items: center; justify-content: center; height: 300px; background: #09090b; color: #ef4444; font-family: 'JetBrains Mono', monospace; font-size: 12px; padding: 20px; text-align: center; border: 1px dashed #27272a; }
        </style>
        <div>
          <strong>SDK Error:</strong><br>
          ${msg}
        </div>
      `;
    }
  }

  // Define the element
  if (!customElements.get('zynq-game')) {
    customElements.define('zynq-game', ZynqGame);
  }

})();
