/* BloomspireSearchReconPR.js
 * Siebel Open UI physical renderer. Loads the recon bundle and mounts it
 * under the view tab. The bundle calls Siebel. It does not call Elasticsearch.
 *
 * Siebel loads siebel/custom/bspre-recon-bundle.js before this factory runs.
 * ShowUI, BindEvents, and a BindData refresh share one host: the host is
 * inserted after #s_<GetFullId>_div and the applet div is hidden. EndLife
 * removes the host and shows the applet div again. If mount is missing, a
 * failed script tag is removed and the bundle URL is requested again.
 */
if (
  typeof SiebelAppFacade !== "undefined" &&
  typeof SiebelJS !== "undefined" &&
  typeof define === "function" &&
  typeof SiebelAppFacade.BloomspireSearchReconPR === "undefined"
) {
  SiebelJS.Namespace("SiebelAppFacade.BloomspireSearchReconPR");

  define(
    "siebel/custom/BloomspireSearchReconPR",
    ["siebel/phyrenderer", "siebel/custom/bspre-recon-bundle.js"],
    function (phyRenderer, bundleModule) {
      var BUNDLE_SRC = "/siebel/scripts/siebel/custom/bspre-recon-bundle.js";
      var HOST_CLASS = "bspre-recon-host";

      function bundleApi() {
        if (bundleModule && typeof bundleModule.mount === "function") {
          return bundleModule;
        }
        if (
          bundleModule &&
          bundleModule.default &&
          typeof bundleModule.default.mount === "function"
        ) {
          return bundleModule.default;
        }
        if (
          window.BloomspireSearchRecon &&
          typeof window.BloomspireSearchRecon.mount === "function"
        ) {
          return window.BloomspireSearchRecon;
        }
        return null;
      }

      function isReconHost(node) {
        return !!(
          node &&
          node.nodeType === 1 &&
          node.classList &&
          node.classList.contains(HOST_CLASS)
        );
      }

      SiebelAppFacade.BloomspireSearchReconPR = (function () {
        function BloomspireSearchReconPR(pm) {
          SiebelAppFacade.BloomspireSearchReconPR.superclass.constructor.apply(this, arguments);
          this._host = null;
          this._unmount = null;
          this._mountGeneration = 0;
          this._mountPending = false;
          this._hostReady = false;
          this._hiddenApplet = null;
          this._hiddenAppletDisplay = "";
        }

        SiebelJS.Extend(BloomspireSearchReconPR, SiebelAppFacade.PhysicalRenderer);

        BloomspireSearchReconPR.prototype._appletDiv = function () {
          var pm = typeof this.GetPM === "function" ? this.GetPM() : null;
          if (!pm || typeof pm.Get !== "function") {
            return null;
          }
          var fullId = pm.Get("GetFullId");
          if (!fullId) {
            return null;
          }
          return document.getElementById("s_" + fullId + "_div");
        };

        BloomspireSearchReconPR.prototype._hideApplet = function (applet) {
          if (!applet) {
            return;
          }
          if (this._hiddenApplet && this._hiddenApplet !== applet) {
            this._hiddenApplet.style.display = this._hiddenAppletDisplay;
          }
          if (this._hiddenApplet !== applet) {
            this._hiddenAppletDisplay = applet.style.display;
            this._hiddenApplet = applet;
          }
          applet.style.display = "none";
        };

        BloomspireSearchReconPR.prototype._restoreApplet = function () {
          if (!this._hiddenApplet) {
            return;
          }
          this._hiddenApplet.style.display = this._hiddenAppletDisplay;
          this._hiddenApplet = null;
          this._hiddenAppletDisplay = "";
        };

        BloomspireSearchReconPR.prototype._releaseHost = function () {
          this._mountGeneration += 1;
          this._mountPending = false;
          this._hostReady = false;
          var unmount = this._unmount;
          this._unmount = null;
          if (typeof unmount === "function") {
            unmount();
          }
          if (this._host && this._host.parentNode) {
            this._host.parentNode.removeChild(this._host);
          }
          this._host = null;
          this._restoreApplet();
        };

        BloomspireSearchReconPR.prototype._hostIsLive = function () {
          return this._mountPending || this._hostReady;
        };

        BloomspireSearchReconPR.prototype._ensureHost = function () {
          var applet = this._appletDiv();
          var placed =
            this._host &&
            applet &&
            this._host.parentNode &&
            applet.nextElementSibling === this._host;
          if (placed && this._hostIsLive()) {
            this._hideApplet(applet);
            return;
          }
          if (this._host || this._hiddenApplet) {
            this._releaseHost();
          }
          applet = this._appletDiv();
          if (!applet || !applet.parentNode) {
            return;
          }
          var neighbor = applet.nextElementSibling;
          if (isReconHost(neighbor)) {
            neighbor.parentNode.removeChild(neighbor);
          }
          var host = document.createElement("div");
          host.className = HOST_CLASS;
          applet.parentNode.insertBefore(host, applet.nextSibling);
          this._host = host;
          this._hideApplet(applet);
          var self = this;
          var generation = this._mountGeneration;
          this._mountPending = true;
          loadBundle(
            function () {
              if (generation !== self._mountGeneration || !self._host) {
                return;
              }
              self._mountPending = false;
              var api = bundleApi();
              if (!api) {
                self._host.textContent =
                  "The recon bundle loaded but did not register BloomspireSearchRecon.mount.";
                return;
              }
              self._hostReady = true;
              self._unmount = api.mount(self._host);
            },
            function () {
              if (generation !== self._mountGeneration || !self._host) {
                return;
              }
              self._mountPending = false;
              self._host.textContent =
                "The recon bundle did not load. Expected " + BUNDLE_SRC + ".";
            }
          );
        };

        BloomspireSearchReconPR.prototype.Init = function () {
          SiebelAppFacade.BloomspireSearchReconPR.superclass.Init.apply(this, arguments);
        };

        BloomspireSearchReconPR.prototype.ShowUI = function () {
          SiebelAppFacade.BloomspireSearchReconPR.superclass.ShowUI.apply(this, arguments);
          this._ensureHost();
        };

        BloomspireSearchReconPR.prototype.BindData = function (bRefresh) {
          SiebelAppFacade.BloomspireSearchReconPR.superclass.BindData.apply(this, arguments);
          if (bRefresh) {
            this._ensureHost();
          }
        };

        BloomspireSearchReconPR.prototype.BindEvents = function () {
          SiebelAppFacade.BloomspireSearchReconPR.superclass.BindEvents.apply(this, arguments);
          // Applet placeholder is #s_<GetFullId>_div. Insert the host after it and hide the div.
          this._ensureHost();
        };

        BloomspireSearchReconPR.prototype.EndLife = function () {
          this._releaseHost();
          SiebelAppFacade.BloomspireSearchReconPR.superclass.EndLife.apply(this, arguments);
        };

        function loadBundle(onLoad, onError) {
          if (bundleApi()) {
            onLoad();
            return;
          }
          var existing = document.querySelector("script[data-bspre-recon-bundle]");
          if (existing && existing.parentNode) {
            existing.parentNode.removeChild(existing);
          }
          var script = document.createElement("script");
          script.src = BUNDLE_SRC;
          script.async = true;
          script.setAttribute("data-bspre-recon-bundle", "true");
          script.onload = onLoad;
          script.onerror = onError;
          document.head.appendChild(script);
        }

        return BloomspireSearchReconPR;
      })();

      return "SiebelAppFacade.BloomspireSearchReconPR";
    }
  );
}
