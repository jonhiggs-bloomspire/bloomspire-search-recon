function installSiebel() {
  function PhysicalRenderer(pm) {
    this._pm = pm;
  }
  PhysicalRenderer.prototype.GetPM = function GetPM() {
    return this._pm;
  };
  PhysicalRenderer.prototype.Init = jest.fn();
  PhysicalRenderer.prototype.ShowUI = jest.fn();
  PhysicalRenderer.prototype.BindData = jest.fn();
  PhysicalRenderer.prototype.BindEvents = jest.fn();
  PhysicalRenderer.prototype.EndLife = jest.fn();

  global.SiebelAppFacade = { PhysicalRenderer };
  global.SiebelJS = {
    Namespace: jest.fn(),
    Extend(child, parent) {
      const proto = Object.create(parent.prototype);
      child.prototype = proto;
      child.prototype.constructor = child;
      child.superclass = parent.prototype;
    },
  };
}

function loadRenderer(bundleModule) {
  jest.resetModules();
  document.head.innerHTML = "";
  document.body.innerHTML = "";
  delete window.BloomspireSearchRecon;
  installSiebel();
  let captured = null;
  global.define = (name, deps, factory) => {
    captured = { name, deps, factory };
  };
  require("../../BloomspireSearchReconPR");
  if (!captured) {
    throw new Error("Renderer did not call define");
  }
  captured.factory(() => {}, bundleModule);
  return { ...captured, PR: global.SiebelAppFacade.BloomspireSearchReconPR };
}

function mountRenderer(PR, fullId = "A1") {
  document.body.innerHTML = `<div id="s_${fullId}_div" style="display:block"></div>`;
  const pm = {
    Get(name) {
      return name === "GetFullId" ? fullId : null;
    },
  };
  const renderer = new PR(pm);
  const div = document.getElementById(`s_${fullId}_div`);
  return { renderer, div };
}

describe("BloomspireSearchReconPR", () => {
  test("registers the physical renderer and its bundle dependency", () => {
    const unmount = jest.fn();
    const loaded = loadRenderer({ mount: jest.fn(() => unmount) });
    expect(loaded.name).toBe("siebel/custom/BloomspireSearchReconPR");
    expect(loaded.deps).toEqual(["siebel/phyrenderer", "siebel/custom/bspre-recon-bundle.js"]);
    expect(loaded.factory(() => {}, { mount: jest.fn(() => unmount) })).toBe(
      "SiebelAppFacade.BloomspireSearchReconPR"
    );
  });

  test("ShowUI inserts one host after the applet and reuses it", () => {
    const unmount = jest.fn();
    const mount = jest.fn(() => unmount);
    const { PR } = loadRenderer({ mount });
    const { renderer, div } = mountRenderer(PR);
    renderer.Init();
    renderer.ShowUI();
    renderer.BindEvents();
    renderer.BindData(false);
    renderer.BindData(true);
    renderer.ShowUI();

    const host = div.nextElementSibling;
    expect(host.className).toBe("bspre-recon-host");
    expect(div.style.display).toBe("none");
    expect(document.querySelectorAll(".bspre-recon-host")).toHaveLength(1);
    expect(mount).toHaveBeenCalledTimes(1);
    expect(mount).toHaveBeenCalledWith(host);
    expect(PR.superclass.ShowUI).toHaveBeenCalled();
    expect(PR.superclass.Init).toHaveBeenCalled();
  });

  test("EndLife unmounts, removes the host, and restores the applet", () => {
    const unmount = jest.fn();
    const { PR } = loadRenderer({ mount: jest.fn(() => unmount) });
    const { renderer, div } = mountRenderer(PR);
    renderer.ShowUI();
    renderer.EndLife();
    expect(unmount).toHaveBeenCalledTimes(1);
    expect(document.querySelector(".bspre-recon-host")).toBeNull();
    expect(div.style.display).toBe("block");
    expect(PR.superclass.EndLife).toHaveBeenCalled();
  });

  test("replaces a stale host node and uses a default export", () => {
    const mount = jest.fn(() => jest.fn());
    const { PR } = loadRenderer({ default: { mount } });
    const { renderer, div } = mountRenderer(PR);
    div.insertAdjacentHTML("afterend", '<div class="bspre-recon-host">stale</div>');
    renderer.ShowUI();
    expect(document.querySelectorAll(".bspre-recon-host")).toHaveLength(1);
    expect(mount).toHaveBeenCalledTimes(1);
  });

  test("requests the bundle again when mount is missing", () => {
    const { PR } = loadRenderer({});
    const old = document.createElement("script");
    old.setAttribute("data-bspre-recon-bundle", "true");
    document.head.appendChild(old);
    const { renderer, div } = mountRenderer(PR);
    renderer.ShowUI();
    const scripts = document.querySelectorAll("script[data-bspre-recon-bundle]");
    expect(scripts).toHaveLength(1);
    expect(scripts[0].getAttribute("src")).toBe("/siebel/scripts/siebel/custom/bspre-recon-bundle.js");
    expect(scripts[0]).not.toBe(old);

    const host = div.nextElementSibling;
    scripts[0].onerror();
    expect(host.textContent).toContain("The recon bundle did not load");
    expect(host.textContent).toContain("/siebel/scripts/siebel/custom/bspre-recon-bundle.js");
  });

  test("uses the window mount after the bundle script loads", () => {
    const { PR } = loadRenderer({});
    const { renderer } = mountRenderer(PR);
    renderer.ShowUI();
    const script = document.querySelector("script[data-bspre-recon-bundle]");
    script.onload();
    expect(renderer._host.textContent).toContain("did not register BloomspireSearchRecon.mount");

    renderer.EndLife();
    renderer.ShowUI();
    const mount = jest.fn(() => jest.fn());
    window.BloomspireSearchRecon = { mount };
    document.querySelector("script[data-bspre-recon-bundle]").onload();
    expect(mount).toHaveBeenCalledTimes(1);
  });

  test("ignores a bundle load that finishes after EndLife", () => {
    const { PR } = loadRenderer({});
    const { renderer } = mountRenderer(PR);
    renderer.ShowUI();
    const script = document.querySelector("script[data-bspre-recon-bundle]");
    renderer.EndLife();
    const mount = jest.fn(() => jest.fn());
    window.BloomspireSearchRecon = { mount };
    script.onload();
    expect(mount).not.toHaveBeenCalled();
    expect(document.querySelector(".bspre-recon-host")).toBeNull();
  });

  test("does nothing when the applet div is missing", () => {
    const { PR } = loadRenderer({ mount: jest.fn(() => jest.fn()) });
    document.body.innerHTML = "";
    const renderer = new PR({
      Get() {
        return "missing";
      },
    });
    expect(() => renderer.ShowUI()).not.toThrow();
    expect(document.querySelector(".bspre-recon-host")).toBeNull();
  });
});
