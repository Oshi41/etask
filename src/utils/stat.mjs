import {isNode} from "./env.mjs";

const os = isNode() ? await import('os') : null;

export function stats() {
    const metrics = {
        timestamp: Date.now(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    if (typeof navigator != 'undefined') {
        Object.assign(metrics, {
            // Browser info
            language: navigator.language,
            languages: navigator.languages,
            cookiesEnabled: navigator.cookieEnabled,
            doNotTrack: navigator.doNotTrack,
            onLine: navigator.onLine,
            pdfViewerEnabled: navigator.pdfViewerEnabled,
            userAgent: navigator.userAgent,


            // Device info
            deviceMemory: navigator.deviceMemory,
            hardwareConcurrency: navigator.hardwareConcurrency,
            maxTouchPoints: navigator.maxTouchPoints,
            platform: navigator.platform,

            serviceWorkersSupported: (() => {
                try {
                    return !!navigator.serviceWorker;
                } catch (e) {
                    return false;
                }
            })(),
        });
    }

    if (typeof process != 'undefined') {
        Object.assign(metrics, {
            cwd: process.cwd(),

            // Process info
            pid: process.pid,
            ppid: process.ppid,
            execPath: process.execPath,
            execArgv: process.execArgv,
            argv: process.argv,
            version: process.version,
            versions: process.versions,

            // Process metrics
            cpu: process.cpuUsage(),
            memory: process.memoryUsage(),
            resource: process.resourceUsage(),
            uptime: process.uptime(),

            // System metrics
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,

            // V8 metrics (if available)
            v8HeapStats: process.memoryUsage?.v8 ? process.memoryUsage.v8() : undefined,

            // Environment variables (sanitized)
            nodeEnv: process.env.NODE_ENV,
        });
    }

    if (os) {
        Object.assign(metrics, {
            host: os.hostname(),
            // OS metrics
            osType: os.type(),
            osRelease: os.release(),
            osPlatform: os.platform(),
            osArch: os.arch(),
            totalMemory: os.totalmem(),
            freeMemory: os.freemem(),
            cpuCount: os.cpus().length,
            cpuModel: os.cpus()[0]?.model || 'Unknown',
            loadAverage: os.loadavg(),
            networkInterfaces: Object.keys(os.networkInterfaces()).length,
        });
    }

    if (typeof window != 'undefined') {
        Object.assign(metrics, {
            // Window metrics
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            screenColorDepth: window.screen.colorDepth,
            screenPixelDepth: window.screen.pixelDepth,
            innerWidth: window.innerWidth,
            innerHeight: window.innerHeight,
            outerWidth: window.outerWidth,
            outerHeight: window.outerHeight,
            devicePixelRatio: window.devicePixelRatio,

            // Feature detection
            localStorageAvailable: (() => {
                try {
                    return !!window.localStorage;
                } catch (e) {
                    return false;
                }
            })(),
            sessionStorageAvailable: (() => {
                try {
                    return !!window.sessionStorage;
                } catch (e) {
                    return false;
                }
            })(),
            indexedDBSupported: (() => {
                try {
                    return !!window.indexedDB;
                } catch (e) {
                    return false;
                }
            })(),
            webRTCSupported: (() => {
                try {
                    return !!(window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection);
                } catch (e) {
                    return false;
                }
            })(),
            webSocketsSupported: (() => {
                try {
                    return !!window.WebSocket;
                } catch (e) {
                    return false;
                }
            })(),
            webWorkersSupported: (() => {
                try {
                    return !!window.Worker;
                } catch (e) {
                    return false;
                }
            })(),
        });
    }

    if (typeof document != 'undefined') {
        Object.assign(metrics, {
            // Document metrics
            documentTitle: document.title,
            documentURL: document.URL,
            documentReferrer: document.referrer,
            documentEncoding: document.characterSet,
            documentLanguage: document.language,
            documentCookieEnabled: document.cookieEnabled,

            // Page visibility
            pageVisible: document.visibilityState === 'visible',
            visibilityState: document.visibilityState,


        });

        // WebGL capabilities and rendering info
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                metrics.webgl = {
                    vendor: gl.getParameter(gl.VENDOR),
                    renderer: gl.getParameter(gl.RENDERER),
                    version: gl.getParameter(gl.VERSION),
                    shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
                    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
                    maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
                    redBits: gl.getParameter(gl.RED_BITS),
                    greenBits: gl.getParameter(gl.GREEN_BITS),
                    blueBits: gl.getParameter(gl.BLUE_BITS),
                    alphaBits: gl.getParameter(gl.ALPHA_BITS),
                    depthBits: gl.getParameter(gl.DEPTH_BITS),
                    stencilBits: gl.getParameter(gl.STENCIL_BITS),
                    maxRenderBufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
                    extensions: gl.getSupportedExtensions()
                };
            }
        } catch (e) {
            metrics.webglError = e.message;
        }

    }

    return metrics;
}