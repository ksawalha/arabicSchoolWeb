(() => {
  // app.jsx
  var { useState, useEffect, useRef, useCallback, useMemo } = React;
  var DateTime = luxon.DateTime;
  var API_BASE = window.AppConfig.host.replace(/\/$/, "");
  var Auth = {
    getToken: () => sessionStorage.getItem("jwt") || "",
    setToken: (t) => sessionStorage.setItem("jwt", t),
    clear: () => sessionStorage.removeItem("jwt"),
    isLoggedIn: () => !!sessionStorage.getItem("jwt"),
    parseJwt: (token) => {
      try {
        const payload = token.split(".")[1];
        return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
      } catch {
        return null;
      }
    },
    getUser: () => {
      const t = sessionStorage.getItem("jwt");
      if (!t) return null;
      const claims = Auth.parseJwt(t);
      if (!claims) return null;
      return {
        name: claims.n || claims.name || "",
        id: claims.i || claims.id || "",
        role: claims.r || claims.role || ""
      };
    }
  };
  var formatMimeType = (mime) => {
    if (!mime) return "Unknown File";
    let t = mime.split("/")[1] || mime;
    if (t.includes("wordprocessingml")) return "DOCX";
    if (t.includes("spreadsheetml")) return "XLSX";
    if (t.includes("presentationml")) return "PPTX";
    if (t === "msword") return "DOC";
    if (t === "pdf") return "PDF";
    if (mime.startsWith("image/")) return t.toUpperCase() + " Image";
    if (mime.startsWith("video/")) return t.toUpperCase() + " Video";
    return t.toUpperCase();
  };
  var api = axios.create({ baseURL: API_BASE });
  api.interceptors.request.use((config) => {
    const jwt = Auth.getToken();
    if (jwt) config.headers.Authorization = `Bearer ${jwt}`;
    if (config.method === "get") {
      const offset = (/* @__PURE__ */ new Date()).getTimezoneOffset();
      const sign = offset <= 0 ? "+" : "-";
      const h = String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0");
      const m = String(Math.abs(offset) % 60).padStart(2, "0");
      config.headers["x-timezone"] = `${sign}${h}:${m}`;
    }
    return config;
  });
  api.interceptors.response.use(
    (res) => res,
    (err) => {
      if (err.response?.status === 401) {
        Auth.clear();
        window.location.hash = "";
        window.location.reload();
      }
      return Promise.reject(err);
    }
  );
  var colorFromId = (id) => {
    if (!id) return "#50AC55";
    let hash = 0;
    for (let i = 0; i < String(id).length; i++) hash = String(id).charCodeAt(i) + ((hash << 5) - hash);
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 55%, 45%)`;
  };
  var initialsFromName = (name) => {
    if (!name || !name.trim()) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };
  var formatDate = (raw) => {
    if (!raw) return "\u2014";
    try {
      const dt = DateTime.fromISO(raw).toLocal();
      return dt.isValid ? dt.toFormat("dd/MM/yyyy hh:mma") : String(raw);
    } catch {
      return String(raw);
    }
  };
  var formatDateShort = (raw) => {
    if (!raw) return "";
    try {
      const dt = DateTime.fromISO(raw).toLocal();
      return dt.isValid ? dt.toRelative() : "";
    } catch {
      return "";
    }
  };
  var calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const now = DateTime.now();
    const birth = DateTime.fromISO(birthDate).toLocal();
    if (!birth.isValid) return null;
    let age = now.year - birth.year;
    if (now.month < birth.month || now.month === birth.month && now.day < birth.day) {
      age--;
    }
    return age;
  };
  var toAbsoluteAssetUrl = (rawUrl) => {
    if (!rawUrl) return "";
    if (/^https?:\/\//i.test(rawUrl) || rawUrl.startsWith("data:")) return rawUrl;
    return `${API_BASE}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`;
  };
  var toAzureVideoUrl = (rawUrl) => {
    if (!rawUrl) return "";
    if (rawUrl.startsWith("blob:") || rawUrl.startsWith("data:")) return rawUrl;
    const strippedPart = rawUrl.split("/").pop();
    return `https://arabicschool.azureedge.net/${strippedPart}`;
  };
  var bodyScrollLockDepth = 0;
  var previousBodyOverflow = "";
  var previousBodyPaddingRight = "";
  var ensureOverlayRoot = () => {
    let root2 = document.getElementById("app-overlay-root");
    if (!root2) {
      root2 = document.createElement("div");
      root2.id = "app-overlay-root";
      document.body.appendChild(root2);
    }
    return root2;
  };
  var lockBodyScroll = () => {
    const body = document.body;
    const doc = document.documentElement;
    if (bodyScrollLockDepth === 0) {
      previousBodyOverflow = body.style.overflow;
      previousBodyPaddingRight = body.style.paddingRight;
      const scrollbarWidth = window.innerWidth - doc.clientWidth;
      body.style.overflow = "hidden";
      if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    }
    bodyScrollLockDepth += 1;
    return () => {
      bodyScrollLockDepth = Math.max(0, bodyScrollLockDepth - 1);
      if (bodyScrollLockDepth === 0) {
        body.style.overflow = previousBodyOverflow;
        body.style.paddingRight = previousBodyPaddingRight;
      }
    };
  };
  var statusClass = (status) => {
    if (!status) return "";
    const s = status.toLowerCase();
    if (s.includes("active") || s.includes("current") || s.includes("enrolled")) return "active";
    if (s.includes("pending") || s.includes("invited")) return "pending";
    if (s.includes("inactive") || s.includes("archived") || s.includes("discontinued")) return "inactive";
    if (s.includes("present")) return "present";
    if (s.includes("absent")) return "absent";
    if (s.includes("facilities")) return "facilities";
    return "";
  };
  var Icon = ({ name, size = 20, ...props }) => {
    const ref = useRef(null);
    useEffect(() => {
      if (ref.current) {
        ref.current.innerHTML = feather.icons[name]?.toSvg({ width: size, height: size }) || "";
      }
    }, [name, size]);
    return /* @__PURE__ */ React.createElement("span", { ref, style: { display: "inline-flex", lineHeight: 0 }, ...props });
  };
  var MicrosoftLogo = () => /* @__PURE__ */ React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "18", height: "18", viewBox: "0 0 21 21" }, /* @__PURE__ */ React.createElement("rect", { x: "1", y: "1", width: "9", height: "9", fill: "#f25022" }), /* @__PURE__ */ React.createElement("rect", { x: "11", y: "1", width: "9", height: "9", fill: "#7fba00" }), /* @__PURE__ */ React.createElement("rect", { x: "1", y: "11", width: "9", height: "9", fill: "#00a4ef" }), /* @__PURE__ */ React.createElement("rect", { x: "11", y: "11", width: "9", height: "9", fill: "#ffb900" }));
  var _msalInstance = null;
  var _msalInitReady = null;
  var getMsalReady = () => {
    if (!_msalInstance) {
      const { msClientId } = window.AppConfig;
      _msalInstance = new msal.PublicClientApplication({
        auth: { clientId: msClientId, authority: "https://login.microsoftonline.com/common", redirectUri: window.location.origin + "/index.html" },
        cache: { cacheLocation: "sessionStorage", storeAuthStateInCookie: false }
      });
    }
    if (!_msalInitReady) _msalInitReady = _msalInstance.initialize();
    return _msalInitReady.then(() => _msalInstance);
  };
  var MS_SCOPES = ["openid", "profile", "email", "User.Read"];
  var QR_TIMEOUT_SECONDS = 30;
  var Avatar = ({ name, photoUrl, id, size = 36, className = "", ...props }) => {
    const bg = colorFromId(id || name);
    const initials = initialsFromName(name);
    const photo = toAbsoluteAssetUrl(photoUrl);
    const tooltipText = props.title || `Username:${name || "Unknown"}
Tenant:Parramatta Arabic School Incorporated`;
    if (photo) {
      return /* @__PURE__ */ React.createElement("div", { className: `cell-avatar ${className}`, style: { width: size, height: size, background: bg }, title: tooltipText, ...props }, /* @__PURE__ */ React.createElement("img", {
        src: photo, alt: "", onError: (e) => {
          e.target.style.display = "none";
        }
      }));
    }
    return /* @__PURE__ */ React.createElement("div", { className: `cell-avatar ${className}`, style: { width: size, height: size, background: bg, fontSize: size * 0.35 }, title: tooltipText, ...props }, initials);
  };
  var GlobalCanvasPortal = ({ children }) => {
    const [target, setTarget] = useState(null);
    useEffect(() => {
      setTarget(ensureOverlayRoot());
    }, []);
    useEffect(() => lockBodyScroll(), []);
    if (!target) return null;
    return ReactDOM.createPortal(children, target);
  };
  var ckEditorLoaderPromise = null;
  var ensureCkEditorLoaded = () => {
    if (window.CKEDITOR?.ClassicEditor) {
      return Promise.resolve(window.CKEDITOR.ClassicEditor);
    }
    if (ckEditorLoaderPromise) return ckEditorLoaderPromise;
    ckEditorLoaderPromise = new Promise((resolve, reject) => {
      const existing = document.getElementById("ckeditor-super-build-script");
      if (existing) {
        existing.addEventListener("load", () => {
          if (window.CKEDITOR?.ClassicEditor) resolve(window.CKEDITOR.ClassicEditor);
          else reject(new Error("CKEditor was loaded but ClassicEditor is unavailable."));
        }, { once: true });
        existing.addEventListener("error", () => reject(new Error("Failed to load CKEditor script.")), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.id = "ckeditor-super-build-script";
      script.src = "https://cdn.ckeditor.com/ckeditor5/39.0.1/super-build/ckeditor.js";
      script.async = true;
      script.onload = () => {
        if (window.CKEDITOR?.ClassicEditor) resolve(window.CKEDITOR.ClassicEditor);
        else reject(new Error("CKEditor was loaded but ClassicEditor is unavailable."));
      };
      script.onerror = () => reject(new Error("Failed to load CKEditor script."));
      document.head.appendChild(script);
    });
    return ckEditorLoaderPromise;
  };
  var CkEditorHtmlField = ({ value, onChange, placeholder = "Write your post body here...", height = 320 }) => {
    const hostRef = useRef(null);
    const editorRef = useRef(null);
    useEffect(() => {
      let disposed = false;
      (async () => {
        try {
          const ClassicEditor = await ensureCkEditorLoaded();
          if (disposed || !hostRef.current) return;
          const editor = await ClassicEditor.create(hostRef.current, {
            placeholder,
            toolbar: {
              items: [
                "bold",
                "italic",
                "underline",
                "|",
                "fontColor",
                "fontBackgroundColor",
                "|",
                "alignment",
                "bulletedList",
                "|",
                "link",
                "|",
                "undo",
                "redo",
                "|",
                "BidiLtr",
                "BidiRtl"
              ],
              shouldNotGroupWhenFull: true
            },
            fontSize: {
              options: ["tiny", "small", "default", "big", "huge"]
            },
            link: {
              addTargetToExternalLinks: true,
              defaultProtocol: "https://"
            },
            removePlugins: [
              "CKBox",
              "CKFinder",
              "EasyImage",
              "RealTimeCollaborativeComments",
              "RealTimeCollaborativeTrackChanges",
              "RealTimeCollaborativeRevisionHistory",
              "PresenceList",
              "Comments",
              "TrackChanges",
              "TrackChangesData",
              "RevisionHistory",
              "Pagination",
              "WProofreader",
              "MathType",
              "SlashCommand",
              "Template",
              "DocumentOutline",
              "FormatPainter",
              "TableOfContents",
              "PasteFromOfficeEnhanced"
            ]
          });
          if (disposed) {
            await editor.destroy();
            return;
          }
          editorRef.current = editor;
          editor.setData(value || "");
          editor.model.document.on("change:data", () => {
            onChange?.(editor.getData());
          });
          const editableElement = editor.ui.view.editable.element;
          if (editableElement) {
            editableElement.setAttribute("dir", "auto");
          }
        } catch (err) {
          console.error("CKEditor initialization failed:", err);
        }
      })();
      return () => {
        disposed = true;
        const editor = editorRef.current;
        editorRef.current = null;
        if (editor) {
          editor.destroy().catch(() => {
          });
        }
      };
    }, []);
    useEffect(() => {
      const editor = editorRef.current;
      if (!editor) return;
      const current = editor.getData();
      if ((value || "") !== current) {
        editor.setData(value || "");
      }
    }, [value]);
    return /* @__PURE__ */ React.createElement("div", { className: "ckeditor-host", style: { minHeight: typeof height === "number" ? `${height}px` : height } }, /* @__PURE__ */ React.createElement("div", { ref: hostRef }));
  };
  var useHashRoute = () => {
    const [route, setRoute] = useState(window.location.hash.replace("#", "") || "/");
    useEffect(() => {
      const handler = () => setRoute(window.location.hash.replace("#", "") || "/");
      window.addEventListener("hashchange", handler);
      return () => window.removeEventListener("hashchange", handler);
    }, []);
    return route;
  };
  var navigate = (path) => {
    window.location.hash = path;
  };
  var Login = ({ onLoginSuccess }) => {
    const [status, setStatus] = useState("loading");
    const [qrData, setQrData] = useState(null);
    const [guid, setGuid] = useState(null);
    const [user, setUser] = useState(null);
    const [errorMsg, setErrorMsg] = useState("");
    const [secondsLeft, setSecondsLeft] = useState(QR_TIMEOUT_SECONDS);
    const statusRef = useRef(status);
    const pollIntervalRef = useRef(null);
    const countdownRef = useRef(null);
    useEffect(() => {
      statusRef.current = status;
    }, [status]);
    const clearAllTimers = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
    useEffect(() => {
      createSession();
      return clearAllTimers;
    }, []);
    const createSession = async () => {
      clearAllTimers();
      setStatus("loading");
      setErrorMsg("");
      setQrData(null);
      setGuid(null);
      setSecondsLeft(QR_TIMEOUT_SECONDS);
      try {
        const res = await axios.post(`${API_BASE}/api/webLogin`);
        if (res.data?.image && res.data?.guid) {
          const raw = res.data.image.replace("data:image/png;base64,", "");
          setQrData(`data:image/png;base64,${raw}`);
          setGuid(res.data.guid);
          setStatus("scanning");
        } else throw new Error("Invalid response format");
      } catch (err) {
        setErrorMsg(err.response?.data?.message || err.message || "Could not connect to the server.");
        setStatus("error");
      }
    };
    useEffect(() => {
      if (!guid || status !== "scanning") return;
      const checkStatus = async () => {
        if (statusRef.current !== "scanning") return;
        try {
          const res = await axios.get(`${API_BASE}/api/webLoginStatus/${guid}`);
          if (res.status === 200 && res.data.authenticated) {
            clearAllTimers();
            if (res.data.accessToken) Auth.setToken(res.data.accessToken);
            setUser(res.data);
            setStatus("success");
          }
        } catch (err) {
          if (err.response) {
            const s = err.response.status;
            if (s === 409 || s === 404 || s === 400) {
              clearAllTimers();
              setErrorMsg(err.response.data?.message || "Authentication error");
              setStatus("error");
            }
          }
        }
      };
      pollIntervalRef.current = setInterval(checkStatus, 2500);
      setSecondsLeft(QR_TIMEOUT_SECONDS);
      countdownRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearAllTimers();
            if (statusRef.current === "scanning") setStatus("timeout");
            return 0;
          }
          return prev - 1;
        });
      }, 1e3);
      return clearAllTimers;
    }, [guid, status]);
    const handleMsLogin = async () => {
      clearAllTimers();
      setStatus("ms_loading");
      setErrorMsg("");
      try {
        const msalApp = await getMsalReady();
        let authResult;
        try {
          authResult = await msalApp.loginPopup({ scopes: MS_SCOPES, prompt: "select_account" });
        } catch (popupErr) {
          if (popupErr.errorCode === "user_cancelled" || popupErr.message?.includes("user_cancelled") || popupErr.errorCode === "access_denied") {
            await createSession();
            return;
          }
          throw popupErr;
        }
        const idToken = authResult.idToken;
        if (!idToken) throw new Error("No ID token received from Microsoft.");
        const res = await axios.post(`${API_BASE}/api/third-party/user`, { provider: "microsoft", token: idToken, device_id: "web", deviceOS: "web" });
        if (res.data?.accessToken) {
          Auth.setToken(res.data.accessToken);
          setUser(res.data);
          setStatus("success");
        } else throw new Error("Invalid response from server.");
      } catch (err) {
        const msg = err.response?.data?.error || err.response?.data?.message || err.message || "Microsoft login failed.";
        setErrorMsg(msg);
        if (guid) setStatus("scanning");
        else setStatus("error");
      }
    };
    useEffect(() => {
      if (status === "success") {
        const timer = setTimeout(() => onLoginSuccess(), 400);
        return () => clearTimeout(timer);
      }
    }, [status]);
    if (status === "success") {
      return /* @__PURE__ */ React.createElement("div", { className: "success-view login-content" }, /* @__PURE__ */ React.createElement("div", { className: "success-icon" }, /* @__PURE__ */ React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "28", height: "28", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("polyline", { points: "20 6 9 17 4 12" }))), /* @__PURE__ */ React.createElement("h2", { className: "success-title" }, "Welcome, ", user?.fullName || "Teacher", "!"), /* @__PURE__ */ React.createElement("p", { className: "success-subtitle" }, "Redirecting to dashboard\u2026"), /* @__PURE__ */ React.createElement("div", { className: "spinner", style: { marginTop: 12 } }));
    }
    const isBusy = status === "loading" || status === "ms_loading";
    return /* @__PURE__ */ React.createElement("div", { className: "login-content" }, status === "ms_loading" && /* @__PURE__ */ React.createElement("div", { className: "status-badge scanning" }, /* @__PURE__ */ React.createElement("div", { className: "spinner", style: { width: 10, height: 10, borderWidth: 1.5 } }), "Signing in with Microsoft\u2026"), status === "error" && /* @__PURE__ */ React.createElement("div", { className: "status-badge error" }, /* @__PURE__ */ React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "10" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "8", x2: "12", y2: "12" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "16", x2: "12.01", y2: "16" })), errorMsg || "Something went wrong"), /* @__PURE__ */ React.createElement("div", { className: "qr-container" }, isBusy && /* @__PURE__ */ React.createElement("div", { className: "qr-placeholder" }, /* @__PURE__ */ React.createElement("div", { className: "spinner" }), status === "ms_loading" ? "Waiting for Microsoft\u2026" : "Please Wait\u2026"), status === "scanning" && qrData && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("p", { className: "qr-instruction" }, "Scan this code with  the app."), /* @__PURE__ */ React.createElement("img", { src: qrData, alt: "Login QR Code", className: "qr-image", draggable: false, onContextMenu: (e) => e.preventDefault() }), secondsLeft <= 15 && /* @__PURE__ */ React.createElement("p", { style: { fontSize: "0.72rem", color: secondsLeft <= 8 ? "#d32f2f" : "#999", marginTop: "0.5rem", fontWeight: 600 } }, "Expires in ", secondsLeft, "s")), status === "timeout" && /* @__PURE__ */ React.createElement("div", { className: "qr-expired" }, /* @__PURE__ */ React.createElement("svg", { className: "icon-clock", xmlns: "http://www.w3.org/2000/svg", width: "40", height: "40", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "10" }), /* @__PURE__ */ React.createElement("polyline", { points: "12 6 12 12 16 14" })), /* @__PURE__ */ React.createElement("p", { style: { color: "#888", fontWeight: 600 } }, "QR code expired"), /* @__PURE__ */ React.createElement("p", { style: { fontSize: "0.75rem", color: "#aaa" } }, "No scan received within 30 seconds."), /* @__PURE__ */ React.createElement("button", { className: "btn-reload", onClick: createSession }, /* @__PURE__ */ React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("polyline", { points: "23 4 23 10 17 10" }), /* @__PURE__ */ React.createElement("path", { d: "M20.49 15a9 9 0 1 1-2.12-9.36L23 10" })), "Reload QR")), status === "error" && /* @__PURE__ */ React.createElement("div", { className: "qr-expired" }, /* @__PURE__ */ React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "40", height: "40", viewBox: "0 0 24 24", fill: "none", stroke: "#ddd", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("path", { d: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "9", x2: "12", y2: "13" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "17", x2: "12.01", y2: "17" })), /* @__PURE__ */ React.createElement("button", { className: "btn-reload", onClick: createSession }, /* @__PURE__ */ React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("polyline", { points: "23 4 23 10 17 10" }), /* @__PURE__ */ React.createElement("path", { d: "M20.49 15a9 9 0 1 1-2.12-9.36L23 10" })), "Try Again"))), !isBusy && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "or-divider" }, "OR"), /* @__PURE__ */ React.createElement("button", { id: "ms-login-btn", className: "btn-ms", onClick: handleMsLogin, disabled: status === "ms_loading" }, /* @__PURE__ */ React.createElement(MicrosoftLogo, null), "Login with School Email")));
  };
  var LoginPage = ({ onLoginSuccess }) => {
    useEffect(() => {
      document.body.classList.add("login-page");
      return () => document.body.classList.remove("login-page");
    }, []);
    return /* @__PURE__ */ React.createElement("div", { className: "login-card" }, /* @__PURE__ */ React.createElement("div", { className: "brand-section" }, /* @__PURE__ */ React.createElement("img", { src: "./assets/logo.png", alt: "Parramatta Arabic School Logo", className: "brand-logo-img" }), /* @__PURE__ */ React.createElement("h1", { className: "brand-title" }, "Parramatta Arabic School"), /* @__PURE__ */ React.createElement("p", { className: "brand-subtitle" }, "Staff Login")), /* @__PURE__ */ React.createElement(Login, { onLoginSuccess }), /* @__PURE__ */ React.createElement("footer", { className: "card-footer" }, /* @__PURE__ */ React.createElement("p", null, "PROD V2.0 \u2014 Parramatta Arabic School ", (/* @__PURE__ */ new Date()).getFullYear())));
  };
  var navItems = [
    { id: "/home", label: "Home", icon: "home" },
    { id: "/students", label: "Students", icon: "users" },
    { id: "/teachers", label: "Teachers", icon: "user" },
    { id: "/classrooms", label: "Classrooms", icon: "grid" },
    { id: "/feed", label: "Homework & Announcements", icon: "inbox" },
    { id: "/calendar", label: "Calendar", icon: "calendar" }
  ];
  var Sidebar = ({ currentRoute, onNavigate, notifCount, sidebarOpen, onClose, currentUser, latestAttendance }) => {
    const user = currentUser || Auth.getUser();
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: `sidebar-overlay ${sidebarOpen ? "visible" : ""}`, onClick: onClose }), /* @__PURE__ */ React.createElement("aside", { className: `sidebar ${sidebarOpen ? "open" : ""}` }, /* @__PURE__ */ React.createElement("div", { className: "sidebar-header" }, /* @__PURE__ */ React.createElement("img", { src: "./assets/logo.png", alt: "Logo", className: "sidebar-logo" }), /* @__PURE__ */ React.createElement("div", { className: "sidebar-brand" }, /* @__PURE__ */ React.createElement("span", { className: "sidebar-brand-name" }, "Parramatta Arabic School"), /* @__PURE__ */ React.createElement("span", { className: "sidebar-brand-sub" }, "Staff Portal"))), /* @__PURE__ */ React.createElement("nav", { className: "sidebar-nav" }, /* @__PURE__ */ React.createElement("div", { className: "sidebar-section-label" }, "Main"), navItems.map((item) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: item.id,
        className: `sidebar-item ${currentRoute === item.id ? "active" : ""}`,
        onClick: () => {
          onNavigate(item.id);
          onClose();
        }
      },
      /* @__PURE__ */ React.createElement(Icon, { name: item.icon, size: 20 }),
      /* @__PURE__ */ React.createElement("span", null, item.label),
      item.id === "/notifications" && notifCount > 0 && /* @__PURE__ */ React.createElement("span", { className: "nav-badge" }, notifCount > 99 ? "99+" : notifCount)
    )), /* @__PURE__ */ React.createElement("div", { className: "sidebar-divider" }), /* @__PURE__ */ React.createElement("div", { className: "sidebar-section-label" }, "Account"), /* @__PURE__ */ React.createElement(
      "div",
      {
        className: `sidebar-item ${currentRoute === "/profile" ? "active" : ""}`,
        onClick: () => {
          onNavigate("/profile");
          onClose();
        }
      },
      /* @__PURE__ */ React.createElement(Icon, { name: "settings", size: 20 }),
      /* @__PURE__ */ React.createElement("span", null, "My Profile")
    )), /* @__PURE__ */ React.createElement("div", { className: "sidebar-footer" }, /* @__PURE__ */ React.createElement("div", { className: "sidebar-attendance-bar" }, /* @__PURE__ */ React.createElement("div", { className: "sidebar-attendance-icon" }, /* @__PURE__ */ React.createElement(Icon, { name: "calendar", size: 16, style: { color: latestAttendance?.type?.toLowerCase().includes("absent") ? "#dc2626" : "#50AC55" } })), /* @__PURE__ */ React.createElement("div", { className: "sidebar-attendance-info" }, /* @__PURE__ */ React.createElement("div", { className: "sidebar-attendance-type" }, latestAttendance?.type || "No record"), /* @__PURE__ */ React.createElement("div", { className: "sidebar-attendance-date" }, latestAttendance ? formatDateShort(latestAttendance.date) || formatDate(latestAttendance.date) : "\u2014"), latestAttendance?.note && /* @__PURE__ */ React.createElement("div", { className: "sidebar-attendance-note", style: { fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: 2, fontStyle: "italic", wordBreak: "break-word", whiteSpace: "normal", lineHeight: 1.2 } }, latestAttendance.note))), /* @__PURE__ */ React.createElement("div", {
      className: "sidebar-user", onClick: () => {
        onNavigate("/profile");
        onClose();
      }
    }, /* @__PURE__ */ React.createElement(Avatar, { name: user?.name, photoUrl: user?.photoUrl || user?.photo || user?.Photo, id: user?.id, size: 36, className: "sidebar-avatar" }), /* @__PURE__ */ React.createElement("div", { className: "sidebar-user-info" }, /* @__PURE__ */ React.createElement("div", { className: "sidebar-user-name" }, user?.name || "Teacher"), /* @__PURE__ */ React.createElement("div", { className: "sidebar-user-role" }, user?.category || user?.role || "Staff"))))));
  };
  var TopBar = ({ title, onHamburger, notifCount, onNavigate, searchQuery, onSearchChange, onSearchClear, searchResults, searchLoading, currentUser, showGlobalSearch }) => {
    const user = currentUser || Auth.getUser();
    const [showDropdown, setShowDropdown] = useState(false);
    const searchRef = useRef(null);
    useEffect(() => {
      const handler = (e) => {
        if (searchRef.current && !searchRef.current.contains(e.target)) setShowDropdown(false);
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, []);
    const hasResults = searchResults && (searchResults.students?.length || searchResults.users?.length || searchResults.classrooms?.length);
    return /* @__PURE__ */ React.createElement("div", { className: "topbar" }, /* @__PURE__ */ React.createElement("button", { className: "topbar-hamburger", onClick: onHamburger }, /* @__PURE__ */ React.createElement(Icon, { name: "menu", size: 24 })), /* @__PURE__ */ React.createElement("h2", { className: "topbar-title" }, title), showGlobalSearch && /* @__PURE__ */ React.createElement("div", { className: "topbar-search", ref: searchRef }, /* @__PURE__ */ React.createElement("span", { className: "topbar-search-icon" }, /* @__PURE__ */ React.createElement(Icon, { name: "search", size: 16 })), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        placeholder: "Search students, teachers, classrooms\u2026",
        value: searchQuery,
        onChange: (e) => {
          onSearchChange(e.target.value);
          setShowDropdown(true);
        },
        onFocus: () => setShowDropdown(true)
      }
    ), showDropdown && searchQuery.trim() && /* @__PURE__ */ React.createElement("div", { className: "search-results-dropdown" }, searchLoading ? /* @__PURE__ */ React.createElement("div", { className: "loading-center", style: { padding: "1.5rem" } }, /* @__PURE__ */ React.createElement("div", { className: "spinner" })) : hasResults ? /* @__PURE__ */ React.createElement(React.Fragment, null, searchResults.students?.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "search-results-section" }, /* @__PURE__ */ React.createElement("div", { className: "search-results-label" }, "Students"), searchResults.students.slice(0, 5).map((s, i) => /* @__PURE__ */ React.createElement("div", {
      key: i, className: "search-result-item", onClick: () => {
        setShowDropdown(false);
        onSearchClear();
        navigate("/students");
      }
    }, /* @__PURE__ */ React.createElement(Avatar, { name: s.FullName || s.fullName, photoUrl: s.Photo || s.photo, id: s.Id || s.id, size: 32 }), /* @__PURE__ */ React.createElement("span", { className: "search-result-name" }, s.FullName || s.fullName || "Unknown"), /* @__PURE__ */ React.createElement("span", { className: `status-chip ${statusClass(s.Status || s.status)}` }, s.Status || s.status || "\u2014")))), searchResults.users?.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "search-results-section" }, /* @__PURE__ */ React.createElement("div", { className: "search-results-label" }, "Teachers"), searchResults.users.slice(0, 5).map((u, i) => {
      const name = `${u.FirstName || u.firstName || ""} ${u.LastName || u.lastName || ""}`.trim() || u.FullName || u.fullName || "Unknown";
      return /* @__PURE__ */ React.createElement("div", {
        key: i, className: "search-result-item", onClick: () => {
          setShowDropdown(false);
          onSearchClear();
          navigate("/teachers");
        }
      }, /* @__PURE__ */ React.createElement(Avatar, { name, photoUrl: u.Photo || u.photo, id: u.Id || u.id, size: 32 }), /* @__PURE__ */ React.createElement("span", { className: "search-result-name" }, name), /* @__PURE__ */ React.createElement("span", { className: `status-chip ${statusClass(u.Status || u.status)}` }, u.Status || u.status || "\u2014"));
    })), searchResults.classrooms?.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "search-results-section" }, /* @__PURE__ */ React.createElement("div", { className: "search-results-label" }, "Classrooms"), searchResults.classrooms.slice(0, 5).map((c, i) => /* @__PURE__ */ React.createElement("div", {
      key: i, className: "search-result-item", onClick: () => {
        setShowDropdown(false);
        onSearchClear();
        navigate("/classrooms");
      }
    }, /* @__PURE__ */ React.createElement(Avatar, { name: c.Name || c.name, id: c.Id || c.id, size: 32 }), /* @__PURE__ */ React.createElement("span", { className: "search-result-name" }, c.Name || c.name || "Unknown"))))) : /* @__PURE__ */ React.createElement("div", { className: "empty-state", style: { padding: "1.5rem" } }, /* @__PURE__ */ React.createElement("p", { className: "empty-state-msg" }, 'No results found for "', searchQuery, '"')))), /* @__PURE__ */ React.createElement("div", { className: "topbar-actions" }, /* @__PURE__ */ React.createElement(
      Avatar,
      {
        name: user?.name,
        photoUrl: user?.photoUrl || user?.photo || user?.Photo,
        id: user?.id,
        size: 36,
        className: "topbar-avatar",
        onClick: () => navigate("/profile")
      }
    )));
  };
  var SkeletonRow = ({ width = "100%", height = 14 }) => /* @__PURE__ */ React.createElement("div", { className: "skeleton skeleton-text", style: { width, height } });
  var SkeletonCard = ({ children }) => /* @__PURE__ */ React.createElement("div", { className: "skeleton-card" }, children);
  var TableSkeleton = ({ rows = 5, cols = 4 }) => /* @__PURE__ */ React.createElement("div", { className: "data-table-wrap" }, /* @__PURE__ */ React.createElement("table", { className: "data-table" }, /* @__PURE__ */ React.createElement("tbody", null, Array.from({ length: rows }).map((_, r) => /* @__PURE__ */ React.createElement("tr", { key: r }, Array.from({ length: cols }).map((_2, c) => /* @__PURE__ */ React.createElement("td", { key: c }, /* @__PURE__ */ React.createElement("div", { className: "skeleton skeleton-text", style: { width: `${60 + Math.random() * 30}%` } }))))))));
  var FeedPostSkeletonList = ({ count = 4 }) => /* @__PURE__ */ React.createElement("div", { className: "feed-list feed-list-skeleton" }, Array.from({ length: count }).map((_, i) => /* @__PURE__ */ React.createElement("div", { className: "card feed-post-card", key: `feed-skeleton-${i}` }, /* @__PURE__ */ React.createElement("div", { className: "card-body" }, /* @__PURE__ */ React.createElement("div", { className: "feed-post-head" }, /* @__PURE__ */ React.createElement("div", { className: "feed-post-author" }, /* @__PURE__ */ React.createElement("div", { className: "skeleton skeleton-circle", style: { width: 44, height: 44 } }), /* @__PURE__ */ React.createElement("div", { style: { minWidth: 180 } }, /* @__PURE__ */ React.createElement("div", { className: "skeleton skeleton-text", style: { width: 140 } }), /* @__PURE__ */ React.createElement("div", { className: "skeleton skeleton-text", style: { width: 210, height: 10 } }))), /* @__PURE__ */ React.createElement("div", { className: "skeleton", style: { width: 28, height: 28, borderRadius: 8 } })), /* @__PURE__ */ React.createElement("div", { className: "skeleton skeleton-text", style: { width: "58%", height: 18, marginTop: 14, marginInline: "auto" } }), /* @__PURE__ */ React.createElement("div", { className: "skeleton", style: { width: "100%", height: 170, borderRadius: 12, marginTop: 12 } }), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 12 } }, /* @__PURE__ */ React.createElement("div", { className: "skeleton skeleton-text", style: { width: "92%" } }), /* @__PURE__ */ React.createElement("div", { className: "skeleton skeleton-text", style: { width: "88%" } }), /* @__PURE__ */ React.createElement("div", { className: "skeleton skeleton-text", style: { width: "71%" } })), /* @__PURE__ */ React.createElement("div", { className: "feed-post-actions" }, /* @__PURE__ */ React.createElement("div", { className: "skeleton", style: { width: 84, height: 16, borderRadius: 8 } }), /* @__PURE__ */ React.createElement("div", { className: "skeleton", style: { width: 96, height: 16, borderRadius: 8 } }))))));
  var HomePage = () => {
    const [loading, setLoading] = useState(true);
    const [homeData, setHomeData] = useState(null);
    const [error, setError] = useState(null);
    const loadHome = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get("/api/myteacher", { params: { isHome: true } });
        if (res.status === 200 && res.data) setHomeData(res.data);
        else throw new Error(`Server returned ${res.status}`);
      } catch (e) {
        setError(e.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    };
    useEffect(() => {
      loadHome();
    }, []);
    if (loading) return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "stats-grid" }, Array.from({ length: 4 }).map((_, i) => /* @__PURE__ */ React.createElement(SkeletonCard, { key: i }, /* @__PURE__ */ React.createElement(SkeletonRow, { width: "50%" }), /* @__PURE__ */ React.createElement(SkeletonRow, { width: "30%", height: 28 }), /* @__PURE__ */ React.createElement(SkeletonRow, { width: "40%", height: 10 })))), /* @__PURE__ */ React.createElement(SkeletonCard, null, /* @__PURE__ */ React.createElement(SkeletonRow, { width: "30%" }), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 16, marginTop: 12 } }, Array.from({ length: 4 }).map((_, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "skeleton", style: { width: 200, height: 160, borderRadius: 12 } })))));
    if (error) return /* @__PURE__ */ React.createElement("div", { className: "empty-state" }, /* @__PURE__ */ React.createElement(Icon, { name: "alert-circle", size: 48 }), /* @__PURE__ */ React.createElement("p", { className: "empty-state-title" }, "Failed to load dashboard"), /* @__PURE__ */ React.createElement("p", { className: "empty-state-msg" }, error), /* @__PURE__ */ React.createElement("button", { className: "btn-primary", style: { width: "auto", marginTop: "1rem" }, onClick: loadHome }, "Retry"));
    const classrooms = homeData?.classrooms || [];
    const notifCount = homeData?.notificationCount || 0;
    const latest = homeData?.latestAttendance;
    const absCount = homeData?.AbsencesCount || 0;
    const quickButtons = [
      { label: "Students", icon: "users", route: "/students" },
      { label: "Teachers", icon: "user", route: "/teachers" },
      { label: "Classrooms", icon: "grid", route: "/classrooms" },
      { label: "Homework & Announcements", icon: "inbox", route: "/feed" },
      { label: "Calendar", icon: "calendar", route: "/calendar" },
      { label: "Absences", icon: "user-x", route: "/students", badge: absCount }
    ];
    const hiddenKeys = (() => {
      const keys = /* @__PURE__ */ new Set();
      const configKeys = homeData?.uhomeConfigKeys;
      if (Array.isArray(configKeys)) configKeys.forEach((k) => {
        if (k) keys.add(String(k).replace(/\s+/g, "").toLowerCase());
      });
      const cfg = homeData?.uhomeConfig;
      if (cfg) String(cfg).split(",").forEach((s) => {
        const n = s.replace(/\s+/g, "").toLowerCase();
        if (n) keys.add(n);
      });
      return keys;
    })();
    const visibleButtons = quickButtons.filter((b) => !hiddenKeys.has(b.label.replace(/\s+/g, "").toLowerCase()));
    return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "stats-grid" }, /* @__PURE__ */ React.createElement("div", { className: "stat-card" }, /* @__PURE__ */ React.createElement("div", { className: "stat-icon green" }, /* @__PURE__ */ React.createElement(Icon, { name: "grid", size: 24 })), /* @__PURE__ */ React.createElement("div", { className: "stat-info" }, /* @__PURE__ */ React.createElement("div", { className: "stat-label" }, "Classrooms"), /* @__PURE__ */ React.createElement("div", { className: "stat-value" }, classrooms.length))), /* @__PURE__ */ React.createElement("div", { className: "stat-card" }, /* @__PURE__ */ React.createElement("div", { className: "stat-icon amber" }, /* @__PURE__ */ React.createElement(Icon, { name: "user-x", size: 24 })), /* @__PURE__ */ React.createElement("div", { className: "stat-info" }, /* @__PURE__ */ React.createElement("div", { className: "stat-label" }, "Absences"), /* @__PURE__ */ React.createElement("div", { className: "stat-value" }, absCount))), /* @__PURE__ */ React.createElement("div", { className: "stat-card" }, /* @__PURE__ */ React.createElement("div", { className: "stat-icon purple" }, /* @__PURE__ */ React.createElement(Icon, { name: "check-circle", size: 24 })), /* @__PURE__ */ React.createElement("div", { className: "stat-info" }, /* @__PURE__ */ React.createElement("div", { className: "stat-label" }, "Attendance"), /* @__PURE__ */ React.createElement("div", { className: "stat-value" }, latest ? latest.type || "Present" : "\u2014")))), classrooms.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "card", style: { marginBottom: "1.5rem" } }, /* @__PURE__ */ React.createElement("div", { className: "card-header" }, /* @__PURE__ */ React.createElement("h3", null, "My Classrooms")), /* @__PURE__ */ React.createElement("div", { className: "card-body" }, /* @__PURE__ */ React.createElement("div", { className: "classroom-scroll" }, classrooms.map((c, i) => {
      const name = c.name || "Class";
      const photo = c.Photo || c.photo;
      const level = c.level || "";
      const count = c.count || c.Count || c.studentsCount || 0;
      return /* @__PURE__ */ React.createElement("div", { key: i, className: "classroom-card", onClick: () => navigate("/classrooms") }, /* @__PURE__ */ React.createElement("div", { className: "classroom-card-img" }, photo ? /* @__PURE__ */ React.createElement("img", {
        src: photo, alt: name, onError: (e) => {
          e.target.style.display = "none";
          e.target.parentElement.querySelector(".classroom-card-initials")?.style.removeProperty("display");
        }
      }) : null, /* @__PURE__ */ React.createElement("span", { className: "classroom-card-initials", style: photo ? { display: "none" } : {} }, initialsFromName(name)), /* @__PURE__ */ React.createElement("div", { className: "classroom-card-badges" }, level && /* @__PURE__ */ React.createElement("span", { className: "classroom-card-badge" }, /* @__PURE__ */ React.createElement(Icon, { name: "star", size: 10 }), " ", level), /* @__PURE__ */ React.createElement("span", { className: "classroom-card-badge" }, /* @__PURE__ */ React.createElement(Icon, { name: "user", size: 10 }), " ", count))), /* @__PURE__ */ React.createElement("div", { className: "classroom-card-body" }, /* @__PURE__ */ React.createElement("div", { className: "classroom-card-name" }, name)));
    })))), /* @__PURE__ */ React.createElement("div", { className: "card", style: { marginBottom: "1.5rem" } }, /* @__PURE__ */ React.createElement("div", { className: "card-header" }, /* @__PURE__ */ React.createElement("h3", null, "Quick Access")), /* @__PURE__ */ React.createElement("div", { className: "card-body" }, /* @__PURE__ */ React.createElement("div", { className: "quick-access-grid" }, visibleButtons.map((b, i) => /* @__PURE__ */ React.createElement("button", { key: i, className: "quick-access-btn", onClick: () => navigate(b.route) }, /* @__PURE__ */ React.createElement("div", { className: "quick-access-icon" }, /* @__PURE__ */ React.createElement(Icon, { name: b.icon, size: 22 }), b.badge > 0 && /* @__PURE__ */ React.createElement("span", { className: "qa-badge" }, b.badge > 99 ? "99+" : b.badge)), /* @__PURE__ */ React.createElement("span", { className: "quick-access-label" }, b.label)))))));
  };
  var AttendanceTab = ({ studentId }) => {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [editRecord, setEditRecord] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const formatLocal = (d) => {
      if (!d) return "";
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return "";
      const pad = (n) => String(n).padStart(2, "0");
      return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    };
    const [form, setForm] = useState({ Type: "Absent", Date: "", Note: "" });
    const [saving, setSaving] = useState(false);
    const loadRecords = async (reset = false) => {
      if (!studentId) return setLoading(false);
      const currentLoaded = reset ? 0 : records.length;
      if (reset) {
        setLoading(true);
        setHasMore(true);
      } else setLoadingMore(true);
      try {
        const res = await api.get("/api/studentAttendance/user", {
          params: { studentId, orderby: "date desc", l: currentLoaded }
        });
        let data = res.data?.data || res.data?.items || res.data || [];
        if (!Array.isArray(data)) data = [];
        if (reset) setRecords(data);
        else setRecords((prev) => [...prev, ...data]);
        setHasMore(data.length > 0);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };
    useEffect(() => {
      loadRecords(true);
    }, [studentId]);
    const handleScroll = (e) => {
      const bottom = e.target.scrollHeight - e.target.scrollTop <= e.target.clientHeight + 50;
      if (bottom && hasMore && !loadingMore) {
        loadRecords(false);
      }
    };
    const exportExcel = async () => {
      try {
        const res = await api.get("/api/studentAttendance/user/export", {
          params: { studentId, orderby: "date desc" },
          responseType: "blob"
        });
        const blob = new Blob([res.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `student_attendance_${(/* @__PURE__ */ new Date()).getTime()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (e) {
        try {
          const res = await api.get("/api/studentAttendance/export", {
            params: { filter: `StudentId eq '${studentId}'`, orderby: "date desc" },
            responseType: "blob"
          });
          const blob = new Blob([res.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `student_attendance_${(/* @__PURE__ */ new Date()).getTime()}.xlsx`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } catch (err) {
          alert("Failed to export: " + e.message);
        }
      }
    };
    const openCreate = () => {
      setForm({ Type: "Absent", Date: formatLocal(/* @__PURE__ */ new Date()), Note: "" });
      setIsCreating(true);
    };
    const openEdit = (rec) => {
      setForm({
        Type: rec.Type || "Absent",
        Date: rec.Date ? formatLocal(rec.Date) : formatLocal(/* @__PURE__ */ new Date()),
        Note: rec.Note || rec.NoteText || ""
      });
      setEditRecord(rec);
    };
    const handleSave = async () => {
      setSaving(true);
      try {
        const dateUtc = new Date(form.Date).toISOString();
        if (isCreating) {
          await api.post("/api/studentAttendance/user", {
            StudentId: studentId,
            Type: form.Type,
            Date: dateUtc,
            Note: form.Note
          });
        } else if (editRecord) {
          await api.patch("/api/studentAttendance/user", {
            Id: editRecord.Id || editRecord.id,
            Type: form.Type,
            Date: dateUtc,
            Note: form.Note
          });
        }
        setIsCreating(false);
        setEditRecord(null);
        loadRecords(true);
      } catch (e) {
        alert("Failed to save attendance: " + e.message);
      } finally {
        setSaving(false);
      }
    };
    const handleDelete = async (id) => {
      if (!window.confirm("Delete this attendance record?")) return;
      try {
        await api.delete(`/api/studentAttendance/user/${id}`);
        loadRecords(true);
      } catch (e) {
        alert("Delete failed: " + e.message);
      }
    };
    if (loading) return /* @__PURE__ */ React.createElement("div", { style: { padding: 24 } }, "Loading attendance...");
    return /* @__PURE__ */ React.createElement("div", null, (isCreating || editRecord) && /* @__PURE__ */ React.createElement(GlobalCanvasPortal, null, /* @__PURE__ */ React.createElement("div", {
      className: "modal-overlay", onClick: () => {
        setIsCreating(false);
        setEditRecord(null);
      }
    }, /* @__PURE__ */ React.createElement("div", { className: "modal-box", onClick: (e) => e.stopPropagation(), style: { maxWidth: 450, width: "100%" } }, /* @__PURE__ */ React.createElement("div", { className: "modal-title" }, isCreating ? "Add Attendance" : "Edit Attendance"), /* @__PURE__ */ React.createElement("div", { className: "modal-body", style: { display: "flex", flexDirection: "column", gap: 16 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Type"), /* @__PURE__ */ React.createElement("select", { className: "form-input", value: form.Type, onChange: (e) => setForm({ ...form, Type: e.target.value }) }, /* @__PURE__ */ React.createElement("option", { value: "Absent" }, "Absent"), /* @__PURE__ */ React.createElement("option", { value: "Present" }, "Present"), /* @__PURE__ */ React.createElement("option", { value: "Excused" }, "Excused"))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Date"), /* @__PURE__ */ React.createElement("input", { type: "datetime-local", className: "form-input", value: form.Date, onChange: (e) => setForm({ ...form, Date: e.target.value }) })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Note"), /* @__PURE__ */ React.createElement("input", { className: "form-input", value: form.Note, onChange: (e) => setForm({ ...form, Note: e.target.value }) }))), /* @__PURE__ */ React.createElement("div", { className: "modal-actions" }, /* @__PURE__ */ React.createElement("button", {
      className: "btn btn-secondary", onClick: () => {
        setIsCreating(false);
        setEditRecord(null);
      }
    }, "Cancel"), /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: handleSave, disabled: saving }, saving ? "Saving..." : "Save Record"))))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 } }, /* @__PURE__ */ React.createElement("h3", { style: { margin: 0, display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement(Icon, { name: "calendar", size: 24, color: "var(--color-primary)" }), " Attendance Records"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", onClick: exportExcel }, /* @__PURE__ */ React.createElement(Icon, { name: "grid", size: 16 }), " Export Excel"), /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: openCreate }, /* @__PURE__ */ React.createElement(Icon, { name: "plus", size: 16 }), " Add Record"))), records.length === 0 && !loadingMore ? /* @__PURE__ */ React.createElement("div", { className: "empty-state", style: { background: "#fff", padding: 48, borderRadius: 8, border: "1px dashed var(--color-border)" } }, /* @__PURE__ */ React.createElement(Icon, { name: "calendar", size: 48 }), /* @__PURE__ */ React.createElement("p", { style: { marginTop: 16, fontSize: "1.1rem" } }, "No attendance records found.")) : /* @__PURE__ */ React.createElement("div", { className: "data-table-wrap", style: { background: "#fff", borderRadius: 8, border: "1px solid var(--color-border)", maxHeight: 400, overflowY: "auto" }, onScroll: handleScroll }, /* @__PURE__ */ React.createElement("table", { className: "data-table", style: { position: "relative" } }, /* @__PURE__ */ React.createElement("thead", { style: { position: "sticky", top: 0, background: "#fff", zIndex: 1, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" } }, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Date"), /* @__PURE__ */ React.createElement("th", null, "Type"), /* @__PURE__ */ React.createElement("th", null, "Note"), /* @__PURE__ */ React.createElement("th", null, "Excuse"), /* @__PURE__ */ React.createElement("th", null, "Actions"))), /* @__PURE__ */ React.createElement("tbody", null, records.map((rec, i) => {
      const id = rec.Id || rec.id;
      const dateStr = rec.Date ? new Date(rec.Date).toLocaleString() : "";
      return /* @__PURE__ */ React.createElement("tr", { key: `${id}-${i}` }, /* @__PURE__ */ React.createElement("td", null, dateStr), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("span", { className: `status-chip ${rec.Type?.toLowerCase()}` }, rec.Type)), /* @__PURE__ */ React.createElement("td", null, rec.Note || rec.NoteText || "-"), /* @__PURE__ */ React.createElement("td", null, rec.Excuse || rec.ExcuseText || "-"), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 12 } }, /* @__PURE__ */ React.createElement(Icon, { name: "edit-2", size: 16, color: "var(--color-primary)", style: { cursor: "pointer" }, onClick: () => openEdit(rec) }), /* @__PURE__ */ React.createElement(Icon, { name: "trash-2", size: 16, color: "red", style: { cursor: "pointer" }, onClick: () => handleDelete(id) }))));
    }))), loadingMore && /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "16px 0", color: "var(--color-text-muted)", fontSize: "0.9rem" } }, /* @__PURE__ */ React.createElement("div", { className: "spinner", style: { width: 16, height: 16, marginRight: 8, borderWidth: 2, display: "inline-block", verticalAlign: "middle" } }), " Loading more..."), !hasMore && records.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "16px 0", color: "var(--color-text-muted)", fontSize: "0.85rem" } }, "End of records")));
  };
  var InvoicesTab = ({ studentId, studentCode, studentRow }) => {
    const [invoices, setInvoices] = useState([]);
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [mode, setMode] = useState("list");
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const loadData = async () => {
      if (!studentId) return setLoading(false);
      setLoading(true);
      try {
        const res = await api.get("/api/account", { params: { studentId } });
        const data = res.data;
        if (data?.accounts?.[0]) {
          setBalance(data.accounts[0].Balance || data.accounts[0].balance || 0);
        } else {
          setBalance(0);
        }
        const invs = data?.invoices?.list || [];
        setInvoices(invs);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    useEffect(() => {
      loadData();
    }, [studentId]);
    const handleDelete = async (id) => {
      if (!window.confirm("Delete this invoice?")) return;
      try {
        await api.delete(`/api/invoice/${id}`);
        loadData();
      } catch (e) {
        alert("Delete failed: " + e.message);
      }
    };
    if (loading) return /* @__PURE__ */ React.createElement("div", { style: { padding: 24 } }, "Loading invoices...");
    return /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "minmax(400px, 1.2fr) minmax(300px, 1fr)", gap: 48, alignItems: "start" } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 } }, /* @__PURE__ */ React.createElement(Icon, { name: "dollar-sign", size: 28, color: "var(--color-primary)" }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { style: { margin: 0, fontSize: "1.25rem" } }, "Balance: $", Number(balance).toFixed(2)))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 16 } }, invoices.length === 0 ? /* @__PURE__ */ React.createElement("p", { style: { color: "var(--color-text-light)" } }, "No invoices generated yet.") : invoices.map((inv, i) => {
      const invBal = inv.balance || inv.Balance || 0;
      const invTot = inv.totalAmount || inv.TotalAmount || 0;
      const invId = inv.id || inv.uuid || inv.Id;
      return /* @__PURE__ */ React.createElement("div", { key: invId, style: { position: "relative", padding: 16, background: "#fff", borderRadius: 8, borderLeft: invBal > 0 ? "5px solid #d32f2f" : "5px solid #50AC55", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" } }, /* @__PURE__ */ React.createElement("h4", { style: { margin: "0 0 8px 0" } }, "#", inv.invoiceNumber || inv.number || ""), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, /* @__PURE__ */ React.createElement(Icon, {
        name: "edit-2", size: 16, color: "var(--color-text-muted)", style: { cursor: "pointer" }, onClick: () => {
          setSelectedInvoice(inv);
          setMode("edit");
        }
      }), invBal > 0 && /* @__PURE__ */ React.createElement(Icon, {
        name: "credit-card", size: 16, color: "var(--color-primary)", style: { cursor: "pointer" }, onClick: () => {
          setSelectedInvoice(inv);
          setMode("payment");
        }
      }), Math.abs(invBal - invTot) < 1e-3 && /* @__PURE__ */ React.createElement(Icon, { name: "trash-2", size: 16, color: "red", style: { cursor: "pointer" }, onClick: () => handleDelete(invId) }))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "0.85rem", color: "var(--color-text-muted)", lineHeight: "1.6" } }, "Issued on: ", new Date(inv.invoiceDate || inv.InvoiceDate).toLocaleDateString(), /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("span", { style: { color: "var(--color-text)" } }, "Total amount: $", Number(invTot).toFixed(2)), /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("span", { style: { color: invBal > 0 ? "#d32f2f" : "var(--color-text)" } }, "Current Balance: $", Number(invBal).toFixed(2))));
    }))), /* @__PURE__ */ React.createElement("div", null, mode === "edit" ? /* @__PURE__ */ React.createElement(
      InvoiceEditorView,
      {
        invoiceUuid: selectedInvoice?.uuid || selectedInvoice?.id || selectedInvoice?.Id,
        studentId,
        studentCode,
        studentRow,
        onCancel: () => {
          setMode("list");
          setSelectedInvoice(null);
        },
        onSuccess: () => {
          setMode("list");
          setSelectedInvoice(null);
          loadData();
        }
      }
    ) : mode === "payment" && selectedInvoice ? /* @__PURE__ */ React.createElement(
      PaymentForm,
      {
        invoice: selectedInvoice,
        studentId,
        onCancel: () => {
          setMode("list");
          setSelectedInvoice(null);
        },
        onSuccess: () => {
          setMode("list");
          setSelectedInvoice(null);
          loadData();
        }
      }
    ) : /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", padding: 24, borderRadius: 12, border: "1px solid var(--color-border)" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 } }, /* @__PURE__ */ React.createElement("h3", { style: { margin: 0, display: "flex", alignItems: "center", gap: 8, color: "var(--color-text)" } }, /* @__PURE__ */ React.createElement(Icon, { name: "file-text", size: 20, color: "var(--color-primary)" }), " Quick Actions")), /* @__PURE__ */ React.createElement("button", {
      className: "btn btn-primary", onClick: () => {
        setSelectedInvoice(null);
        setMode("edit");
      }, style: { width: "100%", padding: 12 }
    }, "Create New Invoice"))));
  };
  var PaymentForm = ({ invoice, studentId, onCancel, onSuccess }) => {
    const defaultAmount = invoice.balance || invoice.Balance || 0;
    const [amount, setAmount] = useState(defaultAmount.toString());
    const [ledger, setLedger] = useState("7a3fd737-4876-4b20-bd47-a7fed9cb024b");
    const [loading, setLoading] = useState(false);
    const submit = async () => {
      setLoading(true);
      try {
        await api.post("/api/payments/cash", {
          ledger_account_id: ledger,
          amount: parseFloat(amount),
          invoice_uuid: invoice.uuid || invoice.id || invoice.Id,
          studentid: studentId
        });
        alert("Payment accepted successfully!");
        onSuccess();
      } catch (e) {
        alert("Payment error: " + e.message);
      } finally {
        setLoading(false);
      }
    };
    return /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", padding: 24, borderRadius: 8, border: "1px solid var(--color-border)" } }, /* @__PURE__ */ React.createElement("h3", { style: { marginTop: 0 } }, "Accept Payment for #", invoice.invoiceNumber || invoice.InvoiceNumber || invoice.number), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 16, flexDirection: "column", maxWidth: 400 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Ledger Account"), /* @__PURE__ */ React.createElement("select", { className: "form-input", value: ledger, onChange: (e) => setLedger(e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "7a3fd737-4876-4b20-bd47-a7fed9cb024b" }, "Cash: Haitham"), /* @__PURE__ */ React.createElement("option", { value: "c4e6511e-4457-4f22-81e0-384609bc7784" }, "Cash: Ibrahim"), /* @__PURE__ */ React.createElement("option", { value: "91ba88a9-558a-48b7-b6f2-ac0b6a23b03e" }, "EFTPOS"))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Amount (Max $", Number(defaultAmount).toFixed(2), ")"), /* @__PURE__ */ React.createElement("input", { type: "number", className: "form-input", value: amount, onChange: (e) => setAmount(e.target.value), max: defaultAmount })), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 12, marginTop: 12 } }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: submit, disabled: loading }, loading ? "Processing..." : "Accept Payment"), /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", onClick: onCancel, disabled: loading }, "Cancel"))));
  };
  var InvoiceEditorView = ({ invoiceUuid, studentId, studentCode, studentRow, onCancel, onSuccess }) => {
    const isCreate = !invoiceUuid;
    const [loading, setLoading] = useState(!isCreate);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [invoiceData, setInvoiceData] = useState(null);
    const [reckonItems, setReckonItems] = useState([]);
    const [loadingReckonItems, setLoadingReckonItems] = useState(false);
    const [showAddItemDropdown, setShowAddItemDropdown] = useState(false);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [invoiceDate, setInvoiceDate] = useState((/* @__PURE__ */ new Date()).toISOString().substring(0, 10));
    const [dueDate, setDueDate] = useState("");
    const [reference, setReference] = useState(studentCode || "");
    const [sendImmediately, setSendImmediately] = useState(true);
    const [initialForm, setInitialForm] = useState(null);
    const [lineItems, setLineItems] = useState([]);
    const [deletedLineItems, setDeletedLineItems] = useState([]);
    const amountTaxStatusInclusive = "Inclusive";
    const paymentTermsId = "46a7f844-9ba9-4fa2-a243-5000d69dd356";
    const accountsReceivableLedgerAccountId = "e65dc27a-51c8-48a2-9c3a-2aa786f54eb4";
    const templateId = "b92a011a-b9a0-4cd3-9514-19844bbd86fa";
    const defaultTaxRate = "GST";
    const paymentDetails = "Bank Details\nName: Parramatta Arabic School Incorporated\nBSB: 062-223 | Account: 1139 8670";
    const getLineNumber = (li) => {
      const v = li.lineNumber || li.linenumber || li.LineNumber;
      if (typeof v === "number") return v;
      const p = parseInt(v, 10);
      return isNaN(p) ? null : p;
    };
    const getItemId = (li) => {
      const id = li.itemDetails?.item?.id || li.itemDetails?.item?.uuid || li.itemDetails?.item?.itemId || li.item?.id || li.item?.uuid || li.item?.itemId || (typeof li.itemDetails?.item === "string" ? li.itemDetails.item : typeof li.item === "string" ? li.item : null);
      return typeof id === "string" && id.trim() ? id.trim() : null;
    };
    const getLineItemId = (li) => {
      let v = li.lineId || li.LineId || li.lineItemId || li.LineItemId || li.lineItemUuid || li.uuid || li.id || li.Id;
      if (!v && (li.line || li.lineItem || li.itemDetails)) {
        const nested = li.line || li.lineItem || li.itemDetails;
        v = nested.lineId || nested.LineId || nested.lineItemId || nested.LineItemId || nested.uuid || nested.id || nested.Id;
      }
      const s = (v || "").toString().trim();
      return s.toLowerCase() === "null" || s === "" ? null : s;
    };
    const getDiscountFraction = (discountPercent) => {
      if (discountPercent == null) return null;
      let p = parseFloat(discountPercent);
      if (isNaN(p)) return null;
      const fraction = p > 1 ? p / 100 : p;
      if (Math.abs(fraction - 0.05) < 1e-4) return 0.05;
      if (Math.abs(fraction - 0.1) < 1e-4) return 0.1;
      if (Math.abs(fraction - 0.25) < 1e-4) return 0.25;
      return fraction;
    };
    useEffect(() => {
      const load = async () => {
        if (isCreate) {
          if (studentRow?.code) {
            setReference(studentRow.code);
          }
          setLineItems([]);
          return;
        }
        try {
          setLoading(true);
          const res = await api.get(`/api/invoice/${invoiceUuid}`);
          const inv = res.data;
          setInvoiceData(inv);
          const iDate = inv.invoiceDate ? inv.invoiceDate.substring(0, 10) : "";
          const dDate = inv.dueDate ? inv.dueDate.substring(0, 10) : "";
          const ref = inv.reference || "";
          setInvoiceDate(iDate);
          setDueDate(dDate);
          setReference(ref);
          setInitialForm({ invoiceDate: iDate, dueDate: dDate, reference: ref });
          let extractedLineItems = [];
          const candidates = ["lineItems", "lines", "items", "LineItems", "invoiceLineItems", "line_items", "results", "data"];
          for (const key of candidates) {
            if (Array.isArray(inv[key])) {
              extractedLineItems = inv[key];
              break;
            }
          }
          if (extractedLineItems.length === 0 && (inv.invoice || inv.data || inv.result)) {
            const nested = inv.invoice || inv.data || inv.result;
            if (Array.isArray(nested)) extractedLineItems = nested;
            else if (nested && Array.isArray(nested.items)) extractedLineItems = nested.items;
          }
          let fallbackLineNumber = 1;
          const parsedLines = extractedLineItems.map((raw) => {
            const ln = getLineNumber(raw) || fallbackLineNumber++;
            const itemId = getItemId(raw);
            const lineItemId = getLineItemId(raw);
            let desc = (raw.description || "").toString().trim();
            if (!desc && raw.itemDetails?.item?.name) desc = raw.itemDetails.item.name;
            let qty = 1;
            if (raw.itemDetails?.quantity) qty = parseFloat(raw.itemDetails.quantity) || 1;
            else if (raw.accountDetails?.quantity) qty = parseFloat(raw.accountDetails.quantity) || 1;
            let amount = 0;
            if (raw.itemDetails?.price) amount = parseFloat(raw.itemDetails.price) || 0;
            let discFraction = getDiscountFraction(raw.itemDetails?.discountPercent);
            return {
              internalId: Date.now() + Math.random(),
              isFromInvoice: true,
              lineItemId,
              lineNumber: ln,
              itemId,
              description: desc || "-",
              quantity: qty,
              amount,
              discount: discFraction,
              // store initial state
              initialItemId: itemId,
              initialDescription: desc || "-",
              initialQuantity: qty,
              initialAmount: amount,
              initialDiscount: discFraction
            };
          });
          setLineItems(parsedLines);
          setDeletedLineItems([]);
        } catch (e) {
          console.error(e);
          setError("Failed to load invoice");
        } finally {
          setLoading(false);
        }
      };
      load();
    }, [isCreate, invoiceUuid, studentRow]);
    const loadReckonItems = async () => {
      if (reckonItems.length > 0 || loadingReckonItems) return;
      try {
        setLoadingReckonItems(true);
        const res = await api.get("/api/ReckonItems");
        const data = res.data;
        const list = Array.isArray(data) ? data : data.list || data.data || data.items || [];
        setReckonItems(list);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingReckonItems(false);
      }
    };
    const handleAddReckonItem = (item) => {
      const desc = item.sale?.description || item.fullName || item.name || "-";
      const price = parseFloat(item.sale?.priceGross || item.sale?.price || 0);
      let maxLn = 0;
      lineItems.forEach((li) => {
        if (li.lineNumber > maxLn) maxLn = li.lineNumber;
      });
      setLineItems([...lineItems, {
        internalId: Date.now() + Math.random(),
        isFromInvoice: false,
        lineItemId: null,
        lineNumber: maxLn + 1,
        itemId: item.id || "",
        description: desc,
        quantity: 1,
        amount: price,
        discount: null,
        initialItemId: item.id || "",
        initialDescription: desc,
        initialQuantity: 1,
        initialAmount: price,
        initialDiscount: null
      }]);
      setShowAddItemDropdown(false);
    };
    const updateLine = (internalId, field, val) => {
      setLineItems(lineItems.map((l) => l.internalId === internalId ? { ...l, [field]: val } : l));
    };
    const removeLine = (internalId) => {
      const line = lineItems.find((l) => l.internalId === internalId);
      if (!line) return;
      if (line.isFromInvoice && line.lineItemId) {
        setDeletedLineItems([...deletedLineItems, line.lineItemId]);
      }
      setLineItems(lineItems.filter((l) => l.internalId !== internalId));
    };
    const calculateTotal = () => {
      let t = 0;
      lineItems.forEach((l) => {
        const q = parseFloat(l.quantity || 0);
        const a = parseFloat(l.amount || 0);
        const d = l.discount || 0;
        const lineTotal = (q < 0 ? 0 : q) * (a < 0 ? 0 : a);
        t += lineTotal * (1 - d);
      });
      return t;
    };
    const totalAmount = calculateTotal();
    const getDiscountPercentForApi = (fraction) => {
      if (fraction == null || fraction <= 0) return 0;
      if (Math.abs(fraction - 0.05) < 1e-6) return 5;
      if (Math.abs(fraction - 0.1) < 1e-6) return 10;
      if (Math.abs(fraction - 0.25) < 1e-6) return 25;
      if (fraction > 1) return Math.min(100, Math.max(0, Math.round(fraction)));
      return Math.min(100, Math.max(0, Math.round(fraction * 100)));
    };
    const isLineRowChanged = (row) => {
      if (Math.abs(parseFloat(row.quantity || 0) - row.initialQuantity) > 1e-4) return true;
      if (Math.abs(parseFloat(row.amount || 0) - row.initialAmount) > 1e-4) return true;
      if ((row.discount || null) !== (row.initialDiscount || null)) return true;
      if ((row.itemId || "") !== (row.initialItemId || "")) return true;
      if (row.description.trim() !== row.initialDescription.trim()) return true;
      return false;
    };
    const isLocked = !isCreate && invoiceData && parseFloat(invoiceData.balance || invoiceData.Balance || 0) < parseFloat(invoiceData.totalAmount || invoiceData.TotalAmount || 0);
    const handleSave = async () => {
      if (lineItems.length === 0) return alert("Please add at least one line item.");
      if (lineItems.some((l) => !l.itemId || l.itemId.trim() === "")) return alert("Some line items are missing an item id. Please re-add the item.");
      if (lineItems.some((l) => parseFloat(l.quantity || 0) <= 0 || parseFloat(l.amount || 0) < 0)) return alert("Please enter valid quantity/amount for all line items.");
      setSaving(true);
      try {
        if (isCreate) {
          const customerId = studentRow?.ReckonId || studentRow?.reckonCustomerId || studentRow?.reckon_customer_id || studentRow?.customer || studentRow?.customerId;
          if (!customerId) throw new Error("Missing Reckon customer id for this student.");
          const nowUtc = invoiceDate ? new Date(invoiceDate).toISOString() : (/* @__PURE__ */ new Date()).toISOString();
          let fallbackLn = 1;
          const apiLines = lineItems.map((row) => ({
            lineNumber: row.lineNumber || fallbackLn++,
            serviceDate: null,
            project: null,
            itemDetails: {
              item: row.itemId,
              price: parseFloat(row.amount).toFixed(2) * 1,
              quantity: parseFloat(row.quantity).toFixed(2) * 1,
              discountPercent: getDiscountPercentForApi(row.discount)
            },
            description: row.description,
            taxRate: defaultTaxRate
          }));
          const payload = {
            customer: customerId,
            invoiceDate: nowUtc,
            amountTaxStatus: amountTaxStatusInclusive,
            paymentTerms: paymentTermsId,
            reference,
            accountsReceivableLedgerAccount: accountsReceivableLedgerAccountId,
            template: templateId,
            includeInInvoiceReminders: true,
            paymentDetails,
            sendImmediately,
            lineItems: apiLines
          };
          await api.post("/api/invoice", payload);
          onSuccess();
        } else {
          const invoicePatch = {};
          if (invoiceDate !== initialForm.invoiceDate) {
            invoicePatch.invoiceDate = invoiceDate ? new Date(invoiceDate).toISOString() : null;
          }
          if (dueDate !== initialForm.dueDate) {
            invoicePatch.dueDate = dueDate ? new Date(dueDate).toISOString() : null;
          }
          if (reference.trim() !== initialForm.reference.trim()) {
            invoicePatch.reference = reference.trim();
          }
          const linesPayload = [];
          for (const delId of deletedLineItems) {
            if (delId) linesPayload.push({ action: "delete", lineItemId: delId });
          }
          let fallbackLn = 1;
          for (const row of lineItems) {
            const itemId = (row.itemId || "").trim();
            const ln = row.lineNumber || fallbackLn++;
            const qty = parseFloat(row.quantity || 0);
            const price = parseFloat(row.amount || 0);
            const hasExistingId = (row.lineItemId || "").trim().length > 0;
            if (row.isFromInvoice && !isLineRowChanged(row)) continue;
            if (!row.isFromInvoice) {
              linesPayload.push({
                action: "create",
                lineNumber: ln,
                itemDetails: {
                  item: itemId,
                  price: parseFloat(price.toFixed(2)),
                  quantity: parseFloat(qty.toFixed(2)),
                  discountPercent: getDiscountPercentForApi(row.discount)
                },
                description: row.description,
                taxRate: defaultTaxRate
              });
              continue;
            }
            if (!hasExistingId) continue;
            const patch = { action: "patch", lineItemId: row.lineItemId };
            const itemDetailsPatch = {};
            if (Math.abs(qty - row.initialQuantity) > 1e-4) itemDetailsPatch.quantity = parseFloat(qty.toFixed(2));
            if (Math.abs(price - row.initialAmount) > 1e-4) itemDetailsPatch.price = parseFloat(price.toFixed(2));
            const discNow = getDiscountPercentForApi(row.discount);
            const discInitial = getDiscountPercentForApi(row.initialDiscount);
            if (discNow !== discInitial) itemDetailsPatch.discountPercent = discNow;
            if (itemId !== row.initialItemId) itemDetailsPatch.item = itemId;
            if (Object.keys(itemDetailsPatch).length > 0) patch.itemDetails = itemDetailsPatch;
            if (row.description.trim() !== row.initialDescription.trim()) patch.description = row.description.trim();
            if (Object.keys(patch).length > 2) linesPayload.push(patch);
          }
          if (Object.keys(invoicePatch).length === 0 && linesPayload.length === 0) {
            return alert("No changes to save.");
          }
          const payload = {
            invoice: invoicePatch,
            lines: linesPayload
          };
          await api.patch(`/api/invoice/${invoiceUuid}`, payload);
          onSuccess();
        }
      } catch (e) {
        console.error(e);
        alert((isCreate ? "Creating" : "Updating") + " invoice failed.");
      } finally {
        setSaving(false);
      }
    };
    return /* @__PURE__ */ React.createElement("div", { style: { background: "#fff", padding: 32, borderRadius: 12, border: "1px solid var(--color-border)" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 } }, /* @__PURE__ */ React.createElement("h3", { style: { margin: 0, display: "flex", alignItems: "center", gap: 12 } }, isCreate ? "New Invoice" : `Invoice ${invoiceData?.invoiceNumber ? "#" + invoiceData.invoiceNumber : ""}`, isLocked && /* @__PURE__ */ React.createElement("span", { style: { fontSize: "0.8rem", padding: "4px 8px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 4, color: "#dc2626", fontWeight: 600 } }, /* @__PURE__ */ React.createElement(Icon, { name: "lock", size: 12, style: { verticalAlign: "-1px", marginRight: 4 } }), " PAID / PARTIAL")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 12 } }, !isCreate && /* @__PURE__ */ React.createElement("button", {
      className: "btn btn-secondary", style: { display: "flex", alignItems: "center", gap: 8 }, onClick: () => {
        api.get(`/api/getInvoice/${invoiceUuid}/view`).then((r) => {
          const docs = Array.isArray(r.data) ? r.data : [r.data];
          const url = docs[0]?.document || docs[0]?.url;
          if (url) setPdfUrl(toAbsoluteAssetUrl(url));
          else alert("PDF not available");
        }).catch((e) => alert("Failed to fetch PDF."));
      }
    }, /* @__PURE__ */ React.createElement(Icon, { name: "external-link", size: 16 }), " Open as PDF"), /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", onClick: onCancel, disabled: saving }, "Back to List"))), loading ? /* @__PURE__ */ React.createElement("div", { style: { padding: 24 } }, /* @__PURE__ */ React.createElement(TableSkeleton, { rows: 4, cols: 1 })) : error ? /* @__PURE__ */ React.createElement("div", { className: "empty-state" }, /* @__PURE__ */ React.createElement(Icon, { name: "alert-circle", size: 40 }), /* @__PURE__ */ React.createElement("p", { className: "empty-state-title" }, error)) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 24, marginBottom: 32 } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Invoice Date"), /* @__PURE__ */ React.createElement("input", { type: "date", className: "form-input", disabled: isLocked || saving, value: invoiceDate, onChange: (e) => setInvoiceDate(e.target.value) })), /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Due Date"), /* @__PURE__ */ React.createElement("input", { type: "date", className: "form-input", disabled: isLocked || saving, value: dueDate, onChange: (e) => setDueDate(e.target.value) })), /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Reference"), /* @__PURE__ */ React.createElement("input", { className: "form-input", disabled: isLocked || saving, value: reference, onChange: (e) => setReference(e.target.value) }))), /* @__PURE__ */ React.createElement("h4", { style: { margin: "0 0 16px 0", fontSize: "0.95rem", borderBottom: "1px solid var(--color-border)", paddingBottom: 8 } }, "Line Items"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "minmax(200px, 3fr) 100px 120px 120px 40px", gap: 16, fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 8 } }, /* @__PURE__ */ React.createElement("div", null, "Item Description"), /* @__PURE__ */ React.createElement("div", null, "Quantity"), /* @__PURE__ */ React.createElement("div", null, "Amount (ea)"), /* @__PURE__ */ React.createElement("div", null, "Discount"), /* @__PURE__ */ React.createElement("div", null)), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 } }, lineItems.map((l) => /* @__PURE__ */ React.createElement("div", { key: l.internalId, style: { display: "grid", gridTemplateColumns: "minmax(200px, 3fr) 100px 120px 120px 40px", gap: 16, alignItems: "center" } }, /* @__PURE__ */ React.createElement("input", { type: "text", disabled: isLocked || saving, className: "form-input", value: l.description, onChange: (e) => updateLine(l.internalId, "description", e.target.value) }), /* @__PURE__ */ React.createElement("input", { type: "number", disabled: isLocked || saving, className: "form-input", value: l.quantity, onChange: (e) => updateLine(l.internalId, "quantity", e.target.value), min: "1", step: "0.5" }), /* @__PURE__ */ React.createElement("input", { type: "number", disabled: isLocked || saving, className: "form-input", value: l.amount, onChange: (e) => updateLine(l.internalId, "amount", e.target.value) }), /* @__PURE__ */ React.createElement("select", { className: "form-input", disabled: isLocked || saving, value: l.discount || "", onChange: (e) => updateLine(l.internalId, "discount", e.target.value ? parseFloat(e.target.value) : null) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "0%"), /* @__PURE__ */ React.createElement("option", { value: "0.05" }, "5%"), /* @__PURE__ */ React.createElement("option", { value: "0.1" }, "10%"), /* @__PURE__ */ React.createElement("option", { value: "0.25" }, "25%")), /* @__PURE__ */ React.createElement(Icon, { name: "trash-2", size: 18, color: isLocked ? "#ccc" : "red", style: { cursor: isLocked ? "not-allowed" : "pointer", justifySelf: "center" }, onClick: () => !isLocked && removeLine(l.internalId) })))), /* @__PURE__ */ React.createElement("div", { style: { position: "relative", marginBottom: 24 } }, /* @__PURE__ */ React.createElement("button", {
      className: "btn btn-secondary", disabled: isLocked || saving, onClick: () => {
        loadReckonItems();
        setShowAddItemDropdown(!showAddItemDropdown);
      }
    }, /* @__PURE__ */ React.createElement(Icon, { name: "plus", size: 16 }), " Add Line Item"), showAddItemDropdown && /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", top: "100%", left: 0, marginTop: 8, background: "#fff", border: "1px solid var(--color-border)", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 100, width: 400, maxHeight: 300, overflowY: "auto" } }, loadingReckonItems ? /* @__PURE__ */ React.createElement("div", { style: { padding: 16, color: "var(--color-text-muted)", textAlign: "center" } }, "Loading items...") : reckonItems.map((item) => {
      const desc = item.sale?.description || item.fullName || item.name || "-";
      return /* @__PURE__ */ React.createElement("div", { key: item.id, style: { padding: "12px 16px", borderBottom: "1px solid var(--color-border-light)", cursor: "pointer" }, onClick: () => handleAddReckonItem(item) }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 600 } }, desc), item.sale?.priceGross && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "0.85rem", color: "var(--color-text-muted)", marginTop: 4 } }, "$", parseFloat(item.sale.priceGross).toFixed(2)));
    }))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", marginTop: 16, paddingBottom: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "1.4rem", fontWeight: "bold" } }, "Total: $", totalAmount.toFixed(2))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 24, borderTop: "1px solid var(--color-border)" } }, /* @__PURE__ */ React.createElement("label", { style: { display: "flex", alignItems: "center", gap: 8, cursor: isLocked ? "not-allowed" : "pointer" } }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", disabled: isLocked || saving, checked: sendImmediately, onChange: (e) => setSendImmediately(e.target.checked), style: { width: 18, height: 18 } }), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "0.9rem", color: isLocked ? "#999" : "var(--color-text)" } }, "Notify parents immediately (Create only)")), /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: handleSave, disabled: loading || saving || isLocked, style: { padding: "12px 32px" } }, saving ? "Saving..." : isCreate ? "Create Invoice" : "Update Invoice"))), pdfUrl && /* @__PURE__ */ React.createElement(PdfViewerModal, { url: pdfUrl, title: `Invoice #${invoiceData?.invoiceNumber || invoiceData?.number || ""}`, onClose: () => setPdfUrl(null) }));
  };
  var SiblingsParentsTab = ({ advancedData }) => {
    const parents = advancedData?.parents || [];
    const siblings = advancedData?.siblings || [];
    const getDisplayName = (p) => {
      const first = p.FirstName || p.First || p.first_name || p.first || "";
      const last = p.LastName || p.Last || p.last_name || p.last || "";
      const fullName = `${first} ${last}`.trim();
      return fullName || p.Name || p.name || "Unknown Parent";
    };
    const getInitials = (p) => {
      const first = p.FirstName || p.First || p.first_name || p.first || "";
      const last = p.LastName || p.Last || p.last_name || p.last || "";
      if (first && last) return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
      if (first) return first.substring(0, 2).toUpperCase();
      const n = p.Name || p.name || "P";
      return n.substring(0, 2).toUpperCase();
    };
    return /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 } }, /* @__PURE__ */ React.createElement(Icon, { name: "users", size: 24, color: "var(--color-primary)" }), /* @__PURE__ */ React.createElement("h3", { style: { margin: 0, color: "var(--color-text)" } }, "Parents")), parents.length > 0 ? parents.map((p, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { borderBottom: i === parents.length - 1 ? "none" : "1px solid var(--color-border)", paddingBottom: 16, marginBottom: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 16, alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { width: 40, height: 40, borderRadius: "50%", background: "#50AC55", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" } }, getInitials(p)), /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 500, color: "var(--color-text)" } }, getDisplayName(p)), /* @__PURE__ */ React.createElement("div", { style: { color: "var(--color-text-muted)", fontSize: "0.85rem" } }, p.Email || p.email || "No Email"), /* @__PURE__ */ React.createElement("div", { style: { color: "#555", fontSize: "0.85rem", marginTop: 4 } }, /* @__PURE__ */ React.createElement(Icon, { name: "phone", size: 12, style: { marginRight: 4, verticalAlign: "middle" } }), p.Phone || p.phone || "No Phone")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, /* @__PURE__ */ React.createElement("button", { className: "btn-icon", title: "Call", onClick: () => window.location.href = `tel:${p.Phone || p.phone}`, disabled: !p.Phone && !p.phone }, /* @__PURE__ */ React.createElement(Icon, { name: "phone-call", size: 16 })), /* @__PURE__ */ React.createElement("button", { className: "btn-icon", title: "Message", onClick: () => window.location.href = `sms:${p.Phone || p.phone}`, disabled: !p.Phone && !p.phone }, /* @__PURE__ */ React.createElement(Icon, { name: "message-square", size: 16 })), (p.hasActiveSession || p.HasActiveSession || p.has_active_session) && (p.Id || p.id) && /* @__PURE__ */ React.createElement("button", {
      className: "btn-icon", title: "Open Chat", onClick: () => {
      }
    }, /* @__PURE__ */ React.createElement(Icon, { name: "message-circle", size: 16 })))))) : /* @__PURE__ */ React.createElement("div", { className: "empty-state", style: { background: "#fff", padding: 24, borderRadius: 8, border: "1px dashed var(--color-border)" } }, /* @__PURE__ */ React.createElement(Icon, { name: "info", size: 32 }), /* @__PURE__ */ React.createElement("p", { style: { marginTop: 8 } }, "No Parents Found."))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 } }, /* @__PURE__ */ React.createElement(Icon, { name: "users", size: 24, color: "var(--color-primary)" }), /* @__PURE__ */ React.createElement("h3", { style: { margin: 0, color: "var(--color-text)" } }, "Siblings")), siblings.length > 0 ? /* @__PURE__ */ React.createElement("div", { className: "data-table-wrap", style: { background: "#fff", borderRadius: 8, border: "1px solid var(--color-border)" } }, /* @__PURE__ */ React.createElement("table", { className: "data-table" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Name"), /* @__PURE__ */ React.createElement("th", null, "Classroom"), /* @__PURE__ */ React.createElement("th", null, "Status"))), /* @__PURE__ */ React.createElement("tbody", null, siblings.map((s, i) => /* @__PURE__ */ React.createElement("tr", { key: i, style: { cursor: "pointer" }, onClick: () => window.location.hash = `/students` }, /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement(Avatar, { name: getDisplayName(s), photoUrl: s.Photo || s.photo, id: s.Id || s.id, size: 28 }), /* @__PURE__ */ React.createElement("span", null, getDisplayName(s)))), /* @__PURE__ */ React.createElement("td", null, s.ClassroomName || s.classroomName || s.classroom_name || "---"), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("span", { className: `status-chip ${statusClass(s.Status || s.status)}` }, s.Status || s.status || "Unknown"))))))) : /* @__PURE__ */ React.createElement("div", { className: "empty-state", style: { background: "#fff", padding: 24, borderRadius: 8, border: "1px dashed var(--color-border)" } }, /* @__PURE__ */ React.createElement(Icon, { name: "info", size: 32 }), /* @__PURE__ */ React.createElement("p", { style: { marginTop: 8 } }, "No Siblings Found."))));
  };
  var PdfViewerModal = ({ url, title, onClose }) => {
    const [blobUrl, setBlobUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
      let mounted = true;
      if (!url) return;
      const loadPdf = async () => {
        setLoading(true);
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Failed to fetch PDF (${res.status})`);
          const arrayBuffer = await res.arrayBuffer();
          if (!mounted) return;
          const pdfBlob = new Blob([arrayBuffer], { type: "application/pdf" });
          const objUrl = URL.createObjectURL(pdfBlob);
          setBlobUrl(objUrl);
        } catch (err) {
          if (mounted) setError(err.message);
        } finally {
          if (mounted) setLoading(false);
        }
      };
      loadPdf();
      return () => {
        mounted = false;
      };
    }, [url]);
    useEffect(() => {
      return () => {
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
        }
      };
    }, [blobUrl]);
    if (!url) return null;
    return /* @__PURE__ */ React.createElement(GlobalCanvasPortal, null, /* @__PURE__ */ React.createElement("div", { className: "modal-overlay", onClick: onClose, style: { zIndex: 9999 } }, /* @__PURE__ */ React.createElement("div", { className: "modal-box", onClick: (e) => e.stopPropagation(), style: { width: "90%", height: "90%", maxWidth: 1200, padding: 0, display: "flex", flexDirection: "column" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid var(--color-border)", alignItems: "center" } }, /* @__PURE__ */ React.createElement("h3", { style: { margin: 0 } }, title || "PDF Preview"), /* @__PURE__ */ React.createElement(Icon, { name: "x", size: 24, style: { cursor: "pointer" }, onClick: onClose })), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, background: "#f0f0f0", position: "relative" } }, loading ? /* @__PURE__ */ React.createElement("div", { className: "loading-center", style: { padding: 40 } }, /* @__PURE__ */ React.createElement("div", { className: "spinner" }), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 12, fontWeight: 600 } }, "Loading Document...")) : error ? /* @__PURE__ */ React.createElement("div", { className: "empty-state", style: { padding: 40 } }, /* @__PURE__ */ React.createElement(Icon, { name: "alert-circle", size: 40 }), /* @__PURE__ */ React.createElement("p", { className: "empty-state-title" }, "Failed to load PDF"), /* @__PURE__ */ React.createElement("p", null, error)) : /* @__PURE__ */ React.createElement("iframe", { src: `${blobUrl}#toolbar=1&navpanes=1&scrollbar=1&zoom=100`, style: { width: "100%", height: "100%", border: "none" }, title: "PDF Preview" })))));
  };
  var StudentProfilePage = ({ student, onBack, onSaved }) => {
    const isCreate = !student;
    const [loading, setLoading] = useState(false);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [pdfTitle, setPdfTitle] = useState("");
    const [activeTab, setActiveTab] = useState("Student Details");
    const [classrooms, setClassrooms] = useState([]);
    const [schoolOptions, setSchoolOptions] = useState([]);
    const [advancedData, setAdvancedData] = useState({});
    const [hideProfile, setHideProfile] = useState(false);
    const [formData, setFormData] = useState({
      // Student Details
      FirstName: student?.FirstName || student?.firstName || (student?.name ? student.name.split(" ")[0] : ""),
      LastName: student?.LastName || student?.lastName || (student?.name ? student.name.split(" ").slice(1).join(" ") : ""),
      Gender: student?.Gender || student?.gender || "Male",
      BirthDate: student?.BirthDate || student?.birthDate || "",
      Email: student?.Email || student?.email || "",
      PhotoConsent: student?.photoConsent === false ? "No" : "Yes",
      MedicalProblems: student?.MedicalProblems || student?.medicalProblems || "",
      Notes: student?.Notes || student?.notes || "",
      // Contacts
      Parent1Name: student?.Parent1Name || student?.parent1Name || student?.Parent1FirstName || "",
      Parent1Relationship: student?.Parent1Relationship || student?.parent1Relationship || "father",
      Parent1Phone: student?.Parent1Phone || student?.parent1Phone || "",
      Parent1Email: student?.Parent1Email || student?.parent1Email || "",
      Parent2Name: student?.Parent2Name || student?.parent2Name || "",
      Parent2Relationship: student?.Parent2Relationship || student?.parent2Relationship || "mother",
      Parent2Phone: student?.Parent2Phone || student?.parent2Phone || "",
      Parent2Email: student?.Parent2Email || student?.parent2Email || "",
      EmergencyName: student?.EmergencyContactName || student?.EmergencyName || student?.emergencyName || "",
      EmergencyRelationship: student?.EmergencyContactRelationship || student?.EmergencyRelationship || "",
      EmergencyPhone: student?.EmergencyContactPhone || student?.EmergencyPhone || student?.emergencyPhone || "",
      AddressLine1: student?.Address || student?.address || "",
      AddressSuburb: student?.Suburb || student?.suburb || "",
      AddressState: student?.State || student?.state || "NSW",
      AddressPostcode: student?.PostCode || student?.postCode || "",
      // Enrollment Details
      EOINumber: student?.eoinumber || student?.EOINumber || "",
      EOIDate: student?.eoidate || student?.EOIDate || "",
      EOIProgram: student?.eoiprogram || student?.EOIProgram || "Default - Weekend",
      MainstreamSchool: student?.MainstreamSchool || student?.mainstreamSchool || "",
      SchoolId: student?.SchoolId || student?.schoolId || "",
      YearLevel: student?.YearLevel || student?.yearLevel || "Seven",
      SupposedClassroom: student?.SupposedClassroom || student?.supposedClassroom || "",
      AcceptanceDate: student?.AcceptanceDate || student?.acceptanceDate || "",
      Status: student?.Status || student?.status || "Enrolled",
      CurrentProgram: student?.CurrentProgram || student?.currentProgram || "Default - Weekend",
      ClassroomId: student?.ClassroomId || student?.classroomId || student?.classroom_id || "",
      ReceivedBook: student?.ReceivedBook === true || student?.receivedBook === "Yes" ? "Yes" : "No",
      OldLevel: student?.OldLevel || student?.oldLevel || "",
      DiscountRate: student?.DiscountRate || student?.discountRate || "",
      CustomDiscountRate: student?.CustomDiscountRate || student?.customDiscountRate || "",
      CustomDiscountReason: student?.CustomDiscountReason || student?.customDiscountReason || "",
      DateDiscontinued: student?.datediscontinued || student?.DateDiscontinued || ""
    });
    useEffect(() => {
      api.get("/api/classrooms", { params: { col: "Id,name", limit: 150 } }).then((res) => setClassrooms(res.data?.data || res.data || []));
      api.get("/api/options?t=schools").then((res) => setSchoolOptions(res.data || []));
      if (!isCreate) {
        const sid = student?.Id || student?.id;
        if (sid) {
          api.get(`/api/students/${sid}?details=true`).then((res) => {
            const raw = res.data;
            let full = raw?.data || raw?.Data || raw || {};
            const det = full.details || full.Details || full;
            const ensureArray = (val) => {
              if (!val) return [];
              if (Array.isArray(val)) return val;
              if (typeof val === "object") return Object.values(val);
              return [];
            };
            setAdvancedData({
              parents: ensureArray(det.parents || det.Parents || full.Parents || full.parents),
              siblings: ensureArray(det.siblings || det.Siblings || full.Siblings || full.siblings),
              reports: ensureArray(det.reports || det.Reports || full.Reports || full.reports)
            });
            const parentsArr = ensureArray(det.parents || det.Parents || full.Parents || full.parents);
            const p1 = parentsArr.length > 0 ? parentsArr[0] : {};
            const p2 = parentsArr.length > 1 ? parentsArr[1] : {};
            const getPName = (p) => p.FirstName ? `${p.FirstName} ${p.LastName || ""}`.trim() : p.Name || p.name || "";
            setFormData((prev) => ({
              ...prev,
              FirstName: full.FirstName || full.firstName || prev.FirstName,
              LastName: full.LastName || full.lastName || prev.LastName,
              Gender: full.Gender || full.gender || det.Gender || det.gender || prev.Gender,
              BirthDate: full.BirthDate || full.birthDate || full.DOB || full.dob || det.BirthDate || det.birthDate || det.DOB || det.dob || prev.BirthDate,
              Email: full.Email || full.email || det.Email || det.email || prev.Email,
              PhotoConsent: full.PhotoCapturing === false || full.photocapturing === false || full.photoConsent === false || full.PhotoConsent === false || det.photoConsent === false || det.PhotoConsent === false || full.NoPhotoConsent || det.NoPhotoConsent ? "No" : full.PhotoCapturing === true || full.photocapturing === true || full.photoConsent === true || full.PhotoConsent === true || det.photoConsent === true || det.PhotoConsent === true ? "Yes" : prev.PhotoConsent,
              MedicalProblems: full.MedicalProblems || full.medicalproblems || full.medicalProblems || det.MedicalProblems || det.medicalproblems || det.medicalProblems || prev.MedicalProblems,
              Notes: full.Notes || full.notes || det.Notes || det.notes || prev.Notes,
              Parent1Name: getPName(p1) || (full.Parent1FirstName ? `${full.Parent1FirstName} ${full.Parent1LastName || ""}`.trim() : null) || (det.Parent1FirstName ? `${det.Parent1FirstName} ${det.Parent1LastName || ""}`.trim() : null) || full.Parent1Name || full.parent1Name || det.Parent1Name || det.parent1Name || prev.Parent1Name,
              Parent1Relationship: p1.Relationship || p1.relationship || full.Parent1Relationship || full.parent1Relationship || det.Parent1Relationship || det.parent1Relationship || prev.Parent1Relationship,
              Parent1Phone: p1.Phone || p1.phone || p1.Mobile || p1.mobile || full.Parent1Phone || full.parent1Phone || det.Parent1Phone || det.parent1Phone || prev.Parent1Phone,
              Parent1Email: p1.Email || p1.email || full.Parent1Email || full.parent1Email || det.Parent1Email || det.parent1Email || prev.Parent1Email,
              Parent2Name: getPName(p2) || (full.Parent2FirstName ? `${full.Parent2FirstName} ${full.Parent2LastName || ""}`.trim() : null) || (det.Parent2FirstName ? `${det.Parent2FirstName} ${det.Parent2LastName || ""}`.trim() : null) || full.Parent2Name || full.parent2Name || det.Parent2Name || det.parent2Name || prev.Parent2Name,
              Parent2Relationship: p2.Relationship || p2.relationship || full.Parent2Relationship || full.parent2Relationship || det.Parent2Relationship || det.parent2Relationship || prev.Parent2Relationship,
              Parent2Phone: p2.Phone || p2.phone || p2.Mobile || p2.mobile || full.Parent2Phone || full.parent2Phone || det.Parent2Phone || det.parent2Phone || prev.Parent2Phone,
              Parent2Email: p2.Email || p2.email || full.Parent2Email || full.parent2Email || det.Parent2Email || det.parent2Email || prev.Parent2Email,
              EmergencyName: full.EmergencyContactName || full.EmergencyName || full.emergencyName || full.emergency_name || det.EmergencyContactName || det.EmergencyName || det.emergencyName || det.emergency_name || prev.EmergencyName,
              EmergencyRelationship: full.EmergencyContactRelationship || full.EmergencyRelationship || full.emergencyRelationship || full.emergency_relationship || det.EmergencyContactRelationship || det.EmergencyRelationship || det.emergencyRelationship || det.emergency_relationship || prev.EmergencyRelationship,
              EmergencyPhone: full.EmergencyContactPhone || full.EmergencyPhone || full.emergencyPhone || full.emergency_phone || det.EmergencyContactPhone || det.EmergencyPhone || det.emergencyPhone || det.emergency_phone || prev.EmergencyPhone,
              AddressLine1: full.Address || full.address || full.Address1 || full.address1 || full.AddressLine1 || full.addressLine1 || full.address_line_1 || det.Address || det.address || det.Address1 || det.address1 || det.AddressLine1 || det.addressLine1 || det.address_line_1 || prev.AddressLine1,
              AddressSuburb: full.Suburb || full.suburb || full.Suburd || full.suburd || full.AddressSuburb || full.addressSuburb || det.Suburb || det.suburb || det.Suburd || det.suburd || det.AddressSuburb || det.addressSuburb || prev.AddressSuburb,
              AddressState: full.State || full.state || full.AddressState || full.addressState || det.State || det.state || det.AddressState || det.addressState || prev.AddressState,
              AddressPostcode: full.PostalCode || full.postalCode || full.postal_code || full.Postcode || full.postcode || full.AddressPostcode || full.addressPostcode || det.PostalCode || det.postalCode || det.postal_code || det.Postcode || det.postcode || det.AddressPostcode || det.addressPostcode || prev.AddressPostcode,
              EOINumber: full.EoiNumber || full.eoinumber || full.EOINumber || full.eoiNumber || det.EoiNumber || det.eoinumber || det.EOINumber || det.eoiNumber || prev.EOINumber,
              EOIDate: full.EoiDate || full.eoidate || full.EOIDate || full.eoiDate || det.EoiDate || det.eoidate || det.EOIDate || det.eoiDate || prev.EOIDate,
              EOIProgram: full.EoiProgram || full.eoiProgram || full.eoiprogram || full.EOIProgram || full.Program || full.program || det.EoiProgram || det.eoiProgram || det.eoiprogram || det.EOIProgram || det.Program || det.program || prev.EOIProgram,
              MainstreamSchool: full.MainstreamSchool || full.mainstreamSchool || full.SchoolName || full.schoolName || full.school_name || det.MainstreamSchool || det.mainstreamSchool || det.SchoolName || det.schoolName || det.school_name || prev.MainstreamSchool,
              SchoolId: full.SchoolId || full.schoolId || det.SchoolId || det.schoolId || prev.SchoolId,
              YearLevel: full.YearLevel || full.yearLevel || full.year_level || det.YearLevel || det.yearLevel || det.year_level || prev.YearLevel,
              SupposedClassroom: full.SupposedClassroom || full.supposedClassroom || full.pclassroom_name || full.PClassroomName || det.SupposedClassroom || det.supposedClassroom || det.pclassroom_name || det.PClassroomName || prev.SupposedClassroom,
              AcceptanceDate: full.AcceptanceDate || full.acceptanceDate || det.AcceptanceDate || det.acceptanceDate || prev.AcceptanceDate,
              Status: full.Status || full.status || det.Status || det.status || prev.Status,
              CurrentProgram: full.CurrentProgram || full.currentProgram || full.Program || full.program || det.CurrentProgram || det.currentProgram || det.Program || det.program || prev.CurrentProgram,
              ClassroomId: full.ClassroomId || full.classroomId || full.classroom_id || det.ClassroomId || det.classroomId || det.classroom_id || prev.ClassroomId,
              ReceivedBook: full.ReceivedBook === true || full.receivedBook === "Yes" || full.classroom_book === true || full.ClassroomBook === true || det.ReceivedBook === true || det.receivedBook === "Yes" || det.classroom_book === true || det.ClassroomBook === true ? "Yes" : full.ReceivedBook === false || full.receivedBook === "No" || full.classroom_book === false || full.ClassroomBook === false || det.ReceivedBook === false || det.receivedBook === "No" || det.classroom_book === false || det.ClassroomBook === false ? "No" : prev.ReceivedBook,
              OldLevel: full.OldLevel || full.oldLevel || full.oldlevel_name || full.OldLevelName || det.OldLevel || det.oldLevel || det.oldlevel_name || det.OldLevelName || prev.OldLevel,
              DiscountRate: full.DiscountRate || full.discountRate || full.discount || full.Discount || full.discountPercent || det.DiscountRate || det.discountRate || det.discount || det.Discount || det.discountPercent || prev.DiscountRate,
              CustomDiscountRate: full.CustomDiscountRate || full.customDiscountRate || full.customDiscount || full.CustomDiscount || full.customDiscountPercent || det.CustomDiscountRate || det.customDiscountRate || det.customDiscount || det.CustomDiscount || det.customDiscountPercent || prev.CustomDiscountRate,
              CustomDiscountReason: full.CustomDiscountReason || full.customDiscountReason || full.customReason || full.CustomReason || full.customreason || det.CustomDiscountReason || det.customDiscountReason || det.customReason || det.CustomReason || det.customreason || prev.CustomDiscountReason,
              DateDiscontinued: full.DateDiscontinued || full.datediscontinued || full.DiscontinueDate || full.discontinueDate || det.DateDiscontinued || det.datediscontinued || det.DiscontinueDate || det.discontinueDate || prev.DateDiscontinued
            }));
          }).catch((e) => console.error("Details fetch failed:", e));
        }
      }
    }, [isCreate, student]);
    useEffect(() => {
      if (schoolOptions.length > 0 && formData.SchoolId && !formData.MainstreamSchool) {
        const match = schoolOptions.find((s) => String(s.Id || s.id) === String(formData.SchoolId));
        if (match) {
          const schoolName = match.Value || match.value || match;
          setFormData((prev) => ({ ...prev, MainstreamSchool: schoolName }));
        }
      }
    }, [schoolOptions, formData.SchoolId, formData.MainstreamSchool]);
    const handleChange = (e) => setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSave = async () => {
      if (!formData.FirstName || !formData.LastName) return alert("First Name and Last Name are required");
      setLoading(true);
      try {
        const payload = { ...formData };
        if (payload.BirthDate) payload.BirthDate = new Date(payload.BirthDate).toISOString();
        if (payload.EOIDate) payload.EOIDate = new Date(payload.EOIDate).toISOString();
        if (payload.AcceptanceDate) payload.AcceptanceDate = new Date(payload.AcceptanceDate).toISOString();
        if (payload.DateDiscontinued) payload.DateDiscontinued = new Date(payload.DateDiscontinued).toISOString();
        payload.PhotoConsent = payload.PhotoConsent === "Yes";
        payload.ReceivedBook = payload.ReceivedBook === "Yes";
        if (isCreate) {
          await api.post("/api/students", payload);
        } else {
          await api.patch(`/api/students/${student.Id || student.id}`, payload);
        }
        onSaved();
        onBack();
      } catch (e) {
        alert("Failed to save: " + (e.response?.data?.message || e.message));
      } finally {
        setLoading(false);
      }
    };
    const tabs = ["Student Details", "Enrollment Details", "Siblings & Parents", "Reports", "Attendance", "Invoices & Billing"];
    const fullName = `${formData.FirstName} ${formData.LastName}`.trim() || "New Student";
    const initials = isCreate ? "N" : initialsFromName(fullName);
    const photoUrl = student?.photo && !student?.photo?.startsWith("http") ? `${API_BASE}${student.photo}` : student?.photo;
    const studentCode = student?.code || student?.Code || "";
    const SegmentControl = ({ name, options, value, onChange }) => /* @__PURE__ */ React.createElement("div", { style: { display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid var(--color-primary)" } }, options.map((opt) => /* @__PURE__ */ React.createElement("div", {
      key: opt, onClick: () => onChange({ target: { name, value: opt } }), style: {
        flex: 1,
        textAlign: "center",
        padding: "8px 0",
        cursor: "pointer",
        fontSize: "0.9rem",
        background: value === opt ? "var(--color-primary)" : "#fff",
        color: value === opt ? "#fff" : "var(--color-primary)",
        fontWeight: value === opt ? 600 : 400
      }
    }, opt)));
    const assignedClassroom = classrooms.find((c) => (c.Id || c.id) == formData.ClassroomId);
    const classroomName = assignedClassroom ? assignedClassroom.name || assignedClassroom.Name : "No Classroom";
    return /* @__PURE__ */ React.createElement("div", { className: "card", style: { minHeight: "80vh", display: "flex", flexDirection: "column" } }, !hideProfile && /* @__PURE__ */ React.createElement("div", { className: "card-header", style: { padding: "24px 32px 0 32px", borderBottom: "1px solid var(--color-border)", display: "block" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 24, alignItems: "center", paddingBottom: 24, width: "100%" } }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", style: { padding: 8, borderRadius: "50%" }, onClick: onBack }, /* @__PURE__ */ React.createElement(Icon, { name: "arrow-left", size: 20 })), isCreate ? /* @__PURE__ */ React.createElement("div", { style: { width: 64, height: 64, borderRadius: "50%", background: "var(--color-bg-alt)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", fontWeight: "bold", color: "var(--color-text-muted)" } }, initials) : /* @__PURE__ */ React.createElement("img", {
      src: photoUrl || "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=", alt: "", style: { width: 64, height: 64, borderRadius: "50%", objectFit: "cover", background: "var(--color-bg-alt)", display: photoUrl ? "block" : "none" }, onError: (e) => {
        e.target.style.display = "none";
        e.target.nextSibling.style.display = "flex";
      }
    }), !photoUrl && !isCreate && /* @__PURE__ */ React.createElement("div", { style: { width: 64, height: 64, borderRadius: "50%", background: colorFromId(student?.Id || student?.id), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", fontWeight: "bold", color: "#fff" } }, initials), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", justifyContent: "center", marginLeft: 8, alignItems: "flex-start", textAlign: "left" } }, /* @__PURE__ */ React.createElement("h2", { style: { margin: 0, fontSize: "1.6rem", fontWeight: 800, color: "var(--color-text-main)", marginBottom: 6, lineHeight: 1 } }, studentCode ? `${studentCode} - ` : "", fullName), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12 } }, formData.Status === "Enrolled" ? /* @__PURE__ */ React.createElement("span", { style: { fontSize: "0.85rem", color: "var(--color-text-muted)", fontWeight: 600 } }, /* @__PURE__ */ React.createElement(Icon, { name: "grid", size: 14, style: { marginRight: 4, verticalAlign: "-2px" } }), classroomName) : /* @__PURE__ */ React.createElement("span", { className: `status-chip ${statusClass(formData.Status)}`, style: { fontSize: "0.75rem", padding: "3px 10px" } }, formData.Status), formData.PhotoConsent === "No" && /* @__PURE__ */ React.createElement("span", { className: "status-chip", style: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", fontSize: "0.75rem", padding: "3px 10px" } }, "No Photo Consent"), formData.MedicalProblems && /* @__PURE__ */ React.createElement("span", { className: "status-chip", style: { background: "#fffbeb", color: "#d97706", border: "1px solid #fde68a", fontSize: "0.75rem", padding: "3px 10px" } }, "Medical Notice"))), /* @__PURE__ */ React.createElement("div", { style: { marginLeft: "auto" } }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: handleSave, disabled: loading }, loading ? "Saving..." : "Save Changes"))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 32, overflowX: "auto" } }, tabs.map((t) => /* @__PURE__ */ React.createElement("div", {
      key: t, onClick: () => setActiveTab(t), style: {
        paddingBottom: 12,
        fontWeight: 600,
        fontSize: "0.90rem",
        cursor: "pointer",
        whiteSpace: "nowrap",
        color: activeTab === t ? "var(--color-text)" : "var(--color-text-light)",
        borderBottom: activeTab === t ? "3px solid var(--color-primary)" : "3px solid transparent"
      }
    }, t)))), /* @__PURE__ */ React.createElement("div", { className: "card-body", style: { flex: 1, padding: hideProfile ? 0 : 32, background: hideProfile ? "transparent" : "#fafafa" } }, !hideProfile && activeTab === "Student Details" && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 24 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 24 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "First Name ", /* @__PURE__ */ React.createElement("span", { style: { color: "red" } }, "*")), /* @__PURE__ */ React.createElement("input", { name: "FirstName", value: formData.FirstName, onChange: handleChange, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Last Name ", /* @__PURE__ */ React.createElement("span", { style: { color: "red" } }, "*")), /* @__PURE__ */ React.createElement("input", { name: "LastName", value: formData.LastName, onChange: handleChange, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Gender ", /* @__PURE__ */ React.createElement("span", { style: { color: "red" } }, "*")), /* @__PURE__ */ React.createElement(SegmentControl, { name: "Gender", options: ["Male", "Female"], value: formData.Gender, onChange: handleChange })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Date of Birth ", /* @__PURE__ */ React.createElement("span", { style: { color: "red" } }, "*")), /* @__PURE__ */ React.createElement("input", { type: "date", name: "BirthDate", value: formData.BirthDate ? formData.BirthDate.substring(0, 10) : "", onChange: handleChange, className: "form-input" }))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 24 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Student Email"), /* @__PURE__ */ React.createElement("input", { name: "Email", value: formData.Email, onChange: handleChange, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Photo Capturing ", /* @__PURE__ */ React.createElement("span", { style: { color: "red" } }, "*")), /* @__PURE__ */ React.createElement(SegmentControl, { name: "PhotoConsent", options: ["Yes", "No"], value: formData.PhotoConsent, onChange: handleChange })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Medical conditions"), /* @__PURE__ */ React.createElement("input", { name: "MedicalProblems", value: formData.MedicalProblems, onChange: handleChange, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Notes"), /* @__PURE__ */ React.createElement("input", { name: "Notes", value: formData.Notes, onChange: handleChange, className: "form-input" }))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, marginTop: 16 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h4", { style: { margin: "0 0 16px 0", fontSize: "0.95rem" } }, "Parent One:"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Name ", /* @__PURE__ */ React.createElement("span", { style: { color: "red" } }, "*")), /* @__PURE__ */ React.createElement("input", { name: "Parent1Name", value: formData.Parent1Name, onChange: handleChange, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Relationship ", /* @__PURE__ */ React.createElement("span", { style: { color: "red" } }, "*")), /* @__PURE__ */ React.createElement("input", { name: "Parent1Relationship", value: formData.Parent1Relationship, onChange: handleChange, className: "form-input" }))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Phone Number ", /* @__PURE__ */ React.createElement("span", { style: { color: "red" } }, "*")), /* @__PURE__ */ React.createElement("input", { name: "Parent1Phone", value: formData.Parent1Phone, onChange: handleChange, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Email ", /* @__PURE__ */ React.createElement("span", { style: { color: "red" } }, "*")), /* @__PURE__ */ React.createElement("input", { name: "Parent1Email", value: formData.Parent1Email, onChange: handleChange, className: "form-input" })))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h4", { style: { margin: "0 0 16px 0", fontSize: "0.95rem" } }, "Parent Two:"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Name ", /* @__PURE__ */ React.createElement("span", { style: { color: "red" } }, "*")), /* @__PURE__ */ React.createElement("input", { name: "Parent2Name", value: formData.Parent2Name, onChange: handleChange, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Relationship"), /* @__PURE__ */ React.createElement("input", { name: "Parent2Relationship", value: formData.Parent2Relationship, onChange: handleChange, className: "form-input" }))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Phone Number"), /* @__PURE__ */ React.createElement("input", { name: "Parent2Phone", value: formData.Parent2Phone, onChange: handleChange, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Email"), /* @__PURE__ */ React.createElement("input", { name: "Parent2Email", value: formData.Parent2Email, onChange: handleChange, className: "form-input" }))))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, marginTop: 16 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h4", { style: { margin: "0 0 16px 0", fontSize: "0.95rem" } }, "Address"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 16 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Line 1 ", /* @__PURE__ */ React.createElement("span", { style: { color: "red" } }, "*")), /* @__PURE__ */ React.createElement("input", { name: "AddressLine1", value: formData.AddressLine1, onChange: handleChange, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Suburb ", /* @__PURE__ */ React.createElement("span", { style: { color: "red" } }, "*")), /* @__PURE__ */ React.createElement("input", { name: "AddressSuburb", value: formData.AddressSuburb, onChange: handleChange, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "State ", /* @__PURE__ */ React.createElement("span", { style: { color: "red" } }, "*")), /* @__PURE__ */ React.createElement("input", { name: "AddressState", value: formData.AddressState, onChange: handleChange, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Post Code ", /* @__PURE__ */ React.createElement("span", { style: { color: "red" } }, "*")), /* @__PURE__ */ React.createElement("input", { name: "AddressPostcode", value: formData.AddressPostcode, onChange: handleChange, className: "form-input" })))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h4", { style: { margin: "0 0 16px 0", fontSize: "0.95rem" } }, "Emergency Contact:"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Name"), /* @__PURE__ */ React.createElement("input", { name: "EmergencyName", value: formData.EmergencyName, onChange: handleChange, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Relationship"), /* @__PURE__ */ React.createElement("input", { name: "EmergencyRelationship", value: formData.EmergencyRelationship, onChange: handleChange, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Phone Number"), /* @__PURE__ */ React.createElement("input", { name: "EmergencyPhone", value: formData.EmergencyPhone, onChange: handleChange, className: "form-input" })))))), activeTab === "Enrollment Details" && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 24 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 24 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "EOI Number"), /* @__PURE__ */ React.createElement("input", { name: "EOINumber", value: formData.EOINumber, onChange: handleChange, className: "form-input", disabled: true })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "EOI Date"), /* @__PURE__ */ React.createElement("input", { type: "date", name: "EOIDate", value: formData.EOIDate ? formData.EOIDate.substring(0, 10) : "", onChange: handleChange, className: "form-input", disabled: true })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "EOI Program"), /* @__PURE__ */ React.createElement("input", { name: "EOIProgram", value: formData.EOIProgram, onChange: handleChange, className: "form-input", disabled: true })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Mainstream School"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", borderRadius: 8, border: "1px solid var(--color-border)", background: "#fff", padding: "0 12px" } }, /* @__PURE__ */ React.createElement("input", {
      list: "school-options", name: "MainstreamSchool", value: formData.MainstreamSchool, onChange: (e) => {
        const val = e.target.value;
        const match = schoolOptions.find((s) => (s.Value || s.value || s) === val);
        setFormData((prev) => ({ ...prev, MainstreamSchool: val, SchoolId: match ? match.Id || match.id : prev.SchoolId }));
      }, style: { border: "none", background: "transparent", outline: "none", width: "100%", height: 38 }, placeholder: "Search school..."
    }), /* @__PURE__ */ React.createElement("datalist", { id: "school-options" }, schoolOptions.map((s, idx) => /* @__PURE__ */ React.createElement("option", { key: idx, value: s.Value || s.value || s }))), /* @__PURE__ */ React.createElement(Icon, { name: "x", size: 14, style: { margin: "12px 0 0 8px", cursor: "pointer", color: "#999" }, onClick: () => setFormData((p) => ({ ...p, MainstreamSchool: "", SchoolId: null })) })))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 24 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Year Level"), /* @__PURE__ */ React.createElement("select", { name: "YearLevel", value: formData.YearLevel, onChange: handleChange, className: "form-input" }, /* @__PURE__ */ React.createElement("option", { value: "Seven" }, "Seven"))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Supposed Classroom"), /* @__PURE__ */ React.createElement("select", { name: "SupposedClassroom", value: formData.SupposedClassroom, onChange: handleChange, className: "form-input" }, /* @__PURE__ */ React.createElement("option", { value: "" }, "---"), classrooms.map((c) => /* @__PURE__ */ React.createElement("option", { key: c.id || c.Id, value: c.name || c.Name }, c.name || c.Name)), formData.SupposedClassroom && !classrooms.find((c) => (c.name || c.Name) === formData.SupposedClassroom) && /* @__PURE__ */ React.createElement("option", { value: formData.SupposedClassroom }, formData.SupposedClassroom))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Acceptance Date"), /* @__PURE__ */ React.createElement("input", { type: "date", name: "AcceptanceDate", value: formData.AcceptanceDate ? formData.AcceptanceDate.substring(0, 10) : "", onChange: handleChange, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Student Status"), /* @__PURE__ */ React.createElement("select", { name: "Status", value: formData.Status, onChange: handleChange, className: "form-input" }, /* @__PURE__ */ React.createElement("option", { value: "Enrolled" }, "Enrolled"), /* @__PURE__ */ React.createElement("option", { value: "Pending" }, "Pending"), /* @__PURE__ */ React.createElement("option", { value: "Invited" }, "Invited"), /* @__PURE__ */ React.createElement("option", { value: "Discontinued" }, "Discontinued")))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 24 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Current Program"), /* @__PURE__ */ React.createElement("select", { name: "CurrentProgram", value: formData.CurrentProgram, onChange: handleChange, className: "form-input" }, /* @__PURE__ */ React.createElement("option", { value: "Default - Weekend" }, "Default - Weekend"))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Classroom"), /* @__PURE__ */ React.createElement("select", { name: "ClassroomId", value: formData.ClassroomId, onChange: handleChange, className: "form-input" }, /* @__PURE__ */ React.createElement("option", { value: "" }, "---"), classrooms.map((c) => /* @__PURE__ */ React.createElement("option", { key: c.id || c.Id, value: c.id || c.Id }, c.name || c.Name)))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Received book ", /* @__PURE__ */ React.createElement("span", { style: { color: "red" } }, "*")), /* @__PURE__ */ React.createElement(SegmentControl, { name: "ReceivedBook", options: ["Yes", "No"], value: formData.ReceivedBook, onChange: handleChange })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Old Level"), /* @__PURE__ */ React.createElement("select", { name: "OldLevel", value: formData.OldLevel, onChange: handleChange, className: "form-input" }, /* @__PURE__ */ React.createElement("option", { value: "" }, "---"), classrooms.map((c) => /* @__PURE__ */ React.createElement("option", { key: c.id || c.Id, value: c.name || c.Name }, c.name || c.Name)), formData.OldLevel && !classrooms.find((c) => (c.name || c.Name) === formData.OldLevel) && /* @__PURE__ */ React.createElement("option", { value: formData.OldLevel }, formData.OldLevel)))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 24 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Discount Rate (Auto) ", /* @__PURE__ */ React.createElement("span", { style: { float: "right", color: "var(--color-text-muted)" } }, "Computed: 0")), /* @__PURE__ */ React.createElement("select", { name: "DiscountRate", value: formData.DiscountRate, onChange: handleChange, className: "form-input" }, /* @__PURE__ */ React.createElement("option", { value: "" }, "---"), /* @__PURE__ */ React.createElement("option", { value: "0" }, "0"), /* @__PURE__ */ React.createElement("option", { value: "0.05" }, "0.05"), /* @__PURE__ */ React.createElement("option", { value: "0.1" }, "0.1"), /* @__PURE__ */ React.createElement("option", { value: "0.25" }, "0.25"))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Custom Discount Rate ", /* @__PURE__ */ React.createElement("span", { style: { float: "right", color: "var(--color-text-muted)", fontSize: "0.75rem" } }, "If filled, other fields will be ignored.")), /* @__PURE__ */ React.createElement("input", { type: "number", step: "0.01", name: "CustomDiscountRate", value: formData.CustomDiscountRate, onChange: handleChange, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Custom Discount Reason"), /* @__PURE__ */ React.createElement("textarea", { name: "CustomDiscountReason", value: formData.CustomDiscountReason, onChange: handleChange, className: "form-input", rows: 2 })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Date Discontinued"), /* @__PURE__ */ React.createElement("input", { type: "date", name: "DateDiscontinued", value: formData.DateDiscontinued ? formData.DateDiscontinued.substring(0, 10) : "", onChange: handleChange, className: "form-input" })))), activeTab === "Siblings & Parents" && /* @__PURE__ */ React.createElement(SiblingsParentsTab, { advancedData }), activeTab === "Reports" && /* @__PURE__ */ React.createElement("div", { style: { marginTop: hideProfile ? 0 : 24, padding: hideProfile ? 0 : "0 8px" } }, /* @__PURE__ */ React.createElement(
      StudentReportsView,
      {
        studentId: student?.Id || student?.id,
        studentName: fullName,
        studentCode,
        photoUrl,
        onEditingChange: setHideProfile
      }
    )), activeTab === "Invoices & Billing" && /* @__PURE__ */ React.createElement(InvoicesTab, { studentId: student?.Id || student?.id, studentCode, studentRow: student }), activeTab === "Attendance" && /* @__PURE__ */ React.createElement(AttendanceTab, { studentId: student?.Id || student?.id }), pdfUrl && /* @__PURE__ */ React.createElement(PdfViewerModal, { url: pdfUrl, title: pdfTitle, onClose: () => setPdfUrl(null) })));
  };
  var InvitationEmailsPage = ({ onBack }) => {
    const [step, setStep] = useState(1);
    const [fromDate, setFromDate] = useState(() => {
      const d = /* @__PURE__ */ new Date();
      return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().substring(0, 10);
    });
    const [toDate, setToDate] = useState(() => {
      const d = /* @__PURE__ */ new Date();
      return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().substring(0, 10);
    });
    const [ageFrom, setAgeFrom] = useState("");
    const [ageTo, setAgeTo] = useState("");
    const [includeInvited, setIncludeInvited] = useState(true);
    const [assessmentDate, setAssessmentDate] = useState(() => {
      const d = /* @__PURE__ */ new Date();
      d.setDate(d.getDate() + 7);
      return d.toISOString().substring(0, 10);
    });
    const [assessmentTime, setAssessmentTime] = useState("14:30");
    const [type, setType] = useState("EOI");
    const [targetedCount, setTargetedCount] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [sendLoading, setSendLoading] = useState(false);
    const buildPayload = () => {
      const payload = {
        from: fromDate,
        to: toDate,
        assessmentdate: assessmentDate,
        assessmenttime: assessmentTime,
        type,
        includeinvited: includeInvited
      };
      const aFrom = parseInt(ageFrom, 10);
      if (!isNaN(aFrom)) payload.excludedagefrom = aFrom;
      const aTo = parseInt(ageTo, 10);
      if (!isNaN(aTo)) payload.excludedageto = aTo;
      return payload;
    };
    const validateStep1 = () => {
      if (!fromDate || !toDate) return "Please select EOI date range.";
      if (new Date(toDate) < new Date(fromDate)) return "EOI end date must be after start date.";
      const aFrom = parseInt(ageFrom, 10);
      const aTo = parseInt(ageTo, 10);
      if (ageFrom.trim() && isNaN(aFrom)) return "Age from must be a valid number.";
      if (ageTo.trim() && isNaN(aTo)) return "Age to must be a valid number.";
      if (!isNaN(aFrom) && !isNaN(aTo) && aTo < aFrom) return "Age to must be greater than or equal to age from.";
      return null;
    };
    const validateStep2 = () => {
      if (!assessmentDate) return "Please select assessment date.";
      if (!assessmentTime) return "Please select assessment time.";
      if (!type.trim()) return "Please select invite type.";
      return null;
    };
    const previewTargetedStudents = async () => {
      const err = validateStep1() || validateStep2();
      if (err) return alert(err);
      setPreviewLoading(true);
      setTargetedCount(null);
      try {
        const res = await api.post("/api/students/assessment-email?n=true", buildPayload());
        const data = res.data;
        if (data.success) {
          const count = parseInt(data.count, 10) || 0;
          setTargetedCount(count);
          if (count <= 0) alert("No targeted students found.");
        } else {
          throw new Error("Preview request did not succeed.");
        }
      } catch (e) {
        alert("Preview failed: " + (e.response?.data?.message || e.message));
      } finally {
        setPreviewLoading(false);
      }
    };
    const sendInvitationEmails = async () => {
      const err = validateStep1() || validateStep2();
      if (err) return alert(err);
      setSendLoading(true);
      try {
        const res = await api.post("/api/students/assessment-email", buildPayload());
        const data = res.data;
        if (data.success) {
          const count = parseInt(data.count, 10) || 0;
          const sent = parseInt(data.sent, 10) || 0;
          alert(`Targeted: ${count} \u2014 Emails sent: ${sent}`);
          onBack();
        } else {
          throw new Error("Send request did not succeed.");
        }
      } catch (e) {
        alert("Sending failed: " + (e.response?.data?.message || e.message));
      } finally {
        setSendLoading(false);
      }
    };
    return /* @__PURE__ */ React.createElement(GlobalCanvasPortal, null, /* @__PURE__ */ React.createElement("div", { className: "modal-overlay", onClick: onBack }, /* @__PURE__ */ React.createElement("div", { className: "modal-box", onClick: (e) => e.stopPropagation(), style: { maxWidth: 650, width: "100%", padding: 0 } }, /* @__PURE__ */ React.createElement("div", { className: "modal-title", style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 32px", borderBottom: "1px solid var(--color-border)", margin: 0 } }, /* @__PURE__ */ React.createElement("h2", { style: { margin: 0, fontSize: "1.4rem" } }, "Invitation Emails"), /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary btn-icon", onClick: onBack }, /* @__PURE__ */ React.createElement(Icon, { name: "x", size: 20 }))), /* @__PURE__ */ React.createElement("div", { className: "modal-body", style: { padding: 32 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 16, marginBottom: 32 } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1, padding: 12, borderRadius: 999, textAlign: "center", border: "1px solid var(--color-primary)", background: step === 1 ? "rgba(80,172,85,0.12)" : "#fff", fontWeight: step === 1 ? 600 : 400 } }, "Step 1 \xB7 Select students"), /* @__PURE__ */ React.createElement(
      "div",
      {
        onClick: () => {
          if ((targetedCount || 0) > 0) setStep(2);
        },
        style: { flex: 1, padding: 12, borderRadius: 999, textAlign: "center", border: "1px solid var(--color-primary)", background: step === 2 ? "rgba(80,172,85,0.12)" : "#fff", fontWeight: step === 2 ? 600 : 400, color: (targetedCount || 0) > 0 ? "var(--color-text)" : "var(--color-text-muted)", cursor: (targetedCount || 0) > 0 ? "pointer" : "not-allowed" }
      },
      "Step 2 \xB7 Compose"
    )), step === 1 ? /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 20 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "EOI from"), /* @__PURE__ */ React.createElement("input", { type: "date", className: "form-input", value: fromDate, onChange: (e) => setFromDate(e.target.value) })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "EOI to"), /* @__PURE__ */ React.createElement("input", { type: "date", className: "form-input", value: toDate, onChange: (e) => setToDate(e.target.value) }))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Age from"), /* @__PURE__ */ React.createElement("input", { type: "number", className: "form-input", value: ageFrom, onChange: (e) => setAgeFrom(e.target.value) })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Age to"), /* @__PURE__ */ React.createElement("input", { type: "number", className: "form-input", value: ageTo, onChange: (e) => setAgeTo(e.target.value) }))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", id: "includeInvited", checked: includeInvited, onChange: (e) => setIncludeInvited(e.target.checked), style: { width: 18, height: 18 } }), /* @__PURE__ */ React.createElement("label", { htmlFor: "includeInvited", style: { margin: 0, cursor: "pointer" } }, "Include invited students")), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 12 } }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", style: { width: "100%", padding: 12 }, onClick: previewTargetedStudents, disabled: previewLoading }, previewLoading ? "Loading..." : "Check targeted students")), targetedCount !== null && /* @__PURE__ */ React.createElement("div", { style: { color: targetedCount > 0 ? "var(--color-primary)" : "red", fontWeight: 600 } }, "Targeted students: ", targetedCount), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 12 } }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", style: { width: "100%", padding: 12 }, onClick: () => setStep(2), disabled: (targetedCount || 0) <= 0 }, "Next"))) : /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 20 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Assessment date"), /* @__PURE__ */ React.createElement("input", { type: "date", className: "form-input", value: assessmentDate, onChange: (e) => setAssessmentDate(e.target.value) })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Assessment time"), /* @__PURE__ */ React.createElement("input", { type: "time", className: "form-input", value: assessmentTime, onChange: (e) => setAssessmentTime(e.target.value) })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Type"), /* @__PURE__ */ React.createElement("select", { className: "form-input", value: type, onChange: (e) => setType(e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "EOI" }, "General invite"), /* @__PURE__ */ React.createElement("option", { value: "EOI2" }, "Assessment day"))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 16, marginTop: 16 } }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", style: { flex: 1, padding: 12 }, onClick: () => setStep(1), disabled: sendLoading }, "Back"), /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", style: { flex: 1, padding: 12 }, onClick: sendInvitationEmails, disabled: sendLoading }, sendLoading ? "Loading..." : "Send Emails")))))));
  };
  var StudentsPage = () => {
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [students, setStudents] = useState([]);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("Enrolled");
    const [viewMode, setViewMode] = useState("none");
    const [selectedClassroomId, setSelectedClassroomId] = useState(null);
    const [sortRules, setSortRules] = useState([]);
    const [showAge, setShowAge] = useState(false);
    const [showDiscount, setShowDiscount] = useState(false);
    const [error, setError] = useState(null);
    const [editingStudent, setEditingStudent] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [showInvitationEmails, setShowInvitationEmails] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [tick, setTick] = useState(0);
    const [showFiltersModal, setShowFiltersModal] = useState(false);
    const [showActionsMenu, setShowActionsMenu] = useState(false);
    const [classrooms, setClassrooms] = useState([]);
    const [sortOptions, setSortOptions] = useState([]);
    const searchDebouncer = useRef(null);
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const pageSize = 15;
    useEffect(() => {
      if (window.appStudentFilter?.id) {
        setEditingStudent({ id: window.appStudentFilter.id });
        window.appStudentFilter = null;
      }
      api.get("/api/classrooms", { params: { col: "Id,name", limit: 150 } }).then((res) => setClassrooms(res.data?.data || res.data || []));
      api.get("/api/options", { params: { t: "StuSort" } }).then((res) => {
        const raw = res.data;
        let list = Array.isArray(raw) ? raw : raw?.data || [];
        setSortOptions(list.map((m) => ({
          label: m.Value || m.value || m.Key || m.key || "",
          column: m.Key || m.key || m.Value || m.value || ""
        })));
      });
    }, []);
    useEffect(() => {
      if (searchDebouncer.current) clearTimeout(searchDebouncer.current);
      searchDebouncer.current = setTimeout(() => {
        setDebouncedSearch(search);
      }, 350);
    }, [search]);
    const buildParams = (p) => {
      const q = debouncedSearch.trim();
      const cols = "Id,Status,classroom,name,code,photo,eoidate,eoinumber,datediscontinued,birthdate,discount";
      let filter = "";
      let orderby = "";
      if (viewMode !== "none") {
        if (viewMode === "unregistered_parents") {
          filter = "parentoneid eq '0', parenttwoid eq '0', status eq 'Enrolled'";
          orderby = "name ASC";
        } else if (viewMode === "new_enrollment") {
          filter = "status eq 'Enrolled'";
          orderby = "acceptancedate DESC";
        }
      } else if (q) {
        const escaped = q.replace(/'/g, "''");
        const isAllDigits = /^\d+$/.test(escaped);
        const searchPart = isAllDigits ? `code eq '${escaped}';parentphone eq '${escaped}'` : `name con '${escaped}';classroom_name con '${escaped}'`;
        let statusPart = "status eq 'Enrolled'";
        if (statusFilter === "EOI") statusPart = "status eq 'Pending';status eq 'Invited'";
        if (statusFilter === "Discontinued") statusPart = "status eq 'Discontinued'";
        filter = `${searchPart},${statusPart}`;
        orderby = "code DESC";
      } else {
        if (statusFilter === "EOI") {
          filter = "status eq 'Pending';status eq 'Invited'";
          orderby = "eoinumber DESC";
        } else if (statusFilter === "Discontinued") {
          filter = "status eq 'Discontinued'";
          orderby = "datediscontinued DESC";
        } else {
          filter = "status eq 'Enrolled'";
          orderby = "code DESC";
        }
      }
      if (viewMode === "none" && sortRules.length > 0) {
        orderby = sortRules.map((r) => `${r.column} ${r.desc ? "DESC" : "ASC"}`).join(",");
      }
      if (selectedClassroomId) {
        filter = filter ? `${filter},ClassroomId eq ${selectedClassroomId}` : `ClassroomId eq ${selectedClassroomId}`;
      }
      return { col: cols, filter, orderby, page: p, limit: pageSize };
    };
    const loadStudents = async (p = 1, append = false) => {
      if (!append) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const params = buildParams(p);
        const res = await api.get("/api/students", { params });
        const raw = res.data;
        let items = [];
        let count = 0;
        if (Array.isArray(raw)) items = raw;
        else if (raw && typeof raw === "object") {
          items = raw.data || raw.items || raw.results || [];
          count = raw.count || 0;
        }
        if (append) {
          setStudents((prev) => [...prev, ...items]);
        } else {
          setStudents(items);
        }
        setTotalCount(count);
        setHasMore(items.length >= pageSize);
        setPage(p);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };
    useEffect(() => {
      loadStudents(1, false);
    }, [debouncedSearch, statusFilter, viewMode, selectedClassroomId, sortRules, tick]);
    const loadMore = () => {
      if (!loadingMore && hasMore) {
        loadStudents(page + 1, true);
      }
    };
    const exportCsv = async () => {
      setShowActionsMenu(false);
      try {
        const params = buildParams(1);
        params.limit = 1e4;
        const res = await api.get("/api/students", {
          params,
          headers: { "Export": "1" },
          responseType: "blob"
        });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement("a");
        a.href = url;
        a.download = `students_export_${DateTime.now().toFormat("yyyyMMdd")}.csv`;
        a.click();
      } catch (e) {
        alert("Export failed: " + e.message);
      }
    };
    const [doeModal, setDoeModal] = useState(null);
    const exportDoe = async (year, term) => {
      setDoeModal(null);
      try {
        const res = await api.get("/api/students/DOE", {
          params: { term, year },
          responseType: "blob"
        });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement("a");
        a.href = url;
        a.download = `DOE_Report_${year}_${term.replace(/\s+/g, "")}.xlsx`;
        a.click();
      } catch (e) {
        alert("DOE Export failed: " + e.message);
      }
    };
    if (editingStudent || isCreating) {
      return /* @__PURE__ */ React.createElement(
        StudentProfilePage,
        {
          student: editingStudent,
          onBack: () => {
            setEditingStudent(null);
            setIsCreating(false);
          },
          onSaved: () => setTick((t) => t + 1)
        }
      );
    }
    return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "page-header", style: { display: "flex", justifyContent: "flex-end", alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { position: "relative" } }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", onClick: () => setShowActionsMenu(!showActionsMenu) }, /* @__PURE__ */ React.createElement(Icon, { name: "more-horizontal", size: 18 }), " Actions"), showActionsMenu && /* @__PURE__ */ React.createElement("div", { className: "dropdown-menu shadow", style: { position: "absolute", right: 0, top: "100%", marginTop: 8, zIndex: 100, minWidth: 200 } }, /* @__PURE__ */ React.createElement("div", { className: "dropdown-item", onClick: exportCsv }, /* @__PURE__ */ React.createElement(Icon, { name: "file-text", size: 14, style: { marginRight: 8 } }), " Export as CSV"), /* @__PURE__ */ React.createElement("div", {
      className: "dropdown-item", onClick: () => {
        setShowActionsMenu(false);
        setDoeModal({ year: DateTime.now().year, term: "Term 1" });
      }
    }, /* @__PURE__ */ React.createElement(Icon, { name: "file", size: 14, style: { marginRight: 8 } }), " Department of Education"), /* @__PURE__ */ React.createElement("div", {
      className: "dropdown-item", onClick: () => {
        setShowActionsMenu(false);
        setShowInvitationEmails(true);
      }
    }, /* @__PURE__ */ React.createElement(Icon, { name: "mail", size: 14, style: { marginRight: 8 } }), " Invitation Emails"))), /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: () => setIsCreating(true) }, /* @__PURE__ */ React.createElement(Icon, { name: "plus", size: 18 }), " New Student"))), /* @__PURE__ */ React.createElement("div", { className: "toolbar", style: { display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("div", { className: "toolbar-search", style: { flex: 1, minWidth: 300 } }, /* @__PURE__ */ React.createElement("span", { className: "search-icon" }, /* @__PURE__ */ React.createElement(Icon, { name: "search", size: 16 })), /* @__PURE__ */ React.createElement("input", { type: "text", placeholder: "Search students (Name, Code, Phone)...", value: search, onChange: (e) => setSearch(e.target.value) })), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center" } }, [{ label: "Enrolled", val: "Enrolled" }, { label: "EOI", val: "EOI" }, { label: "Discontinued", val: "Discontinued" }].map((s) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: s.val,
        onClick: () => {
          setStatusFilter(s.val);
          setViewMode("none");
          setSearch("");
        },
        className: `status-chip ${statusFilter === s.val && viewMode === "none" ? statusClass(s.val) : ""}`,
        style: {
          cursor: "pointer",
          border: statusFilter === s.val && viewMode === "none" ? "1px solid transparent" : "1px solid var(--color-border)",
          background: statusFilter === s.val && viewMode === "none" ? void 0 : "transparent"
        }
      },
      s.label
    )), /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", onClick: () => setShowFiltersModal(true) }, /* @__PURE__ */ React.createElement(Icon, { name: "filter", size: 16 }), " Filters ", (sortRules.length > 0 || selectedClassroomId || viewMode !== "none") && /* @__PURE__ */ React.createElement("span", { style: { marginLeft: 4, background: "var(--color-primary)", color: "#fff", padding: "1px 6px", borderRadius: 10, fontSize: 10 } }, "!")))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 } }, viewMode !== "none" && /* @__PURE__ */ React.createElement("span", { className: "status-chip active", style: { display: "flex", alignItems: "center", gap: 6 } }, "View: ", viewMode.replace(/_/g, " "), /* @__PURE__ */ React.createElement(Icon, { name: "x", size: 12, style: { cursor: "pointer" }, onClick: () => setViewMode("none") })), selectedClassroomId && /* @__PURE__ */ React.createElement("span", { className: "status-chip", style: { display: "flex", alignItems: "center", gap: 6, border: "1px solid var(--color-border)" } }, "Classroom: ", classrooms.find((c) => (c.Id || c.id) === selectedClassroomId)?.name || selectedClassroomId, /* @__PURE__ */ React.createElement(Icon, { name: "x", size: 12, style: { cursor: "pointer" }, onClick: () => setSelectedClassroomId(null) })), sortRules.map((r, i) => /* @__PURE__ */ React.createElement("span", { key: i, className: "status-chip", style: { display: "flex", alignItems: "center", gap: 6, border: "1px solid var(--color-border)" } }, "Sort: ", r.column, " ", r.desc ? "DESC" : "ASC", /* @__PURE__ */ React.createElement(Icon, { name: "x", size: 12, style: { cursor: "pointer" }, onClick: () => setSortRules(sortRules.filter((_, idx) => idx !== i)) }))), showAge && /* @__PURE__ */ React.createElement("span", { className: "status-chip", style: { display: "flex", alignItems: "center", gap: 6, border: "1px solid var(--color-border)" } }, "Show Age", /* @__PURE__ */ React.createElement(Icon, { name: "x", size: 12, style: { cursor: "pointer" }, onClick: () => setShowAge(false) })), showDiscount && /* @__PURE__ */ React.createElement("span", { className: "status-chip", style: { display: "flex", alignItems: "center", gap: 6, border: "1px solid var(--color-border)" } }, "Show Discount", /* @__PURE__ */ React.createElement(Icon, { name: "x", size: 12, style: { cursor: "pointer" }, onClick: () => setShowDiscount(false) }))), showFiltersModal && /* @__PURE__ */ React.createElement(GlobalCanvasPortal, null, /* @__PURE__ */ React.createElement("div", { className: "modal-overlay", onClick: () => setShowFiltersModal(false) }, /* @__PURE__ */ React.createElement("div", { className: "modal-box", onClick: (e) => e.stopPropagation(), style: { maxWidth: 550, width: "100%" } }, /* @__PURE__ */ React.createElement("div", { className: "modal-title" }, "Student Filters & Sorting"), /* @__PURE__ */ React.createElement("div", { className: "modal-body" }, /* @__PURE__ */ React.createElement("h4", { style: { margin: "0 0 12px 0" } }, "View Mode"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 } }, /* @__PURE__ */ React.createElement("label", { style: { display: "flex", alignItems: "center", gap: 10, cursor: "pointer" } }, /* @__PURE__ */ React.createElement("input", { type: "radio", checked: viewMode === "none", onChange: () => setViewMode("none") }), " None (Standard List)"), /* @__PURE__ */ React.createElement("label", { style: { display: "flex", alignItems: "center", gap: 10, cursor: "pointer" } }, /* @__PURE__ */ React.createElement("input", { type: "radio", checked: viewMode === "unregistered_parents", onChange: () => setViewMode("unregistered_parents") }), " Unregistered Parents"), /* @__PURE__ */ React.createElement("label", { style: { display: "flex", alignItems: "center", gap: 10, cursor: "pointer" } }, /* @__PURE__ */ React.createElement("input", { type: "radio", checked: viewMode === "new_enrollment", onChange: () => setViewMode("new_enrollment") }), " New Enrollment")), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 20 } }, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Filter by Classroom"), /* @__PURE__ */ React.createElement("select", { className: "form-input", value: selectedClassroomId || "", onChange: (e) => setSelectedClassroomId(e.target.value ? Number(e.target.value) : null) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "All Classrooms"), classrooms.map((c) => /* @__PURE__ */ React.createElement("option", { key: c.Id || c.id, value: c.Id || c.id }, c.name)))), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 20 } }, /* @__PURE__ */ React.createElement("h4", { style: { margin: "0 0 12px 0", display: "flex", justifyContent: "space-between" } }, "Sorting Rules", /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary btn-sm", onClick: () => setSortRules([...sortRules, { column: "code", desc: true }]), disabled: sortRules.length >= 6 }, "+ Add Rule")), sortRules.length === 0 ? /* @__PURE__ */ React.createElement("p", { style: { fontSize: "0.85rem", color: "var(--color-text-light)" } }, "No custom sort rules applied.") : /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 12 } }, sortRules.map((r, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { display: "flex", gap: 12, alignItems: "center" } }, /* @__PURE__ */ React.createElement("select", {
      className: "form-input", style: { flex: 2 }, value: r.column, onChange: (e) => {
        const next = [...sortRules];
        next[i].column = e.target.value;
        setSortRules(next);
      }
    }, sortOptions.map((o) => /* @__PURE__ */ React.createElement("option", { key: o.column, value: o.column }, o.label))), /* @__PURE__ */ React.createElement("select", {
      className: "form-input", style: { flex: 1 }, value: r.desc ? "desc" : "asc", onChange: (e) => {
        const next = [...sortRules];
        next[i].desc = e.target.value === "desc";
        setSortRules(next);
      }
    }, /* @__PURE__ */ React.createElement("option", { value: "asc" }, "Ascending"), /* @__PURE__ */ React.createElement("option", { value: "desc" }, "Descending")), /* @__PURE__ */ React.createElement(Icon, { name: "x", size: 18, color: "red", style: { cursor: "pointer" }, onClick: () => setSortRules(sortRules.filter((_, idx) => idx !== i)) }))))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 24 } }, /* @__PURE__ */ React.createElement("label", { style: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer" } }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: showAge, onChange: (e) => setShowAge(e.target.checked) }), " Show Student Age"), /* @__PURE__ */ React.createElement("label", { style: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer" } }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: showDiscount, onChange: (e) => setShowDiscount(e.target.checked) }), " Show Discount"))), /* @__PURE__ */ React.createElement("div", { className: "modal-actions" }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: () => setShowFiltersModal(false) }, "Close"))))), doeModal && /* @__PURE__ */ React.createElement(GlobalCanvasPortal, null, /* @__PURE__ */ React.createElement("div", { className: "modal-overlay", onClick: () => setDoeModal(null) }, /* @__PURE__ */ React.createElement("div", { className: "modal-box", onClick: (e) => e.stopPropagation(), style: { maxWidth: 400 } }, /* @__PURE__ */ React.createElement("div", { className: "modal-title" }, "DOE Export Settings"), /* @__PURE__ */ React.createElement("div", { className: "modal-body", style: { display: "flex", flexDirection: "column", gap: 16 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Year"), /* @__PURE__ */ React.createElement("select", { className: "form-input", value: doeModal.year, onChange: (e) => setDoeModal({ ...doeModal, year: e.target.value }) }, [0, 1, 2].map((i) => {
      const y = DateTime.now().year - i;
      return /* @__PURE__ */ React.createElement("option", { key: y, value: y }, y);
    }))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Term"), /* @__PURE__ */ React.createElement("select", { className: "form-input", value: doeModal.term, onChange: (e) => setDoeModal({ ...doeModal, term: e.target.value }) }, /* @__PURE__ */ React.createElement("option", { value: "Term 1" }, "Term 1"), /* @__PURE__ */ React.createElement("option", { value: "Term 2" }, "Term 2"), /* @__PURE__ */ React.createElement("option", { value: "Term 3" }, "Term 3"), /* @__PURE__ */ React.createElement("option", { value: "Term 4" }, "Term 4")))), /* @__PURE__ */ React.createElement("div", { className: "modal-actions" }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", onClick: () => setDoeModal(null) }, "Cancel"), /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: () => exportDoe(doeModal.year, doeModal.term) }, "Download Excel"))))), showInvitationEmails && /* @__PURE__ */ React.createElement(InvitationEmailsPage, { onBack: () => setShowInvitationEmails(false) }), /* @__PURE__ */ React.createElement("div", { className: "card" }, loading ? /* @__PURE__ */ React.createElement("div", { className: "card-body" }, /* @__PURE__ */ React.createElement(TableSkeleton, { rows: 8, cols: 4 })) : error ? /* @__PURE__ */ React.createElement("div", { className: "card-body" }, /* @__PURE__ */ React.createElement("div", { className: "empty-state" }, /* @__PURE__ */ React.createElement(Icon, { name: "alert-circle", size: 40 }), /* @__PURE__ */ React.createElement("p", { className: "empty-state-title" }, "Error loading students"), /* @__PURE__ */ React.createElement("p", { className: "empty-state-msg" }, error))) : students.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "card-body" }, /* @__PURE__ */ React.createElement("div", { className: "empty-state" }, /* @__PURE__ */ React.createElement(Icon, { name: "users", size: 40 }), /* @__PURE__ */ React.createElement("p", { className: "empty-state-title" }, "No students found"), /* @__PURE__ */ React.createElement("p", { className: "empty-state-msg" }, search ? `No results for "${search}"` : "No students available."))) : /* @__PURE__ */ React.createElement("div", { className: "card-body no-pad" }, /* @__PURE__ */ React.createElement("div", { className: "data-table-wrap", style: { overflowX: "auto" } }, /* @__PURE__ */ React.createElement("table", { className: "data-table" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Student"), /* @__PURE__ */ React.createElement("th", null, "Status"), /* @__PURE__ */ React.createElement("th", null, "Classroom"), showAge && /* @__PURE__ */ React.createElement("th", null, "Age"), showDiscount && /* @__PURE__ */ React.createElement("th", null, "Discount"), /* @__PURE__ */ React.createElement("th", null, "Last Updated"))), /* @__PURE__ */ React.createElement("tbody", null, students.map((s, i) => {
      const name = s.name || s.Name || s.FullName || s.fullName || "Unknown";
      const status = (s.Status || s.status || "").trim();
      const rawPhoto = s.photo || s.Photo || "";
      const photo = rawPhoto && !rawPhoto.startsWith("http") ? `${API_BASE}${rawPhoto.startsWith("/") ? "" : "/"}${rawPhoto}` : rawPhoto;
      const classroom = s.classroom || s.classroom_name || s.classroomName || s.Classroom || "\u2014";
      const code = s.code || s.Code || "";
      const age = calculateAge(s.birthdate || s.BirthDate);
      const discount = s.discount || s.Discount || "";
      return /* @__PURE__ */ React.createElement("tr", { key: s.Id || s.id || i, onClick: () => setEditingStudent(s), style: { cursor: "pointer" }, className: "hoverable-row" }, /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("div", { className: "cell-user" }, /* @__PURE__ */ React.createElement(Avatar, { name, photoUrl: photo, id: s.Id || s.id, size: 36 }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "cell-name" }, name), code && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "0.75rem", color: "var(--color-text-light)" } }, "#", code)))), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("span", { className: `status-chip ${statusClass(status)}` }, status || "\u2014")), /* @__PURE__ */ React.createElement("td", null, classroom), showAge && /* @__PURE__ */ React.createElement("td", null, age !== null ? `${age}y` : "\u2014"), showDiscount && /* @__PURE__ */ React.createElement("td", null, discount ? `${discount}%` : "\u2014"), /* @__PURE__ */ React.createElement("td", { style: { color: "var(--color-text-light)", fontSize: "0.82rem" } }, formatDateShort(s.eoidate || s.datediscontinued || s.birthdate) || "\u2014"));
    })))), hasMore && /* @__PURE__ */ React.createElement("div", { style: { padding: 24, textAlign: "center", borderTop: "1px solid var(--color-border)" } }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", onClick: loadMore, disabled: loadingMore }, loadingMore ? "Loading..." : "Load More Students")))));
  };
  var SectionHeader = ({ title, icon }) => /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, margin: "20px 0 14px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 12, background: "rgba(80,172,85,0.08)", border: "1px solid rgba(80,172,85,0.3)" } }, icon && /* @__PURE__ */ React.createElement(Icon, { name: icon, size: 16, style: { color: "var(--color-primary)" } }), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "0.95rem", fontWeight: 700, color: "var(--color-primary)" } }, title)), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, height: 2, borderRadius: 2, background: "rgba(80,172,85,0.3)" } }));
  var AttendanceEditModal = ({ record, onClose, onSaved }) => {
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [type, setType] = useState((record.Type || record.type || "").toString() || "Absent");
    const [note, setNote] = useState((record.Note || record.note || record.NoteText || "").toString());
    const [date, setDate] = useState(() => {
      const d = new Date(record.Date || record.date || record.CreatedOn);
      if (isNaN(d.getTime())) return "";
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    });
    const handleSave = async () => {
      setSaving(true);
      try {
        const payload = { Id: record.Id || record.id };
        if (type !== (record.Type || record.type || "")) payload.Type = type;
        if (note !== (record.Note || record.note || record.NoteText || "")) payload.Note = note;
        if (date) {
          const newD = new Date(date).toISOString();
          const oldD = new Date(record.Date || record.date).toISOString();
          if (newD !== oldD) payload.Date = newD;
        }
        if (Object.keys(payload).length > 1) {
          await api.patch("/api/teacherAttendance", payload);
          onSaved();
        } else {
          onClose();
        }
      } catch (e) {
        alert("Save failed: " + (e.response?.data?.message || e.message));
      } finally {
        setSaving(false);
      }
    };
    const handleDelete = async () => {
      if (!confirm("Delete this attendance record?")) return;
      setDeleting(true);
      try {
        await api.delete(`/api/teacherAttendance/${record.Id || record.id}`);
        onSaved();
      } catch (e) {
        alert("Delete failed: " + (e.response?.data?.message || e.message));
      } finally {
        setDeleting(false);
      }
    };
    return /* @__PURE__ */ React.createElement(GlobalCanvasPortal, null, /* @__PURE__ */ React.createElement("div", { className: "modal-overlay", style: { zIndex: 1e3 }, onClick: onClose }, /* @__PURE__ */ React.createElement("div", { className: "modal-box", style: { maxWidth: 400, width: "90%", padding: 20 }, onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 } }, /* @__PURE__ */ React.createElement("h3", { style: { margin: 0, fontSize: "1.2rem", fontWeight: 700 } }, "Edit Attendance"), /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", onClick: onClose, style: { padding: "0.4rem", border: "none", background: "transparent" } }, /* @__PURE__ */ React.createElement(Icon, { name: "x", size: 20 }))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 16 } }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setType("Absent"), style: { flex: 1, padding: "12px", borderRadius: 10, border: type === "Absent" ? "none" : "1px solid #ccc", background: type === "Absent" ? "#dc2626" : "transparent", color: type === "Absent" ? "#fff" : "#333", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" } }, "Absent"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setType("Present"), style: { flex: 1, padding: "12px", borderRadius: 10, border: type === "Present" ? "none" : "1px solid #ccc", background: type === "Present" ? "#50AC55" : "transparent", color: type === "Present" ? "#fff" : "#333", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" } }, "Present")), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 16 } }, /* @__PURE__ */ React.createElement("label", { style: { display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: 6, color: "var(--color-text-muted)" } }, "Date & Time"), /* @__PURE__ */ React.createElement("input", { type: "datetime-local", value: date, onChange: (e) => setDate(e.target.value), className: "form-input", style: { width: "100%", boxSizing: "border-box" } })), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 24 } }, /* @__PURE__ */ React.createElement("label", { style: { display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: 6, color: "var(--color-text-muted)" } }, "Note"), /* @__PURE__ */ React.createElement("textarea", { value: note, onChange: (e) => setNote(e.target.value), className: "form-input", rows: 3, style: { width: "100%", boxSizing: "border-box" } })), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 12 } }, /* @__PURE__ */ React.createElement("button", { className: "btn", onClick: handleDelete, disabled: deleting || saving, style: { flex: 1, border: "1px solid #dc2626", color: "#dc2626", background: "transparent", padding: "10px", borderRadius: 10, fontWeight: 600 } }, deleting ? "Deleting..." : "Delete"), /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: handleSave, disabled: saving || deleting, style: { flex: 1, padding: "10px", borderRadius: 10, fontWeight: 600 } }, saving ? "Saving..." : "Save")))));
  };
  var UserEditModal = ({ user, onClose, onSaved }) => {
    const isCreate = !user;
    const [loading, setLoading] = useState(!isCreate);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [photoUploading, setPhotoUploading] = useState(false);
    const [loadError, setLoadError] = useState(null);
    const [permOptions, setPermOptions] = useState([]);
    const [selectedPerms, setSelectedPerms] = useState(/* @__PURE__ */ new Set());
    const photoInputRef = useRef(null);
    const [activeTab, setActiveTab] = useState(0);
    const [showPhotoMenu, setShowPhotoMenu] = useState(false);
    const [f, setF] = useState({});
    const [currentPhoto, setCurrentPhoto] = useState("");
    const [canUpdate, setCanUpdate] = useState(isCreate);
    const [canDelete, setCanDelete] = useState(false);
    const [attRecords, setAttRecords] = useState([]);
    const [attLoading, setAttLoading] = useState(false);
    const [attLoadingMore, setAttLoadingMore] = useState(false);
    const [attSortAsc, setAttSortAsc] = useState(false);
    const [attHasMore, setAttHasMore] = useState(true);
    const [attLoaded, setAttLoaded] = useState(false);
    const [editAttRecord, setEditAttRecord] = useState(null);
    const tabs = isCreate ? ["User Details", "Employment Details", "Work With Children Details", "EOI Details"] : ["User Details", "Employment Details", "Work With Children Details", "Attendance", "EOI Details"];
    useEffect(() => {
      if (isCreate) {
        setF({ Status: "Current" });
        setLoading(false);
        loadPermOptions();
        return;
      }
      const userId = user?.Id || user?.id;
      if (!userId) return;
      setLoading(true);
      api.get(`/api/users/${userId}`, { params: { details: true } }).then((res) => {
        const u = res.data?.data || res.data || {};
        setF(u);
        setCurrentPhoto(toAbsoluteAssetUrl(u.Photo || u.photo || ""));
        const xUpdate = res.headers?.["x-update"];
        const xDelete = res.headers?.["x-delete"];
        setCanUpdate(xUpdate === "true" || xUpdate === true || true);
        setCanDelete(xDelete === "true" || xDelete === true);
        let perms = u.Permissions || u.permissions;
        if (typeof perms === "string") {
          try {
            perms = JSON.parse(perms);
          } catch {
            perms = null;
          }
        }
        if (perms && typeof perms === "object") {
          const ids = /* @__PURE__ */ new Set();
          if (Array.isArray(perms)) perms.forEach((v2) => ids.add(String(v2)));
          else Object.values(perms).forEach((v2) => ids.add(String(v2)));
          setSelectedPerms(ids);
        }
        loadPermOptions();
      }).catch((e) => setLoadError(e.message)).finally(() => setLoading(false));
    }, []);
    const loadAttendance = (reset = false, sortAsc = attSortAsc) => {
      const userId = user?.Id || user?.id;
      if (!userId) return;
      const currentLoaded = reset ? 0 : attRecords.length;
      if (reset) {
        setAttLoading(true);
        setAttHasMore(true);
      } else {
        setAttLoadingMore(true);
      }
      api.get("/api/teacherAttendance", { params: { filter: `TeacherId eq '${userId}'`, orderby: sortAsc ? "date asc" : "date desc", l: currentLoaded } }).then((res) => {
        const data = res.data;
        const list = Array.isArray(data) ? data : data?.data || data?.records || [];
        if (reset) setAttRecords(list);
        else setAttRecords((prev) => [...prev, ...list]);
        setAttHasMore(list.length > 0);
      }).catch(() => {
        if (reset) setAttRecords([]);
      }).finally(() => {
        setAttLoading(false);
        setAttLoadingMore(false);
        setAttLoaded(true);
      });
    };
    const handleAttScroll = (e) => {
      const bottom = e.target.scrollHeight - e.target.scrollTop <= e.target.clientHeight + 50;
      if (bottom && attHasMore && !attLoadingMore) {
        loadAttendance(false, attSortAsc);
      }
    };
    useEffect(() => {
      const attTabIndex = isCreate ? -1 : 3;
      if (activeTab === attTabIndex && !attLoaded && !isCreate) {
        loadAttendance(true, attSortAsc);
      }
    }, [activeTab]);
    const loadPermOptions = () => {
      api.get("/api/options", { params: { t: "perm" } }).then((res) => {
        const data = res.data;
        let list = Array.isArray(data) ? data : data?.data || [];
        setPermOptions(list.map((item) => ({
          id: item.Id ?? item.id ?? item.Value ?? item.value,
          label: item.Key ?? item.key ?? item.Description ?? item.description ?? String(item.Value ?? item.value),
          value: item.Value ?? item.value ?? item.Id ?? item.id
        })));
      }).catch(() => {
      });
    };
    const v = (key) => f[key] ?? "";
    const setV = (key, val) => setF((prev) => ({ ...prev, [key]: val }));
    const handleInput = (e) => {
      const { name, value, type, checked } = e.target;
      setV(name, type === "checkbox" ? checked : value);
    };
    const dateVal = (key) => {
      const raw = v(key);
      if (!raw) return "";
      const s = String(raw);
      return s.length >= 10 ? s.substring(0, 10) : s;
    };
    const handlePhotoUpload = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";
      setPhotoUploading(true);
      try {
        const userId = f.Id || f.id;
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const uuid = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const blobPath = `avatars/${uuid}.${ext}`;
        const urlRes = await api.post("/api/getUploadUrls", [blobPath], { headers: { "Content-Type": "application/json" } });
        const urls = Array.isArray(urlRes.data) ? urlRes.data : urlRes.data?.urls || urlRes.data?.data || [];
        let sasUrl = urls.length > 0 ? typeof urls[0] === "string" ? urls[0] : urls[0]?.url || urls[0]?.sasurl || "" : "";
        if (!sasUrl) throw new Error("No upload URL");
        await fetch(sasUrl, { method: "PUT", headers: { "x-ms-blob-type": "BlockBlob", "Content-Type": file.type || "image/jpeg" }, body: file });
        let cleanUrl;
        try {
          const p = new URL(sasUrl);
          cleanUrl = `${p.origin}${p.pathname}`;
        } catch {
          cleanUrl = sasUrl.split("?")[0];
        }
        if (userId) await api.post("/api/updatePhoto", { id: userId, type: "user", url: cleanUrl });
        setCurrentPhoto(cleanUrl + "?v=" + Date.now());
      } catch (err) {
        alert("Photo upload failed: " + err.message);
      } finally {
        setPhotoUploading(false);
        setShowPhotoMenu(false);
      }
    };
    const handlePhotoRemove = async () => {
      const userId = f.Id || f.id;
      if (!userId) return;
      setPhotoUploading(true);
      try {
        await api.post("/api/updatePhoto", { id: userId, type: "user", url: "" });
        setCurrentPhoto("");
      } catch (err) {
        alert("Remove failed: " + err.message);
      } finally {
        setPhotoUploading(false);
        setShowPhotoMenu(false);
      }
    };
    const handleSave = async () => {
      const fn = (f.FirstName || "").trim();
      const ln = (f.LastName || "").trim();
      const role = (f.Role || "").trim();
      const sch = (f.SchoolEmail || "").trim();
      if (isCreate && (!fn || !ln || !role || !sch)) return alert("First Name, Last Name, Role and School Email are required");
      if (!isCreate && (!fn || !ln)) return alert("First Name and Last Name are required");
      setSaving(true);
      try {
        const payload = { ...f };
        if (selectedPerms.size > 0) {
          const permObj = {};
          permOptions.forEach((opt) => {
            if (selectedPerms.has(String(opt.value))) permObj[opt.label] = Number(opt.value);
          });
          payload.Permissions = permObj;
        }
        delete payload.Id;
        delete payload.id;
        if (payload.FirstLanguage === "Other" && payload.FirstLanguageOther) {
          payload.FirstLanguage = payload.FirstLanguageOther;
        }
        delete payload.FirstLanguageOther;
        if (isCreate) {
          await api.post("/api/users", payload);
        } else {
          await api.patch(`/api/users/${user.Id || user.id}`, payload);
        }
        onSaved();
        onClose();
      } catch (e) {
        alert("Failed to save: " + (e.response?.data?.message || e.message));
      } finally {
        setSaving(false);
      }
    };
    const handleDelete = async () => {
      if (!confirm("Delete this user? This action cannot be undone.")) return;
      setDeleting(true);
      try {
        await api.delete(`/api/users/${user.Id || user.id}`);
        onSaved();
        onClose();
      } catch (e) {
        alert("Delete failed: " + (e.response?.data?.message || e.message));
      } finally {
        setDeleting(false);
      }
    };
    const exportAttendance = async () => {
      const userId = user?.Id || user?.id;
      if (!userId) return;
      try {
        const res = await api.get(`/api/teacherAttendance/export`, {
          params: {
            filter: `TeacherId eq '${userId}'`,
            orderby: attSortAsc ? "date asc" : "date desc"
          },
          responseType: "blob"
        });
        const blob = new Blob([res.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `teacher_attendance_${Date.now()}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
      } catch (e) {
        alert("Export failed: " + (e.response?.data?.message || e.message));
      }
    };
    const ls = { display: "block", marginBottom: 6, fontSize: "0.8rem", fontWeight: 500, color: "#6b7280" };
    const lsReq = (label) => /* @__PURE__ */ React.createElement("label", { style: ls }, label, " ", /* @__PURE__ */ React.createElement("span", { style: { color: "#c2410c" } }, "*"));
    const row4 = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 };
    const row3 = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 };
    const row2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 };
    const stateOpts = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"];
    const firstLang = v("FirstLanguage");
    const SegmentedToggle = ({ options, value, onChange, name }) => /* @__PURE__ */ React.createElement("div", { style: { display: "flex", border: "1.5px solid var(--color-primary)", borderRadius: 12, overflow: "hidden" } }, options.map((opt) => {
      const isActive = value === opt;
      return /* @__PURE__ */ React.createElement("button", {
        key: opt, type: "button", onClick: () => onChange(name, opt), style: {
          flex: 1,
          padding: "0.6rem 0.85rem",
          border: "none",
          cursor: "pointer",
          fontSize: "0.85rem",
          fontWeight: 600,
          background: isActive ? "var(--color-primary)" : "#fff",
          color: isActive ? "#fff" : "var(--color-primary)",
          transition: "all 0.2s ease"
        }
      }, opt);
    }));
    const SectionLabel = ({ title }) => /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, fontSize: "0.92rem", color: "#1a1a2e", margin: "24px 0 14px" } }, title);
    if (loading) {
      return /* @__PURE__ */ React.createElement("div", { style: { padding: 24 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 24 } }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", onClick: onClose, style: { padding: "0.4rem 0.8rem" } }, /* @__PURE__ */ React.createElement(Icon, { name: "arrow-left", size: 16 })), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "1.2rem", fontWeight: 700 } }, isCreate ? "Create User" : "Edit User")), /* @__PURE__ */ React.createElement("div", { style: { borderTop: "1px solid var(--color-border)", paddingTop: 20 } }, /* @__PURE__ */ React.createElement(TableSkeleton, { rows: 12, cols: 2 })));
    }
    if (loadError) {
      return /* @__PURE__ */ React.createElement("div", { style: { padding: 24 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 24 } }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", onClick: onClose, style: { padding: "0.4rem 0.8rem" } }, /* @__PURE__ */ React.createElement(Icon, { name: "arrow-left", size: 16 })), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "1.2rem", fontWeight: 700 } }, "Edit User")), /* @__PURE__ */ React.createElement("div", { className: "empty-state" }, /* @__PURE__ */ React.createElement(Icon, { name: "alert-circle", size: 40 }), /* @__PURE__ */ React.createElement("p", { className: "empty-state-title" }, loadError)));
    }
    const renderUserDetails = () => /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(SectionLabel, { title: "Personal Details" }), /* @__PURE__ */ React.createElement("div", { style: row4 }, /* @__PURE__ */ React.createElement("div", null, lsReq("First Name"), /* @__PURE__ */ React.createElement("input", { name: "FirstName", value: v("FirstName"), onChange: handleInput, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, lsReq("Last Name"), /* @__PURE__ */ React.createElement("input", { name: "LastName", value: v("LastName"), onChange: handleInput, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Gender"), /* @__PURE__ */ React.createElement(SegmentedToggle, { options: ["Male", "Female"], value: v("Gender"), onChange: setV, name: "Gender" })), /* @__PURE__ */ React.createElement("div", null, lsReq("Date of Birth"), /* @__PURE__ */ React.createElement("input", { type: "date", name: "BirthDate", value: dateVal("BirthDate"), onChange: handleInput, className: "form-input" }))), /* @__PURE__ */ React.createElement(SectionLabel, { title: "Contact Details:" }), /* @__PURE__ */ React.createElement("div", { style: row2 }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 14 } }, /* @__PURE__ */ React.createElement("div", null, lsReq("Mobile"), /* @__PURE__ */ React.createElement("input", { name: "Mobile", value: v("Mobile"), onChange: handleInput, className: "form-input", placeholder: "0400..." })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Personal Email"), /* @__PURE__ */ React.createElement("input", { name: "Email", value: v("Email"), onChange: handleInput, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "School Email"), /* @__PURE__ */ React.createElement("input", { name: "SchoolEmail", value: v("SchoolEmail"), onChange: handleInput, className: "form-input" }))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 14 } }, /* @__PURE__ */ React.createElement("div", null, lsReq("Line Address"), /* @__PURE__ */ React.createElement("input", { name: "Address", value: v("Address"), onChange: handleInput, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, lsReq("Suburb"), /* @__PURE__ */ React.createElement("input", { name: "Suburb", value: v("Suburb"), onChange: handleInput, className: "form-input" })), /* @__PURE__ */ React.createElement("div", { style: row2 }, /* @__PURE__ */ React.createElement("div", null, lsReq("State"), /* @__PURE__ */ React.createElement("select", { name: "State", value: v("State"), onChange: handleInput, className: "form-input" }, /* @__PURE__ */ React.createElement("option", { value: "" }, "\u2014"), stateOpts.map((s) => /* @__PURE__ */ React.createElement("option", { key: s, value: s }, s)))), /* @__PURE__ */ React.createElement("div", null, lsReq("Postal Code"), /* @__PURE__ */ React.createElement("input", { name: "PostalCode", value: v("PostalCode"), onChange: handleInput, className: "form-input", maxLength: 4 })))))));
    const renderEmploymentDetails = () => /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(SectionLabel, { title: "Recruitment Details" }), /* @__PURE__ */ React.createElement("div", { style: row4 }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Employee ID"), /* @__PURE__ */ React.createElement("input", { name: "EmployeeId", value: v("EmployeeId"), onChange: handleInput, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Recruitment Date"), /* @__PURE__ */ React.createElement("input", { type: "date", name: "RecruitmentDate", value: dateVal("RecruitmentDate"), onChange: handleInput, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Position"), /* @__PURE__ */ React.createElement("select", { name: "PreferredPosition", value: v("PreferredPosition"), onChange: handleInput, className: "form-input" }, /* @__PURE__ */ React.createElement("option", { value: "" }, "\u2014"), /* @__PURE__ */ React.createElement("option", { value: "Arabic for beginners" }, "Arabic for beginners"), /* @__PURE__ */ React.createElement("option", { value: "Arabic for intermediate students" }, "Arabic for intermediate"), /* @__PURE__ */ React.createElement("option", { value: "Arabic for advanced students" }, "Arabic for advanced"), /* @__PURE__ */ React.createElement("option", { value: "Quran recitation" }, "Quran recitation"))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Notes"), /* @__PURE__ */ React.createElement("textarea", { name: "Notes", value: v("Notes"), onChange: handleInput, className: "form-input", rows: 1, style: { resize: "vertical" } }))), /* @__PURE__ */ React.createElement("div", { style: { ...row2, marginTop: 18 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Status"), /* @__PURE__ */ React.createElement("select", {
      name: "Status", value: v("Status"), onChange: (e) => {
        setV("Status", e.target.value);
        if (e.target.value === "Resigned" && !v("EmploymentEnd")) setV("EmploymentEnd", (/* @__PURE__ */ new Date()).toISOString().substring(0, 10));
      }, className: "form-input"
    }, /* @__PURE__ */ React.createElement("option", { value: "Current" }, "Current"), /* @__PURE__ */ React.createElement("option", { value: "Pending" }, "Pending"), /* @__PURE__ */ React.createElement("option", { value: "Resigned" }, "Resigned"), /* @__PURE__ */ React.createElement("option", { value: "NEW" }, "NEW"))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Access Level"), /* @__PURE__ */ React.createElement(SegmentedToggle, { options: ["Admin", "Teacher"], value: v("Role"), onChange: setV, name: "Role" }))), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 18 } }, /* @__PURE__ */ React.createElement("label", { style: ls }, "Permissions"), /* @__PURE__ */ React.createElement("div", { style: { border: "1px solid var(--color-border)", borderRadius: 10, padding: 12, background: "var(--color-bg)" } }, permOptions.length === 0 ? /* @__PURE__ */ React.createElement("span", { style: { color: "#999", fontSize: "0.85rem" } }, "Loading permissions\u2026") : /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 8 } }, permOptions.map((opt) => {
      const sel = selectedPerms.has(String(opt.value));
      return /* @__PURE__ */ React.createElement("label", { key: opt.value, style: { display: "flex", alignItems: "center", gap: 6, cursor: "pointer", padding: "4px 10px", borderRadius: 8, border: `1px solid ${sel ? "var(--color-primary)" : "var(--color-border)"}`, background: sel ? "rgba(80,172,85,0.08)" : "transparent", fontSize: "0.82rem", fontWeight: sel ? 600 : 400 } }, /* @__PURE__ */ React.createElement("input", {
        type: "checkbox", checked: sel, onChange: () => {
          const next = new Set(selectedPerms);
          if (sel) next.delete(String(opt.value));
          else next.add(String(opt.value));
          setSelectedPerms(next);
        }, style: { accentColor: "var(--color-primary)", width: 15, height: 15 }
      }), opt.label);
    })))), /* @__PURE__ */ React.createElement(SectionLabel, { title: "Tax & Banking Details" }), /* @__PURE__ */ React.createElement("div", { style: row3 }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Tax File Number"), /* @__PURE__ */ React.createElement("input", { name: "tfn", value: v("tfn"), onChange: handleInput, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Bank State Branch"), /* @__PURE__ */ React.createElement("input", { name: "bsb", value: v("bsb"), onChange: handleInput, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Bank Account Number"), /* @__PURE__ */ React.createElement("input", { name: "accountnumber", value: v("accountnumber"), onChange: handleInput, className: "form-input" }))));
    const renderWWCDetails = () => /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { ...row4, marginTop: 20 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Work with children Check"), /* @__PURE__ */ React.createElement(SegmentedToggle, { options: ["Yes", "No"], value: f.HasWWCC ? "Yes" : "No", onChange: (_, val) => setV("HasWWCC", val === "Yes"), name: "HasWWCC" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Work with children No."), /* @__PURE__ */ React.createElement("input", { name: "WWCNumber", value: v("WWCNumber"), onChange: handleInput, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Work with children Expiry"), /* @__PURE__ */ React.createElement("input", { type: "date", name: "WWCExpiry", value: dateVal("WWCExpiry"), onChange: handleInput, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Work with children Type"), /* @__PURE__ */ React.createElement("input", { name: "WWCType", value: v("WWCType"), onChange: handleInput, className: "form-input" }))), /* @__PURE__ */ React.createElement("div", { style: { ...row4, marginTop: 14 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Superfund"), /* @__PURE__ */ React.createElement("input", { name: "superfund", value: v("superfund"), onChange: handleInput, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Superfund ABN"), /* @__PURE__ */ React.createElement("input", { name: "superfundabn", value: v("superfundabn"), onChange: handleInput, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Superfund USI"), /* @__PURE__ */ React.createElement("input", { name: "fundusi", value: v("fundusi"), onChange: handleInput, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Member Account No."), /* @__PURE__ */ React.createElement("input", { name: "memberaccno", value: v("memberaccno"), onChange: handleInput, className: "form-input" }))), /* @__PURE__ */ React.createElement("div", { style: { ...row4, marginTop: 14 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Superfund Product Name"), /* @__PURE__ */ React.createElement("input", { name: "superproductname", value: v("superproductname"), onChange: handleInput, className: "form-input" }))));
    const renderAttendance = () => {
      return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: 8, margin: "16px 0" } }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", style: { padding: "0.35rem 0.6rem" }, title: "Export as Excel", onClick: exportAttendance }, /* @__PURE__ */ React.createElement(Icon, { name: "grid", size: 16, style: { marginRight: 4 } }), " Export Excel")), attLoading ? /* @__PURE__ */ React.createElement(TableSkeleton, { rows: 6, cols: 3 }) : attRecords.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "empty-state", style: { padding: "40px 0" } }, /* @__PURE__ */ React.createElement(Icon, { name: "calendar", size: 36 }), /* @__PURE__ */ React.createElement("p", { className: "empty-state-title" }, "No attendance records")) : /* @__PURE__ */ React.createElement("div", { className: "table-wrapper", style: { maxHeight: 400, overflowY: "auto" }, onScroll: handleAttScroll }, /* @__PURE__ */ React.createElement("table", { className: "data-table", style: { position: "relative" } }, /* @__PURE__ */ React.createElement("thead", { style: { position: "sticky", top: 0, background: "#fff", zIndex: 1, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" } }, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", {
        style: { cursor: "pointer", userSelect: "none", background: "#f8fafc" }, onClick: () => {
          setAttSortAsc(!attSortAsc);
          loadAttendance(true, !attSortAsc);
        }
      }, "Date ", /* @__PURE__ */ React.createElement(Icon, { name: attSortAsc ? "chevron-up" : "chevron-down", size: 12, style: { verticalAlign: "middle", marginLeft: 4 } })), /* @__PURE__ */ React.createElement("th", { style: { background: "#f8fafc" } }, "Status"), /* @__PURE__ */ React.createElement("th", { style: { background: "#f8fafc" } }, "Note"))), /* @__PURE__ */ React.createElement("tbody", null, attRecords.map((r, i) => {
        const type = (r.Type || r.type || "").toString();
        const color = type.toLowerCase() === "present" ? "#50AC55" : "#dc2626";
        const bgColor = type.toLowerCase() === "present" ? "rgba(80,172,85,0.12)" : "rgba(220,38,38,0.12)";
        return /* @__PURE__ */ React.createElement("tr", { key: i, onClick: () => canUpdate ? setEditAttRecord(r) : null, style: { cursor: canUpdate ? "pointer" : "default" } }, /* @__PURE__ */ React.createElement("td", null, formatDate(r.Date || r.date || r.CreatedOn)), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("span", { style: { display: "inline-block", padding: "4px 10px", borderRadius: 8, fontSize: "0.75rem", fontWeight: 700, background: bgColor, color } }, type || "\u2014")), /* @__PURE__ */ React.createElement("td", { style: { color: "var(--color-text-light)" } }, r.Note || r.note || "\u2014"));
      }))), attLoadingMore && /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "16px 0", color: "var(--color-text-muted)", fontSize: "0.9rem" } }, /* @__PURE__ */ React.createElement("div", { className: "spinner", style: { width: 16, height: 16, marginRight: 8, borderWidth: 2, display: "inline-block", verticalAlign: "middle" } }), " Loading more..."), !attHasMore && attRecords.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: "16px 0", color: "var(--color-text-muted)", fontSize: "0.85rem" } }, "End of records")));
    };
    const renderEOIDetails = () => /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { ...row4, marginTop: 20 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "EOI Number"), /* @__PURE__ */ React.createElement("input", { name: "EOINumber", value: v("EOINumber"), onChange: handleInput, className: "form-input", disabled: true, style: { backgroundColor: "#f3f4f6", color: "#6b7280", cursor: "not-allowed" } })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "EOI Date"), /* @__PURE__ */ React.createElement("input", { type: "date", name: "EOIDate", value: dateVal("EOIDate"), onChange: handleInput, className: "form-input", disabled: true, style: { backgroundColor: "#f3f4f6", color: "#6b7280", cursor: "not-allowed" } })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Preferred Arrangement"), /* @__PURE__ */ React.createElement("input", { name: "PreferredArrangement", value: v("PreferredArrangement"), onChange: handleInput, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Preferred Position"), /* @__PURE__ */ React.createElement("select", { name: "PreferredPosition", value: v("PreferredPosition"), onChange: handleInput, className: "form-input" }, /* @__PURE__ */ React.createElement("option", { value: "" }, "\u2014"), /* @__PURE__ */ React.createElement("option", { value: "Arabic for beginners" }, "Arabic for beginners"), /* @__PURE__ */ React.createElement("option", { value: "Arabic for intermediate students" }, "Arabic for intermediate"), /* @__PURE__ */ React.createElement("option", { value: "Arabic for advanced students" }, "Arabic for advanced"), /* @__PURE__ */ React.createElement("option", { value: "Quran recitation" }, "Quran recitation")))), /* @__PURE__ */ React.createElement("div", { style: { ...row4, marginTop: 14 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Qualification"), /* @__PURE__ */ React.createElement("input", { name: "Qualification", value: v("Qualification"), onChange: handleInput, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Qualification Date"), /* @__PURE__ */ React.createElement("input", { type: "date", name: "QualificationDate", value: dateVal("QualificationDate"), onChange: handleInput, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Institution"), /* @__PURE__ */ React.createElement("input", { name: "Institution", value: v("Institution"), onChange: handleInput, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Education Level"), /* @__PURE__ */ React.createElement("select", { name: "EduLevel", value: v("EduLevel"), onChange: handleInput, className: "form-input" }, /* @__PURE__ */ React.createElement("option", { value: "" }, "\u2014"), ["Bachelor's Degree", "Diploma", "Doctorate Degree", "Graduate Certificate", "High School Certificate", "Master's Degree", "Non-Degree Program", "Technical Qualification"].map((e) => /* @__PURE__ */ React.createElement("option", { key: e, value: e }, e))))), /* @__PURE__ */ React.createElement("div", { style: { ...row3, marginTop: 14 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Education Description"), /* @__PURE__ */ React.createElement("textarea", { name: "EduDescription", value: v("EduDescription"), onChange: handleInput, className: "form-input", rows: 2, style: { resize: "vertical" } })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Cover Letter"), /* @__PURE__ */ React.createElement("textarea", { name: "CoverLetter", value: v("CoverLetter"), onChange: handleInput, className: "form-input", rows: 2, style: { resize: "vertical" } })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Mother Tongue"), /* @__PURE__ */ React.createElement("select", { name: "FirstLanguage", value: ["Arabic", "English", "Other"].includes(firstLang) ? firstLang : firstLang ? "Other" : "", onChange: (e) => setV("FirstLanguage", e.target.value), className: "form-input" }, /* @__PURE__ */ React.createElement("option", { value: "" }, "\u2014"), /* @__PURE__ */ React.createElement("option", { value: "Arabic" }, "Arabic"), /* @__PURE__ */ React.createElement("option", { value: "English" }, "English"), /* @__PURE__ */ React.createElement("option", { value: "Other" }, "Other")))), (firstLang === "Other" || !["Arabic", "English", ""].includes(firstLang) && firstLang) && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 14, maxWidth: "25%" } }, /* @__PURE__ */ React.createElement("label", { style: ls }, "First Language (specify)"), /* @__PURE__ */ React.createElement("input", { name: "FirstLanguageOther", value: v("FirstLanguageOther") || (!["Arabic", "English", "Other"].includes(firstLang) ? firstLang : ""), onChange: handleInput, className: "form-input" })), /* @__PURE__ */ React.createElement(SectionLabel, { title: "Previous Employment Experience" }), /* @__PURE__ */ React.createElement("div", { style: row4 }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Previous Employer"), /* @__PURE__ */ React.createElement("input", { name: "PrevEmployer", value: v("PrevEmployer"), onChange: handleInput, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Previous Position"), /* @__PURE__ */ React.createElement("input", { name: "PrevPosition", value: v("PrevPosition"), onChange: handleInput, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Previous Employer Two"), /* @__PURE__ */ React.createElement("input", { name: "PrevEmployerTwo", value: v("PrevEmployerTwo"), onChange: handleInput, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Previous Position Two"), /* @__PURE__ */ React.createElement("input", { name: "PrevPositionTwo", value: v("PrevPositionTwo"), onChange: handleInput, className: "form-input" }))), /* @__PURE__ */ React.createElement("div", { style: { ...row4, marginTop: 14 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Start Date"), /* @__PURE__ */ React.createElement("input", { type: "date", name: "PrevDateStart", value: dateVal("PrevDateStart"), onChange: handleInput, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "End Date"), /* @__PURE__ */ React.createElement("input", { type: "date", name: "PrevDateEnd", value: dateVal("PrevDateEnd"), onChange: handleInput, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Start Date Two"), /* @__PURE__ */ React.createElement("input", { type: "date", name: "PrevDateStartTwo", value: dateVal("PrevDateStartTwo"), onChange: handleInput, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "End Date Two"), /* @__PURE__ */ React.createElement("input", { type: "date", name: "PrevDateEndTwo", value: dateVal("PrevDateEndTwo"), onChange: handleInput, className: "form-input" }))), /* @__PURE__ */ React.createElement("div", { style: { ...row4, marginTop: 14 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Achievement"), /* @__PURE__ */ React.createElement("textarea", { name: "PrevAchievement", value: v("PrevAchievement"), onChange: handleInput, className: "form-input", rows: 2, style: { resize: "vertical" } })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "End Date"), /* @__PURE__ */ React.createElement("input", { type: "date", name: "EmploymentEnd", value: dateVal("EmploymentEnd"), onChange: handleInput, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Achievement Two"), /* @__PURE__ */ React.createElement("textarea", { name: "PrevAchievementTwo", value: v("PrevAchievementTwo"), onChange: handleInput, className: "form-input", rows: 2, style: { resize: "vertical" } })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "End Date Two"), /* @__PURE__ */ React.createElement("input", { type: "date", name: "PrevDateEndTwo", value: dateVal("PrevDateEndTwo"), onChange: handleInput, className: "form-input" }))), /* @__PURE__ */ React.createElement("div", { style: { ...row4, marginTop: 14 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Reference Name"), /* @__PURE__ */ React.createElement("input", { name: "ReferenceNameOne", value: v("ReferenceNameOne"), onChange: handleInput, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Reference Phone"), /* @__PURE__ */ React.createElement("input", { name: "ReferencePhoneOne", value: v("ReferencePhoneOne"), onChange: handleInput, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Reference Name Two"), /* @__PURE__ */ React.createElement("input", { name: "ReferenceNameTwo", value: v("ReferenceNameTwo"), onChange: handleInput, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Reference Phone Two"), /* @__PURE__ */ React.createElement("input", { name: "ReferencePhoneTwo", value: v("ReferencePhoneTwo"), onChange: handleInput, className: "form-input" }))));
    const tabContent = isCreate ? [renderUserDetails, renderEmploymentDetails, renderWWCDetails, renderEOIDetails] : [renderUserDetails, renderEmploymentDetails, renderWWCDetails, renderAttendance, renderEOIDetails];
    return /* @__PURE__ */ React.createElement("div", { className: "user-edit-modal", style: { maxWidth: 1100, margin: "0 auto", padding: "0 24px 40px" } }, /* @__PURE__ */ React.createElement("style", null, `.user-edit-modal .form-input { background-color: #fff; }`), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 16, padding: "16px 0 12px" } }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", onClick: onClose, style: { padding: "0.4rem 0.7rem", border: "none", background: "transparent" } }, /* @__PURE__ */ React.createElement(Icon, { name: "arrow-left", size: 20 })), /* @__PURE__ */ React.createElement("div", { style: { position: "relative" } }, /* @__PURE__ */ React.createElement(Avatar, { name: `${v("FirstName")} ${v("LastName")}`, photoUrl: currentPhoto, id: f.Id || f.id, size: 70 }), photoUploading && /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" } }, /* @__PURE__ */ React.createElement("div", { className: "spinner", style: { width: 18, height: 18, borderWidth: 2, borderTopColor: "#fff" } })), /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", bottom: -5, right: -10 } }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", onClick: () => setShowPhotoMenu(!showPhotoMenu), style: { border: "1px solid #ccc", background: "#fff", padding: "0.1rem", borderRadius: "50%", cursor: "pointer", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" } }, /* @__PURE__ */ React.createElement(Icon, { name: "edit-2", size: 12 })), showPhotoMenu && /* @__PURE__ */ React.createElement("div", { className: "dropdown-menu", style: { position: "absolute", top: "100%", left: 0, zIndex: 50, minWidth: 160, marginTop: 4, background: "#fff", border: "1px solid #ccc", borderRadius: 8, padding: 8, boxShadow: "0 4px 6px rgba(0,0,0,0.1)" } }, /* @__PURE__ */ React.createElement("input", { ref: photoInputRef, type: "file", accept: "image/*", style: { display: "none" }, onChange: handlePhotoUpload }), /* @__PURE__ */ React.createElement("button", {
      className: "dropdown-item", onClick: () => {
        photoInputRef.current?.click();
      }, style: { display: "block", width: "100%", textAlign: "left", padding: "8px", background: "transparent", border: "none", cursor: "pointer" }
    }, /* @__PURE__ */ React.createElement(Icon, { name: "upload", size: 14, style: { marginRight: 6 } }), " ", currentPhoto ? "Change Photo" : "Upload Photo"), currentPhoto && /* @__PURE__ */ React.createElement("button", { className: "dropdown-item", style: { display: "block", width: "100%", textAlign: "left", padding: "8px", background: "transparent", border: "none", cursor: "pointer", color: "#dc2626" }, onClick: handlePhotoRemove }, /* @__PURE__ */ React.createElement(Icon, { name: "trash-2", size: 14, style: { marginRight: 6 } }), " Remove Photo")))), !isCreate && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", justifyContent: "center", marginLeft: 8, alignItems: "flex-start", textAlign: "left" } }, /* @__PURE__ */ React.createElement("h2", { style: { fontSize: "1.6rem", fontWeight: 800, color: "var(--color-text-main)", margin: "0 0 6px 0", lineHeight: 1 } }, `${v("FirstName")} ${v("LastName")}`.trim() || "Teacher"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, marginLeft: -10 } }, /* @__PURE__ */ React.createElement("span", { className: `status-chip ${(v("Status") || "").toLowerCase() === "current" ? "status-active" : "status-pending"}`, style: { fontSize: "0.75rem", padding: "3px 10px" } }, v("Status") || "Current"), /* @__PURE__ */ React.createElement("span", { style: { color: "var(--color-border)" } }, "|"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "0.85rem", color: "var(--color-text-muted)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 } }, /* @__PURE__ */ React.createElement(Icon, { name: "shield", size: 14 }), " ", v("Role") || "Teacher"))), isCreate && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", justifyContent: "center", marginLeft: 8, alignItems: "flex-start", textAlign: "left" } }, /* @__PURE__ */ React.createElement("h2", { style: { fontSize: "1.6rem", fontWeight: 800, color: "var(--color-text-main)", margin: "0 0 6px 0", lineHeight: 1 } }, "Create User")), /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }), /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: handleSave, disabled: saving, style: { padding: "0.5rem 1.2rem" } }, /* @__PURE__ */ React.createElement(Icon, { name: "save", size: 15 }), " ", saving ? "Saving..." : "Save"), !isCreate && canDelete && /* @__PURE__ */ React.createElement("button", { className: "btn", style: { background: "#dc2626", color: "#fff", padding: "0.5rem 1rem", borderRadius: 8, marginLeft: 6 }, onClick: handleDelete, disabled: deleting }, /* @__PURE__ */ React.createElement(Icon, { name: "trash-2", size: 14 }), " ", deleting ? "Deleting..." : "Delete")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", borderBottom: "2px solid var(--color-border-light)", marginBottom: 0 } }, tabs.map((tab, i) => /* @__PURE__ */ React.createElement("button", {
      key: tab, onClick: () => setActiveTab(i), style: {
        padding: "10px 20px",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        fontSize: "0.88rem",
        fontWeight: activeTab === i ? 700 : 500,
        color: activeTab === i ? "#1a1a2e" : "#6b7280",
        borderBottom: activeTab === i ? "3px solid var(--color-primary)" : "3px solid transparent",
        marginBottom: "-2px",
        transition: "all 0.2s ease"
      }
    }, tab))), /* @__PURE__ */ React.createElement("div", { style: { paddingTop: 4 } }, tabContent[activeTab]?.()), /* @__PURE__ */ React.createElement("div", { style: { height: 40 } }), editAttRecord && /* @__PURE__ */ React.createElement(AttendanceEditModal, {
      record: editAttRecord, onClose: () => setEditAttRecord(null), onSaved: () => {
        setEditAttRecord(null);
        loadAttendance(true, attSortAsc);
      }
    }));
  };
  var TeachersPage = () => {
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("Current");
    const [error, setError] = useState(null);
    const [editingUser, setEditingUser] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [tick, setTick] = useState(0);
    const [showActionsMenu, setShowActionsMenu] = useState(false);
    const [attendanceMode, setAttendanceMode] = useState(false);
    const [attendanceIds, setAttendanceIds] = useState(/* @__PURE__ */ new Set());
    const [submittingAtt, setSubmittingAtt] = useState(false);
    const [showFiltersModal, setShowFiltersModal] = useState(false);
    const [sortRules, setSortRules] = useState([{ column: "firstname", desc: false }]);
    const [sortOptions, setSortOptions] = useState([]);
    const searchDebouncer = useRef(null);
    const [debouncedSearch, setDebouncedSearch] = useState("");
    useEffect(() => {
      api.get("/api/options", { params: { t: "usersSort" } }).then((res) => {
        const raw = res.data;
        let list = Array.isArray(raw) ? raw : raw?.data || [];
        setSortOptions(list.map((m) => ({
          label: m.Value || m.value || m.Key || m.key || "",
          column: m.Key || m.key || m.Value || m.value || ""
        })));
      });
    }, []);
    useEffect(() => {
      if (window.appTeacherFilter?.id) {
        setEditingUser({ id: window.appTeacherFilter.id });
        window.appTeacherFilter = null;
      }
      if (searchDebouncer.current) clearTimeout(searchDebouncer.current);
      searchDebouncer.current = setTimeout(() => {
        setDebouncedSearch(search);
      }, 350);
    }, [search]);
    const loadUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = {
          col: "Id,FirstName,LastName,name,photo,EmployeeId,category,Email,Role,Status",
          page: 1,
          limit: 100,
          a: 1
        };
        if (debouncedSearch.trim()) {
          params.filter = `name con '${debouncedSearch.replace(/'/g, "''")}'`;
        } else {
          params.status = statusFilter;
        }
        let orderby = sortRules.map((r) => `${r.column} ${r.desc ? "DESC" : "ASC"}`).join(",");
        if (orderby) params.orderby = orderby;
        const res = await api.get("/api/users", { params });
        const raw = res.data;
        let data = [];
        if (Array.isArray(raw)) data = raw;
        else if (raw && typeof raw === "object") {
          if (raw.success === false) data = [];
          else data = raw.data || raw.items || raw.results || [];
        }
        setUsers(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    useEffect(() => {
      loadUsers();
    }, [debouncedSearch, statusFilter, sortRules, tick]);
    const exportExcel = async () => {
      setShowActionsMenu(false);
      try {
        const params = {
          col: statusFilter === "Current" ? "Id,name,photo,EmployeeId,category" : statusFilter === "Pending" ? "Id,name,photo,eoidate,Category" : "Id,name,photo,EmployeeId,category,EmploymentEnd",
          status: statusFilter,
          limit: 1e4
        };
        if (debouncedSearch.trim()) params.filter = `name con '${debouncedSearch.replace(/'/g, "''")}'`;
        let orderby = sortRules.map((r) => `${r.column} ${r.desc ? "DESC" : "ASC"}`).join(",");
        if (orderby) params.orderby = orderby;
        const res = await api.get("/api/users/export", {
          params,
          responseType: "blob"
        });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement("a");
        a.href = url;
        a.download = `teachers_export_${DateTime.now().toFormat("yyyyMMdd")}.xlsx`;
        a.click();
      } catch (e) {
        alert("Export failed: " + e.message);
      }
    };
    const toggleAttId = (id) => setAttendanceIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
    const submitAttendance = async () => {
      if (submittingAtt) return;
      setSubmittingAtt(true);
      try {
        const res = await api.post("/api/teacherAttendance", [...attendanceIds]);
        if (res.status === 202 || res.status === 200 || res.status === 201) {
          setAttendanceMode(false);
          setAttendanceIds(/* @__PURE__ */ new Set());
          setTick((t) => t + 1);
        } else alert("Failed to mark attendance");
      } catch (e) {
        alert("Attendance error: " + e.message);
      } finally {
        setSubmittingAtt(false);
      }
    };
    if (editingUser || isCreating) {
      return /* @__PURE__ */ React.createElement(
        UserEditModal,
        {
          user: editingUser,
          onClose: () => {
            setEditingUser(null);
            setIsCreating(false);
          },
          onSaved: () => setTick((t) => t + 1)
        }
      );
    }
    return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "toolbar", style: { display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", marginBottom: "1.5rem", marginTop: "1rem" } }, /* @__PURE__ */ React.createElement("div", { className: "toolbar-search", style: { flex: 1, minWidth: 300 } }, /* @__PURE__ */ React.createElement("span", { className: "search-icon" }, /* @__PURE__ */ React.createElement(Icon, { name: "search", size: 16 })), /* @__PURE__ */ React.createElement("input", { type: "text", placeholder: "Search teachers\u2026", value: search, onChange: (e) => setSearch(e.target.value) })), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" } }, ["Current", "Pending", "Resigned"].map((s) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: s,
        onClick: () => {
          setStatusFilter(s);
          setSearch("");
        },
        className: `status-chip ${statusFilter === s ? statusClass(s) : ""}`,
        style: {
          cursor: "pointer",
          border: statusFilter === s ? "1px solid transparent" : "1px solid var(--color-border)",
          background: statusFilter === s ? void 0 : "transparent"
        }
      },
      s
    ))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginLeft: "auto" } }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary feed-tool-btn", title: "Filters & Sort", onClick: () => setShowFiltersModal(true) }, /* @__PURE__ */ React.createElement(Icon, { name: "filter", size: 16 }), /* @__PURE__ */ React.createElement("span", null, "Filters & Sort")), /* @__PURE__ */ React.createElement("div", { style: { position: "relative" } }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", onClick: () => setShowActionsMenu(!showActionsMenu) }, /* @__PURE__ */ React.createElement(Icon, { name: "more-horizontal", size: 18 }), " Actions"), showActionsMenu && /* @__PURE__ */ React.createElement("div", { className: "dropdown-menu shadow", style: { position: "absolute", right: 0, top: "100%", marginTop: 8, zIndex: 100, minWidth: 200 } }, /* @__PURE__ */ React.createElement("div", { className: "dropdown-item", onClick: exportExcel }, /* @__PURE__ */ React.createElement(Icon, { name: "file-text", size: 14, style: { marginRight: 8 } }), " Export as Excel"), /* @__PURE__ */ React.createElement("div", {
      className: "dropdown-item", onClick: () => {
        setShowActionsMenu(false);
        setAttendanceMode(true);
        setAttendanceIds(/* @__PURE__ */ new Set());
      }
    }, /* @__PURE__ */ React.createElement(Icon, { name: "check-circle", size: 14, style: { marginRight: 8 } }), " Take Attendance"))), /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: () => setIsCreating(true) }, /* @__PURE__ */ React.createElement(Icon, { name: "plus", size: 18 }), " New Teacher"))), /* @__PURE__ */ React.createElement("div", { className: "card" }, loading ? /* @__PURE__ */ React.createElement("div", { className: "card-body" }, /* @__PURE__ */ React.createElement(TableSkeleton, { rows: 8, cols: 5 })) : error ? /* @__PURE__ */ React.createElement("div", { className: "card-body" }, /* @__PURE__ */ React.createElement("div", { className: "empty-state" }, /* @__PURE__ */ React.createElement(Icon, { name: "alert-circle", size: 40 }), /* @__PURE__ */ React.createElement("p", { className: "empty-state-title" }, "Error loading teachers"))) : users.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "card-body" }, /* @__PURE__ */ React.createElement("div", { className: "empty-state" }, /* @__PURE__ */ React.createElement(Icon, { name: "user", size: 40 }), /* @__PURE__ */ React.createElement("p", { className: "empty-state-title" }, "No teachers found"))) : /* @__PURE__ */ React.createElement("div", { className: "card-body no-pad" }, /* @__PURE__ */ React.createElement("div", { className: "data-table-wrap", style: { overflowX: "auto" } }, /* @__PURE__ */ React.createElement("table", { className: "data-table" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, attendanceMode && /* @__PURE__ */ React.createElement("th", { style: { width: 40 } }), /* @__PURE__ */ React.createElement("th", null, "Teacher"), /* @__PURE__ */ React.createElement("th", null, "Email"), /* @__PURE__ */ React.createElement("th", null, "Role"), /* @__PURE__ */ React.createElement("th", null, "Status"), /* @__PURE__ */ React.createElement("th", null, "Category"))), /* @__PURE__ */ React.createElement("tbody", null, users.map((u, i) => {
      const name = u.name || u.Name || `${u.FirstName || u.firstName || ""} ${u.LastName || u.lastName || ""}`.trim() || "Unknown";
      const rawPhoto = u.photo || u.Photo || "";
      const photo = rawPhoto && !rawPhoto.startsWith("http") ? `${API_BASE}${rawPhoto.startsWith("/") ? "" : "/"}${rawPhoto}` : rawPhoto;
      const empId = u.EmployeeId || u.employeeId || "";
      const category = u.category || u.Category || "\u2014";
      const isSelected = attendanceIds.has(u.Id || u.id);
      return /* @__PURE__ */ React.createElement("tr", { key: u.Id || u.id || i, onClick: () => attendanceMode ? toggleAttId(u.Id || u.id) : setEditingUser(u), style: { cursor: "pointer", background: attendanceMode && isSelected ? "rgba(80,172,85,0.1)" : "" }, className: "hoverable-row" }, attendanceMode && /* @__PURE__ */ React.createElement("td", { style: { textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { width: 20, height: 20, borderRadius: 4, border: "1px solid var(--color-border)", display: "inline-flex", alignItems: "center", justifyContent: "center", background: isSelected ? "var(--color-primary)" : "#fff" } }, isSelected && /* @__PURE__ */ React.createElement(Icon, { name: "check", size: 14, style: { color: "#fff" } }))), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("div", { className: "cell-user" }, /* @__PURE__ */ React.createElement(Avatar, { name, photoUrl: photo, id: u.Id || u.id, size: 36 }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "cell-name" }, name), empId && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "0.75rem", color: "var(--color-text-light)" } }, "ID: ", empId)))), /* @__PURE__ */ React.createElement("td", { style: { fontSize: "0.82rem", color: "var(--color-text-muted)" } }, u.Email || u.email || u.SchoolEmail || "\u2014"), /* @__PURE__ */ React.createElement("td", { style: { fontSize: "0.82rem" } }, u.Role || u.role || "\u2014"), /* @__PURE__ */ React.createElement("td", null, /* @__PURE__ */ React.createElement("span", { className: `status-chip ${statusClass(u.Status || u.status)}` }, u.Status || u.status || "\u2014")), /* @__PURE__ */ React.createElement("td", { style: { fontSize: "0.82rem", color: "var(--color-text-light)" } }, category));
    })))))), attendanceMode && /* @__PURE__ */ React.createElement(GlobalCanvasPortal, null, /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", padding: "16px 24px", background: "var(--color-bg-card)", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-lg)", zIndex: 999, border: "1px solid var(--color-border)", width: "90%", maxWidth: 500 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 16 } }, /* @__PURE__ */ React.createElement("button", {
      className: "btn btn-secondary", style: { color: "#dc2626", padding: "0.6rem 1.2rem", borderRadius: "var(--radius-lg)" }, disabled: submittingAtt, onClick: () => {
        setAttendanceMode(false);
        setAttendanceIds(/* @__PURE__ */ new Set());
      }
    }, "Cancel"), /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", style: { flex: 1, padding: "0.6rem", borderRadius: "var(--radius-lg)", fontWeight: 600 }, disabled: submittingAtt, onClick: submitAttendance }, submittingAtt ? "Submitting\u2026" : `Mark as Present (${attendanceIds.size})`)))), attendanceMode && /* @__PURE__ */ React.createElement("div", { style: { height: 80 } }), showFiltersModal && /* @__PURE__ */ React.createElement(GlobalCanvasPortal, null, /* @__PURE__ */ React.createElement("div", { className: "modal-overlay", onClick: () => setShowFiltersModal(false) }, /* @__PURE__ */ React.createElement("div", { className: "modal-box", onClick: (e) => e.stopPropagation(), style: { maxWidth: 550, width: "100%" } }, /* @__PURE__ */ React.createElement("div", { className: "modal-title" }, "Teacher Filters & Sorting"), /* @__PURE__ */ React.createElement("div", { className: "modal-body" }, /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 20 } }, /* @__PURE__ */ React.createElement("h4", { style: { margin: "0 0 12px 0", display: "flex", justifyContent: "space-between" } }, "Sorting Rules", /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary btn-sm", onClick: () => setSortRules([...sortRules, { column: "firstname", desc: false }]), disabled: sortRules.length >= 6 }, "+ Add Rule")), sortRules.length === 0 ? /* @__PURE__ */ React.createElement("p", { style: { fontSize: "0.85rem", color: "var(--color-text-light)" } }, "No custom sort rules applied.") : /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 12 } }, sortRules.map((r, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { display: "flex", gap: 12, alignItems: "center" } }, /* @__PURE__ */ React.createElement("select", {
      className: "form-input", style: { flex: 2 }, value: r.column, onChange: (e) => {
        const next = [...sortRules];
        next[i].column = e.target.value;
        setSortRules(next);
      }
    }, sortOptions.map((o) => /* @__PURE__ */ React.createElement("option", { key: o.column, value: o.column }, o.label))), /* @__PURE__ */ React.createElement("select", {
      className: "form-input", style: { flex: 1 }, value: r.desc ? "desc" : "asc", onChange: (e) => {
        const next = [...sortRules];
        next[i].desc = e.target.value === "desc";
        setSortRules(next);
      }
    }, /* @__PURE__ */ React.createElement("option", { value: "asc" }, "Ascending"), /* @__PURE__ */ React.createElement("option", { value: "desc" }, "Descending")), /* @__PURE__ */ React.createElement(Icon, { name: "x", size: 18, color: "red", style: { cursor: "pointer" }, onClick: () => setSortRules(sortRules.filter((_, idx) => idx !== i)) })))))), /* @__PURE__ */ React.createElement("div", { className: "modal-actions" }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: () => setShowFiltersModal(false) }, "Close"))))));
  };
  var ClassroomEditModal = ({ classroom, onClose, onSaved }) => {
    const isCreate = !classroom;
    const [loading, setLoading] = useState(!isCreate);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [photoUploading, setPhotoUploading] = useState(false);
    const [loadError, setLoadError] = useState(null);
    const photoInputRef = useRef(null);
    const [f, setF] = useState({});
    const [currentPhoto, setCurrentPhoto] = useState("");
    const [canUpdate, setCanUpdate] = useState(isCreate);
    const [canDelete, setCanDelete] = useState(false);
    const [roomOptions, setRoomOptions] = useState([]);
    const [loadingRooms, setLoadingRooms] = useState(true);
    const [allTeachers, setAllTeachers] = useState([]);
    const [selectedTeacherIds, setSelectedTeacherIds] = useState(/* @__PURE__ */ new Set());
    const [teacherToAdd, setTeacherToAdd] = useState("");
    const [loadingTeachers, setLoadingTeachers] = useState(true);
    useEffect(() => {
      const promises = [];
      if (!isCreate) {
        const classroomId = classroom?.Id || classroom?.id;
        if (classroomId) {
          promises.push(
            api.get(`/api/classrooms/${classroomId}`, { params: { update: true } }).then((res) => {
              const c = res.data?.data || res.data || {};
              setF(c);
              setCurrentPhoto(toAbsoluteAssetUrl(c.Photo || c.photo || ""));
              const xUpdate = res.headers?.["x-update"];
              const xDelete = res.headers?.["x-delete"];
              setCanUpdate(xUpdate === "true" || xUpdate === true || true);
              setCanDelete(xDelete === "true" || xDelete === true);
              const links = c.teacherLinks || [];
              if (Array.isArray(links)) {
                const ids = /* @__PURE__ */ new Set();
                links.forEach((item) => {
                  const id = item?.TeacherId ?? item?.teacherId ?? item?.Id ?? item?.id;
                  if (id != null) ids.add(Number(id));
                });
                setSelectedTeacherIds(ids);
              }
            })
          );
        }
      } else {
        setF({ Status: "Current" });
        setLoading(false);
      }
      promises.push(
        api.get("/api/options", { params: { t: "room" } }).then((res) => {
          const data = res.data;
          let list = Array.isArray(data) ? data : data?.data || [];
          const rooms = [];
          list.forEach((item) => {
            const key = (item.Key ?? item.key ?? "").toString().toLowerCase();
            const value = (item.Value ?? item.value ?? "").toString().trim();
            if (key === "map" || !value) return;
            rooms.push({ id: item.Id ?? item.id, value });
          });
          setRoomOptions(rooms);
        }).catch(() => {
        }).finally(() => setLoadingRooms(false))
      );
      promises.push(
        api.get("/api/users", { params: { filter: "Status eq 'Current'", col: "id,name,photo", limit: 50 } }).then((res) => {
          const data = res.data?.data || res.data || [];
          setAllTeachers(Array.isArray(data) ? data.map((t) => ({ id: t.Id || t.id, name: t.name || t.Name || `${t.FirstName || ""} ${t.LastName || ""}`.trim(), photo: t.photo || t.Photo || "" })) : []);
        }).catch(() => {
        }).finally(() => setLoadingTeachers(false))
      );
      Promise.all(promises).catch((e) => setLoadError(e.message)).finally(() => setLoading(false));
    }, []);
    const v = (key) => f[key] ?? "";
    const setV = (key, val) => setF((prev) => ({ ...prev, [key]: val }));
    const handleInput = (e) => setV(e.target.name, e.target.value);
    const handlePhotoUpload = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";
      setPhotoUploading(true);
      try {
        const classroomId = f.Id || f.id;
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const uuid = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const blobPath = `classrooms/${uuid}.${ext}`;
        const urlRes = await api.post("/api/getUploadUrls", [blobPath], { headers: { "Content-Type": "application/json" } });
        const urls = Array.isArray(urlRes.data) ? urlRes.data : urlRes.data?.urls || urlRes.data?.data || [];
        let sasUrl = urls.length > 0 ? typeof urls[0] === "string" ? urls[0] : urls[0]?.url || urls[0]?.sasurl || "" : "";
        if (!sasUrl) throw new Error("No upload URL");
        await fetch(sasUrl, { method: "PUT", headers: { "x-ms-blob-type": "BlockBlob", "Content-Type": file.type || "image/jpeg" }, body: file });
        let cleanUrl;
        try {
          const p = new URL(sasUrl);
          cleanUrl = `${p.origin}${p.pathname}`;
        } catch {
          cleanUrl = sasUrl.split("?")[0];
        }
        if (classroomId) await api.post("/api/updatePhoto", { id: classroomId, type: "classroom", url: cleanUrl });
        setCurrentPhoto(cleanUrl + "?v=" + Date.now());
      } catch (err) {
        alert("Photo upload failed: " + err.message);
      } finally {
        setPhotoUploading(false);
      }
    };
    const handlePhotoRemove = async () => {
      const classroomId = f.Id || f.id;
      if (!classroomId) return;
      setPhotoUploading(true);
      try {
        await api.post("/api/updatePhoto", { id: classroomId, type: "classroom", url: "" });
        setCurrentPhoto("");
      } catch (err) {
        alert("Remove failed: " + err.message);
      } finally {
        setPhotoUploading(false);
      }
    };
    const handleSave = async () => {
      const name = v("Name").toString().trim();
      if (!name) return alert("Classroom name is required");
      setSaving(true);
      try {
        const payload = {};
        ["Name", "Status", "Room", "Book", "ArabicProgram", "QuranProgram", "Program", "Level", "Competition", "FirstWinner", "SecondWinner", "ThirdWinner", "FullMemo", "PartialMemo", "NotMemo"].forEach((k) => {
          const val = (f[k] ?? "").toString().trim();
          if (val) payload[k] = val;
          else payload[k] = null;
        });
        const teacherLinks = [...selectedTeacherIds].sort().map((id) => ({ TeacherId: id }));
        payload.teacherLinks = teacherLinks;
        if (isCreate) {
          payload.name = payload.Name;
          delete payload.Name;
          await api.post("/api/classrooms", payload);
        } else {
          await api.patch(`/api/classrooms/${classroom.Id || classroom.id}`, payload);
        }
        onSaved();
        onClose();
      } catch (e) {
        alert("Failed to save: " + (e.response?.data?.message || e.message));
      } finally {
        setSaving(false);
      }
    };
    const handleDelete = async () => {
      if (!confirm("Delete this classroom? This action cannot be undone.")) return;
      setDeleting(true);
      try {
        await api.delete(`/api/classrooms/${classroom.Id || classroom.id}`);
        onSaved();
        onClose();
      } catch (e) {
        alert("Delete failed: " + (e.response?.data?.message || e.message));
      } finally {
        setDeleting(false);
      }
    };
    const addTeacher = () => {
      const id = Number(teacherToAdd);
      if (!id || selectedTeacherIds.has(id)) return;
      setSelectedTeacherIds((prev) => {
        const n = new Set(prev);
        n.add(id);
        return n;
      });
      setTeacherToAdd("");
    };
    const removeTeacher = (id) => {
      setSelectedTeacherIds((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
    };
    const ls = { display: "block", marginBottom: 6, fontSize: "0.82rem", fontWeight: 600, color: "var(--color-text-secondary)" };
    const row2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 };
    const row3 = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 };
    const selectedTeachersList = allTeachers.filter((t) => selectedTeacherIds.has(t.id));
    const unselectedTeachers = allTeachers.filter((t) => !selectedTeacherIds.has(t.id));
    if (loading) {
      return /* @__PURE__ */ React.createElement("div", { style: { padding: 24 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 24 } }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", onClick: onClose, style: { padding: "0.4rem 0.8rem" } }, /* @__PURE__ */ React.createElement(Icon, { name: "arrow-left", size: 16 })), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "1.2rem", fontWeight: 700 } }, isCreate ? "Create Classroom" : "Edit Classroom")), /* @__PURE__ */ React.createElement("div", { style: { borderTop: "1px solid var(--color-border)", paddingTop: 20 } }, /* @__PURE__ */ React.createElement(TableSkeleton, { rows: 10, cols: 2 })));
    }
    if (loadError) {
      return /* @__PURE__ */ React.createElement("div", { style: { padding: 24 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 24 } }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", onClick: onClose, style: { padding: "0.4rem 0.8rem" } }, /* @__PURE__ */ React.createElement(Icon, { name: "arrow-left", size: 16 })), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "1.2rem", fontWeight: 700 } }, "Edit Classroom")), /* @__PURE__ */ React.createElement("div", { className: "empty-state" }, /* @__PURE__ */ React.createElement(Icon, { name: "alert-circle", size: 40 }), /* @__PURE__ */ React.createElement("p", { className: "empty-state-title" }, loadError)));
    }
    return /* @__PURE__ */ React.createElement("div", { style: { padding: "16px 24px 40px", maxWidth: 900, margin: "0 auto" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12 } }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", onClick: onClose, style: { padding: "0.4rem 0.8rem" } }, /* @__PURE__ */ React.createElement(Icon, { name: "arrow-left", size: 16 })), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "1.2rem", fontWeight: 700 } }, isCreate ? "Create Classroom" : v("Name") || "Edit Classroom")), /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: handleSave, disabled: saving }, /* @__PURE__ */ React.createElement(Icon, { name: "save", size: 15 }), " ", saving ? "Saving..." : "Save")), /* @__PURE__ */ React.createElement("div", { style: { borderTop: "1px solid var(--color-border)", marginBottom: 12 } }), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { position: "relative", width: 96, height: 96, borderRadius: "50%", overflow: "hidden", background: "linear-gradient(135deg, #8abf8c, #7bd681)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 } }, currentPhoto ? /* @__PURE__ */ React.createElement("img", { src: currentPhoto, alt: "", style: { width: "100%", height: "100%", objectFit: "cover" } }) : /* @__PURE__ */ React.createElement("span", { style: { color: "#fff", fontWeight: 800, fontSize: "1.6rem" } }, initialsFromName(v("Name"))), photoUploading && /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" } }, /* @__PURE__ */ React.createElement("div", { className: "spinner", style: { width: 20, height: 20, borderWidth: 2, borderTopColor: "#fff" } }))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, /* @__PURE__ */ React.createElement("input", { ref: photoInputRef, type: "file", accept: "image/*", style: { display: "none" }, onChange: handlePhotoUpload }), /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", style: { fontSize: "0.78rem", padding: "0.3rem 0.8rem" }, onClick: () => photoInputRef.current?.click(), disabled: photoUploading }, /* @__PURE__ */ React.createElement(Icon, { name: "edit", size: 13 }), " ", currentPhoto ? "Change Photo" : "Add Photo"), currentPhoto && /* @__PURE__ */ React.createElement("span", { style: { color: "#999", lineHeight: "30px" } }, "|"), currentPhoto && /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", style: { fontSize: "0.78rem", padding: "0.3rem 0.8rem", color: "#dc2626" }, onClick: handlePhotoRemove, disabled: photoUploading }, /* @__PURE__ */ React.createElement(Icon, { name: "trash-2", size: 13 }), " Remove"))), /* @__PURE__ */ React.createElement(SectionHeader, { title: "Main Details", icon: "home" }), /* @__PURE__ */ React.createElement("div", { style: row3 }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Classroom Name"), /* @__PURE__ */ React.createElement("input", { name: "Name", value: v("Name"), onChange: handleInput, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Class Status"), /* @__PURE__ */ React.createElement("select", { name: "Status", value: v("Status"), onChange: handleInput, className: "form-input" }, /* @__PURE__ */ React.createElement("option", { value: "Current" }, "Current"), /* @__PURE__ */ React.createElement("option", { value: "Template" }, "Template"), /* @__PURE__ */ React.createElement("option", { value: "Facilities" }, "Facilities"), /* @__PURE__ */ React.createElement("option", { value: "Inactive" }, "Inactive"))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Room Code"), /* @__PURE__ */ React.createElement("select", { name: "Room", value: v("Room"), onChange: handleInput, className: "form-input", disabled: loadingRooms }, /* @__PURE__ */ React.createElement("option", { value: "" }, loadingRooms ? "Loading\u2026" : "Select room code"), roomOptions.map((r) => /* @__PURE__ */ React.createElement("option", { key: r.id || r.value, value: r.value }, r.value))))), /* @__PURE__ */ React.createElement("div", { style: { ...row2, marginTop: 14 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Book"), /* @__PURE__ */ React.createElement("input", { name: "Book", value: v("Book"), onChange: handleInput, className: "form-input" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Level (Printed on Certificates)"), /* @__PURE__ */ React.createElement("input", { name: "Level", value: v("Level"), onChange: handleInput, className: "form-input", placeholder: "e.g. Kindergarten, Level 1..." }))), /* @__PURE__ */ React.createElement("div", { style: { ...row2, marginTop: 14 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Arabic Program"), /* @__PURE__ */ React.createElement("textarea", { name: "ArabicProgram", value: v("ArabicProgram"), onChange: handleInput, className: "form-input", rows: 3 })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Quran Program"), /* @__PURE__ */ React.createElement("textarea", { name: "QuranProgram", value: v("QuranProgram"), onChange: handleInput, className: "form-input", rows: 3 }))), /* @__PURE__ */ React.createElement("div", { style: { ...row2, marginTop: 14 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Program"), /* @__PURE__ */ React.createElement("textarea", { name: "Program", value: v("Program"), onChange: handleInput, className: "form-input", rows: 3 })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Competition Surah"), /* @__PURE__ */ React.createElement("textarea", { name: "Competition", value: v("Competition"), onChange: handleInput, className: "form-input", rows: 3 }))), /* @__PURE__ */ React.createElement(SectionHeader, { title: "Assigned Teachers", icon: "users" }), loadingTeachers && /* @__PURE__ */ React.createElement("div", { style: { height: 3, background: "var(--color-primary)", borderRadius: 2, animation: "pulse 1.5s infinite" } }), !loadingTeachers && selectedTeachersList.length === 0 && /* @__PURE__ */ React.createElement("div", { style: { padding: 12, border: "1px solid var(--color-border)", borderRadius: 10, background: "var(--color-bg)", color: "#999", fontSize: "0.85rem" } }, "No assigned teachers"), selectedTeachersList.map((teacher) => /* @__PURE__ */ React.createElement("div", { key: teacher.id, style: { display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: "1px solid var(--color-border)", borderRadius: 10, marginBottom: 8 } }, /* @__PURE__ */ React.createElement(Avatar, { name: teacher.name, photoUrl: toAbsoluteAssetUrl(teacher.photo), id: teacher.id, size: 36 }), /* @__PURE__ */ React.createElement("span", { style: { flex: 1, fontSize: "0.9rem", fontWeight: 600 } }, teacher.name), /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", style: { padding: "0.25rem 0.5rem", color: "#dc2626" }, onClick: () => removeTeacher(teacher.id), title: "Unlink teacher" }, /* @__PURE__ */ React.createElement(Icon, { name: "x", size: 14 })))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, marginTop: 8 } }, /* @__PURE__ */ React.createElement("select", { value: teacherToAdd, onChange: (e) => setTeacherToAdd(e.target.value), className: "form-input", style: { flex: 1 } }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Select a teacher"), unselectedTeachers.map((t) => /* @__PURE__ */ React.createElement("option", { key: t.id, value: t.id }, t.name))), /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: addTeacher, disabled: !teacherToAdd, style: { padding: "0.4rem 1rem" } }, "Add")), /* @__PURE__ */ React.createElement(SectionHeader, { title: "Competition Prizes", icon: "award" }), /* @__PURE__ */ React.createElement("div", { style: row3 }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "1st Winner"), /* @__PURE__ */ React.createElement("input", { name: "FirstWinner", value: v("FirstWinner"), onChange: handleInput, className: "form-input", type: "number" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "2nd Winner"), /* @__PURE__ */ React.createElement("input", { name: "SecondWinner", value: v("SecondWinner"), onChange: handleInput, className: "form-input", type: "number" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "3rd Winner"), /* @__PURE__ */ React.createElement("input", { name: "ThirdWinner", value: v("ThirdWinner"), onChange: handleInput, className: "form-input", type: "number" }))), /* @__PURE__ */ React.createElement("div", { style: { ...row3, marginTop: 14 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Fully Memorised"), /* @__PURE__ */ React.createElement("input", { name: "FullMemo", value: v("FullMemo"), onChange: handleInput, className: "form-input", type: "number" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Partially Memorised"), /* @__PURE__ */ React.createElement("input", { name: "PartialMemo", value: v("PartialMemo"), onChange: handleInput, className: "form-input", type: "number" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: ls }, "Did Not Memorise"), /* @__PURE__ */ React.createElement("input", { name: "NotMemo", value: v("NotMemo"), onChange: handleInput, className: "form-input", type: "number" }))), !isCreate && canDelete && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 32, textAlign: "center" } }, /* @__PURE__ */ React.createElement("button", { className: "btn", style: { background: "#dc2626", color: "#fff", padding: "0.5rem 1.5rem", borderRadius: 8 }, onClick: handleDelete, disabled: deleting }, deleting ? "Deleting..." : "Delete Classroom")), /* @__PURE__ */ React.createElement("div", { style: { height: 40 } }));
  };
  var StudentSelectGrid = ({ students, selectedIds, onToggle, renderExtra, renderButton }) => /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: 12 } }, students.map((s, i) => {
    const id = s.id || s.Id;
    const name = (s.name || s.Name || "Student").toString().trim();
    const code = (s.code || s.Code || "").toString().trim();
    const rawPhoto = s.photo || s.Photo || "";
    const photoUrl = rawPhoto && !rawPhoto.startsWith("http") ? `${API_BASE}${rawPhoto.startsWith("/") ? "" : "/"}${rawPhoto}` : rawPhoto;
    const selected = id != null && selectedIds.has(id);
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        key: id || i,
        onClick: () => id != null && onToggle && onToggle(id),
        style: { borderRadius: 14, border: `${selected ? 2 : 1}px solid ${selected ? "var(--color-primary)" : "var(--color-border)"}`, background: "#fff", cursor: onToggle ? "pointer" : "default", overflow: "hidden", transition: "border-color 0.15s" }
      },
      /* @__PURE__ */ React.createElement("div", { style: { height: 120, background: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" } }, photoUrl ? /* @__PURE__ */ React.createElement("img", {
        src: photoUrl, alt: name, style: { width: "100%", height: "100%", objectFit: "cover" }, onError: (e) => {
          e.target.style.display = "none";
        }
      }) : null, !photoUrl && /* @__PURE__ */ React.createElement("span", { style: { color: "#fff", fontWeight: 800, fontSize: "1.4rem" } }, initialsFromName(name))),
      /* @__PURE__ */ React.createElement("div", { style: { padding: "10px 8px", textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "0.82rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" } }, name), code && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: 4 } }, code), renderExtra && renderExtra(s, id), renderButton && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 8 } }, renderButton(s, id, i)))
    );
  }));
  var SubViewHeader = ({ title, onClose, actions }) => /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 } }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", onClick: onClose, style: { padding: "0.4rem 0.8rem" } }, /* @__PURE__ */ React.createElement(Icon, { name: "arrow-left", size: 16 })), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "1.15rem", fontWeight: 700, flex: 1 } }, title), actions);
  var ClassroomRankingView = ({ classroomId, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState([]);
    const [error, setError] = useState(null);
    const [rankOptions, setRankOptions] = useState([]);
    const [rankDescriptions, setRankDescriptions] = useState([]);
    const [editingStudent, setEditingStudent] = useState(null);
    const [saving, setSaving] = useState(false);
    const [editRank, setEditRank] = useState("");
    const [editDesc, setEditDesc] = useState("");
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [rankRes, optRes] = await Promise.all([
          api.get(`/api/ranking/${classroomId}`),
          api.get("/api/options", { params: { t: "rank" } })
        ]);
        setStudents(Array.isArray(rankRes.data) ? rankRes.data : rankRes.data?.data || []);
        const optList = Array.isArray(optRes.data) ? optRes.data : optRes.data?.data || [];
        const ranks = [], descs = [];
        optList.forEach((o) => {
          const key = (o.Key || o.key || "").toString().trim();
          const val = (o.Value || o.value || "").toString().trim();
          if (key.toLowerCase() === "rankdescription") {
            if (val && !descs.includes(val)) descs.push(val);
          } else {
            const n = parseInt(key || val);
            if (!isNaN(n) && !ranks.find((r) => r.value === n)) ranks.push({ value: n, label: val || `${n}` });
          }
        });
        ranks.sort((a, b) => a.value - b.value);
        setRankOptions(ranks);
        setRankDescriptions(descs);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    useEffect(() => {
      loadData();
    }, [classroomId]);
    const saveRank = async () => {
      if (!editingStudent) return;
      const sid = editingStudent.id || editingStudent.Id || editingStudent.studentId || editingStudent.StudentId;
      setSaving(true);
      try {
        await api.patch(`/api/students/${sid}`, { Rank: editRank ? parseInt(editRank) : null, rankDescription: editDesc || null });
        setEditingStudent(null);
        await loadData();
      } catch {
        alert("Failed to save rank");
      } finally {
        setSaving(false);
      }
    };
    return /* @__PURE__ */ React.createElement("div", { style: { padding: "16px 24px" } }, /* @__PURE__ */ React.createElement(SubViewHeader, { title: "Ranking", onClose }), /* @__PURE__ */ React.createElement("div", { style: { borderTop: "1px solid var(--color-border)", paddingTop: 16 } }, loading ? /* @__PURE__ */ React.createElement(TableSkeleton, { rows: 8, cols: 3 }) : error ? /* @__PURE__ */ React.createElement("div", { className: "empty-state" }, /* @__PURE__ */ React.createElement(Icon, { name: "alert-circle", size: 40 }), /* @__PURE__ */ React.createElement("p", { className: "empty-state-title" }, error)) : students.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "empty-state" }, /* @__PURE__ */ React.createElement(Icon, { name: "award", size: 40 }), /* @__PURE__ */ React.createElement("p", { className: "empty-state-title" }, "No ranking records")) : /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } }, students.map((s, i) => {
      const name = (s.fullname || s.name || "Student").toString().trim();
      const photo = (s.photo || "").toString().trim();
      const rank = (s.Rank ?? s.rank ?? "").toString().trim();
      const desc = (s.rankDescription || "").toString().trim();
      const att = (s.lastAttendanceType || "").toString().toLowerCase();
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: i,
          style: { display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, cursor: "pointer", border: "1px solid var(--color-border)", transition: "background 0.15s" },
          onClick: () => {
            setEditingStudent(s);
            setEditRank(rank);
            setEditDesc(desc);
          },
          onMouseOver: (e) => e.currentTarget.style.background = "var(--color-bg)",
          onMouseOut: (e) => e.currentTarget.style.background = ""
        },
        /* @__PURE__ */ React.createElement(Avatar, { name, photoUrl: toAbsoluteAssetUrl(photo), id: s.id || i, size: 44 }),
        /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, fontSize: "0.9rem" } }, name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "0.8rem", fontWeight: 600, marginTop: 2 } }, "Rank: ", rank || "\u2014"), desc && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "0.78rem", color: "var(--color-text-muted)", marginTop: 2 } }, desc)),
        /* @__PURE__ */ React.createElement("span", { className: `status-chip ${att === "present" ? "status-current" : "absent"}`, style: { fontSize: "0.72rem" } }, att === "present" ? "Present" : "Absent")
      );
    }))), editingStudent && /* @__PURE__ */ React.createElement(GlobalCanvasPortal, null, /* @__PURE__ */ React.createElement("div", { className: "modal-overlay", onClick: () => !saving && setEditingStudent(null) }, /* @__PURE__ */ React.createElement("div", { className: "modal-box", onClick: (e) => e.stopPropagation(), style: { maxWidth: 420 } }, /* @__PURE__ */ React.createElement("div", { className: "modal-title" }, "Update Rank"), /* @__PURE__ */ React.createElement("div", { className: "modal-body" }, /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 12, color: "var(--color-text-muted)" } }, (editingStudent.fullname || editingStudent.name || "Student").toString().trim()), /* @__PURE__ */ React.createElement("label", { style: { display: "block", marginBottom: 6, fontSize: "0.82rem", fontWeight: 600, color: "var(--color-text-secondary)" } }, "Rank"), /* @__PURE__ */ React.createElement("select", { value: editRank, onChange: (e) => setEditRank(e.target.value), className: "form-input", style: { marginBottom: 14 } }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Select Rank"), rankOptions.map((r) => /* @__PURE__ */ React.createElement("option", { key: r.value, value: r.value }, r.label))), /* @__PURE__ */ React.createElement("label", { style: { display: "block", marginBottom: 6, fontSize: "0.82rem", fontWeight: 600, color: "var(--color-text-secondary)" } }, "Rank Description"), /* @__PURE__ */ React.createElement("select", { value: editDesc, onChange: (e) => setEditDesc(e.target.value), className: "form-input" }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Select Description"), rankDescriptions.map((d) => /* @__PURE__ */ React.createElement("option", { key: d, value: d }, d)))), /* @__PURE__ */ React.createElement("div", { className: "modal-actions" }, /* @__PURE__ */ React.createElement("button", { className: "btn-secondary", disabled: saving, onClick: () => setEditingStudent(null) }, "Cancel"), /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", disabled: saving, onClick: saveRank }, saving ? "Saving\u2026" : "Save"))))));
  };
  var MoveStudentsView = ({ classroomId, classroomName, students, onClose, onDone }) => {
    const [selectedIds, setSelectedIds] = useState(/* @__PURE__ */ new Set());
    const [classrooms, setClassrooms] = useState([]);
    const [loadingC, setLoadingC] = useState(true);
    const [targetId, setTargetId] = useState("");
    const [submitting, setSubmitting] = useState(false);
    useEffect(() => {
      api.get("/api/classrooms", { params: { col: "id,name", filter: "status eq 'Current'", limit: 150 } }).then((res) => {
        const d = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setClassrooms(d.filter((c) => (c.id || c.Id) != classroomId));
      }).catch(() => {
      }).finally(() => setLoadingC(false));
    }, []);
    const toggle = (id) => setSelectedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
    const handleMove = async () => {
      if (!targetId || selectedIds.size === 0) return;
      setSubmitting(true);
      try {
        await api.post("/api/classrooms/moveStudents", { studentIds: [...selectedIds], newClassroomId: Number(targetId) });
        onDone?.();
        onClose();
      } catch (e) {
        alert("Move failed: " + e.message);
      } finally {
        setSubmitting(false);
      }
    };
    return /* @__PURE__ */ React.createElement("div", { style: { padding: "16px 24px", display: "flex", flexDirection: "column", minHeight: "70vh" } }, /* @__PURE__ */ React.createElement(SubViewHeader, { title: classroomName ? `Move from ${classroomName}` : "Move Students", onClose }), /* @__PURE__ */ React.createElement("div", { style: { borderTop: "1px solid var(--color-border)", paddingTop: 16, flex: 1, overflowY: "auto" } }, /* @__PURE__ */ React.createElement(StudentSelectGrid, { students, selectedIds, onToggle: toggle })), /* @__PURE__ */ React.createElement("div", { style: { borderTop: "1px solid var(--color-border)", paddingTop: 16, marginTop: 16 } }, loadingC ? /* @__PURE__ */ React.createElement("div", { style: { height: 3, background: "var(--color-primary)", borderRadius: 2, animation: "pulse 1.5s infinite" } }) : /* @__PURE__ */ React.createElement("select", { value: targetId, onChange: (e) => setTargetId(e.target.value), className: "form-input", style: { marginBottom: 12 } }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Select destination classroom"), classrooms.map((c) => /* @__PURE__ */ React.createElement("option", { key: c.id || c.Id, value: c.id || c.Id }, c.name || c.Name || `Classroom ${c.id || c.Id}`))), /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", style: { width: "100%", padding: "0.7rem" }, disabled: submitting || selectedIds.size === 0 || !targetId, onClick: handleMove }, submitting ? "Moving\u2026" : `Move Selected Students (${selectedIds.size})`)));
  };
  var BookStatusChangeView = ({ classroomName, students, onClose, onDone }) => {
    const [selectedIds, setSelectedIds] = useState(/* @__PURE__ */ new Set());
    const [bookStatus, setBookStatus] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const toggle = (id) => setSelectedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
    const handleSubmit = async () => {
      if (selectedIds.size === 0) return;
      setSubmitting(true);
      try {
        await api.post("/api/classrooms/setBookStatus", { studentIds: [...selectedIds], bookStatus });
        onDone?.();
        onClose();
      } catch (e) {
        alert("Update failed: " + e.message);
      } finally {
        setSubmitting(false);
      }
    };
    return /* @__PURE__ */ React.createElement("div", { style: { padding: "16px 24px", display: "flex", flexDirection: "column", minHeight: "70vh" } }, /* @__PURE__ */ React.createElement(SubViewHeader, { title: classroomName ? `${classroomName} Book Status` : "Book Status", onClose }), /* @__PURE__ */ React.createElement("div", { style: { borderTop: "1px solid var(--color-border)", paddingTop: 16, flex: 1, overflowY: "auto" } }, /* @__PURE__ */ React.createElement(StudentSelectGrid, { students, selectedIds, onToggle: toggle })), /* @__PURE__ */ React.createElement("div", { style: { borderTop: "1px solid var(--color-border)", paddingTop: 16, marginTop: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", borderRadius: 12, border: "1px solid var(--color-border)", overflow: "hidden", marginBottom: 12 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => setBookStatus(true), style: { flex: 1, padding: "0.65rem", border: "none", cursor: "pointer", fontWeight: 600, background: bookStatus === true ? "var(--color-primary)" : "transparent", color: bookStatus === true ? "#fff" : "var(--color-text)" } }, "Delivered"), /* @__PURE__ */ React.createElement("button", { onClick: () => setBookStatus(false), style: { flex: 1, padding: "0.65rem", border: "none", cursor: "pointer", fontWeight: 600, borderLeft: "1px solid var(--color-border)", background: bookStatus === false ? "var(--color-primary)" : "transparent", color: bookStatus === false ? "#fff" : "var(--color-text)" } }, "Undelivered")), /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", style: { width: "100%", padding: "0.7rem" }, disabled: submitting || selectedIds.size === 0, onClick: handleSubmit }, submitting ? "Updating\u2026" : `Update Selected Students (${selectedIds.size})`)));
  };
  var StudentPhotoChangeView = ({ classroomName, students: initialStudents, onClose }) => {
    const [students, setStudents] = useState(() => initialStudents.map((s) => ({ ...s })));
    const [uploadingIds, setUploadingIds] = useState(/* @__PURE__ */ new Set());
    const fileInputRefs = useRef({});
    const handleUpload = async (index, file) => {
      const student = students[index];
      const sid = student.id || student.Id;
      if (!sid || !file) return;
      setUploadingIds((prev) => {
        const n = new Set(prev);
        n.add(sid);
        return n;
      });
      try {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const uuid = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const blobPath = `students/${uuid}.${ext}`;
        const urlRes = await api.post("/api/getUploadUrls", [blobPath], { headers: { "Content-Type": "application/json" } });
        const urls = Array.isArray(urlRes.data) ? urlRes.data : urlRes.data?.urls || urlRes.data?.data || [];
        let sasUrl = urls.length > 0 ? typeof urls[0] === "string" ? urls[0] : urls[0]?.url || urls[0]?.sasurl || "" : "";
        if (!sasUrl) throw new Error("No upload URL");
        await fetch(sasUrl, { method: "PUT", headers: { "x-ms-blob-type": "BlockBlob", "Content-Type": file.type || "image/jpeg" }, body: file });
        let cleanUrl;
        try {
          const p = new URL(sasUrl);
          cleanUrl = `${p.origin}${p.pathname}`;
        } catch {
          cleanUrl = sasUrl.split("?")[0];
        }
        await api.post("/api/updatePhoto", { id: sid, type: "student", url: cleanUrl });
        setStudents((prev) => {
          const next = [...prev];
          next[index] = { ...next[index], photo: cleanUrl + "?v=" + Date.now(), Photo: cleanUrl + "?v=" + Date.now() };
          return next;
        });
      } catch (e) {
        alert("Photo upload failed: " + e.message);
      } finally {
        setUploadingIds((prev) => {
          const n = new Set(prev);
          n.delete(sid);
          return n;
        });
      }
    };
    return /* @__PURE__ */ React.createElement("div", { style: { padding: "16px 24px" } }, /* @__PURE__ */ React.createElement(SubViewHeader, { title: classroomName ? `${classroomName} Student Photos` : "Student Photos", onClose }), /* @__PURE__ */ React.createElement("div", { style: { borderTop: "1px solid var(--color-border)", paddingTop: 16 } }, /* @__PURE__ */ React.createElement(
      StudentSelectGrid,
      {
        students,
        selectedIds: /* @__PURE__ */ new Set(),
        onToggle: null,
        renderButton: (s, id, idx) => {
          const isUp = uploadingIds.has(id);
          return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("input", {
            ref: (el) => {
              if (el) fileInputRefs.current[idx] = el;
            }, type: "file", accept: "image/*", style: { display: "none" }, onChange: (e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(idx, f);
              e.target.value = "";
            }
          }), /* @__PURE__ */ React.createElement(
            "button",
            {
              className: "btn btn-primary",
              style: { width: "100%", padding: "0.4rem", fontSize: "0.78rem" },
              disabled: isUp,
              onClick: (e) => {
                e.stopPropagation();
                fileInputRefs.current[idx]?.click();
              }
            },
            isUp ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "spinner", style: { width: 12, height: 12, borderWidth: 2, borderTopColor: "#fff", display: "inline-block", marginRight: 6 } }), "Uploading\u2026") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Icon, { name: "camera", size: 13 }), " Change Photo")
          ));
        }
      }
    )));
  };
  var ClassroomTermCertificatesView = ({ classroomId, classroomName, students, teachers, onClose }) => {
    const [step, setStep] = useState(0);
    const [selectedIds, setSelectedIds] = useState(/* @__PURE__ */ new Set());
    const [subtitles, setSubtitles] = useState({});
    const [options, setOptions] = useState([]);
    const [loadingOpts, setLoadingOpts] = useState(true);
    const [selectedDate, setSelectedDate] = useState(() => (/* @__PURE__ */ new Date()).toISOString().split("T")[0]);
    const [selectedTeacher, setSelectedTeacher] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const teacherNames = useMemo(() => {
      const names = /* @__PURE__ */ new Set();
      (teachers || []).forEach((t) => {
        const n = (t.fullname || t.name || t.teacherName || t.Name || "").toString().trim();
        if (n) names.add(n);
      });
      return [...names];
    }, [teachers]);
    useEffect(() => {
      if (teacherNames.length > 0 && !selectedTeacher) setSelectedTeacher(teacherNames[0]);
    }, [teacherNames]);
    useEffect(() => {
      api.get("/api/options", { params: { t: "termCertificates" } }).then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setOptions(list.filter((o) => (o.Value || o.value || "").toString().trim()).map((o) => ({ id: o.Id || o.id, label: (o.Value || o.value || "").toString().trim() })));
      }).catch(() => {
      }).finally(() => setLoadingOpts(false));
    }, []);
    const toggle = (id) => {
      setSelectedIds((prev) => {
        const n = new Set(prev);
        if (n.has(id)) n.delete(id);
        else {
          n.add(id);
          if (!subtitles[id] && options.length > 0) setSubtitles((p) => ({ ...p, [id]: options[0].label }));
        }
        return n;
      });
    };
    const handleSubmit = async () => {
      if (selectedIds.size === 0 || !selectedTeacher) return;
      setSubmitting(true);
      try {
        const studentItems = [...selectedIds].map((id) => ({ id, subtitle: subtitles[id] || "" })).filter((x) => x.subtitle);
        if (studentItems.length === 0) {
          alert("Please choose a certificate category for each student");
          setSubmitting(false);
          return;
        }
        const [dd, mm, yyyy] = [selectedDate.split("-")[2], selectedDate.split("-")[1], selectedDate.split("-")[0]];
        await api.post("/api/certificates/user", { studentItems, type: "term", date: `${dd}/${mm}/${yyyy}`, teacherName: selectedTeacher });
        alert("You will receive the certificates via email shortly.");
        onClose();
      } catch (e) {
        alert("Failed: " + e.message);
      } finally {
        setSubmitting(false);
      }
    };
    return /* @__PURE__ */ React.createElement("div", { style: { padding: "16px 24px", display: "flex", flexDirection: "column", minHeight: "70vh" } }, /* @__PURE__ */ React.createElement(SubViewHeader, { title: "Appreciation Certificates", onClose: step === 1 ? () => setStep(0) : onClose }), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "center", gap: 32, marginBottom: 16 } }, [{ n: 1, label: "Students" }, { n: 2, label: "Details" }].map((s) => /* @__PURE__ */ React.createElement("div", { key: s.n, style: { textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { width: 36, height: 36, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, background: step === s.n - 1 ? "var(--color-primary)" : "var(--color-bg)", color: step === s.n - 1 ? "#fff" : "var(--color-text-muted)" } }, s.n), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "0.8rem", marginTop: 4, fontWeight: step === s.n - 1 ? 700 : 500, color: step === s.n - 1 ? "var(--color-text)" : "var(--color-text-muted)" } }, s.label)))), /* @__PURE__ */ React.createElement("div", { style: { borderTop: "1px solid var(--color-border)", paddingTop: 16, flex: 1, overflowY: "auto" } }, step === 0 ? loadingOpts ? /* @__PURE__ */ React.createElement(TableSkeleton, { rows: 4, cols: 2 }) : options.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "empty-state" }, /* @__PURE__ */ React.createElement("p", { className: "empty-state-title" }, "No certificate options available")) : /* @__PURE__ */ React.createElement(
      StudentSelectGrid,
      {
        students,
        selectedIds,
        onToggle: toggle,
        renderExtra: (s, id) => selectedIds.has(id) ? /* @__PURE__ */ React.createElement("select", {
          value: subtitles[id] || "", onChange: (e) => {
            e.stopPropagation();
            setSubtitles((p) => ({ ...p, [id]: e.target.value }));
          }, onClick: (e) => e.stopPropagation(), className: "form-input", style: { marginTop: 6, fontSize: "0.72rem", padding: "4px 6px" }
        }, options.map((o) => /* @__PURE__ */ React.createElement("option", { key: o.id, value: o.label }, o.label))) : null
      }
    ) : /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 480, margin: "0 auto" } }, /* @__PURE__ */ React.createElement("label", { style: { display: "block", marginBottom: 6, fontSize: "0.82rem", fontWeight: 600, color: "var(--color-text-secondary)" } }, "Date"), /* @__PURE__ */ React.createElement("input", { type: "date", value: selectedDate, onChange: (e) => setSelectedDate(e.target.value), className: "form-input", style: { marginBottom: 14 }, disabled: submitting }), /* @__PURE__ */ React.createElement("label", { style: { display: "block", marginBottom: 6, fontSize: "0.82rem", fontWeight: 600, color: "var(--color-text-secondary)" } }, "Teacher"), /* @__PURE__ */ React.createElement("select", { value: selectedTeacher, onChange: (e) => setSelectedTeacher(e.target.value), className: "form-input", style: { marginBottom: 20 }, disabled: submitting }, teacherNames.length === 0 && /* @__PURE__ */ React.createElement("option", { value: "" }, "No teachers found"), teacherNames.map((n) => /* @__PURE__ */ React.createElement("option", { key: n, value: n }, n))), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", fontSize: "1.2rem", fontWeight: 700 } }, "Certificates to be generated", /* @__PURE__ */ React.createElement("br", null), selectedIds.size))), /* @__PURE__ */ React.createElement("div", { style: { borderTop: "1px solid var(--color-border)", paddingTop: 16, marginTop: 16, display: "flex", gap: 10 } }, step === 0 ? /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", style: { flex: 1, padding: "0.7rem" }, disabled: selectedIds.size === 0 || loadingOpts, onClick: () => setStep(1) }, "Next (", selectedIds.size, ")") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", style: { flex: 1, padding: "0.7rem" }, disabled: submitting, onClick: () => setStep(0) }, "Back"), /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", style: { flex: 1, padding: "0.7rem" }, disabled: submitting || !selectedTeacher, onClick: handleSubmit }, submitting ? "Submitting\u2026" : "Confirm"))));
  };
  var ClassroomPhotosHistoryView = ({ room, classroomName, onClose }) => {
    const [category, setCategory] = useState("before");
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [error, setError] = useState(null);
    const [previewItem, setPreviewItem] = useState(null);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef(null);
    const loadPhotos = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get("/api/listfiles", { params: { path: `/classroomphotos/${room}/${category}` } });
        const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
        const sorted = data.filter((p) => (p.url || p.Url || "").toString().trim()).sort((a, b) => {
          const ad = new Date(a.lastModified || 0), bd = new Date(b.lastModified || 0);
          return bd - ad;
        });
        setItems(sorted);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    useEffect(() => {
      if (room) loadPhotos();
    }, [room, category]);
    const handleUploadFiles = async (files) => {
      if (!files?.length || uploading) return;
      setUploading(true);
      try {
        const paths = Array.from(files).map((f, i) => {
          const ext = f.name.split(".").pop()?.toLowerCase() || "jpg";
          const uuid = crypto.randomUUID?.() || `${Date.now()}-${i}-${Math.random().toString(16).slice(2)}`;
          return `classroomphotos/${room}/${category}/${uuid}.${ext}`;
        });
        const urlRes = await api.post("/api/getUploadUrls", paths, { headers: { "Content-Type": "application/json" } });
        const urls = Array.isArray(urlRes.data) ? urlRes.data : urlRes.data?.urls || urlRes.data?.data || [];
        for (let i = 0; i < Math.min(files.length, urls.length); i++) {
          const sasUrl = typeof urls[i] === "string" ? urls[i] : urls[i]?.url || urls[i]?.sasurl || "";
          if (!sasUrl) continue;
          await fetch(sasUrl, { method: "PUT", headers: { "x-ms-blob-type": "BlockBlob", "Content-Type": files[i].type || "image/jpeg" }, body: files[i] });
        }
        await loadPhotos();
      } catch (e) {
        alert("Upload failed: " + e.message);
      } finally {
        setUploading(false);
      }
    };
    const fmtDate = (d) => {
      if (!d) return "";
      try {
        const dt = new Date(d);
        return dt.toLocaleDateString() + " " + dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      } catch {
        return "";
      }
    };
    return /* @__PURE__ */ React.createElement("div", { style: { padding: "16px 24px" } }, /* @__PURE__ */ React.createElement(
      SubViewHeader,
      {
        title: `${classroomName} Photos`,
        onClose,
        actions: /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", style: { padding: "0.4rem 0.8rem", fontSize: "0.85rem" }, disabled: uploading, onClick: () => fileRef.current?.click() }, /* @__PURE__ */ React.createElement(Icon, { name: "plus", size: 15 }), " ", uploading ? "Uploading\u2026" : "Upload")
      }
    ), /* @__PURE__ */ React.createElement("input", {
      ref: fileRef, type: "file", accept: "image/*", multiple: true, style: { display: "none" }, onChange: (e) => {
        handleUploadFiles(e.target.files);
        e.target.value = "";
      }
    }), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", borderRadius: 999, border: "1px solid var(--color-primary)", overflow: "hidden", marginBottom: 16 } }, ["before", "after"].map((c) => /* @__PURE__ */ React.createElement("button", { key: c, onClick: () => setCategory(c), style: { flex: 1, padding: "0.6rem", border: "none", cursor: "pointer", fontWeight: 600, background: category === c ? "var(--color-primary)" : "transparent", color: category === c ? "#fff" : "var(--color-primary)", textTransform: "capitalize" } }, c))), /* @__PURE__ */ React.createElement("div", { style: { borderTop: "1px solid var(--color-border)", paddingTop: 16 } }, loading ? /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 } }, Array.from({ length: 6 }).map((_, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "skeleton", style: { height: 200, borderRadius: 12 } }))) : error ? /* @__PURE__ */ React.createElement("div", { className: "empty-state" }, /* @__PURE__ */ React.createElement(Icon, { name: "alert-circle", size: 40 }), /* @__PURE__ */ React.createElement("p", { className: "empty-state-title" }, error)) : items.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "empty-state" }, /* @__PURE__ */ React.createElement(Icon, { name: "image", size: 40 }), /* @__PURE__ */ React.createElement("p", { className: "empty-state-title" }, "No photos")) : /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 } }, items.map((item, i) => {
      const url = item.url || item.Url || "";
      const name = item.name || item.Name || "";
      const modified = fmtDate(item.lastModified || item.LastModified);
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: i,
          style: { borderRadius: 12, border: "1px solid var(--color-border)", overflow: "hidden", cursor: "pointer", transition: "transform 0.15s" },
          onClick: () => setPreviewItem(item),
          onMouseOver: (e) => e.currentTarget.style.transform = "translateY(-2px)",
          onMouseOut: (e) => e.currentTarget.style.transform = ""
        },
        /* @__PURE__ */ React.createElement("div", { style: { aspectRatio: "1", background: "#f3f3f3", overflow: "hidden" } }, /* @__PURE__ */ React.createElement("img", { src: url, alt: name, style: { width: "100%", height: "100%", objectFit: "cover" }, onError: (e) => e.target.style.display = "none" })),
        /* @__PURE__ */ React.createElement("div", { style: { padding: "8px 10px" } }, name && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "0.8rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, name), modified && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: 2 } }, modified))
      );
    }))), previewItem && /* @__PURE__ */ React.createElement(GlobalCanvasPortal, null, /* @__PURE__ */ React.createElement("div", { className: "modal-overlay", onClick: () => setPreviewItem(null), style: { background: "rgba(0,0,0,0.85)" } }, /* @__PURE__ */ React.createElement("div", { onClick: (e) => e.stopPropagation(), style: { position: "relative", maxWidth: "90vw", maxHeight: "90vh" } }, /* @__PURE__ */ React.createElement("button", { onClick: () => setPreviewItem(null), style: { position: "absolute", top: -40, right: 0, background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" } }, /* @__PURE__ */ React.createElement(Icon, { name: "x", size: 18 })), /* @__PURE__ */ React.createElement("img", { src: previewItem.url || previewItem.Url, alt: "", style: { maxWidth: "90vw", maxHeight: "85vh", borderRadius: 12, objectFit: "contain" } })))));
  };
  var ClassroomReportsView = ({ classroomId, classroomName, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [error, setError] = useState(null);
    const [canUploadAll, setCanUploadAll] = useState(false);
    const [canUpdate, setCanUpdate] = useState(false);
    const [canDelete, setCanDelete] = useState(false);
    const [editingReport, setEditingReport] = useState(null);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
    const loadReports = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/api/classroomStudents/user/${classroomId}`);
        const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setItems(data);
        const hdr = res.headers?.["x-uploadall"];
        setCanUploadAll(hdr === "true" || hdr === true);
        const xUpdate = res.headers?.["x-update"];
        setCanUpdate(xUpdate === "true" || xUpdate === true);
        const xDelete = res.headers?.["x-delete"];
        setCanDelete(xDelete === "true" || xDelete === true);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    useEffect(() => {
      loadReports();
    }, [classroomId]);
    const toggleShow = async (reportId, currentShow) => {
      try {
        await api.patch("/api/report/user", { Id: reportId, show: currentShow ? 0 : 1 });
        await loadReports();
      } catch {
        alert("Failed to update");
      }
    };
    const deleteReport = async (reportId) => {
      if (!confirm("Delete this report permanently?")) return;
      try {
        await api.delete("/api/report/user", { params: { id: reportId } });
        await loadReports();
      } catch {
        alert("Delete failed");
      }
    };
    const exportAll = async () => {
      const year = prompt("Enter year for export:", (/* @__PURE__ */ new Date()).getFullYear().toString());
      if (!year) return;
      try {
        const res = await api.post("/api/uploadReports/user", { year: parseInt(year) });
        if (res.status === 202) alert("Export requested. You will receive an email soon.");
        else alert("Export request failed");
      } catch {
        alert("Export request failed");
      }
    };
    const reportStatus = (r) => {
      const id = r.Id || r.id;
      if (!id) return { icon: "info", color: "#dc2626", text: "No active entry" };
      const has = (k) => (r[k] || "").toString().trim() !== "";
      const hasNum = (k) => {
        const v = r[k];
        return v != null && v !== "" && v !== 0 && v !== "0";
      };
      const hasArabic = has("arabiccomment") && has("reading") && has("writing") && has("speaking") && has("comprehension") && has("homework") && hasNum("arabiceffort");
      const hasQuran = has("qurancomment") && has("memorisation") && has("recitationfluency") && hasNum("quraneffort");
      if (hasArabic && hasQuran) return { icon: "check-circle", color: "#16a34a", text: "(ALL) Completed" };
      if (hasArabic) return { icon: "check-circle", color: "#16a34a", text: "(Arabic) Completed" };
      if (hasQuran) return { icon: "check-circle", color: "#16a34a", text: "(Quran) Completed" };
      return { icon: "info", color: "#f59e0b", text: "Incomplete entry" };
    };
    if (editingReport) {
      return /* @__PURE__ */ React.createElement(
        ReportEditorView,
        {
          studentId: editingReport.studentId,
          studentName: editingReport.studentName,
          reportId: editingReport.reportId,
          initialReport: editingReport.row,
          onClose: () => setEditingReport(null),
          onSaved: () => {
            setEditingReport(null);
            loadReports();
          }
        }
      );
    }
    return /* @__PURE__ */ React.createElement("div", { style: { padding: "16px 24px" } }, /* @__PURE__ */ React.createElement(
      SubViewHeader,
      {
        title: classroomName ? `${classroomName} Reports` : "Reports",
        onClose,
        actions: canUploadAll ? /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", style: { padding: "0.35rem 0.8rem", fontSize: "0.82rem" }, onClick: exportAll }, /* @__PURE__ */ React.createElement(Icon, { name: "download", size: 14 }), " Export All") : null
      }
    ), /* @__PURE__ */ React.createElement("div", { style: { borderTop: "1px solid var(--color-border)", paddingTop: 16 } }, loading ? /* @__PURE__ */ React.createElement(TableSkeleton, { rows: 8, cols: 3 }) : error ? /* @__PURE__ */ React.createElement("div", { className: "empty-state" }, /* @__PURE__ */ React.createElement(Icon, { name: "alert-circle", size: 40 }), /* @__PURE__ */ React.createElement("p", { className: "empty-state-title" }, error)) : items.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "empty-state" }, /* @__PURE__ */ React.createElement(Icon, { name: "file-text", size: 40 }), /* @__PURE__ */ React.createElement("p", { className: "empty-state-title" }, "No reports found")) : /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } }, items.map((r, i) => {
      const studentName = (r.student_name || r.studentName || "").toString().trim();
      const studentCode = (r.student_code || r.studentCode || r.code || "").toString().trim();
      const photo = r.student_photo || r.studentPhoto || r.photo || "";
      const reportId = r.Id || r.id;
      const st = reportStatus(r);
      const showVal = r.show === true || r.show === 1 || r.Show === true || r.Show === 1;
      const docUrl = (r.document || r.Document || "").toString().trim();
      return /* @__PURE__ */ React.createElement("div", { key: i, style: { display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, border: "1px solid var(--color-border)" } }, /* @__PURE__ */ React.createElement(Avatar, { name: studentName || "Student", photoUrl: toAbsoluteAssetUrl(photo), id: r.student_id || r.studentId || i, size: 44 }), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, fontSize: "0.9rem" } }, studentName || "Student"), studentCode && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "0.78rem", color: "var(--color-text-muted)" } }, studentCode), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 4, marginTop: 4 } }, /* @__PURE__ */ React.createElement(Icon, { name: st.icon, size: 13, style: { color: st.color } }), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "0.75rem", fontWeight: 600, color: st.color } }, st.text))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, alignItems: "center" } }, reportId ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", style: { padding: "0.25rem 0.5rem", fontSize: "0.72rem" }, onClick: () => setEditingReport({ studentId: r.student_id || r.studentId, studentName, reportId, row: r }), title: "Edit report" }, /* @__PURE__ */ React.createElement(Icon, { name: "edit-2", size: 13 })), /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", style: { padding: "0.25rem 0.5rem", fontSize: "0.72rem" }, onClick: () => toggleShow(reportId, showVal), title: showVal ? "Hide from parent" : "Show to parent" }, /* @__PURE__ */ React.createElement(Icon, { name: showVal ? "eye" : "eye-off", size: 13 })), docUrl && /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", style: { padding: "0.25rem 0.5rem", fontSize: "0.72rem" }, onClick: () => setPdfPreviewUrl(docUrl.startsWith("http") ? docUrl : API_BASE + docUrl), title: "View PDF" }, /* @__PURE__ */ React.createElement(Icon, { name: "file-text", size: 13 })), /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", style: { padding: "0.25rem 0.5rem", fontSize: "0.72rem", color: "#dc2626" }, onClick: () => deleteReport(reportId), title: "Delete report" }, /* @__PURE__ */ React.createElement(Icon, { name: "trash-2", size: 13 }))) : /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", style: { padding: "0.25rem 0.5rem", fontSize: "0.72rem" }, onClick: () => setEditingReport({ studentId: r.student_id || r.studentId, studentName, reportId: null, row: null }), title: "Create report" }, /* @__PURE__ */ React.createElement(Icon, { name: "plus", size: 13 }), " Create")));
    }))), pdfPreviewUrl && /* @__PURE__ */ React.createElement(GlobalCanvasPortal, null, /* @__PURE__ */ React.createElement("div", { className: "modal-overlay", onClick: () => setPdfPreviewUrl(null), style: { background: "rgba(0,0,0,0.85)" } }, /* @__PURE__ */ React.createElement("div", { onClick: (e) => e.stopPropagation(), style: { position: "relative", width: "90vw", height: "90vh", background: "#fff", borderRadius: 8, overflow: "hidden", display: "flex", flexDirection: "column" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "var(--color-surface)", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)" } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 600 } }, "PDF Preview"), /* @__PURE__ */ React.createElement("button", { onClick: () => setPdfPreviewUrl(null), className: "topbar-icon-btn" }, /* @__PURE__ */ React.createElement(Icon, { name: "x", size: 18 }))), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, position: "relative" } }, /* @__PURE__ */ React.createElement(PdfPreviewIframe, { url: pdfPreviewUrl }))))));
  };
  var StudentReportsView = ({ studentId, studentName, studentCode, photoUrl, onEditingChange }) => {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [error, setError] = useState(null);
    const [editingReport, setEditingReport] = useState(null);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
    useEffect(() => {
      if (onEditingChange) onEditingChange(!!editingReport);
    }, [editingReport, onEditingChange]);
    const loadReports = async () => {
      setLoading(true);
      setError(null);
      try {
        const [resVisible, resHidden] = await Promise.all([
          api.get("/api/getReports/user", {
            params: { studentid: studentId, l: 0, filter: "show eq '1'", orderBy: "date DESC" }
          }).catch(() => ({ data: [] })),
          api.get("/api/getReports/user", {
            params: { studentid: studentId, l: 0, filter: "show eq '0'", orderBy: "date DESC" }
          }).catch(() => ({ data: [] }))
        ]);
        const extract = (res) => Array.isArray(res.data?.reports || res.data?.data || res.data?.items || res.data?.results || res.data) ? res.data?.reports || res.data?.data || res.data?.items || res.data?.results || res.data : [];
        const merged = [...extract(resVisible), ...extract(resHidden)];
        merged.sort((a, b) => {
          const dateA = new Date(a.date || a.Date || a.createdon || a.CreatedOn || a.Id || a.id || 0).getTime();
          const dateB = new Date(b.date || b.Date || b.createdon || b.CreatedOn || b.Id || b.id || 0).getTime();
          return dateB - dateA;
        });
        setItems(merged);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    useEffect(() => {
      if (studentId) loadReports();
    }, [studentId]);
    const toggleShow = async (reportId, currentShow) => {
      try {
        await api.patch("/api/report/user", { Id: reportId, show: currentShow ? 0 : 1 });
        await loadReports();
      } catch {
        alert("Failed to update");
      }
    };
    const deleteReport = async (reportId) => {
      if (!confirm("Delete this report permanently?")) return;
      try {
        await api.delete("/api/report/user", { params: { id: reportId } });
        await loadReports();
      } catch {
        alert("Delete failed");
      }
    };
    const reportStatus = (r) => {
      const id = r.Id || r.id;
      if (!id) return { icon: "info", color: "#dc2626", text: "No active entry" };
      const has = (k) => (r[k] || "").toString().trim() !== "";
      const hasNum = (k) => {
        const v = r[k];
        return v != null && v !== "" && v !== 0 && v !== "0";
      };
      const hasArabic = has("arabiccomment") && has("reading") && has("writing") && has("speaking") && has("comprehension") && has("homework") && hasNum("arabiceffort");
      const hasQuran = has("qurancomment") && has("memorisation") && has("recitationfluency") && hasNum("quraneffort");
      if (hasArabic && hasQuran) return { icon: "check-circle", color: "#16a34a", text: "(ALL) Completed" };
      if (hasArabic) return { icon: "check-circle", color: "#16a34a", text: "(Arabic) Completed" };
      if (hasQuran) return { icon: "check-circle", color: "#16a34a", text: "(Quran) Completed" };
      return { icon: "info", color: "#f59e0b", text: "Incomplete entry" };
    };
    if (editingReport) {
      return /* @__PURE__ */ React.createElement(
        ReportEditorView,
        {
          studentId: editingReport.studentId,
          studentName: editingReport.studentName,
          reportId: editingReport.reportId,
          initialReport: editingReport.row,
          onClose: () => setEditingReport(null),
          onSaved: () => {
            setEditingReport(null);
            loadReports();
          }
        }
      );
    }
    return /* @__PURE__ */ React.createElement("div", { style: { position: "relative" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", marginBottom: 16 } }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: () => setEditingReport({ studentId, studentName, reportId: null, row: null }) }, /* @__PURE__ */ React.createElement(Icon, { name: "plus", size: 16, style: { marginRight: 6 } }), " Create Report")), loading ? /* @__PURE__ */ React.createElement(TableSkeleton, { rows: 4, cols: 3 }) : error ? /* @__PURE__ */ React.createElement("div", { className: "empty-state" }, /* @__PURE__ */ React.createElement(Icon, { name: "alert-circle", size: 40 }), /* @__PURE__ */ React.createElement("p", { className: "empty-state-title" }, error)) : items.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "empty-state" }, /* @__PURE__ */ React.createElement(Icon, { name: "file-text", size: 40 }), /* @__PURE__ */ React.createElement("p", { className: "empty-state-title" }, "No reports found")) : /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } }, items.map((r, i) => {
      const rTitle = r.classroom_name || r.classroom || (r.document ? r.document.split("/").pop() : "Report");
      const leditedBy = r.leditedBy_name || r.leditedByName || r.ledited_by || r.leditedby_name || "-";
      const leditedOnRaw = r.leditedon || r.leditedOn || r.ledited_on || r.leditedDate;
      const leditedOn = leditedOnRaw ? formatDate(leditedOnRaw) : "-";
      const reportId = r.Id || r.id;
      const st = reportStatus(r);
      const showVal = r.show === true || r.show === 1 || r.Show === true || r.Show === 1;
      const docUrl = (r.document || r.Document || "").toString().trim();
      return /* @__PURE__ */ React.createElement("div", { key: i, style: { display: "flex", alignItems: "center", gap: 12, padding: 16, borderRadius: 12, border: "1px solid var(--color-border)", background: "#fff" } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, fontSize: "1rem", color: "var(--color-text-main)" } }, rTitle), /* @__PURE__ */ React.createElement("span", {
        className: "status-chip", style: {
          background: showVal ? "#ecfdf5" : "#fef2f2",
          color: showVal ? "#059669" : "#dc2626",
          border: `1px solid ${showVal ? "#a7f3d0" : "#fecaca"}`,
          fontSize: "0.7rem",
          padding: "2px 8px"
        }
      }, showVal ? "Visible" : "Not Visible")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 8 } }, /* @__PURE__ */ React.createElement(Icon, { name: st.icon, size: 14, style: { color: st.color } }), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "0.8rem", fontWeight: 600, color: st.color } }, st.text)), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "0.8rem", color: "var(--color-text-muted)" } }, "Last Edited by: ", /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 500 } }, leditedBy), " \u2022 ", leditedOn)), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center" } }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", style: { padding: "0.4rem 0.6rem", fontSize: "0.85rem" }, onClick: () => setEditingReport({ studentId, studentName, reportId, row: r }), title: "Edit report" }, /* @__PURE__ */ React.createElement(Icon, { name: "edit-2", size: 15 })), /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", style: { padding: "0.4rem 0.6rem", fontSize: "0.85rem" }, onClick: () => toggleShow(reportId, showVal), title: showVal ? "Hide from parent" : "Show to parent" }, /* @__PURE__ */ React.createElement(Icon, { name: showVal ? "eye" : "eye-off", size: 15 })), docUrl && /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", style: { padding: "0.4rem 0.6rem", fontSize: "0.85rem" }, onClick: () => setPdfPreviewUrl(docUrl.startsWith("http") ? docUrl : API_BASE + (docUrl.startsWith("/") ? "" : "/") + docUrl), title: "View PDF" }, /* @__PURE__ */ React.createElement(Icon, { name: "file-text", size: 15 })), /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", style: { padding: "0.4rem 0.6rem", fontSize: "0.85rem", color: "#dc2626", borderColor: "#fee2e2", background: "#fef2f2" }, onClick: () => deleteReport(reportId), title: "Delete report" }, /* @__PURE__ */ React.createElement(Icon, { name: "trash-2", size: 15 }))));
    })), pdfPreviewUrl && /* @__PURE__ */ React.createElement(GlobalCanvasPortal, null, /* @__PURE__ */ React.createElement("div", { className: "modal-overlay", onClick: () => setPdfPreviewUrl(null), style: { background: "rgba(0,0,0,0.85)" } }, /* @__PURE__ */ React.createElement("div", { onClick: (e) => e.stopPropagation(), style: { position: "relative", width: "90vw", height: "90vh", background: "#fff", borderRadius: 8, overflow: "hidden", display: "flex", flexDirection: "column" } }, /* @__PURE__ */ React.createElement("div", { style: { background: "var(--color-surface)", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)" } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 600 } }, "PDF Preview"), /* @__PURE__ */ React.createElement("button", { onClick: () => setPdfPreviewUrl(null), className: "topbar-icon-btn" }, /* @__PURE__ */ React.createElement(Icon, { name: "x", size: 18 }))), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, position: "relative" } }, /* @__PURE__ */ React.createElement(PdfPreviewIframe, { url: pdfPreviewUrl }))))));
  };
  var PdfPreviewIframe = ({ url }) => {
    const [blobUrl, setBlobUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
      let mounted = true;
      const loadPdf = async () => {
        setLoading(true);
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Failed to fetch PDF (${res.status})`);
          const arrayBuffer = await res.arrayBuffer();
          if (!mounted) return;
          const pdfBlob = new Blob([arrayBuffer], { type: "application/pdf" });
          const objUrl = URL.createObjectURL(pdfBlob);
          setBlobUrl(objUrl);
        } catch (err) {
          if (mounted) setError(err.message);
        } finally {
          if (mounted) setLoading(false);
        }
      };
      loadPdf();
      return () => {
        mounted = false;
      };
    }, [url]);
    useEffect(() => {
      return () => {
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
        }
      };
    }, [blobUrl]);
    if (loading) return /* @__PURE__ */ React.createElement("div", { className: "loading-center", style: { padding: 40 } }, /* @__PURE__ */ React.createElement("div", { className: "spinner" }), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 12, fontWeight: 600 } }, "Loading Document..."));
    if (error) return /* @__PURE__ */ React.createElement("div", { className: "empty-state", style: { padding: 40 } }, /* @__PURE__ */ React.createElement(Icon, { name: "alert-circle", size: 40 }), /* @__PURE__ */ React.createElement("p", { className: "empty-state-title" }, "Failed to load PDF"), /* @__PURE__ */ React.createElement("p", null, error));
    return /* @__PURE__ */ React.createElement("iframe", { src: `${blobUrl}#toolbar=1&navpanes=1&scrollbar=1&zoom=100`, style: { width: "100%", height: "100%", minHeight: "600px", border: "none" }, title: "PDF Preview" });
  };
  var ReportEditorView = ({ studentId, studentName, reportId, initialReport, onClose, onSaved }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [student, setStudent] = useState(null);
    const [report, setReport] = useState(initialReport);
    const [arabicEffort, setArabicEffort] = useState(null);
    const [reading, setReading] = useState(null);
    const [writing, setWriting] = useState(null);
    const [speaking, setSpeaking] = useState(null);
    const [listening, setListening] = useState(null);
    const [homework, setHomework] = useState(null);
    const [arabicComment, setArabicComment] = useState("");
    const [quranEffort, setQuranEffort] = useState(null);
    const [memorisation, setMemorisation] = useState(null);
    const [recitation, setRecitation] = useState(null);
    const [quranComment, setQuranComment] = useState("");
    const [arabicOptions, setArabicOptions] = useState([]);
    const [quranOptions, setQuranOptions] = useState([]);
    const [activeTab, setActiveTab] = useState("arabic");
    const performanceLevels = ["Beyond", "Sound", "Improving"];
    const efforts = [5, 4, 3, 2, 1];
    useEffect(() => {
      let mounted = true;
      const load = async () => {
        setLoading(true);
        setError(null);
        try {
          const stRes = await api.get(`/api/students/${studentId}`, { params: { col: "program,classroom_name,name,photo,gender" } });
          const stData = stRes.data?.data || stRes.data?.Data || stRes.data || {};
          let currentReport = report;
          if (reportId && !currentReport) {
            const rRes = await api.get(`/api/getReport/${reportId}/other`);
            const d = rRes.data;
            currentReport = Array.isArray(d) ? d[0] : d;
          }
          const gender = String(stData.gender || stData.Gender || "").toLowerCase().startsWith("f") ? "female" : "male";
          const [arOpts, qrOpts] = await Promise.all([
            api.get("/api/options", { params: { t: `ar${gender}`, type: `ar${gender}` } }).catch(() => ({ data: [] })),
            api.get("/api/options", { params: { t: `qr${gender}`, type: `qr${gender}` } }).catch(() => ({ data: [] }))
          ]);
          const parseOptions = (res) => {
            let lst = res.data?.data || res.data;
            if (!Array.isArray(lst)) {
              if (lst && typeof lst === "object" && (lst.Key || lst.Value || lst.key || lst.value)) {
                lst = [lst];
              } else {
                lst = [];
              }
            }
            return [...new Set(lst.map((m) => (m.Value || m.value || m.Key || m.key || "").trim()).filter(Boolean))];
          };
          if (!mounted) return;
          setStudent(stData);
          setReport(currentReport);
          setArabicOptions(parseOptions(arOpts));
          setQuranOptions(parseOptions(qrOpts));
          if (currentReport) {
            const toInt = (v) => {
              const n = parseInt(v);
              return isNaN(n) ? null : n;
            };
            setArabicEffort(toInt(currentReport.arabiceffort || currentReport.arabicEffort || currentReport.ArabicEffort));
            setReading(currentReport.reading || currentReport.Reading);
            setWriting(currentReport.writing || currentReport.Writing);
            setSpeaking(currentReport.speaking || currentReport.Speaking);
            setListening(currentReport.comprehension || currentReport.Comprehension);
            setHomework(currentReport.homework || currentReport.Homework);
            setArabicComment(currentReport.arabiccomment || currentReport.ArabicComment || "");
            setQuranEffort(toInt(currentReport.quraneffort || currentReport.quranEffort || currentReport.QuranEffort));
            setMemorisation(currentReport.memorisation || currentReport.Memorisation);
            setRecitation(currentReport.recitationfluency || currentReport.recitationFluency || currentReport.RecitationFluency);
            setQuranComment(currentReport.qurancomment || currentReport.QuranComment || "");
          }
        } catch (e) {
          setError(e.message);
        } finally {
          if (mounted) setLoading(false);
        }
      };
      load();
      return () => {
        mounted = false;
      };
    }, [studentId, reportId]);
    const handleSave = async () => {
      if (saving) return;
      setSaving(true);
      try {
        const documentUrl = (report?.document || report?.Document || "").toString();
        const payload = {
          student: studentId,
          document: documentUrl,
          arabiceffort: arabicEffort || 0,
          reading: reading || "",
          writing: writing || "",
          speaking: speaking || "",
          comprehension: listening || "",
          homework: homework || "",
          arabiccomment: arabicComment || "",
          quraneffort: quranEffort || 0,
          memorisation: memorisation || "",
          recitationfluency: recitation || "",
          qurancomment: quranComment || ""
        };
        if (reportId) payload.Id = reportId;
        else {
          payload.show = 0;
          payload.sent = 0;
          payload.date = (/* @__PURE__ */ new Date()).toISOString();
          const cid = student?.class_id || student?.classroom_id || student?.Classroom_id || student?.ClassroomId;
          if (cid) payload.classroom = cid;
          Object.keys(payload).forEach((k) => {
            if (payload[k] === "" || ["arabiceffort", "quraneffort"].includes(k) && payload[k] === 0) delete payload[k];
          });
        }
        if (reportId) {
          try {
            await api.put("/api/report/user", payload);
          } catch {
            await api.patch("/api/report/user", payload);
          }
        } else {
          await api.post("/api/report/user", payload);
        }
        onSaved();
      } catch (e) {
        alert("Save failed: " + e.message);
      } finally {
        setSaving(false);
      }
    };
    const SelectField = ({ label, value, onChange, options }) => /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 16 } }, /* @__PURE__ */ React.createElement("label", { style: { display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 6 } }, label), /* @__PURE__ */ React.createElement("select", { className: "form-input", value: value || "", onChange: (e) => onChange(e.target.value || null) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "-"), options.map((o) => /* @__PURE__ */ React.createElement("option", { key: o, value: o }, o))));
    const CommentField = ({ label, value, onChange, options }) => {
      const matchedOption = options.find((o) => o.trim().toLowerCase() === (value || "").trim().toLowerCase()) || "";
      return /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 16 } }, /* @__PURE__ */ React.createElement("label", { style: { display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 6 } }, label, " Preset"), /* @__PURE__ */ React.createElement("select", {
        className: "form-input", style: { marginBottom: 8 }, value: matchedOption, onChange: (e) => {
          const preset = e.target.value;
          if (preset) onChange(preset);
        }
      }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Select a preset..."), options.map((o) => /* @__PURE__ */ React.createElement("option", { key: o, value: o }, o.slice(0, 80), o.length > 80 ? "..." : ""))), /* @__PURE__ */ React.createElement("textarea", { className: "form-input", rows: 5, value: value || "", onChange: (e) => onChange(e.target.value), placeholder: "Type comment..." }));
    };
    return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "100%", background: "#fff", borderRadius: 8, overflow: "hidden" } }, /* @__PURE__ */ React.createElement(
      SubViewHeader,
      {
        title: reportId ? "Edit Report" : "Create Report",
        onClose,
        actions: /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", style: { padding: "0.35rem 0.8rem", fontSize: "0.82rem" }, disabled: saving || loading, onClick: handleSave }, /* @__PURE__ */ React.createElement(Icon, { name: "save", size: 14 }), " ", saving ? "Saving..." : "Save")
      }
    ), loading ? /* @__PURE__ */ React.createElement("div", { style: { padding: 24 } }, /* @__PURE__ */ React.createElement(TableSkeleton, { rows: 4, cols: 1 })) : error ? /* @__PURE__ */ React.createElement("div", { className: "empty-state" }, /* @__PURE__ */ React.createElement(Icon, { name: "alert-circle", size: 40 }), /* @__PURE__ */ React.createElement("p", { className: "empty-state-title" }, error)) : /* @__PURE__ */ React.createElement("div", { style: { flex: 1, overflowY: "auto", padding: "32px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 12, alignItems: "center", marginBottom: 24 } }, /* @__PURE__ */ React.createElement(Avatar, { name: studentName, photoUrl: toAbsoluteAssetUrl(student?.photo || student?.Photo), size: 56 }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "1.2rem", fontWeight: 700 } }, studentName), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "0.85rem", color: "var(--color-text-muted)" } }, student?.classroom_name || student?.ClassroomName || ""))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 32, maxWidth: 1200 } }, ((student?.program || student?.Program || "Default - Weekend").toString().includes("Default") || (student?.program || student?.Program || "").toString().includes("Arabic")) && /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("h3", { style: { marginBottom: 16, color: "var(--color-primary)", borderBottom: "2px solid var(--color-border-light)", paddingBottom: 8 } }, "Arabic Program"), /* @__PURE__ */ React.createElement(SelectField, { label: "Effort Level", value: arabicEffort, onChange: setArabicEffort, options: efforts }), /* @__PURE__ */ React.createElement(SelectField, { label: "Reading", value: reading, onChange: setReading, options: performanceLevels }), /* @__PURE__ */ React.createElement(SelectField, { label: "Writing", value: writing, onChange: setWriting, options: performanceLevels }), /* @__PURE__ */ React.createElement(SelectField, { label: "Speaking", value: speaking, onChange: setSpeaking, options: performanceLevels }), /* @__PURE__ */ React.createElement(SelectField, { label: "Listening Comprehension", value: listening, onChange: setListening, options: performanceLevels }), /* @__PURE__ */ React.createElement(SelectField, { label: "Homework Participation", value: homework, onChange: setHomework, options: performanceLevels }), /* @__PURE__ */ React.createElement(CommentField, { label: "Arabic Comment", value: arabicComment, onChange: setArabicComment, options: arabicOptions })), ((student?.program || student?.Program || "Default - Weekend").toString().includes("Default") || (student?.program || student?.Program || "").toString().includes("Quran")) && /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("h3", { style: { marginBottom: 16, color: "var(--color-primary)", borderBottom: "2px solid var(--color-border-light)", paddingBottom: 8 } }, "Quran Program"), /* @__PURE__ */ React.createElement(SelectField, { label: "Effort Level", value: quranEffort, onChange: setQuranEffort, options: efforts }), /* @__PURE__ */ React.createElement(SelectField, { label: "Memorisation", value: memorisation, onChange: setMemorisation, options: performanceLevels }), /* @__PURE__ */ React.createElement(SelectField, { label: "Recitation Fluency", value: recitation, onChange: setRecitation, options: performanceLevels }), /* @__PURE__ */ React.createElement(CommentField, { label: "Quran Comment", value: quranComment, onChange: setQuranComment, options: quranOptions })))));
  };
  var ClassroomDetailsView = ({ classroom: initialClassroom, onClose, onEdit, onRefresh }) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [canUpdate, setCanUpdate] = useState(false);
    const [balanceSupported, setBalanceSupported] = useState(false);
    const [tick, setTick] = useState(0);
    const [showBookStatus, setShowBookStatus] = useState(false);
    const [showMedical, setShowMedical] = useState(true);
    const [showPhotoConsent, setShowPhotoConsent] = useState(true);
    const [showUpdateStatus, setShowUpdateStatus] = useState(false);
    const [showStoryBooking, setShowStoryBooking] = useState(false);
    const [showBalance, setShowBalance] = useState(false);
    const [showEnrollment, setShowEnrollment] = useState(false);
    const [attendanceMode, setAttendanceMode] = useState(false);
    const [attendanceIds, setAttendanceIds] = useState(/* @__PURE__ */ new Set());
    const [attendanceDate, setAttendanceDate] = useState("");
    const [attendanceTime, setAttendanceTime] = useState("");
    const [submittingAtt, setSubmittingAtt] = useState(false);
    const [subView, setSubView] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const classroomId = initialClassroom?.Id || initialClassroom?.id;
    const loadDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = { details: true };
        if (showStoryBooking) params.story = true;
        if (showBalance) params.balance = true;
        const res = await api.get(`/api/classrooms/${classroomId}`, { params });
        const parsed = res.data?.data || res.data || {};
        setData(parsed);
        const xUpdate = res.headers?.["x-update"];
        setCanUpdate(xUpdate === "true" || xUpdate === true);
        const xBal = res.headers?.["x-balance"];
        const hasBal = xBal === "true" || xBal === true;
        setBalanceSupported(hasBal);
        if (!hasBal) setShowBalance(false);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    useEffect(() => {
      if (classroomId) loadDetails();
    }, [classroomId, tick]);
    useEffect(() => {
      const handler = (e) => {
        if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, []);
    const safe = (v) => (v ?? "").toString().trim();
    const truthy = (v) => {
      if (v == null) return false;
      if (typeof v === "boolean") return v;
      const s = v.toString().trim().toLowerCase();
      return s === "1" || s === "true" || s === "yes";
    };
    const className = safe(data?.Name || data?.name || initialClassroom?.name || initialClassroom?.Name);
    const classPhoto = toAbsoluteAssetUrl(safe(data?.Photo || data?.photo || initialClassroom?.photo || initialClassroom?.Photo));
    const classStatus = safe(data?.Status || data?.status || initialClassroom?.status || initialClassroom?.Status);
    const classRoom = safe(data?.Room || data?.room || initialClassroom?.room || initialClassroom?.Room);
    const isInactive = classStatus.toLowerCase() === "inactive";
    const isTemplate = classStatus.toLowerCase() === "template";
    const details = data?.details || {};
    const students = useMemo(() => {
      const raw = details?.students;
      return Array.isArray(raw) ? raw : [];
    }, [data]);
    const teachers = useMemo(() => {
      const raw = details?.teachers;
      return Array.isArray(raw) ? raw : [];
    }, [data]);
    const malesCount = details?.malesCount || 0;
    const femalesCount = details?.femalesCount || 0;
    const presentCount = useMemo(() => students.filter((s) => (s.lastAttendanceType || "").toString().toLowerCase() === "present").length, [students]);
    const absentCount = students.length - presentCount;
    const toggleAttId = (id) => setAttendanceIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
    const submitAttendance = async () => {
      if (submittingAtt) return;
      setSubmittingAtt(true);
      try {
        const body = { StudentIds: [...attendanceIds], ClassroomId: classroomId };
        const res = await api.post("/api/studentAttendance/user", body);
        if (res.status === 201) {
          setAttendanceMode(false);
          setAttendanceIds(/* @__PURE__ */ new Set());
          setAttendanceDate("");
          setAttendanceTime("");
          setTick((t) => t + 1);
        } else alert("Failed to mark attendance");
      } catch (e) {
        alert("Attendance error: " + e.message);
      } finally {
        setSubmittingAtt(false);
      }
    };
    if (subView === "ranking") return /* @__PURE__ */ React.createElement(ClassroomRankingView, {
      classroomId, onClose: () => {
        setSubView(null);
        setTick((t) => t + 1);
      }
    });
    if (subView === "moveStudents") return /* @__PURE__ */ React.createElement(MoveStudentsView, {
      classroomId, classroomName: className, students, onClose: () => setSubView(null), onDone: () => {
        setSubView(null);
        setTick((t) => t + 1);
      }
    });
    if (subView === "bookStatus") return /* @__PURE__ */ React.createElement(BookStatusChangeView, {
      classroomName: className, students, onClose: () => setSubView(null), onDone: () => {
        setSubView(null);
        setTick((t) => t + 1);
      }
    });
    if (subView === "studentPhoto") return /* @__PURE__ */ React.createElement(StudentPhotoChangeView, {
      classroomName: className, students, onClose: () => {
        setSubView(null);
        setTick((t) => t + 1);
      }
    });
    if (subView === "certificates") return /* @__PURE__ */ React.createElement(ClassroomTermCertificatesView, { classroomId, classroomName: className, students, teachers, onClose: () => setSubView(null) });
    if (subView === "photos") return /* @__PURE__ */ React.createElement(ClassroomPhotosHistoryView, { room: classRoom, classroomName: className, onClose: () => setSubView(null) });
    if (subView === "reports") return /* @__PURE__ */ React.createElement(ClassroomReportsView, { classroomId, classroomName: className, onClose: () => setSubView(null) });
    if (loading && !data) {
      return /* @__PURE__ */ React.createElement("div", { style: { padding: 24 } }, /* @__PURE__ */ React.createElement(SubViewHeader, { title: "Classroom", onClose }), /* @__PURE__ */ React.createElement(TableSkeleton, { rows: 10, cols: 3 }));
    }
    if (error && !data) {
      return /* @__PURE__ */ React.createElement("div", { style: { padding: 24 } }, /* @__PURE__ */ React.createElement(SubViewHeader, { title: "Classroom", onClose }), /* @__PURE__ */ React.createElement("div", { className: "empty-state" }, /* @__PURE__ */ React.createElement(Icon, { name: "alert-circle", size: 40 }), /* @__PURE__ */ React.createElement("p", { className: "empty-state-title" }, error)));
    }
    const filterChips = [
      { key: "book", label: "Book Status", active: showBookStatus, toggle: () => setShowBookStatus((p) => !p) },
      { key: "med", label: "Medical", active: showMedical, toggle: () => setShowMedical((p) => !p) },
      { key: "photo", label: "Photo Consent", active: showPhotoConsent, toggle: () => setShowPhotoConsent((p) => !p) },
      { key: "update", label: "Update Status", active: showUpdateStatus, toggle: () => setShowUpdateStatus((p) => !p) },
      {
        key: "story", label: "Story Booking", active: showStoryBooking, toggle: () => setShowStoryBooking((p) => {
          if (!p) setTick((t) => t + 1);
          return !p;
        })
      },
      {
        key: "balance", label: "Balance", active: showBalance, toggle: () => setShowBalance((p) => {
          if (!p) setTick((t) => t + 1);
          return !p;
        })
      },
      { key: "enroll", label: "Enrollment", active: showEnrollment, toggle: () => setShowEnrollment((p) => !p) }
    ];
    const mgmtActions = [
      { icon: "camera", label: "Classroom Photos", action: () => setSubView("photos"), show: !!classRoom },
      { icon: "file-text", label: "Reports", action: () => setSubView("reports"), show: students.length > 0 },
      {
        icon: "book", label: "Homework", action: () => {
          window.appFeedFilters = { classrooms: [classroomId], type: "Homework" };
          navigate("/feed");
        }, show: true
      },
      {
        icon: "message-square", label: "Posts", action: () => {
          window.appFeedFilters = { classrooms: [classroomId], type: "Announcement" };
          navigate("/feed");
        }, show: true
      }
    ];
    const menuItems = [
      ...canUpdate ? [{
        label: "Edit", icon: "edit", action: () => {
          setMenuOpen(false);
          onEdit?.();
        }
      }] : [],
      ...students.length > 0 ? [
        {
          label: "Ranking", icon: "award", action: () => {
            setMenuOpen(false);
            setSubView("ranking");
          }
        },
        {
          label: "Move Students", icon: "arrow-right", action: () => {
            setMenuOpen(false);
            setSubView("moveStudents");
          }
        },
        {
          label: "Book Status Change", icon: "book-open", action: () => {
            setMenuOpen(false);
            setSubView("bookStatus");
          }
        },
        {
          label: "Student Photo Change", icon: "camera", action: () => {
            setMenuOpen(false);
            setSubView("studentPhoto");
          }
        },
        {
          label: "Appreciation Certificates", icon: "award", action: () => {
            setMenuOpen(false);
            setSubView("certificates");
          }
        }
      ] : []
    ];
    return /* @__PURE__ */ React.createElement("div", { style: { padding: "0 24px 40px", maxWidth: 1200, margin: "0 auto" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0 12px", position: "sticky", top: 0, background: "var(--color-surface)", zIndex: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12 } }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", onClick: onClose, style: { padding: "0.4rem 0.8rem" } }, /* @__PURE__ */ React.createElement(Icon, { name: "arrow-left", size: 16 })), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "1.2rem", fontWeight: 700 } }, className || "Classroom"), isInactive && /* @__PURE__ */ React.createElement("span", { className: "status-chip status-inactive", style: { fontSize: "0.72rem" } }, "Inactive"), isTemplate && /* @__PURE__ */ React.createElement("span", { className: "status-chip", style: { fontSize: "0.72rem", background: "#795548", color: "#fff" } }, "Template")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, !attendanceMode && students.length > 0 && /* @__PURE__ */ React.createElement("button", {
      className: "btn btn-primary", style: { padding: "0.4rem 0.8rem", fontSize: "0.85rem" }, onClick: () => {
        setAttendanceMode(true);
        setAttendanceIds(/* @__PURE__ */ new Set());
      }
    }, /* @__PURE__ */ React.createElement(Icon, { name: "check-circle", size: 15 }), " Take Attendance"), menuItems.length > 0 && /* @__PURE__ */ React.createElement("div", { ref: menuRef, style: { position: "relative" } }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", style: { padding: "0.4rem 0.6rem" }, onClick: () => setMenuOpen((p) => !p) }, /* @__PURE__ */ React.createElement(Icon, { name: "more-vertical", size: 16 })), menuOpen && /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", right: 0, top: "100%", marginTop: 4, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 220, zIndex: 50, overflow: "hidden" } }, menuItems.map((m, i) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: i,
        onClick: m.action,
        style: { display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", cursor: "pointer", fontSize: "0.88rem", fontWeight: 500, transition: "background 0.1s" },
        onMouseOver: (e) => e.currentTarget.style.background = "var(--color-bg)",
        onMouseOut: (e) => e.currentTarget.style.background = ""
      },
      /* @__PURE__ */ React.createElement(Icon, { name: m.icon, size: 15, style: { color: "var(--color-text-muted)" } }),
      " ",
      m.label
    )))))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 20 } }, /* @__PURE__ */ React.createElement("div", { style: { width: 80, height: 80, borderRadius: "50%", overflow: "hidden", background: "linear-gradient(135deg, #8abf8c, #7bd681)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 12px rgba(80,172,85,0.3)" } }, classPhoto ? /* @__PURE__ */ React.createElement("img", { src: classPhoto, alt: "", style: { width: "100%", height: "100%", objectFit: "cover" } }) : /* @__PURE__ */ React.createElement("span", { style: { color: "#fff", fontWeight: 800, fontSize: "1.4rem" } }, initialsFromName(className)))), teachers.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 } }, teachers.slice(0, 5).map((t, i) => {
      const tName = (t.fullname || t.name || t.teacherName || t.Name || "").toString().trim() || "Teacher";
      const tPhoto = t.photo || t.Photo || "";
      return /* @__PURE__ */ React.createElement("div", {
        key: i, onClick: () => {
          window.appTeacherFilter = { id: t.id || t.Id || i };
          navigate("/teachers");
        }, style: { cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 20, background: "var(--color-bg)", border: "1px solid var(--color-border)" }
      }, /* @__PURE__ */ React.createElement(Avatar, { name: tName, photoUrl: toAbsoluteAssetUrl(tPhoto), id: t.id || t.Id || i, size: 28 }), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "0.82rem", fontWeight: 600 } }, tName));
    })), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 } }, mgmtActions.filter((a) => a.show).map((a, i) => /* @__PURE__ */ React.createElement("button", { key: i, className: "btn btn-secondary", style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 20px", borderRadius: 14, minWidth: 100 }, onClick: a.action }, /* @__PURE__ */ React.createElement(Icon, { name: a.icon, size: 20, style: { color: "var(--color-primary)" } }), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "0.78rem", fontWeight: 600 } }, a.label)))), /* @__PURE__ */ React.createElement(SectionHeader, { title: `Participants (${students.length})`, icon: "users" }), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: "0.82rem", color: "var(--color-text-muted)", fontWeight: 800 } }, "[", /* @__PURE__ */ React.createElement("span", { style: { color: "#2196f3" } }, "M: ", malesCount), " ", /* @__PURE__ */ React.createElement("span", { style: { color: "var(--color-text-muted)" } }, "|"), " ", /* @__PURE__ */ React.createElement("span", { style: { color: "#9c27b0" } }, "F: ", femalesCount), "]"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "0.82rem", color: "var(--color-text-muted)" } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#16a34a", fontWeight: 700 } }, presentCount), " Present \xB7 ", /* @__PURE__ */ React.createElement("span", { style: { color: "#999", fontWeight: 700 } }, absentCount), " Absent")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 } }, filterChips.map((c) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: c.key,
        onClick: c.toggle,
        style: { padding: "5px 12px", borderRadius: 999, border: `1px solid ${c.active ? "var(--color-primary)" : "var(--color-border)"}`, background: c.active ? "rgba(80,172,85,0.1)" : "transparent", color: c.active ? "var(--color-primary)" : "var(--color-text-muted)", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }
      },
      c.label
    ))), (showMedical || showPhotoConsent) && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 } }, showMedical && /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, background: "rgba(0,0,0,0.03)", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)" } }, /* @__PURE__ */ React.createElement("span", { style: { width: 8, height: 8, borderRadius: "50%", background: "rgba(220,38,38,0.6)" } }), " Medical Conditions"), showPhotoConsent && /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, background: "rgba(0,0,0,0.03)", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)" } }, /* @__PURE__ */ React.createElement("span", { style: { width: 8, height: 8, borderRadius: "50%", background: "rgba(245,158,11,0.6)" } }), " No Photo Consent")), students.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "empty-state", style: { marginTop: 20 } }, /* @__PURE__ */ React.createElement(Icon, { name: "users", size: 40 }), /* @__PURE__ */ React.createElement("p", { className: "empty-state-title" }, "No students in this classroom")) : /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(165px, 1fr))", gap: 12 } }, students.map((s, i) => {
      const sid = s.id || s.Id;
      const sName = (s.name || s.Name || "Student").toString().trim();
      const sCode = (s.code || s.Code || "").toString().trim();
      const sAge = s.age || s.Age || "";
      const rawPhoto = s.photo || s.Photo || "";
      const sPhoto = rawPhoto && !rawPhoto.startsWith("http") ? `${API_BASE}${rawPhoto.startsWith("/") ? "" : "/"}${rawPhoto}` : rawPhoto;
      const attType = (s.lastAttendanceType || "").toString().toLowerCase();
      const isPresent = attType === "present";
      const medCond = safe(s.medicalConditions || s.MedicalConditions);
      const noPhotoCon = truthy(s.NoPhotoConsent || s.nophotoconsent);
      const attSelected = attendanceMode && attendanceIds.has(sid);
      const metaLines = [];
      if (showBookStatus) {
        const bs = safe(s.BookStatus || s.bookStatus || s.bookstatus);
        metaLines.push({ label: "Book", value: bs || "\u2014", color: bs ? "#16a34a" : "#999" });
      }
      if (showMedical && medCond) metaLines.push({ label: "Medical", value: medCond, color: "#dc2626" });
      if (showPhotoConsent && noPhotoCon) metaLines.push({ label: "Photo", value: "No Consent", color: "#f59e0b" });
      if (showUpdateStatus) {
        const us = safe(s.UpdateStatus || s.updateStatus || s.updatestatus);
        metaLines.push({ label: "Update", value: us || "\u2014", color: "#666" });
      }
      if (showStoryBooking) {
        const sb = safe(s.StoryBooking || s.storyBooking || s.storybooking);
        metaLines.push({ label: "Story", value: sb || "\u2014", color: "#8b5cf6" });
      }
      if (showBalance) {
        const bal = s.Balance || s.balance;
        metaLines.push({ label: "Balance", value: bal != null ? `$${bal}` : "\u2014", color: "#0ea5e9" });
      }
      if (showEnrollment) {
        const ec = safe(s.enrollmentConfirmation || s.EnrollmentConfirmation);
        metaLines.push({ label: "Enrollment", value: ec || "\u2014", color: "#6366f1" });
      }
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: sid || i,
          onClick: () => attendanceMode ? sid && toggleAttId(sid) : sid && (() => {
            window.appStudentFilter = { id: sid };
            navigate("/students");
          })(),
          style: { borderRadius: 14, overflow: "hidden", border: `${attSelected ? 2 : 1}px solid ${attSelected ? "var(--color-primary)" : "var(--color-border)"}`, background: "#fff", cursor: "pointer", transition: "all 0.15s", position: "relative" },
          onMouseOver: (e) => {
            if (!attendanceMode) e.currentTarget.style.transform = "translateY(-2px)";
          },
          onMouseOut: (e) => e.currentTarget.style.transform = ""
        },
        /* @__PURE__ */ React.createElement("div", { style: { height: 120, background: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" } }, sPhoto ? /* @__PURE__ */ React.createElement("img", { src: sPhoto, alt: sName, style: { width: "100%", height: "100%", objectFit: "cover" }, onError: (e) => e.target.style.display = "none" }) : /* @__PURE__ */ React.createElement("span", { style: { color: "#fff", fontWeight: 800, fontSize: "1.4rem" } }, initialsFromName(sName)), showMedical && medCond && /* @__PURE__ */ React.createElement("span", { style: { position: "absolute", top: 6, left: 6, width: 10, height: 10, borderRadius: "50%", background: "rgba(220,38,38,0.7)", border: "2px solid #fff" } }), showPhotoConsent && noPhotoCon && /* @__PURE__ */ React.createElement("span", { style: { position: "absolute", top: 6, left: medCond && showMedical ? 22 : 6, width: 10, height: 10, borderRadius: "50%", background: "rgba(245,158,11,0.7)", border: "2px solid #fff" } }), !attendanceMode && attType && /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", bottom: 0, left: 0, right: 0, padding: "3px 0", textAlign: "center", background: isPresent ? "rgba(80,172,85,0.88)" : "rgba(220,38,38,0.88)", color: "#fff", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase" } }, isPresent ? "Present" : "Absent"), attendanceMode && attSelected && /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: "50%", background: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center" } }, /* @__PURE__ */ React.createElement(Icon, { name: "check", size: 14, style: { color: "#fff" } }))),
        /* @__PURE__ */ React.createElement("div", { style: { padding: "8px 8px 10px", textAlign: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "0.82rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" } }, sName), sCode && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "0.72rem", color: "var(--color-text-muted)", marginTop: 3 } }, sCode), sAge && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "0.72rem", color: "var(--color-text-muted)", marginTop: 2 } }, "Age: ", sAge), metaLines.map((m, mi) => /* @__PURE__ */ React.createElement("div", { key: mi, style: { fontSize: "0.68rem", fontWeight: 600, color: m.color, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, m.label, ": ", m.value)))
      );
    })), attendanceMode && /* @__PURE__ */ React.createElement(GlobalCanvasPortal, null, /* @__PURE__ */ React.createElement("div", { style: { position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", padding: "16px 24px", background: "var(--color-bg-card)", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-lg)", zIndex: 999, border: "1px solid var(--color-border)", width: "90%", maxWidth: 500 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1, display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("input", { type: "date", value: attendanceDate, onChange: (e) => setAttendanceDate(e.target.value), className: "form-input", style: { width: "auto", fontSize: "0.82rem", padding: "0.4rem 0.6rem", borderRadius: "var(--radius-md)" }, placeholder: "Date (optional)" }), /* @__PURE__ */ React.createElement("input", { type: "time", value: attendanceTime, onChange: (e) => setAttendanceTime(e.target.value), className: "form-input", style: { width: "auto", fontSize: "0.82rem", padding: "0.4rem 0.6rem", borderRadius: "var(--radius-md)" }, placeholder: "Time (optional)" }), (attendanceDate || attendanceTime) && /* @__PURE__ */ React.createElement("button", {
      className: "btn btn-secondary", style: { padding: "0.3rem 0.5rem", borderRadius: "var(--radius-md)" }, onClick: () => {
        setAttendanceDate("");
        setAttendanceTime("");
      }
    }, /* @__PURE__ */ React.createElement(Icon, { name: "x", size: 14 }))), /* @__PURE__ */ React.createElement("button", {
      className: "btn btn-secondary", style: { color: "#dc2626", padding: "0.45rem 1rem", borderRadius: "var(--radius-lg)" }, disabled: submittingAtt, onClick: () => {
        setAttendanceMode(false);
        setAttendanceIds(/* @__PURE__ */ new Set());
      }
    }, "Cancel")), /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", style: { width: "100%", padding: "0.8rem", borderRadius: "var(--radius-lg)", fontWeight: 600 }, disabled: submittingAtt, onClick: submitAttendance }, submittingAtt ? "Submitting\u2026" : `Mark as Present (${attendanceIds.size})`)))), attendanceMode && /* @__PURE__ */ React.createElement("div", { style: { height: 100 } }));
  };
  var ClassroomsPage = () => {
    const [loading, setLoading] = useState(true);
    const [classrooms, setClassrooms] = useState([]);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("Current");
    const [error, setError] = useState(null);
    const [editingClassroom, setEditingClassroom] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [selectedClassroom, setSelectedClassroom] = useState(null);
    const [tick, setTick] = useState(0);
    const searchDebouncer = useRef(null);
    const [debouncedSearch, setDebouncedSearch] = useState("");
    useEffect(() => {
      if (searchDebouncer.current) clearTimeout(searchDebouncer.current);
      searchDebouncer.current = setTimeout(() => {
        setDebouncedSearch(search);
      }, 350);
    }, [search]);
    const loadClassrooms = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = {
          col: "Id,name,photo,room,attendance,homework,sentshare,teachers,count,level,book,program,arabicProgram,quranProgram,status",
          orderby: "name asc",
          page: 1,
          limit: 150
        };
        if (debouncedSearch.trim()) {
          params.filter = `name con '${debouncedSearch.replace(/'/g, "''")}'`;
        } else {
          params.filter = `status eq '${statusFilter}'`;
        }
        const res = await api.get("/api/classrooms", { params });
        const raw = res.data;
        let data = [];
        if (Array.isArray(raw)) data = raw;
        else if (raw && typeof raw === "object") {
          if (raw.success === false) data = [];
          else data = raw.data || raw.classrooms || raw.rows || [];
        }
        setClassrooms(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    useEffect(() => {
      loadClassrooms();
    }, [debouncedSearch, statusFilter, tick]);
    if (editingClassroom || isCreating) {
      return /* @__PURE__ */ React.createElement(
        ClassroomEditModal,
        {
          classroom: editingClassroom,
          onClose: () => {
            setEditingClassroom(null);
            setIsCreating(false);
          },
          onSaved: () => setTick((t) => t + 1)
        }
      );
    }
    if (selectedClassroom) {
      return /* @__PURE__ */ React.createElement(
        ClassroomDetailsView,
        {
          classroom: selectedClassroom,
          onClose: () => setSelectedClassroom(null),
          onEdit: () => {
            setEditingClassroom(selectedClassroom);
          },
          onRefresh: () => {
            setSelectedClassroom(null);
            setTick((t) => t + 1);
          }
        }
      );
    }
    return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "toolbar", style: { display: "flex", gap: 16, alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", { className: "toolbar-search", style: { flex: 1 } }, /* @__PURE__ */ React.createElement("span", { className: "search-icon" }, /* @__PURE__ */ React.createElement(Icon, { name: "search", size: 16 })), /* @__PURE__ */ React.createElement("input", { type: "text", placeholder: "Search classrooms\u2026", value: search, onChange: (e) => setSearch(e.target.value) })), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center" } }, ["Current", "Template", "Facilities", "Inactive"].map((s) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: s,
        onClick: () => {
          setStatusFilter(s);
          setSearch("");
        },
        className: `status-chip ${statusFilter === s ? statusClass(s) : ""}`,
        style: {
          cursor: "pointer",
          border: statusFilter === s ? "1px solid transparent" : "1px solid var(--color-border)",
          background: statusFilter === s ? void 0 : "transparent"
        }
      },
      s
    ))), /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", style: { marginLeft: "auto", padding: "0.4rem 0.8rem", whiteSpace: "nowrap" }, onClick: () => setIsCreating(true) }, /* @__PURE__ */ React.createElement(Icon, { name: "plus", size: 16 }), " New Classroom")), loading ? /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" } }, Array.from({ length: 6 }).map((_, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "skeleton", style: { height: 160, borderRadius: 16 } }))) : error ? /* @__PURE__ */ React.createElement("div", { className: "empty-state" }, /* @__PURE__ */ React.createElement(Icon, { name: "alert-circle", size: 40 }), /* @__PURE__ */ React.createElement("p", { className: "empty-state-title" }, "Error loading classrooms")) : classrooms.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "empty-state" }, /* @__PURE__ */ React.createElement(Icon, { name: "grid", size: 40 }), /* @__PURE__ */ React.createElement("p", { className: "empty-state-title" }, "No classrooms found")) : /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" } }, classrooms.map((c, i) => {
      const name = c.name || c.Name || "Class";
      const rawPhoto = c.photo || c.Photo || "";
      const photo = rawPhoto && !rawPhoto.startsWith("http") ? `${API_BASE}${rawPhoto.startsWith("/") ? "" : "/"}${rawPhoto}` : rawPhoto;
      const room = c.room || c.Room || "";
      const count = c.count || c.Count || c.studentsCount || 0;
      const status = c.Status || c.status || "";
      const level = c.Level || c.level || "";
      return /* @__PURE__ */ React.createElement("div", { key: c.Id || c.id || i, className: "classroom-card", style: { cursor: "pointer", transition: "all 0.2s", position: "relative" }, onClick: () => setSelectedClassroom(c), onMouseOver: (e) => e.currentTarget.style.transform = "translateY(-2px)", onMouseOut: (e) => e.currentTarget.style.transform = "translateY(0)" }, /* @__PURE__ */ React.createElement("div", { className: "classroom-card-img", style: { height: 100 } }, photo ? /* @__PURE__ */ React.createElement("img", { src: photo, alt: name, style: { width: "100%", height: "100%", objectFit: "cover" }, onError: (e) => e.target.style.display = "none" }) : null, !photo && /* @__PURE__ */ React.createElement("span", { className: "classroom-card-initials" }, initialsFromName(name)), /* @__PURE__ */ React.createElement("div", { className: "classroom-card-badges" }, level && /* @__PURE__ */ React.createElement("span", { className: "classroom-card-badge", style: { display: "flex", alignItems: "center", gap: 4 } }, /* @__PURE__ */ React.createElement(Icon, { name: "star", size: 10 }), " ", level), /* @__PURE__ */ React.createElement("span", { className: "classroom-card-badge", style: { display: "flex", alignItems: "center", gap: 4 } }, /* @__PURE__ */ React.createElement(Icon, { name: "users", size: 10 }), " ", count))), /* @__PURE__ */ React.createElement("div", { className: "classroom-card-body", style: { padding: 16 } }, /* @__PURE__ */ React.createElement("div", { className: "classroom-card-name", style: { fontSize: "1.05rem", fontWeight: 600, marginBottom: 8 } }, name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: 8 } }, room ? `Room: ${room}` : "No room assigned"), status && /* @__PURE__ */ React.createElement("span", { className: `status-chip ${statusClass(status)}`, style: { marginTop: 4, display: "inline-flex" } }, status)));
    })));
  };
  var FeedCommentsSheet = ({ postId, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [comments, setComments] = useState([]);
    const [input, setInput] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [replyingToId, setReplyingToId] = useState(null);
    const [replyingHeader, setReplyingHeader] = useState("");
    const [openActionMenuId, setOpenActionMenuId] = useState(null);
    const currentUserId = String(Auth.getUser()?.id || "");
    const loadComments = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/api/getpostreactions/user/${postId}`);
        const raw = res.data;
        const rows = Array.isArray(raw) ? raw : [];
        setComments(rows.map((r) => ({ ...r })));
      } catch {
        setComments([]);
      } finally {
        setLoading(false);
      }
    };
    useEffect(() => {
      loadComments();
    }, [postId]);
    const sorted = useMemo(() => {
      const byParent = /* @__PURE__ */ new Map();
      comments.forEach((c) => {
        const parent = c.replyingto;
        if (parent != null) {
          if (!byParent.has(parent)) byParent.set(parent, []);
          byParent.get(parent).push(c);
        }
      });
      const out = [];
      comments.forEach((c) => {
        if (c.replyingto == null) {
          out.push({ ...c, __depth: 0 });
          const replies = byParent.get(c.id) || [];
          replies.forEach((r) => {
            out.push({ ...r, __depth: 1 });
            const nested = byParent.get(r.id) || [];
            nested.forEach((n) => out.push({ ...n, __depth: 2 }));
          });
        }
      });
      return out;
    }, [comments]);
    const submit = async () => {
      const text = input.trim();
      if (!text || submitting) return;
      setSubmitting(true);
      try {
        if (editingId) {
          const res = await api.patch(`/api/postreaction/user/${editingId}`, { comment: text });
          if (res.status === 202) {
            setInput("");
            setEditingId(null);
            setReplyingToId(null);
            setReplyingHeader("");
            await loadComments();
          }
        } else {
          const payload = { post: postId, comment: text };
          if (replyingToId != null) payload.replyingto = replyingToId;
          if (replyingHeader) payload.replyingheader = replyingHeader;
          const res = await api.post("/api/postreaction/user/", payload);
          if (res.status === 201) {
            setInput("");
            setReplyingToId(null);
            setReplyingHeader("");
            await loadComments();
          }
        }
      } catch {
        alert("Failed to submit comment.");
      } finally {
        setSubmitting(false);
      }
    };
    const remove = async (id) => {
      if (!window.confirm("Delete this comment?")) return;
      try {
        const res = await api.delete(`/api/postreaction/user/${id}`);
        if (res.status === 202 || res.status === 204) {
          await loadComments();
        }
      } catch {
        alert("Failed to delete comment.");
      }
    };
    return /* @__PURE__ */ React.createElement(GlobalCanvasPortal, null, /* @__PURE__ */ React.createElement("div", { className: "modal-overlay", onClick: onClose }, /* @__PURE__ */ React.createElement("div", { className: "modal-box feed-comments-modal", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "modal-title" }, "Comments"), /* @__PURE__ */ React.createElement("div", { className: "feed-comments-list" }, loading ? /* @__PURE__ */ React.createElement("div", { className: "loading-center" }, /* @__PURE__ */ React.createElement("div", { className: "spinner" })) : sorted.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "empty-state", style: { padding: "1.5rem" } }, /* @__PURE__ */ React.createElement("p", { className: "empty-state-title" }, "Be the first to comment")) : sorted.map((c, i) => {
      const depth = c.__depth || 0;
      const commentUserId = String(c.user || c.user_id || c.userid || c.parent || "");
      const mine = currentUserId && commentUserId === currentUserId;
      const displayName = c.user_fullname || c.parent_fullname || "Unknown";
      const avatar = c.user_photo || "";
      return /* @__PURE__ */ React.createElement("div", { key: `${c.id || i}-${depth}`, className: "feed-comment-item", style: { marginLeft: depth * 28 } }, /* @__PURE__ */ React.createElement(Avatar, { name: displayName, photoUrl: avatar, id: c.user || displayName, size: 36 }), /* @__PURE__ */ React.createElement("div", { className: "feed-comment-main" }, /* @__PURE__ */ React.createElement("div", { className: "feed-comment-head-row" }, /* @__PURE__ */ React.createElement("div", { className: "feed-comment-head" }, /* @__PURE__ */ React.createElement("strong", null, displayName), /* @__PURE__ */ React.createElement("span", null, formatDateShort(c.date || c.Date || c.created_at || c.createdAt) || formatDate(c.date || c.Date || c.created_at || c.createdAt))), /* @__PURE__ */ React.createElement("div", { className: "feed-comment-menu-wrap" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          className: "feed-comment-menu-btn",
          onClick: () => setOpenActionMenuId(openActionMenuId === c.id ? null : c.id),
          "aria-label": "Comment actions"
        },
        /* @__PURE__ */ React.createElement(Icon, { name: "more-vertical", size: 16 })
      ), openActionMenuId === c.id && /* @__PURE__ */ React.createElement("div", { className: "feed-comment-menu" }, depth < 2 && /* @__PURE__ */ React.createElement("button", {
        onClick: () => {
          setReplyingToId(c.id);
          setReplyingHeader(`Replying to ${displayName}`);
          setEditingId(null);
          setOpenActionMenuId(null);
        }
      }, "Reply"), mine && /* @__PURE__ */ React.createElement("button", {
        onClick: () => {
          setEditingId(c.id);
          setInput(c.comment || "");
          setReplyingToId(null);
          setReplyingHeader("");
          setOpenActionMenuId(null);
        }
      }, "Edit"), mine && /* @__PURE__ */ React.createElement("button", {
        className: "danger", onClick: () => {
          setOpenActionMenuId(null);
          remove(c.id);
        }
      }, "Delete")))), c.replyingheader ? /* @__PURE__ */ React.createElement("div", { className: "feed-comment-meta" }, c.replyingheader) : null, /* @__PURE__ */ React.createElement("div", { className: "feed-comment-text" }, c.comment || "")));
    })), (editingId || replyingToId) && /* @__PURE__ */ React.createElement("div", { className: "feed-comment-compose-hint" }, /* @__PURE__ */ React.createElement("span", null, editingId ? "Editing comment" : replyingHeader), /* @__PURE__ */ React.createElement("button", {
      className: "btn-secondary btn-sm", onClick: () => {
        setEditingId(null);
        setReplyingToId(null);
        setReplyingHeader("");
        setInput("");
      }
    }, "Cancel")), /* @__PURE__ */ React.createElement("div", { className: "feed-comment-compose" }, /* @__PURE__ */ React.createElement("input", { className: "form-input", placeholder: editingId ? "Edit comment..." : replyingToId ? "Reply..." : "Add a comment...", value: input, onChange: (e) => setInput(e.target.value) }), /* @__PURE__ */ React.createElement("button", { className: "btn-primary", onClick: submit, disabled: submitting }, editingId ? "Update" : "Send")))));
  };
  var FeedAudienceStudentStack = ({ students = [] }) => {
    const shown = students.slice(0, 5);
    if (shown.length === 0) return null;
    return /* @__PURE__ */ React.createElement("div", { className: "feed-audience-stack", style: { width: `${(shown.length - 1) * 18 + 28}px` } }, shown.map((student, i) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: `${student.id || student.name || i}-${i}`,
        className: "feed-audience-student",
        style: { left: `${i * 18}px` },
        title: student.name || ""
      },
      student.photo ? /* @__PURE__ */ React.createElement("img", { src: toAbsoluteAssetUrl(student.photo), alt: student.name || "" }) : /* @__PURE__ */ React.createElement("span", null, initialsFromName(student.name || "?"))
    )));
  };
  var FeedPostLikesModal = ({ postId, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [parents, setParents] = useState([]);
    const normalize = (v) => {
      if (Array.isArray(v)) return v.map(normalize);
      if (!v || typeof v !== "object") return v;
      const out = {};
      Object.keys(v).forEach((k) => {
        out[String(k).toLowerCase()] = normalize(v[k]);
      });
      return out;
    };
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/api/getpostlikes/user/${postId}`);
        const payload = normalize(res.data || {});
        const rawParents = Array.isArray(payload.parents) ? payload.parents : [];
        const mapped = rawParents.map((p) => ({
          parentId: Number(p.parentid || p.parent || 0),
          parentName: String(p.parentname || p.fullname || "Unknown Parent"),
          students: (Array.isArray(p.students) ? p.students : []).map((s) => ({
            id: Number(s.id || s.studentid || 0),
            name: String(s.name || s.studentname || "Student"),
            photo: String(s.photo || s.image || "")
          }))
        }));
        setParents(mapped);
      } catch {
        setParents([]);
      } finally {
        setLoading(false);
      }
    };
    useEffect(() => {
      load();
    }, [postId]);
    return /* @__PURE__ */ React.createElement(GlobalCanvasPortal, null, /* @__PURE__ */ React.createElement("div", { className: "modal-overlay", onClick: onClose }, /* @__PURE__ */ React.createElement("div", { className: "modal-box feed-audience-modal", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "modal-title" }, "Post Likes"), /* @__PURE__ */ React.createElement("div", { className: "feed-audience-list" }, loading ? /* @__PURE__ */ React.createElement("div", { className: "loading-center" }, /* @__PURE__ */ React.createElement("div", { className: "spinner" })) : parents.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "empty-state", style: { padding: "1rem" } }, /* @__PURE__ */ React.createElement("p", { className: "empty-state-title" }, "No like data")) : parents.map((parent) => /* @__PURE__ */ React.createElement("div", { key: parent.parentId || parent.parentName, className: "feed-audience-card" }, /* @__PURE__ */ React.createElement("div", { className: "feed-audience-row" }, /* @__PURE__ */ React.createElement(Avatar, { name: parent.parentName, id: parent.parentId || parent.parentName, size: 42 }), /* @__PURE__ */ React.createElement("div", { className: "feed-audience-main" }, /* @__PURE__ */ React.createElement("div", { className: "feed-audience-name" }, parent.parentName), /* @__PURE__ */ React.createElement(FeedAudienceStudentStack, { students: parent.students }), parent.students.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "feed-audience-students-text" }, parent.students.map((s) => s.name).join(", "))))))), /* @__PURE__ */ React.createElement("div", { className: "modal-actions" }, /* @__PURE__ */ React.createElement("button", { className: "btn-secondary", onClick: onClose }, "Close")))));
  };
  var FeedPostViewsModal = ({ postId, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [totalTargetedStudents, setTotalTargetedStudents] = useState(0);
    const [seenStudentsCount, setSeenStudentsCount] = useState(0);
    const [parents, setParents] = useState([]);
    const normalize = (v) => {
      if (Array.isArray(v)) return v.map(normalize);
      if (!v || typeof v !== "object") return v;
      const out = {};
      Object.keys(v).forEach((k) => {
        out[String(k).toLowerCase()] = normalize(v[k]);
      });
      return out;
    };
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/api/post/${postId}/views`);
        const payload = normalize(res.data || {});
        const rawParents = Array.isArray(payload.parents) ? payload.parents : [];
        const mapped = rawParents.map((p) => ({
          parentId: Number(p.parentid || p.parent || 0),
          parentName: String(p.parentname || p.fullname || "Unknown Parent"),
          viewed: !!p.viewed,
          students: (Array.isArray(p.students) ? p.students : []).map((s) => ({
            id: Number(s.id || s.studentid || 0),
            name: String(s.name || s.studentname || "Student"),
            photo: String(s.photo || s.image || "")
          }))
        }));
        setTotalTargetedStudents(Number(payload.total_targeted_students || 0));
        setSeenStudentsCount(Number(payload.seen_students_count || 0));
        setParents(mapped);
      } catch {
        setTotalTargetedStudents(0);
        setSeenStudentsCount(0);
        setParents([]);
      } finally {
        setLoading(false);
      }
    };
    useEffect(() => {
      load();
    }, [postId]);
    const ratio = Math.min(1, Math.max(0, totalTargetedStudents > 0 ? seenStudentsCount / totalTargetedStudents : 0));
    return /* @__PURE__ */ React.createElement(GlobalCanvasPortal, null, /* @__PURE__ */ React.createElement("div", { className: "modal-overlay", onClick: onClose }, /* @__PURE__ */ React.createElement("div", { className: "modal-box feed-audience-modal", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "modal-title" }, "Post Views"), /* @__PURE__ */ React.createElement("div", { className: "feed-audience-list" }, loading ? /* @__PURE__ */ React.createElement("div", { className: "loading-center" }, /* @__PURE__ */ React.createElement("div", { className: "spinner" })) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "feed-audience-progress-card" }, /* @__PURE__ */ React.createElement("div", { className: "feed-audience-progress-head" }, "Audience"), /* @__PURE__ */ React.createElement("div", { className: "feed-audience-progress-label" }, seenStudentsCount, " of ", totalTargetedStudents, " viewed"), /* @__PURE__ */ React.createElement("div", { className: "feed-audience-progress-track" }, /* @__PURE__ */ React.createElement("div", { className: "feed-audience-progress-fill", style: { width: `${Math.round(ratio * 100)}%` } }))), parents.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "empty-state", style: { padding: "1rem" } }, /* @__PURE__ */ React.createElement("p", { className: "empty-state-title" }, "No view data")) : parents.map((parent) => /* @__PURE__ */ React.createElement("div", { key: parent.parentId || parent.parentName, className: "feed-audience-card" }, /* @__PURE__ */ React.createElement("div", { className: "feed-audience-row" }, /* @__PURE__ */ React.createElement(Avatar, { name: parent.parentName, id: parent.parentId || parent.parentName, size: 42 }), /* @__PURE__ */ React.createElement("div", { className: "feed-audience-main" }, /* @__PURE__ */ React.createElement("div", { className: "feed-audience-head" }, /* @__PURE__ */ React.createElement("div", { className: "feed-audience-name" }, parent.parentName), /* @__PURE__ */ React.createElement("span", { className: `status-badge ${parent.viewed ? "active" : "inactive"}` }, parent.viewed ? "Viewed" : "Not viewed")), /* @__PURE__ */ React.createElement(FeedAudienceStudentStack, { students: parent.students }), parent.students.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "feed-audience-students-text" }, parent.students.map((s) => s.name).join(", ")))))))), /* @__PURE__ */ React.createElement("div", { className: "modal-actions" }, /* @__PURE__ */ React.createElement("button", { className: "btn-secondary", onClick: onClose }, "Close")))));
  };
  var GalleryViewer = ({ attachments, initialIndex, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);
    const [zoomed, setZoomed] = useState(false);
    const videoRef = useRef(null);
    const total = (attachments || []).length;
    const att = attachments?.[currentIndex] || {};
    const mime = String(att.filemime || "").toLowerCase();
    const rawUrl = att.path || att.url || "";
    const url = toAbsoluteAssetUrl(rawUrl);
    const thumb = toAbsoluteAssetUrl(att.thumbnail || "");
    const originName = att.originname || att.originName || att.name || "Attachment";
    const isImage = mime.startsWith("image/");
    const isVideo = mime.startsWith("video/");
    const goTo = useCallback((idx) => {
      if (idx >= 0 && idx < total) {
        setCurrentIndex(idx);
        setZoomed(false);
      }
    }, [total]);
    const goPrev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);
    const goNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);
    useEffect(() => {
      const handler = (e) => {
        if (e.key === "Escape") {
          onClose();
          return;
        }
        if (e.key === "ArrowLeft") goPrev();
        if (e.key === "ArrowRight") goNext();
      };
      window.addEventListener("keydown", handler);
      const unlock = lockBodyScroll();
      return () => {
        window.removeEventListener("keydown", handler);
        if (unlock) unlock();
      };
    }, [goPrev, goNext, onClose]);
    const downloadFile = () => {
      if (!url) return;
      const a = document.createElement("a");
      a.href = url;
      a.download = originName;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
    const mimeIconName = (m) => {
      if (m.includes("pdf")) return "file-text";
      if (m.includes("word")) return "file";
      if (m.includes("spreadsheet") || m.includes("excel")) return "bar-chart-2";
      if (m.includes("presentation") || m.includes("powerpoint")) return "monitor";
      return "paperclip";
    };
    const renderItem = () => {
      if (isImage) {
        return /* @__PURE__ */ React.createElement("div", { className: "gallery-item", style: zoomed ? { overflow: "auto", alignItems: "flex-start", justifyContent: "flex-start" } : {} }, /* @__PURE__ */ React.createElement(
          "img",
          {
            src: url,
            alt: originName,
            style: zoomed ? { maxWidth: "none", maxHeight: "none", cursor: "zoom-out" } : { cursor: "zoom-in" },
            onClick: () => setZoomed((z) => !z),
            draggable: false
          }
        ));
      }
      if (isVideo) {
        return /* @__PURE__ */ React.createElement("div", { className: "gallery-item" }, /* @__PURE__ */ React.createElement(
          "video",
          {
            ref: videoRef,
            src: toAzureVideoUrl(rawUrl),
            controls: true,
            autoPlay: true,
            poster: thumb || void 0,
            style: { maxWidth: "100%", maxHeight: "100%" }
          }
        ));
      }
      return /* @__PURE__ */ React.createElement("div", { className: "gallery-item" }, /* @__PURE__ */ React.createElement("div", { className: "gallery-file-fallback" }, /* @__PURE__ */ React.createElement("div", { className: "gallery-file-icon" }, /* @__PURE__ */ React.createElement(Icon, { name: mimeIconName(mime), size: 36 })), /* @__PURE__ */ React.createElement("div", { className: "gallery-file-name" }, originName), /* @__PURE__ */ React.createElement("div", { className: "gallery-file-action", onClick: () => window.open(url, "_blank", "noopener") }, "Tap to open file")));
    };
    const touchStartX = useRef(0);
    const touchEndX = useRef(0);
    const handleTouchStart = (e) => {
      touchStartX.current = e.changedTouches[0].screenX;
    };
    const handleTouchEnd = (e) => {
      touchEndX.current = e.changedTouches[0].screenX;
      handleSwipe();
    };
    const handleSwipe = () => {
      const threshold = 50;
      if (touchEndX.current < touchStartX.current - threshold) {
        if (currentIndex < total - 1) goNext();
      }
      if (touchEndX.current > touchStartX.current + threshold) {
        if (currentIndex > 0) goPrev();
      }
    };
    return ReactDOM.createPortal(
      /* @__PURE__ */ React.createElement("div", {
      className: "gallery-overlay", onClick: (e) => {
        if (e.target === e.currentTarget) onClose();
      }
    }, /* @__PURE__ */ React.createElement("div", { className: "gallery-topbar", style: { justifyContent: "center", position: "relative" } }, /* @__PURE__ */ React.createElement("button", { className: "gallery-btn", style: { position: "absolute", left: "1rem" }, onClick: onClose, title: "Close" }, /* @__PURE__ */ React.createElement(Icon, { name: "arrow-left", size: 20 })), /* @__PURE__ */ React.createElement("span", { className: "gallery-counter" }, currentIndex + 1, " of ", total), /* @__PURE__ */ React.createElement("button", { className: "gallery-btn", style: { position: "absolute", right: "1rem" }, onClick: downloadFile, title: "Download" }, /* @__PURE__ */ React.createElement(Icon, { name: "download", size: 18 }))), /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "gallery-body",
        onTouchStart: handleTouchStart,
        onTouchEnd: handleTouchEnd
      },
      currentIndex > 0 && /* @__PURE__ */ React.createElement("button", { className: "gallery-page-nav left", onClick: goPrev }, /* @__PURE__ */ React.createElement(Icon, { name: "chevron-left", size: 22 })),
      renderItem(),
      currentIndex < total - 1 && /* @__PURE__ */ React.createElement("button", { className: "gallery-page-nav right", onClick: goNext }, /* @__PURE__ */ React.createElement(Icon, { name: "chevron-right", size: 22 }))
    ), total > 1 && /* @__PURE__ */ React.createElement("div", { className: "gallery-dots" }, attachments.map((_, idx) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: idx,
        className: `gallery-dot ${idx === currentIndex ? "active" : ""}`,
        onClick: () => goTo(idx)
      }
    )))),
      document.body
    );
  };
  var ClassroomPickerModal = ({ classrooms, selectedIds, onSave, onClose, type }) => {
    const [ids, setIds] = useState(selectedIds || []);
    const toggle = (id) => {
      setIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    };
    return ReactDOM.createPortal(
      /* @__PURE__ */ React.createElement("div", {
      className: "modal-overlay", onClick: (e) => {
        if (e.target === e.currentTarget) onClose();
      }, style: { zIndex: 1e4 }
    }, /* @__PURE__ */ React.createElement("div", { className: "card modal-content", style: { width: 450, maxWidth: "90%", padding: 0 } }, /* @__PURE__ */ React.createElement("div", { className: "card-header", style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", borderBottom: "1px solid #e2e8f0" } }, /* @__PURE__ */ React.createElement("h3", { style: { margin: 0, fontSize: "1.1rem" } }, "Select Classrooms"), /* @__PURE__ */ React.createElement("button", { className: "btn-icon", onClick: onClose }, /* @__PURE__ */ React.createElement(Icon, { name: "x", size: 18 }))), /* @__PURE__ */ React.createElement("div", { className: "card-body", style: { maxHeight: "50vh", overflowY: "auto", padding: "0 1rem" } }, type === "Announcement" && /* @__PURE__ */ React.createElement("div", { className: "feed-post-form-note", style: { margin: "1rem 0" } }, "Leave empty to post to all public users."), /* @__PURE__ */ React.createElement("div", { style: { paddingBottom: "1rem" } }, classrooms.map((c) => /* @__PURE__ */ React.createElement("label", { key: c.id, style: { display: "flex", alignItems: "center", gap: "0.8rem", padding: "0.75rem 0", cursor: "pointer", borderBottom: "1px solid #f1f5f9" } }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: ids.includes(c.id), onChange: () => toggle(c.id), style: { width: 18, height: 18, cursor: "pointer" } }), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "0.95rem", fontWeight: 500, color: "#334155" } }, c.name))))), /* @__PURE__ */ React.createElement("div", { className: "card-footer", style: { display: "flex", justifyContent: "flex-end", gap: "0.5rem", padding: "1rem", borderTop: "1px solid #e2e8f0", background: "#f8fafc", borderBottomLeftRadius: 16, borderBottomRightRadius: 16 } }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", onClick: onClose }, "Cancel"), /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: () => onSave(ids) }, "Save")))),
      document.body
    );
  };
  var FeedPostFormScreen = ({ postId, onClose, onSaved }) => {
    const isEdit = postId != null;
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState("");
    const [loadError, setLoadError] = useState("");
    const [title, setTitle] = useState("");
    const [bodyHtml, setBodyHtml] = useState("");
    const [type, setType] = useState("Announcement");
    const [submissionAllowed, setSubmissionAllowed] = useState(true);
    const [deadline, setDeadline] = useState("");
    const [draft, setDraft] = useState(false);
    const [sendOnUpdate, setSendOnUpdate] = useState(true);
    const [showConfirm, setShowConfirm] = useState(false);
    const [allClassrooms, setAllClassrooms] = useState([]);
    const [selectedClassroomIds, setSelectedClassroomIds] = useState([]);
    const [attachments, setAttachments] = useState([]);
    const fileInputRef = useRef(null);
    const [showClassroomPicker, setShowClassroomPicker] = useState(false);
    const mapGet = (obj, key) => {
      if (!obj || typeof obj !== "object") return null;
      if (Object.prototype.hasOwnProperty.call(obj, key)) return obj[key];
      const target = String(key).toLowerCase();
      const match = Object.keys(obj).find((k) => String(k).toLowerCase() === target);
      return match ? obj[match] : null;
    };
    const boolFromAny = (v) => {
      if (typeof v === "boolean") return v;
      if (typeof v === "number") return v === 1;
      const s = String(v || "").trim().toLowerCase();
      return s === "true" || s === "1" || s === "yes";
    };
    const makeAttachmentKey = (prefix = "att") => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const fileExtension = (name) => {
      const idx = String(name || "").lastIndexOf(".");
      if (idx < 0 || idx === name.length - 1) return "";
      return String(name).slice(idx).toLowerCase();
    };
    const createUuid = () => {
      if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
      return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    };
    const parseUploadUrls = (data, requestedPaths) => {
      let urls = [];
      if (Array.isArray(data)) {
        urls = data;
      } else if (data && Array.isArray(data.urls)) {
        urls = data.urls;
      } else if (data && Array.isArray(data.data)) {
        urls = data.data;
      }
      if (urls.length === 0) return [];
      if (typeof urls[0] === "string") return urls;
      if (urls[0] && typeof urls[0] === "object") {
        return requestedPaths.map((path) => {
          const found = urls.find((u) => String(u.path || u.blobpath || "").startsWith(path));
          return String(found?.url || found?.sasurl || "");
        });
      }
      return [];
    };
    const stripSasQuery = (url) => {
      try {
        const parsed = new URL(url);
        return `${parsed.origin}${parsed.pathname}`;
      } catch {
        return String(url || "").split("?")[0];
      }
    };
    const loadData = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const classRes = await api.get("/api/classrooms", { params: { col: "id,name", filter: "status eq 'Current'" } });
        const classRoot = classRes.data?.data || classRes.data?.items || classRes.data?.results || classRes.data || [];
        const classRows = Array.isArray(classRoot) ? classRoot : [];
        const classroomList = classRows.map((c) => ({ id: Number(c.id || c.Id || 0), name: String(c.name || c.Name || "") })).filter((c) => !!c.id);
        setAllClassrooms(classroomList);
        if (!isEdit) {
          setTitle("");
          setBodyHtml("");
          setType("Announcement");
          setSubmissionAllowed(true);
          setDeadline("");
          setDraft(false);
          setSendOnUpdate(true);
          setSelectedClassroomIds([]);
          setAttachments([]);
          return;
        }
        const postRes = await api.get(`/api/getpost/user/${postId}`);
        const data = postRes.data || {};
        const post = data.post || data.Post || {};
        const postPrivacy = Array.isArray(data.postprivacy || data.postPrivacy || data.PostPrivacy) ? data.postprivacy || data.postPrivacy || data.PostPrivacy : [];
        const postAttachments = Array.isArray(data.attachments || data.Attachments) ? data.attachments || data.Attachments : [];
        const incomingType = String(mapGet(post, "type") || "Announcement");
        setTitle(String(mapGet(post, "title") || ""));
        setBodyHtml(String(mapGet(post, "body") || ""));
        setType(incomingType === "Homework" ? "Homework" : "Announcement");
        setSubmissionAllowed(boolFromAny(mapGet(post, "submissionallowed")));
        setDraft(boolFromAny(mapGet(post, "draft") || mapGet(post, "isdraft")));
        const deadlineRaw = String(mapGet(post, "deadline") || "").trim();
        if (deadlineRaw && !deadlineRaw.startsWith("1900")) {
          const parsed = DateTime.fromISO(deadlineRaw).toLocal();
          setDeadline(parsed.isValid ? parsed.toFormat("yyyy-LL-dd'T'HH:mm") : "");
        } else {
          setDeadline("");
        }
        const selectedIds = postPrivacy.map((p) => Number(mapGet(p, "classroom") || mapGet(p, "classroomid") || 0)).filter((id) => !!id);
        setSelectedClassroomIds([...new Set(selectedIds)]);
        const existingAttachments = postAttachments.map((att, idx) => ({
          key: makeAttachmentKey(`existing-${idx}`),
          isExisting: true,
          existingId: Number(mapGet(att, "id") || 0),
          originName: String(mapGet(att, "originname") || mapGet(att, "name") || "Attachment"),
          mimeType: String(mapGet(att, "filemime") || "application/octet-stream"),
          existingUrl: String(mapGet(att, "path") || ""),
          existingThumbnail: String(mapGet(att, "thumbnail") || ""),
          resource: boolFromAny(mapGet(att, "resource"))
        }));
        setAttachments(existingAttachments);
      } catch (e) {
        setLoadError(e?.message || "Failed to load post form data.");
      } finally {
        setLoading(false);
      }
    };
    useEffect(() => {
      loadData();
    }, [postId]);
    const toggleClassroom = (id, checked) => {
      const numericId = Number(id);
      setSelectedClassroomIds((prev) => {
        if (checked) return [.../* @__PURE__ */ new Set([...prev, numericId])];
        return prev.filter((x) => x !== numericId);
      });
    };
    const pickFiles = (ev) => {
      const files = Array.from(ev.target.files || []);
      if (files.length === 0) return;
      const next = files.map((file) => ({
        key: makeAttachmentKey("new"),
        isExisting: false,
        file,
        originName: file.name,
        mimeType: file.type || "application/octet-stream",
        resource: false,
        previewUrl: (file.type || "").startsWith("image/") || (file.type || "").startsWith("video/") ? URL.createObjectURL(file) : null
      }));
      setAttachments((prev) => [...prev, ...next]);
      ev.target.value = "";
    };
    const toggleAttachmentResource = (key) => {
      setAttachments((prev) => prev.map((att) => att.key === key ? { ...att, resource: !att.resource } : att));
    };
    const removeAttachment = (key) => {
      setAttachments((prev) => prev.filter((att) => att.key !== key));
    };
    const downloadAttachment = (att) => {
      const url = att.existingUrl ? toAbsoluteAssetUrl(att.existingUrl) : att.previewUrl;
      if (!url) return;
      const a = document.createElement("a");
      a.href = url;
      a.download = att.originName || "attachment";
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
    const uploadNewAttachments = async () => {
      const newAttachments = attachments.filter((att) => !att.isExisting && att.file);
      if (newAttachments.length === 0) return {};
      const uploadPlan = newAttachments.map((att) => {
        const uuid = createUuid();
        const ext = fileExtension(att.originName);
        return { ...att, blobPath: `post/${uuid}${ext}` };
      });
      const allPaths = uploadPlan.map((u) => u.blobPath);
      const uploadUrlRes = await api.post("/api/getUploadUrls", allPaths, {
        headers: { "Content-Type": "application/json" }
      });
      const sasUrls = parseUploadUrls(uploadUrlRes.data, allPaths);
      if (sasUrls.length !== allPaths.length || sasUrls.some((u) => !u)) {
        throw new Error("Unable to resolve upload URLs for attachments.");
      }
      const claims = Auth.parseJwt(Auth.getToken()) || {};
      const nClaim = claims.n || claims.N || "";
      const uploadedByKey = {};
      setUploading(true);
      for (let i = 0; i < uploadPlan.length; i++) {
        const planned = uploadPlan[i];
        const sasUrl = sasUrls[i];
        setUploadStatus(`Uploading ${i + 1} of ${uploadPlan.length}`);
        const headers = {
          "x-ms-blob-type": "BlockBlob",
          "Content-Type": planned.mimeType || "application/octet-stream"
        };
        if (nClaim) headers["x-ms-meta-n"] = String(nClaim);
        const response = await fetch(sasUrl, {
          method: "PUT",
          headers,
          body: planned.file
        });
        if (!response.ok) {
          throw new Error(`Failed to upload attachment (${response.status}).`);
        }
        uploadedByKey[planned.key] = {
          path: stripSasQuery(sasUrl)
        };
      }
      setUploading(false);
      setUploadStatus("");
      return uploadedByKey;
    };
    const handleSaveClick = () => {
      if (saving || uploading) return;
      if (!title.trim()) {
        alert("Title is required.");
        return;
      }
      setShowConfirm(true);
    };
    const executeSave = async (saveAsDraft = false) => {
      const finalDraft = typeof saveAsDraft === "boolean" ? saveAsDraft : draft;
      setShowConfirm(false);
      setSaving(true);
      try {
        const uploadedByKey = await uploadNewAttachments();
        const attachmentsPayload = attachments.map((att) => {
          if (att.isExisting) {
            return {
              originname: att.originName,
              path: att.existingUrl || "",
              filemime: att.mimeType || "application/octet-stream",
              ...att.existingThumbnail ? { thumbnail: att.existingThumbnail } : {},
              resource: !!att.resource
            };
          }
          const uploaded = uploadedByKey[att.key];
          if (!uploaded?.path) return null;
          return {
            originname: att.originName,
            path: uploaded.path,
            filemime: att.mimeType || "application/octet-stream",
            resource: !!att.resource
          };
        }).filter(Boolean);
        const payload = {
          title: title.trim(),
          body: bodyHtml,
          type,
          classrooms: selectedClassroomIds,
          attachments: attachmentsPayload,
          draft: finalDraft,
          finishedprocessing: true
        };
        if (type === "Homework") {
          payload.submissionallowed = submissionAllowed;
          if (deadline) {
            const dt = DateTime.fromISO(deadline).toUTC();
            if (dt.isValid) payload.deadline = dt.toISO();
          }
        }
        if (isEdit && sendOnUpdate) payload.sendonUpdate = true;
        const res = isEdit ? await api.patch(`/api/managepost/user/${postId}`, payload) : await api.post("/api/managepost/user", payload);
        if (res.status === 201 || res.status === 202) {
          onSaved?.();
          return;
        }
        alert(`Save failed (${res.status}).`);
      } catch (e) {
        alert(e?.message || "Failed to save post.");
      } finally {
        setSaving(false);
        setUploading(false);
        setUploadStatus("");
      }
    };
    const safeClose = () => {
      if (saving || uploading) return;
      onClose();
    };
    useEffect(() => {
      const unlock = lockBodyScroll();
      return () => {
        if (unlock) unlock();
      };
    }, []);
    return ReactDOM.createPortal(
      /* @__PURE__ */ React.createElement("div", { className: "composer-overlay" }, /* @__PURE__ */ React.createElement("div", { className: "composer-topbar" }, /* @__PURE__ */ React.createElement("button", { className: "composer-btn-icon", onClick: safeClose, disabled: saving || uploading, title: "Discard" }, /* @__PURE__ */ React.createElement(Icon, { name: "x", size: 26 })), /* @__PURE__ */ React.createElement("h2", null, isEdit ? "Edit Post" : "Create Post"), /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: handleSaveClick, disabled: loading || saving || uploading, style: { minWidth: 80 } }, saving ? "Saving..." : isEdit ? "Update" : "Post")), /* @__PURE__ */ React.createElement("div", { className: "composer-body" }, loading ? /* @__PURE__ */ React.createElement("div", { className: "loading-center" }, /* @__PURE__ */ React.createElement("div", { className: "spinner" })) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "composer-scroll" }, loadError && /* @__PURE__ */ React.createElement("div", { className: "empty-state", style: { margin: "1rem" } }, /* @__PURE__ */ React.createElement("p", { className: "empty-state-title" }, "Unable to load form"), /* @__PURE__ */ React.createElement("p", { className: "empty-state-msg" }, loadError)), showClassroomPicker && /* @__PURE__ */ React.createElement(
      ClassroomPickerModal,
      {
        type,
        classrooms: allClassrooms,
        selectedIds: selectedClassroomIds,
        onSave: (ids) => {
          setSelectedClassroomIds(ids);
          setShowClassroomPicker(false);
        },
        onClose: () => setShowClassroomPicker(false)
      }
    ), /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "composer-selector-row",
        onClick: () => setShowClassroomPicker(true)
      },
        /* @__PURE__ */ React.createElement(Icon, { name: selectedClassroomIds.length === 0 ? "globe" : "users", size: 20 }),
        /* @__PURE__ */ React.createElement("span", { style: { flex: 1 } }, selectedClassroomIds.length === 0 ? "Public (Visible to everyone)" : selectedClassroomIds.map((id) => allClassrooms.find((c) => c.id === id)?.name || `Classroom ${id}`).join(", ")),
        /* @__PURE__ */ React.createElement(Icon, { name: "chevron-right", size: 18, style: { opacity: 0.5 } })
    ), /* @__PURE__ */ React.createElement(
      "input",
      {
        className: "composer-title-input",
        value: title,
        onChange: (e) => setTitle(e.target.value),
        placeholder: "Write a title...",
        dir: "auto"
      }
    ), /* @__PURE__ */ React.createElement("div", { className: "composer-editor-wrap" }, /* @__PURE__ */ React.createElement(
      CkEditorHtmlField,
      {
        value: bodyHtml,
        onChange: setBodyHtml,
        placeholder: "Write your post body here...",
        height: "100%"
      }
    ))), /* @__PURE__ */ React.createElement("div", { className: "composer-bottom-bar" }, uploading && /* @__PURE__ */ React.createElement("div", { className: "feed-upload-status", style: { fontSize: "0.85rem", color: "var(--color-primary)" } }, uploadStatus || "Uploading attachments..."), attachments.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "feed-post-attachments-list", style: { maxHeight: 150, overflowY: "auto" } }, attachments.map((att) => {
      const isImage = String(att.mimeType || "").startsWith("image/");
      const isVideo = String(att.mimeType || "").startsWith("video/");
      const iconName = isImage ? "image" : isVideo ? "video" : "file-text";
      return /* @__PURE__ */ React.createElement("div", { className: "feed-post-attachment-row", key: att.key }, /* @__PURE__ */ React.createElement("div", { style: { padding: "0.2rem", color: "var(--color-text-muted)", display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, overflow: "hidden", borderRadius: 4, background: "rgba(0,0,0,0.05)", flexShrink: 0 } }, isImage && (att.previewUrl || att.existingUrl || att.existingThumbnail) ? /* @__PURE__ */ React.createElement("img", { src: att.previewUrl || att.existingThumbnail || att.existingUrl, alt: "Preview", style: { width: "100%", height: "100%", objectFit: "cover" } }) : /* @__PURE__ */ React.createElement(Icon, { name: iconName, size: 20 })), /* @__PURE__ */ React.createElement("div", { className: "feed-post-attachment-main" }, /* @__PURE__ */ React.createElement("div", { className: "feed-post-attachment-name", style: { fontSize: "0.8rem" } }, att.originName), /* @__PURE__ */ React.createElement("div", { className: "feed-post-attachment-meta" }, /* @__PURE__ */ React.createElement("span", { className: "status-chip" }, att.isExisting ? "Existing" : "New"), /* @__PURE__ */ React.createElement("span", null, formatMimeType(att.mimeType)))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "0.8rem" } }, /* @__PURE__ */ React.createElement("label", { className: "feed-inline-check", style: { fontSize: "0.8rem", margin: 0, padding: 0 } }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: !!att.resource, onChange: () => toggleAttachmentResource(att.key) }), /* @__PURE__ */ React.createElement("span", null, "Resource")), /* @__PURE__ */ React.createElement("button", { className: "btn-secondary btn-sm", type: "button", onClick: () => downloadAttachment(att) }, "Download"), /* @__PURE__ */ React.createElement("button", { className: "btn-danger btn-sm", type: "button", onClick: () => removeAttachment(att.key) }, "Remove")));
    })), /* @__PURE__ */ React.createElement("div", { className: "composer-toolbar-actions" }, /* @__PURE__ */ React.createElement("div", { className: "composer-toolbar-left" }, /* @__PURE__ */ React.createElement("div", { className: "composer-chip", onClick: () => fileInputRef.current?.click() }, /* @__PURE__ */ React.createElement(Icon, { name: "paperclip", size: 14 }), " Add Files", /* @__PURE__ */ React.createElement("input", { ref: fileInputRef, type: "file", multiple: true, accept: "video/*,image/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf", style: { display: "none" }, onChange: pickFiles })), /* @__PURE__ */ React.createElement("div", { className: "composer-chip" }, /* @__PURE__ */ React.createElement(Icon, { name: "tag", size: 14 }), /* @__PURE__ */ React.createElement("select", {
      value: type, onChange: (e) => {
        const newType = e.target.value;
        setType(newType);
        if (newType === "Homework" && submissionAllowed && !deadline) {
          const d = /* @__PURE__ */ new Date();
          d.setDate(d.getDate() + 8);
          const pad = (n) => n.toString().padStart(2, "0");
          setDeadline(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
        }
      }
    }, /* @__PURE__ */ React.createElement("option", { value: "Announcement" }, "Announcement"), /* @__PURE__ */ React.createElement("option", { value: "Homework" }, "Homework"))), type === "Homework" && /* @__PURE__ */ React.createElement("label", { className: "composer-chip", style: { cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem" } }, /* @__PURE__ */ React.createElement("input", {
      type: "checkbox", checked: submissionAllowed, onChange: (e) => {
        const checked = e.target.checked;
        setSubmissionAllowed(checked);
        if (checked && !deadline) {
          const d = /* @__PURE__ */ new Date();
          d.setDate(d.getDate() + 8);
          const pad = (n) => n.toString().padStart(2, "0");
          setDeadline(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
        }
      }, style: { width: 14, height: 14, margin: 0 }
    }), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "0.85rem", fontWeight: 600 } }, "Allow Submissions")), type === "Homework" && submissionAllowed && /* @__PURE__ */ React.createElement("div", { className: "composer-chip" }, /* @__PURE__ */ React.createElement(Icon, { name: "calendar", size: 14 }), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "datetime-local",
        value: deadline,
        onChange: (e) => setDeadline(e.target.value),
        style: { border: "none", background: "transparent", outline: "none", fontSize: "0.85rem", fontWeight: 600, color: "inherit" }
      }
    ))), /* @__PURE__ */ React.createElement("div", { className: "composer-toolbar-left" }))))), showConfirm && /* @__PURE__ */ React.createElement("div", { className: "modal-overlay", onClick: () => setShowConfirm(false), style: { zIndex: 1e4, padding: "1rem", display: "flex", alignItems: "center", justifyContent: "center" } }, /* @__PURE__ */ React.createElement("div", { className: "modal-content", onClick: (e) => e.stopPropagation(), style: { maxWidth: 400, width: "100%", padding: "1.5rem", borderRadius: 12 } }, /* @__PURE__ */ React.createElement("h3", { style: { marginTop: 0, marginBottom: "1rem", fontSize: "1.2rem" } }, isEdit ? "Update Post" : "Create Post"), isEdit && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" } }, /* @__PURE__ */ React.createElement("label", { className: "feed-inline-check", style: { display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer", fontSize: "1rem" } }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: sendOnUpdate, onChange: (e) => setSendOnUpdate(e.target.checked), style: { width: 20, height: 20 } }), /* @__PURE__ */ React.createElement("span", null, "Notify Audience"))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: "0.8rem", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", onClick: () => setShowConfirm(false) }, "Cancel"), /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", onClick: () => executeSave(true) }, "Save as Draft"), /* @__PURE__ */ React.createElement("button", { className: "btn btn-primary", onClick: () => executeSave(false) }, isEdit ? "Confirm Update" : "Confirm Post"))))),
      document.body
    );
  };
  var FeedSubmissionsScreen = ({ postId, onBack }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [submissions, setSubmissions] = useState([]);
    const [activeSubmission, setActiveSubmission] = useState(null);
    const parseApiDateToLocal = (input) => {
      if (input == null) return null;
      if (input instanceof Date) return DateTime.fromJSDate(input).toLocal();
      const s = String(input).trim();
      if (!s) return null;
      if (/^\d{2}:\d{2}(?::\d{2})?$/.test(s)) {
        const parts = s.split(":").map((x) => Number(x || 0));
        const now = DateTime.now();
        return DateTime.local(now.year, now.month, now.day, parts[0] || 0, parts[1] || 0, parts[2] || 0);
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const dt2 = DateTime.fromISO(s);
        return dt2.isValid ? dt2.toLocal() : null;
      }
      let candidate = s;
      if (candidate.includes(" ") && !candidate.includes("T")) candidate = candidate.replace(" ", "T");
      let dt = DateTime.fromISO(candidate);
      if (!dt.isValid) dt = DateTime.fromRFC2822(candidate);
      return dt.isValid ? dt.toLocal() : null;
    };
    const formatDateMaybeTime = (input, forceTime = false) => {
      const dt = parseApiDateToLocal(input);
      if (!dt) return "";
      const hasTime = dt.hour !== 0 || dt.minute !== 0 || forceTime;
      return dt.toFormat(hasTime ? "dd/LL/yyyy hh:mma" : "dd/LL/yyyy");
    };
    const normalize = (v) => {
      if (Array.isArray(v)) return v.map(normalize);
      if (!v || typeof v !== "object") return v;
      const out = {};
      Object.keys(v).forEach((k) => {
        out[String(k).toLowerCase()] = normalize(v[k]);
      });
      return out;
    };
    const load = async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await api.get(`/api/post/${postId}/audience-submissions`);
        const payload = normalize(res.data || {});
        const rows = Array.isArray(payload.submissions) ? payload.submissions : [];
        setSubmissions(rows);
      } catch {
        setSubmissions([]);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    useEffect(() => {
      load();
    }, [postId]);
    const studentNameOf = (s) => String(s?.student?.name || "").trim();
    const studentPhotoOf = (s) => toAbsoluteAssetUrl(String(s?.student?.photo || ""));
    const classroomNameOf = (s) => String(s?.classroom?.name || "").trim();
    const submissionDateOf = (s) => formatDateMaybeTime(s?.date, true);
    const openAttachment = (att) => {
      const path = String(att?.path || "").trim();
      if (!path) return;
      window.open(toAbsoluteAssetUrl(path), "_blank", "noopener,noreferrer");
    };
    return /* @__PURE__ */ React.createElement("div", { className: "feed-screen-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "feed-screen-head" }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary feed-screen-back", onClick: onBack }, /* @__PURE__ */ React.createElement(Icon, { name: "arrow-left", size: 16 }), /* @__PURE__ */ React.createElement("span", null, "Back to Feed")), /* @__PURE__ */ React.createElement("h2", null, "Submissions")), /* @__PURE__ */ React.createElement("div", { className: "card feed-submissions-card" }, /* @__PURE__ */ React.createElement("div", { className: "card-body" }, loading ? /* @__PURE__ */ React.createElement(TableSkeleton, { rows: 8, cols: 1 }) : error ? /* @__PURE__ */ React.createElement("div", { className: "empty-state" }, /* @__PURE__ */ React.createElement(Icon, { name: "alert-circle", size: 36 }), /* @__PURE__ */ React.createElement("p", { className: "empty-state-title" }, "Failed to load submissions"), /* @__PURE__ */ React.createElement("button", { className: "btn-secondary", onClick: load }, "Retry")) : submissions.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "empty-state" }, /* @__PURE__ */ React.createElement(Icon, { name: "inbox", size: 36 }), /* @__PURE__ */ React.createElement("p", { className: "empty-state-title" }, "No submissions")) : /* @__PURE__ */ React.createElement("div", { className: "feed-submissions-list" }, submissions.map((s, i) => /* @__PURE__ */ React.createElement("button", { key: s.id || i, className: "feed-submission-row", onClick: () => setActiveSubmission(s) }, /* @__PURE__ */ React.createElement(Avatar, { name: studentNameOf(s) || "Student", photoUrl: studentPhotoOf(s), id: s?.student?.id || s?.id || i, size: 44 }), /* @__PURE__ */ React.createElement("div", { className: "feed-submission-main" }, /* @__PURE__ */ React.createElement("div", { className: "feed-submission-name" }, studentNameOf(s) || "Student"), classroomNameOf(s) && /* @__PURE__ */ React.createElement("div", { className: "feed-submission-classroom" }, classroomNameOf(s)), submissionDateOf(s) && /* @__PURE__ */ React.createElement("div", { className: "feed-submission-date" }, submissionDateOf(s))), /* @__PURE__ */ React.createElement(Icon, { name: "chevron-right", size: 18 })))))), activeSubmission && /* @__PURE__ */ React.createElement(GlobalCanvasPortal, null, /* @__PURE__ */ React.createElement("div", { className: "modal-overlay", onClick: () => setActiveSubmission(null) }, /* @__PURE__ */ React.createElement("div", { className: "modal-box feed-submission-details-modal", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "modal-title" }, "Submission Details"), /* @__PURE__ */ React.createElement("div", { className: "feed-submission-details-head" }, /* @__PURE__ */ React.createElement(
      Avatar,
      {
        name: studentNameOf(activeSubmission) || "Student",
        photoUrl: studentPhotoOf(activeSubmission),
        id: activeSubmission?.student?.id || activeSubmission?.id,
        size: 52
      }
    ), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "feed-submission-name" }, studentNameOf(activeSubmission) || "Student"), classroomNameOf(activeSubmission) && /* @__PURE__ */ React.createElement("div", { className: "feed-submission-classroom" }, classroomNameOf(activeSubmission)), submissionDateOf(activeSubmission) && /* @__PURE__ */ React.createElement("div", { className: "feed-submission-date" }, submissionDateOf(activeSubmission)))), String(activeSubmission?.note || "").trim() && /* @__PURE__ */ React.createElement("div", { className: "feed-submission-note" }, /* @__PURE__ */ React.createElement("div", { className: "feed-submission-section-title" }, "Notes"), /* @__PURE__ */ React.createElement("p", null, String(activeSubmission.note))), (activeSubmission?.parent?.name || activeSubmission?.parent2?.name) && /* @__PURE__ */ React.createElement("div", { className: "feed-submission-note" }, /* @__PURE__ */ React.createElement("div", { className: "feed-submission-section-title" }, "Parents"), /* @__PURE__ */ React.createElement("div", { className: "feed-submission-attachments" }, activeSubmission?.parent?.name && /* @__PURE__ */ React.createElement("span", { className: "status-chip" }, activeSubmission.parent.name), activeSubmission?.parent2?.name && /* @__PURE__ */ React.createElement("span", { className: "status-chip" }, activeSubmission.parent2.name))), /* @__PURE__ */ React.createElement("div", { className: "feed-submission-note" }, /* @__PURE__ */ React.createElement("div", { className: "feed-submission-section-title" }, "Attachments"), /* @__PURE__ */ React.createElement("div", { className: "feed-submission-attachments" }, (Array.isArray(activeSubmission?.attachments) ? activeSubmission.attachments : []).length === 0 ? /* @__PURE__ */ React.createElement("span", { className: "empty-state-msg" }, "No attachments") : (activeSubmission.attachments || []).map((att, idx) => /* @__PURE__ */ React.createElement("button", { key: `${att.id || idx}-${idx}`, className: "feed-submission-attachment", onClick: () => openAttachment(att) }, /* @__PURE__ */ React.createElement(Icon, { name: "paperclip", size: 15 }), /* @__PURE__ */ React.createElement("span", null, att.originname || att.originName || "Attachment"))))), /* @__PURE__ */ React.createElement("div", { className: "modal-actions" }, /* @__PURE__ */ React.createElement("button", { className: "btn-secondary", onClick: () => setActiveSubmission(null) }, "Close"))))));
  };
  var FeedPage = () => {
    const [activeScreen, setActiveScreen] = useState("feed");
    const [selectedType, setSelectedType] = useState(() => window.appFeedFilters?.type || "");
    const [filterUserIds, setFilterUserIds] = useState([]);
    const [filterClassroomIds, setFilterClassroomIds] = useState(() => window.appFeedFilters?.classrooms || []);
    const [filterFromDate, setFilterFromDate] = useState("");
    const [filterToDate, setFilterToDate] = useState("");
    const [appliedUserNames, setAppliedUserNames] = useState({});
    const [appliedClassroomNames, setAppliedClassroomNames] = useState({});
    const [cachedUsers, setCachedUsers] = useState([]);
    const [cachedClassrooms, setCachedClassrooms] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [items, setItems] = useState([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState(null);
    const [showFiltersModal, setShowFiltersModal] = useState(false);
    const [openMenuPostId, setOpenMenuPostId] = useState(null);
    const [expandedPosts, setExpandedPosts] = useState({});
    const [commentsPostId, setCommentsPostId] = useState(null);
    const [postFormPostId, setPostFormPostId] = useState(null);
    const [submissionsPostId, setSubmissionsPostId] = useState(null);
    const [likesPostId, setLikesPostId] = useState(null);
    const [viewsPostId, setViewsPostId] = useState(null);
    const [galleryData, setGalleryData] = useState(null);
    const [pagerIndices, setPagerIndices] = useState({});
    const loadMoreRef = useRef(null);
    const feedScrollRef = useRef(null);
    const filtersActive = selectedType || filterUserIds.length > 0 || filterClassroomIds.length > 0 || filterFromDate || filterToDate;
    const csvFromIds = (arr) => {
      if (!arr || arr.length === 0) return null;
      return [...arr].sort((a, b) => a - b).join(",");
    };
    const formatDateParam = (raw) => {
      if (!raw) return "";
      try {
        return DateTime.fromISO(raw).toFormat("yyyy-MM-dd");
      } catch {
        return raw;
      }
    };
    const normalizeResponseMap = (src) => {
      if (!src || typeof src !== "object" || Array.isArray(src)) return src;
      const dst = {};
      Object.keys(src).forEach((k) => {
        const key = String(k).toLowerCase();
        const v = src[k];
        if (Array.isArray(v)) dst[key] = v.map((x) => x && typeof x === "object" && !Array.isArray(x) ? normalizeResponseMap(x) : x);
        else if (v && typeof v === "object") dst[key] = normalizeResponseMap(v);
        else dst[key] = v;
      });
      return dst;
    };
    useEffect(() => {
      window.appFeedFilters = null;
    }, []);
    const fetchUsers = async () => {
      try {
        const res = await api.get("/api/users", { params: { col: "Id,FirstName,LastName,name,photo", status: "Current", page: 1, limit: 200 } });
        const root2 = res.data?.data || res.data?.items || res.data?.results || res.data || [];
        const list = Array.isArray(root2) ? root2 : [];
        const normalized = list.map((u) => {
          const id = Number(u.id || u.Id || 0);
          const name = `${u.FirstName || u.firstName || ""} ${u.LastName || u.lastName || ""}`.trim() || u.name || u.Name || `User ${id}`;
          return { id, name };
        }).filter((u) => u.id);
        setCachedUsers(normalized);
      } catch {
        setCachedUsers([]);
      }
    };
    const fetchClassrooms = async () => {
      try {
        const res = await api.get("/api/classrooms", { params: { col: "id,name", filter: "status eq 'Current'" } });
        const root2 = res.data?.data || res.data?.items || res.data?.results || res.data || [];
        const list = Array.isArray(root2) ? root2 : [];
        const normalized = list.map((c) => ({ id: Number(c.id || c.Id || 0), name: c.name || c.Name || "" })).filter((c) => c.id);
        if (!normalized.find((c) => c.id === 0)) normalized.unshift({ id: 0, name: "Public" });
        setCachedClassrooms(normalized);
      } catch {
        setCachedClassrooms([{ id: 0, name: "Public" }]);
      }
    };
    const fetchFeed = async ({ loaded, hardReload }) => {
      const params = { type: selectedType, l: loaded, q: searchTerm };
      const usersCsv = csvFromIds(filterUserIds);
      const classCsv = csvFromIds(filterClassroomIds);
      if (usersCsv) params.users = usersCsv;
      if (classCsv) params.classrooms = classCsv;
      if (filterFromDate) params.fd = formatDateParam(filterFromDate);
      if (filterToDate) params.td = formatDateParam(filterToDate);
      if (hardReload) params.hardreload = 1;
      const response = await api.get("/api/getfeed/user/0", { params });
      const data = response.data;
      const rows = Array.isArray(data) ? data : data?.data || data?.items || data?.results || [];
      if (!Array.isArray(rows)) return [];
      return rows.map((r) => normalizeResponseMap(r));
    };
    const loadInitial = async () => {
      setInitialLoading(true);
      setError(null);
      setHasMore(true);
      try {
        const rows = await fetchFeed({ loaded: 0, hardReload: true });
        setItems(rows);
        setHasMore(rows.length > 0);
      } catch (e) {
        setError(e.message || "Failed to load feed");
        setItems([]);
      } finally {
        setInitialLoading(false);
      }
    };
    const loadMore = async () => {
      if (loadingMore || !hasMore || initialLoading) return;
      setLoadingMore(true);
      try {
        const rows = await fetchFeed({ loaded: items.length, hardReload: false });
        if (rows.length === 0) {
          setHasMore(false);
        } else {
          setItems((prev) => [...prev, ...rows]);
        }
      } catch {
        setHasMore(false);
      } finally {
        setLoadingMore(false);
      }
    };
    useEffect(() => {
      loadInitial();
      fetchUsers();
      fetchClassrooms();
    }, []);
    useEffect(() => {
      const node = loadMoreRef.current;
      if (!node) return;
      const observer = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      }, { threshold: 0.2 });
      observer.observe(node);
      return () => observer.disconnect();
    }, [loadMoreRef.current, loadingMore, hasMore, initialLoading, items.length]);
    useEffect(() => {
      const t = setTimeout(() => {
        loadInitial();
      }, 280);
      return () => clearTimeout(t);
    }, [searchTerm]);
    const resetFilters = () => {
      setSelectedType("");
      setFilterUserIds([]);
      setFilterClassroomIds([]);
      setFilterFromDate("");
      setFilterToDate("");
      setAppliedUserNames({});
      setAppliedClassroomNames({});
    };
    const applyFilters = () => {
      setShowFiltersModal(false);
      loadInitial();
    };
    const parseApiDateToLocal = (input) => {
      if (input == null) return null;
      if (input instanceof Date) return DateTime.fromJSDate(input).toLocal();
      const s = String(input).trim();
      if (!s) return null;
      if (/^\d{2}:\d{2}(?::\d{2})?$/.test(s)) {
        const parts = s.split(":").map((x) => Number(x || 0));
        const now = DateTime.now();
        return DateTime.local(now.year, now.month, now.day, parts[0] || 0, parts[1] || 0, parts[2] || 0);
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const dt2 = DateTime.fromISO(s);
        return dt2.isValid ? dt2.toLocal() : null;
      }
      let candidate = s;
      if (candidate.includes(" ") && !candidate.includes("T")) candidate = candidate.replace(" ", "T");
      let dt = DateTime.fromISO(candidate);
      if (!dt.isValid) dt = DateTime.fromRFC2822(candidate);
      return dt.isValid ? dt.toLocal() : null;
    };
    const formatDateMaybeTime = (input, forceTime = false) => {
      const dt = parseApiDateToLocal(input);
      if (!dt) return "";
      const hasTime = dt.hour !== 0 || dt.minute !== 0 || forceTime;
      return dt.toFormat(hasTime ? "dd/LL/yyyy hh:mma" : "dd/LL/yyyy");
    };
    const detailForPost = (item) => {
      const dateRaw = item.date || item.datetime || item.createdat || "";
      const postDate = parseApiDateToLocal(dateRaw);
      let detail = "";
      if (postDate) {
        const now = DateTime.now();
        const diffMinutes = Math.floor(now.diff(postDate, "minutes").minutes);
        const diffHours = Math.floor(now.diff(postDate, "hours").hours);
        if (diffMinutes <= 1) {
          detail = "Just Now";
        } else if (diffMinutes <= 59) {
          detail = `${diffMinutes} minutes ago`;
        } else if (diffHours < 24) {
          detail = `${diffHours}h ago`;
        } else {
          detail = formatDateMaybeTime(postDate, true).replace(/^0/, "");
        }
      }
      const classNames = (item.classroom_names || item.classroomname || "").toString().trim();
      detail += ` \u2022 ${classNames || "Public"}`;
      detail += String(item.type || "").toLowerCase() === "homework" ? " \u2022 Homework" : " \u2022 Announcement";
      const isDraft = item.draft === true || item.draft === "true" || item.draft === 1 || item.isdraft === true || item.isdraft === "true" || item.isdraft === 1;
      if (isDraft) {
        detail = `[Draft] \u2022 ` + detail;
      }
      return detail;
    };
    const extractYouTubeVideoId = (text) => {
      if (!text) return null;
      const match = text.match(/((?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com\/[\w\-\?&=/%#.]+|youtu\.be\/[\w\-\?&=/%#.]+))/i);
      if (!match) return null;
      let url = match[1] || "";
      if (!url.toLowerCase().startsWith("http")) url = `https://${url}`;
      try {
        const uri = new URL(url);
        if (uri.hostname.includes("youtu.be")) return uri.pathname.replace("/", "") || null;
        if (uri.searchParams.get("v")) return uri.searchParams.get("v");
        const parts = uri.pathname.split("/").filter(Boolean);
        const shortsIndex = parts.indexOf("shorts");
        if (shortsIndex !== -1 && parts[shortsIndex + 1]) return parts[shortsIndex + 1];
        const embedIndex = parts.indexOf("embed");
        if (embedIndex !== -1 && parts[embedIndex + 1]) return parts[embedIndex + 1];
      } catch {
        return null;
      }
      return null;
    };
    const parseHtmlAndExtractYouTube = (rawHtml) => {
      const source = String(rawHtml || "");
      const parser = new DOMParser();
      let videoId = null;
      let cleaned = source;
      try {
        const doc = parser.parseFromString(source, "text/html");
        const iframes = [...doc.querySelectorAll("iframe")];
        iframes.forEach((frame) => {
          const src = frame.getAttribute("src") || "";
          const id = extractYouTubeVideoId(src);
          if (!videoId && id) videoId = id;
          if (id) frame.remove();
        });
        const embeds = [...doc.querySelectorAll("[data-oembed-url]")];
        embeds.forEach((el) => {
          const src = el.getAttribute("data-oembed-url") || "";
          const id = extractYouTubeVideoId(src);
          if (!videoId && id) videoId = id;
          if (id) el.remove();
        });
        cleaned = doc.body && doc.body.innerHTML ? doc.body.innerHTML : source;
      } catch {
        cleaned = source;
      }
      if (!videoId) videoId = extractYouTubeVideoId(source);
      return { cleanedHtml: cleaned, youTubeId: videoId };
    };
    const toggleLike = async (item) => {
      const postId = item.id;
      const prevReaction = item.liked_reaction_id;
      const wasLiked = !!prevReaction;
      setItems((prev) => prev.map((p) => {
        if (p.id !== postId) return p;
        return { ...p, liked_reaction_id: wasLiked ? null : -1 };
      }));
      try {
        if (wasLiked) {
          const res = await api.delete(`/api/postreaction/user/${prevReaction}`);
          if (res.status !== 202) throw new Error("Failed");
        } else {
          const res = await api.post("/api/postreaction/user/", { post: postId, like: true });
          const nextReactionId = res.data?.id;
          setItems((prev) => prev.map((p) => p.id === postId ? { ...p, liked_reaction_id: nextReactionId || -1 } : p));
        }
      } catch {
        setItems((prev) => prev.map((p) => p.id === postId ? { ...p, liked_reaction_id: prevReaction || null } : p));
      }
    };
    const deletePost = async (postId) => {
      if (!window.confirm("Delete this post?")) return;
      try {
        const res = await api.delete(`/api/post/${postId}`);
        if (res.status === 202) loadInitial();
      } catch {
        alert("Failed to delete post.");
      }
    };
    const postAction = async (item, action) => {
      if (action === "edit") {
        setPostFormPostId(item.id);
        setActiveScreen("postForm");
        return;
      }
      if (action === "submissions") {
        setSubmissionsPostId(item.id);
        setActiveScreen("submissions");
        return;
      }
      if (action === "likes") {
        setLikesPostId(item.id);
        return;
      }
      if (action === "views") {
        setViewsPostId(item.id);
        return;
      }
      if (action === "send_email" || action === "send_reminder") {
        const confirmMsg = action === "send_email" ? "Send this post by email?" : "Send a reminder notification for this post?";
        if (!window.confirm(confirmMsg)) return;
        try {
          const res = await api.post(`/api/post/${item.id}/resend`, { action: action === "send_email" ? "email" : "notify" });
          if (res.status === 200 || res.status === 202) alert(action === "send_email" ? "Email sent." : "Reminder sent.");
          else alert("Failed to send.");
        } catch {
          alert("Failed to send.");
        }
        return;
      }
      if (action === "copy_body") {
        const bodyRaw = String(item.body || "");
        const tmp = document.createElement("div");
        tmp.innerHTML = bodyRaw;
        const text = (tmp.textContent || tmp.innerText || "").trim();
        if (!text) {
          alert("Nothing to copy.");
          return;
        }
        try {
          await navigator.clipboard.writeText(text);
          alert("Post body copied.");
        } catch {
          alert("Copy failed.");
        }
        return;
      }
      if (action === "delete") {
        await deletePost(item.id);
      }
    };
    const attachmentIconName = (mime) => {
      const m = String(mime || "").toLowerCase();
      if (m.includes("pdf")) return "file-text";
      if (m.includes("word")) return "file";
      if (m.includes("spreadsheet") || m.includes("excel")) return "bar-chart-2";
      if (m.includes("presentation") || m.includes("powerpoint")) return "monitor";
      return "paperclip";
    };
    const openGallery = (allAttachments, startIndex) => {
      setGalleryData({ attachments: allAttachments, initialIndex: startIndex });
    };
    const openAttachment = (att, allAttachments, index) => {
      const mime = String(att.filemime || "").toLowerCase();
      if (mime.startsWith("image/") || mime.startsWith("video/")) {
        openGallery(allAttachments || [att], index || 0);
      } else {
        const path = att.path || att.url || "";
        if (path) window.open(toAbsoluteAssetUrl(path), "_blank", "noopener,noreferrer");
      }
    };
    if (activeScreen === "postForm") {
      return /* @__PURE__ */ React.createElement(
        FeedPostFormScreen,
        {
          postId: postFormPostId,
          onClose: () => {
            setActiveScreen("feed");
            setPostFormPostId(null);
          },
          onSaved: async () => {
            setActiveScreen("feed");
            setPostFormPostId(null);
            await loadInitial();
          }
        }
      );
    }
    if (activeScreen === "submissions") {
      return /* @__PURE__ */ React.createElement(
        FeedSubmissionsScreen,
        {
          postId: submissionsPostId,
          onBack: () => {
            setActiveScreen("feed");
            setSubmissionsPostId(null);
          }
        }
      );
    }
    return /* @__PURE__ */ React.createElement("div", { className: "feed-page" }, /* @__PURE__ */ React.createElement("div", { className: "feed-top-fixed" }, /* @__PURE__ */ React.createElement("div", { className: "feed-top-actions" }, /* @__PURE__ */ React.createElement("div", { className: "feed-search-row feed-search-row-inline" }, /* @__PURE__ */ React.createElement("span", { className: "topbar-search-icon" }, /* @__PURE__ */ React.createElement(Icon, { name: "search", size: 16 })), /* @__PURE__ */ React.createElement("input", { type: "text", placeholder: "Search feed...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value) })), /* @__PURE__ */ React.createElement("div", { className: "feed-top-actions-controls" }, /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary feed-tool-btn", title: "Filters", onClick: () => setShowFiltersModal(true) }, /* @__PURE__ */ React.createElement(Icon, { name: "filter", size: 16 }), /* @__PURE__ */ React.createElement("span", null, "Filters")), /* @__PURE__ */ React.createElement("button", {
      className: "btn btn-primary feed-new-post-btn", title: "New Post", onClick: () => {
        setPostFormPostId(null);
        setActiveScreen("postForm");
      }
    }, /* @__PURE__ */ React.createElement(Icon, { name: "plus", size: 16 }), /* @__PURE__ */ React.createElement("span", null, "New Post")))), filtersActive && /* @__PURE__ */ React.createElement("div", { className: "feed-chip-row" }, selectedType && /* @__PURE__ */ React.createElement("span", { className: "status-chip" }, "Type: ", selectedType, /* @__PURE__ */ React.createElement(Icon, {
      name: "x", size: 12, style: { cursor: "pointer", marginLeft: 6 }, onClick: () => {
        setSelectedType("");
        loadInitial();
      }
    })), filterUserIds.map((id) => /* @__PURE__ */ React.createElement("span", { key: `u-${id}`, className: "status-chip" }, "User: ", appliedUserNames[id] || cachedUsers.find((u) => u.id === id)?.name || `User ${id}`, /* @__PURE__ */ React.createElement(Icon, {
      name: "x", size: 12, style: { cursor: "pointer", marginLeft: 6 }, onClick: () => {
        setFilterUserIds((prev) => prev.filter((x) => x !== id));
        setTimeout(loadInitial, 0);
      }
    }))), filterClassroomIds.map((id) => /* @__PURE__ */ React.createElement("span", { key: `c-${id}`, className: "status-chip" }, "Classroom: ", appliedClassroomNames[id] || cachedClassrooms.find((c) => c.id === id)?.name || (id === 0 ? "Public" : `Classroom ${id}`), /* @__PURE__ */ React.createElement(Icon, {
      name: "x", size: 12, style: { cursor: "pointer", marginLeft: 6 }, onClick: () => {
        setFilterClassroomIds((prev) => prev.filter((x) => x !== id));
        setTimeout(loadInitial, 0);
      }
    }))), (filterFromDate || filterToDate) && /* @__PURE__ */ React.createElement("span", { className: "status-chip" }, "Date: ", filterFromDate || "...", " - ", filterToDate || "...", /* @__PURE__ */ React.createElement(Icon, {
      name: "x", size: 12, style: { cursor: "pointer", marginLeft: 6 }, onClick: () => {
        setFilterFromDate("");
        setFilterToDate("");
        setTimeout(loadInitial, 0);
      }
    })))), /* @__PURE__ */ React.createElement("div", { className: "feed-scroll", ref: feedScrollRef }, initialLoading ? /* @__PURE__ */ React.createElement(FeedPostSkeletonList, { count: 4 }) : error ? /* @__PURE__ */ React.createElement("div", { className: "empty-state" }, /* @__PURE__ */ React.createElement(Icon, { name: "alert-circle", size: 40 }), /* @__PURE__ */ React.createElement("p", { className: "empty-state-title" }, "Error loading feed"), /* @__PURE__ */ React.createElement("p", { className: "empty-state-msg" }, error)) : items.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "card" }, /* @__PURE__ */ React.createElement("div", { className: "card-body" }, /* @__PURE__ */ React.createElement("div", { className: "empty-state" }, /* @__PURE__ */ React.createElement(Icon, { name: "inbox", size: 40 }), /* @__PURE__ */ React.createElement("p", { className: "empty-state-title" }, "No posts yet.")))) : /* @__PURE__ */ React.createElement("div", { className: "feed-list" }, items.map((item, idx) => {
      const id = item.id || idx;
      const avatar = item.image || "";
      const name = item.fullname || "Unknown";
      const title = item.title || "";
      const body = item.body || "";
      const type = String(item.type || "").toLowerCase();
      const attachments = Array.isArray(item.attachments) ? item.attachments : [];
      const canControl = item.cancontrol === true || item.can_control === true || item.cancontrol === 1 || item.cancontrol === "true";
      const liked = !!item.liked_reaction_id;
      const parsed = parseHtmlAndExtractYouTube(body);
      const bodyKey = String(id);
      const expanded = !!expandedPosts[bodyKey];
      const isLong = String(body || "").length > 380;
      return /* @__PURE__ */ React.createElement("div", { className: "card feed-post-card", key: id }, /* @__PURE__ */ React.createElement("div", { className: "card-body" }, /* @__PURE__ */ React.createElement("div", { className: "feed-post-head" }, /* @__PURE__ */ React.createElement("div", { className: "feed-post-author" }, /* @__PURE__ */ React.createElement(Avatar, { name, photoUrl: avatar, id: item.user || name, size: 44 }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "feed-post-name" }, name), /* @__PURE__ */ React.createElement("div", { className: "feed-post-meta" }, detailForPost(item)))), canControl && /* @__PURE__ */ React.createElement("div", { className: "feed-post-menu-wrap" }, /* @__PURE__ */ React.createElement("button", { className: "topbar-icon-btn", onClick: () => setOpenMenuPostId(openMenuPostId === id ? null : id) }, /* @__PURE__ */ React.createElement(Icon, { name: "more-vertical", size: 16 })), openMenuPostId === id && /* @__PURE__ */ React.createElement("div", { className: "feed-post-menu" }, /* @__PURE__ */ React.createElement("button", {
        onClick: () => {
          setOpenMenuPostId(null);
          postAction(item, "edit");
        }
      }, "Edit"), /* @__PURE__ */ React.createElement("button", {
        onClick: () => {
          setOpenMenuPostId(null);
          postAction(item, "likes");
        }
      }, "Likes"), /* @__PURE__ */ React.createElement("button", {
        onClick: () => {
          setOpenMenuPostId(null);
          postAction(item, "views");
        }
      }, "Post Views"), String(body || "").trim() && /* @__PURE__ */ React.createElement("button", {
        onClick: () => {
          setOpenMenuPostId(null);
          postAction(item, "copy_body");
        }
      }, "Copy body"), !attachments.some((a) => String(a.filemime || "").toLowerCase().startsWith("video/")) && !parsed.youTubeId && /* @__PURE__ */ React.createElement("button", {
        onClick: () => {
          setOpenMenuPostId(null);
          postAction(item, "send_email");
        }
      }, "Send Email"), /* @__PURE__ */ React.createElement("button", {
        onClick: () => {
          setOpenMenuPostId(null);
          postAction(item, "send_reminder");
        }
      }, "Send Reminder"), /* @__PURE__ */ React.createElement("button", {
        className: "danger", onClick: () => {
          setOpenMenuPostId(null);
          postAction(item, "delete");
        }
      }, "Delete")))), title ? /* @__PURE__ */ React.createElement("div", { className: "feed-post-title", dir: "auto" }, title) : null, parsed.youTubeId && /* @__PURE__ */ React.createElement("div", { className: "feed-youtube-wrap" }, /* @__PURE__ */ React.createElement(
        "iframe",
        {
          src: `https://www.youtube.com/embed/${parsed.youTubeId}`,
          title: `video-${id}`,
          allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
          allowFullScreen: true
        }
      )), parsed.cleanedHtml && /* @__PURE__ */ React.createElement("div", { className: `feed-post-body ${expanded ? "expanded" : ""}`, dir: "auto" }, /* @__PURE__ */ React.createElement("div", { dangerouslySetInnerHTML: { __html: parsed.cleanedHtml } }), !expanded && isLong && /* @__PURE__ */ React.createElement("div", { className: "feed-post-body-fade" })), isLong && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 8, textAlign: "center" } }, /* @__PURE__ */ React.createElement("button", { className: "btn-secondary btn-sm", onClick: () => setExpandedPosts((prev) => ({ ...prev, [bodyKey]: !prev[bodyKey] })) }, expanded ? "See less" : "See more")), attachments.length > 0 && (() => {
        const mediaAttachments = attachments.filter((a) => {
          const mime = String(a.filemime || "").toLowerCase();
          return mime.startsWith("image/") || mime.startsWith("video/");
        });
        const fileAttachments = attachments.filter((a) => {
          const mime = String(a.filemime || "").toLowerCase();
          return !mime.startsWith("image/") && !mime.startsWith("video/");
        });
        const pagerKey = `pager-${id}`;
        const pIdx = pagerIndices[pagerKey] || 0;
        return /* @__PURE__ */ React.createElement(React.Fragment, null, mediaAttachments.length > 0 && mediaAttachments.length <= 4 && /* @__PURE__ */ React.createElement("div", { className: "feed-pager-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "feed-pager-track", style: { transform: `translateX(-${pIdx * 100}%)` } }, mediaAttachments.map((att, attIndex) => {
          const mime = String(att.filemime || "").toLowerCase();
          const url = toAbsoluteAssetUrl(att.path || "");
          const isImage = mime.startsWith("image/");
          const originName = att.originname || att.originName || att.name || "Attachment";
          return /* @__PURE__ */ React.createElement("div", { key: `${id}-pager-${attIndex}`, className: "feed-pager-slide" }, isImage ? /* @__PURE__ */ React.createElement("img", { src: url, alt: originName, onClick: () => openGallery(attachments, attachments.indexOf(att)), onError: (e) => e.target.style.display = "none" }) : /* @__PURE__ */ React.createElement("div", { className: "feed-attachment-video", style: { width: "100%", height: 400, background: "#000", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative", overflow: "hidden" }, onClick: () => openGallery(attachments, attachments.indexOf(att)) }, att.thumbnail && /* @__PURE__ */ React.createElement("img", { src: toAbsoluteAssetUrl(att.thumbnail), alt: originName, style: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }, onError: (e) => e.target.style.display = "none" }), /* @__PURE__ */ React.createElement("div", { style: { position: "relative", zIndex: 1, background: "rgba(0,0,0,0.4)", borderRadius: "50%", width: 64, height: 64, display: "flex", alignItems: "center", justifyContent: "center" } }, /* @__PURE__ */ React.createElement(Icon, { name: "play-circle", size: 48, style: { color: "#fff" } }))));
        })), mediaAttachments.length > 1 && pIdx > 0 && /* @__PURE__ */ React.createElement("button", { className: "feed-pager-nav left", onClick: () => setPagerIndices((p) => ({ ...p, [pagerKey]: pIdx - 1 })) }, /* @__PURE__ */ React.createElement(Icon, { name: "chevron-left", size: 16 })), mediaAttachments.length > 1 && pIdx < mediaAttachments.length - 1 && /* @__PURE__ */ React.createElement("button", { className: "feed-pager-nav right", onClick: () => setPagerIndices((p) => ({ ...p, [pagerKey]: pIdx + 1 })) }, /* @__PURE__ */ React.createElement(Icon, { name: "chevron-right", size: 16 })), mediaAttachments.length > 1 && /* @__PURE__ */ React.createElement("div", { className: "feed-pager-dots" }, mediaAttachments.map((_, di) => /* @__PURE__ */ React.createElement("button", { key: di, className: `feed-pager-dot ${di === pIdx ? "active" : ""}`, onClick: () => setPagerIndices((p) => ({ ...p, [pagerKey]: di })) })))), mediaAttachments.length > 4 && /* @__PURE__ */ React.createElement("div", { className: "feed-attachments grid" }, mediaAttachments.slice(0, 4).map((att, attIndex) => {
          const mime = String(att.filemime || "").toLowerCase();
          const url = toAbsoluteAssetUrl(att.path || "");
          const isImage = mime.startsWith("image/");
          const originName = att.originname || att.originName || att.name || "Attachment";
          return /* @__PURE__ */ React.createElement("div", { key: `${id}-att-${attIndex}`, className: "feed-attachment-item", onClick: () => openGallery(attachments, attachments.indexOf(att)) }, isImage ? /* @__PURE__ */ React.createElement("img", { src: url, alt: originName, onError: (e) => e.target.style.display = "none" }) : /* @__PURE__ */ React.createElement("div", { style: { width: "100%", height: "100%", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" } }, att.thumbnail && /* @__PURE__ */ React.createElement("img", { src: toAbsoluteAssetUrl(att.thumbnail), alt: originName, style: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }, onError: (e) => e.target.style.display = "none" }), /* @__PURE__ */ React.createElement("div", { style: { position: "relative", zIndex: 1, background: "rgba(0,0,0,0.4)", borderRadius: "50%", width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center" } }, /* @__PURE__ */ React.createElement(Icon, { name: "play-circle", size: 36, style: { color: "#fff" } }))), attIndex === 3 && /* @__PURE__ */ React.createElement("div", { className: "feed-attachment-more" }, "+", mediaAttachments.length - 4));
        })), fileAttachments.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "feed-post-attachments-list", style: { marginTop: mediaAttachments.length > 0 ? "0.8rem" : "0" } }, fileAttachments.map((att, idx2) => {
          const mime = String(att.filemime || "").toLowerCase();
          const originName = att.originname || att.originName || att.name || "Attachment";
          return /* @__PURE__ */ React.createElement("div", { className: "feed-post-attachment-row", key: `${id}-file-${idx2}`, onClick: () => openAttachment(att, attachments, attachments.indexOf(att)), style: { cursor: "pointer" } }, /* @__PURE__ */ React.createElement("div", { style: { padding: "0.2rem", color: "var(--color-text-muted)" } }, /* @__PURE__ */ React.createElement(Icon, { name: attachmentIconName(mime), size: 20 })), /* @__PURE__ */ React.createElement("div", { className: "feed-post-attachment-main" }, /* @__PURE__ */ React.createElement("div", { className: "feed-post-attachment-name", style: { fontSize: "0.8rem" } }, originName), /* @__PURE__ */ React.createElement("div", { className: "feed-post-attachment-meta" }, /* @__PURE__ */ React.createElement("span", null, formatMimeType(mime)))));
        })));
      })(), type === "homework" && canControl && /* @__PURE__ */ React.createElement("div", { className: "feed-homework-bar" }, /* @__PURE__ */ React.createElement("span", null, "See all submissions"), /* @__PURE__ */ React.createElement("button", { className: "btn-secondary btn-sm", onClick: () => postAction(item, "submissions") }, "View")), /* @__PURE__ */ React.createElement("div", { className: "feed-post-actions" }, /* @__PURE__ */ React.createElement("button", { className: `feed-like-btn ${liked ? "liked" : ""}`, onClick: () => toggleLike(item) }, /* @__PURE__ */ React.createElement(Icon, { name: "heart", size: 18 }), " ", /* @__PURE__ */ React.createElement("span", null, "Like")), /* @__PURE__ */ React.createElement("button", { className: "feed-comment-btn", onClick: () => setCommentsPostId(item.id) }, /* @__PURE__ */ React.createElement(Icon, { name: "message-circle", size: 18 }), " ", /* @__PURE__ */ React.createElement("span", null, "Comment")))));
    }), /* @__PURE__ */ React.createElement("div", { ref: loadMoreRef, className: "feed-load-more-trigger" }, loadingMore && /* @__PURE__ */ React.createElement("div", { className: "loading-center" }, /* @__PURE__ */ React.createElement("div", { className: "spinner" }))))), showFiltersModal && /* @__PURE__ */ React.createElement(GlobalCanvasPortal, null, /* @__PURE__ */ React.createElement("div", { className: "modal-overlay", onClick: () => setShowFiltersModal(false) }, /* @__PURE__ */ React.createElement("div", { className: "modal-box feed-filter-modal", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "modal-title" }, "Feed Filters"), /* @__PURE__ */ React.createElement("div", { className: "modal-body feed-filter-body" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Type"), /* @__PURE__ */ React.createElement("select", { className: "form-input", value: selectedType, onChange: (e) => setSelectedType(e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "" }, "All"), /* @__PURE__ */ React.createElement("option", { value: "Announcement" }, "Announcement"), /* @__PURE__ */ React.createElement("option", { value: "Homework" }, "Homework"))), /* @__PURE__ */ React.createElement("div", { className: "feed-filter-row" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "From"), /* @__PURE__ */ React.createElement("input", { className: "form-input", type: "date", value: filterFromDate, onChange: (e) => setFilterFromDate(e.target.value) })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "To"), /* @__PURE__ */ React.createElement("input", { className: "form-input", type: "date", value: filterToDate, onChange: (e) => setFilterToDate(e.target.value) }))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Users"), /* @__PURE__ */ React.createElement("div", { className: "feed-multi-list" }, cachedUsers.map((u) => /* @__PURE__ */ React.createElement("label", { key: `fu-${u.id}` }, /* @__PURE__ */ React.createElement("input", {
      type: "checkbox", checked: filterUserIds.includes(u.id), onChange: (e) => {
        setFilterUserIds((prev) => e.target.checked ? [.../* @__PURE__ */ new Set([...prev, u.id])] : prev.filter((x) => x !== u.id));
        setAppliedUserNames((prev) => ({ ...prev, [u.id]: u.name }));
      }
    }), /* @__PURE__ */ React.createElement("span", null, u.name || `User ${u.id}`))))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Classrooms"), /* @__PURE__ */ React.createElement("div", { className: "feed-multi-list" }, cachedClassrooms.map((c) => /* @__PURE__ */ React.createElement("label", { key: `fc-${c.id}` }, /* @__PURE__ */ React.createElement("input", {
      type: "checkbox", checked: filterClassroomIds.includes(c.id), onChange: (e) => {
        setFilterClassroomIds((prev) => e.target.checked ? [.../* @__PURE__ */ new Set([...prev, c.id])] : prev.filter((x) => x !== c.id));
        setAppliedClassroomNames((prev) => ({ ...prev, [c.id]: c.name || (c.id === 0 ? "Public" : `Classroom ${c.id}`) }));
      }
    }), /* @__PURE__ */ React.createElement("span", null, c.name || (c.id === 0 ? "Public" : `Classroom ${c.id}`))))))), /* @__PURE__ */ React.createElement("div", { className: "modal-actions" }, /* @__PURE__ */ React.createElement("button", { className: "btn-secondary", onClick: resetFilters }, "Clear"), /* @__PURE__ */ React.createElement("button", { className: "btn-primary", onClick: applyFilters }, "Apply"))))), commentsPostId != null && /* @__PURE__ */ React.createElement(FeedCommentsSheet, { postId: commentsPostId, onClose: () => setCommentsPostId(null) }), likesPostId != null && /* @__PURE__ */ React.createElement(FeedPostLikesModal, { postId: likesPostId, onClose: () => setLikesPostId(null) }), viewsPostId != null && /* @__PURE__ */ React.createElement(FeedPostViewsModal, { postId: viewsPostId, onClose: () => setViewsPostId(null) }), galleryData && /* @__PURE__ */ React.createElement(GalleryViewer, { attachments: galleryData.attachments, initialIndex: galleryData.initialIndex, onClose: () => setGalleryData(null) }));
  };
  var CalendarPage = () => {
    const [currentDate, setCurrentDate] = useState(DateTime.now().startOf("month"));
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [selectedDay, setSelectedDay] = useState(DateTime.now().startOf("day"));
    const [editorOpen, setEditorOpen] = useState(false);
    const [editorForm, setEditorForm] = useState(null);
    const [terms, setTerms] = useState([]);
    const [classrooms, setClassrooms] = useState([]);
    const [loadingOptions, setLoadingOptions] = useState(false);
    const [savingEvent, setSavingEvent] = useState(false);
    const fileInputRef = useRef(null);
    const handleExport = async () => {
      try {
        const res = await api.get("/calendar/export", {
          responseType: "blob"
        });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `calendar_export_${Date.now()}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
      } catch (err) {
        alert("Failed to export calendar. Ensure you have the right permissions.");
      }
    };
    const handleImport = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!window.confirm("WARNING: Importing will DELETE ALL EXISTING ROWS in the calendar. Do you want to proceed?")) {
        e.target.value = "";
        return;
      }
      setLoading(true);
      try {
        const res = await api.post("/calendar/import", file, {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          }
        });
        alert(`Success! Imported ${res.data.inserted} rows.`);
        await loadMonth();
      } catch (err) {
        alert(err.response?.data?.message || "Failed to import calendar");
      } finally {
        setLoading(false);
        e.target.value = "";
      }
    };
    const isoDate = (d) => {
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.year}-${pad(d.day)}-${pad(d.month)}`;
    };
    const isoDateAlt = (d) => {
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.year}-${pad(d.month)}-${pad(d.day)}`;
    };
    const loadMonth = async () => {
      setLoading(true);
      try {
        const startOfMonth2 = currentDate.startOf("month");
        const endOfMonth2 = currentDate.endOf("month");
        let res = await api.get("/api/calendar/user", {
          params: { startDate: isoDate(startOfMonth2), endDate: isoDate(endOfMonth2) }
        });
        let data = Array.isArray(res.data) ? res.data : [];
        if (data.length === 0) {
          res = await api.get("/api/calendar/user", {
            params: { startDate: isoDateAlt(startOfMonth2), endDate: isoDateAlt(endOfMonth2) }
          });
          data = Array.isArray(res.data) ? res.data : [];
        }
        setEvents(data);
      } catch {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    useEffect(() => {
      const role = String(Auth.getUser()?.role || "").trim().toLowerCase();
      setIsAdmin(role === "admin");
      api.get("/api/classrooms", { params: { col: "id,name", filter: "status eq 'Current'" } }).then((classRes) => {
        const classesRaw = classRes.data?.data || classRes.data?.items || classRes.data?.results || classRes.data || [];
        const classList = (Array.isArray(classesRaw) ? classesRaw : []).map((c) => ({ id: Number(c.id || c.Id || 0), name: String(c.name || c.Name || "") })).filter((c) => !!c.id);
        setClassrooms(classList);
      }).catch(() => {
      });
    }, []);
    useEffect(() => {
      loadMonth();
    }, [currentDate.month, currentDate.year]);
    const startOfMonth = currentDate.startOf("month");
    const endOfMonth = currentDate.endOf("month");
    const startDay = startOfMonth.weekday % 7;
    const daysInMonth = endOfMonth.day;
    const today = DateTime.now().startOf("day");
    const prevMonth = () => setCurrentDate(currentDate.minus({ months: 1 }).startOf("month"));
    const nextMonth = () => setCurrentDate(currentDate.plus({ months: 1 }).startOf("month"));
    const parseEventDate = (raw) => {
      if (!raw) return null;
      const src = String(raw);
      let dt = DateTime.fromISO(src);
      if (!dt.isValid) dt = DateTime.fromRFC2822(src);
      return dt.isValid ? dt : null;
    };
    const getEventsForDay = (date) => {
      return events.filter((e) => {
        const eDate = e.Date || e.date || e.StartDate || e.startDate;
        const dt = parseEventDate(eDate);
        return dt ? dt.hasSame(date, "day") : false;
      });
    };
    const parseTimeFromApi = (raw, fallback = "08:00") => {
      const src = String(raw || "").trim();
      if (!src) return fallback;
      const timePart = src.includes("T") ? src.split("T").pop() : src;
      const hhmm = (timePart || "").slice(0, 5);
      return /^\d{2}:\d{2}$/.test(hhmm) ? hhmm : fallback;
    };
    const toHexRgb = (value) => {
      const src = String(value || "").replace("#", "").trim();
      if (src.length === 6) return `#${src.toUpperCase()}`;
      if (src.length === 8) return `#${src.slice(2).toUpperCase()}`;
      return "#50AC55";
    };
    const eventIdFrom = (eventItem) => eventItem?.Id || eventItem?.id || eventItem?.ID || null;
    const loadEditorOptions = async () => {
      setLoadingOptions(true);
      try {
        const [termsRes, classRes] = await Promise.all([
          api.get("/api/options", { params: { t: "terms" } }),
          api.get("/api/classrooms", { params: { col: "id,name", filter: "status eq 'Current'" } })
        ]);
        const termsListRaw = Array.isArray(termsRes.data) ? termsRes.data : [];
        const termsList = termsListRaw.map((x) => String(x?.Key || x?.key || "").trim()).filter(Boolean);
        setTerms(termsList);
        const classesRaw = classRes.data?.data || classRes.data?.items || classRes.data?.results || classRes.data || [];
        const classList = (Array.isArray(classesRaw) ? classesRaw : []).map((c) => ({ id: Number(c.id || c.Id || 0), name: String(c.name || c.Name || "") })).filter((c) => !!c.id);
        setClassrooms(classList);
      } catch {
        setTerms([]);
        setClassrooms([]);
      } finally {
        setLoadingOptions(false);
      }
    };
    const openEditor = async (eventItem) => {
      if (!isAdmin) return;
      const eventDate = parseEventDate(eventItem?.Date || eventItem?.date) || selectedDay;
      const id = eventIdFrom(eventItem);
      const rawClassroom = String(eventItem?.ClassroomId || "").trim();
      const weekRaw = eventItem?.Week;
      const parsedWeek = Number.isFinite(Number(weekRaw)) ? Number(weekRaw) : 0;
      setEditorForm({
        id,
        date: eventDate.toFormat("yyyy-LL-dd"),
        startTime: parseTimeFromApi(eventItem?.TimeIn, "08:00"),
        endTime: parseTimeFromApi(eventItem?.TimeOut, "09:00"),
        term: String(eventItem?.Term || "").trim(),
        week: parsedWeek,
        note: String(eventItem?.Note || ""),
        color: toHexRgb(eventItem?.Color),
        classroomId: Number(rawClassroom) || null,
        classroomNameHint: Number(rawClassroom) ? "" : rawClassroom
      });
      setEditorOpen(true);
      await loadEditorOptions();
    };
    useEffect(() => {
      if (!editorForm || classrooms.length === 0) return;
      if (editorForm.classroomId) return;
      if (!editorForm.classroomNameHint) return;
      const hit = classrooms.find((c) => c.name.trim().toLowerCase() === editorForm.classroomNameHint.trim().toLowerCase());
      if (hit) {
        setEditorForm((prev) => prev ? { ...prev, classroomId: hit.id } : prev);
      }
    }, [editorForm?.classroomNameHint, classrooms.length]);
    const closeEditor = () => {
      if (savingEvent) return;
      setEditorOpen(false);
      setEditorForm(null);
    };
    const saveEditorEvent = async () => {
      if (!editorForm?.id || savingEvent) return;
      setSavingEvent(true);
      try {
        const dateStr = editorForm.date;
        const payload = {
          Id: Number(editorForm.id) || editorForm.id,
          Date: dateStr,
          TimeIn: `${dateStr}T${editorForm.startTime}:00`,
          TimeOut: `${dateStr}T${editorForm.endTime}:00`,
          Term: editorForm.term || null,
          Week: Number(editorForm.week),
          Note: editorForm.note || "",
          ClassroomId: editorForm.classroomId || null,
          Color: toHexRgb(editorForm.color)
        };
        const res = await api.patch(`/api/calendar/user/${editorForm.id}`, payload, {
          headers: { "Content-Type": "application/json" }
        });
        if (res.status !== 200 && res.status !== 204) {
          throw new Error("Update failed.");
        }
        closeEditor();
        await loadMonth();
      } catch {
        alert("Failed to update event.");
      } finally {
        setSavingEvent(false);
      }
    };
    const deleteEditorEvent = async () => {
      if (!editorForm?.id || savingEvent) return;
      if (!window.confirm("Delete this event?")) return;
      setSavingEvent(true);
      try {
        const res = await api.delete(`/api/calendar/user/${editorForm.id}`);
        if (res.status !== 200 && res.status !== 204) {
          throw new Error("Delete failed.");
        }
        closeEditor();
        await loadMonth();
      } catch {
        alert("Failed to delete event.");
      } finally {
        setSavingEvent(false);
      }
    };
    const selectedDayStart = selectedDay.startOf("day");
    const selectedDayEvents = getEventsForDay(selectedDayStart);
    const cells = [];
    for (let i = 0; i < startDay; i++) {
      const day = startOfMonth.minus({ days: startDay - i });
      cells.push({ date: day, isOther: true });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const day = currentDate.set({ day: d });
      cells.push({ date: day, isOther: false, isToday: day.startOf("day").hasSame(today, "day") });
    }
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      cells.push({ date: endOfMonth.plus({ days: i }), isOther: true });
    }
    const formatEventTime = (eventItem) => {
      const format = (raw) => {
        const t = parseTimeFromApi(raw, "");
        if (!t) return "-";
        const [hRaw, mRaw] = t.split(":");
        const h = Number(hRaw);
        const m = Number(mRaw);
        const ampm = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 || 12;
        return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
      };
      const from = format(eventItem.TimeIn);
      const to = format(eventItem.TimeOut);
      if (from === "-" && to === "-") return "";
      return `${from} - ${to}`;
    };
    return /* @__PURE__ */ React.createElement("div", { className: "calendar-page-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "page-header calendar-toolbar" }, /* @__PURE__ */ React.createElement("div", { className: "calendar-month-nav" }, /* @__PURE__ */ React.createElement("button", { className: "btn-secondary", onClick: prevMonth }, /* @__PURE__ */ React.createElement(Icon, { name: "chevron-left", size: 16 })), /* @__PURE__ */ React.createElement("select", { className: "form-input calendar-month-select", value: currentDate.month, onChange: (e) => setCurrentDate(currentDate.set({ month: Number(e.target.value) }).startOf("month")) }, Array.from({ length: 12 }).map((_, i) => /* @__PURE__ */ React.createElement("option", { key: i + 1, value: i + 1 }, DateTime.local(2024, i + 1, 1).toFormat("MMMM")))), /* @__PURE__ */ React.createElement("select", { className: "form-input calendar-year-select", value: currentDate.year, onChange: (e) => setCurrentDate(currentDate.set({ year: Number(e.target.value) }).startOf("month")) }, Array.from({ length: 5 }).map((_, i) => {
      const y = DateTime.now().year - 2 + i;
      return /* @__PURE__ */ React.createElement("option", { key: y, value: y }, y);
    })), /* @__PURE__ */ React.createElement("button", { className: "btn-secondary", onClick: nextMonth }, /* @__PURE__ */ React.createElement(Icon, { name: "chevron-right", size: 16 }))), isAdmin && /* @__PURE__ */ React.createElement("div", { className: "calendar-admin-actions" }, /* @__PURE__ */ React.createElement("input", { type: "file", ref: fileInputRef, style: { display: "none" }, accept: ".xlsx", onChange: handleImport }), /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", onClick: () => fileInputRef.current?.click() }, /* @__PURE__ */ React.createElement(Icon, { name: "upload", size: 14 }), " Import Excel"), /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", onClick: handleExport }, /* @__PURE__ */ React.createElement(Icon, { name: "download", size: 14 }), " Download Excel"))), /* @__PURE__ */ React.createElement("div", { className: "calendar-side-by-side" }, /* @__PURE__ */ React.createElement("div", { className: "calendar-grid-panel card" }, /* @__PURE__ */ React.createElement("div", { className: "card-body", style: { padding: 0 } }, loading ? /* @__PURE__ */ React.createElement("div", { className: "loading-center" }, /* @__PURE__ */ React.createElement("div", { className: "spinner" }), "Loading calendar\u2026") : /* @__PURE__ */ React.createElement("div", { className: "calendar-grid" }, ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => /* @__PURE__ */ React.createElement("div", { key: d, className: "calendar-header-cell" }, d)), cells.map((cell, i) => {
      const dayEvents = getEventsForDay(cell.date);
      const isSelected = cell.date.startOf("day").hasSame(selectedDayStart, "day");
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: i,
          className: `calendar-cell ${cell.isOther ? "other-month" : ""} ${cell.isToday ? "today" : ""} ${isSelected ? "selected" : ""}`,
          onClick: () => setSelectedDay(cell.date.startOf("day"))
        },
        /* @__PURE__ */ React.createElement("div", { className: "calendar-day-number" }, cell.date.day),
        dayEvents.slice(0, 3).map((ev, j) => {
          const evLabel = ev.Event || ev.Term || ev.Title || ev.title || ev.Name || ev.name || "Event";
          const evWeek = ev.Week != null ? ` - Week ${ev.Week}` : "";
          const evClassroomRaw = String(ev.ClassroomId || "").trim();
          const evIsNumber = !isNaN(Number(evClassroomRaw)) && evClassroomRaw !== "";
          const evClassroomMatch = evIsNumber ? classrooms.find((c) => c.id === Number(evClassroomRaw)) : null;
          const evClassroomName = ev.ClassroomName || ev.classroomName || (evClassroomMatch ? evClassroomMatch.name : !evIsNumber && evClassroomRaw ? evClassroomRaw : null);
          return /* @__PURE__ */ React.createElement(
            "div",
            {
              key: `${i}-ev-${j}`,
              className: "calendar-event-dot",
              style: { background: toHexRgb(ev.Color || "#50AC55") }
            },
            /* @__PURE__ */ React.createElement("span", { className: "calendar-event-dot-title" }, evLabel, evWeek),
            evClassroomName && /* @__PURE__ */ React.createElement("span", { className: "calendar-event-dot-assembly" }, "[Assembly: ", evClassroomName, "]")
          );
        }),
        dayEvents.length > 3 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "0.65rem", color: "var(--color-text-light)", fontWeight: 700 } }, "+", dayEvents.length - 3, " more")
      );
    })))), /* @__PURE__ */ React.createElement("div", { className: "calendar-events-panel card" }, /* @__PURE__ */ React.createElement("div", { className: "card-body calendar-day-events" }, /* @__PURE__ */ React.createElement("div", { className: "calendar-day-events-title" }, selectedDayStart.toFormat("dd/LL/yyyy")), loading ? /* @__PURE__ */ React.createElement(TableSkeleton, { rows: 4, cols: 1 }) : selectedDayEvents.length === 0 ? /* @__PURE__ */ React.createElement("p", { className: "empty-state-msg" }, "No events for this day.") : /* @__PURE__ */ React.createElement("div", { className: "calendar-day-event-list" }, selectedDayEvents.map((e, idx) => {
      const color = toHexRgb(e.Color || "#50AC55");
      const label = (e.Event || e.Term || e.Title || e.title || e.Name || e.name || "Event").toString();
      const week = e.Week != null ? `Week ${e.Week}` : "";
      const rawClassroom = String(e.ClassroomId || "").trim();
      const isNumber = !isNaN(Number(rawClassroom)) && rawClassroom !== "";
      const classroomMatch = isNumber ? classrooms.find((c) => c.id === Number(rawClassroom)) : null;
      const classroomName = e.ClassroomName || e.classroomName || (classroomMatch ? classroomMatch.name : !isNumber && rawClassroom ? rawClassroom : null);
      const note = (e.Note || "").toString();
      const timeRange = formatEventTime(e);
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: `${eventIdFrom(e) || idx}-${idx}`,
          className: "calendar-day-event-row",
          onClick: () => openEditor(e),
          disabled: !isAdmin,
          title: isAdmin ? "Edit event" : ""
        },
        /* @__PURE__ */ React.createElement("span", { className: "calendar-day-event-color", style: { background: color } }),
        /* @__PURE__ */ React.createElement("span", { className: "calendar-day-event-main" }, /* @__PURE__ */ React.createElement("span", { className: "calendar-day-event-name" }, label, week ? ` - ${week}` : ""), classroomName && /* @__PURE__ */ React.createElement("span", { className: "calendar-day-event-assembly" }, "[Assembly: ", classroomName, "]"), timeRange && /* @__PURE__ */ React.createElement("span", { className: "calendar-day-event-time" }, timeRange), note && /* @__PURE__ */ React.createElement("span", { className: "calendar-day-event-note" }, note)),
        isAdmin && /* @__PURE__ */ React.createElement(Icon, { name: "edit-2", size: 14 })
      );
    }))))), editorOpen && editorForm && /* @__PURE__ */ React.createElement(GlobalCanvasPortal, null, /* @__PURE__ */ React.createElement("div", { className: "modal-overlay", onClick: closeEditor }, /* @__PURE__ */ React.createElement("div", { className: "modal-box calendar-event-editor-modal", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "modal-title" }, "Edit Event"), loadingOptions ? /* @__PURE__ */ React.createElement("div", { className: "calendar-editor-loading" }, /* @__PURE__ */ React.createElement("div", { className: "skeleton", style: { height: 44, borderRadius: 10 } }), /* @__PURE__ */ React.createElement("div", { className: "skeleton", style: { height: 44, borderRadius: 10 } }), /* @__PURE__ */ React.createElement("div", { className: "skeleton", style: { height: 44, borderRadius: 10 } }), /* @__PURE__ */ React.createElement("div", { className: "skeleton", style: { height: 112, borderRadius: 10 } })) : /* @__PURE__ */ React.createElement("div", { className: "calendar-editor-form" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Date"), /* @__PURE__ */ React.createElement(
      "input",
      {
        className: "form-input",
        type: "date",
        value: editorForm.date,
        onChange: (e) => setEditorForm((prev) => ({ ...prev, date: e.target.value }))
      }
    )), /* @__PURE__ */ React.createElement("div", { className: "calendar-editor-grid" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Start time"), /* @__PURE__ */ React.createElement(
      "input",
      {
        className: "form-input",
        type: "time",
        value: editorForm.startTime,
        onChange: (e) => setEditorForm((prev) => ({ ...prev, startTime: e.target.value }))
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "End time"), /* @__PURE__ */ React.createElement(
      "input",
      {
        className: "form-input",
        type: "time",
        value: editorForm.endTime,
        onChange: (e) => setEditorForm((prev) => ({ ...prev, endTime: e.target.value }))
      }
    ))), /* @__PURE__ */ React.createElement("div", { className: "calendar-editor-grid" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Term"), /* @__PURE__ */ React.createElement(
      "select",
      {
        className: "form-input",
        value: editorForm.term || "",
        onChange: (e) => setEditorForm((prev) => ({ ...prev, term: e.target.value }))
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "Select term"),
      terms.map((t) => /* @__PURE__ */ React.createElement("option", { key: t, value: t }, t))
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Week"), /* @__PURE__ */ React.createElement(
      "select",
      {
        className: "form-input",
        value: String(editorForm.week ?? 0),
        onChange: (e) => setEditorForm((prev) => ({ ...prev, week: Number(e.target.value) }))
      },
      Array.from({ length: 11 }).map((_, w) => /* @__PURE__ */ React.createElement("option", { key: `w-${w}`, value: w }, w))
    ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "School morning assembly"), /* @__PURE__ */ React.createElement(
      "select",
      {
        className: "form-input",
        value: String(editorForm.classroomId || ""),
        onChange: (e) => setEditorForm((prev) => ({ ...prev, classroomId: Number(e.target.value) || null }))
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "-"),
      classrooms.map((c) => /* @__PURE__ */ React.createElement("option", { key: `c-${c.id}`, value: c.id }, c.name || `Classroom ${c.id}`))
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Event details"), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        className: "form-input",
        rows: 4,
        value: editorForm.note || "",
        onChange: (e) => setEditorForm((prev) => ({ ...prev, note: e.target.value }))
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "form-label" }, "Highlight color"), /* @__PURE__ */ React.createElement(
      "input",
      {
        className: "form-input",
        type: "color",
        value: toHexRgb(editorForm.color),
        onChange: (e) => setEditorForm((prev) => ({ ...prev, color: e.target.value })),
        style: { height: 46, padding: 6 }
      }
    ))), /* @__PURE__ */ React.createElement("div", { className: "modal-actions" }, /* @__PURE__ */ React.createElement("button", { className: "btn-secondary", onClick: closeEditor, disabled: savingEvent }, "Close"), /* @__PURE__ */ React.createElement("button", { className: "btn-primary", onClick: saveEditorEvent, disabled: savingEvent || loadingOptions }, "Save"), /* @__PURE__ */ React.createElement("button", { className: "btn-danger", onClick: deleteEditorEvent, disabled: savingEvent || loadingOptions }, "Delete Event"))))));
  };
  var ProfilePage = ({ onLogout }) => {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [error, setError] = useState(null);
    const [showLogout, setShowLogout] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [photoUploading, setPhotoUploading] = useState(false);
    const [photoCacheBuster, setPhotoCacheBuster] = useState(Date.now());
    const photoInputRef = useRef(null);
    const loadProfile = async () => {
      setLoading(true);
      try {
        const res = await api.get("/api/users/me");
        if (res.status === 200 && res.data) {
          const profileData = res.data.data || res.data;
          setProfile(profileData);
        } else throw new Error("Failed to load profile");
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    useEffect(() => {
      loadProfile();
    }, []);
    const handleLogout = async () => {
      setLoggingOut(true);
      try {
        await api.post("/api/logout/user");
      } catch {
      }
      Auth.clear();
      setLoggingOut(false);
      setShowLogout(false);
      onLogout();
    };
    const handlePhotoUpload = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";
      setPhotoUploading(true);
      try {
        const user2 = Auth.getUser();
        const userId = profile?.Id || profile?.id || user2?.id;
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const uuid = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const blobPath = `user/${uuid}.${ext}`;
        const urlRes = await api.post("/api/getUploadUrls", [blobPath], {
          headers: { "Content-Type": "application/json" }
        });
        const urls = Array.isArray(urlRes.data) ? urlRes.data : urlRes.data?.urls || urlRes.data?.data || [];
        let sasUrl = "";
        if (urls.length > 0) {
          sasUrl = typeof urls[0] === "string" ? urls[0] : urls[0]?.url || urls[0]?.sasurl || "";
        }
        if (!sasUrl) throw new Error("Could not get upload URL");
        const claims = Auth.parseJwt(Auth.getToken()) || {};
        const headers = {
          "x-ms-blob-type": "BlockBlob",
          "Content-Type": file.type || "image/jpeg"
        };
        if (claims.n || claims.N) headers["x-ms-meta-n"] = String(claims.n || claims.N);
        const uploadRes = await fetch(sasUrl, { method: "PUT", headers, body: file });
        if (!uploadRes.ok) throw new Error("Upload failed");
        let cleanUrl;
        try {
          const parsed = new URL(sasUrl);
          cleanUrl = `${parsed.origin}${parsed.pathname}`;
        } catch {
          cleanUrl = sasUrl.split("?")[0];
        }
        await api.post("/api/updatePhoto", { id: userId, type: "user", url: cleanUrl });
        setPhotoCacheBuster(Date.now());
        await loadProfile();
      } catch (err) {
        alert("Failed to upload photo: " + (err.message || "Unknown error"));
      } finally {
        setPhotoUploading(false);
      }
    };
    const handlePhotoRemove = async () => {
      if (!window.confirm("Remove your profile photo?")) return;
      setPhotoUploading(true);
      try {
        const user2 = Auth.getUser();
        const userId = profile?.Id || profile?.id || user2?.id;
        await api.post("/api/updatePhoto", { id: userId, type: "user", url: "" });
        setPhotoCacheBuster(Date.now());
        await loadProfile();
      } catch (err) {
        alert("Failed to remove photo: " + (err.message || "Unknown error"));
      } finally {
        setPhotoUploading(false);
      }
    };
    if (loading) return /* @__PURE__ */ React.createElement("div", { className: "card" }, /* @__PURE__ */ React.createElement("div", { className: "card-body" }, /* @__PURE__ */ React.createElement(SkeletonRow, { width: "40%", height: 24 }), /* @__PURE__ */ React.createElement(SkeletonRow, { width: "60%" }), /* @__PURE__ */ React.createElement(SkeletonRow, { width: "30%" })));
    const user = Auth.getUser();
    const name = profile?.name || profile?.Name || (profile?.FirstName ? `${profile.FirstName} ${profile.LastName || ""}`.trim() : user?.name || "Teacher");
    const rawPhoto = profile?.photo || profile?.Photo || "";
    const photoBase = rawPhoto && !rawPhoto.startsWith("http") ? `${API_BASE}${rawPhoto.startsWith("/") ? "" : "/"}${rawPhoto}` : rawPhoto;
    const photo = photoBase ? `${photoBase}${photoBase.includes("?") ? "&" : "?"}v=${photoCacheBuster}` : "";
    const role = profile?.category || profile?.Category || profile?.Role || profile?.role || user?.role || "Staff";
    const fields = [
      { label: "Email", value: profile?.Email || profile?.email },
      { label: "School Email", value: profile?.SchoolEmail || profile?.schoolEmail },
      { label: "Mobile", value: profile?.Mobile || profile?.mobile },
      { label: "Gender", value: profile?.Gender || profile?.gender },
      { label: "Category", value: profile?.Category || profile?.category },
      { label: "Status", value: profile?.Status || profile?.status },
      { label: "Address", value: [profile?.Address, profile?.Suburb, profile?.State, profile?.PostalCode].filter(Boolean).join(", ") },
      { label: "Employee ID", value: profile?.EmployeeId || profile?.employeeId },
      { label: "Recruitment Date", value: profile?.RecruitmentDate ? formatDate(profile.RecruitmentDate) : null },
      { label: "Last Login", value: profile?.lastLogin ? formatDate(profile.lastLogin) : null }
    ].filter((f) => f.value);
    return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "card", style: { marginBottom: "1.5rem" } }, /* @__PURE__ */ React.createElement("div", { className: "profile-header" }, /* @__PURE__ */ React.createElement("div", { className: "profile-avatar-lg", style: { background: colorFromId(user?.id), position: "relative" } }, photo ? /* @__PURE__ */ React.createElement("img", { src: photo, alt: name }) : initialsFromName(name), photoUploading && /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" } }, /* @__PURE__ */ React.createElement("div", { className: "spinner", style: { width: 22, height: 22, borderWidth: 2, borderTopColor: "#fff" } }))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "profile-name" }, name), /* @__PURE__ */ React.createElement("span", { className: "profile-role-chip" }, role), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, marginTop: 8 } }, /* @__PURE__ */ React.createElement("input", { ref: photoInputRef, type: "file", accept: "image/*", style: { display: "none" }, onChange: handlePhotoUpload }), /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", style: { fontSize: "0.78rem", padding: "0.3rem 0.7rem", borderRadius: 8 }, onClick: () => photoInputRef.current?.click(), disabled: photoUploading }, /* @__PURE__ */ React.createElement(Icon, { name: "camera", size: 13 }), " ", photo ? "Change Photo" : "Set Photo"), photo && /* @__PURE__ */ React.createElement("button", { className: "btn btn-secondary", style: { fontSize: "0.78rem", padding: "0.3rem 0.7rem", borderRadius: 8, color: "#dc2626", borderColor: "#fca5a5" }, onClick: handlePhotoRemove, disabled: photoUploading }, /* @__PURE__ */ React.createElement(Icon, { name: "trash-2", size: 13 }), " Remove")))), fields.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "profile-details-grid" }, fields.map((f, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "profile-field" }, /* @__PURE__ */ React.createElement("span", { className: "profile-field-label" }, f.label), /* @__PURE__ */ React.createElement("span", { className: "profile-field-value" }, f.value))))), /* @__PURE__ */ React.createElement("button", { className: "btn-danger", style: { width: "auto", padding: "0.45rem 1.2rem", borderRadius: 10, fontSize: "0.82rem" }, onClick: () => setShowLogout(true) }, /* @__PURE__ */ React.createElement("span", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6 } }, /* @__PURE__ */ React.createElement(Icon, { name: "log-out", size: 15 }), " Logout")), showLogout && /* @__PURE__ */ React.createElement(GlobalCanvasPortal, null, /* @__PURE__ */ React.createElement("div", { className: "modal-overlay", onClick: () => !loggingOut && setShowLogout(false) }, /* @__PURE__ */ React.createElement("div", { className: "modal-box", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "modal-title" }, "Logout"), /* @__PURE__ */ React.createElement("div", { className: "modal-body" }, loggingOut ? /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12 } }, /* @__PURE__ */ React.createElement("div", { className: "spinner" }), "Logging out\u2026") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("p", null, "You are about to log out of this account."), /* @__PURE__ */ React.createElement("p", { style: { marginTop: 8 } }, "You will need to sign in again to use the portal."))), /* @__PURE__ */ React.createElement("div", { className: "modal-actions" }, /* @__PURE__ */ React.createElement("button", { className: "btn-secondary", disabled: loggingOut, onClick: () => setShowLogout(false) }, "Cancel"), /* @__PURE__ */ React.createElement("button", { className: "btn-danger", disabled: loggingOut, onClick: handleLogout }, loggingOut ? "Logging out\u2026" : "Logout"))))));
  };
  var pageTitles = {
    "/home": "Home",
    "/students": "Students",
    "/teachers": "Teachers",
    "/classrooms": "Classrooms",
    "/feed": "Homework & Announcements",
    "/calendar": "Calendar",
    "/profile": "My Profile"
  };
  var DashboardLayout = ({ onLogout }) => {
    const [currentUser, setCurrentUser] = useState(() => Auth.getUser());
    const route = useHashRoute();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [notifCount, setNotifCount] = useState(0);
    const [latestAttendance, setLatestAttendance] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState(null);
    const [searchLoading, setSearchLoading] = useState(false);
    const searchDebounce = useRef(null);
    useEffect(() => {
      if (route === "/" || !route) navigate("/home");
    }, [route]);
    useEffect(() => {
      (async () => {
        try {
          const res = await api.get("/api/myteacher", { params: { isHome: true } });
          if (res.data?.notificationCount) setNotifCount(res.data.notificationCount);
          if (res.data?.latestAttendance) setLatestAttendance(res.data.latestAttendance);
        } catch {
        }
      })();
    }, []);
    useEffect(() => {
      let active = true;
      (async () => {
        try {
          const res = await api.get("/api/users/me");
          const profile = res.data?.data || res.data || {};
          const jwtUser = Auth.getUser() || {};
          const firstName = profile?.FirstName || profile?.firstName || "";
          const lastName = profile?.LastName || profile?.lastName || "";
          const fullName = profile?.name || profile?.Name || `${firstName} ${lastName}`.trim();
          const rawPhoto = profile?.photo || profile?.Photo || profile?.avatar || profile?.Avatar || "";
          if (!active) return;
          setCurrentUser({
            ...jwtUser,
            name: fullName || jwtUser.name || "",
            id: profile?.Id || profile?.id || profile?.UserId || profile?.userId || jwtUser.id || "",
            role: profile?.Role || profile?.role || profile?.Category || profile?.category || jwtUser.role || "",
            category: profile?.category || profile?.Category || "",
            photoUrl: toAbsoluteAssetUrl(rawPhoto)
          });
        } catch {
          if (!active) return;
          setCurrentUser(Auth.getUser());
        }
      })();
      return () => {
        active = false;
      };
    }, []);
    const handleSearchChange = useCallback((q) => {
      setSearchQuery(q);
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
      if (!q.trim()) {
        setSearchResults(null);
        setSearchLoading(false);
        return;
      }
      setSearchLoading(true);
      searchDebounce.current = setTimeout(async () => {
        try {
          const res = await api.get("/api/search", { params: { q } });
          const data = res.data;
          const root2 = data?.data || data?.result || data?.payload || data;
          setSearchResults({
            students: root2?.students || root2?.Students || [],
            users: root2?.teachers || root2?.Teachers || [],
            classrooms: root2?.classrooms || root2?.Classrooms || []
          });
        } catch {
          setSearchResults(null);
        } finally {
          setSearchLoading(false);
        }
      }, 350);
    }, []);
    const currentTitle = pageTitles[route] || "Dashboard";
    let PageComponent;
    switch (route) {
      case "/home":
        PageComponent = /* @__PURE__ */ React.createElement(HomePage, null);
        break;
      case "/students":
        PageComponent = /* @__PURE__ */ React.createElement(StudentsPage, null);
        break;
      case "/teachers":
        PageComponent = /* @__PURE__ */ React.createElement(TeachersPage, null);
        break;
      case "/classrooms":
        PageComponent = /* @__PURE__ */ React.createElement(ClassroomsPage, null);
        break;
      case "/feed":
        PageComponent = /* @__PURE__ */ React.createElement(FeedPage, null);
        break;
      case "/calendar":
        PageComponent = /* @__PURE__ */ React.createElement(CalendarPage, null);
        break;
      case "/profile":
        PageComponent = /* @__PURE__ */ React.createElement(ProfilePage, { onLogout });
        break;
      default:
        PageComponent = /* @__PURE__ */ React.createElement(HomePage, null);
    }
    return /* @__PURE__ */ React.createElement("div", { className: "dashboard-wrapper" }, /* @__PURE__ */ React.createElement(
      Sidebar,
      {
        currentRoute: route,
        onNavigate: navigate,
        notifCount,
        sidebarOpen,
        onClose: () => setSidebarOpen(false),
        currentUser,
        latestAttendance
      }
    ), /* @__PURE__ */ React.createElement("div", { className: "main-content" }, /* @__PURE__ */ React.createElement(
      TopBar,
      {
        title: currentTitle,
        onHamburger: () => setSidebarOpen(!sidebarOpen),
        notifCount,
        onNavigate: navigate,
        searchQuery,
        onSearchChange: handleSearchChange,
        onSearchClear: () => {
          setSearchQuery("");
          setSearchResults(null);
        },
        searchResults,
        searchLoading,
        currentUser,
        showGlobalSearch: route === "/home"
      }
    ), /* @__PURE__ */ React.createElement("div", { className: "page-content", key: route }, PageComponent)));
  };
  var App = () => {
    const [loggedIn, setLoggedIn] = useState(Auth.isLoggedIn());
    const handleLoginSuccess = () => {
      setLoggedIn(true);
      navigate("/home");
    };
    const handleLogout = () => {
      Auth.clear();
      setLoggedIn(false);
      window.location.hash = "";
    };
    if (!loggedIn) {
      return /* @__PURE__ */ React.createElement(LoginPage, { onLoginSuccess: handleLoginSuccess });
    }
    return /* @__PURE__ */ React.createElement(DashboardLayout, { onLogout: handleLogout });
  };
  var root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(/* @__PURE__ */ React.createElement(App, null));
})();
