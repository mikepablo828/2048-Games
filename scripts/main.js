'use strict';
window.DOMHandler = class {
    constructor(c, a) {
        this._iRuntime = c;
        this._componentId = a;
        this._hasTickCallback = !1;
        this._tickCallback = () => this.Tick()
    }
    Attach() {}
    PostToRuntime(c, a, b, d) {
        this._iRuntime.PostToRuntimeComponent(this._componentId, c, a, b, d)
    }
    PostToRuntimeAsync(c, a, b, d) {
        return this._iRuntime.PostToRuntimeComponentAsync(this._componentId, c, a, b, d)
    }
    _PostToRuntimeMaybeSync(c, a, b) {
        this._iRuntime.UsesWorker() ? this.PostToRuntime(c, a, b) : this._iRuntime._GetLocalRuntime()._OnMessageFromDOM({
            type: "event",
            component: this._componentId,
            handler: c,
            dispatchOpts: b || null,
            data: a,
            responseId: null
        })
    }
    AddRuntimeMessageHandler(c, a) {
        this._iRuntime.AddRuntimeComponentMessageHandler(this._componentId, c, a)
    }
    AddRuntimeMessageHandlers(c) {
        for (const [a, b] of c) this.AddRuntimeMessageHandler(a, b)
    }
    GetRuntimeInterface() {
        return this._iRuntime
    }
    GetComponentID() {
        return this._componentId
    }
    _StartTicking() {
        this._hasTickCallback || (this._iRuntime._AddRAFCallback(this._tickCallback), this._hasTickCallback = !0)
    }
    _StopTicking() {
        this._hasTickCallback &&
            (this._iRuntime._RemoveRAFCallback(this._tickCallback), this._hasTickCallback = !1)
    }
    Tick() {}
};
window.RateLimiter = class {
    constructor(c, a) {
        this._callback = c;
        this._interval = a;
        this._timerId = -1;
        this._lastCallTime = -Infinity;
        this._timerCallFunc = () => this._OnTimer();
        this._canRunImmediate = this._ignoreReset = !1
    }
    SetCanRunImmediate(c) {
        this._canRunImmediate = !!c
    }
    Call() {
        if (-1 === this._timerId) {
            var c = Date.now(),
                a = c - this._lastCallTime,
                b = this._interval;
            a >= b && this._canRunImmediate ? (this._lastCallTime = c, this._RunCallback()) : this._timerId = self.setTimeout(this._timerCallFunc, Math.max(b - a, 4))
        }
    }
    _RunCallback() {
        this._ignoreReset = !0;
        this._callback();
        this._ignoreReset = !1
    }
    Reset() {
        this._ignoreReset || (this._CancelTimer(), this._lastCallTime = Date.now())
    }
    _OnTimer() {
        this._timerId = -1;
        this._lastCallTime = Date.now();
        this._RunCallback()
    }
    _CancelTimer() {
        -1 !== this._timerId && (self.clearTimeout(this._timerId), this._timerId = -1)
    }
    Release() {
        this._CancelTimer();
        this._timerCallFunc = this._callback = null
    }
};
"use strict";
window.DOMElementHandler = class extends self.DOMHandler {
    constructor(c, a) {
        super(c, a);
        this._elementMap = new Map;
        this._autoAttach = !0;
        this.AddRuntimeMessageHandlers([
            ["create", b => this._OnCreate(b)],
            ["destroy", b => this._OnDestroy(b)],
            ["set-visible", b => this._OnSetVisible(b)],
            ["update-position", b => this._OnUpdatePosition(b)],
            ["update-state", b => this._OnUpdateState(b)],
            ["focus", b => this._OnSetFocus(b)],
            ["set-css-style", b => this._OnSetCssStyle(b)],
            ["set-attribute", b => this._OnSetAttribute(b)],
            ["remove-attribute",
                b => this._OnRemoveAttribute(b)
            ]
        ]);
        this.AddDOMElementMessageHandler("get-element", b => b)
    }
    SetAutoAttach(c) {
        this._autoAttach = !!c
    }
    AddDOMElementMessageHandler(c, a) {
        this.AddRuntimeMessageHandler(c, b => {
            const d = this._elementMap.get(b.elementId);
            return a(d, b)
        })
    }
    _OnCreate(c) {
        const a = c.elementId,
            b = this.CreateElement(a, c);
        this._elementMap.set(a, b);
        c.isVisible || (b.style.display = "none");
        b.addEventListener("focus", d => this._OnFocus(a));
        b.addEventListener("blur", d => this._OnBlur(a));
        this._autoAttach && document.body.appendChild(b)
    }
    CreateElement(c,
        a) {
        throw Error("required override");
    }
    DestroyElement(c) {}
    _OnDestroy(c) {
        c = c.elementId;
        const a = this._elementMap.get(c);
        this.DestroyElement(a);
        this._autoAttach && a.parentElement.removeChild(a);
        this._elementMap.delete(c)
    }
    PostToRuntimeElement(c, a, b) {
        b || (b = {});
        b.elementId = a;
        this.PostToRuntime(c, b)
    }
    _PostToRuntimeElementMaybeSync(c, a, b) {
        b || (b = {});
        b.elementId = a;
        this._PostToRuntimeMaybeSync(c, b)
    }
    _OnSetVisible(c) {
        this._autoAttach && (this._elementMap.get(c.elementId).style.display = c.isVisible ? "" : "none")
    }
    _OnUpdatePosition(c) {
        if (this._autoAttach) {
            var a =
                this._elementMap.get(c.elementId);
            a.style.left = c.left + "px";
            a.style.top = c.top + "px";
            a.style.width = c.width + "px";
            a.style.height = c.height + "px";
            c = c.fontSize;
            null !== c && (a.style.fontSize = c + "em")
        }
    }
    _OnUpdateState(c) {
        const a = this._elementMap.get(c.elementId);
        this.UpdateState(a, c)
    }
    UpdateState(c, a) {
        throw Error("required override");
    }
    _OnFocus(c) {
        this.PostToRuntimeElement("elem-focused", c)
    }
    _OnBlur(c) {
        this.PostToRuntimeElement("elem-blurred", c)
    }
    _OnSetFocus(c) {
        const a = this._elementMap.get(c.elementId);
        c.focus ? a.focus() :
            a.blur()
    }
    _OnSetCssStyle(c) {
        this._elementMap.get(c.elementId).style[c.prop] = c.val
    }
    _OnSetAttribute(c) {
        this._elementMap.get(c.elementId).setAttribute(c.name, c.val)
    }
    _OnRemoveAttribute(c) {
        this._elementMap.get(c.elementId).removeAttribute(c.name)
    }
    GetElementById(c) {
        return this._elementMap.get(c)
    }
};
"use strict"; {
    var IsWebViewExportType = function(q) {
            return m.has(q)
        },
        BlobToArrayBuffer = function(q) {
            return new Promise((f, k) => {
                const l = new FileReader;
                l.onload = r => f(r.target.result);
                l.onerror = r => k(r);
                l.readAsArrayBuffer(q)
            })
        },
        BlobToString = async function(q) {
            q = await BlobToArrayBuffer(q);
            return (new TextDecoder("utf-8")).decode(q)
        }, AddScript = function(q) {
            if (q.isStringSrc) {
                const f = document.createElement("script");
                f.async = !1;
                f.textContent = q.str;
                document.head.appendChild(f)
            } else return new Promise((f, k) => {
                const l = document.createElement("script");
                l.onload = f;
                l.onerror = k;
                l.async = !1;
                l.src = q;
                document.head.appendChild(l)
            })
        };
    const c = /(iphone|ipod|ipad|macos|macintosh|mac os x)/i.test(navigator.userAgent);
    let a = new Audio;
    const b = {
        "audio/webm; codecs=opus": !!a.canPlayType("audio/webm; codecs=opus"),
        "audio/ogg; codecs=opus": !!a.canPlayType("audio/ogg; codecs=opus"),
        "audio/webm; codecs=vorbis": !!a.canPlayType("audio/webm; codecs=vorbis"),
        "audio/ogg; codecs=vorbis": !!a.canPlayType("audio/ogg; codecs=vorbis"),
        "audio/mp4": !!a.canPlayType("audio/mp4"),
        "audio/mpeg": !!a.canPlayType("audio/mpeg")
    };
    a = null;
    const d = [];
    let g = 0;
    window.RealFile = window.File;
    const n = [],
        t = new Map,
        e = new Map;
    let h = 0;
    const p = [];
    self.runOnStartup = function(q) {
        if ("function" !== typeof q) throw Error("runOnStartup called without a function");
        p.push(q)
    };
    const m = new Set(["cordova", "playable-ad", "instant-games"]);
    window.RuntimeInterface = class q {
        constructor(f) {
            this._useWorker = f.useWorker;
            this._messageChannelPort = null;
            this._baseUrl = "";
            this._scriptFolder = f.scriptFolder;
            this._workerScriptBlobURLs = {};
            this._localRuntime = this._worker = null;
            this._domHandlers = [];
            this._jobScheduler = this._canvas = this._runtimeDomHandler = null;
            this._rafId = -1;
            this._rafFunc = () => this._OnRAFCallback();
            this._rafCallbacks = [];
            this._exportType = f.exportType;
            IsWebViewExportType(this._exportType) && this._useWorker && (console.warn("[C3 runtime] Worker mode is enabled and supported, but is disabled in WebViews due to crbug.com/923007. Reverting to DOM mode."), this._useWorker = !1);
            this._transferablesBroken = !1;
            this._localFileStrings =
                this._localFileBlobs = null;
            //"html5" !== this._exportType && "playable-ad" !== this._exportType || "file" !== location.protocol.substr(0, 4) || alert("Exported games won't work until you upload them. (When running on the file: protocol, browsers block many features from working for security reasons.)");
            this.AddRuntimeComponentMessageHandler("runtime", "cordova-fetch-local-file", k => this._OnCordovaFetchLocalFile(k));
            this.AddRuntimeComponentMessageHandler("runtime", "create-job-worker", k => this._OnCreateJobWorker(k));
            "cordova" === this._exportType ? document.addEventListener("deviceready", () => this._Init(f)) : this._Init(f)
        }
        Release() {
            this._CancelAnimationFrame();
            this._messageChannelPort && (this._messageChannelPort = this._messageChannelPort.onmessage = null);
            this._worker && (this._worker.terminate(), this._worker = null);
            this._localRuntime && (this._localRuntime.Release(), this._localRuntime = null);
            this._canvas && (this._canvas.parentElement.removeChild(this._canvas), this._canvas = null)
        }
        GetCanvas() {
            return this._canvas
        }
        GetBaseURL() {
            return this._baseUrl
        }
        UsesWorker() {
            return this._useWorker
        }
        GetExportType() {
            return this._exportType
        }
        IsiOSCordova() {
            return c &&
                "cordova" === this._exportType
        }
        IsiOSWebView() {
            return c && IsWebViewExportType(this._exportType) || navigator.standalone
        }
        async _Init(f) {
            if ("playable-ad" === this._exportType) {
                this._localFileBlobs = self.c3_base64files;
                this._localFileStrings = {};
                await this._ConvertDataUrisToBlobs();
                for (let l = 0, r = f.engineScripts.length; l < r; ++l) {
                    var k = f.engineScripts[l].toLowerCase();
                    this._localFileStrings.hasOwnProperty(k) ? f.engineScripts[l] = {
                            isStringSrc: !0,
                            str: this._localFileStrings[k]
                        } : this._localFileBlobs.hasOwnProperty(k) &&
                        (f.engineScripts[l] = URL.createObjectURL(this._localFileBlobs[k]))
                }
            }
            f.baseUrl ? this._baseUrl = f.baseUrl : (k = location.origin, this._baseUrl = ("null" === k ? "file:///" : k) + location.pathname, k = this._baseUrl.lastIndexOf("/"), -1 !== k && (this._baseUrl = this._baseUrl.substr(0, k + 1)));
            if (f.workerScripts)
                for (const [l, r] of Object.entries(f.workerScripts)) this._workerScriptBlobURLs[l] = URL.createObjectURL(r);
            k = new MessageChannel;
            this._messageChannelPort = k.port1;
            this._messageChannelPort.onmessage = l => this._OnMessageFromRuntime(l.data);
            window.c3_addPortMessageHandler && window.c3_addPortMessageHandler(l => this._OnMessageFromDebugger(l));
            this._jobScheduler = new self.JobSchedulerDOM(this);
            await this._jobScheduler.Init();
            this.MaybeForceBodySize();
            "object" === typeof window.StatusBar && window.StatusBar.hide();
            "object" === typeof window.AndroidFullScreen && window.AndroidFullScreen.immersiveMode();
            await this._TestTransferablesWork();
            this._useWorker ? await this._InitWorker(f, k.port2) : await this._InitDOM(f, k.port2)
        }
        _GetWorkerURL(f) {
            return this._workerScriptBlobURLs.hasOwnProperty(f) ?
                this._workerScriptBlobURLs[f] : f.endsWith("/workermain.js") && this._workerScriptBlobURLs.hasOwnProperty("workermain.js") ? this._workerScriptBlobURLs["workermain.js"] : "playable-ad" === this._exportType && this._localFileBlobs.hasOwnProperty(f.toLowerCase()) ? URL.createObjectURL(this._localFileBlobs[f.toLowerCase()]) : f
        }
        async CreateWorker(f, k, l) {
            if (f.startsWith("blob:")) return new Worker(f, l);
            if (this.IsiOSCordova() && "file:" === location.protocol) return f = await this.CordovaFetchLocalFileAsArrayBuffer(this._scriptFolder +
                f), f = new Blob([f], {
                type: "application/javascript"
            }), new Worker(URL.createObjectURL(f), l);
            f = new URL(f, k);
            if (location.origin !== f.origin) {
                f = await fetch(f);
                if (!f.ok) throw Error("failed to fetch worker script");
                f = await f.blob();
                return new Worker(URL.createObjectURL(f), l)
            }
            return new Worker(f, l)
        }
        MaybeForceBodySize() {
            if (this.IsiOSWebView()) {
                const f = document.documentElement.style,
                    k = document.body.style,
                    l = window.innerWidth < window.innerHeight,
                    r = l ? window.screen.width : window.screen.height;
                k.height = f.height = (l ? window.screen.height :
                    window.screen.width) + "px";
                k.width = f.width = r + "px"
            }
        }
        _GetCommonRuntimeOptions(f) {
            return {
                baseUrl: this._baseUrl,
                windowInnerWidth: window.innerWidth,
                windowInnerHeight: window.innerHeight,
                devicePixelRatio: window.devicePixelRatio,
                isFullscreen: q.IsDocumentFullscreen(),
                projectData: f.projectData,
                previewImageBlobs: window.cr_previewImageBlobs || this._localFileBlobs,
                previewProjectFileBlobs: window.cr_previewProjectFileBlobs,
                exportType: f.exportType,
                isDebug: -1 < self.location.search.indexOf("debug"),
                ife: !!self.ife,
                jobScheduler: this._jobScheduler.GetPortData(),
                supportedAudioFormats: b,
                opusWasmScriptUrl: window.cr_opusWasmScriptUrl || this._scriptFolder + "opus.wasm.js",
                opusWasmBinaryUrl: window.cr_opusWasmBinaryUrl || this._scriptFolder + "opus.wasm.wasm",
                isiOSCordova: this.IsiOSCordova(),
                isiOSWebView: this.IsiOSWebView(),
                isFBInstantAvailable: "undefined" !== typeof self.FBInstant
            }
        }
        async _InitWorker(f, k) {
            var l = this._GetWorkerURL(f.workerMainUrl);
            this._worker = await this.CreateWorker(l, this._baseUrl, {
                name: "Runtime"
            });
            this._canvas = document.createElement("canvas");
            this._canvas.style.display =
                "none";
            l = this._canvas.transferControlToOffscreen();
            document.body.appendChild(this._canvas);
            window.c3canvas = this._canvas;
            this._worker.postMessage(Object.assign(this._GetCommonRuntimeOptions(f), {
                type: "init-runtime",
                isInWorker: !0,
                messagePort: k,
                canvas: l,
                workerDependencyScripts: f.workerDependencyScripts || [],
                engineScripts: f.engineScripts,
                projectScripts: window.cr_allProjectScripts,
                projectScriptsStatus: self.C3_ProjectScriptsStatus
            }), [k, l, ...this._jobScheduler.GetPortTransferables()]);
            this._domHandlers = n.map(r =>
                new r(this));
            this._FindRuntimeDOMHandler();
            self.c3_callFunction = (r, u) => this._runtimeDomHandler._InvokeFunctionFromJS(r, u);
            "preview" === this._exportType && (self.goToLastErrorScript = () => this.PostToRuntimeComponent("runtime", "go-to-last-error-script"))
        }
        async _InitDOM(f, k) {
            this._canvas = document.createElement("canvas");
            this._canvas.style.display = "none";
            document.body.appendChild(this._canvas);
            window.c3canvas = this._canvas;
            this._domHandlers = n.map(r => new r(this));
            this._FindRuntimeDOMHandler();
            const l = f.engineScripts.map(r =>
                "string" === typeof r ? (new URL(r, this._baseUrl)).toString() : r);
            Array.isArray(f.workerDependencyScripts) && l.unshift(...f.workerDependencyScripts);
            await Promise.all(l.map(r => AddScript(r)));
            if (f.projectScripts && 0 < f.projectScripts.length) {
                const r = self.C3_ProjectScriptsStatus;
                try {
                    if (await Promise.all(f.projectScripts.map(u => AddScript(u[1]))), Object.values(r).some(u => !u)) {
                        self.setTimeout(() => this._ReportProjectScriptError(r), 100);
                        return
                    }
                } catch (u) {
                    console.error("[Preview] Error loading project scripts: ",
                        u);
                    self.setTimeout(() => this._ReportProjectScriptError(r), 100);
                    return
                }
            }
            "preview" === this._exportType && "object" !== typeof self.C3.ScriptsInEvents ? (console.error("[C3 runtime] Failed to load JavaScript code used in events. Check all your JavaScript code has valid syntax."), alert("Failed to load JavaScript code used in events. Check all your JavaScript code has valid syntax.")) : (f = Object.assign(this._GetCommonRuntimeOptions(f), {
                    isInWorker: !1,
                    messagePort: k,
                    canvas: this._canvas,
                    runOnStartupFunctions: p
                }), this._localRuntime =
                self.C3_CreateRuntime(f), await self.C3_InitRuntime(this._localRuntime, f))
        }
        _ReportProjectScriptError(f) {
            f = `Failed to load project script '${Object.entries(f).filter(k=>!k[1]).map(k=>k[0])[0]}'. Check all your JavaScript code has valid syntax.`;
            console.error("[Preview] " + f);
            alert(f)
        }
        async _OnCreateJobWorker(f) {
            f = await this._jobScheduler._CreateJobWorker();
            return {
                outputPort: f,
                transferables: [f]
            }
        }
        _GetLocalRuntime() {
            if (this._useWorker) throw Error("not available in worker mode");
            return this._localRuntime
        }
        PostToRuntimeComponent(f,
            k, l, r, u) {
            this._messageChannelPort.postMessage({
                type: "event",
                component: f,
                handler: k,
                dispatchOpts: r || null,
                data: l,
                responseId: null
            }, this._transferablesBroken ? void 0 : u)
        }
        PostToRuntimeComponentAsync(f, k, l, r, u) {
            const w = h++,
                v = new Promise((x, y) => {
                    e.set(w, {
                        resolve: x,
                        reject: y
                    })
                });
            this._messageChannelPort.postMessage({
                type: "event",
                component: f,
                handler: k,
                dispatchOpts: r || null,
                data: l,
                responseId: w
            }, this._transferablesBroken ? void 0 : u);
            return v
        } ["_OnMessageFromRuntime"](f) {
            const k = f.type;
            if ("event" === k) return this._OnEventFromRuntime(f);
            if ("result" === k) this._OnResultFromRuntime(f);
            else if ("runtime-ready" === k) this._OnRuntimeReady();
            else if ("alert" === k) alert(f.message);
            else throw Error(`unknown message '${k}'`);
        }
        _OnEventFromRuntime(f) {
            const k = f.component,
                l = f.handler,
                r = f.data,
                u = f.responseId;
            if (f = t.get(k))
                if (f = f.get(l)) {
                    var w = null;
                    try {
                        w = f(r)
                    } catch (v) {
                        console.error(`Exception in '${k}' handler '${l}':`, v);
                        null !== u && this._PostResultToRuntime(u, !1, "" + v);
                        return
                    }
                    if (null === u) return w;
                    w && w.then ? w.then(v => this._PostResultToRuntime(u, !0, v)).catch(v => {
                        console.error(`Rejection from '${k}' handler '${l}':`, v);
                        this._PostResultToRuntime(u, !1, "" + v)
                    }) : this._PostResultToRuntime(u, !0, w)
                } else console.warn(`[DOM] No handler '${l}' for component '${k}'`);
            else console.warn(`[DOM] No event handlers for component '${k}'`)
        }
        _PostResultToRuntime(f, k, l) {
            let r;
            l && l.transferables && (r = l.transferables);
            this._messageChannelPort.postMessage({
                type: "result",
                responseId: f,
                isOk: k,
                result: l
            }, r)
        }
        _OnResultFromRuntime(f) {
            const k = f.responseId,
                l = f.isOk;
            f = f.result;
            const r = e.get(k);
            l ? r.resolve(f) : r.reject(f);
            e.delete(k)
        }
        AddRuntimeComponentMessageHandler(f, k, l) {
            let r = t.get(f);
            r || (r = new Map, t.set(f, r));
            if (r.has(k)) throw Error(`[DOM] Component '${f}' already has handler '${k}'`);
            r.set(k, l)
        }
        static AddDOMHandlerClass(f) {
            if (n.includes(f)) throw Error("DOM handler already added");
            n.push(f)
        }
        _FindRuntimeDOMHandler() {
            for (const f of this._domHandlers)
                if ("runtime" === f.GetComponentID()) {
                    this._runtimeDomHandler = f;
                    return
                } throw Error("cannot find runtime DOM handler");
        }
        _OnMessageFromDebugger(f) {
            this.PostToRuntimeComponent("debugger",
                "message", f)
        }
        _OnRuntimeReady() {
            for (const f of this._domHandlers) f.Attach()
        }
        static IsDocumentFullscreen() {
            return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement)
        }
        async GetRemotePreviewStatusInfo() {
            return await this.PostToRuntimeComponentAsync("runtime", "get-remote-preview-status-info")
        }
        _AddRAFCallback(f) {
            this._rafCallbacks.push(f);
            this._RequestAnimationFrame()
        }
        _RemoveRAFCallback(f) {
            f = this._rafCallbacks.indexOf(f);
            if (-1 === f) throw Error("invalid callback");
            this._rafCallbacks.splice(f, 1);
            this._rafCallbacks.length || this._CancelAnimationFrame()
        }
        _RequestAnimationFrame() {
            -1 === this._rafId && this._rafCallbacks.length && (this._rafId = requestAnimationFrame(this._rafFunc))
        }
        _CancelAnimationFrame() {
            -1 !== this._rafId && (cancelAnimationFrame(this._rafId), this._rafId = -1)
        }
        _OnRAFCallback() {
            this._rafId = -1;
            for (const f of this._rafCallbacks) f();
            this._RequestAnimationFrame()
        }
        TryPlayMedia(f) {
            this._runtimeDomHandler.TryPlayMedia(f)
        }
        RemovePendingPlay(f) {
            this._runtimeDomHandler.RemovePendingPlay(f)
        }
        _PlayPendingMedia() {
            this._runtimeDomHandler._PlayPendingMedia()
        }
        SetSilent(f) {
            this._runtimeDomHandler.SetSilent(f)
        }
        IsAudioFormatSupported(f) {
            return !!b[f]
        }
        async _WasmDecodeWebMOpus(f) {
            f =
                await this.PostToRuntimeComponentAsync("runtime", "opus-decode", {
                    arrayBuffer: f
                }, null, [f]);
            return new Float32Array(f)
        }
        IsAbsoluteURL(f) {
            return /^(?:[a-z]+:)?\/\//.test(f) || "data:" === f.substr(0, 5) || "blob:" === f.substr(0, 5)
        }
        IsRelativeURL(f) {
            return !this.IsAbsoluteURL(f)
        }
        async _OnCordovaFetchLocalFile(f) {
            const k = f.filename;
            switch (f.as) {
                case "text":
                    return await this.CordovaFetchLocalFileAsText(k);
                case "buffer":
                    return await this.CordovaFetchLocalFileAsArrayBuffer(k);
                default:
                    throw Error("unsupported type");
            }
        }
        _GetPermissionAPI() {
            const f =
                window.cordova && window.cordova.plugins && window.cordova.plugins.permissions;
            if ("object" !== typeof f) throw Error("Permission API is not loaded");
            return f
        }
        _MapPermissionID(f, k) {
            f = f[k];
            if ("string" !== typeof f) throw Error("Invalid permission name");
            return f
        }
        _HasPermission(f) {
            const k = this._GetPermissionAPI();
            return new Promise((l, r) => k.checkPermission(this._MapPermissionID(k, f), u => l(!!u.hasPermission), r))
        }
        _RequestPermission(f) {
            const k = this._GetPermissionAPI();
            return new Promise((l, r) => k.requestPermission(this._MapPermissionID(k,
                f), u => l(!!u.hasPermission), r))
        }
        async RequestPermissions(f) {
            if ("cordova" !== this.GetExportType() || this.IsiOSCordova()) return !0;
            for (const k of f)
                if (!await this._HasPermission(k) && !1 === await this._RequestPermission(k)) return !1;
            return !0
        }
        async RequirePermissions(...f) {
            if (!1 === await this.RequestPermissions(f)) throw Error("Permission not granted");
        }
        CordovaFetchLocalFile(f) {
            const k = window.cordova.file.applicationDirectory + "www/" + f.toLowerCase();
            return new Promise((l, r) => {
                window.resolveLocalFileSystemURL(k,
                    u => {
                        u.file(l, r)
                    }, r)
            })
        }
        async CordovaFetchLocalFileAsText(f) {
            f = await this.CordovaFetchLocalFile(f);
            return await BlobToString(f)
        }
        _CordovaMaybeStartNextArrayBufferRead() {
            if (d.length && !(8 <= g)) {
                g++;
                var f = d.shift();
                this._CordovaDoFetchLocalFileAsAsArrayBuffer(f.filename, f.successCallback, f.errorCallback)
            }
        }
        CordovaFetchLocalFileAsArrayBuffer(f) {
            return new Promise((k, l) => {
                d.push({
                    filename: f,
                    successCallback: r => {
                        g--;
                        this._CordovaMaybeStartNextArrayBufferRead();
                        k(r)
                    },
                    errorCallback: r => {
                        g--;
                        this._CordovaMaybeStartNextArrayBufferRead();
                        l(r)
                    }
                });
                this._CordovaMaybeStartNextArrayBufferRead()
            })
        }
        async _CordovaDoFetchLocalFileAsAsArrayBuffer(f, k, l) {
            try {
                const r = await this.CordovaFetchLocalFile(f),
                    u = await BlobToArrayBuffer(r);
                k(u)
            } catch (r) {
                l(r)
            }
        }
        async _ConvertDataUrisToBlobs() {
            const f = [];
            for (const [k, l] of Object.entries(this._localFileBlobs)) f.push(this._ConvertDataUriToBlobs(k, l));
            await Promise.all(f)
        }
        async _ConvertDataUriToBlobs(f, k) {
            if ("object" === typeof k) this._localFileBlobs[f] = new Blob([k.str], {
                    type: k.type
                }), this._localFileStrings[f] =
                k.str;
            else {
                let l = await this._FetchDataUri(k);
                l || (l = this._DataURIToBinaryBlobSync(k));
                this._localFileBlobs[f] = l
            }
        }
        async _FetchDataUri(f) {
            try {
                return await (await fetch(f)).blob()
            } catch (k) {
                return console.warn("Failed to fetch a data: URI. Falling back to a slower workaround. This is probably because the Content Security Policy unnecessarily blocked it. Allow data: URIs in your CSP to avoid this.", k), null
            }
        }
        _DataURIToBinaryBlobSync(f) {
            f = this._ParseDataURI(f);
            return this._BinaryStringToBlob(f.data, f.mime_type)
        }
        _ParseDataURI(f) {
            var k =
                f.indexOf(",");
            if (0 > k) throw new URIError("expected comma in data: uri");
            var l = f.substring(5, k);
            f = f.substring(k + 1);
            k = l.split(";");
            l = k[0] || "";
            const r = k[2];
            f = "base64" === k[1] || "base64" === r ? atob(f) : decodeURIComponent(f);
            return {
                mime_type: l,
                data: f
            }
        }
        _BinaryStringToBlob(f, k) {
            var l = f.length;
            let r = l >> 2,
                u = new Uint8Array(l),
                w = new Uint32Array(u.buffer, 0, r),
                v, x;
            for (x = v = 0; v < r; ++v) w[v] = f.charCodeAt(x++) | f.charCodeAt(x++) << 8 | f.charCodeAt(x++) << 16 | f.charCodeAt(x++) << 24;
            for (l &= 3; l--;) u[x] = f.charCodeAt(x), ++x;
            return new Blob([u], {
                type: k
            })
        }
        _TestTransferablesWork() {
            let f = null;
            const k = new Promise(u => f = u),
                l = new ArrayBuffer(1),
                r = new MessageChannel;
            r.port2.onmessage = u => {
                u.data && u.data.arrayBuffer || (this._transferablesBroken = !0, console.warn("MessageChannel transfers determined to be broken. Disabling transferables."));
                f()
            };
            r.port1.postMessage({
                arrayBuffer: l
            }, [l]);
            return k
        }
    }
}
"use strict"; {
    var KeyboardIsVisible = function() {
            const e = document.activeElement;
            if (!e) return !1;
            const h = e.tagName.toLowerCase(),
                p = new Set("email number password search tel text url".split(" "));
            return "textarea" === h ? !0 : "input" === h ? p.has(e.type.toLowerCase() || "text") : IsInContentEditable(e)
        },
        ParentHasFocus = function() {
            try {
                return window.parent && window.parent.document.hasFocus()
            } catch (e) {
                return !1
            }
        },
        BlockWheelZoom = function(e) {
            (e.metaKey || e.ctrlKey) && e.preventDefault()
        },
        PreventDefaultOnCanvasOrDoc = function(e) {
            const h = e.target.tagName.toLowerCase();
            n.has(h) && e.preventDefault()
        },
        IsInContentEditable = function(e) {
            do {
                if (e.parentNode && e.hasAttribute("contenteditable")) return !0;
                e = e.parentNode
            } while (e);
            return !1
        },
        BlobToSvgImage = async function(e, h, p) {
            if (!/firefox/i.test(navigator.userAgent)) return await BlobToImage(e);
            var m = await BlobToString$jscomp$1(e);
            m = (new DOMParser).parseFromString(m, "image/svg+xml");
            const q = m.documentElement;
            if (q.hasAttribute("width") && q.hasAttribute("height")) {
                const f = q.getAttribute("width"),
                    k = q.getAttribute("height");
                if (!f.includes("%") &&
                    !k.includes("%")) return await BlobToImage(e)
            }
            q.setAttribute("width", h + "px");
            q.setAttribute("height", p + "px");
            m = (new XMLSerializer).serializeToString(m);
            e = new Blob([m], {
                type: "image/svg+xml"
            });
            return await BlobToImage(e)
        }, BlobToString$jscomp$1 = function(e) {
            return new Promise((h, p) => {
                let m = new FileReader;
                m.onload = q => h(q.target.result);
                m.onerror = q => p(q);
                m.readAsText(e)
            })
        }, BlobToImage = async function(e) {
            e = URL.createObjectURL(e);
            try {
                return await FetchImage(e)
            } finally {
                URL.revokeObjectURL(e)
            }
        }, FetchImage = function(e) {
            return new Promise((h,
                p) => {
                const m = new Image;
                m.onload = () => h(m);
                m.onerror = q => p(q);
                m.src = e
            })
        }, AddStyleSheet = function(e) {
            return new Promise((h, p) => {
                const m = document.createElement("link");
                m.onload = () => h(m);
                m.onerror = q => p(q);
                m.rel = "stylesheet";
                m.href = e;
                document.head.appendChild(m)
            })
        }, IsCompatibilityMouseEvent = function(e) {
            return e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents || e.originalEvent && e.originalEvent.sourceCapabilities && e.originalEvent.sourceCapabilities.firesTouchEvents
        };
    const c = self.RuntimeInterface,
        a =
        new Map([
            ["OSLeft", "MetaLeft"],
            ["OSRight", "MetaRight"]
        ]),
        b = {
            dispatchRuntimeEvent: !0,
            dispatchUserScriptEvent: !0
        },
        d = {
            dispatchUserScriptEvent: !0
        },
        g = {
            dispatchRuntimeEvent: !0
        },
        n = new Set(["canvas", "body", "html"]);
    self.C3_GetSvgImageSize = async function(e) {
        e = await BlobToImage(e);
        if (0 < e.width && 0 < e.height) return [e.width, e.height]; {
            e.style.position = "absolute";
            e.style.left = "0px";
            e.style.top = "0px";
            e.style.visibility = "hidden";
            document.body.appendChild(e);
            const h = e.getBoundingClientRect();
            document.body.removeChild(e);
            return [h.width, h.height]
        }
    };
    self.C3_RasterSvgImageBlob = async function(e, h, p, m, q) {
        e = await BlobToSvgImage(e, h, p);
        const f = document.createElement("canvas");
        f.width = m;
        f.height = q;
        f.getContext("2d").drawImage(e, 0, 0, h, p);
        return f
    };
    let t = !1;
    document.addEventListener("pause", () => t = !0);
    document.addEventListener("resume", () => t = !1);
    c.AddDOMHandlerClass(class extends self.DOMHandler {
        constructor(e) {
            super(e, "runtime");
            this._isFirstSizeUpdate = !0;
            this._simulatedResizeTimerId = -1;
            this._targetOrientation = "any";
            this._attachedDeviceMotionEvent =
                this._attachedDeviceOrientationEvent = !1;
            this._lastPointerRawUpdateEvent = this._pointerRawUpdateRateLimiter = this._debugHighlightElem = null;
            e.AddRuntimeComponentMessageHandler("canvas", "update-size", m => this._OnUpdateCanvasSize(m));
            e.AddRuntimeComponentMessageHandler("runtime", "invoke-download", m => this._OnInvokeDownload(m));
            e.AddRuntimeComponentMessageHandler("runtime", "raster-svg-image", m => this._OnRasterSvgImage(m));
            e.AddRuntimeComponentMessageHandler("runtime", "get-svg-image-size", m => this._OnGetSvgImageSize(m));
            e.AddRuntimeComponentMessageHandler("runtime", "set-target-orientation", m => this._OnSetTargetOrientation(m));
            e.AddRuntimeComponentMessageHandler("runtime", "register-sw", () => this._OnRegisterSW());
            e.AddRuntimeComponentMessageHandler("runtime", "post-to-debugger", m => this._OnPostToDebugger(m));
            e.AddRuntimeComponentMessageHandler("runtime", "go-to-script", m => this._OnPostToDebugger(m));
            e.AddRuntimeComponentMessageHandler("runtime", "before-start-ticking", () => this._OnBeforeStartTicking());
            e.AddRuntimeComponentMessageHandler("runtime",
                "debug-highlight", m => this._OnDebugHighlight(m));
            e.AddRuntimeComponentMessageHandler("runtime", "enable-device-orientation", () => this._AttachDeviceOrientationEvent());
            e.AddRuntimeComponentMessageHandler("runtime", "enable-device-motion", () => this._AttachDeviceMotionEvent());
            e.AddRuntimeComponentMessageHandler("runtime", "add-stylesheet", m => this._OnAddStylesheet(m));
            e.AddRuntimeComponentMessageHandler("runtime", "alert", m => this._OnAlert(m));
            const h = new Set(["input", "textarea", "datalist"]);
            window.addEventListener("contextmenu",
                m => {
                    const q = m.target,
                        f = q.tagName.toLowerCase();
                    h.has(f) || IsInContentEditable(q) || m.preventDefault()
                });
            const p = e.GetCanvas();
            window.addEventListener("selectstart", PreventDefaultOnCanvasOrDoc);
            window.addEventListener("gesturehold", PreventDefaultOnCanvasOrDoc);
            p.addEventListener("selectstart", PreventDefaultOnCanvasOrDoc);
            p.addEventListener("gesturehold", PreventDefaultOnCanvasOrDoc);
            window.addEventListener("touchstart", PreventDefaultOnCanvasOrDoc, {
                passive: !1
            });
            "undefined" !== typeof PointerEvent ? (window.addEventListener("pointerdown",
                PreventDefaultOnCanvasOrDoc, {
                    passive: !1
                }), p.addEventListener("pointerdown", PreventDefaultOnCanvasOrDoc)) : p.addEventListener("touchstart", PreventDefaultOnCanvasOrDoc);
            this._mousePointerLastButtons = 0;
            window.addEventListener("mousedown", m => {
                1 === m.button && m.preventDefault()
            });
            window.addEventListener("mousewheel", BlockWheelZoom, {
                passive: !1
            });
            window.addEventListener("wheel", BlockWheelZoom, {
                passive: !1
            });
            window.addEventListener("resize", () => this._OnWindowResize());
            e.IsiOSWebView() && window.addEventListener("focusout",
                () => {
                    KeyboardIsVisible() || (document.scrollingElement.scrollTop = 0)
                });
            this._mediaPendingPlay = new Set;
            this._mediaRemovedPendingPlay = new WeakSet;
            this._isSilent = !1
        }
        _OnBeforeStartTicking() {
            "cordova" === this._iRuntime.GetExportType() ? (document.addEventListener("pause", () => this._OnVisibilityChange(!0)), document.addEventListener("resume", () => this._OnVisibilityChange(!1))) : document.addEventListener("visibilitychange", () => this._OnVisibilityChange(document.hidden));
            return {
                isSuspended: !(!document.hidden && !t)
            }
        }
        Attach() {
            window.addEventListener("focus",
                () => this._PostRuntimeEvent("window-focus"));
            window.addEventListener("blur", () => {
                this._PostRuntimeEvent("window-blur", {
                    parentHasFocus: ParentHasFocus()
                });
                this._mousePointerLastButtons = 0
            });
            window.addEventListener("fullscreenchange", () => this._OnFullscreenChange());
            window.addEventListener("webkitfullscreenchange", () => this._OnFullscreenChange());
            window.addEventListener("mozfullscreenchange", () => this._OnFullscreenChange());
            window.addEventListener("fullscreenerror", h => this._OnFullscreenError(h));
            window.addEventListener("webkitfullscreenerror",
                h => this._OnFullscreenError(h));
            window.addEventListener("mozfullscreenerror", h => this._OnFullscreenError(h));
            window.addEventListener("keydown", h => this._OnKeyEvent("keydown", h));
            window.addEventListener("keyup", h => this._OnKeyEvent("keyup", h));
            window.addEventListener("dblclick", h => this._OnMouseEvent("dblclick", h, b));
            window.addEventListener("wheel", h => this._OnMouseWheelEvent("wheel", h));
            "undefined" !== typeof PointerEvent ? (window.addEventListener("pointerdown", h => {
                this._HandlePointerDownFocus(h);
                this._OnPointerEvent("pointerdown",
                    h)
            }), this._iRuntime.UsesWorker() && "undefined" !== typeof window.onpointerrawupdate && self === self.top ? (this._pointerRawUpdateRateLimiter = new self.RateLimiter(() => this._DoSendPointerRawUpdate(), 5), this._pointerRawUpdateRateLimiter.SetCanRunImmediate(!0), window.addEventListener("pointerrawupdate", h => this._OnPointerRawUpdate(h))) : window.addEventListener("pointermove", h => this._OnPointerEvent("pointermove", h)), window.addEventListener("pointerup", h => this._OnPointerEvent("pointerup", h)), window.addEventListener("pointercancel",
                h => this._OnPointerEvent("pointercancel", h))) : (window.addEventListener("mousedown", h => {
                this._HandlePointerDownFocus(h);
                this._OnMouseEventAsPointer("pointerdown", h)
            }), window.addEventListener("mousemove", h => this._OnMouseEventAsPointer("pointermove", h)), window.addEventListener("mouseup", h => this._OnMouseEventAsPointer("pointerup", h)), window.addEventListener("touchstart", h => {
                this._HandlePointerDownFocus(h);
                this._OnTouchEvent("pointerdown", h)
            }), window.addEventListener("touchmove", h => this._OnTouchEvent("pointermove",
                h)), window.addEventListener("touchend", h => this._OnTouchEvent("pointerup", h)), window.addEventListener("touchcancel", h => this._OnTouchEvent("pointercancel", h)));
            const e = () => this._PlayPendingMedia();
            window.addEventListener("pointerup", e, !0);
            window.addEventListener("touchend", e, !0);
            window.addEventListener("click", e, !0);
            window.addEventListener("keydown", e, !0);
            window.addEventListener("gamepadconnected", e, !0)
        }
        _PostRuntimeEvent(e, h) {
            this.PostToRuntime(e, h || null, g)
        }
        _GetWindowInnerWidth() {
            return Math.max(window.innerWidth,
                1)
        }
        _GetWindowInnerHeight() {
            return Math.max(window.innerHeight, 1)
        }
        _OnWindowResize() {
            const e = this._GetWindowInnerWidth(),
                h = this._GetWindowInnerHeight();
            this._PostRuntimeEvent("window-resize", {
                innerWidth: e,
                innerHeight: h,
                devicePixelRatio: window.devicePixelRatio
            });
            this._iRuntime.IsiOSWebView() && (-1 !== this._simulatedResizeTimerId && clearTimeout(this._simulatedResizeTimerId), this._OnSimulatedResize(e, h, 0))
        }
        _ScheduleSimulatedResize(e, h, p) {
            -1 !== this._simulatedResizeTimerId && clearTimeout(this._simulatedResizeTimerId);
            this._simulatedResizeTimerId = setTimeout(() => this._OnSimulatedResize(e, h, p), 48)
        }
        _OnSimulatedResize(e, h, p) {
            const m = this._GetWindowInnerWidth(),
                q = this._GetWindowInnerHeight();
            this._simulatedResizeTimerId = -1;
            m != e || q != h ? this._PostRuntimeEvent("window-resize", {
                innerWidth: m,
                innerHeight: q,
                devicePixelRatio: window.devicePixelRatio
            }) : 10 > p && this._ScheduleSimulatedResize(m, q, p + 1)
        }
        _OnSetTargetOrientation(e) {
            this._targetOrientation = e.targetOrientation
        }
        _TrySetTargetOrientation() {
            const e = this._targetOrientation;
            if (screen.orientation &&
                screen.orientation.lock) screen.orientation.lock(e).catch(h => console.warn("[Construct 3] Failed to lock orientation: ", h));
            else try {
                let h = !1;
                screen.lockOrientation ? h = screen.lockOrientation(e) : screen.webkitLockOrientation ? h = screen.webkitLockOrientation(e) : screen.mozLockOrientation ? h = screen.mozLockOrientation(e) : screen.msLockOrientation && (h = screen.msLockOrientation(e));
                h || console.warn("[Construct 3] Failed to lock orientation")
            } catch (h) {
                console.warn("[Construct 3] Failed to lock orientation: ", h)
            }
        }
        _OnFullscreenChange() {
            const e =
                c.IsDocumentFullscreen();
            e && "any" !== this._targetOrientation && this._TrySetTargetOrientation();
            this.PostToRuntime("fullscreenchange", {
                isFullscreen: e,
                innerWidth: this._GetWindowInnerWidth(),
                innerHeight: this._GetWindowInnerHeight()
            })
        }
        _OnFullscreenError(e) {
            console.warn("[Construct 3] Fullscreen request failed: ", e);
            this.PostToRuntime("fullscreenerror", {
                isFullscreen: c.IsDocumentFullscreen(),
                innerWidth: this._GetWindowInnerWidth(),
                innerHeight: this._GetWindowInnerHeight()
            })
        }
        _OnVisibilityChange(e) {
            e ? this._iRuntime._CancelAnimationFrame() :
                this._iRuntime._RequestAnimationFrame();
            this.PostToRuntime("visibilitychange", {
                hidden: e
            })
        }
        _OnKeyEvent(e, h) {
            "Backspace" === h.key && PreventDefaultOnCanvasOrDoc(h);
            const p = a.get(h.code) || h.code;
            this._PostToRuntimeMaybeSync(e, {
                code: p,
                key: h.key,
                which: h.which,
                repeat: h.repeat,
                altKey: h.altKey,
                ctrlKey: h.ctrlKey,
                metaKey: h.metaKey,
                shiftKey: h.shiftKey,
                timeStamp: h.timeStamp
            }, b)
        }
        _OnMouseWheelEvent(e, h) {
            this.PostToRuntime(e, {
                clientX: h.clientX,
                clientY: h.clientY,
                pageX: h.pageX,
                pageY: h.pageY,
                deltaX: h.deltaX,
                deltaY: h.deltaY,
                deltaZ: h.deltaZ,
                deltaMode: h.deltaMode,
                timeStamp: h.timeStamp
            }, b)
        }
        _OnMouseEvent(e, h, p) {
            IsCompatibilityMouseEvent(h) || this._PostToRuntimeMaybeSync(e, {
                button: h.button,
                buttons: h.buttons,
                clientX: h.clientX,
                clientY: h.clientY,
                pageX: h.pageX,
                pageY: h.pageY,
                timeStamp: h.timeStamp
            }, p)
        }
        _OnMouseEventAsPointer(e, h) {
            if (!IsCompatibilityMouseEvent(h)) {
                var p = this._mousePointerLastButtons;
                "pointerdown" === e && 0 !== p ? e = "pointermove" : "pointerup" === e && 0 !== h.buttons && (e = "pointermove");
                this._PostToRuntimeMaybeSync(e, {
                    pointerId: 1,
                    pointerType: "mouse",
                    button: h.button,
                    buttons: h.buttons,
                    lastButtons: p,
                    clientX: h.clientX,
                    clientY: h.clientY,
                    pageX: h.pageX,
                    pageY: h.pageY,
                    width: 0,
                    height: 0,
                    pressure: 0,
                    tangentialPressure: 0,
                    tiltX: 0,
                    tiltY: 0,
                    twist: 0,
                    timeStamp: h.timeStamp
                }, b);
                this._mousePointerLastButtons = h.buttons;
                this._OnMouseEvent(h.type, h, d)
            }
        }
        _OnPointerEvent(e, h) {
            this._pointerRawUpdateRateLimiter && "pointermove" !== e && this._pointerRawUpdateRateLimiter.Reset();
            var p = 0;
            "mouse" === h.pointerType && (p = this._mousePointerLastButtons);
            this._PostToRuntimeMaybeSync(e, {
                pointerId: h.pointerId,
                pointerType: h.pointerType,
                button: h.button,
                buttons: h.buttons,
                lastButtons: p,
                clientX: h.clientX,
                clientY: h.clientY,
                pageX: h.pageX,
                pageY: h.pageY,
                width: h.width || 0,
                height: h.height || 0,
                pressure: h.pressure || 0,
                tangentialPressure: h.tangentialPressure || 0,
                tiltX: h.tiltX || 0,
                tiltY: h.tiltY || 0,
                twist: h.twist || 0,
                timeStamp: h.timeStamp
            }, b);
            "mouse" === h.pointerType && (p = "mousemove", "pointerdown" === e ? p = "mousedown" : "pointerup" === e && (p = "pointerup"), this._OnMouseEvent(p, h, d), this._mousePointerLastButtons =
                h.buttons)
        }
        _OnPointerRawUpdate(e) {
            this._lastPointerRawUpdateEvent = e;
            this._pointerRawUpdateRateLimiter.Call()
        }
        _DoSendPointerRawUpdate() {
            this._OnPointerEvent("pointermove", this._lastPointerRawUpdateEvent);
            this._lastPointerRawUpdateEvent = null
        }
        _OnTouchEvent(e, h) {
            for (let p = 0, m = h.changedTouches.length; p < m; ++p) {
                const q = h.changedTouches[p];
                this._PostToRuntimeMaybeSync(e, {
                    pointerId: q.identifier,
                    pointerType: "touch",
                    button: 0,
                    buttons: 0,
                    lastButtons: 0,
                    clientX: q.clientX,
                    clientY: q.clientY,
                    pageX: q.pageX,
                    pageY: q.pageY,
                    width: 2 * (q.radiusX || q.webkitRadiusX || 0),
                    height: 2 * (q.radiusY || q.webkitRadiusY || 0),
                    pressure: q.force || q.webkitForce || 0,
                    tangentialPressure: 0,
                    tiltX: 0,
                    tiltY: 0,
                    twist: q.rotationAngle || 0,
                    timeStamp: h.timeStamp
                }, b)
            }
        }
        _HandlePointerDownFocus(e) {
            window !== window.top && window.focus();
            this._IsElementCanvasOrDocument(e.target) && document.activeElement && !this._IsElementCanvasOrDocument(document.activeElement) && document.activeElement.blur()
        }
        _IsElementCanvasOrDocument(e) {
            return !e || e === document || e === window || e === document.body ||
                "canvas" === e.tagName.toLowerCase()
        }
        _AttachDeviceOrientationEvent() {
            this._attachedDeviceOrientationEvent || (this._attachedDeviceOrientationEvent = !0, window.addEventListener("deviceorientation", e => this._OnDeviceOrientation(e)), window.addEventListener("deviceorientationabsolute", e => this._OnDeviceOrientationAbsolute(e)))
        }
        _AttachDeviceMotionEvent() {
            this._attachedDeviceMotionEvent || (this._attachedDeviceMotionEvent = !0, window.addEventListener("devicemotion", e => this._OnDeviceMotion(e)))
        }
        _OnDeviceOrientation(e) {
            this.PostToRuntime("deviceorientation", {
                absolute: !!e.absolute,
                alpha: e.alpha || 0,
                beta: e.beta || 0,
                gamma: e.gamma || 0,
                timeStamp: e.timeStamp,
                webkitCompassHeading: e.webkitCompassHeading,
                webkitCompassAccuracy: e.webkitCompassAccuracy
            }, b)
        }
        _OnDeviceOrientationAbsolute(e) {
            this.PostToRuntime("deviceorientationabsolute", {
                absolute: !!e.absolute,
                alpha: e.alpha || 0,
                beta: e.beta || 0,
                gamma: e.gamma || 0,
                timeStamp: e.timeStamp
            }, b)
        }
        _OnDeviceMotion(e) {
            let h = null;
            var p = e.acceleration;
            p && (h = {
                x: p.x || 0,
                y: p.y || 0,
                z: p.z || 0
            });
            p = null;
            var m = e.accelerationIncludingGravity;
            m && (p = {
                x: m.x || 0,
                y: m.y || 0,
                z: m.z || 0
            });
            m = null;
            const q = e.rotationRate;
            q && (m = {
                alpha: q.alpha || 0,
                beta: q.beta || 0,
                gamma: q.gamma || 0
            });
            this.PostToRuntime("devicemotion", {
                acceleration: h,
                accelerationIncludingGravity: p,
                rotationRate: m,
                interval: e.interval,
                timeStamp: e.timeStamp
            }, b)
        }
        _OnUpdateCanvasSize(e) {
            const h = this.GetRuntimeInterface(),
                p = h.GetCanvas();
            p.style.width = e.styleWidth + "px";
            p.style.height = e.styleHeight + "px";
            p.style.marginLeft = e.marginLeft + "px";
            p.style.marginTop = e.marginTop + "px";
            h.MaybeForceBodySize();
            this._isFirstSizeUpdate &&
                (p.style.display = "", this._isFirstSizeUpdate = !1)
        }
        _OnInvokeDownload(e) {
            const h = e.url;
            e = e.filename;
            const p = document.createElement("a"),
                m = document.body;
            p.textContent = e;
            p.href = h;
            p.download = e;
            m.appendChild(p);
            p.click();
            m.removeChild(p)
        }
        async _OnRasterSvgImage(e) {
            var h = e.imageBitmapOpts;
            e = await self.C3_RasterSvgImageBlob(e.blob, e.imageWidth, e.imageHeight, e.surfaceWidth, e.surfaceHeight);
            h = h ? await createImageBitmap(e, h) : await createImageBitmap(e);
            return {
                imageBitmap: h,
                transferables: [h]
            }
        }
        async _OnGetSvgImageSize(e) {
            return await self.C3_GetSvgImageSize(e.blob)
        }
        async _OnAddStylesheet(e) {
            await AddStyleSheet(e.url)
        }
        _PlayPendingMedia() {
            var e = [...this._mediaPendingPlay];
            this._mediaPendingPlay.clear();
            if (!this._isSilent)
                for (const h of e)(e = h.play()) && e.catch(p => {
                    this._mediaRemovedPendingPlay.has(h) || this._mediaPendingPlay.add(h)
                })
        }
        TryPlayMedia(e) {
            if ("function" !== typeof e.play) throw Error("missing play function");
            this._mediaRemovedPendingPlay.delete(e);
            let h;
            try {
                h = e.play()
            } catch (p) {
                this._mediaPendingPlay.add(e);
                return
            }
            h && h.catch(p => {
                this._mediaRemovedPendingPlay.has(e) || this._mediaPendingPlay.add(e)
            })
        }
        RemovePendingPlay(e) {
            this._mediaPendingPlay.delete(e);
            this._mediaRemovedPendingPlay.add(e)
        }
        SetSilent(e) {
            this._isSilent = !!e
        }
        _OnDebugHighlight(e) {
            if (e.show) {
                this._debugHighlightElem || (this._debugHighlightElem = document.createElement("div"), this._debugHighlightElem.id = "inspectOutline", document.body.appendChild(this._debugHighlightElem));
                var h = this._debugHighlightElem;
                h.style.display = "";
                h.style.left = e.left - 1 + "px";
                h.style.top = e.top - 1 + "px";
                h.style.width = e.width + 2 + "px";
                h.style.height = e.height + 2 + "px";
                h.textContent = e.name
            } else this._debugHighlightElem && (this._debugHighlightElem.style.display =
                "none")
        }
        _OnRegisterSW() {
            window.C3_RegisterSW && window.C3_RegisterSW()
        }
        _OnPostToDebugger(e) {
            window.c3_postToMessagePort && (e.from = "runtime", window.c3_postToMessagePort(e))
        }
        _InvokeFunctionFromJS(e, h) {
            return this.PostToRuntimeAsync("js-invoke-function", {
                name: e,
                params: h
            })
        }
        _OnAlert(e) {
            alert(e.message)
        }
    })
}
"use strict"; {
    const c = document.currentScript.src;
    self.JobSchedulerDOM = class {
        constructor(a) {
            this._runtimeInterface = a;
            this._baseUrl = c ? c.substr(0, c.lastIndexOf("/") + 1) : a.GetBaseURL();
            this._maxNumWorkers = Math.min(navigator.hardwareConcurrency || 2, 16);
            this._dispatchWorker = null;
            this._jobWorkers = [];
            this._outputPort = this._inputPort = null
        }
        async Init() {
            if (this._hasInitialised) throw Error("already initialised");
            this._hasInitialised = !0;
            var a = this._runtimeInterface._GetWorkerURL("dispatchworker.js");
            this._dispatchWorker = await this._runtimeInterface.CreateWorker(a,
                this._baseUrl, {
                    name: "DispatchWorker"
                });
            a = new MessageChannel;
            this._inputPort = a.port1;
            this._dispatchWorker.postMessage({
                type: "_init",
                "in-port": a.port2
            }, [a.port2]);
            this._outputPort = await this._CreateJobWorker()
        }
        async _CreateJobWorker() {
            const a = this._jobWorkers.length;
            var b = this._runtimeInterface._GetWorkerURL("jobworker.js");
            b = await this._runtimeInterface.CreateWorker(b, this._baseUrl, {
                name: "JobWorker" + a
            });
            const d = new MessageChannel,
                g = new MessageChannel;
            this._dispatchWorker.postMessage({
                type: "_addJobWorker",
                port: d.port1
            }, [d.port1]);
            b.postMessage({
                type: "init",
                number: a,
                "dispatch-port": d.port2,
                "output-port": g.port2
            }, [d.port2, g.port2]);
            this._jobWorkers.push(b);
            return g.port1
        }
        GetPortData() {
            return {
                inputPort: this._inputPort,
                outputPort: this._outputPort,
                maxNumWorkers: this._maxNumWorkers
            }
        }
        GetPortTransferables() {
            return [this._inputPort, this._outputPort]
        }
    }
}
"use strict";
window.C3_IsSupported && (window.c3_runtimeInterface = new self.RuntimeInterface({
    useWorker: "undefined" !== typeof OffscreenCanvas,
    workerMainUrl: "workermain.js",
    engineScripts: ["scripts/c3runtime.js"],
    scriptFolder: "scripts/",
    workerDependencyScripts: [],
    exportType: "html5"
}));
"use strict";
self.RuntimeInterface.AddDOMHandlerClass(class extends self.DOMHandler {
    constructor(c) {
        super(c, "touch");
        this.AddRuntimeMessageHandler("request-permission", a => this._OnRequestPermission(a))
    }
    async _OnRequestPermission(c) {
        c = c.type;
        let a = !0;
        0 === c ? a = await this._RequestOrientationPermission() : 1 === c && (a = await this._RequestMotionPermission());
        this.PostToRuntime("permission-result", {
            type: c,
            result: a
        })
    }
    async _RequestOrientationPermission() {
        if (!self.DeviceOrientationEvent || !self.DeviceOrientationEvent.requestPermission) return !0;
        try {
            return "granted" === await self.DeviceOrientationEvent.requestPermission()
        } catch (c) {
            return console.warn("[Touch] Failed to request orientation permission: ", c), !1
        }
    }
    async _RequestMotionPermission() {
        if (!self.DeviceMotionEvent || !self.DeviceMotionEvent.requestPermission) return !0;
        try {
            return "granted" === await self.DeviceMotionEvent.requestPermission()
        } catch (c) {
            return console.warn("[Touch] Failed to request motion permission: ", c), !1
        }
    }
});
"use strict";
self.RuntimeInterface.AddDOMHandlerClass(class extends self.DOMHandler {
    constructor(c) {
        super(c, "browser");
        this._exportType = "";
        this.AddRuntimeMessageHandlers([
            ["get-initial-state", a => this._OnGetInitialState(a)],
            ["ready-for-sw-messages", () => this._OnReadyForSWMessages()],
            ["alert", a => this._OnAlert(a)],
            ["close", () => this._OnClose()],
            ["set-focus", a => this._OnSetFocus(a)],
            ["vibrate", a => this._OnVibrate(a)],
            ["lock-orientation", a => this._OnLockOrientation(a)],
            ["unlock-orientation", () => this._OnUnlockOrientation()],
            ["navigate", a => this._OnNavigate(a)],
            ["request-fullscreen", a => this._OnRequestFullscreen(a)],
            ["exit-fullscreen", () => this._OnExitFullscreen()],
            ["set-hash", a => this._OnSetHash(a)]
        ]);
        window.addEventListener("online", () => this._OnOnlineStateChanged(!0));
        window.addEventListener("offline", () => this._OnOnlineStateChanged(!1));
        window.addEventListener("hashchange", () => this._OnHashChange());
        document.addEventListener("backbutton", () => this._OnCordovaBackButton());
        "undefined" !== typeof Windows && Windows.UI.Core.SystemNavigationManager.getForCurrentView().addEventListener("backrequested",
            a => this._OnWin10BackRequested(a))
    }
    _OnGetInitialState(c) {
        this._exportType = c.exportType;
        return {
            location: location.toString(),
            isOnline: !!navigator.onLine,
            referrer: document.referrer,
            title: document.title,
            isCookieEnabled: !!navigator.cookieEnabled,
            screenWidth: screen.width,
            screenHeight: screen.height,
            windowOuterWidth: window.outerWidth,
            windowOuterHeight: window.outerHeight,
            isScirraArcade: "undefined" !== typeof window.is_scirra_arcade
        }
    }
    _OnReadyForSWMessages() {
        window.C3_RegisterSW && window.OfflineClientInfo && window.OfflineClientInfo.SetMessageCallback(c =>
            this.PostToRuntime("sw-message", c.data))
    }
    _OnOnlineStateChanged(c) {
        this.PostToRuntime("online-state", {
            isOnline: c
        })
    }
    _OnCordovaBackButton() {
        this.PostToRuntime("backbutton")
    }
    _OnWin10BackRequested(c) {
        c.handled = !0;
        this.PostToRuntime("backbutton")
    }
    GetNWjsWindow() {
        return "nwjs" === this._exportType ? nw.Window.get() : null
    }
    _OnAlert(c) {
        alert(c.message)
    }
    _OnClose() {
        navigator.app && navigator.app.exitApp ? navigator.app.exitApp() : navigator.device && navigator.device.exitApp ? navigator.device.exitApp() : window.close()
    }
    _OnSetFocus(c) {
        c =
            c.isFocus;
        if ("nwjs" === this._exportType) {
            const a = this.GetNWjsWindow();
            c ? a.focus() : a.blur()
        } else c ? window.focus() : window.blur()
    }
    _OnVibrate(c) {
        navigator.vibrate && navigator.vibrate(c.pattern)
    }
    _OnLockOrientation(c) {
        c = c.orientation;
        if (screen.orientation && screen.orientation.lock) screen.orientation.lock(c).catch(a => console.warn("[Construct 3] Failed to lock orientation: ", a));
        else try {
            let a = !1;
            screen.lockOrientation ? a = screen.lockOrientation(c) : screen.webkitLockOrientation ? a = screen.webkitLockOrientation(c) :
                screen.mozLockOrientation ? a = screen.mozLockOrientation(c) : screen.msLockOrientation && (a = screen.msLockOrientation(c));
            a || console.warn("[Construct 3] Failed to lock orientation")
        } catch (a) {
            console.warn("[Construct 3] Failed to lock orientation: ", a)
        }
    }
    _OnUnlockOrientation() {
        try {
            screen.orientation && screen.orientation.unlock ? screen.orientation.unlock() : screen.unlockOrientation ? screen.unlockOrientation() : screen.webkitUnlockOrientation ? screen.webkitUnlockOrientation() : screen.mozUnlockOrientation ? screen.mozUnlockOrientation() :
                screen.msUnlockOrientation && screen.msUnlockOrientation()
        } catch (c) {}
    }
    _OnNavigate(c) {
        var a = c.type;
        if ("back" === a) navigator.app && navigator.app.backHistory ? navigator.app.backHistory() : window.back();
        else if ("forward" === a) window.forward();
        else if ("home" === a) window.home();
        else if ("reload" === a) location.reload();
        else if ("url" === a) {
            a = c.url;
            var b = c.target;
            c = c.exportType;
            "windows-uwp" === c && "undefined" !== typeof Windows ? Windows.System.Launcher.launchUriAsync(new Windows.Foundation.Uri(a)) : self.cordova && self.cordova.InAppBrowser ?
                self.cordova.InAppBrowser.open(a, "_system") : "preview" === c ? window.open(a, "_blank") : this._isScirraArcade || (2 === b ? window.top.location = a : 1 === b ? window.parent.location = a : window.location = a)
        } else "new-window" === a && (a = c.url, b = c.tag, "windows-uwp" === c.exportType && "undefined" !== typeof Windows ? Windows.System.Launcher.launchUriAsync(new Windows.Foundation.Uri(a)) : self.cordova && self.cordova.InAppBrowser ? self.cordova.InAppBrowser.open(a, "_system") : window.open(a, b))
    }
    _OnRequestFullscreen(c) {
        const a = {
            navigationUI: "auto"
        };
        c = c.navUI;
        1 === c ? a.navigationUI = "hide" : 2 === c && (a.navigationUI = "show");
        c = document.documentElement;
        c.requestFullscreen ? c.requestFullscreen(a) : c.mozRequestFullScreen ? c.mozRequestFullScreen(a) : c.msRequestFullscreen ? c.msRequestFullscreen(a) : c.webkitRequestFullScreen && ("undefined" !== typeof Element.ALLOW_KEYBOARD_INPUT ? c.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT) : c.webkitRequestFullScreen())
    }
    _OnExitFullscreen() {
        document.exitFullscreen ? document.exitFullscreen() : document.mozCancelFullScreen ? document.mozCancelFullScreen() :
            document.msExitFullscreen ? document.msExitFullscreen() : document.webkitCancelFullScreen && document.webkitCancelFullScreen()
    }
    _OnSetHash(c) {
        location.hash = c.hash
    }
    _OnHashChange() {
        this.PostToRuntime("hashchange", {
            location: location.toString()
        })
    }
});
"use strict"; {
    const c = 180 / Math.PI;
    self.AudioDOMHandler = class extends self.DOMHandler {
        constructor(a) {
            super(a, "audio");
            this._destinationNode = this._audioContext = null;
            this._hasAttachedUnblockEvents = this._hasUnblocked = !1;
            this._unblockFunc = () => this._UnblockAudioContext();
            this._audioBuffers = [];
            this._audioInstances = [];
            this._lastAudioInstance = null;
            this._lastPlayedTag = "";
            this._lastTickCount = -1;
            this._pendingTags = new Map;
            this._masterVolume = 1;
            this._isSilent = !1;
            this._timeScaleMode = 0;
            this._timeScale = 1;
            this._gameTime = 0;
            this._panningModel =
                "HRTF";
            this._distanceModel = "inverse";
            this._refDistance = 600;
            this._maxDistance = 1E4;
            this._rolloffFactor = 1;
            this._hasAnySoftwareDecodedMusic = this._playMusicAsSound = !1;
            this._supportsWebMOpus = this._iRuntime.IsAudioFormatSupported("audio/webm; codecs=opus");
            this._effects = new Map;
            this._analysers = new Set;
            this._isPendingPostFxState = !1;
            this._microphoneTag = "";
            this._microphoneSource = null;
            self.C3Audio_OnMicrophoneStream = (b, d) => this._OnMicrophoneStream(b, d);
            this._destMediaStreamNode = null;
            self.C3Audio_GetOutputStream =
                () => this._OnGetOutputStream();
            self.C3Audio_DOMInterface = this;
            this.AddRuntimeMessageHandlers([
                ["create-audio-context", b => this._CreateAudioContext(b)],
                ["play", b => this._Play(b)],
                ["stop", b => this._Stop(b)],
                ["stop-all", () => this._StopAll()],
                ["set-paused", b => this._SetPaused(b)],
                ["set-volume", b => this._SetVolume(b)],
                ["fade-volume", b => this._FadeVolume(b)],
                ["set-master-volume", b => this._SetMasterVolume(b)],
                ["set-muted", b => this._SetMuted(b)],
                ["set-silent", b => this._SetSilent(b)],
                ["set-looping", b => this._SetLooping(b)],
                ["set-playback-rate", b => this._SetPlaybackRate(b)],
                ["seek", b => this._Seek(b)],
                ["preload", b => this._Preload(b)],
                ["unload", b => this._Unload(b)],
                ["unload-all", () => this._UnloadAll()],
                ["set-suspended", b => this._SetSuspended(b)],
                ["add-effect", b => this._AddEffect(b)],
                ["set-effect-param", b => this._SetEffectParam(b)],
                ["remove-effects", b => this._RemoveEffects(b)],
                ["tick", b => this._OnTick(b)],
                ["load-state", b => this._OnLoadState(b)]
            ])
        }
        async _CreateAudioContext(a) {
            a.isiOSCordova && (this._playMusicAsSound = !0);
            this._timeScaleMode =
                a.timeScaleMode;
            this._panningModel = ["equalpower", "HRTF", "soundfield"][a.panningModel];
            this._distanceModel = ["linear", "inverse", "exponential"][a.distanceModel];
            this._refDistance = a.refDistance;
            this._maxDistance = a.maxDistance;
            this._rolloffFactor = a.rolloffFactor;
            var b = {
                latencyHint: a.latencyHint
            };
            if ("undefined" !== typeof AudioContext) this._audioContext = new AudioContext(b);
            else if ("undefined" !== typeof webkitAudioContext) this._audioContext = new webkitAudioContext(b);
            else throw Error("Web Audio API not supported");
            this._AttachUnblockEvents();
            this._audioContext.onstatechange = () => {
                "running" !== this._audioContext.state && this._AttachUnblockEvents()
            };
            this._destinationNode = this._audioContext.createGain();
            this._destinationNode.connect(this._audioContext.destination);
            b = a.listenerPos;
            this._audioContext.listener.setPosition(b[0], b[1], b[2]);
            this._audioContext.listener.setOrientation(0, 0, 1, 0, -1, 0);
            self.C3_GetAudioContextCurrentTime = () => this.GetAudioCurrentTime();
            try {
                await Promise.all(a.preloadList.map(d => this._GetAudioBuffer(d.originalUrl,
                    d.url, d.type, !1)))
            } catch (d) {
                console.error("[Construct 3] Preloading sounds failed: ", d)
            }
            return {
                sampleRate: this._audioContext.sampleRate
            }
        }
        _AttachUnblockEvents() {
            this._hasAttachedUnblockEvents || (this._hasUnblocked = !1, window.addEventListener("pointerup", this._unblockFunc, !0), window.addEventListener("touchend", this._unblockFunc, !0), window.addEventListener("click", this._unblockFunc, !0), window.addEventListener("keydown", this._unblockFunc, !0), this._hasAttachedUnblockEvents = !0)
        }
        _DetachUnblockEvents() {
            this._hasAttachedUnblockEvents &&
                (this._hasUnblocked = !0, window.removeEventListener("pointerup", this._unblockFunc, !0), window.removeEventListener("touchend", this._unblockFunc, !0), window.removeEventListener("click", this._unblockFunc, !0), window.removeEventListener("keydown", this._unblockFunc, !0), this._hasAttachedUnblockEvents = !1)
        }
        _UnblockAudioContext() {
            if (!this._hasUnblocked) {
                var a = this._audioContext;
                "suspended" === a.state && a.resume && a.resume();
                var b = a.createBuffer(1, 220, 22050),
                    d = a.createBufferSource();
                d.buffer = b;
                d.connect(a.destination);
                d.start(0);
                "running" === a.state && this._DetachUnblockEvents()
            }
        }
        GetAudioContext() {
            return this._audioContext
        }
        GetAudioCurrentTime() {
            return this._audioContext.currentTime
        }
        GetDestinationNode() {
            return this._destinationNode
        }
        GetDestinationForTag(a) {
            return (a = this._effects.get(a.toLowerCase())) ? a[0].GetInputNode() : this.GetDestinationNode()
        }
        AddEffectForTag(a, b) {
            a = a.toLowerCase();
            let d = this._effects.get(a);
            d || (d = [], this._effects.set(a, d));
            b._SetIndex(d.length);
            b._SetTag(a);
            d.push(b);
            this._ReconnectEffects(a)
        }
        _ReconnectEffects(a) {
            let b =
                this.GetDestinationNode();
            const d = this._effects.get(a);
            if (d && d.length) {
                b = d[0].GetInputNode();
                for (let g = 0, n = d.length; g < n; ++g) {
                    const t = d[g];
                    g + 1 === n ? t.ConnectTo(this.GetDestinationNode()) : t.ConnectTo(d[g + 1].GetInputNode())
                }
            }
            for (const g of this.audioInstancesByTag(a)) g.Reconnect(b);
            this._microphoneSource && this._microphoneTag === a && (this._microphoneSource.disconnect(), this._microphoneSource.connect(b))
        }
        GetMasterVolume() {
            return this._masterVolume
        }
        IsSilent() {
            return this._isSilent
        }
        GetTimeScaleMode() {
            return this._timeScaleMode
        }
        GetTimeScale() {
            return this._timeScale
        }
        GetGameTime() {
            return this._gameTime
        }
        IsPlayMusicAsSound() {
            return this._playMusicAsSound
        }
        SupportsWebMOpus() {
            return this._supportsWebMOpus
        }
        _SetHasAnySoftwareDecodedMusic() {
            this._hasAnySoftwareDecodedMusic = !0
        }
        GetPanningModel() {
            return this._panningModel
        }
        GetDistanceModel() {
            return this._distanceModel
        }
        GetReferenceDistance() {
            return this._refDistance
        }
        GetMaxDistance() {
            return this._maxDistance
        }
        GetRolloffFactor() {
            return this._rolloffFactor
        }
        DecodeAudioData(a, b) {
            return b ? this._iRuntime._WasmDecodeWebMOpus(a).then(d => {
                const g = this._audioContext.createBuffer(1, d.length, 48E3);
                g.getChannelData(0).set(d);
                return g
            }) : new Promise((d, g) => {
                this._audioContext.decodeAudioData(a, d, g)
            })
        }
        TryPlayMedia(a) {
            this._iRuntime.TryPlayMedia(a)
        }
        RemovePendingPlay(a) {
            this._iRuntime.RemovePendingPlay(a)
        }
        ReleaseInstancesForBuffer(a) {
            let b =
                0;
            for (let d = 0, g = this._audioInstances.length; d < g; ++d) {
                const n = this._audioInstances[d];
                this._audioInstances[b] = n;
                n.GetBuffer() === a ? n.Release() : ++b
            }
            this._audioInstances.length = b
        }
        ReleaseAllMusicBuffers() {
            let a = 0;
            for (let b = 0, d = this._audioBuffers.length; b < d; ++b) {
                const g = this._audioBuffers[b];
                this._audioBuffers[a] = g;
                g.IsMusic() ? g.Release() : ++a
            }
            this._audioBuffers.length = a
        }* audioInstancesByTag(a) {
            if (a)
                for (const b of this._audioInstances) self.AudioDOMHandler.EqualsNoCase(b.GetTag(), a) && (yield b);
            else this._lastAudioInstance &&
                !this._lastAudioInstance.HasEnded() && (yield this._lastAudioInstance)
        }
        async _GetAudioBuffer(a, b, d, g, n) {
            for (const t of this._audioBuffers)
                if (t.GetUrl() === b) return await t.Load(), t;
            if (n) return null;
            g && (this._playMusicAsSound || this._hasAnySoftwareDecodedMusic) && this.ReleaseAllMusicBuffers();
            a = self.C3AudioBuffer.Create(this, a, b, d, g);
            this._audioBuffers.push(a);
            await a.Load();
            return a
        }
        async _GetAudioInstance(a, b, d, g, n) {
            for (const t of this._audioInstances)
                if (t.GetUrl() === b && (t.CanBeRecycled() || n)) return t.SetTag(g),
                    t;
            a = (await this._GetAudioBuffer(a, b, d, n)).CreateInstance(g);
            this._audioInstances.push(a);
            return a
        }
        _AddPendingTag(a) {
            let b = this._pendingTags.get(a);
            if (!b) {
                let d = null;
                b = {
                    pendingCount: 0,
                    promise: new Promise(g => d = g),
                    resolve: d
                };
                this._pendingTags.set(a, b)
            }
            b.pendingCount++
        }
        _RemovePendingTag(a) {
            const b = this._pendingTags.get(a);
            if (!b) throw Error("expected pending tag");
            b.pendingCount--;
            0 === b.pendingCount && (b.resolve(), this._pendingTags.delete(a))
        }
        TagReady(a) {
            a || (a = this._lastPlayedTag);
            return (a = this._pendingTags.get(a)) ?
                a.promise : Promise.resolve()
        }
        _MaybeStartTicking() {
            if (0 < this._analysers.size) this._StartTicking();
            else
                for (const a of this._audioInstances)
                    if (a.IsActive()) {
                        this._StartTicking();
                        break
                    }
        }
        Tick() {
            for (var a of this._analysers) a.Tick();
            a = this.GetAudioCurrentTime();
            for (var b of this._audioInstances) b.Tick(a);
            b = this._audioInstances.filter(d => d.IsActive()).map(d => d.GetState());
            this.PostToRuntime("state", {
                tickCount: this._lastTickCount,
                audioInstances: b,
                analysers: [...this._analysers].map(d => d.GetData())
            });
            0 === b.length &&
                0 === this._analysers.size && this._StopTicking()
        }
        PostTrigger(a, b, d) {
            this.PostToRuntime("trigger", {
                type: a,
                tag: b,
                aiid: d
            })
        }
        async _Play(a) {
            const b = a.originalUrl,
                d = a.url,
                g = a.type,
                n = a.isMusic,
                t = a.tag,
                e = a.isLooping,
                h = a.vol,
                p = a.pos,
                m = a.panning;
            let q = a.off;
            0 < q && !a.trueClock && (this._audioContext.getOutputTimestamp ? (a = this._audioContext.getOutputTimestamp(), q = q - a.performanceTime / 1E3 + a.contextTime) : q = q - performance.now() / 1E3 + this._audioContext.currentTime);
            this._lastPlayedTag = t;
            this._AddPendingTag(t);
            try {
                this._lastAudioInstance =
                    await this._GetAudioInstance(b, d, g, t, n), m ? (this._lastAudioInstance.SetPannerEnabled(!0), this._lastAudioInstance.SetPan(m.x, m.y, m.angle, m.innerAngle, m.outerAngle, m.outerGain), m.hasOwnProperty("uid") && this._lastAudioInstance.SetUID(m.uid)) : this._lastAudioInstance.SetPannerEnabled(!1), this._lastAudioInstance.Play(e, h, p, q)
            } catch (f) {
                console.error("[Construct 3] Audio: error starting playback: ", f);
                return
            } finally {
                this._RemovePendingTag(t)
            }
            this._StartTicking()
        }
        _Stop(a) {
            a = a.tag;
            for (const b of this.audioInstancesByTag(a)) b.Stop()
        }
        _StopAll() {
            for (const a of this._audioInstances) a.Stop()
        }
        _SetPaused(a) {
            const b =
                a.tag;
            a = a.paused;
            for (const d of this.audioInstancesByTag(b)) a ? d.Pause() : d.Resume();
            this._MaybeStartTicking()
        }
        _SetVolume(a) {
            const b = a.tag;
            a = a.vol;
            for (const d of this.audioInstancesByTag(b)) d.SetVolume(a)
        }
        async _FadeVolume(a) {
            const b = a.tag,
                d = a.vol,
                g = a.duration;
            a = a.stopOnEnd;
            await this.TagReady(b);
            for (const n of this.audioInstancesByTag(b)) n.FadeVolume(d, g, a);
            this._MaybeStartTicking()
        }
        _SetMasterVolume(a) {
            this._masterVolume = a.vol;
            for (const b of this._audioInstances) b._UpdateVolume()
        }
        _SetMuted(a) {
            const b =
                a.tag;
            a = a.isMuted;
            for (const d of this.audioInstancesByTag(b)) d.SetMuted(a)
        }
        _SetSilent(a) {
            this._isSilent = a.isSilent;
            this._iRuntime.SetSilent(this._isSilent);
            for (const b of this._audioInstances) b._UpdateMuted()
        }
        _SetLooping(a) {
            const b = a.tag;
            a = a.isLooping;
            for (const d of this.audioInstancesByTag(b)) d.SetLooping(a)
        }
        async _SetPlaybackRate(a) {
            const b = a.tag;
            a = a.rate;
            await this.TagReady(b);
            for (const d of this.audioInstancesByTag(b)) d.SetPlaybackRate(a)
        }
        async _Seek(a) {
            const b = a.tag;
            a = a.pos;
            await this.TagReady(b);
            for (const d of this.audioInstancesByTag(b)) d.Seek(a)
        }
        async _Preload(a) {
            const b = a.originalUrl,
                d = a.url,
                g = a.type;
            a = a.isMusic;
            try {
                await this._GetAudioInstance(b, d, g, "", a)
            } catch (n) {
                console.error("[Construct 3] Audio: error preloading: ", n)
            }
        }
        async _Unload(a) {
            if (a = await this._GetAudioBuffer("", a.url, a.type, a.isMusic, !0)) a.Release(), a = this._audioBuffers.indexOf(a), -1 !== a && this._audioBuffers.splice(a, 1)
        }
        _UnloadAll() {
            for (const a of this._audioBuffers) a.Release();
            this._audioBuffers.length = 0
        }
        _SetSuspended(a) {
            a =
                a.isSuspended;
            !a && this._audioContext.resume && this._audioContext.resume();
            for (const b of this._audioInstances) b.SetSuspended(a);
            a && this._audioContext.suspend && this._audioContext.suspend()
        }
        _OnTick(a) {
            this._timeScale = a.timeScale;
            this._gameTime = a.gameTime;
            this._lastTickCount = a.tickCount;
            if (0 !== this._timeScaleMode)
                for (var b of this._audioInstances) b._UpdatePlaybackRate();
            (b = a.listenerPos) && this._audioContext.listener.setPosition(b[0], b[1], b[2]);
            for (const d of a.instPans) {
                a = d.uid;
                for (const g of this._audioInstances) g.GetUID() ===
                    a && g.SetPanXYA(d.x, d.y, d.angle)
            }
        }
        async _AddEffect(a) {
            var b = a.type;
            const d = a.tag;
            var g = a.params;
            if ("filter" === b) g = new self.C3AudioFilterFX(this, ...g);
            else if ("delay" === b) g = new self.C3AudioDelayFX(this, ...g);
            else if ("convolution" === b) {
                b = null;
                try {
                    b = await this._GetAudioBuffer(a.bufferOriginalUrl, a.bufferUrl, a.bufferType, !1)
                } catch (n) {
                    console.log("[Construct 3] Audio: error loading convolution: ", n);
                    return
                }
                g = new self.C3AudioConvolveFX(this, b.GetAudioBuffer(), ...g);
                g._SetBufferInfo(a.bufferOriginalUrl, a.bufferUrl,
                    a.bufferType)
            } else if ("flanger" === b) g = new self.C3AudioFlangerFX(this, ...g);
            else if ("phaser" === b) g = new self.C3AudioPhaserFX(this, ...g);
            else if ("gain" === b) g = new self.C3AudioGainFX(this, ...g);
            else if ("tremolo" === b) g = new self.C3AudioTremoloFX(this, ...g);
            else if ("ringmod" === b) g = new self.C3AudioRingModFX(this, ...g);
            else if ("distortion" === b) g = new self.C3AudioDistortionFX(this, ...g);
            else if ("compressor" === b) g = new self.C3AudioCompressorFX(this, ...g);
            else if ("analyser" === b) g = new self.C3AudioAnalyserFX(this,
                ...g);
            else throw Error("invalid effect type");
            this.AddEffectForTag(d, g);
            this._PostUpdatedFxState()
        }
        _SetEffectParam(a) {
            const b = a.index,
                d = a.param,
                g = a.value,
                n = a.ramp,
                t = a.time;
            a = this._effects.get(a.tag);
            !a || 0 > b || b >= a.length || (a[b].SetParam(d, g, n, t), this._PostUpdatedFxState())
        }
        _RemoveEffects(a) {
            a = a.tag.toLowerCase();
            const b = this._effects.get(a);
            if (b && b.length) {
                for (const d of b) d.Release();
                this._effects.delete(a);
                this._ReconnectEffects(a)
            }
        }
        _AddAnalyser(a) {
            this._analysers.add(a);
            this._MaybeStartTicking()
        }
        _RemoveAnalyser(a) {
            this._analysers.delete(a)
        }
        _PostUpdatedFxState() {
            this._isPendingPostFxState ||
                (this._isPendingPostFxState = !0, Promise.resolve().then(() => this._DoPostUpdatedFxState()))
        }
        _DoPostUpdatedFxState() {
            const a = {};
            for (const [b, d] of this._effects) a[b] = d.map(g => g.GetState());
            this.PostToRuntime("fxstate", {
                fxstate: a
            });
            this._isPendingPostFxState = !1
        }
        async _OnLoadState(a) {
            const b = a.saveLoadMode;
            if (3 !== b)
                for (var d of this._audioInstances) d.IsMusic() && 1 === b || (d.IsMusic() || 2 !== b) && d.Stop();
            for (const g of this._effects.values())
                for (const n of g) n.Release();
            this._effects.clear();
            this._timeScale = a.timeScale;
            this._gameTime = a.gameTime;
            d = a.listenerPos;
            this._audioContext.listener.setPosition(d[0], d[1], d[2]);
            this._isSilent = a.isSilent;
            this._iRuntime.SetSilent(this._isSilent);
            this._masterVolume = a.masterVolume;
            d = [];
            for (const g of Object.values(a.effects)) d.push(Promise.all(g.map(n => this._AddEffect(n))));
            await Promise.all(d);
            await Promise.all(a.playing.map(g => this._LoadAudioInstance(g, b)));
            this._MaybeStartTicking()
        }
        async _LoadAudioInstance(a, b) {
            if (3 !== b) {
                var d = a.bufferOriginalUrl,
                    g = a.bufferUrl,
                    n = a.bufferType,
                    t = a.isMusic,
                    e = a.tag,
                    h = a.isLooping,
                    p = a.volume,
                    m = a.playbackTime;
                if (!t || 1 !== b)
                    if (t || 2 !== b) {
                        b = null;
                        try {
                            b = await this._GetAudioInstance(d, g, n, e, t)
                        } catch (q) {
                            console.error("[Construct 3] Audio: error loading audio state: ", q);
                            return
                        }
                        b.LoadPanState(a.pan);
                        b.Play(h, p, m, 0);
                        a.isPlaying || b.Pause();
                        b._LoadAdditionalState(a)
                    }
            }
        }
        _OnMicrophoneStream(a, b) {
            this._microphoneSource && this._microphoneSource.disconnect();
            this._microphoneTag = b.toLowerCase();
            this._microphoneSource = this._audioContext.createMediaStreamSource(a);
            this._microphoneSource.connect(this.GetDestinationForTag(this._microphoneTag))
        }
        _OnGetOutputStream() {
            this._destMediaStreamNode || (this._destMediaStreamNode = this._audioContext.createMediaStreamDestination(), this._destinationNode.connect(this._destMediaStreamNode));
            return this._destMediaStreamNode.stream
        }
        static EqualsNoCase(a, b) {
            return a.length !== b.length ? !1 : a === b ? !0 : a.toLowerCase() === b.toLowerCase()
        }
        static ToDegrees(a) {
            return a * c
        }
        static DbToLinearNoCap(a) {
            return Math.pow(10, a / 20)
        }
        static DbToLinear(a) {
            return Math.max(Math.min(self.AudioDOMHandler.DbToLinearNoCap(a),
                1), 0)
        }
        static LinearToDbNoCap(a) {
            return Math.log(a) / Math.log(10) * 20
        }
        static LinearToDb(a) {
            return self.AudioDOMHandler.LinearToDbNoCap(Math.max(Math.min(a, 1), 0))
        }
        static e4(a, b) {
            return 1 - Math.exp(-b * a)
        }
    };
    self.RuntimeInterface.AddDOMHandlerClass(self.AudioDOMHandler)
}
"use strict";
self.C3AudioBuffer = class {
    constructor(c, a, b, d, g) {
        this._audioDomHandler = c;
        this._originalUrl = a;
        this._url = b;
        this._type = d;
        this._isMusic = g;
        this._api = "";
        this._loadState = "not-loaded";
        this._loadPromise = null
    }
    Release() {
        this._loadState = "not-loaded";
        this._loadPromise = this._audioDomHandler = null
    }
    static Create(c, a, b, d, g) {
        const n = "audio/webm; codecs=opus" === d && !c.SupportsWebMOpus();
        g && n && c._SetHasAnySoftwareDecodedMusic();
        return !g || c.IsPlayMusicAsSound() || n ? new self.C3WebAudioBuffer(c, a, b, d, g, n) : new self.C3Html5AudioBuffer(c,
            a, b, d, g)
    }
    CreateInstance(c) {
        return "html5" === this._api ? new self.C3Html5AudioInstance(this._audioDomHandler, this, c) : new self.C3WebAudioInstance(this._audioDomHandler, this, c)
    }
    _Load() {}
    Load() {
        this._loadPromise || (this._loadPromise = this._Load());
        return this._loadPromise
    }
    IsLoaded() {}
    IsLoadedAndDecoded() {}
    HasFailedToLoad() {
        return "failed" === this._loadState
    }
    GetAudioContext() {
        return this._audioDomHandler.GetAudioContext()
    }
    GetApi() {
        return this._api
    }
    GetOriginalUrl() {
        return this._originalUrl
    }
    GetUrl() {
        return this._url
    }
    GetContentType() {
        return this._type
    }
    IsMusic() {
        return this._isMusic
    }
    GetDuration() {}
};
"use strict";
self.C3Html5AudioBuffer = class extends self.C3AudioBuffer {
    constructor(c, a, b, d, g) {
        super(c, a, b, d, g);
        this._api = "html5";
        this._audioElem = new Audio;
        this._audioElem.crossOrigin = "anonymous";
        this._audioElem.autoplay = !1;
        this._audioElem.preload = "auto";
        this._loadReject = this._loadResolve = null;
        this._reachedCanPlayThrough = !1;
        this._audioElem.addEventListener("canplaythrough", () => this._reachedCanPlayThrough = !0);
        this._outNode = this.GetAudioContext().createGain();
        this._mediaSourceNode = null;
        this._audioElem.addEventListener("canplay", () => {
            this._loadResolve && (this._loadState = "loaded", this._loadResolve(), this._loadReject = this._loadResolve = null);
            !this._mediaSourceNode && this._audioElem && (this._mediaSourceNode = this.GetAudioContext().createMediaElementSource(this._audioElem), this._mediaSourceNode.connect(this._outNode))
        });
        this.onended = null;
        this._audioElem.addEventListener("ended", () => {
            if (this.onended) this.onended()
        });
        this._audioElem.addEventListener("error", n => this._OnError(n))
    }
    Release() {
        this._audioDomHandler.ReleaseInstancesForBuffer(this);
        this._outNode.disconnect();
        this._outNode = null;
        this._mediaSourceNode.disconnect();
        this._mediaSourceNode = null;
        this._audioElem && !this._audioElem.paused && this._audioElem.pause();
        this._audioElem = this.onended = null;
        super.Release()
    }
    _Load() {
        this._loadState = "loading";
        return new Promise((c, a) => {
            this._loadResolve = c;
            this._loadReject = a;
            this._audioElem.src = this._url
        })
    }
    _OnError(c) {
        console.error(`[Construct 3] Audio '${this._url}' error: `, c);
        this._loadReject && (this._loadState = "failed", this._loadReject(c), this._loadReject =
            this._loadResolve = null)
    }
    IsLoaded() {
        const c = 4 <= this._audioElem.readyState;
        c && (this._reachedCanPlayThrough = !0);
        return c || this._reachedCanPlayThrough
    }
    IsLoadedAndDecoded() {
        return this.IsLoaded()
    }
    GetAudioElement() {
        return this._audioElem
    }
    GetOutputNode() {
        return this._outNode
    }
    GetDuration() {
        return this._audioElem.duration
    }
};
"use strict";
self.C3WebAudioBuffer = class extends self.C3AudioBuffer {
    constructor(c, a, b, d, g, n) {
        super(c, a, b, d, g);
        this._api = "webaudio";
        this._audioBuffer = this._audioData = null;
        this._needsSoftwareDecode = !!n
    }
    Release() {
        this._audioDomHandler.ReleaseInstancesForBuffer(this);
        this._audioBuffer = this._audioData = null;
        super.Release()
    }
    async _Fetch() {
        if (this._audioData) return this._audioData;
        var c = this._audioDomHandler.GetRuntimeInterface();
        if ("cordova" === c.GetExportType() && c.IsRelativeURL(this._url) && "file:" === location.protocol) this._audioData =
            await c.CordovaFetchLocalFileAsArrayBuffer(this._url);
        else {
            c = await fetch(this._url);
            if (!c.ok) throw Error(`error fetching audio data: ${c.status} ${c.statusText}`);
            this._audioData = await c.arrayBuffer()
        }
    }
    async _Decode() {
        if (this._audioBuffer) return this._audioBuffer;
        this._audioBuffer = await this._audioDomHandler.DecodeAudioData(this._audioData, this._needsSoftwareDecode);
        this._audioData = null
    }
    async _Load() {
        try {
            this._loadState = "loading", await this._Fetch(), await this._Decode(), this._loadState = "loaded"
        } catch (c) {
            this._loadState =
                "failed", console.error(`[Construct 3] Failed to load audio '${this._url}': `, c)
        }
    }
    IsLoaded() {
        return !(!this._audioData && !this._audioBuffer)
    }
    IsLoadedAndDecoded() {
        return !!this._audioBuffer
    }
    GetAudioBuffer() {
        return this._audioBuffer
    }
    GetDuration() {
        return this._audioBuffer ? this._audioBuffer.duration : 0
    }
};
"use strict"; {
    let c = 0;
    self.C3AudioInstance = class {
        constructor(a, b, d) {
            this._audioDomHandler = a;
            this._buffer = b;
            this._tag = d;
            this._aiId = c++;
            this._gainNode = this.GetAudioContext().createGain();
            this._gainNode.connect(this.GetDestinationNode());
            this._pannerNode = null;
            this._isPannerEnabled = !1;
            this._isStopped = !0;
            this._isLooping = this._resumeMe = this._isPaused = !1;
            this._volume = 1;
            this._isMuted = !1;
            this._playbackRate = 1;
            a = this._audioDomHandler.GetTimeScaleMode();
            this._isTimescaled = 1 === a && !this.IsMusic() || 2 === a;
            this._fadeEndTime = this._instUid = -1;
            this._stopOnFadeEnd = !1
        }
        Release() {
            this._buffer = this._audioDomHandler = null;
            this._pannerNode && (this._pannerNode.disconnect(), this._pannerNode = null);
            this._gainNode.disconnect();
            this._gainNode = null
        }
        GetAudioContext() {
            return this._audioDomHandler.GetAudioContext()
        }
        GetDestinationNode() {
            return this._audioDomHandler.GetDestinationForTag(this._tag)
        }
        GetMasterVolume() {
            return this._audioDomHandler.GetMasterVolume()
        }
        GetCurrentTime() {
            return this._isTimescaled ? this._audioDomHandler.GetGameTime() : performance.now() /
                1E3
        }
        GetOriginalUrl() {
            return this._buffer.GetOriginalUrl()
        }
        GetUrl() {
            return this._buffer.GetUrl()
        }
        GetContentType() {
            return this._buffer.GetContentType()
        }
        GetBuffer() {
            return this._buffer
        }
        IsMusic() {
            return this._buffer.IsMusic()
        }
        SetTag(a) {
            this._tag = a
        }
        GetTag() {
            return this._tag
        }
        GetAiId() {
            return this._aiId
        }
        HasEnded() {}
        CanBeRecycled() {}
        IsPlaying() {
            return !this._isStopped && !this._isPaused && !this.HasEnded()
        }
        IsActive() {
            return !this._isStopped && !this.HasEnded()
        }
        GetPlaybackTime(a) {}
        GetDuration(a) {
            let b = this._buffer.GetDuration();
            a && (b /= this._playbackRate || .001);
            return b
        }
        Play(a, b, d, g) {}
        Stop() {}
        Pause() {}
        IsPaused() {
            return this._isPaused
        }
        Resume() {}
        SetVolume(a) {
            this._volume = a;
            this._gainNode.gain.cancelScheduledValues(0);
            this._fadeEndTime = -1;
            this._gainNode.gain.value = this.GetOverallVolume()
        }
        FadeVolume(a, b, d) {
            if (!this.IsMuted()) {
                a *= this.GetMasterVolume();
                var g = this._gainNode.gain;
                g.cancelScheduledValues(0);
                var n = this._audioDomHandler.GetAudioCurrentTime();
                b = n + b;
                g.setValueAtTime(g.value, n);
                g.linearRampToValueAtTime(a, b);
                this._volume =
                    a;
                this._fadeEndTime = b;
                this._stopOnFadeEnd = d
            }
        }
        _UpdateVolume() {
            this.SetVolume(this._volume)
        }
        Tick(a) {
            -1 !== this._fadeEndTime && a >= this._fadeEndTime && (this._fadeEndTime = -1, this._stopOnFadeEnd && this.Stop(), this._audioDomHandler.PostTrigger("fade-ended", this._tag, this._aiId))
        }
        GetOverallVolume() {
            const a = this._volume * this.GetMasterVolume();
            return isFinite(a) ? a : 0
        }
        SetMuted(a) {
            a = !!a;
            this._isMuted !== a && (this._isMuted = a, this._UpdateMuted())
        }
        IsMuted() {
            return this._isMuted
        }
        IsSilent() {
            return this._audioDomHandler.IsSilent()
        }
        _UpdateMuted() {}
        SetLooping(a) {}
        IsLooping() {
            return this._isLooping
        }
        SetPlaybackRate(a) {
            this._playbackRate !==
                a && (this._playbackRate = a, this._UpdatePlaybackRate())
        }
        _UpdatePlaybackRate() {}
        GetPlaybackRate() {
            return this._playbackRate
        }
        Seek(a) {}
        SetSuspended(a) {}
        SetPannerEnabled(a) {
            a = !!a;
            this._isPannerEnabled !== a && ((this._isPannerEnabled = a) ? (this._pannerNode || (this._pannerNode = this.GetAudioContext().createPanner(), this._pannerNode.panningModel = this._audioDomHandler.GetPanningModel(), this._pannerNode.distanceModel = this._audioDomHandler.GetDistanceModel(), this._pannerNode.refDistance = this._audioDomHandler.GetReferenceDistance(),
                this._pannerNode.maxDistance = this._audioDomHandler.GetMaxDistance(), this._pannerNode.rolloffFactor = this._audioDomHandler.GetRolloffFactor()), this._gainNode.disconnect(), this._gainNode.connect(this._pannerNode), this._pannerNode.connect(this.GetDestinationNode())) : (this._pannerNode.disconnect(), this._gainNode.disconnect(), this._gainNode.connect(this.GetDestinationNode())))
        }
        SetPan(a, b, d, g, n, t) {
            this._isPannerEnabled && (this.SetPanXYA(a, b, d), a = self.AudioDOMHandler.ToDegrees, this._pannerNode.coneInnerAngle =
                a(g), this._pannerNode.coneOuterAngle = a(n), this._pannerNode.coneOuterGain = t)
        }
        SetPanXYA(a, b, d) {
            this._isPannerEnabled && (this._pannerNode.setPosition(a, b, 0), this._pannerNode.setOrientation(Math.cos(d), Math.sin(d), 0))
        }
        SetUID(a) {
            this._instUid = a
        }
        GetUID() {
            return this._instUid
        }
        GetResumePosition() {}
        Reconnect(a) {
            const b = this._pannerNode || this._gainNode;
            b.disconnect();
            b.connect(a)
        }
        GetState() {
            return {
                aiid: this.GetAiId(),
                tag: this._tag,
                duration: this.GetDuration(),
                volume: this._volume,
                isPlaying: this.IsPlaying(),
                playbackTime: this.GetPlaybackTime(),
                playbackRate: this.GetPlaybackRate(),
                uid: this._instUid,
                bufferOriginalUrl: this.GetOriginalUrl(),
                bufferUrl: "",
                bufferType: this.GetContentType(),
                isMusic: this.IsMusic(),
                isLooping: this.IsLooping(),
                isMuted: this.IsMuted(),
                resumePosition: this.GetResumePosition(),
                pan: this.GetPanState()
            }
        }
        _LoadAdditionalState(a) {
            this.SetPlaybackRate(a.playbackRate);
            this.SetMuted(a.isMuted)
        }
        GetPanState() {
            if (!this._pannerNode) return null;
            const a = this._pannerNode;
            return {
                pos: [a.positionX.value, a.positionY.value, a.positionZ.value],
                orient: [a.orientationX.value, a.orientationY.value, a.orientationZ.value],
                cia: a.coneInnerAngle,
                coa: a.coneOuterAngle,
                cog: a.coneOuterGain,
                uid: this._instUid
            }
        }
        LoadPanState(a) {
            a ? (this.SetPannerEnabled(!0), a = this._pannerNode, a.setPosition(...a.pos), a.setOrientation(...a.orient), a.coneInnerAngle = a.cia, a.coneOuterAngle = a.coa, a.coneOuterGain = a.cog, this._instUid = a.uid) : this.SetPannerEnabled(!1)
        }
    }
}
"use strict";
self.C3Html5AudioInstance = class extends self.C3AudioInstance {
    constructor(c, a, b) {
        super(c, a, b);
        this._buffer.GetOutputNode().connect(this._gainNode);
        this._buffer.onended = () => this._OnEnded()
    }
    Release() {
        this.Stop();
        this._buffer.GetOutputNode().disconnect();
        super.Release()
    }
    GetAudioElement() {
        return this._buffer.GetAudioElement()
    }
    _OnEnded() {
        this._isStopped = !0;
        this._instUid = -1;
        this._audioDomHandler.PostTrigger("ended", this._tag, this._aiId)
    }
    HasEnded() {
        return this.GetAudioElement().ended
    }
    CanBeRecycled() {
        return this._isStopped ?
            !0 : this.HasEnded()
    }
    GetPlaybackTime(c) {
        let a = this.GetAudioElement().currentTime;
        c && (a *= this._playbackRate);
        this._isLooping || (a = Math.min(a, this.GetDuration()));
        return a
    }
    Play(c, a, b, d) {
        d = this.GetAudioElement();
        1 !== d.playbackRate && (d.playbackRate = 1);
        d.loop !== c && (d.loop = c);
        this.SetVolume(a);
        d.muted && (d.muted = !1);
        if (d.currentTime !== b) try {
            d.currentTime = b
        } catch (g) {
            console.warn(`[Construct 3] Exception seeking audio '${this._buffer.GetUrl()}' to position '${b}': `, g)
        }
        this._audioDomHandler.TryPlayMedia(d);
        this._isPaused =
            this._isStopped = !1;
        this._isLooping = c;
        this._playbackRate = 1
    }
    Stop() {
        const c = this.GetAudioElement();
        c.paused || c.pause();
        this._audioDomHandler.RemovePendingPlay(c);
        this._isStopped = !0;
        this._isPaused = !1;
        this._instUid = -1
    }
    Pause() {
        if (!(this._isPaused || this._isStopped || this.HasEnded())) {
            var c = this.GetAudioElement();
            c.paused || c.pause();
            this._audioDomHandler.RemovePendingPlay(c);
            this._isPaused = !0
        }
    }
    Resume() {
        !this._isPaused || this._isStopped || this.HasEnded() || (this._audioDomHandler.TryPlayMedia(this.GetAudioElement()),
            this._isPaused = !1)
    }
    _UpdateMuted() {
        this.GetAudioElement().muted = this._isMuted || this.IsSilent()
    }
    SetLooping(c) {
        c = !!c;
        this._isLooping !== c && (this._isLooping = c, this.GetAudioElement().loop = c)
    }
    _UpdatePlaybackRate() {
        let c = this._playbackRate;
        this._isTimescaled && (c *= this._audioDomHandler.GetTimeScale());
        try {
            this.GetAudioElement().playbackRate = c
        } catch (a) {
            console.warn(`[Construct 3] Unable to set playback rate '${c}':`, a)
        }
    }
    Seek(c) {
        if (!this._isStopped && !this.HasEnded()) try {
            this.GetAudioElement().currentTime = c
        } catch (a) {
            console.warn(`[Construct 3] Error seeking audio to '${c}': `,
                a)
        }
    }
    GetResumePosition() {
        return this.GetPlaybackTime()
    }
    SetSuspended(c) {
        c ? this.IsPlaying() ? (this.GetAudioElement().pause(), this._resumeMe = !0) : this._resumeMe = !1 : this._resumeMe && (this._audioDomHandler.TryPlayMedia(this.GetAudioElement()), this._resumeMe = !1)
    }
};
"use strict";
self.C3WebAudioInstance = class extends self.C3AudioInstance {
    constructor(c, a, b) {
        super(c, a, b);
        this._bufferSource = null;
        this._onended_handler = d => this._OnEnded(d);
        this._hasPlaybackEnded = !0;
        this._activeSource = null;
        this._resumePosition = this._startTime = 0;
        this._muteVol = 1
    }
    Release() {
        this.Stop();
        this._ReleaseBufferSource();
        this._onended_handler = null;
        super.Release()
    }
    _ReleaseBufferSource() {
        this._bufferSource && this._bufferSource.disconnect();
        this._activeSource = this._bufferSource = null
    }
    _OnEnded(c) {
        this._isPaused ||
            this._resumeMe || c.target !== this._activeSource || (this._isStopped = this._hasPlaybackEnded = !0, this._instUid = -1, this._ReleaseBufferSource(), this._audioDomHandler.PostTrigger("ended", this._tag, this._aiId))
    }
    HasEnded() {
        return !this._isStopped && this._bufferSource && this._bufferSource.loop || this._isPaused ? !1 : this._hasPlaybackEnded
    }
    CanBeRecycled() {
        return !this._bufferSource || this._isStopped ? !0 : this.HasEnded()
    }
    GetPlaybackTime(c) {
        let a;
        a = this._isPaused ? this._resumePosition : this.GetCurrentTime() - this._startTime;
        c &&
            (a *= this._playbackRate);
        this._isLooping || (a = Math.min(a, this.GetDuration()));
        return a
    }
    Play(c, a, b, d) {
        this._muteVol = 1;
        this.SetVolume(a);
        this._ReleaseBufferSource();
        this._bufferSource = this.GetAudioContext().createBufferSource();
        this._bufferSource.buffer = this._buffer.GetAudioBuffer();
        this._bufferSource.connect(this._gainNode);
        this._activeSource = this._bufferSource;
        this._bufferSource.onended = this._onended_handler;
        this._bufferSource.loop = c;
        this._bufferSource.start(d, b);
        this._isPaused = this._isStopped = this._hasPlaybackEnded = !1;
        this._isLooping = c;
        this._playbackRate = 1;
        this._startTime = this.GetCurrentTime() - b
    }
    Stop() {
        if (this._bufferSource) try {
            this._bufferSource.stop(0)
        } catch (c) {}
        this._isStopped = !0;
        this._isPaused = !1;
        this._instUid = -1
    }
    Pause() {
        this._isPaused || this._isStopped || this.HasEnded() || (this._resumePosition = this.GetPlaybackTime(!0), this._isLooping && (this._resumePosition %= this.GetDuration()), this._isPaused = !0, this._bufferSource.stop(0))
    }
    Resume() {
        !this._isPaused || this._isStopped || this.HasEnded() || (this._ReleaseBufferSource(),
            this._bufferSource = this.GetAudioContext().createBufferSource(), this._bufferSource.buffer = this._buffer.GetAudioBuffer(), this._bufferSource.connect(this._gainNode), this._activeSource = this._bufferSource, this._bufferSource.onended = this._onended_handler, this._bufferSource.loop = this._isLooping, this._UpdateVolume(), this._UpdatePlaybackRate(), this._startTime = this.GetCurrentTime() - this._resumePosition / (this._playbackRate || .001), this._bufferSource.start(0, this._resumePosition), this._isPaused = !1)
    }
    GetOverallVolume() {
        return super.GetOverallVolume() *
            this._muteVol
    }
    _UpdateMuted() {
        this._muteVol = this._isMuted || this.IsSilent() ? 0 : 1;
        this._UpdateVolume()
    }
    SetLooping(c) {
        c = !!c;
        this._isLooping !== c && (this._isLooping = c, this._bufferSource && (this._bufferSource.loop = c))
    }
    _UpdatePlaybackRate() {
        let c = this._playbackRate;
        this._isTimescaled && (c *= this._audioDomHandler.GetTimeScale());
        this._bufferSource && (this._bufferSource.playbackRate.value = c)
    }
    Seek(c) {
        this._isStopped || this.HasEnded() || (this._isPaused ? this._resumePosition = c : (this.Pause(), this._resumePosition = c, this.Resume()))
    }
    GetResumePosition() {
        return this._resumePosition
    }
    SetSuspended(c) {
        c ?
            this.IsPlaying() ? (this._resumeMe = !0, this._resumePosition = this.GetPlaybackTime(!0), this._isLooping && (this._resumePosition %= this.GetDuration()), this._bufferSource.stop(0)) : this._resumeMe = !1 : this._resumeMe && (this._ReleaseBufferSource(), this._bufferSource = this.GetAudioContext().createBufferSource(), this._bufferSource.buffer = this._buffer.GetAudioBuffer(), this._bufferSource.connect(this._gainNode), this._activeSource = this._bufferSource, this._bufferSource.onended = this._onended_handler, this._bufferSource.loop =
                this._isLooping, this._UpdateVolume(), this._UpdatePlaybackRate(), this._startTime = this.GetCurrentTime() - this._resumePosition / (this._playbackRate || .001), this._bufferSource.start(0, this._resumePosition), this._resumeMe = !1)
    }
    _LoadAdditionalState(c) {
        super._LoadAdditionalState(c);
        this._resumePosition = c.resumePosition
    }
};
"use strict"; {
    class c {
        constructor(a) {
            this._audioDomHandler = a;
            this._audioContext = a.GetAudioContext();
            this._index = -1;
            this._type = this._tag = "";
            this._params = null
        }
        Release() {
            this._audioContext = null
        }
        _SetIndex(a) {
            this._index = a
        }
        GetIndex() {
            return this._index
        }
        _SetTag(a) {
            this._tag = a
        }
        GetTag() {
            return this._tag
        }
        CreateGain() {
            return this._audioContext.createGain()
        }
        GetInputNode() {}
        ConnectTo(a) {}
        SetAudioParam(a, b, d, g) {
            a.cancelScheduledValues(0);
            if (0 === g) a.value = b;
            else {
                var n = this._audioContext.currentTime;
                g += n;
                switch (d) {
                    case 0:
                        a.setValueAtTime(b,
                            g);
                        break;
                    case 1:
                        a.setValueAtTime(a.value, n);
                        a.linearRampToValueAtTime(b, g);
                        break;
                    case 2:
                        a.setValueAtTime(a.value, n), a.exponentialRampToValueAtTime(b, g)
                }
            }
        }
        GetState() {
            return {
                type: this._type,
                tag: this._tag,
                params: this._params
            }
        }
    }
    self.C3AudioFilterFX = class extends c {
        constructor(a, b, d, g, n, t, e) {
            super(a);
            this._type = "filter";
            this._params = [b, d, g, n, t, e];
            this._inputNode = this.CreateGain();
            this._wetNode = this.CreateGain();
            this._wetNode.gain.value = e;
            this._dryNode = this.CreateGain();
            this._dryNode.gain.value = 1 - e;
            this._filterNode =
                this._audioContext.createBiquadFilter();
            this._filterNode.type = b;
            this._filterNode.frequency.value = d;
            this._filterNode.detune.value = g;
            this._filterNode.Q.value = n;
            this._filterNode.gain.vlaue = t;
            this._inputNode.connect(this._filterNode);
            this._inputNode.connect(this._dryNode);
            this._filterNode.connect(this._wetNode)
        }
        Release() {
            this._inputNode.disconnect();
            this._filterNode.disconnect();
            this._wetNode.disconnect();
            this._dryNode.disconnect();
            super.Release()
        }
        ConnectTo(a) {
            this._wetNode.disconnect();
            this._wetNode.connect(a);
            this._dryNode.disconnect();
            this._dryNode.connect(a)
        }
        GetInputNode() {
            return this._inputNode
        }
        SetParam(a, b, d, g) {
            switch (a) {
                case 0:
                    b = Math.max(Math.min(b / 100, 1), 0);
                    this._params[5] = b;
                    this.SetAudioParam(this._wetNode.gain, b, d, g);
                    this.SetAudioParam(this._dryNode.gain, 1 - b, d, g);
                    break;
                case 1:
                    this._params[1] = b;
                    this.SetAudioParam(this._filterNode.frequency, b, d, g);
                    break;
                case 2:
                    this._params[2] = b;
                    this.SetAudioParam(this._filterNode.detune, b, d, g);
                    break;
                case 3:
                    this._params[3] = b;
                    this.SetAudioParam(this._filterNode.Q,
                        b, d, g);
                    break;
                case 4:
                    this._params[4] = b, this.SetAudioParam(this._filterNode.gain, b, d, g)
            }
        }
    };
    self.C3AudioDelayFX = class extends c {
        constructor(a, b, d, g) {
            super(a);
            this._type = "delay";
            this._params = [b, d, g];
            this._inputNode = this.CreateGain();
            this._wetNode = this.CreateGain();
            this._wetNode.gain.value = g;
            this._dryNode = this.CreateGain();
            this._dryNode.gain.value = 1 - g;
            this._mainNode = this.CreateGain();
            this._delayNode = this._audioContext.createDelay(b);
            this._delayNode.delayTime.value = b;
            this._delayGainNode = this.CreateGain();
            this._delayGainNode.gain.value = d;
            this._inputNode.connect(this._mainNode);
            this._inputNode.connect(this._dryNode);
            this._mainNode.connect(this._wetNode);
            this._mainNode.connect(this._delayNode);
            this._delayNode.connect(this._delayGainNode);
            this._delayGainNode.connect(this._mainNode)
        }
        Release() {
            this._inputNode.disconnect();
            this._wetNode.disconnect();
            this._dryNode.disconnect();
            this._mainNode.disconnect();
            this._delayNode.disconnect();
            this._delayGainNode.disconnect();
            super.Release()
        }
        ConnectTo(a) {
            this._wetNode.disconnect();
            this._wetNode.connect(a);
            this._dryNode.disconnect();
            this._dryNode.connect(a)
        }
        GetInputNode() {
            return this._inputNode
        }
        SetParam(a, b, d, g) {
            const n = self.AudioDOMHandler.DbToLinear;
            switch (a) {
                case 0:
                    b = Math.max(Math.min(b / 100, 1), 0);
                    this._params[2] = b;
                    this.SetAudioParam(this._wetNode.gain, b, d, g);
                    this.SetAudioParam(this._dryNode.gain, 1 - b, d, g);
                    break;
                case 4:
                    this._params[1] = n(b);
                    this.SetAudioParam(this._delayGainNode.gain, n(b), d, g);
                    break;
                case 5:
                    this._params[0] = b, this.SetAudioParam(this._delayNode.delayTime, b, d, g)
            }
        }
    };
    self.C3AudioConvolveFX = class extends c {
        constructor(a, b, d, g) {
            super(a);
            this._type = "convolution";
            this._params = [d, g];
            this._bufferType = this._bufferUrl = this._bufferOriginalUrl = "";
            this._inputNode = this.CreateGain();
            this._wetNode = this.CreateGain();
            this._wetNode.gain.value = g;
            this._dryNode = this.CreateGain();
            this._dryNode.gain.value = 1 - g;
            this._convolveNode = this._audioContext.createConvolver();
            this._convolveNode.normalize = d;
            this._convolveNode.buffer = b;
            this._inputNode.connect(this._convolveNode);
            this._inputNode.connect(this._dryNode);
            this._convolveNode.connect(this._wetNode)
        }
        Release() {
            this._inputNode.disconnect();
            this._convolveNode.disconnect();
            this._wetNode.disconnect();
            this._dryNode.disconnect();
            super.Release()
        }
        ConnectTo(a) {
            this._wetNode.disconnect();
            this._wetNode.connect(a);
            this._dryNode.disconnect();
            this._dryNode.connect(a)
        }
        GetInputNode() {
            return this._inputNode
        }
        SetParam(a, b, d, g) {
            switch (a) {
                case 0:
                    b = Math.max(Math.min(b / 100, 1), 0), this._params[1] = b, this.SetAudioParam(this._wetNode.gain, b, d, g), this.SetAudioParam(this._dryNode.gain,
                        1 - b, d, g)
            }
        }
        _SetBufferInfo(a, b, d) {
            this._bufferOriginalUrl = a;
            this._bufferUrl = b;
            this._bufferType = d
        }
        GetState() {
            const a = super.GetState();
            a.bufferOriginalUrl = this._bufferOriginalUrl;
            a.bufferUrl = "";
            a.bufferType = this._bufferType;
            return a
        }
    };
    self.C3AudioFlangerFX = class extends c {
        constructor(a, b, d, g, n, t) {
            super(a);
            this._type = "flanger";
            this._params = [b, d, g, n, t];
            this._inputNode = this.CreateGain();
            this._dryNode = this.CreateGain();
            this._dryNode.gain.value = 1 - t / 2;
            this._wetNode = this.CreateGain();
            this._wetNode.gain.value =
                t / 2;
            this._feedbackNode = this.CreateGain();
            this._feedbackNode.gain.value = n;
            this._delayNode = this._audioContext.createDelay(b + d);
            this._delayNode.delayTime.value = b;
            this._oscNode = this._audioContext.createOscillator();
            this._oscNode.frequency.value = g;
            this._oscGainNode = this.CreateGain();
            this._oscGainNode.gain.value = d;
            this._inputNode.connect(this._delayNode);
            this._inputNode.connect(this._dryNode);
            this._delayNode.connect(this._wetNode);
            this._delayNode.connect(this._feedbackNode);
            this._feedbackNode.connect(this._delayNode);
            this._oscNode.connect(this._oscGainNode);
            this._oscGainNode.connect(this._delayNode.delayTime);
            this._oscNode.start(0)
        }
        Release() {
            this._oscNode.stop(0);
            this._inputNode.disconnect();
            this._delayNode.disconnect();
            this._oscNode.disconnect();
            this._oscGainNode.disconnect();
            this._dryNode.disconnect();
            this._wetNode.disconnect();
            this._feedbackNode.disconnect();
            super.Release()
        }
        ConnectTo(a) {
            this._wetNode.disconnect();
            this._wetNode.connect(a);
            this._dryNode.disconnect();
            this._dryNode.connect(a)
        }
        GetInputNode() {
            return this._inputNode
        }
        SetParam(a,
            b, d, g) {
            switch (a) {
                case 0:
                    b = Math.max(Math.min(b / 100, 1), 0);
                    this._params[4] = b;
                    this.SetAudioParam(this._wetNode.gain, b / 2, d, g);
                    this.SetAudioParam(this._dryNode.gain, 1 - b / 2, d, g);
                    break;
                case 6:
                    this._params[1] = b / 1E3;
                    this.SetAudioParam(this._oscGainNode.gain, b / 1E3, d, g);
                    break;
                case 7:
                    this._params[2] = b;
                    this.SetAudioParam(this._oscNode.frequency, b, d, g);
                    break;
                case 8:
                    this._params[3] = b / 100, this.SetAudioParam(this._feedbackNode.gain, b / 100, d, g)
            }
        }
    };
    self.C3AudioPhaserFX = class extends c {
        constructor(a, b, d, g, n, t, e) {
            super(a);
            this._type = "phaser";
            this._params = [b, d, g, n, t, e];
            this._inputNode = this.CreateGain();
            this._dryNode = this.CreateGain();
            this._dryNode.gain.value = 1 - e / 2;
            this._wetNode = this.CreateGain();
            this._wetNode.gain.value = e / 2;
            this._filterNode = this._audioContext.createBiquadFilter();
            this._filterNode.type = "allpass";
            this._filterNode.frequency.value = b;
            this._filterNode.detune.value = d;
            this._filterNode.Q.value = g;
            this._oscNode = this._audioContext.createOscillator();
            this._oscNode.frequency.value = t;
            this._oscGainNode = this.CreateGain();
            this._oscGainNode.gain.value = n;
            this._inputNode.connect(this._filterNode);
            this._inputNode.connect(this._dryNode);
            this._filterNode.connect(this._wetNode);
            this._oscNode.connect(this._oscGainNode);
            this._oscGainNode.connect(this._filterNode.frequency);
            this._oscNode.start(0)
        }
        Release() {
            this._oscNode.stop(0);
            this._inputNode.disconnect();
            this._filterNode.disconnect();
            this._oscNode.disconnect();
            this._oscGainNode.disconnect();
            this._dryNode.disconnect();
            this._wetNode.disconnect();
            super.Release()
        }
        ConnectTo(a) {
            this._wetNode.disconnect();
            this._wetNode.connect(a);
            this._dryNode.disconnect();
            this._dryNode.connect(a)
        }
        GetInputNode() {
            return this._inputNode
        }
        SetParam(a, b, d, g) {
            switch (a) {
                case 0:
                    b = Math.max(Math.min(b / 100, 1), 0);
                    this._params[5] = b;
                    this.SetAudioParam(this._wetNode.gain, b / 2, d, g);
                    this.SetAudioParam(this._dryNode.gain, 1 - b / 2, d, g);
                    break;
                case 1:
                    this._params[0] = b;
                    this.SetAudioParam(this._filterNode.frequency, b, d, g);
                    break;
                case 2:
                    this._params[1] = b;
                    this.SetAudioParam(this._filterNode.detune, b, d, g);
                    break;
                case 3:
                    this._params[2] = b;
                    this.SetAudioParam(this._filterNode.Q,
                        b, d, g);
                    break;
                case 6:
                    this._params[3] = b;
                    this.SetAudioParam(this._oscGainNode.gain, b, d, g);
                    break;
                case 7:
                    this._params[4] = b, this.SetAudioParam(this._oscNode.frequency, b, d, g)
            }
        }
    };
    self.C3AudioGainFX = class extends c {
        constructor(a, b) {
            super(a);
            this._type = "gain";
            this._params = [b];
            this._node = this.CreateGain();
            this._node.gain.value = b
        }
        Release() {
            this._node.disconnect();
            super.Release()
        }
        ConnectTo(a) {
            this._node.disconnect();
            this._node.connect(a)
        }
        GetInputNode() {
            return this._node
        }
        SetParam(a, b, d, g) {
            const n = self.AudioDOMHandler.DbToLinear;
            switch (a) {
                case 4:
                    this._params[0] = n(b), this.SetAudioParam(this._node.gain, n(b), d, g)
            }
        }
    };
    self.C3AudioTremoloFX = class extends c {
        constructor(a, b, d) {
            super(a);
            this._type = "tremolo";
            this._params = [b, d];
            this._node = this.CreateGain();
            this._node.gain.value = 1 - d / 2;
            this._oscNode = this._audioContext.createOscillator();
            this._oscNode.frequency.value = b;
            this._oscGainNode = this.CreateGain();
            this._oscGainNode.gain.value = d / 2;
            this._oscNode.connect(this._oscGainNode);
            this._oscGainNode.connect(this._node.gain);
            this._oscNode.start(0)
        }
        Release() {
            this._oscNode.stop(0);
            this._oscNode.disconnect();
            this._oscGainNode.disconnect();
            this._node.disconnect();
            super.Release()
        }
        ConnectTo(a) {
            this._node.disconnect();
            this._node.connect(a)
        }
        GetInputNode() {
            return this._node
        }
        SetParam(a, b, d, g) {
            switch (a) {
                case 0:
                    b = Math.max(Math.min(b / 100, 1), 0);
                    this._params[1] = b;
                    this.SetAudioParam(this._node.gain.value, 1 - b / 2, d, g);
                    this.SetAudioParam(this._oscGainNode.gain.value, b / 2, d, g);
                    break;
                case 7:
                    this._params[0] = b, this.SetAudioParam(this._oscNode.frequency, b, d, g)
            }
        }
    };
    self.C3AudioRingModFX = class extends c {
        constructor(a,
            b, d) {
            super(a);
            this._type = "ringmod";
            this._params = [b, d];
            this._inputNode = this.CreateGain();
            this._wetNode = this.CreateGain();
            this._wetNode.gain.value = d;
            this._dryNode = this.CreateGain();
            this._dryNode.gain.value = 1 - d;
            this._ringNode = this.CreateGain();
            this._ringNode.gain.value = 0;
            this._oscNode = this._audioContext.createOscillator();
            this._oscNode.frequency.value = b;
            this._oscNode.connect(this._ringNode.gain);
            this._oscNode.start(0);
            this._inputNode.connect(this._ringNode);
            this._inputNode.connect(this._dryNode);
            this._ringNode.connect(this._wetNode)
        }
        Release() {
            this._oscNode.stop(0);
            this._oscNode.disconnect();
            this._ringNode.disconnect();
            this._inputNode.disconnect();
            this._wetNode.disconnect();
            this._dryNode.disconnect();
            super.Release()
        }
        ConnectTo(a) {
            this._wetNode.disconnect();
            this._wetNode.connect(a);
            this._dryNode.disconnect();
            this._dryNode.connect(a)
        }
        GetInputNode() {
            return this._inputNode
        }
        SetParam(a, b, d, g) {
            switch (a) {
                case 0:
                    b = Math.max(Math.min(b / 100, 1), 0);
                    this._params[1] = b;
                    this.SetAudioParam(this._wetNode.gain, b, d, g);
                    this.SetAudioParam(this._dryNode.gain, 1 - b, d, g);
                    break;
                case 7:
                    this._params[0] =
                        b, this.SetAudioParam(this._oscNode.frequency, b, d, g)
            }
        }
    };
    self.C3AudioDistortionFX = class extends c {
        constructor(a, b, d, g, n, t) {
            super(a);
            this._type = "distortion";
            this._params = [b, d, g, n, t];
            this._inputNode = this.CreateGain();
            this._preGain = this.CreateGain();
            this._postGain = this.CreateGain();
            this._SetDrive(g, n);
            this._wetNode = this.CreateGain();
            this._wetNode.gain.value = t;
            this._dryNode = this.CreateGain();
            this._dryNode.gain.value = 1 - t;
            this._waveShaper = this._audioContext.createWaveShaper();
            this._curve = new Float32Array(65536);
            this._GenerateColortouchCurve(b, d);
            this._waveShaper.curve = this._curve;
            this._inputNode.connect(this._preGain);
            this._inputNode.connect(this._dryNode);
            this._preGain.connect(this._waveShaper);
            this._waveShaper.connect(this._postGain);
            this._postGain.connect(this._wetNode)
        }
        Release() {
            this._inputNode.disconnect();
            this._preGain.disconnect();
            this._waveShaper.disconnect();
            this._postGain.disconnect();
            this._wetNode.disconnect();
            this._dryNode.disconnect();
            super.Release()
        }
        _SetDrive(a, b) {
            .01 > a && (a = .01);
            this._preGain.gain.value =
                a;
            this._postGain.gain.value = Math.pow(1 / a, .6) * b
        }
        _GenerateColortouchCurve(a, b) {
            for (let d = 0; 32768 > d; ++d) {
                let g = d / 32768;
                g = this._Shape(g, a, b);
                this._curve[32768 + d] = g;
                this._curve[32768 - d - 1] = -g
            }
        }
        _Shape(a, b, d) {
            d = 1.05 * d * b - b;
            const g = 0 > a ? -1 : 1;
            a = 0 > a ? -a : a;
            return (a < b ? a : b + d * self.AudioDOMHandler.e4(a - b, 1 / d)) * g
        }
        ConnectTo(a) {
            this._wetNode.disconnect();
            this._wetNode.connect(a);
            this._dryNode.disconnect();
            this._dryNode.connect(a)
        }
        GetInputNode() {
            return this._inputNode
        }
        SetParam(a, b, d, g) {
            switch (a) {
                case 0:
                    b = Math.max(Math.min(b /
                        100, 1), 0), this._params[4] = b, this.SetAudioParam(this._wetNode.gain, b, d, g), this.SetAudioParam(this._dryNode.gain, 1 - b, d, g)
            }
        }
    };
    self.C3AudioCompressorFX = class extends c {
        constructor(a, b, d, g, n, t) {
            super(a);
            this._type = "compressor";
            this._params = [b, d, g, n, t];
            this._node = this._audioContext.createDynamicsCompressor();
            this._node.threshold.value = b;
            this._node.knee.value = d;
            this._node.ratio.value = g;
            this._node.attack.value = n;
            this._node.release.value = t
        }
        Release() {
            this._node.disconnect();
            super.Release()
        }
        ConnectTo(a) {
            this._node.disconnect();
            this._node.connect(a)
        }
        GetInputNode() {
            return this._node
        }
        SetParam(a, b, d, g) {}
    };
    self.C3AudioAnalyserFX = class extends c {
        constructor(a, b, d) {
            super(a);
            this._type = "analyser";
            this._params = [b, d];
            this._node = this._audioContext.createAnalyser();
            this._node.fftSize = b;
            this._node.smoothingTimeConstant = d;
            this._freqBins = new Float32Array(this._node.frequencyBinCount);
            this._signal = new Uint8Array(b);
            this._rms = this._peak = 0;
            this._audioDomHandler._AddAnalyser(this)
        }
        Release() {
            this._audioDomHandler._RemoveAnalyser(this);
            this._node.disconnect();
            super.Release()
        }
        Tick() {
            this._node.getFloatFrequencyData(this._freqBins);
            this._node.getByteTimeDomainData(this._signal);
            const a = this._node.fftSize;
            let b = this._peak = 0;
            for (var d = 0; d < a; ++d) {
                let g = (this._signal[d] - 128) / 128;
                0 > g && (g = -g);
                this._peak < g && (this._peak = g);
                b += g * g
            }
            d = self.AudioDOMHandler.LinearToDb;
            this._peak = d(this._peak);
            this._rms = d(Math.sqrt(b / a))
        }
        ConnectTo(a) {
            this._node.disconnect();
            this._node.connect(a)
        }
        GetInputNode() {
            return this._node
        }
        SetParam(a, b, d, g) {}
        GetData() {
            return {
                tag: this.GetTag(),
                index: this.GetIndex(),
                peak: this._peak,
                rms: this._rms,
                binCount: this._node.frequencyBinCount,
                freqBins: this._freqBins
            }
        }
    }
};