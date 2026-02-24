import { useEffect, useMemo, useRef, useState } from "react";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
const TOKEN_KEY = "nr01_token";
const USER_CACHE_KEY = "nr01_user";
const SECTION_CACHE_KEY = "nr01_section";
const DENUNCIA_TIPOS = [
  ["ASSEDIO_MORAL", "Assédio moral"],
  ["ASSEDIO_SEXUAL", "Assédio sexual"],
  ["DISCRIMINACAO", "Discriminação"],
  ["VIOLENCIA_VERBAL", "Violência verbal"],
  ["VIOLENCIA_FISICA", "Violência física"],
  ["FRAUDE", "Fraude"],
  ["CORRUPCAO", "Corrupção"],
  ["DESVIO_CONDUTA", "Desvio de conduta"],
  ["CONFLITO_INTERESSE", "Conflito de interesse"],
  ["OUTROS", "Outros"],
];

function getPublicQuestionarioToken() {
  const path = window.location.pathname || "";
  const hash = window.location.hash || "";
  const search = window.location.search || "";

  const pathMatch = path.match(/^\/questionario\/([0-9a-fA-F-]+)\/?$/);
  if (pathMatch) return pathMatch[1];

  const hashMatch = hash.match(/^#\/questionario\/([0-9a-fA-F-]+)\/?$/);
  if (hashMatch) return hashMatch[1];

  const q = new URLSearchParams(search).get("token");
  if (q && /^[0-9a-fA-F-]+$/.test(q)) return q;

  return "";
}

function getPublicCanalDenunciasToken() {
  const path = window.location.pathname || "";
  const hash = window.location.hash || "";

  const pathMatch = path.match(/^\/canal-denuncias\/([0-9a-fA-F-]+)\/?$/);
  if (pathMatch) return pathMatch[1];

  const hashMatch = hash.match(/^#\/canal-denuncias\/([0-9a-fA-F-]+)\/?$/);
  if (hashMatch) return hashMatch[1];

  return "";
}

function getPublicTotemToken() {
  const path = window.location.pathname || "";
  const hash = window.location.hash || "";

  const pathMatch = path.match(/^\/totem\/([0-9a-fA-F-]+)\/?$/);
  if (pathMatch) return pathMatch[1];

  const hashMatch = hash.match(/^#\/totem\/([0-9a-fA-F-]+)\/?$/);
  if (hashMatch) return hashMatch[1];

  return "";
}
const INIT_EMPRESA = {
  document_type: "CNPJ",
  establishment_type: "MATRIZ",
  establishment_custom_name: "",
  company_name: "",
  cnae: "",
  document_number: "",
  responsible_name: "",
  responsible_email: "",
  responsible_password: "",
  establishment_name: "",
  evaluation_type: "SETOR",
  risk_level: "",
  employee_count: "",
  postal_code: "",
  state: "",
  city: "",
  neighborhood: "",
  street: "",
  number: "",
  complement: "",
  is_active: true,
};

const I = {
  menu: <svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" /></svg>,
  col: <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>,
  dash: <svg viewBox="0 0 24 24"><path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" /></svg>,
  con: <svg viewBox="0 0 24 24"><path d="M16 11a4 4 0 100-8 4 4 0 000 8zM8 13a4 4 0 100-8 4 4 0 000 8zM8 14c-3 0-6 1.5-6 4v2h12v-2c0-2.5-3-4-6-4z" /></svg>,
  emp: <svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V7h6v14M11 21V3h8v18" /></svg>,
  cad: <svg viewBox="0 0 24 24"><path d="M4 5h16M4 12h16M4 19h16M7 5v14M17 5v14" /></svg>,
  down: <svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>,
  camp: <svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h10M4 17h16M16 10l4 2-4 2z" /></svg>,
  cmp: <svg viewBox="0 0 24 24"><path d="M4 6h7v12H4zM13 10h7v8h-7zM13 4h7v4h-7z" /></svg>,
  img: <svg viewBox="0 0 24 24"><path d="M4 6h16v12H4zM8 11l2.5 3 3.5-4 4 5M9 10h.01" /></svg>,
  tot: <svg viewBox="0 0 24 24"><path d="M9 3h6M8 6h8v15H8zM10 10h4M10 14h4M10 18h4" /></svg>,
  rpt: <svg viewBox="0 0 24 24"><path d="M7 3h8l4 4v14H7zM15 3v5h4M10 12h6M10 16h6M10 8h2" /></svg>,
  link: <svg viewBox="0 0 24 24"><path d="M10 14l4-4M7 17a4 4 0 010-6l2-2a4 4 0 016 0M17 7a4 4 0 010 6l-2 2a4 4 0 01-6 0" /></svg>,
  copy: <svg viewBox="0 0 24 24"><path d="M9 9h10v12H9zM5 3h10v12" /></svg>,
  edit: <svg viewBox="0 0 24 24"><path d="M4 20l4.5-1 9-9-3.5-3.5-9 9L4 20zM13.5 6.5l3.5 3.5M4 20h6" /></svg>,
  del: <svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>,
  power: <svg viewBox="0 0 24 24"><path d="M12 3v8M7.8 5.8a9 9 0 101.4-1.1M16.2 4.7a9 9 0 011.4 1.1" /></svg>,
};

function LoadingSpinner({ label = "Carregando..." }) {
  return (
    <div className="loading-wrap" role="status" aria-live="polite">
      <span className="loading-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export default function App() {
  const publicToken = getPublicQuestionarioToken();
  const isPublicQuestionario = Boolean(publicToken);
  const denunciaToken = getPublicCanalDenunciasToken();
  const isPublicCanalDenuncias = Boolean(denunciaToken) && !isPublicQuestionario;
  const totemPublicToken = getPublicTotemToken();
  const isPublicTotem = Boolean(totemPublicToken) && !isPublicQuestionario && !isPublicCanalDenuncias;

  function getCachedUser() {
    try {
      const raw = localStorage.getItem(USER_CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  const [email, setEmail] = useState(""), [password, setPassword] = useState(""), [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || "");
  const [user, setUser] = useState(getCachedUser()), [loading, setLoading] = useState(false), [error, setError] = useState("");
  function getCachedSection() {
    return localStorage.getItem(SECTION_CACHE_KEY) || "dashboard";
  }

  const [sideOpen, setSideOpen] = useState(false), [sideExpand, setSideExpand] = useState(true), [section, setSection] = useState(getCachedSection());
  const [sideUserMenuOpen, setSideUserMenuOpen] = useState(false);
  const [cadOpen, setCadOpen] = useState(true);
  const [dashData, setDashData] = useState(null), [dashLoad, setDashLoad] = useState(false), [dashErr, setDashErr] = useState(""), [dashEmpresa, setDashEmpresa] = useState("");
  const [cfgData, setCfgData] = useState(null), [cfgLoad, setCfgLoad] = useState(false), [cfgErr, setCfgErr] = useState(""), [cfgSaving, setCfgSaving] = useState(false);
  const [cfgForm, setCfgForm] = useState({ cnpj: "", nome_consultoria: "", responsavel_legal: "", representante_legal_relatorio: "", cidade: "", uf: "" });
  const [cfgLogoFile, setCfgLogoFile] = useState(null);
  const [cfgTecs, setCfgTecs] = useState([]), [cfgTecErr, setCfgTecErr] = useState(""), [cfgTecSaving, setCfgTecSaving] = useState(false);
  const [cfgTecForm, setCfgTecForm] = useState({ id: null, nome: "", formacao: "", registro: "" });

  const [consultores, setConsultores] = useState([]), [consErr, setConsErr] = useState(""), [consLoad, setConsLoad] = useState(false);
  const [cModal, setCModal] = useState({ type: "", item: null }), [cEmail, setCEmail] = useState(""), [cPass, setCPass] = useState(""), [cActive, setCActive] = useState(true), [cErr, setCErr] = useState(""), [cSaving, setCSaving] = useState(false);

  const [empresas, setEmpresas] = useState([]), [empErr, setEmpErr] = useState(""), [empLoad, setEmpLoad] = useState(false);
  const [empBusca, setEmpBusca] = useState(""), [empPageSize, setEmpPageSize] = useState("6"), [empPage, setEmpPage] = useState(1);
  const [eModalOpen, setEModalOpen] = useState(false), [eMode, setEMode] = useState("create"), [eStep, setEStep] = useState(1), [eForm, setEForm] = useState(INIT_EMPRESA), [eEdit, setEEdit] = useState(null), [eErr, setEErr] = useState(""), [eSaving, setESaving] = useState(false), [eInactivate, setEInactivate] = useState(null), [eActing, setEActing] = useState(false);
  const [setores, setSetores] = useState([]), [setorErr, setSetorErr] = useState(""), [setorLoad, setSetorLoad] = useState(false);
  const [sModal, setSModal] = useState({ type: "", item: null }), [sEmpresa, setSEmpresa] = useState(""), [sNome, setSNome] = useState(""), [sDesc, setSDesc] = useState(""), [sAtivo, setSAtivo] = useState(true), [sErr, setSErr] = useState(""), [sSaving, setSSaving] = useState(false);
  const [setorInativarModal, setSetorInativarModal] = useState({ item: null, saving: false, err: "" });
  const [setorEmpresaBusca, setSetorEmpresaBusca] = useState(""), [setorEmpresaFiltro, setSetorEmpresaFiltro] = useState(""), [setorPage, setSetorPage] = useState(1), [setorEmpresaMenuOpen, setSetorEmpresaMenuOpen] = useState(false);
  const [ghes, setGhes] = useState([]), [gheErr, setGheErr] = useState(""), [gheLoad, setGheLoad] = useState(false);
  const [gModal, setGModal] = useState({ type: "", item: null }), [gEmpresa, setGEmpresa] = useState(""), [gNome, setGNome] = useState(""), [gDesc, setGDesc] = useState(""), [gAtivo, setGAtivo] = useState(true), [gErr, setGErr] = useState(""), [gSaving, setGSaving] = useState(false);
  const [gheEmpresaBusca, setGheEmpresaBusca] = useState(""), [gheEmpresaFiltro, setGheEmpresaFiltro] = useState(""), [ghePage, setGhePage] = useState(1), [gheEmpresaMenuOpen, setGheEmpresaMenuOpen] = useState(false);
  const [cargos, setCargos] = useState([]), [cargoErr, setCargoErr] = useState(""), [cargoLoad, setCargoLoad] = useState(false);
  const [cgModal, setCgModal] = useState({ type: "", item: null }), [cgEmpresa, setCgEmpresa] = useState(""), [cgNome, setCgNome] = useState(""), [cgDesc, setCgDesc] = useState(""), [cgAtivo, setCgAtivo] = useState(true), [cgSetores, setCgSetores] = useState([]), [cgGhes, setCgGhes] = useState([]), [cgErr, setCgErr] = useState(""), [cgSaving, setCgSaving] = useState(false);
  const [cargoEmpresaBusca, setCargoEmpresaBusca] = useState(""), [cargoEmpresaFiltro, setCargoEmpresaFiltro] = useState(""), [cargoPage, setCargoPage] = useState(1), [cargoEmpresaMenuOpen, setCargoEmpresaMenuOpen] = useState(false);
  const [campanhas, setCampanhas] = useState([]), [campErr, setCampErr] = useState(""), [campLoad, setCampLoad] = useState(false), [campStatusLoadingId, setCampStatusLoadingId] = useState(null);
  const [cpModal, setCpModal] = useState({ type: "", item: null }), [cpEmpresa, setCpEmpresa] = useState(""), [cpTitulo, setCpTitulo] = useState(""), [cpInicio, setCpInicio] = useState(""), [cpFim, setCpFim] = useState(""), [cpStatus, setCpStatus] = useState("ATIVO"), [cpErr, setCpErr] = useState(""), [cpSaving, setCpSaving] = useState(false);
  const [campEmpresaBusca, setCampEmpresaBusca] = useState(""), [campEmpresaFiltro, setCampEmpresaFiltro] = useState(""), [campPage, setCampPage] = useState(1), [campStatusFiltro, setCampStatusFiltro] = useState("TODAS"), [campEmpresaMenuOpen, setCampEmpresaMenuOpen] = useState(false);
  const [denEmpresaBusca, setDenEmpresaBusca] = useState(""), [denEmpresaFiltro, setDenEmpresaFiltro] = useState(""), [denLinkData, setDenLinkData] = useState(null), [denLoad, setDenLoad] = useState(false), [denErr, setDenErr] = useState(""), [denEmpresaMenuOpen, setDenEmpresaMenuOpen] = useState(false);
  const [denListEmpresaBusca, setDenListEmpresaBusca] = useState(""), [denListEmpresaFiltro, setDenListEmpresaFiltro] = useState(""), [denListLoad, setDenListLoad] = useState(false), [denListErr, setDenListErr] = useState(""), [denListData, setDenListData] = useState(null), [denListStatusFiltro, setDenListStatusFiltro] = useState("TODAS"), [denListEmpresaMenuOpen, setDenListEmpresaMenuOpen] = useState(false);
  const [denHistModal, setDenHistModal] = useState(null);
  const [denUpdModal, setDenUpdModal] = useState({ item: null, text: "", saving: false, err: "" });
  const [denResolveModal, setDenResolveModal] = useState({ item: null, saving: false, err: "" });
  const [denAnalyzeModal, setDenAnalyzeModal] = useState({ item: null, saving: false, err: "" });
  const [denViewModal, setDenViewModal] = useState(null);
  const [cmpEmpresaBusca, setCmpEmpresaBusca] = useState(""), [cmpEmpresaFiltro, setCmpEmpresaFiltro] = useState(""), [cmpCamp1, setCmpCamp1] = useState(""), [cmpCamp2, setCmpCamp2] = useState(""), [cmpErr, setCmpErr] = useState(""), [cmpSubmitted, setCmpSubmitted] = useState(false), [cmpLoading, setCmpLoading] = useState(false), [cmpResult, setCmpResult] = useState(null), [cmpEmpresaMenuOpen, setCmpEmpresaMenuOpen] = useState(false);
  const [totemEmpresaBusca, setTotemEmpresaBusca] = useState(""), [totemEmpresaFiltro, setTotemEmpresaFiltro] = useState("");
  const [totemLinkData, setTotemLinkData] = useState(null), [totemLoad, setTotemLoad] = useState(false), [totemErr, setTotemErr] = useState("");
  const [linkRegenModal, setLinkRegenModal] = useState({ target: "", open: false });
  const [campRelatorio, setCampRelatorio] = useState(null), [campRelErr, setCampRelErr] = useState(""), [campRelLoad, setCampRelLoad] = useState(false);
  const [campRelCampanha, setCampRelCampanha] = useState(null), [campRelRefId, setCampRelRefId] = useState("");
  const [campMeasureDrafts, setCampMeasureDrafts] = useState({}), [campMeasureSavingKey, setCampMeasureSavingKey] = useState(""), [campWhenSavingKey, setCampWhenSavingKey] = useState(""), [campMeasureErr, setCampMeasureErr] = useState("");
  const [campAttachUploading, setCampAttachUploading] = useState(false), [campAttachErr, setCampAttachErr] = useState("");
  const [campPdfLoading, setCampPdfLoading] = useState(false), [campPdfErr, setCampPdfErr] = useState("");
  const [campReviewMonths, setCampReviewMonths] = useState("3"), [campReviewSaving, setCampReviewSaving] = useState(false);
  const [pubLoad, setPubLoad] = useState(false), [pubErr, setPubErr] = useState(""), [pubData, setPubData] = useState(null), [pubSaving, setPubSaving] = useState(false), [pubOk, setPubOk] = useState("");
  const [pubCpf, setPubCpf] = useState(""), [pubNome, setPubNome] = useState(""), [pubIdade, setPubIdade] = useState(""), [pubSexo, setPubSexo] = useState(""), [pubRef, setPubRef] = useState(""), [pubCargo, setPubCargo] = useState("");
  const [pubStep, setPubStep] = useState(1), [pubStep1Id, setPubStep1Id] = useState("");
  const [pubS2, setPubS2] = useState({ q1: "", q2: "", q3: "", q4: "", q5: "", q6: "", q7: "", q8: "" });
  const [pubS3, setPubS3] = useState({ q1: "", q2: "", q3: "", q4: "", q5: "", q6: "" });
  const [pubS4, setPubS4] = useState({ q1: "", q2: "", q3: "", q4: "", q5: "" });
  const [pubS5, setPubS5] = useState({ q1: "", q2: "", q3: "", q4: "" });
  const [pubS6, setPubS6] = useState({ q1: "", q2: "", q3: "", q4: "" });
  const [pubS7, setPubS7] = useState({ q1: "", q2: "", q3: "", q4: "", q5: "" });
  const [pubS8, setPubS8] = useState({ q1: "", q2: "", q3: "" });
  const [pubS9Comment, setPubS9Comment] = useState("");
  const [denPubLoad, setDenPubLoad] = useState(false), [denPubErr, setDenPubErr] = useState(""), [denPubData, setDenPubData] = useState(null), [denPubSaving, setDenPubSaving] = useState(false), [denPubOk, setDenPubOk] = useState("");
  const [totemPubLoad, setTotemPubLoad] = useState(false), [totemPubErr, setTotemPubErr] = useState(""), [totemPubData, setTotemPubData] = useState(null), [totemConsentAccepted, setTotemConsentAccepted] = useState(false), [totemPubActionMsg, setTotemPubActionMsg] = useState(""), [totemPubScreen, setTotemPubScreen] = useState("menu"), [totemDenSaving, setTotemDenSaving] = useState(false), [totemDenOk, setTotemDenOk] = useState(""), [totemDenErr, setTotemDenErr] = useState("");
  const [denVinculo, setDenVinculo] = useState(""), [denIdentificar, setDenIdentificar] = useState("NAO"), [denContatoIdentificacao, setDenContatoIdentificacao] = useState(""), [denGhe, setDenGhe] = useState(""), [denCargo, setDenCargo] = useState(""), [denTipo, setDenTipo] = useState(""), [denRelato, setDenRelato] = useState(""), [denTestemunhas, setDenTestemunhas] = useState(""), [denAceitaDevolutiva, setDenAceitaDevolutiva] = useState("NAO"), [denEmailDevolutiva, setDenEmailDevolutiva] = useState(""), [denArquivo, setDenArquivo] = useState(null);
  const [toasts, setToasts] = useState([]);
  const toastSeqRef = useRef(1);

  function pushToast(type, title, message = "") {
    const id = toastSeqRef.current++;
    const ttl = type === "error" ? 6500 : type === "warning" ? 5500 : 3500;
    setToasts((prev) => [...prev, { id, type, title, message, ttl }]);
    return id;
  }

  function dismissToast(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  function toastTitleForMethod(method) {
    if (method === "POST") return "Criado com sucesso";
    if (method === "PATCH" || method === "PUT") return "Atualizado com sucesso";
    if (method === "DELETE") return "Excluído com sucesso";
    return "Operação concluída";
  }

  function parseToastMessageFromBody(body) {
    if (!body) return "";
    if (typeof body === "string") return body;
    if (typeof body.detail === "string") return body.detail;
    const firstKey = Object.keys(body)[0];
    const firstVal = body[firstKey];
    if (Array.isArray(firstVal) && firstVal[0]) return String(firstVal[0]);
    if (typeof firstVal === "string") return firstVal;
    return "";
  }

  const toastViewport = (
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div key={`toast-${t.id}`} className={`toast-item ${t.type}`}>
          <div className="toast-head">
            <strong>{t.title}</strong>
            <button type="button" className="toast-close" aria-label="Fechar notificacao" onClick={() => dismissToast(t.id)}>x</button>
          </div>
          {!!t.message && <p>{t.message}</p>}
        </div>
      ))}
    </div>
  );

  useEffect(() => {
    if (!token) {
      setUser(null);
      localStorage.removeItem(USER_CACHE_KEY);
      return;
    }
    fetch(`${API}/auth/me/`, { headers: { Authorization: `Token ${token}` } })
      .then(async (r) => {
        if (!r.ok) {
          const err = new Error("Sessao invalida");
          err.status = r.status;
          throw err;
        }
        return r.json();
      })
      .then((data) => {
        setUser(data);
        localStorage.setItem(USER_CACHE_KEY, JSON.stringify(data));
      })
      .catch((err) => {
        if (err?.status === 401 || err?.status === 403) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_CACHE_KEY);
          setToken("");
          setUser(null);
        }
      });
  }, [token]);

  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map((t) => setTimeout(() => dismissToast(t.id), t.ttl || 4000));
    return () => timers.forEach((id) => clearTimeout(id));
  }, [toasts]);

  useEffect(() => {
    if (window.__nr01FetchToastPatched) return;
    const originalFetch = window.fetch.bind(window);
    window.__nr01FetchToastPatched = true;

    window.fetch = async (...args) => {
      const input = args[0];
      const init = args[1] || {};
      const url = typeof input === "string" ? input : input?.url || "";
      const method = String(init.method || (typeof Request !== "undefined" && input instanceof Request ? input.method : "GET")).toUpperCase();
      const isMutation = ["POST", "PATCH", "PUT", "DELETE"].includes(method);
      const isApiRequest = String(url).includes("/api/");

      try {
        const res = await originalFetch(...args);
        if (!res.ok && isApiRequest) {
          let message = "";
          try {
            const cloned = res.clone();
            const ctype = cloned.headers.get("content-type") || "";
            message = ctype.includes("application/json")
              ? parseToastMessageFromBody(await cloned.json())
              : (await cloned.text());
          } catch { }
          pushToast(res.status >= 500 ? "error" : "warning", res.status >= 500 ? "Erro" : "Atenção", message || `Falha na requisicao (${res.status}).`);
        } else if (res.ok && isMutation && isApiRequest) {
          pushToast("success", toastTitleForMethod(method));
        }
        return res;
      } catch (err) {
        if (isApiRequest) pushToast("error", "Erro de rede", err?.message || "Nao foi possivel concluir a requisicao.");
        throw err;
      }
    };
  }, []);

  useEffect(() => { if (user && isAdm(user) && section === "consultores") loadConsultores(); }, [user, section]);
  useEffect(() => { if (user && canEmp(user) && section === "dashboard") loadDashboardOverview(); }, [user, section]);
  useEffect(() => { if (user && canEmp(user) && section === "configuracoes") loadConsultoriaConfig(); }, [user, section]);
  useEffect(() => {
    if (user && canEmp(user) && !cfgData && !cfgLoad) loadConsultoriaConfig();
  }, [user]);
  useEffect(() => { if (user && canEmp(user) && section === "empresas") loadEmpresas(); }, [user, section]);
  useEffect(() => { if (user && canEmp(user) && section === "setor") { loadEmpresas(); loadSetores(); } }, [user, section]);
  useEffect(() => { if (user && canEmp(user) && section === "ghe") { loadEmpresas(); loadGhes(); } }, [user, section]);
  useEffect(() => { if (user && canEmp(user) && section === "cargos") { loadEmpresas(); loadSetores(); loadGhes(); loadCargos(); } }, [user, section]);
  useEffect(() => { if (user && canEmp(user) && section === "campanhas") { loadEmpresas(); loadCampanhas(); } }, [user, section]);
  useEffect(() => { if (user && canEmp(user) && section === "comparar-campanhas") { loadEmpresas(); loadCampanhas(); } }, [user, section]);
  useEffect(() => { if (user && canEmp(user) && section === "canal-denuncias") loadEmpresas(); }, [user, section]);
  useEffect(() => { if (user && canEmp(user) && section === "denuncias-empresa") loadEmpresas(); }, [user, section]);
  useEffect(() => { if (user && canEmp(user) && section === "totem") loadEmpresas(); }, [user, section]);
  useEffect(() => {
    if (!isPublicQuestionario) return;
    setPubLoad(true); setPubErr(""); setPubOk("");
    fetch(`${API}/campanhas/public/${publicToken}/`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d?.detail || "Nao foi possivel carregar o questionario.");
        setPubData(d);
        setPubStep(1);
        setPubStep1Id("");
        setPubS2({ q1: "", q2: "", q3: "", q4: "", q5: "", q6: "", q7: "", q8: "" });
        setPubS3({ q1: "", q2: "", q3: "", q4: "", q5: "", q6: "" });
        setPubS4({ q1: "", q2: "", q3: "", q4: "", q5: "" });
        setPubS5({ q1: "", q2: "", q3: "", q4: "" });
        setPubS6({ q1: "", q2: "", q3: "", q4: "" });
        setPubS7({ q1: "", q2: "", q3: "", q4: "", q5: "" });
        setPubS8({ q1: "", q2: "", q3: "" });
        setPubS9Comment("");
      })
      .catch((err) => setPubErr(err.message))
      .finally(() => setPubLoad(false));
  }, [isPublicQuestionario, publicToken]);

  useEffect(() => {
    if (!isPublicCanalDenuncias) return;
    setDenPubLoad(true); setDenPubErr(""); setDenPubOk("");
    fetch(`${API}/canal-denuncias/public/${denunciaToken}/`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d?.detail || "Nao foi possivel carregar o canal de denuncias.");
        setDenPubData(d);
        setDenVinculo("");
        setDenIdentificar("NAO");
        setDenContatoIdentificacao("");
        setDenGhe("");
        setDenCargo("");
        setDenTipo("");
        setDenRelato("");
        setDenTestemunhas("");
        setDenAceitaDevolutiva("NAO");
        setDenEmailDevolutiva("");
        setDenArquivo(null);
      })
      .catch((err) => setDenPubErr(err.message))
      .finally(() => setDenPubLoad(false));
  }, [isPublicCanalDenuncias, denunciaToken]);

  useEffect(() => {
    if (!isPublicTotem) return;
    setTotemPubLoad(true); setTotemPubErr(""); setTotemPubData(null); setTotemConsentAccepted(false); setTotemPubActionMsg(""); setTotemPubScreen("menu"); setTotemDenOk(""); setTotemDenErr("");
    setDenVinculo("");
    setDenIdentificar("NAO");
    setDenContatoIdentificacao("");
    setDenGhe("");
    setDenCargo("");
    setDenTipo("");
    setDenRelato("");
    setDenTestemunhas("");
    setDenAceitaDevolutiva("NAO");
    setDenEmailDevolutiva("");
    setDenArquivo(null);
    fetch(`${API}/totem/public/${totemPublicToken}/`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d?.detail || "Nao foi possivel carregar o totem.");
        setTotemPubData(d);
      })
      .catch((err) => setTotemPubErr(err.message))
      .finally(() => setTotemPubLoad(false));
  }, [isPublicTotem, totemPublicToken]);

  const menu = useMemo(() => {
    const m = [{ key: "dashboard", label: "Dashboard", icon: I.dash }];
    if (user && isAdm(user)) m.push({ key: "consultores", label: "Consultores", icon: I.con });
    if (user && canEmp(user)) m.push({ key: "empresas", label: "Empresas", icon: I.emp });
    if (user && canEmp(user)) m.push({ key: "campanhas", label: "Campanhas", icon: I.camp });
    if (user && canEmp(user)) m.push({ key: "comparar-campanhas", label: "Comparar campanhas", icon: I.cmp });
    if (user && canEmp(user)) m.push({ key: "canal-denuncias", label: "Canal de denuncias", icon: I.link });
    if (user && canEmp(user)) m.push({ key: "denuncias-empresa", label: "Ver denuncias", icon: I.rpt });
    return m;
  }, [user]);
  const currentPageTitle = useMemo(() => {
    if (section === "campanhas-relatorio") return "Relatorio";
    if (section === "comparar-campanhas") return "Comparar campanhas";
    if (section === "canal-denuncias") return "Canal de denuncias";
    if (section === "denuncias-empresa") return "Denuncias por empresa";
    if (section === "totem") return "Totem";
    if (section === "configuracoes") return "Configuracoes";
    if (section === "setor") return "Setor";
    if (section === "ghe") return "GHE";
    if (section === "cargos") return "Cargos";
    const found = menu.find((m) => m.key === section);
    return found?.label || "Dashboard";
  }, [menu, section]);

  function isAdm(u) { return u?.is_superuser || u?.user_type === "ADM"; }
  function canEmp(u) { return isAdm(u) || u?.user_type === "CONSULTOR"; }
  function goSection(s) { setSection(s); setSideOpen(false); setSideUserMenuOpen(false); }

  useEffect(() => {
    localStorage.setItem(SECTION_CACHE_KEY, section);
  }, [section]);

  function pErr(data) {
    if (!data || typeof data !== "object") return "Erro na requisicao.";
    const k = Object.keys(data)[0], v = data[k];
    if (Array.isArray(v) && v[0]) return String(v[0]);
    if (typeof v === "string") return v;
    return data.detail || "Erro na requisicao.";
  }

  function fDate(value) {
    if (!value) return "";
    const raw = String(value);
    const dt = raw.includes("T") ? new Date(raw) : new Date(`${raw}T00:00:00`);
    if (Number.isNaN(dt.getTime())) return value;
    if (raw.includes("T")) {
      return dt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    }
    return dt.toLocaleDateString("pt-BR");
  }

  function fmtPct(v) {
    const n = Number(v || 0);
    return `${n.toFixed(1)}%`;
  }

  function fmtScore(v) {
    const n = Number(v || 0);
    return n.toFixed(1);
  }

  function monthWindowOptions() {
    const now = new Date();
    const baseYear = now.getFullYear();
    const baseMonth = now.getMonth();
    const out = [];
    for (let i = 0; i <= 12; i += 1) {
      const d = new Date(baseYear, baseMonth + i, 1);
      out.push(`${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`);
    }
    return out;
  }

  function formatWhenRange(months) {
    const list = Array.isArray(months) ? months.filter(Boolean) : [];
    if (!list.length) return "";
    const parsed = list
      .map((m) => {
        const [mm, yyyy] = String(m).split("/");
        const month = Number(mm);
        const year = Number(yyyy);
        if (!month || !year) return null;
        return { raw: `${String(month).padStart(2, "0")}/${year}`, sort: year * 100 + month };
      })
      .filter(Boolean)
      .sort((a, b) => a.sort - b.sort);
    if (!parsed.length) return "";
    if (parsed.length === 1) return parsed[0].raw;
    return `${parsed[0].raw} - ${parsed[parsed.length - 1].raw}`;
  }

  function formatWhenMonthPt(value) {
    const [mm, yyyy] = String(value || "").split("/");
    const m = Number(mm);
    const y = Number(yyyy);
    if (!m || !y) return String(value || "");
    const labels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return `${labels[m - 1] || String(mm).padStart(2, "0")}/${y}`;
  }

  function reportZoneLabel(zone) {
    if (!zone) return "";
    return zone.label || zone.key || "";
  }

  function reportZoneClass(zone) {
    const key = String(zone?.key || "").toLowerCase();
    if (key === "green") return "green";
    if (key === "yellow") return "yellow";
    return "red";
  }

  function reportRiskText(zone) {
    const key = String(zone?.key || "").toLowerCase();
    if (key === "green") return "Risco Baixo (Zona Verde)";
    if (key === "yellow") return "Risco Moderado (Zona Amarela)";
    return "Risco Alto (Zona Vermelha)";
  }

  function reportRecommendedAction(zone) {
    const key = String(zone?.key || "").toLowerCase();
    if (key === "green") return "Manter monitoramento e boas praticas.";
    if (key === "yellow") return "Acoes corretivas recomendadas.";
    return "Acao corretiva imediata recomendada.";
  }

  function questionarioBlockName(step) {
    const key = String(step?.key || "").toLowerCase();
    const num = Number(step?.step || String(key).replace(/\D/g, ""));
    const byNum = {
      2: "Demandas",
      3: "Controle",
      4: "Apoio da Gestao",
      5: "Suporte dos Colegas",
      6: "Relacionamentos",
      7: "Clareza de Papel | Funcao",
      8: "Gerenciamento de Mudancas",
    };
    return byNum[num] || step?.label || `Bloco ${step?.step || ""}`.trim();
  }

  function cmpDiff(curr, prev) {
    const a = Number(curr || 0);
    const b = Number(prev || 0);
    return a - b;
  }

  function cmpDirection(curr, prev) {
    const d = cmpDiff(curr, prev);
    if (Math.abs(d) < 0.0001) return "same";
    return d > 0 ? "up" : "down";
  }

  function cmpStatusText(curr, prev) {
    const dir = cmpDirection(curr, prev);
    if (dir === "up") return "Melhorou";
    if (dir === "down") return "Piorou";
    return "Estavel";
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      throw new Error("Nao foi possivel copiar o link.");
    }
  }

  function onPublicRefChange(value) {
    setPubRef(value);
    setPubCargo("");
    setPubOk("");
    setPubErr("");
  }

  function publicCargoOptions() {
    if (!pubData) return [];
    if (!pubRef) return [];
    if (pubData.evaluation_type === "SETOR") return (pubData.cargos || []).filter((c) => (c.setor_ids || []).includes(Number(pubRef)));
    return (pubData.cargos || []).filter((c) => (c.ghe_ids || []).includes(Number(pubRef)));
  }

  async function submitPublicStep1(e) {
    e.preventDefault();
    setPubSaving(true); setPubErr(""); setPubOk("");
    try {
      if (!pubCpf.trim()) throw new Error("CPF e obrigatorio.");
      if (!pubIdade) throw new Error("Idade e obrigatoria.");
      if (!pubRef) throw new Error(pubData?.evaluation_type === "SETOR" ? "Selecione o setor." : "Selecione o GHE.");
      if (!pubCargo) throw new Error("Selecione o cargo.");

      const payload = {
        cpf: pubCpf,
        first_name: pubNome,
        age: Number(pubIdade),
        sex: pubSexo,
        cargo_id: Number(pubCargo),
      };
      if (pubData?.evaluation_type === "SETOR") payload.setor_id = Number(pubRef);
      else payload.ghe_id = Number(pubRef);

      const r = await fetch(`${API}/campanhas/public/${publicToken}/step1/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(pErr(d));
      setPubOk("Step 1 enviado com sucesso.");
      setPubStep1Id(String(d.response_id));
      setPubStep(2);
    } catch (err) {
      setPubErr(err.message);
    } finally {
      setPubSaving(false);
    }
  }

  async function loadDashboardOverview(empresaId = dashEmpresa) {
    if (!token) return;
    setDashLoad(true); setDashErr("");
    try {
      const qs = empresaId ? `?empresa_id=${encodeURIComponent(empresaId)}` : "";
      const r = await fetch(`${API}/dashboard/overview/${qs}`, { headers: { Authorization: `Token ${token}` } });
      const d = await r.json();
      if (!r.ok) throw new Error(pErr(d));
      setDashData(d);
    } catch (err) {
      setDashErr(err.message);
    } finally {
      setDashLoad(false);
    }
  }

  async function submitDenunciaPublica(e) {
    e.preventDefault();
    setDenPubSaving(true); setDenPubErr(""); setDenPubOk("");
    try {
      if (!denVinculo) throw new Error("Informe se voce possui vinculo com a empresa.");
      if (denIdentificar === "SIM" && !String(denContatoIdentificacao || "").trim()) throw new Error("Informe e-mail ou WhatsApp para identificacao.");
      if (!denTipo) throw new Error("Selecione o tipo da denuncia.");
      if (!denRelato.trim()) throw new Error("Descreva a denuncia.");
      if (denAceitaDevolutiva === "SIM" && !String(denEmailDevolutiva || "").trim()) throw new Error("Informe o e-mail para devolutiva.");
      if (denArquivo && denArquivo.size > 20 * 1024 * 1024) throw new Error("O arquivo excede 20MB.");
      const form = new FormData();
      form.append("possui_vinculo", denVinculo === "SIM" ? "true" : "false");
      form.append("deseja_identificar", denIdentificar === "SIM" ? "true" : "false");
      form.append("contato_identificacao", denIdentificar === "SIM" ? denContatoIdentificacao : "");
      form.append("ghe_id", denGhe || "");
      form.append("cargo_id", denCargo || "");
      form.append("tipo", denTipo || "");
      form.append("relato", denRelato);
      form.append("testemunhas", denTestemunhas || "");
      form.append("aceita_devolutiva", denAceitaDevolutiva === "SIM" ? "true" : "false");
      form.append("email_devolutiva", denAceitaDevolutiva === "SIM" ? denEmailDevolutiva : "");
      if (denArquivo) form.append("evidencia_arquivo", denArquivo);
      const r = await fetch(`${API}/canal-denuncias/public/${denunciaToken}/`, { method: "POST", body: form });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.detail || pErr(d));
      setDenPubOk("Denuncia enviada com sucesso.");
      setDenVinculo("");
      setDenIdentificar("NAO");
      setDenContatoIdentificacao("");
      setDenGhe("");
      setDenCargo("");
      setDenTipo("");
      setDenRelato("");
      setDenTestemunhas("");
      setDenAceitaDevolutiva("NAO");
      setDenEmailDevolutiva("");
      setDenArquivo(null);
      const fileInput = document.getElementById("denuncia-evidencia-file");
      if (fileInput) fileInput.value = "";
    } catch (err) {
      setDenPubErr(err.message);
    } finally {
      setDenPubSaving(false);
    }
  }

  async function submitDenunciaTotemPublica(e) {
    e.preventDefault();
    setTotemDenSaving(true); setTotemDenErr(""); setTotemDenOk("");
    try {
      if (!denVinculo) throw new Error("Informe se voce possui vinculo com a empresa.");
      if (denIdentificar === "SIM" && !String(denContatoIdentificacao || "").trim()) throw new Error("Informe e-mail ou WhatsApp para identificacao.");
      if (!denTipo) throw new Error("Selecione o tipo da denuncia.");
      if (!denRelato.trim()) throw new Error("Descreva a denuncia.");
      if (denAceitaDevolutiva === "SIM" && !String(denEmailDevolutiva || "").trim()) throw new Error("Informe o e-mail para devolutiva.");
      const payload = {
        possui_vinculo: denVinculo === "SIM",
        deseja_identificar: denIdentificar === "SIM",
        contato_identificacao: denIdentificar === "SIM" ? denContatoIdentificacao : "",
        ghe_id: denGhe || null,
        cargo_id: denCargo || null,
        tipo: denTipo || null,
        relato: denRelato,
        testemunhas: denTestemunhas || "",
        aceita_devolutiva: denAceitaDevolutiva === "SIM",
        email_devolutiva: denAceitaDevolutiva === "SIM" ? denEmailDevolutiva : "",
      };
      const r = await fetch(`${API}/totem/public/${totemPublicToken}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.detail || pErr(d));
      setTotemDenOk("Denuncia enviada com sucesso.");
      setDenVinculo("");
      setDenIdentificar("NAO");
      setDenContatoIdentificacao("");
      setDenGhe("");
      setDenCargo("");
      setDenTipo("");
      setDenRelato("");
      setDenTestemunhas("");
      setDenAceitaDevolutiva("NAO");
      setDenEmailDevolutiva("");
      setTotemPubScreen("menu");
      setTotemConsentAccepted(false);
      setTotemPubActionMsg("");
    } catch (err) {
      setTotemDenErr(err.message);
    } finally {
      setTotemDenSaving(false);
    }
  }

  async function loadConsultoriaConfig() {
    if (!token) return;
    setCfgLoad(true); setCfgErr(""); setCfgTecErr("");
    try {
      const [cfgResp, tecResp] = await Promise.all([
        fetch(`${API}/consultoria-configuracao/`, { headers: { Authorization: `Token ${token}` } }),
        fetch(`${API}/consultoria-configuracao/responsaveis-tecnicos/`, { headers: { Authorization: `Token ${token}` } }),
      ]);
      const cfgJson = await cfgResp.json();
      const tecJson = await tecResp.json();
      if (!cfgResp.ok) throw new Error(pErr(cfgJson));
      if (!tecResp.ok) throw new Error(pErr(tecJson));
      setCfgData(cfgJson);
      setCfgForm({
        cnpj: cfgJson.cnpj || "",
        nome_consultoria: cfgJson.nome_consultoria || "",
        responsavel_legal: cfgJson.responsavel_legal || "",
        representante_legal_relatorio: cfgJson.representante_legal_relatorio || "",
        cidade: cfgJson.cidade || "",
        uf: cfgJson.uf || "",
      });
      setCfgLogoFile(null);
      setCfgTecs(Array.isArray(tecJson) ? tecJson : []);
    } catch (err) {
      setCfgErr(err.message);
    } finally {
      setCfgLoad(false);
    }
  }

  async function saveConsultoriaConfig(e) {
    e.preventDefault();
    setCfgSaving(true); setCfgErr("");
    try {
      const form = new FormData();
      form.append("cnpj", cfgForm.cnpj || "");
      form.append("nome_consultoria", cfgForm.nome_consultoria || "");
      form.append("responsavel_legal", cfgForm.responsavel_legal || "");
      form.append("representante_legal_relatorio", cfgForm.representante_legal_relatorio || "");
      form.append("cidade", cfgForm.cidade || "");
      form.append("uf", cfgForm.uf || "");
      if (cfgLogoFile) form.append("logo", cfgLogoFile);
      const r = await fetch(`${API}/consultoria-configuracao/`, {
        method: "PATCH",
        headers: { Authorization: `Token ${token}` },
        body: form,
      });
      const d = await r.json();
      if (!r.ok) throw new Error(pErr(d));
      setCfgData(d);
      setCfgForm({
        cnpj: d.cnpj || "",
        nome_consultoria: d.nome_consultoria || "",
        responsavel_legal: d.responsavel_legal || "",
        representante_legal_relatorio: d.representante_legal_relatorio || "",
        cidade: d.cidade || "",
        uf: d.uf || "",
      });
      setCfgLogoFile(null);
    } catch (err) {
      setCfgErr(err.message);
    } finally {
      setCfgSaving(false);
    }
  }

  function resetCfgTecForm() {
    setCfgTecForm({ id: null, nome: "", formacao: "", registro: "" });
  }

  function editCfgTecnico(item) {
    setCfgTecErr("");
    setCfgTecForm({ id: item.id, nome: item.nome || "", formacao: item.formacao || "", registro: item.registro || "" });
  }

  async function saveCfgTecnico(e) {
    e.preventDefault();
    setCfgTecSaving(true); setCfgTecErr("");
    try {
      const isEdit = Boolean(cfgTecForm.id);
      const r = await fetch(`${API}/consultoria-configuracao/responsaveis-tecnicos/${isEdit ? `${cfgTecForm.id}/` : ""}`, {
        method: isEdit ? "PATCH" : "POST",
        headers: { Authorization: `Token ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ nome: cfgTecForm.nome, formacao: cfgTecForm.formacao, registro: cfgTecForm.registro }),
      });
      const d = isEdit ? await r.json() : await r.json();
      if (!r.ok) throw new Error(pErr(d));
      setCfgTecs((prev) => {
        if (!isEdit) return [...prev, d];
        return prev.map((x) => (x.id === d.id ? d : x));
      });
      resetCfgTecForm();
    } catch (err) {
      setCfgTecErr(err.message);
    } finally {
      setCfgTecSaving(false);
    }
  }

  async function deleteCfgTecnico(id) {
    setCfgTecErr("");
    try {
      const r = await fetch(`${API}/consultoria-configuracao/responsaveis-tecnicos/${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Token ${token}` },
      });
      if (!r.ok && r.status !== 204) {
        let d = {};
        try { d = await r.json(); } catch {}
        throw new Error(pErr(d));
      }
      setCfgTecs((prev) => prev.filter((x) => x.id !== id));
      if (cfgTecForm.id === id) resetCfgTecForm();
    } catch (err) {
      setCfgTecErr(err.message);
    }
  }

  function onDashboardEmpresaChange(value) {
    setDashEmpresa(value);
    loadDashboardOverview(value);
  }

  function setPublicStep2Answer(key, value) {
    setPubS2((prev) => ({ ...prev, [key]: value }));
  }

  function setPublicStep3Answer(key, value) {
    setPubS3((prev) => ({ ...prev, [key]: value }));
  }

  function setPublicStep4Answer(key, value) {
    setPubS4((prev) => ({ ...prev, [key]: value }));
  }

  function setPublicStep5Answer(key, value) {
    setPubS5((prev) => ({ ...prev, [key]: value }));
  }

  function setPublicStep6Answer(key, value) {
    setPubS6((prev) => ({ ...prev, [key]: value }));
  }

  function setPublicStep7Answer(key, value) {
    setPubS7((prev) => ({ ...prev, [key]: value }));
  }

  function setPublicStep8Answer(key, value) {
    setPubS8((prev) => ({ ...prev, [key]: value }));
  }

  async function submitPublicStep2(e) {
    e.preventDefault();
    setPubSaving(true); setPubErr(""); setPubOk("");
    try {
      if (!pubStep1Id) throw new Error("Step 1 nao encontrado.");
      for (const key of ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8"]) {
        if (!pubS2[key]) throw new Error("Responda todas as perguntas do Step 2.");
      }
      const payload = { step1_response_id: Number(pubStep1Id), ...pubS2 };
      const r = await fetch(`${API}/campanhas/public/${publicToken}/step2/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(pErr(d));
      setPubOk("Step 2 enviado com sucesso.");
      setPubStep(3);
    } catch (err) {
      setPubErr(err.message);
    } finally {
      setPubSaving(false);
    }
  }

  async function submitPublicStep3(e) {
    e.preventDefault();
    setPubSaving(true); setPubErr(""); setPubOk("");
    try {
      if (!pubStep1Id) throw new Error("Step 1 nao encontrado.");
      for (const key of ["q1", "q2", "q3", "q4", "q5", "q6"]) {
        if (!pubS3[key]) throw new Error("Responda todas as perguntas do Step 3.");
      }
      const payload = { step1_response_id: Number(pubStep1Id), ...pubS3 };
      const r = await fetch(`${API}/campanhas/public/${publicToken}/step3/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(pErr(d));
      setPubOk("Step 3 enviado com sucesso.");
      setPubStep(4);
    } catch (err) {
      setPubErr(err.message);
    } finally {
      setPubSaving(false);
    }
  }

  async function submitPublicStep4(e) {
    e.preventDefault();
    setPubSaving(true); setPubErr(""); setPubOk("");
    try {
      if (!pubStep1Id) throw new Error("Step 1 nao encontrado.");
      for (const key of ["q1", "q2", "q3", "q4", "q5"]) {
        if (!pubS4[key]) throw new Error("Responda todas as perguntas do Step 4.");
      }
      const payload = { step1_response_id: Number(pubStep1Id), ...pubS4 };
      const r = await fetch(`${API}/campanhas/public/${publicToken}/step4/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(pErr(d));
      setPubOk("Step 4 enviado com sucesso.");
      setPubStep(5);
    } catch (err) {
      setPubErr(err.message);
    } finally {
      setPubSaving(false);
    }
  }

  async function submitPublicStep5(e) {
    e.preventDefault();
    setPubSaving(true); setPubErr(""); setPubOk("");
    try {
      if (!pubStep1Id) throw new Error("Step 1 nao encontrado.");
      for (const key of ["q1", "q2", "q3", "q4"]) {
        if (!pubS5[key]) throw new Error("Responda todas as perguntas do Step 5.");
      }
      const payload = { step1_response_id: Number(pubStep1Id), ...pubS5 };
      const r = await fetch(`${API}/campanhas/public/${publicToken}/step5/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(pErr(d));
      setPubOk("Step 5 enviado com sucesso.");
      setPubStep(6);
    } catch (err) {
      setPubErr(err.message);
    } finally {
      setPubSaving(false);
    }
  }

  async function submitPublicStep6(e) {
    e.preventDefault();
    setPubSaving(true); setPubErr(""); setPubOk("");
    try {
      if (!pubStep1Id) throw new Error("Step 1 nao encontrado.");
      for (const key of ["q1", "q2", "q3", "q4"]) {
        if (!pubS6[key]) throw new Error("Responda todas as perguntas do Step 6.");
      }
      const payload = { step1_response_id: Number(pubStep1Id), ...pubS6 };
      const r = await fetch(`${API}/campanhas/public/${publicToken}/step6/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(pErr(d));
      setPubOk("Step 6 enviado com sucesso.");
      setPubStep(7);
    } catch (err) {
      setPubErr(err.message);
    } finally {
      setPubSaving(false);
    }
  }

  async function submitPublicStep7(e) {
    e.preventDefault();
    setPubSaving(true); setPubErr(""); setPubOk("");
    try {
      if (!pubStep1Id) throw new Error("Step 1 nao encontrado.");
      for (const key of ["q1", "q2", "q3", "q4", "q5"]) {
        if (!pubS7[key]) throw new Error("Responda todas as perguntas do Step 7.");
      }
      const payload = { step1_response_id: Number(pubStep1Id), ...pubS7 };
      const r = await fetch(`${API}/campanhas/public/${publicToken}/step7/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(pErr(d));
      setPubOk("Step 7 enviado com sucesso.");
      setPubStep(8);
    } catch (err) {
      setPubErr(err.message);
    } finally {
      setPubSaving(false);
    }
  }

  async function submitPublicStep8(e) {
    e.preventDefault();
    setPubSaving(true); setPubErr(""); setPubOk("");
    try {
      if (!pubStep1Id) throw new Error("Step 1 nao encontrado.");
      for (const key of ["q1", "q2", "q3"]) {
        if (!pubS8[key]) throw new Error("Responda todas as perguntas do Step 8.");
      }
      const payload = { step1_response_id: Number(pubStep1Id), ...pubS8 };
      const r = await fetch(`${API}/campanhas/public/${publicToken}/step8/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(pErr(d));
      setPubOk("Step 8 enviado com sucesso.");
      setPubStep(9);
    } catch (err) {
      setPubErr(err.message);
    } finally {
      setPubSaving(false);
    }
  }

  async function submitPublicStep9(e) {
    e.preventDefault();
    setPubSaving(true); setPubErr(""); setPubOk("");
    try {
      if (!pubStep1Id) throw new Error("Step 1 nao encontrado.");
      const r = await fetch(`${API}/campanhas/public/${publicToken}/step9/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step1_response_id: Number(pubStep1Id), comment: pubS9Comment }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(pErr(d));
      setPubOk("Questionario enviado com sucesso.");
      setPubStep(10);
    } catch (err) {
      setPubErr(err.message);
    } finally {
      setPubSaving(false);
    }
  }

  function restartPublicQuestionario() {
    setPubErr("");
    setPubOk("");
    setPubStep(1);
    setPubStep1Id("");
    setPubCpf("");
    setPubNome("");
    setPubIdade("");
    setPubSexo("");
    setPubRef("");
    setPubCargo("");
    setPubS2({ q1: "", q2: "", q3: "", q4: "", q5: "", q6: "", q7: "", q8: "" });
    setPubS3({ q1: "", q2: "", q3: "", q4: "", q5: "", q6: "" });
    setPubS4({ q1: "", q2: "", q3: "", q4: "", q5: "" });
    setPubS5({ q1: "", q2: "", q3: "", q4: "" });
    setPubS6({ q1: "", q2: "", q3: "", q4: "" });
    setPubS7({ q1: "", q2: "", q3: "", q4: "", q5: "" });
    setPubS8({ q1: "", q2: "", q3: "" });
    setPubS9Comment("");
  }

  async function login(e) {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const r = await fetch(`${API}/auth/login/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const d = await r.json(); if (!r.ok) throw new Error(d?.non_field_errors?.[0] || "Nao foi possivel entrar.");
      localStorage.setItem(TOKEN_KEY, d.token); localStorage.setItem(USER_CACHE_KEY, JSON.stringify(d.user)); setToken(d.token); setUser(d.user); setPassword("");
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY); setToken(""); setUser(null); setEmail(""); setPassword(""); setError("");
    localStorage.removeItem(USER_CACHE_KEY);
    setCfgData(null); setCfgLogoFile(null);
    setConsultores([]); setEmpresas([]); setCampanhas([]);
  }

  async function loadConsultores() {
    setConsLoad(true); setConsErr("");
    try {
      const r = await fetch(`${API}/consultores/`, { headers: { Authorization: `Token ${token}` } });
      if (!r.ok) throw new Error("Nao foi possivel carregar consultores.");
      setConsultores(await r.json());
    } catch (err) { setConsErr(err.message); } finally { setConsLoad(false); }
  }

  function openC(type, item = null) {
    setCModal({ type, item }); setCErr("");
    setCEmail(item?.email || ""); setCPass(""); setCActive(item?.is_active ?? true);
  }
  function closeC() { setCModal({ type: "", item: null }); setCErr(""); setCSaving(false); }

  async function saveConsultor(e) {
    e.preventDefault(); setCSaving(true); setCErr("");
    try {
      const isEdit = cModal.type === "edit" && cModal.item;
      const payload = { email: cEmail, is_active: cActive }; if (cPass) payload.password = cPass;
      if (!isEdit && !cPass) throw new Error("Senha obrigatoria.");
      const r = await fetch(isEdit ? `${API}/consultores/${cModal.item.id}/` : `${API}/consultores/`, { method: isEdit ? "PATCH" : "POST", headers: { "Content-Type": "application/json", Authorization: `Token ${token}` }, body: JSON.stringify(payload) });
      const d = await r.json(); if (!r.ok) throw new Error(pErr(d));
      setConsultores((prev) => isEdit ? prev.map((x) => x.id === d.id ? d : x) : [...prev, d]);
      closeC();
    } catch (err) { setCErr(err.message); } finally { setCSaving(false); }
  }

  async function delConsultor() {
    if (!cModal.item) return; setCSaving(true); setCErr("");
    try {
      const r = await fetch(`${API}/consultores/${cModal.item.id}/`, { method: "DELETE", headers: { Authorization: `Token ${token}` } });
      if (!r.ok) throw new Error("Nao foi possivel excluir consultor.");
      setConsultores((prev) => prev.filter((x) => x.id !== cModal.item.id)); closeC();
    } catch (err) { setCErr(err.message); } finally { setCSaving(false); }
  }

  async function loadEmpresas() {
    setEmpLoad(true); setEmpErr("");
    try {
      const r = await fetch(`${API}/empresas/`, { headers: { Authorization: `Token ${token}` } });
      if (!r.ok) throw new Error("Nao foi possivel carregar empresas.");
      setEmpresas(await r.json());
    } catch (err) { setEmpErr(err.message); } finally { setEmpLoad(false); }
  }

  async function loadSetores() {
    setSetorLoad(true); setSetorErr("");
    try {
      const r = await fetch(`${API}/setores/`, { headers: { Authorization: `Token ${token}` } });
      if (!r.ok) throw new Error("Nao foi possivel carregar setores.");
      setSetores(await r.json());
    } catch (err) { setSetorErr(err.message); } finally { setSetorLoad(false); }
  }

  function openSetor(type, item = null) {
    setSModal({ type, item }); setSErr("");
    setSEmpresa(type === "create" ? String(setorEmpresaFiltro || "") : (item?.empresa ? String(item.empresa) : ""));
    setSNome(item?.name || "");
    setSDesc(item?.description || "");
    setSAtivo(item?.is_active ?? true);
  }
  function closeSetor() { setSModal({ type: "", item: null }); setSErr(""); setSSaving(false); }

  async function saveSetor(e) {
    e.preventDefault(); setSSaving(true); setSErr("");
    try {
      if (!sEmpresa) throw new Error("Selecione a empresa.");
      if (!sNome.trim()) throw new Error("Informe o nome do setor.");
      const isEdit = sModal.type === "edit" && sModal.item;
      const payload = { empresa_id: Number(sEmpresa), name: sNome.trim(), description: sDesc, is_active: sAtivo };
      const r = await fetch(isEdit ? `${API}/setores/${sModal.item.id}/` : `${API}/setores/`, { method: isEdit ? "PATCH" : "POST", headers: { "Content-Type": "application/json", Authorization: `Token ${token}` }, body: JSON.stringify(payload) });
      const d = await r.json(); if (!r.ok) throw new Error(pErr(d));
      setSetores((prev) => isEdit ? prev.map((x) => x.id === d.id ? d : x) : [d, ...prev]);
      closeSetor();
    } catch (err) { setSErr(err.message); } finally { setSSaving(false); }
  }

  async function delSetor() {
    if (!sModal.item) return; setSSaving(true); setSErr("");
    try {
      const r = await fetch(`${API}/setores/${sModal.item.id}/`, { method: "DELETE", headers: { Authorization: `Token ${token}` } });
      if (!r.ok) throw new Error("Nao foi possivel excluir setor.");
      setSetores((prev) => prev.filter((x) => x.id !== sModal.item.id));
      closeSetor();
    } catch (err) { setSErr(err.message); } finally { setSSaving(false); }
  }

  async function toggleSetorAtivo(item, active) {
    try {
      const r = await fetch(`${API}/setores/${item.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Token ${token}` },
        body: JSON.stringify({ is_active: active }),
      });
      const d = await r.json(); if (!r.ok) throw new Error(pErr(d));
      setSetores((prev) => prev.map((x) => x.id === d.id ? d : x));
    } catch (err) { setSetorErr(err.message); throw err; }
  }

  function openSetorInativarConfirm(item) {
    setSetorInativarModal({ item, saving: false, err: "" });
  }
  function closeSetorInativarConfirm() {
    setSetorInativarModal({ item: null, saving: false, err: "" });
  }
  async function confirmSetorInativar() {
    if (!setorInativarModal.item) return;
    setSetorInativarModal((prev) => ({ ...prev, saving: true, err: "" }));
    try {
      await toggleSetorAtivo(setorInativarModal.item, false);
      closeSetorInativarConfirm();
    } catch (err) {
      setSetorInativarModal((prev) => ({ ...prev, saving: false, err: err.message || "Nao foi possivel inativar setor." }));
    }
  }

  function onSetorEmpresaBuscaChange(value) {
    setSetorEmpresaBusca(value);
    const found = empresas.find((emp) => `${emp.id} - ${emp.company_name}` === value);
    setSetorEmpresaFiltro(found ? String(found.id) : "");
  }
  function selectSetorEmpresaBuscaOption(emp) {
    setSetorEmpresaBusca(String(emp.company_name || ""));
    setSetorEmpresaFiltro(String(emp.id));
    setSetorPage(1);
    setSetorEmpresaMenuOpen(false);
  }

  async function loadGhes() {
    setGheLoad(true); setGheErr("");
    try {
      const r = await fetch(`${API}/ghes/`, { headers: { Authorization: `Token ${token}` } });
      if (!r.ok) throw new Error("Nao foi possivel carregar GHEs.");
      setGhes(await r.json());
    } catch (err) { setGheErr(err.message); } finally { setGheLoad(false); }
  }

  function openGhe(type, item = null) {
    setGModal({ type, item }); setGErr("");
    setGEmpresa(type === "create" ? String(gheEmpresaFiltro || "") : (item?.empresa ? String(item.empresa) : ""));
    setGNome(item?.name || "");
    setGDesc(item?.description || "");
    setGAtivo(item?.is_active ?? true);
  }
  function closeGhe() { setGModal({ type: "", item: null }); setGErr(""); setGSaving(false); }

  async function saveGhe(e) {
    e.preventDefault(); setGSaving(true); setGErr("");
    try {
      if (!gEmpresa) throw new Error("Selecione a empresa.");
      if (!gNome.trim()) throw new Error("Informe o nome do GHE.");
      const isEdit = gModal.type === "edit" && gModal.item;
      const payload = { empresa_id: Number(gEmpresa), name: gNome.trim(), description: gDesc, is_active: gAtivo };
      const r = await fetch(isEdit ? `${API}/ghes/${gModal.item.id}/` : `${API}/ghes/`, { method: isEdit ? "PATCH" : "POST", headers: { "Content-Type": "application/json", Authorization: `Token ${token}` }, body: JSON.stringify(payload) });
      const d = await r.json(); if (!r.ok) throw new Error(pErr(d));
      setGhes((prev) => isEdit ? prev.map((x) => x.id === d.id ? d : x) : [d, ...prev]);
      closeGhe();
    } catch (err) { setGErr(err.message); } finally { setGSaving(false); }
  }

  async function delGhe() {
    if (!gModal.item) return; setGSaving(true); setGErr("");
    try {
      const r = await fetch(`${API}/ghes/${gModal.item.id}/`, { method: "DELETE", headers: { Authorization: `Token ${token}` } });
      if (!r.ok) throw new Error("Nao foi possivel excluir GHE.");
      setGhes((prev) => prev.filter((x) => x.id !== gModal.item.id));
      closeGhe();
    } catch (err) { setGErr(err.message); } finally { setGSaving(false); }
  }

  async function toggleGheAtivo(item, active) {
    try {
      const r = await fetch(`${API}/ghes/${item.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Token ${token}` },
        body: JSON.stringify({ is_active: active }),
      });
      const d = await r.json(); if (!r.ok) throw new Error(pErr(d));
      setGhes((prev) => prev.map((x) => x.id === d.id ? d : x));
    } catch (err) { setGheErr(err.message); }
  }

  function onGheEmpresaBuscaChange(value) {
    setGheEmpresaBusca(value);
    const found = empresas.find((emp) => `${emp.id} - ${emp.company_name}` === value);
    setGheEmpresaFiltro(found ? String(found.id) : "");
  }
  function selectGheEmpresaBuscaOption(emp) {
    setGheEmpresaBusca(String(emp.company_name || ""));
    setGheEmpresaFiltro(String(emp.id));
    setGhePage(1);
    setGheEmpresaMenuOpen(false);
  }

  async function loadCargos() {
    setCargoLoad(true); setCargoErr("");
    try {
      const r = await fetch(`${API}/cargos/`, { headers: { Authorization: `Token ${token}` } });
      if (!r.ok) throw new Error("Nao foi possivel carregar cargos.");
      setCargos(await r.json());
    } catch (err) { setCargoErr(err.message); } finally { setCargoLoad(false); }
  }

  function openCargo(type, item = null) {
    setCgModal({ type, item }); setCgErr("");
    setCgEmpresa(type === "create" ? String(cargoEmpresaFiltro || "") : (item?.empresa ? String(item.empresa) : ""));
    setCgNome(item?.name || "");
    setCgDesc(item?.description || "");
    setCgAtivo(item?.is_active ?? true);
    setCgSetores((item?.setores_data || []).map((s) => s.id));
    setCgGhes((item?.ghes_data || []).map((g) => g.id));
  }
  function closeCargo() { setCgModal({ type: "", item: null }); setCgErr(""); setCgSaving(false); setCgSetores([]); setCgGhes([]); }

  async function saveCargo(e) {
    e.preventDefault(); setCgSaving(true); setCgErr("");
    try {
      if (!cgEmpresa) throw new Error("Selecione a empresa.");
      if (!cgNome.trim()) throw new Error("Informe o nome do cargo.");
      if (cgSetores.length === 0 && cgGhes.length === 0) throw new Error("Selecione ao menos 1 setor ou 1 GHE.");
      const isEdit = cgModal.type === "edit" && cgModal.item;
      const payload = { empresa_id: Number(cgEmpresa), name: cgNome.trim(), description: cgDesc, is_active: cgAtivo, setor_ids: cgSetores, ghe_ids: cgGhes };
      const r = await fetch(isEdit ? `${API}/cargos/${cgModal.item.id}/` : `${API}/cargos/`, { method: isEdit ? "PATCH" : "POST", headers: { "Content-Type": "application/json", Authorization: `Token ${token}` }, body: JSON.stringify(payload) });
      const d = await r.json(); if (!r.ok) throw new Error(pErr(d));
      setCargos((prev) => isEdit ? prev.map((x) => x.id === d.id ? d : x) : [d, ...prev]);
      closeCargo();
    } catch (err) { setCgErr(err.message); } finally { setCgSaving(false); }
  }

  async function delCargo() {
    if (!cgModal.item) return; setCgSaving(true); setCgErr("");
    try {
      const r = await fetch(`${API}/cargos/${cgModal.item.id}/`, { method: "DELETE", headers: { Authorization: `Token ${token}` } });
      if (!r.ok) throw new Error("Nao foi possivel excluir cargo.");
      setCargos((prev) => prev.filter((x) => x.id !== cgModal.item.id));
      closeCargo();
    } catch (err) { setCgErr(err.message); } finally { setCgSaving(false); }
  }

  async function toggleCargoAtivo(item, active) {
    try {
      const r = await fetch(`${API}/cargos/${item.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Token ${token}` },
        body: JSON.stringify({ is_active: active }),
      });
      const d = await r.json(); if (!r.ok) throw new Error(pErr(d));
      setCargos((prev) => prev.map((x) => x.id === d.id ? d : x));
    } catch (err) { setCargoErr(err.message); }
  }

  function onCargoEmpresaBuscaChange(value) {
    setCargoEmpresaBusca(value);
    const found = empresas.find((emp) => `${emp.id} - ${emp.company_name}` === value);
    setCargoEmpresaFiltro(found ? String(found.id) : "");
  }
  function selectCargoEmpresaBuscaOption(emp) {
    setCargoEmpresaBusca(String(emp.company_name || ""));
    setCargoEmpresaFiltro(String(emp.id));
    setCargoPage(1);
    setCargoEmpresaMenuOpen(false);
  }

  function toggleCargoSetor(id) {
    setCgSetores((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function toggleCargoGhe(id) {
    setCgGhes((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function loadCampanhas() {
    setCampLoad(true); setCampErr("");
    try {
      const r = await fetch(`${API}/campanhas/`, { headers: { Authorization: `Token ${token}` } });
      if (!r.ok) throw new Error("Nao foi possivel carregar campanhas.");
      setCampanhas(await r.json());
    } catch (err) { setCampErr(err.message); } finally { setCampLoad(false); }
  }

  async function loadCampanhaRelatorio(campanhaId, refId = "") {
    if (!campanhaId) return;
    setCampRelLoad(true); setCampRelErr("");
    try {
      const qs = refId ? `?ref_id=${encodeURIComponent(refId)}` : "";
      const r = await fetch(`${API}/campanhas/${campanhaId}/relatorio/${qs}`, { headers: { Authorization: `Token ${token}` } });
      const d = await r.json();
      if (!r.ok) throw new Error(pErr(d));
      setCampRelatorio(d);
      setCampRelRefId(d?.filters?.selected_ref_id ? String(d.filters.selected_ref_id) : "");
      setCampReviewMonths(String(d?.campaign?.review_recommendation_months ?? "3"));
    } catch (err) {
      setCampRelErr(err.message);
      setCampRelatorio(null);
    } finally {
      setCampRelLoad(false);
    }
  }

  async function openCampanhaRelatorio(item) {
    setCampRelCampanha(item);
    setCampRelatorio(null);
    setCampRelRefId("");
    setCampMeasureDrafts({});
    setCampMeasureErr("");
    setCampAttachErr("");
    setCampPdfErr("");
    setSection("campanhas-relatorio");
    await loadCampanhaRelatorio(item.id, "");
  }

  async function onCampRelatorioRefChange(value) {
    setCampRelRefId(value);
    if (!campRelCampanha) return;
    await loadCampanhaRelatorio(campRelCampanha.id, value);
  }

  function measureKey(meta) {
    return [meta.step_number, meta.question_field, meta.scope_type, meta.setor || "", meta.ghe || ""].join("|");
  }

  function openMeasureDraft(meta) {
    const key = measureKey(meta);
    setCampMeasureDrafts((prev) => ({
      ...prev,
      [key]: {
        text: "",
        whenMonths: [],
        ...(prev[key] || {}),
        open: true,
      },
    }));
  }

  function closeMeasureDraft(meta) {
    const key = measureKey(meta);
    setCampMeasureDrafts((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), open: false, whenOpen: false, text: "", whenMonths: [] } }));
  }

  function changeMeasureDraft(meta, text) {
    const key = measureKey(meta);
    setCampMeasureDrafts((prev) => ({ ...prev, [key]: { ...(prev[key] || { open: true, whenOpen: false, whenMonths: [] }), open: true, text } }));
  }

  function toggleMeasureWhen(meta, initialMonths = []) {
    const key = measureKey(meta);
    setCampMeasureDrafts((prev) => {
      const existing = prev[key] || { open: false, text: "", whenMonths: Array.isArray(initialMonths) ? initialMonths : [] };
      return { ...prev, [key]: { ...existing, whenOpen: !existing.whenOpen } };
    });
  }

  function toggleMeasureMonth(meta, monthLabel, baseMonths = []) {
    const key = measureKey(meta);
    setCampMeasureDrafts((prev) => {
      const current = prev[key] || { open: false, whenOpen: true, text: "", whenMonths: Array.isArray(baseMonths) ? baseMonths : [] };
      const arr = Array.isArray(current.whenMonths) ? current.whenMonths : [];
      const next = arr.includes(monthLabel) ? arr.filter((m) => m !== monthLabel) : [...arr, monthLabel];
      return { ...prev, [key]: { ...current, whenMonths: next } };
    });
  }

  async function addPreliminaryMeasure(meta) {
    if (!campRelCampanha?.id) return;
    const key = measureKey(meta);
    const draft = campMeasureDrafts[key];
    const text = String(draft?.text || "").trim();
    if (!text) return setCampMeasureErr("Informe a medida para salvar.");
    setCampMeasureSavingKey(key); setCampMeasureErr("");
    try {
      const payload = {
        step_number: meta.step_number,
        question_field: meta.question_field,
        scope_type: meta.scope_type,
        action_text: text,
      };
      if (meta.scope_type === "SETOR") payload.setor_id = meta.setor;
      if (meta.scope_type === "GHE") payload.ghe_id = meta.ghe;
      const r = await fetch(`${API}/campanhas/${campRelCampanha.id}/medidas-preliminares/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Token ${token}` },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(pErr(d));
      setCampRelatorio((prev) => prev ? ({ ...prev, preliminary_measures: [...(prev.preliminary_measures || []), d] }) : prev);
      closeMeasureDraft(meta);
    } catch (err) {
      setCampMeasureErr(err.message);
    } finally {
      setCampMeasureSavingKey("");
    }
  }

  async function deletePreliminaryMeasure(measureId) {
    if (!campRelCampanha?.id || !measureId) return;
    setCampMeasureErr("");
    try {
      const r = await fetch(`${API}/campanhas/${campRelCampanha.id}/medidas-preliminares/${measureId}/`, {
        method: "DELETE",
        headers: { Authorization: `Token ${token}` },
      });
      if (!r.ok) throw new Error("Nao foi possivel excluir a medida.");
      setCampRelatorio((prev) => prev ? ({ ...prev, preliminary_measures: (prev.preliminary_measures || []).filter((m) => m.id !== measureId) }) : prev);
    } catch (err) {
      setCampMeasureErr(err.message);
    }
  }

  async function savePreliminaryWhen(meta) {
    if (!campRelCampanha?.id) return;
    const key = measureKey(meta);
    const draft = campMeasureDrafts[key] || {};
    const months = Array.isArray(draft.whenMonths) ? draft.whenMonths : [];
    setCampWhenSavingKey(key); setCampMeasureErr("");
    try {
      const payload = {
        step_number: meta.step_number,
        question_field: meta.question_field,
        scope_type: meta.scope_type,
        when_months: months,
      };
      if (meta.scope_type === "SETOR") payload.setor_id = meta.setor;
      if (meta.scope_type === "GHE") payload.ghe_id = meta.ghe;
      const r = await fetch(`${API}/campanhas/${campRelCampanha.id}/quandos-preliminares/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Token ${token}` },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(pErr(d));
      setCampRelatorio((prev) => {
        if (!prev) return prev;
        const list = [...(prev.preliminary_whens || [])];
        const idx = list.findIndex((x) => x.id === d.id);
        if (idx >= 0) list[idx] = d;
        else list.push(d);
        return { ...prev, preliminary_whens: list };
      });
      setCampMeasureDrafts((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), whenOpen: false } }));
    } catch (err) {
      setCampMeasureErr(err.message);
    } finally {
      setCampWhenSavingKey("");
    }
  }

  async function deletePreliminaryWhen(whenId) {
    if (!campRelCampanha?.id || !whenId) return;
    setCampMeasureErr("");
    try {
      const r = await fetch(`${API}/campanhas/${campRelCampanha.id}/quandos-preliminares/${whenId}/`, {
        method: "DELETE",
        headers: { Authorization: `Token ${token}` },
      });
      if (!r.ok) throw new Error("Nao foi possivel remover o quando.");
      setCampRelatorio((prev) => prev ? ({ ...prev, preliminary_whens: (prev.preliminary_whens || []).filter((w) => w.id !== whenId) }) : prev);
    } catch (err) {
      setCampMeasureErr(err.message);
    }
  }

  async function uploadRelatorioAnexo(file) {
    if (!campRelCampanha?.id || !file) return;
    setCampAttachUploading(true); setCampAttachErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`${API}/campanhas/${campRelCampanha.id}/relatorio-anexos/`, {
        method: "POST",
        headers: { Authorization: `Token ${token}` },
        body: fd,
      });
      const d = await r.json();
      if (!r.ok) throw new Error(pErr(d));
      setCampRelatorio((prev) => prev ? ({ ...prev, attachments: [d, ...(prev.attachments || [])] }) : prev);
    } catch (err) {
      setCampAttachErr(err.message);
    } finally {
      setCampAttachUploading(false);
    }
  }

  async function deleteRelatorioAnexo(anexoId) {
    if (!campRelCampanha?.id) return;
    setCampAttachErr("");
    try {
      const r = await fetch(`${API}/campanhas/${campRelCampanha.id}/relatorio-anexos/${anexoId}/`, {
        method: "DELETE",
        headers: { Authorization: `Token ${token}` },
      });
      if (!r.ok) throw new Error("Nao foi possivel excluir o anexo.");
      setCampRelatorio((prev) => prev ? ({ ...prev, attachments: (prev.attachments || []).filter((a) => a.id !== anexoId) }) : prev);
    } catch (err) {
      setCampAttachErr(err.message);
    }
  }

  async function exportCampanhaRelatorioPdf() {
    if (!campRelCampanha?.id) return;
    setCampPdfLoading(true); setCampPdfErr("");
    try {
      const r = await fetch(`${API}/campanhas/${campRelCampanha.id}/relatorio/pdf/`, {
        headers: { Authorization: `Token ${token}` },
      });
      if (!r.ok) {
        let msg = "Nao foi possivel exportar o PDF.";
        try {
          const d = await r.json();
          msg = pErr(d);
        } catch {}
        throw new Error(msg);
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio-campanha-${campRelCampanha.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setCampPdfErr(err.message);
    } finally {
      setCampPdfLoading(false);
    }
  }

  async function saveCampanhaReviewMonths() {
    if (!campRelCampanha?.id) return;
    const months = Number(campReviewMonths);
    if (!Number.isInteger(months) || months < 1 || months > 60) {
      setCampMeasureErr("Informe entre 1 e 60 meses para reavaliacao.");
      return;
    }
    setCampReviewSaving(true); setCampMeasureErr("");
    try {
      const r = await fetch(`${API}/campanhas/${campRelCampanha.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Token ${token}` },
        body: JSON.stringify({ review_recommendation_months: months }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(pErr(d));
      setCampRelatorio((prev) => prev ? ({ ...prev, campaign: { ...(prev.campaign || {}), review_recommendation_months: d.review_recommendation_months } }) : prev);
      setCampanhas((prev) => prev.map((x) => x.id === d.id ? d : x));
    } catch (err) {
      setCampMeasureErr(err.message);
    } finally {
      setCampReviewSaving(false);
    }
  }

  function openCampanha(type, item = null) {
    setCpModal({ type, item }); setCpErr("");
    setCpEmpresa(type === "create" ? String(campEmpresaFiltro || "") : (item?.empresa ? String(item.empresa) : ""));
    setCpTitulo(item?.title || "");
    setCpInicio(item?.start_date || "");
    setCpFim(item?.end_date || "");
    setCpStatus(item?.status || "ATIVO");
  }

  function closeCampanha() {
    setCpModal({ type: "", item: null }); setCpErr(""); setCpSaving(false);
    setCpEmpresa(""); setCpTitulo(""); setCpInicio(""); setCpFim(""); setCpStatus("ATIVO");
  }

  async function saveCampanha(e) {
    e.preventDefault(); setCpSaving(true); setCpErr("");
    try {
      if (!cpEmpresa) throw new Error("Selecione a empresa.");
      if (!cpTitulo.trim()) throw new Error("Informe o titulo da campanha.");
      if (!cpInicio) throw new Error("Informe a data de inicio.");
      if (!cpFim) throw new Error("Informe a data de fim.");
      const isEdit = cpModal.type === "edit" && cpModal.item;
      const payload = {
        empresa_id: Number(cpEmpresa),
        title: cpTitulo.trim(),
        start_date: cpInicio,
        end_date: cpFim,
        status: cpStatus,
      };
      const r = await fetch(isEdit ? `${API}/campanhas/${cpModal.item.id}/` : `${API}/campanhas/`, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Token ${token}` },
        body: JSON.stringify(payload),
      });
      const d = await r.json(); if (!r.ok) throw new Error(pErr(d));
      setCampanhas((prev) => isEdit ? prev.map((x) => x.id === d.id ? d : x) : [d, ...prev]);
      closeCampanha();
    } catch (err) { setCpErr(err.message); } finally { setCpSaving(false); }
  }

  async function delCampanha() {
    if (!cpModal.item) return; setCpSaving(true); setCpErr("");
    try {
      const r = await fetch(`${API}/campanhas/${cpModal.item.id}/`, { method: "DELETE", headers: { Authorization: `Token ${token}` } });
      if (!r.ok) throw new Error("Nao foi possivel excluir campanha.");
      setCampanhas((prev) => prev.filter((x) => x.id !== cpModal.item.id));
      closeCampanha();
    } catch (err) { setCpErr(err.message); } finally { setCpSaving(false); }
  }

  async function toggleCampanhaStatus(item) {
    if (campStatusLoadingId === item.id) return;
    try {
      setCampStatusLoadingId(item.id);
      const nextStatus = item.status === "ATIVO" ? "ENCERRADO" : "ATIVO";
      const r = await fetch(`${API}/campanhas/${item.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Token ${token}` },
        body: JSON.stringify({ status: nextStatus }),
      });
      const d = await r.json(); if (!r.ok) throw new Error(pErr(d));
      setCampanhas((prev) => prev.map((x) => x.id === d.id ? d : x));
    } catch (err) { setCampErr(err.message); }
    finally { setCampStatusLoadingId(null); }
  }

  function onCampEmpresaBuscaChange(value) {
    setCampEmpresaBusca(value);
    const found = empresas.find((emp) => `${emp.id} - ${emp.company_name}` === value);
    setCampEmpresaFiltro(found ? String(found.id) : "");
    setCampPage(1);
  }
  function selectCampEmpresaBuscaOption(emp) {
    setCampEmpresaBusca(String(emp.company_name || ""));
    setCampEmpresaFiltro(String(emp.id));
    setCampPage(1);
    setCampEmpresaMenuOpen(false);
  }

  function onCmpEmpresaBuscaChange(value) {
    setCmpEmpresaBusca(value);
    const found = empresas.find((emp) => `${emp.id} - ${emp.company_name}` === value);
    const nextEmpresa = found ? String(found.id) : "";
    setCmpEmpresaFiltro(nextEmpresa);
    setCmpCamp1("");
    setCmpCamp2("");
    setCmpErr("");
    setCmpSubmitted(false);
    setCmpResult(null);
  }
  function selectCmpEmpresaBuscaOption(emp) {
    setCmpEmpresaBusca(String(emp.company_name || ""));
    setCmpEmpresaFiltro(String(emp.id));
    setCmpCamp1("");
    setCmpCamp2("");
    setCmpErr("");
    setCmpSubmitted(false);
    setCmpResult(null);
    setCmpEmpresaMenuOpen(false);
  }

  function onDenEmpresaBuscaChange(value) {
    setDenEmpresaBusca(value);
    const found = empresas.find((emp) => `${emp.id} - ${emp.company_name}` === value);
    setDenEmpresaFiltro(found ? String(found.id) : "");
    setDenLinkData(null);
    setDenErr("");
  }
  function selectDenEmpresaBuscaOption(emp) {
    setDenEmpresaBusca(String(emp.company_name || ""));
    setDenEmpresaFiltro(String(emp.id));
    setDenLinkData(null);
    setDenErr("");
    setDenEmpresaMenuOpen(false);
  }

  async function loadOrGenerateDenunciaLink(regenerate = false) {
    if (!denEmpresaFiltro) return setDenErr("Selecione uma empresa.");
    setDenLoad(true); setDenErr("");
    try {
      const r = await fetch(`${API}/empresas/${denEmpresaFiltro}/canal-denuncias-link/`, {
        method: regenerate ? "POST" : "GET",
        headers: regenerate ? { Authorization: `Token ${token}`, "Content-Type": "application/json" } : { Authorization: `Token ${token}` },
        body: regenerate ? JSON.stringify({ regenerate: true }) : undefined,
      });
      const d = await r.json();
      if (!r.ok) throw new Error(pErr(d));
      setDenLinkData(d);
    } catch (err) {
      setDenErr(err.message);
    } finally {
      setDenLoad(false);
    }
  }

  function onDenListEmpresaBuscaChange(value) {
    setDenListEmpresaBusca(value);
    const found = empresas.find((emp) => `${emp.id} - ${emp.company_name}` === value);
    setDenListEmpresaFiltro(found ? String(found.id) : "");
    setDenListData(null);
    setDenListErr("");
    setDenListStatusFiltro("TODAS");
  }
  function selectDenListEmpresaBuscaOption(emp) {
    setDenListEmpresaBusca(String(emp.company_name || ""));
    setDenListEmpresaFiltro(String(emp.id));
    setDenListData(null);
    setDenListErr("");
    setDenListStatusFiltro("TODAS");
    setDenListEmpresaMenuOpen(false);
  }

  function onTotemEmpresaBuscaChange(value) {
    setTotemEmpresaBusca(value);
    const found = empresas.find((emp) => `${emp.id} - ${emp.company_name}` === value);
    setTotemEmpresaFiltro(found ? String(found.id) : "");
    setTotemLinkData(null);
    setTotemErr("");
  }

  async function loadOrGenerateTotemLink(regenerate = false) {
    if (!totemEmpresaFiltro) return setTotemErr("Selecione uma empresa.");
    setTotemLoad(true); setTotemErr("");
    try {
      const r = await fetch(`${API}/empresas/${totemEmpresaFiltro}/totem-link/`, {
        method: regenerate ? "POST" : "GET",
        headers: regenerate ? { Authorization: `Token ${token}`, "Content-Type": "application/json" } : { Authorization: `Token ${token}` },
        body: regenerate ? JSON.stringify({ regenerate: true }) : undefined,
      });
      const d = await r.json();
      if (!r.ok) throw new Error(pErr(d));
      setTotemLinkData(d);
    } catch (err) {
      setTotemErr(err.message);
    } finally {
      setTotemLoad(false);
    }
  }

  function openRegenerateLinkConfirm(target) {
    setLinkRegenModal({ target, open: true });
  }

  function closeRegenerateLinkConfirm() {
    setLinkRegenModal({ target: "", open: false });
  }

  async function confirmRegenerateLink() {
    const target = linkRegenModal.target;
    closeRegenerateLinkConfirm();
    if (target === "denuncia") await loadOrGenerateDenunciaLink(true);
    if (target === "totem") await loadOrGenerateTotemLink(true);
  }

  async function loadDenunciasEmpresa() {
    if (!denListEmpresaFiltro) return setDenListErr("Selecione uma empresa.");
    setDenListLoad(true); setDenListErr("");
    try {
      const r = await fetch(`${API}/empresas/${denListEmpresaFiltro}/canal-denuncias/`, { headers: { Authorization: `Token ${token}` } });
      const d = await r.json();
      if (!r.ok) throw new Error(pErr(d));
      setDenListData(d);
    } catch (err) {
      setDenListErr(err.message);
    } finally {
      setDenListLoad(false);
    }
  }

  async function updateDenunciaStatus(denunciaId, statusValue) {
    if (!denListEmpresaFiltro) return;
    setDenListErr("");
    try {
      const r = await fetch(`${API}/empresas/${denListEmpresaFiltro}/canal-denuncias/${denunciaId}/`, {
        method: "PATCH",
        headers: { Authorization: `Token ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusValue }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(pErr(d));
      setDenListData((prev) => prev ? ({ ...prev, results: (prev.results || []).map((x) => x.id === d.id ? d : x) }) : prev);
    } catch (err) {
      setDenListErr(err.message);
      throw err;
    }
  }

  function openResolveDenunciaModal(item) {
    setDenResolveModal({ item, saving: false, err: "" });
  }

  function closeResolveDenunciaModal() {
    setDenResolveModal({ item: null, saving: false, err: "" });
  }

  async function confirmResolveDenuncia() {
    if (!denResolveModal.item?.id) return;
    setDenResolveModal((p) => ({ ...p, saving: true, err: "" }));
    try {
      await updateDenunciaStatus(denResolveModal.item.id, "RESOLVIDA");
      closeResolveDenunciaModal();
    } catch (err) {
      setDenResolveModal((p) => ({ ...p, saving: false, err: err.message || "Nao foi possivel marcar como resolvida." }));
    }
  }

  function openAnalyzeDenunciaModal(item) {
    setDenAnalyzeModal({ item, saving: false, err: "" });
  }

  function closeAnalyzeDenunciaModal() {
    setDenAnalyzeModal({ item: null, saving: false, err: "" });
  }

  async function confirmAnalyzeDenuncia() {
    if (!denAnalyzeModal.item?.id) return;
    setDenAnalyzeModal((p) => ({ ...p, saving: true, err: "" }));
    try {
      await updateDenunciaStatus(denAnalyzeModal.item.id, "EM_ANALISE");
      closeAnalyzeDenunciaModal();
    } catch (err) {
      setDenAnalyzeModal((p) => ({ ...p, saving: false, err: err.message || "Nao foi possivel marcar em analise." }));
    }
  }

  function openDenunciaAtualizacaoModal(item) {
    setDenUpdModal({ item, text: "", saving: false, err: "" });
  }

  function closeDenunciaAtualizacaoModal() {
    setDenUpdModal({ item: null, text: "", saving: false, err: "" });
  }

  async function addDenunciaAtualizacao(denunciaId, texto) {
    if (!denListEmpresaFiltro) return;
    if (!String(texto || "").trim()) return;
    setDenListErr("");
    try {
      const r = await fetch(`${API}/empresas/${denListEmpresaFiltro}/canal-denuncias/${denunciaId}/atualizacoes/`, {
        method: "POST",
        headers: { Authorization: `Token ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(pErr(d));
      setDenListData((prev) => prev ? ({ ...prev, results: (prev.results || []).map((x) => x.id === d.id ? d : x) }) : prev);
    } catch (err) {
      setDenListErr(err.message);
      throw err;
    }
  }

  async function submitDenunciaAtualizacaoModal(e) {
    e.preventDefault();
    if (!denUpdModal.item?.id) return;
    const text = String(denUpdModal.text || "").trim();
    if (!text) return setDenUpdModal((p) => ({ ...p, err: "Digite a atualizacao." }));
    setDenUpdModal((p) => ({ ...p, saving: true, err: "" }));
    try {
      await addDenunciaAtualizacao(denUpdModal.item.id, text);
      closeDenunciaAtualizacaoModal();
    } catch (err) {
      setDenUpdModal((p) => ({ ...p, saving: false, err: err.message || "Erro ao salvar atualizacao." }));
    }
  }

  async function submitCompararCampanhas(e) {
    e.preventDefault();
    setCmpErr("");
    setCmpSubmitted(false);
    setCmpResult(null);
    if (!cmpEmpresaFiltro) return setCmpErr("Selecione uma empresa.");
    if (!cmpCamp1 || !cmpCamp2) return setCmpErr("Selecione duas campanhas para comparar.");
    if (String(cmpCamp1) === String(cmpCamp2)) return setCmpErr("Selecione campanhas diferentes.");
    setCmpLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch(`${API}/campanhas/${cmpCamp1}/relatorio/`, { headers: { Authorization: `Token ${token}` } }),
        fetch(`${API}/campanhas/${cmpCamp2}/relatorio/`, { headers: { Authorization: `Token ${token}` } }),
      ]);
      const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
      if (!r1.ok) throw new Error(pErr(d1));
      if (!r2.ok) throw new Error(pErr(d2));
      setCmpResult({ left: d1, right: d2 });
      setCmpSubmitted(true);
    } catch (err) {
      setCmpErr(err.message);
    } finally {
      setCmpLoading(false);
    }
  }

  function openEmpresaCreate() { setEMode("create"); setEEdit(null); setEForm(INIT_EMPRESA); setEStep(1); setEErr(""); setEModalOpen(true); }
  function openEmpresaEdit(x) {
    setEMode("edit"); setEEdit(x); setEStep(1); setEErr(""); setEModalOpen(true);
    setEForm({ ...INIT_EMPRESA, document_type: x.document_type, establishment_type: x.establishment_type, establishment_custom_name: x.establishment_custom_name || "", company_name: x.company_name || "", cnae: x.cnae || "", document_number: x.document_number || "", responsible_name: x.responsible_name || "", responsible_email: x.responsible_user_email || "", responsible_password: "", establishment_name: x.establishment_name || "", evaluation_type: x.evaluation_type || "SETOR", risk_level: x.risk_level || "", employee_count: String(x.employee_count ?? ""), postal_code: x.postal_code || "", state: x.state || "", city: x.city || "", neighborhood: x.neighborhood || "", street: x.street || "", number: x.number || "", complement: x.complement || "", is_active: Boolean(x.is_active) });
  }
  function closeEmpresa() { setEModalOpen(false); setEEdit(null); setEErr(""); setESaving(false); setEInactivate(null); setEActing(false); setEForm(INIT_EMPRESA); }
  function eChange(k, v) { setEForm((p) => ({ ...p, [k]: v })); }

  function checkStep(s) {
    if (s === 1 && !eForm.document_type) return "Selecione CPF ou CNPJ.";
    if (s === 2 && !eForm.establishment_type) return "Selecione o tipo do estabelecimento.";
    if (s === 3) {
      const req = [["company_name", "Nome da empresa"], ["document_number", eForm.document_type], ["responsible_name", "Nome do responsavel"], ["responsible_email", "E-mail do responsavel"], ["establishment_name", "Nome do estabelecimento"], ["evaluation_type", "Tipo de avaliacao"], ["risk_level", "Grau de risco"], ["employee_count", "Numero de funcionarios"], ["postal_code", "CEP"], ["state", "UF"], ["city", "Cidade"], ["neighborhood", "Bairro"], ["street", "Rua"], ["number", "Numero"]];
      for (const [k, l] of req) if (!String(eForm[k] || "").trim()) return `Preencha: ${l}.`;
      if (eMode === "create" && !eForm.responsible_password.trim()) return "Senha do responsavel e obrigatoria.";
    }
    return "";
  }

  function nextStep(ev) {
    if (ev) {
      ev.preventDefault();
      ev.stopPropagation();
    }
    const m = checkStep(eStep);
    if (m) return setEErr(m);
    setEErr("");
    setEStep((s) => Math.min(3, s + 1));
  }
  function prevStep(ev) {
    if (ev) {
      ev.preventDefault();
      ev.stopPropagation();
    }
    setEErr("");
    setEStep((s) => Math.max(1, s - 1));
  }

  async function saveEmpresa(e) {
    e.preventDefault(); const msg = checkStep(3); if (msg) return setEErr(msg);
    setESaving(true); setEErr("");
    const p = { document_type: eForm.document_type, document_number: eForm.document_number, company_name: eForm.company_name, cnae: eForm.cnae, establishment_type: eForm.establishment_type, establishment_custom_name: eForm.establishment_custom_name, establishment_name: eForm.establishment_name, evaluation_type: eForm.evaluation_type, responsible_name: eForm.responsible_name, responsible_email: eForm.responsible_email, risk_level: eForm.risk_level, employee_count: Number(eForm.employee_count || 0), postal_code: eForm.postal_code, state: eForm.state, city: eForm.city, neighborhood: eForm.neighborhood, street: eForm.street, number: eForm.number, complement: eForm.complement, is_active: eForm.is_active };
    if (eForm.responsible_password.trim()) p.responsible_password = eForm.responsible_password.trim();
    try {
      const isEdit = eMode === "edit" && eEdit;
      const r = await fetch(isEdit ? `${API}/empresas/${eEdit.id}/` : `${API}/empresas/`, { method: isEdit ? "PATCH" : "POST", headers: { "Content-Type": "application/json", Authorization: `Token ${token}` }, body: JSON.stringify(p) });
      const d = await r.json(); if (!r.ok) throw new Error(pErr(d));
      setEmpresas((prev) => isEdit ? prev.map((x) => x.id === d.id ? d : x) : [d, ...prev]); closeEmpresa();
    } catch (err) { setEErr(err.message); } finally { setESaving(false); }
  }

  async function inativarEmpresa() {
    if (!eInactivate) return; setEActing(true); setEErr("");
    try {
      const r = await fetch(`${API}/empresas/${eInactivate.id}/inativar/`, { method: "POST", headers: { Authorization: `Token ${token}` } });
      const d = await r.json(); if (!r.ok) throw new Error(pErr(d));
      setEmpresas((prev) => prev.map((x) => x.id === d.id ? d : x)); setEInactivate(null);
    } catch (err) { setEErr(err.message); } finally { setEActing(false); }
  }

  async function reativarEmpresa(x) {
    try {
      const r = await fetch(`${API}/empresas/${x.id}/`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Token ${token}` }, body: JSON.stringify({ is_active: true, responsible_email: x.responsible_user_email }) });
      const d = await r.json(); if (!r.ok) throw new Error(pErr(d));
      setEmpresas((prev) => prev.map((i) => i.id === d.id ? d : i));
    } catch (err) { setEmpErr(err.message); }
  }

  function empresaInitials(name) {
    const n = String(name || "").trim();
    if (!n) return "EM";
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }

  function renderContent() {
    if (section === "dashboard") {
      const cards = dashData?.summary_cards || [];
      const domains = dashData?.domain_distribution || [];
      const histLabels = dashData?.history?.labels || [];
      const histValues = dashData?.history?.values || [];
      const maxHist = Math.max(1, ...histValues.map((v) => Number(v || 0)));
      return (
        <section className="dashboard-analytics">
          <div className="dashboard-hero">
            <div>
              <h2>Panorama geral</h2>
            </div>
            {canEmp(user) && (
              <div className="dashboard-hero-filter">
                <label>Empresa</label>
                <select value={dashEmpresa} onChange={(e) => onDashboardEmpresaChange(e.target.value)}>
                  <option value="">Todas as empresas</option>
                  {(dashData?.empresas || []).map((emp) => <option key={`dash-emp-${emp.id}`} value={String(emp.id)}>{emp.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {dashLoad && <LoadingSpinner label="Carregando dashboard..." />}
          {dashErr && <p className="error">{dashErr}</p>}

          {!dashLoad && (
            <>
              <div className="dash-cards">
                {cards.map((card) => (
                  <article key={`dash-card-${card.key}`} className={`dash-card ${card.color || "blue"}`}>
                    <p>{card.label}</p>
                    <strong>{card.value}</strong>
                    <div className="dash-card-line" />
                  </article>
                ))}
              </div>

              <div className="dash-grid-panels">
                <div className="dash-panel">
                  <div className="dash-panel-header">
                    <h3>Distribuicao por Segmento</h3>
                  </div>
                  {domains.length === 0 ? (
                    <p className="empty-state">Sem dados suficientes.</p>
                  ) : (
                    <div className="dash-domain-bars">
                      {domains.map((d) => (
                        <div key={`dash-domain-${d.key}`} className="dash-domain-row">
                          <span>{d.label}</span>
                          <div className="dash-bar-track">
                            <i className={`dash-bar-fill ${reportZoneClass(d.zone)}`} style={{ width: `${Math.max(0, Math.min(100, Number(d.percent || 0)))}%` }} />
                          </div>
                          <b>{fmtPct(d.percent)}</b>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="dash-panel">
                  <div className="dash-panel-header">
                    <h3>Historico de Avaliacoes</h3>
                    <span className="subtitle">Ultimos 6 meses</span>
                  </div>
                  {histValues.length === 0 ? (
                    <p className="empty-state">Sem historico.</p>
                  ) : (
                    <div className="dash-chart">
                      {histValues.map((v, idx) => (
                        <div key={`dash-hist-${idx}`} className="dash-chart-col">
                          <div className="dash-chart-bar-wrap">
                            <div className="dash-chart-bar" style={{ height: `${Math.max(8, (Number(v || 0) / maxHist) * 100)}%` }} title={`${histLabels[idx]}: ${v}`} />
                          </div>
                          <small>{histLabels[idx]}</small>
                          <span>{v}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      );
    }
    if (section === "consultores" && isAdm(user)) return (
      <section className="admin-panel">
        <div className="admin-header"><h2>Consultores</h2><button onClick={() => openC("create")}>Novo consultor</button></div>
        {consLoad && <LoadingSpinner label="Carregando consultores..." />}{consErr && <p className="error">{consErr}</p>}
        {!consLoad && <div className="table-wrap"><table><thead><tr><th>ID</th><th>E-mail</th><th>Status</th><th>Acoes</th></tr></thead><tbody>{consultores.length === 0 ? <tr><td colSpan={4}>Nenhum consultor cadastrado.</td></tr> : consultores.map((c) => <tr key={c.id}><td>{c.id}</td><td>{c.email}</td><td>{c.is_active ? "Ativo" : "Inativo"}</td><td className="actions"><button onClick={() => openC("edit", c)}>Editar</button><button className="danger" onClick={() => openC("delete", c)}>Excluir</button></td></tr>)}</tbody></table></div>}
      </section>
    );
    if (section === "configuracoes" && canEmp(user)) return (
      <section className="admin-panel configuracoes-panel">
        <div className="config-grid">
          <section className="config-card">
            <div className="config-card-header">
              <h2>Dados cadastrais</h2>
              <p>Informacoes da consultoria para uso interno e no relatorio.</p>
            </div>
            {cfgLoad && <LoadingSpinner label="Carregando configuracoes..." />}
            {!cfgLoad && (
              <form onSubmit={saveConsultoriaConfig} className="config-form-grid">
                <div>
                  <label>CNPJ</label>
                  <input value={cfgForm.cnpj} onChange={(e) => setCfgForm((p) => ({ ...p, cnpj: e.target.value }))} placeholder="00.000.000/0000-00" />
                </div>
                <div>
                  <label>Nome da consultoria</label>
                  <input value={cfgForm.nome_consultoria} onChange={(e) => setCfgForm((p) => ({ ...p, nome_consultoria: e.target.value }))} />
                </div>
                <div>
                  <label>Responsavel legal</label>
                  <input value={cfgForm.responsavel_legal} onChange={(e) => setCfgForm((p) => ({ ...p, responsavel_legal: e.target.value }))} />
                </div>
                <div>
                  <label>Representante legal (relatorio/PDF)</label>
                  <input value={cfgForm.representante_legal_relatorio} onChange={(e) => setCfgForm((p) => ({ ...p, representante_legal_relatorio: e.target.value }))} />
                </div>
                <div>
                  <label>Cidade</label>
                  <input value={cfgForm.cidade} onChange={(e) => setCfgForm((p) => ({ ...p, cidade: e.target.value }))} />
                </div>
                <div>
                  <label>UF</label>
                  <input maxLength={2} value={cfgForm.uf} onChange={(e) => setCfgForm((p) => ({ ...p, uf: e.target.value.toUpperCase() }))} />
                </div>
                <div className="config-full-row">
                  <label>Logo da consultoria</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setCfgLogoFile(e.target.files?.[0] || null)}
                  />
                  {cfgLogoFile && <small>Arquivo selecionado: {cfgLogoFile.name}</small>}
                  {!cfgLogoFile && cfgData?.logo_url && (
                    <div style={{ marginTop: 8 }}>
                      <img
                        src={cfgData.logo_url}
                        alt="Logo da consultoria"
                        style={{ maxHeight: 72, maxWidth: "100%", objectFit: "contain", display: "block" }}
                      />
                    </div>
                  )}
                </div>
                {cfgErr && <p className="error config-full-row">{cfgErr}</p>}
                <div className="config-actions config-full-row">
                  <button type="submit" disabled={cfgSaving}>{cfgSaving ? "Salvando..." : "Salvar dados cadastrais"}</button>
                </div>
              </form>
            )}
          </section>

          <section className="config-card">
            <div className="config-card-header">
              <h2>Sessao de relatorio</h2>
              <p>Responsaveis tecnicos (nome, formacao e registro) e assinatura do representante legal.</p>
            </div>

            <form onSubmit={saveCfgTecnico} className="config-tech-form">
              <div><label>Nome</label><input value={cfgTecForm.nome} onChange={(e) => setCfgTecForm((p) => ({ ...p, nome: e.target.value }))} required /></div>
              <div><label>Formacao</label><input value={cfgTecForm.formacao} onChange={(e) => setCfgTecForm((p) => ({ ...p, formacao: e.target.value }))} required /></div>
              <div><label>Registro</label><input value={cfgTecForm.registro} onChange={(e) => setCfgTecForm((p) => ({ ...p, registro: e.target.value }))} required /></div>
              <div className="config-tech-actions">
                {cfgTecForm.id && <button type="button" className="secondary" onClick={resetCfgTecForm}>Cancelar edicao</button>}
                <button type="submit" disabled={cfgTecSaving}>{cfgTecSaving ? "Salvando..." : cfgTecForm.id ? "Salvar tecnico" : "Adicionar tecnico"}</button>
              </div>
            </form>
            {cfgTecErr && <p className="error">{cfgTecErr}</p>}

            <div className="table-wrap config-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Formacao</th>
                    <th>Registro</th>
                    <th>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {cfgTecs.length === 0 ? (
                    <tr><td colSpan={4}>Nenhum responsavel tecnico cadastrado.</td></tr>
                  ) : (
                    cfgTecs.map((t) => (
                      <tr key={`cfg-tec-${t.id}`}>
                        <td>{t.nome}</td>
                        <td>{t.formacao}</td>
                        <td>{t.registro}</td>
                        <td className="actions">
                          <button type="button" onClick={() => editCfgTecnico(t)}>Editar</button>
                          <button type="button" className="danger" onClick={() => deleteCfgTecnico(t.id)}>Excluir</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
    );
    if (section === "empresas" && canEmp(user)) return (
      <section className="admin-panel empresas-panel">
        <div className="empresas-hero">
          <div>
            <h2>Empresas Cadastradas</h2>
            <p>Gerencie todas as empresas do sistema</p>
          </div>
          <button onClick={openEmpresaCreate}>+ Nova Empresa</button>
        </div>
        {empLoad && <LoadingSpinner label="Carregando empresas..." />}{empErr && <p className="error">{empErr}</p>}
        {!empLoad && (
          <>
            {(() => {
              const termo = empBusca.trim().toLowerCase();
              const filtradas = termo
                ? empresas.filter((e) =>
                    [e.company_name, e.document_number, e.description]
                      .filter(Boolean)
                      .some((v) => String(v).toLowerCase().includes(termo))
                  )
                : empresas;
              const pageSize = Math.max(1, Number(empPageSize || 6));
              const totalPages = Math.max(1, Math.ceil(filtradas.length / pageSize));
              const currentPage = Math.min(Math.max(1, empPage), totalPages);
              const pageStart = (currentPage - 1) * pageSize;
              const pageEnd = pageStart + pageSize;
              const visiveis = filtradas.slice(pageStart, pageEnd);
              return (
                <>
                  <div className="empresas-toolbar">
                    <input
                      placeholder="Buscar por nome, CNPJ ou descricao..."
                      value={empBusca}
                      onChange={(e) => { setEmpBusca(e.target.value); setEmpPage(1); }}
                    />
                    <div className="empresas-page-size">
                      <label>Itens por pagina:</label>
                      <select value={empPageSize} onChange={(e) => { setEmpPageSize(e.target.value); setEmpPage(1); }}>
                        <option value="5">5</option>
                        <option value="6">6</option>
                        <option value="9">9</option>
                        <option value="12">12</option>
                      </select>
                    </div>
                  </div>

                  <div className="empresa-grid empresa-grid-compact">
                    {filtradas.length === 0 ? (
              <p className="empty-state">Nenhuma empresa cadastrada.</p>
            ) : (
              visiveis.map((e) => (
                <article key={e.id} className={`empresa-card ${e.is_active ? "" : "inactive"}`}>
                  <div className="empresa-card-top">
                    <div className="empresa-heading">
                      <div className="empresa-avatar" aria-hidden="true">
                        {e.logo_url ? (
                          <img src={e.logo_url} alt="" />
                        ) : (
                          <span>{empresaInitials(e.company_name)}</span>
                        )}
                      </div>
                      <div>
                        <h3>{e.company_name}</h3>
                      </div>
                    </div>
                    <span className={`empresa-type-pill ${String(e.evaluation_type || "").toUpperCase() === "SETOR" ? "setor" : "ghe"}`}>
                      {String(e.evaluation_type || "").toUpperCase()}
                    </span>
                  </div>

                  <p className="empresa-doc-row"><strong>{e.document_type === "CNPJ" ? "CNPJ" : "CPF"}:</strong> {e.document_number}</p>

                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      className="campanha-icon-btn"
                      title="Editar empresa"
                      aria-label="Editar empresa"
                      onClick={() => openEmpresaEdit(e)}
                    >
                      {I.edit}
                    </button>
                    {e.is_active ? (
                      <button
                        type="button"
                        className="campanha-icon-btn danger"
                        title="Inativar empresa"
                        aria-label="Inativar empresa"
                        onClick={() => setEInactivate(e)}
                      >
                        {I.del}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="campanha-icon-btn"
                        title="Reativar empresa"
                        aria-label="Reativar empresa"
                        onClick={() => reativarEmpresa(e)}
                      >
                        {I.power}
                      </button>
                    )}
                  </div>
                </article>
              ))
            )}
                  </div>

                  {filtradas.length > 0 && (
                    <div className="empresas-pagination" aria-label="Paginacao de empresas">
                      <div className="empresas-pagination-info">
                        Mostrando {pageStart + 1}-{Math.min(pageEnd, filtradas.length)} de {filtradas.length}
                      </div>
                      <div className="empresas-pagination-actions">
                        <button type="button" className="secondary" disabled={currentPage <= 1} onClick={() => setEmpPage((p) => Math.max(1, p - 1))}>
                          Anterior
                        </button>
                        <span className="empresas-pagination-page">Pagina {currentPage} de {totalPages}</span>
                        <button type="button" className="secondary" disabled={currentPage >= totalPages} onClick={() => setEmpPage((p) => Math.min(totalPages, p + 1))}>
                          Proxima
                        </button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </>
        )}
      </section>
    );
    if (section === "setor") {
      const termoEmpresa = setorEmpresaBusca.trim().toLowerCase();
      const setorEmpresaSugestoes = (setorEmpresaBusca.trim()
        ? empresas.filter((emp) => (
          String(emp.company_name || "").toLowerCase().includes(termoEmpresa)
          || String(emp.document_number || "").toLowerCase().includes(termoEmpresa)
        ))
        : empresas
      ).slice(0, 8);
      const empresasPorBusca = termoEmpresa
        ? empresas.filter((emp) => String(emp.company_name || "").toLowerCase().includes(termoEmpresa)).map((emp) => String(emp.id))
        : [];
      const setoresFiltrados = setorEmpresaFiltro
        ? setores.filter((s) => String(s.empresa) === String(setorEmpresaFiltro))
        : termoEmpresa
          ? setores.filter((s) => empresasPorBusca.includes(String(s.empresa)))
          : setores;
      const setorPageSize = 10;
      const setorTotalPages = Math.max(1, Math.ceil(setoresFiltrados.length / setorPageSize));
      const setorCurrentPage = Math.min(Math.max(1, setorPage), setorTotalPages);
      const setorPageStart = (setorCurrentPage - 1) * setorPageSize;
      const setorPageEnd = setorPageStart + setorPageSize;
      const setoresVisiveis = setoresFiltrados.slice(setorPageStart, setorPageEnd);
      return (
        <section className="mt-4 space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="mb-1 text-2xl font-semibold tracking-tight text-slate-900">Cadastro de Setor</h2>
                <p className="text-sm font-medium text-slate-500">Gerencie os setores por empresa.</p>
              </div>
              <div className="w-full md:max-w-sm">
                <label htmlFor="empresa-search" className="mb-1.5 block text-sm font-semibold text-slate-600">Empresa</label>
                <div className="relative w-full">
                  <input
                    id="empresa-search"
                    placeholder="Buscar empresa..."
                    autoComplete="off"
                    value={setorEmpresaBusca}
                    onFocus={() => setSetorEmpresaMenuOpen(true)}
                    onBlur={() => setTimeout(() => setSetorEmpresaMenuOpen(false), 120)}
                    onChange={(e) => { setSetorPage(1); onSetorEmpresaBuscaChange(e.target.value); setSetorEmpresaMenuOpen(true); }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                  />
                  {setorEmpresaMenuOpen && (
                    <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                      {setorEmpresaSugestoes.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-500">Nenhuma empresa encontrada.</div>
                      ) : (
                        setorEmpresaSugestoes.map((emp) => (
                          <button
                            key={`setor-empresa-opt-${emp.id}`}
                            type="button"
                            className="flex w-full flex-col items-start rounded-lg bg-transparent px-3 py-2 text-left transition hover:bg-transparent focus:bg-transparent active:bg-transparent"
                            onMouseDown={(ev) => ev.preventDefault()}
                            onClick={() => selectSetorEmpresaBuscaOption(emp)}
                          >
                            <span className="text-sm font-medium text-slate-800">{emp.company_name}</span>
                            <span className="text-xs text-slate-500">{emp.document_number || "Sem documento"}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <h2 className="m-0 text-lg font-semibold text-slate-900">Setores</h2>
            <button
              disabled={!setorEmpresaFiltro}
              title={!setorEmpresaFiltro ? "Selecione uma empresa para continuar." : ""}
              onClick={() => openSetor("create")}
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Novo setor
            </button>
          </div>

          {setorLoad && <LoadingSpinner label="Carregando setores..." />}
          {setorErr && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{setorErr}</p>}
          {!setorLoad && (
            <>
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left">
                      <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">ID</th>
                      <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Setor</th>
                      <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Empresa</th>
                      <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                      <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Acoes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {setoresFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-slate-500">Nenhum setor encontrado.</td>
                      </tr>
                    ) : (
                      setoresVisiveis.map((s) => (
                        <tr key={s.id} className="align-top">
                          <td className="px-3 py-3 font-semibold text-slate-700">{s.id}</td>
                          <td className="px-3 py-3 text-slate-700">{s.name}</td>
                          <td className="px-3 py-3 text-slate-600">{s.empresa_name}</td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex min-h-6 items-center justify-center rounded-full border px-2 py-0.5 text-xs font-semibold ${s.is_active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}>
                              {s.is_active ? "Ativo" : "Inativo"}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button className="campanha-icon-btn" title="Editar setor" aria-label="Editar setor" onClick={() => openSetor("edit", s)}>{I.edit}</button>
                              {s.is_active ? (
                                <button className="campanha-icon-btn" title="Inativar setor" aria-label="Inativar setor" onClick={() => openSetorInativarConfirm(s)}>{I.power}</button>
                              ) : (
                                <button className="campanha-icon-btn" title="Reativar setor" aria-label="Reativar setor" onClick={() => { toggleSetorAtivo(s, true).catch(() => {}); }}>{I.power}</button>
                              )}
                              <button className="campanha-icon-btn danger" title="Excluir setor" aria-label="Excluir setor" onClick={() => openSetor("delete", s)}>{I.del}</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {setoresFiltrados.length > 0 && (
                <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between" aria-label="Paginacao de setores">
                  <div className="text-sm text-slate-600">
                    Mostrando {setorPageStart + 1}-{Math.min(setorPageEnd, setoresFiltrados.length)} de {setoresFiltrados.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" disabled={setorCurrentPage <= 1} onClick={() => setSetorPage((p) => Math.max(1, p - 1))} className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
                      Anterior
                    </button>
                    <span className="text-sm font-medium text-slate-600">Pagina {setorCurrentPage} de {setorTotalPages}</span>
                    <button type="button" disabled={setorCurrentPage >= setorTotalPages} onClick={() => setSetorPage((p) => Math.min(setorTotalPages, p + 1))} className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
                      Proxima
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      );
    }
    if (section === "ghe") {
      const termoEmpresa = gheEmpresaBusca.trim().toLowerCase();
      const gheEmpresaSugestoes = (gheEmpresaBusca.trim()
        ? empresas.filter((emp) => (
          String(emp.company_name || "").toLowerCase().includes(termoEmpresa)
          || String(emp.document_number || "").toLowerCase().includes(termoEmpresa)
        ))
        : empresas
      ).slice(0, 8);
      const empresasPorBusca = termoEmpresa
        ? empresas.filter((emp) => String(emp.company_name || "").toLowerCase().includes(termoEmpresa)).map((emp) => String(emp.id))
        : [];
      const ghesFiltrados = gheEmpresaFiltro
        ? ghes.filter((g) => String(g.empresa) === String(gheEmpresaFiltro))
        : termoEmpresa
          ? ghes.filter((g) => empresasPorBusca.includes(String(g.empresa)))
          : ghes;
      const ghePageSize = 10;
      const gheTotalPages = Math.max(1, Math.ceil(ghesFiltrados.length / ghePageSize));
      const gheCurrentPage = Math.min(Math.max(1, ghePage), gheTotalPages);
      const ghePageStart = (gheCurrentPage - 1) * ghePageSize;
      const ghePageEnd = ghePageStart + ghePageSize;
      const ghesVisiveis = ghesFiltrados.slice(ghePageStart, ghePageEnd);

      return (
        <section className="mt-4 space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="mb-1 text-2xl font-semibold tracking-tight text-slate-900">Cadastro de GHE</h2>
                <p className="text-sm font-medium text-slate-500">Gerencie os GHEs por empresa.</p>
              </div>
              <div className="w-full md:max-w-sm">
                <label htmlFor="ghe-empresa-search" className="mb-1.5 block text-sm font-semibold text-slate-600">Empresa</label>
                <div className="relative w-full">
                  <input
                    id="ghe-empresa-search"
                    placeholder="Buscar empresa..."
                    autoComplete="off"
                    value={gheEmpresaBusca}
                    onFocus={() => setGheEmpresaMenuOpen(true)}
                    onBlur={() => setTimeout(() => setGheEmpresaMenuOpen(false), 120)}
                    onChange={(e) => { setGhePage(1); onGheEmpresaBuscaChange(e.target.value); setGheEmpresaMenuOpen(true); }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                  />
                  {gheEmpresaMenuOpen && (
                    <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                      {gheEmpresaSugestoes.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-500">Nenhuma empresa encontrada.</div>
                      ) : (
                        gheEmpresaSugestoes.map((emp) => (
                          <button
                            key={`ghe-empresa-opt-${emp.id}`}
                            type="button"
                            className="flex w-full flex-col items-start rounded-lg bg-transparent px-3 py-2 text-left transition hover:bg-transparent focus:bg-transparent active:bg-transparent"
                            onMouseDown={(ev) => ev.preventDefault()}
                            onClick={() => selectGheEmpresaBuscaOption(emp)}
                          >
                            <span className="text-sm font-medium text-slate-800">{emp.company_name}</span>
                            <span className="text-xs text-slate-500">{emp.document_number || "Sem documento"}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <h2 className="m-0 text-lg font-semibold text-slate-900">GHEs</h2>
            <button
              disabled={!gheEmpresaFiltro}
              title={!gheEmpresaFiltro ? "Selecione uma empresa para continuar." : ""}
              onClick={() => openGhe("create")}
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Novo GHE
            </button>
          </div>

          {gheLoad && <LoadingSpinner label="Carregando GHEs..." />}
          {gheErr && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{gheErr}</p>}
          {!gheLoad && (
            <>
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left">
                      <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">ID</th>
                      <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">GHE</th>
                      <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Empresa</th>
                      <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                      <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Acoes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {ghesFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-slate-500">Nenhum GHE encontrado.</td>
                      </tr>
                    ) : (
                      ghesVisiveis.map((g) => (
                        <tr key={g.id} className="align-top">
                          <td className="px-3 py-3 font-semibold text-slate-700">{g.id}</td>
                          <td className="px-3 py-3 text-slate-700">{g.name}</td>
                          <td className="px-3 py-3 text-slate-600">{g.empresa_name}</td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex min-h-6 items-center justify-center rounded-full border px-2 py-0.5 text-xs font-semibold ${g.is_active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}>
                              {g.is_active ? "Ativo" : "Inativo"}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button className="campanha-icon-btn" title="Editar GHE" aria-label="Editar GHE" onClick={() => openGhe("edit", g)}>{I.edit}</button>
                              {g.is_active ? (
                                <button className="campanha-icon-btn" title="Inativar GHE" aria-label="Inativar GHE" onClick={() => toggleGheAtivo(g, false)}>{I.power}</button>
                              ) : (
                                <button className="campanha-icon-btn" title="Reativar GHE" aria-label="Reativar GHE" onClick={() => toggleGheAtivo(g, true)}>{I.power}</button>
                              )}
                              <button className="campanha-icon-btn danger" title="Excluir GHE" aria-label="Excluir GHE" onClick={() => openGhe("delete", g)}>{I.del}</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {ghesFiltrados.length > 0 && (
                <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between" aria-label="Paginacao de GHEs">
                  <div className="text-sm text-slate-600">
                    Mostrando {ghePageStart + 1}-{Math.min(ghePageEnd, ghesFiltrados.length)} de {ghesFiltrados.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" disabled={gheCurrentPage <= 1} onClick={() => setGhePage((p) => Math.max(1, p - 1))} className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
                      Anterior
                    </button>
                    <span className="text-sm font-medium text-slate-600">Pagina {gheCurrentPage} de {gheTotalPages}</span>
                    <button type="button" disabled={gheCurrentPage >= gheTotalPages} onClick={() => setGhePage((p) => Math.min(gheTotalPages, p + 1))} className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
                      Proxima
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      );
    }
    if (section === "cargos") {
      const termoEmpresa = cargoEmpresaBusca.trim().toLowerCase();
      const cargoEmpresaSugestoes = (cargoEmpresaBusca.trim()
        ? empresas.filter((emp) => (
          String(emp.company_name || "").toLowerCase().includes(termoEmpresa)
          || String(emp.document_number || "").toLowerCase().includes(termoEmpresa)
        ))
        : empresas
      ).slice(0, 8);
      const empresasPorBusca = termoEmpresa
        ? empresas.filter((emp) => String(emp.company_name || "").toLowerCase().includes(termoEmpresa)).map((emp) => String(emp.id))
        : [];
      const cargosFiltrados = cargoEmpresaFiltro
        ? cargos.filter((cg) => String(cg.empresa) === String(cargoEmpresaFiltro))
        : termoEmpresa
          ? cargos.filter((cg) => empresasPorBusca.includes(String(cg.empresa)))
          : cargos;
      const cargoPageSize = 10;
      const cargoTotalPages = Math.max(1, Math.ceil(cargosFiltrados.length / cargoPageSize));
      const cargoCurrentPage = Math.min(Math.max(1, cargoPage), cargoTotalPages);
      const cargoPageStart = (cargoCurrentPage - 1) * cargoPageSize;
      const cargoPageEnd = cargoPageStart + cargoPageSize;
      const cargosVisiveis = cargosFiltrados.slice(cargoPageStart, cargoPageEnd);

      return (
        <section className="mt-4 space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="mb-1 text-2xl font-semibold tracking-tight text-slate-900">Cadastro de Cargos</h2>
                <p className="text-sm font-medium text-slate-500">Gerencie os cargos por empresa.</p>
              </div>
              <div className="w-full md:max-w-sm">
                <label htmlFor="cargo-empresa-search" className="mb-1.5 block text-sm font-semibold text-slate-600">Empresa</label>
                <div className="relative w-full">
                  <input
                    id="cargo-empresa-search"
                    placeholder="Buscar empresa..."
                    autoComplete="off"
                    value={cargoEmpresaBusca}
                    onFocus={() => setCargoEmpresaMenuOpen(true)}
                    onBlur={() => setTimeout(() => setCargoEmpresaMenuOpen(false), 120)}
                    onChange={(e) => { setCargoPage(1); onCargoEmpresaBuscaChange(e.target.value); setCargoEmpresaMenuOpen(true); }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                  />
                  {cargoEmpresaMenuOpen && (
                    <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                      {cargoEmpresaSugestoes.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-500">Nenhuma empresa encontrada.</div>
                      ) : (
                        cargoEmpresaSugestoes.map((emp) => (
                          <button
                            key={`cargo-empresa-opt-${emp.id}`}
                            type="button"
                            className="flex w-full flex-col items-start rounded-lg bg-transparent px-3 py-2 text-left transition hover:bg-transparent focus:bg-transparent active:bg-transparent"
                            onMouseDown={(ev) => ev.preventDefault()}
                            onClick={() => selectCargoEmpresaBuscaOption(emp)}
                          >
                            <span className="text-sm font-medium text-slate-800">{emp.company_name}</span>
                            <span className="text-xs text-slate-500">{emp.document_number || "Sem documento"}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <h2 className="m-0 text-lg font-semibold text-slate-900">Cargos</h2>
            <button
              disabled={!cargoEmpresaFiltro}
              title={!cargoEmpresaFiltro ? "Selecione uma empresa para continuar." : ""}
              onClick={() => openCargo("create")}
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Novo cargo
            </button>
          </div>

          {cargoLoad && <LoadingSpinner label="Carregando cargos..." />}
          {cargoErr && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{cargoErr}</p>}
          {!cargoLoad && (
            <>
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left">
                      <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">ID</th>
                      <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Cargo</th>
                      <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Empresa</th>
                      <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                      <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Acoes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {cargosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-slate-500">Nenhum cargo encontrado.</td>
                      </tr>
                    ) : (
                      cargosVisiveis.map((cg) => (
                        <tr key={cg.id} className="align-top">
                          <td className="px-3 py-3 font-semibold text-slate-700">{cg.id}</td>
                          <td className="px-3 py-3 text-slate-700">{cg.name}</td>
                          <td className="px-3 py-3 text-slate-600">{cg.empresa_name}</td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex min-h-6 items-center justify-center rounded-full border px-2 py-0.5 text-xs font-semibold ${cg.is_active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}>
                              {cg.is_active ? "Ativo" : "Inativo"}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button className="campanha-icon-btn" title="Editar cargo" aria-label="Editar cargo" onClick={() => openCargo("edit", cg)}>{I.edit}</button>
                              {cg.is_active ? (
                                <button className="campanha-icon-btn" title="Inativar cargo" aria-label="Inativar cargo" onClick={() => toggleCargoAtivo(cg, false)}>{I.power}</button>
                              ) : (
                                <button className="campanha-icon-btn" title="Reativar cargo" aria-label="Reativar cargo" onClick={() => toggleCargoAtivo(cg, true)}>{I.power}</button>
                              )}
                              <button className="campanha-icon-btn danger" title="Excluir cargo" aria-label="Excluir cargo" onClick={() => openCargo("delete", cg)}>{I.del}</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {cargosFiltrados.length > 0 && (
                <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between" aria-label="Paginacao de cargos">
                  <div className="text-sm text-slate-600">
                    Mostrando {cargoPageStart + 1}-{Math.min(cargoPageEnd, cargosFiltrados.length)} de {cargosFiltrados.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" disabled={cargoCurrentPage <= 1} onClick={() => setCargoPage((p) => Math.max(1, p - 1))} className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
                      Anterior
                    </button>
                    <span className="text-sm font-medium text-slate-600">Pagina {cargoCurrentPage} de {cargoTotalPages}</span>
                    <button type="button" disabled={cargoCurrentPage >= cargoTotalPages} onClick={() => setCargoPage((p) => Math.min(cargoTotalPages, p + 1))} className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
                      Proxima
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      );
    }
    if (section === "campanhas-relatorio") {
      const rel = campRelatorio;
      const filtros = rel?.filters || {};
      const overall = rel?.overall || { summary: rel?.summary || {}, domains: rel?.domains || [], steps: rel?.steps || [], step9_comments: rel?.step9_comments || [] };
      const porRef = rel?.per_ref || [];
      const prelimMeasures = rel?.preliminary_measures || [];
      const prelimWhens = rel?.preliminary_whens || [];
      const attachments = rel?.attachments || [];
      const overallSummary = overall?.summary || {};
      const overallDomains = overall?.domains || [];
      const overallSteps = overall?.steps || [];
      const overallComments = overall?.step9_comments || [];
      const whenOptions = monthWindowOptions();

      const lowScoreByStep = overallSteps.map((step) => {
        const items = [];
        (step.questions || []).forEach((q, idx) => {
          if (Number(q.avg_score || 0) < 4) {
            items.push({
              source: "GERAL",
              label: "Analise geral",
              step_number: step.step,
              question_field: q.field || `q${idx + 1}`,
              question: q.question,
              avg_score: q.avg_score,
              percent: q.percent,
              zone: q.zone,
              scope_type: "GERAL",
              setor: null,
              ghe: null,
            });
          }
        });
        porRef.forEach((refItem) => {
          const refStep = (refItem.steps || []).find((s) => s.key === step.key);
          if (!refStep) return;
          (refStep.questions || []).forEach((q, idx) => {
            if (Number(q.avg_score || 0) < 4) {
              items.push({
                source: filtros.ref_label || "REF",
                label: `${filtros.ref_label || "Ref"}: ${refItem.ref?.name || "-"}`,
                step_number: refStep.step,
                question_field: q.field || `q${idx + 1}`,
                question: q.question,
                avg_score: q.avg_score,
                percent: q.percent,
                zone: q.zone,
                scope_type: (filtros.evaluation_type === "SETOR" ? "SETOR" : "GHE"),
                setor: filtros.evaluation_type === "SETOR" ? refItem.ref?.id : null,
                ghe: filtros.evaluation_type === "GHE" ? refItem.ref?.id : null,
              });
            }
          });
        });
        return { step, items };
      }).filter((x) => x.items.length > 0);

      const renderStepAnalysis = (step, keyPrefix, title) => (
        <div key={`${keyPrefix}-${step.key}`} className="report-card step-analysis-card">
          <div className="report-step-title">
            <div>
              {title && <small>{title}</small>}
              <h3>{step.domain.toUpperCase()}</h3>
            </div>
            <div className="report-step-summary">
              <div className="report-progress compact">
                <span className={`report-progress-fill ${reportZoneClass(step.zone)}`} style={{ width: `${Math.max(0, Math.min(100, Number(step.percent || 0)))}%` }} />
              </div>
              <span>{fmtPct(step.percent)} | {fmtScore(step.avg_score)} / 5</span>
            </div>
          </div>
          <p className="report-step-legend">
            {step.response_count || 0} respostas | {step.orientation === "negative" ? "dominio com perguntas negativas" : "dominio com perguntas positivas"}
          </p>
          <div className="report-question-list">
            {(step.questions || []).map((q, idx) => (
              <div key={`${keyPrefix}-${step.key}-q-${idx}`} className="report-question-row">
                <div className="report-question-text">{q.question}</div>
                <div className="report-progress">
                  <span className={`report-progress-fill ${reportZoneClass(q.zone)}`} style={{ width: `${Math.max(0, Math.min(100, Number(q.percent || 0)))}%` }} />
                </div>
                <div className="report-domain-values">{fmtPct(q.percent)} | {fmtScore(q.avg_score)} / 5 | {reportZoneLabel(q.zone)}</div>
              </div>
            ))}
          </div>
        </div>
      );

      return (
        <section className="admin-panel report-panel">
          <button type="button" className="floating-pdf-button" onClick={exportCampanhaRelatorioPdf} disabled={campPdfLoading}>
            {campPdfLoading ? "Gerando PDF..." : "Exportar PDF"}
          </button>
          <div className="report-header">
            <div>
              <button className="secondary" type="button" onClick={() => goSection("campanhas")}>Voltar para campanhas</button>
              <h2>Relatorio da campanha</h2>
              <p>{rel?.campaign?.title || campRelCampanha?.title || "-"} | {rel?.empresa?.name || campRelCampanha?.empresa_name || "-"}</p>
            </div>
            <div className="report-header-meta">
              <span className="subtitle">Visao geral e por {String(filtros.ref_label || "Setor/GHE").toLowerCase()}</span>
            </div>
          </div>

          {campRelLoad && <LoadingSpinner label="Carregando relatorio..." />}
          {campRelErr && <p className="error">{campRelErr}</p>}
          {campPdfErr && <p className="error">{campPdfErr}</p>}

          {!campRelLoad && rel && (
            <>
              <div className="report-card report-section-title">
                <div>
                  <h2>Resultados Gerais</h2>
                  <p className="subtitle">Total concluido na campanha: {rel?.summary?.total_completed_all_filters || 0}</p>
                </div>
              </div>

              <div className="report-summary-grid">
                <article className="report-summary-card">
                  <p className="report-summary-label">Media geral</p>
                  <strong className={`report-score ${reportZoneClass(overallSummary.company_zone)}`}>{fmtPct(overallSummary.company_mean_percent)}</strong>
                  <span className={`report-zone ${reportZoneClass(overallSummary.company_zone)}`}>{fmtScore(overallSummary.company_mean_score)} de 5 | {reportZoneLabel(overallSummary.company_zone)}</span>
                </article>
                <article className="report-summary-card">
                  <p className="report-summary-label">Amostra de respostas</p>
                  <span className="report-sample-count">{overallSummary.completed_responses || 0} de {rel?.empresa?.employee_count || 0} funcionarios responderam</span>
                  <strong className={`report-score ${reportZoneClass(overallSummary.sample_zone)}`}>{fmtPct(overallSummary.sample_percent)}</strong>
                  <span className={`report-zone ${reportZoneClass(overallSummary.sample_zone)}`}>{reportZoneLabel(overallSummary.sample_zone)}</span>
                </article>
              </div>

              <div className="report-card">
                <div className="admin-header report-card-header">
                  <h2>Media por dominio (percentual | score 1-5)</h2>
                </div>
                <div className="report-domain-list">
                  {overallDomains.map((d) => (
                    <div key={`overall-domain-${d.key}`} className="report-domain-row">
                      <div className="report-domain-name">{d.domain}</div>
                      <div className="report-progress">
                        <span className={`report-progress-fill ${reportZoneClass(d.zone)}`} style={{ width: `${Math.max(0, Math.min(100, Number(d.percent || 0)))}%` }} />
                      </div>
                      <div className="report-domain-values">{fmtPct(d.percent)} | {fmtScore(d.avg_score)}</div>
                    </div>
                  ))}
                </div>
                <div className="report-zones">
                  <div className="report-zone-box red"><strong>Zona Vermelha (0% a 39,9%)</strong><span>Risco elevado: acao corretiva imediata</span></div>
                  <div className="report-zone-box yellow"><strong>Zona Amarela (40% a 74,9%)</strong><span>Atencao: possivel risco psicossocial</span></div>
                  <div className="report-zone-box green"><strong>Zona Verde (75% a 100%)</strong><span>Boa percepcao e manutencao recomendada</span></div>
                </div>
              </div>

              {overallSteps.map((step) => {
                const refsForStep = porRef
                  .map((item) => ({ item, step: (item.steps || []).find((s) => s.key === step.key) }))
                  .filter((x) => x.step);
                return (
                  <div key={`step-group-${step.key}`} className="report-step-group">
                    {renderStepAnalysis(step, "overall", `Step ${step.step} | Analise Geral`)}
                    {refsForStep.length > 0 && (
                      <div className="report-step-subresults">
                        <h4>Resultado por {filtros.ref_label || "Setor/GHE"}</h4>
                        {refsForStep.map(({ item, step: refStep }) => (
                          <div key={`ref-step-${item.ref?.id}-${step.key}`} className="report-subcard">
                            <div className="report-subcard-header">
                              <strong>{item.ref?.name || "-"}</strong>
                              <span>{fmtPct(refStep.percent)} | {fmtScore(refStep.avg_score)} / 5 | {reportZoneLabel(refStep.zone)}</span>
                            </div>
                            <div className="report-question-list">
                              {(refStep.questions || []).map((q, idx) => (
                                <div key={`ref-${item.ref?.id}-${step.key}-q-${idx}`} className="report-question-row">
                                  <div className="report-question-text">{q.question}</div>
                                  <div className="report-progress">
                                    <span className={`report-progress-fill ${reportZoneClass(q.zone)}`} style={{ width: `${Math.max(0, Math.min(100, Number(q.percent || 0)))}%` }} />
                                  </div>
                                  <div className="report-domain-values">{fmtPct(q.percent)} | {fmtScore(q.avg_score)} / 5 | {reportZoneLabel(q.zone)}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="report-card">
                <div className="admin-header report-card-header">
                  <h2>Step 9 - Comentarios (Geral)</h2>
                  <span className="subtitle">{overallComments.length} comentarios exibidos</span>
                </div>
                {overallComments.length === 0 ? (
                  <p className="empty-state">Nenhum comentario informado.</p>
                ) : (
                  <div className="report-comments">
                    {overallComments.map((c) => (
                      <article key={`overall-comment-${c.id}`} className="report-comment-item">
                        <header>
                          <strong>{c.first_name || "Participante"}</strong>
                          <span>{new Date(c.created_at).toLocaleString("pt-BR")}</span>
                        </header>
                        <p>{c.comment}</p>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              <div className="report-card conclusions-card">
                <div className="admin-header report-card-header">
                  <h2>CONCLUSOES E RECOMENDACOES PRELIMINARES</h2>
                  <span className="subtitle">Perguntas com score abaixo de 4.0</span>
                </div>
                <div className="conclusion-intro">
                  <ul>
                    <li>Priorizar dominios com risco elevado.</li>
                    <li className="conclusion-review-line">
                      <span>Reavaliar periodicamente: daqui</span>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={campReviewMonths}
                        onChange={(e) => setCampReviewMonths(e.target.value)}
                      />
                      <span>meses.</span>
                      <button type="button" className="secondary" disabled={campReviewSaving} onClick={saveCampanhaReviewMonths}>
                        {campReviewSaving ? "Salvando..." : "Salvar"}
                      </button>
                    </li>
                    <li>Promover treinamentos sobre saude mental e fatores psicossociais.</li>
                    <li>Caso necessario, realizar AET aprofundada conforme NR-17.</li>
                  </ul>
                  <p>Plano de Acao Recomendado</p>
                </div>
                {campMeasureErr && <p className="error">{campMeasureErr}</p>}
                {lowScoreByStep.length === 0 ? (
                  <p className="empty-state">Nenhuma pergunta abaixo de 4.0 encontrada.</p>
                ) : (
                  <div className="conclusions-steps">
                    {lowScoreByStep.map(({ step, items }) => (
                      <section key={`conc-step-${step.key}`} className="conclusion-step-block">
                        <h3>{step.domain}</h3>
                        <div className="conclusion-question-list">
                          {items.map((item, idx) => {
                            const key = measureKey(item);
                            const draft = campMeasureDrafts[key] || { open: false, whenOpen: false, text: "", whenMonths: [] };
                            const savedWhen = prelimWhens.find((w) => (
                              Number(w.step_number) === Number(item.step_number)
                              && String(w.question_field) === String(item.question_field)
                              && String(w.scope_type) === String(item.scope_type)
                              && String(w.setor || "") === String(item.setor || "")
                              && String(w.ghe || "") === String(item.ghe || "")
                            ));
                            const effectiveWhenMonths = Array.isArray(draft.whenMonths) && draft.whenMonths.length > 0
                              ? draft.whenMonths
                              : (Array.isArray(savedWhen?.when_months) ? savedWhen.when_months : []);
                            const measuresForQuestion = prelimMeasures.filter((m) => (
                              Number(m.step_number) === Number(item.step_number)
                              && String(m.question_field) === String(item.question_field)
                              && String(m.scope_type) === String(item.scope_type)
                              && String(m.setor || "") === String(item.setor || "")
                              && String(m.ghe || "") === String(item.ghe || "")
                            ));
                            return (
                              <article key={`conc-${step.key}-${idx}-${key}`} className="conclusion-question-card">
                                <div className="conclusion-question-top">
                                  <div className="conclusion-question-header-block">
                                    <p className="conclusion-scope">{item.label}</p>
                                    <p className="conclusion-question-text">{item.question}</p>
                                    <p className="conclusion-meta-line">
                                      <strong>Media:</strong> {fmtScore(item.avg_score)}{" "}
                                      <span className="conclusion-divider">|</span>{" "}
                                      <strong>Nivel de Risco:</strong> {reportRiskText(item.zone)}
                                    </p>
                                    <p className="conclusion-meta-line">
                                      <strong>Acao Recomendada:</strong> {reportRecommendedAction(item.zone)}
                                    </p>
                                    <p className="conclusion-section-label">Medidas de Prevencao/Controle:</p>
                                  </div>
                                  <span className={`report-zone ${reportZoneClass(item.zone)}`}>{fmtScore(item.avg_score)} / 5</span>
                                </div>

                                {measuresForQuestion.length > 0 && (
                                  <div className="conclusion-measures">
                                    {measuresForQuestion.map((m) => (
                                      <div key={`med-${m.id}`} className="conclusion-measure-item">
                                        <div className="conclusion-measure-content">
                                          <span>{m.action_text}</span>
                                        </div>
                                        <button type="button" className="danger" onClick={() => deletePreliminaryMeasure(m.id)}>Excluir</button>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <div className="conclusion-inline-actions">
                                  <button type="button" className="link-like-button" onClick={() => openMeasureDraft(item)}>+ Adicionar medida temporaria</button>
                                  <button type="button" className="secondary" onClick={() => toggleMeasureWhen(item, effectiveWhenMonths)}>quando</button>
                                  {effectiveWhenMonths.length > 0 && (
                                    <span className="conclusion-when-summary">Aplicar em: {formatWhenRange(effectiveWhenMonths)}</span>
                                  )}
                                </div>
                                {draft.whenOpen && (
                                  <div className="conclusion-when-panel">
                                    <div className="conclusion-when-header">
                                      <strong>Quando</strong>
                                      <div className="conclusion-inline-actions">
                                        {savedWhen?.id && (
                                          <button type="button" className="secondary" onClick={() => deletePreliminaryWhen(savedWhen.id)}>Remover</button>
                                        )}
                                        <button type="button" className="secondary" onClick={() => toggleMeasureWhen(item, effectiveWhenMonths)}>Fechar</button>
                                      </div>
                                    </div>
                                    <div className="conclusion-when-grid">
                                      {whenOptions.map((opt) => (
                                        <label key={`${key}-when-${opt}`} className="checkbox-line">
                                          <input
                                            type="checkbox"
                                            checked={effectiveWhenMonths.includes(opt)}
                                            onChange={() => toggleMeasureMonth(item, opt, effectiveWhenMonths)}
                                          />
                                          {formatWhenMonthPt(opt)}
                                        </label>
                                      ))}
                                    </div>
                                    <div className="conclusion-when-apply-line">
                                      <strong>Aplicar em:</strong>{" "}
                                      {effectiveWhenMonths.length > 0
                                        ? effectiveWhenMonths.map(formatWhenMonthPt).join(", ")
                                        : "-"}
                                    </div>
                                    <div className="conclusion-when-table-wrap">
                                      <table className="conclusion-when-table">
                                        <thead>
                                          <tr>
                                            <th>Responsavel</th>
                                            <th>Data de Implantacao</th>
                                            <th>A Fazer</th>
                                            <th>Fazendo</th>
                                            <th>Adiado</th>
                                            <th>Concluido</th>
                                            <th>Concluido em</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          <tr>
                                            <td>{rel?.empresa?.name || rel?.campaign?.empresa_name || "Empresa"}</td>
                                            <td>{effectiveWhenMonths.length > 0 ? formatWhenRange(effectiveWhenMonths) : "-"}</td>
                                            <td><input type="checkbox" readOnly checked={false} /></td>
                                            <td><input type="checkbox" readOnly checked={false} /></td>
                                            <td><input type="checkbox" readOnly checked={false} /></td>
                                            <td><input type="checkbox" readOnly checked={false} /></td>
                                            <td>__/__/____</td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                    <div className="conclusion-add-actions">
                                      <button type="button" className="secondary" onClick={() => toggleMeasureWhen(item, effectiveWhenMonths)}>Cancelar</button>
                                      <button type="button" disabled={campWhenSavingKey === key} onClick={() => savePreliminaryWhen(item)}>
                                        {campWhenSavingKey === key ? "Salvando..." : "Salvar quando"}
                                      </button>
                                    </div>
                                  </div>
                                )}
                                {!draft.open ? null : (
                                  <div className="conclusion-add-form">
                                    <div className="conclusion-add-inline">
                                      <input
                                        value={draft.text || ""}
                                        onChange={(e) => changeMeasureDraft(item, e.target.value)}
                                        placeholder="Plano de acao preliminar..."
                                        maxLength={500}
                                      />
                                      <div className="conclusion-add-actions">
                                        <button type="button" className="secondary" onClick={() => closeMeasureDraft(item)}>Cancelar</button>
                                        <button type="button" disabled={campMeasureSavingKey === key} onClick={() => addPreliminaryMeasure(item)}>
                                          {campMeasureSavingKey === key ? "Salvando..." : "Salvar medida"}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </article>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </div>

              <div className="report-card attachments-card">
                <div className="admin-header report-card-header">
                  <h2>Anexos</h2>
                  <label className={`secondary file-upload-btn ${campAttachUploading ? "disabled" : ""}`}>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={campAttachUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadRelatorioAnexo(file);
                        e.target.value = "";
                      }}
                    />
                    {campAttachUploading ? "Enviando..." : "Adicionar imagem"}
                  </label>
                </div>
                {campAttachErr && <p className="error">{campAttachErr}</p>}
                {attachments.length === 0 ? (
                  <p className="empty-state">Nenhum anexo enviado.</p>
                ) : (
                  <div className="attachments-grid">
                    {attachments.map((a) => {
                      const isImg = String(a.content_type || "").startsWith("image/");
                      return (
                        <article key={`anexo-${a.id}`} className="attachment-card">
                          <a href={a.file_url} target="_blank" rel="noreferrer" className="attachment-preview">
                            {isImg ? <img src={a.file_url} alt={a.file_name} /> : <span>{a.file_name}</span>}
                          </a>
                          <div className="attachment-meta">
                            <strong title={a.file_name}>{a.file_name}</strong>
                            <span>{a.content_type || "arquivo"} · {Math.ceil((a.size_bytes || 0) / 1024)} KB</span>
                          </div>
                          <div className="attachment-actions">
                            <a href={a.file_url} target="_blank" rel="noreferrer" className="secondary">Abrir</a>
                            <button type="button" className="danger" onClick={() => deleteRelatorioAnexo(a.id)}>Excluir</button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      );
    }
    if (section === "campanhas") {
      const termoEmpresa = campEmpresaBusca.trim().toLowerCase();
      const campEmpresaSugestoes = (campEmpresaBusca.trim()
        ? empresas.filter((emp) => (
          String(emp.company_name || "").toLowerCase().includes(termoEmpresa)
          || String(emp.document_number || "").toLowerCase().includes(termoEmpresa)
        ))
        : empresas
      ).slice(0, 8);
      const empresasPorBusca = termoEmpresa
        ? empresas.filter((emp) => String(emp.company_name || "").toLowerCase().includes(termoEmpresa)).map((emp) => String(emp.id))
        : [];
      const campanhasBase = campEmpresaFiltro
        ? campanhas.filter((cp) => String(cp.empresa) === String(campEmpresaFiltro))
        : termoEmpresa
          ? campanhas.filter((cp) => empresasPorBusca.includes(String(cp.empresa)))
          : campanhas;
      const campanhasFiltradas = campStatusFiltro === "TODAS"
        ? campanhasBase
        : campanhasBase.filter((cp) => String(cp.status || "") === campStatusFiltro);
      const campPageSize = 10;
      const campTotalPages = Math.max(1, Math.ceil(campanhasFiltradas.length / campPageSize));
      const campCurrentPage = Math.min(Math.max(1, campPage), campTotalPages);
      const campPageStart = (campCurrentPage - 1) * campPageSize;
      const campPageEnd = campPageStart + campPageSize;
      const campanhasVisiveis = campanhasFiltradas.slice(campPageStart, campPageEnd);

      return (
        <section className="mt-4 space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="mb-1 text-2xl font-semibold tracking-tight text-slate-900">Campanhas</h2>
                <p className="text-sm font-medium text-slate-500">Crie e gerencie campanhas por empresa.</p>
              </div>
              <div className="w-full md:max-w-sm">
                <label htmlFor="camp-empresa-search" className="mb-1.5 block text-sm font-semibold text-slate-600">Empresa</label>
                <div className="relative">
                  <input
                    id="camp-empresa-search"
                    placeholder="Buscar empresa..."
                    autoComplete="off"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                    value={campEmpresaBusca}
                    onFocus={() => setCampEmpresaMenuOpen(true)}
                    onBlur={() => setTimeout(() => setCampEmpresaMenuOpen(false), 120)}
                    onChange={(e) => { onCampEmpresaBuscaChange(e.target.value); setCampEmpresaMenuOpen(true); }}
                  />
                  {campEmpresaMenuOpen && (
                    <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                      {campEmpresaSugestoes.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-500">Nenhuma empresa encontrada.</div>
                      ) : (
                        campEmpresaSugestoes.map((emp) => (
                          <button
                            key={`camp-empresa-opt-${emp.id}`}
                            type="button"
                            className="flex w-full flex-col items-start rounded-lg bg-transparent px-3 py-2 text-left transition hover:bg-transparent focus:bg-transparent active:bg-transparent"
                            onMouseDown={(ev) => ev.preventDefault()}
                            onClick={() => selectCampEmpresaBuscaOption(emp)}
                          >
                            <span className="text-sm font-medium text-slate-800">{emp.company_name}</span>
                            <span className="text-xs text-slate-500">{emp.document_number || "Sem documento"}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <h2 className="m-0 text-lg font-semibold text-slate-900">Lista de campanhas</h2>
              <div className="flex items-center gap-2">
                <label htmlFor="camp-status-filter" className="text-sm font-medium text-slate-600">Status</label>
                <select
                  id="camp-status-filter"
                  value={campStatusFiltro}
                  onChange={(e) => { setCampPage(1); setCampStatusFiltro(e.target.value); }}
                  className="min-h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                >
                  <option value="TODAS">Todas</option>
                  <option value="ATIVO">Ativa</option>
                  <option value="ENCERRADO">Encerrada</option>
                </select>
              </div>
            </div>
            <button
              type="button"
              disabled={!campEmpresaFiltro}
              title={!campEmpresaFiltro ? "Selecione uma empresa para continuar." : ""}
              onClick={() => openCampanha("create")}
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Nova campanha
            </button>
          </div>

          {campLoad && (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm" role="status" aria-live="polite">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" aria-hidden="true" />
              <span>Carregando campanhas...</span>
            </div>
          )}
          {campErr && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{campErr}</p>}
          {!campLoad && (
            campanhasFiltradas.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-slate-500">Nenhuma campanha encontrada.</p>
            ) : (
              <>
                <div className="space-y-3">
                  {campanhasVisiveis.map((cp) => (
                    <article key={cp.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="mb-2">
                            <h3 className="truncate pr-2 text-base font-semibold text-slate-900">{cp.title}</h3>
                          </div>
                          <div className="flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
                            <span>{fDate(cp.start_date)} - {fDate(cp.end_date)}</span>
                            <span>{Number(cp.completed_count || 0)} avaliacoes</span>
                            <span
                              className={`inline-flex min-h-6 items-center self-start rounded-full px-2.5 py-0.5 text-xs font-bold uppercase leading-none tracking-wide sm:self-auto ${
                                cp.status === "ATIVO"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {cp.status === "ATIVO" ? "Ativa" : "Encerrada"}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            title={cp.status === "ATIVO" ? "Encerrar campanha" : "Ativar campanha"}
                            aria-label={cp.status === "ATIVO" ? "Encerrar campanha" : "Ativar campanha"}
                            disabled={campStatusLoadingId === cp.id}
                            onClick={() => toggleCampanhaStatus(cp)}
                            className={`relative inline-flex h-7 w-14 shrink-0 self-center items-center rounded-full border p-0 align-middle transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              cp.status === "ATIVO"
                                ? "border-emerald-200 bg-emerald-100"
                                : "border-slate-300 bg-slate-200"
                            }`}
                          >
                            <span
                              aria-hidden="true"
                              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition ${
                                cp.status === "ATIVO" ? "translate-x-8" : "translate-x-1"
                              } ${campStatusLoadingId === cp.id ? "animate-pulse" : ""}`}
                            />
                          </button>
                          {cp.status === "ENCERRADO" && (
                            <button className="campanha-icon-btn" title="Relatorio" aria-label="Abrir relatorio" onClick={() => openCampanhaRelatorio(cp)}>{I.rpt}</button>
                          )}
                          <button className="campanha-icon-btn" title="Ver link/QR" aria-label="Abrir link e QR" onClick={() => openCampanha("qr", cp)}>{I.link}</button>
                          <button className="campanha-icon-btn" title="Copiar link publico" aria-label="Copiar link publico" onClick={async () => { try { await copyText(cp.public_url); } catch (err) { setCampErr(err.message); } }}>{I.copy}</button>
                          <button className="campanha-icon-btn" title="Editar campanha" aria-label="Editar campanha" onClick={() => openCampanha("edit", cp)}>{I.edit}</button>
                          <button className="campanha-icon-btn danger" title="Excluir campanha" aria-label="Excluir campanha" onClick={() => openCampanha("delete", cp)}>{I.del}</button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
                <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between" aria-label="Paginacao de campanhas">
                  <div className="text-sm text-slate-600">
                    Mostrando {campPageStart + 1}-{Math.min(campPageEnd, campanhasFiltradas.length)} de {campanhasFiltradas.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" disabled={campCurrentPage <= 1} onClick={() => setCampPage((p) => Math.max(1, p - 1))} className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
                      Anterior
                    </button>
                    <span className="text-sm font-medium text-slate-600">Pagina {campCurrentPage} de {campTotalPages}</span>
                    <button type="button" disabled={campCurrentPage >= campTotalPages} onClick={() => setCampPage((p) => Math.min(campTotalPages, p + 1))} className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
                      Proxima
                    </button>
                  </div>
                </div>
              </>
            )
          )}
        </section>
      );
    }
    if (section === "comparar-campanhas" && canEmp(user)) {
      const termoCmpEmpresa = cmpEmpresaBusca.trim().toLowerCase();
      const cmpEmpresaSugestoes = (cmpEmpresaBusca.trim()
        ? empresas.filter((emp) => (
          String(emp.company_name || "").toLowerCase().includes(termoCmpEmpresa)
          || String(emp.document_number || "").toLowerCase().includes(termoCmpEmpresa)
        ))
        : empresas
      ).slice(0, 8);
      const campanhasDaEmpresa = cmpEmpresaFiltro
        ? campanhas.filter((cp) => String(cp.empresa) === String(cmpEmpresaFiltro))
        : [];
      const campanhaA = campanhas.find((cp) => String(cp.id) === String(cmpCamp1));
      const campanhaB = campanhas.find((cp) => String(cp.id) === String(cmpCamp2));
      const leftOverall = cmpResult?.left?.overall?.summary || {};
      const rightOverall = cmpResult?.right?.overall?.summary || {};
      const leftDomains = cmpResult?.left?.overall?.domains || [];
      const rightDomains = cmpResult?.right?.overall?.domains || [];
      const rightDomainByKey = Object.fromEntries((rightDomains || []).map((d) => [d.key, d]));
      const leftSteps = cmpResult?.left?.overall?.steps || [];
      const rightSteps = cmpResult?.right?.overall?.steps || [];
      const rightStepByKey = Object.fromEntries((rightSteps || []).map((s) => [s.key, s]));
      return (
        <section className="admin-panel">
          <div className="setor-hero">
            <div>
              <h2>Comparar Campanhas</h2>
              <p>Selecione campanhas para comparar resultados e indicadores.</p>
            </div>
          </div>
          <section className="config-card">
            <form onSubmit={submitCompararCampanhas} className="config-form-grid">
              <div className="config-full-row">
                <label htmlFor="cmp-empresa-search">Empresa</label>
                <div className="relative w-full">
                  <input
                    id="cmp-empresa-search"
                    placeholder="Buscar empresa..."
                    autoComplete="off"
                    className="w-full"
                    value={cmpEmpresaBusca}
                    onFocus={() => setCmpEmpresaMenuOpen(true)}
                    onBlur={() => setTimeout(() => setCmpEmpresaMenuOpen(false), 120)}
                    onChange={(e) => { onCmpEmpresaBuscaChange(e.target.value); setCmpEmpresaMenuOpen(true); }}
                  />
                  {cmpEmpresaMenuOpen && (
                    <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                      {cmpEmpresaSugestoes.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-500">Nenhuma empresa encontrada.</div>
                      ) : (
                        cmpEmpresaSugestoes.map((emp) => (
                          <button
                            key={`cmp-empresa-opt-${emp.id}`}
                            type="button"
                            className="flex w-full flex-col items-start rounded-lg bg-transparent px-3 py-2 text-left transition hover:bg-transparent focus:bg-transparent active:bg-transparent"
                            onMouseDown={(ev) => ev.preventDefault()}
                            onClick={() => selectCmpEmpresaBuscaOption(emp)}
                          >
                            <span className="text-sm font-medium text-slate-800">{emp.company_name}</span>
                            <span className="text-xs text-slate-500">{emp.document_number || "Sem documento"}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label>Campanha 1</label>
                <select value={cmpCamp1} onChange={(e) => { setCmpCamp1(e.target.value); setCmpErr(""); setCmpSubmitted(false); }} disabled={!cmpEmpresaFiltro}>
                  <option value="">{cmpEmpresaFiltro ? "Selecione" : "Selecione uma empresa primeiro"}</option>
                  {campanhasDaEmpresa.map((cp) => (
                    <option key={`cmp-c1-${cp.id}`} value={cp.id}>{cp.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Campanha 2</label>
                <select value={cmpCamp2} onChange={(e) => { setCmpCamp2(e.target.value); setCmpErr(""); setCmpSubmitted(false); }} disabled={!cmpEmpresaFiltro}>
                  <option value="">{cmpEmpresaFiltro ? "Selecione" : "Selecione uma empresa primeiro"}</option>
                  {campanhasDaEmpresa.map((cp) => (
                    <option key={`cmp-c2-${cp.id}`} value={cp.id}>{cp.title}</option>
                  ))}
                </select>
              </div>
              {cmpErr && <p className="error config-full-row">{cmpErr}</p>}
              <div className="config-actions config-full-row">
                <button type="submit" disabled={cmpLoading || !cmpEmpresaFiltro || campanhasDaEmpresa.length < 2}>{cmpLoading ? "Comparando..." : "Comparar"}</button>
              </div>
            </form>
          </section>

          {cmpSubmitted && campanhaA && campanhaB && cmpResult && (
            <section className="config-card">
              <div className="config-card-header">
                <h2>Comparacao selecionada</h2>
                <p>Setas mostram o que melhorou (↑) ou piorou (↓) da Campanha 1 para a Campanha 2.</p>
              </div>
              <div className="compare-summary-grid">
                <article className="compare-summary-card">
                  <h3>Resultado Geral (media / 5)</h3>
                  <div className="compare-summary-main">
                    <strong>{fmtScore(leftOverall.company_mean_score)}</strong>
                    <span className="compare-arrow-label">→</span>
                    <strong>{fmtScore(rightOverall.company_mean_score)}</strong>
                    <span className={`compare-delta ${cmpDirection(rightOverall.company_mean_score, leftOverall.company_mean_score)}`}>
                      {cmpDirection(rightOverall.company_mean_score, leftOverall.company_mean_score) === "up" ? "↑" : cmpDirection(rightOverall.company_mean_score, leftOverall.company_mean_score) === "down" ? "↓" : "→"}{" "}
                      {cmpStatusText(rightOverall.company_mean_score, leftOverall.company_mean_score)}
                    </span>
                  </div>
                </article>
                <article className="compare-summary-card">
                  <h3>Amostra respondente</h3>
                  <div className="compare-summary-main">
                    <strong>{Number(leftOverall.completed_responses || 0)}</strong>
                    <span className="compare-arrow-label">→</span>
                    <strong>{Number(rightOverall.completed_responses || 0)}</strong>
                    <span className={`compare-delta ${cmpDirection(rightOverall.completed_responses, leftOverall.completed_responses)}`}>
                      {cmpDirection(rightOverall.completed_responses, leftOverall.completed_responses) === "up" ? "↑" : cmpDirection(rightOverall.completed_responses, leftOverall.completed_responses) === "down" ? "↓" : "→"}{" "}
                      {cmpStatusText(rightOverall.completed_responses, leftOverall.completed_responses)}
                    </span>
                  </div>
                </article>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Indicador</th>
                      <th>{campanhaA.title}</th>
                      <th>{campanhaB.title}</th>
                      <th>Variacao</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Media geral (0-5)</td>
                      <td>{fmtScore(leftOverall.company_mean_score)}</td>
                      <td>{fmtScore(rightOverall.company_mean_score)}</td>
                      <td className={`compare-delta ${cmpDirection(rightOverall.company_mean_score, leftOverall.company_mean_score)}`}>
                        {cmpDirection(rightOverall.company_mean_score, leftOverall.company_mean_score) === "up" ? "↑" : cmpDirection(rightOverall.company_mean_score, leftOverall.company_mean_score) === "down" ? "↓" : "→"} {fmtScore(Math.abs(cmpDiff(rightOverall.company_mean_score, leftOverall.company_mean_score)))}
                      </td>
                    </tr>
                    <tr>
                      <td>Percentual medio</td>
                      <td>{fmtPct(leftOverall.company_mean_percent)}</td>
                      <td>{fmtPct(rightOverall.company_mean_percent)}</td>
                      <td className={`compare-delta ${cmpDirection(rightOverall.company_mean_percent, leftOverall.company_mean_percent)}`}>
                        {cmpDirection(rightOverall.company_mean_percent, leftOverall.company_mean_percent) === "up" ? "↑" : cmpDirection(rightOverall.company_mean_percent, leftOverall.company_mean_percent) === "down" ? "↓" : "→"} {fmtPct(Math.abs(cmpDiff(rightOverall.company_mean_percent, leftOverall.company_mean_percent)))}
                      </td>
                    </tr>
                    <tr>
                      <td>Avaliacoes concluidas</td>
                      <td>{Number(leftOverall.completed_responses || 0)}</td>
                      <td>{Number(rightOverall.completed_responses || 0)}</td>
                      <td className={`compare-delta ${cmpDirection(rightOverall.completed_responses, leftOverall.completed_responses)}`}>
                        {cmpDirection(rightOverall.completed_responses, leftOverall.completed_responses) === "up" ? "↑" : cmpDirection(rightOverall.completed_responses, leftOverall.completed_responses) === "down" ? "↓" : "→"} {Math.abs(cmpDiff(rightOverall.completed_responses, leftOverall.completed_responses))}
                      </td>
                    </tr>
                    {leftDomains.map((d) => {
                      const other = rightDomainByKey[d.key] || {};
                      const dir = cmpDirection(other.avg_score, d.avg_score);
                      const domainName = questionarioBlockName(d) || d.domain || d.label || d.key || "Bloco";
                      return (
                        <tr key={`cmp-domain-${d.key}`}>
                          <td>{domainName}</td>
                          <td>{fmtScore(d.avg_score)} | {fmtPct(d.percent)}</td>
                          <td>{fmtScore(other.avg_score)} | {fmtPct(other.percent)}</td>
                          <td className={`compare-delta ${dir}`}>
                            {dir === "up" ? "↑" : dir === "down" ? "↓" : "→"} {cmpStatusText(other.avg_score, d.avg_score)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="compare-step-blocks">
                {leftSteps.map((step) => {
                  const otherStep = rightStepByKey[step.key] || {};
                  const otherQuestionsByField = Object.fromEntries(((otherStep.questions || [])).map((q) => [q.field, q]));
                  const improved = [];
                  const worsened = [];
                  const stable = [];
                  (step.questions || []).forEach((q, idx) => {
                    const field = q.field || `q${idx + 1}`;
                    const q2 = otherQuestionsByField[field] || {};
                    const dir = cmpDirection(q2.avg_score, q.avg_score);
                    const item = {
                      field,
                      question: q.question || field,
                      leftScore: q.avg_score,
                      rightScore: q2.avg_score,
                      leftPercent: q.percent,
                      rightPercent: q2.percent,
                      dir,
                    };
                    if (dir === "up") improved.push(item);
                    else if (dir === "down") worsened.push(item);
                    else stable.push(item);
                  });

                  return (
                    <section key={`cmp-step-${step.key}`} className="compare-step-card">
                      <div className="compare-step-header">
                        <div>
                          <h3>{questionarioBlockName(step)}</h3>
                          <p>
                            Bloco do questionario • {cmpStatusText(otherStep.avg_score, step.avg_score)} no resultado do bloco
                          </p>
                        </div>
                        <div className={`compare-step-summary ${cmpDirection(otherStep.avg_score, step.avg_score)}`}>
                          <strong>{fmtScore(step.avg_score)} → {fmtScore(otherStep.avg_score)}</strong>
                          <span>
                            {cmpDirection(otherStep.avg_score, step.avg_score) === "up" ? "↑" : cmpDirection(otherStep.avg_score, step.avg_score) === "down" ? "↓" : "→"}{" "}
                            {fmtScore(Math.abs(cmpDiff(otherStep.avg_score, step.avg_score)))}
                          </span>
                        </div>
                      </div>

                      <div className="compare-step-columns">
                        <div className="compare-step-list improved">
                          <h4>Melhoraram ({improved.length})</h4>
                          {improved.length === 0 ? (
                            <p className="empty-state">Nenhuma pergunta melhorou.</p>
                          ) : (
                            <ul>
                              {improved.map((item) => (
                                <li key={`imp-${step.key}-${item.field}`}>
                                  <span>{item.question}</span>
                                  <b>↑ {fmtScore(item.leftScore)} → {fmtScore(item.rightScore)}</b>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div className="compare-step-list worsened">
                          <h4>Pioraram ({worsened.length})</h4>
                          {worsened.length === 0 ? (
                            <p className="empty-state">Nenhuma pergunta piorou.</p>
                          ) : (
                            <ul>
                              {worsened.map((item) => (
                                <li key={`wor-${step.key}-${item.field}`}>
                                  <span>{item.question}</span>
                                  <b>↓ {fmtScore(item.leftScore)} → {fmtScore(item.rightScore)}</b>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>

                      {stable.length > 0 && (
                        <details className="compare-step-stable">
                          <summary>Estaveis ({stable.length})</summary>
                          <ul>
                            {stable.map((item) => (
                              <li key={`stb-${step.key}-${item.field}`}>
                                <span>{item.question}</span>
                                <b>→ {fmtScore(item.leftScore)} → {fmtScore(item.rightScore)}</b>
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </section>
                  );
                })}
              </div>
            </section>
          )}
        </section>
      );
    }
    if (section === "canal-denuncias" && canEmp(user)) {
      const termoDenEmpresa = denEmpresaBusca.trim().toLowerCase();
      const denEmpresaSugestoes = (denEmpresaBusca.trim()
        ? empresas.filter((emp) => (
          String(emp.company_name || "").toLowerCase().includes(termoDenEmpresa)
          || String(emp.document_number || "").toLowerCase().includes(termoDenEmpresa)
        ))
        : empresas
      ).slice(0, 8);
      return (
        <section className="admin-panel">
          <div className="setor-hero">
            <div>
              <h2>Canal de Denuncias</h2>
              <p>Gere um link unico para a empresa compartilhar com os colaboradores.</p>
            </div>
          </div>

          <section className="config-card">
            <div className="config-card-header">
              <h2>Gerar Link</h2>
              <p>Selecione a empresa e gere/copiei o link do canal de denuncias.</p>
            </div>
            <div className="config-form-grid">
              <div className="config-full-row">
                <label htmlFor="den-empresa-search">Empresa</label>
                <div className="relative w-full">
                  <input
                    id="den-empresa-search"
                    placeholder="Buscar empresa..."
                    autoComplete="off"
                    className="w-full"
                    value={denEmpresaBusca}
                    onFocus={() => setDenEmpresaMenuOpen(true)}
                    onBlur={() => setTimeout(() => setDenEmpresaMenuOpen(false), 120)}
                    onChange={(e) => { onDenEmpresaBuscaChange(e.target.value); setDenEmpresaMenuOpen(true); }}
                  />
                  {denEmpresaMenuOpen && (
                    <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                      {denEmpresaSugestoes.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-500">Nenhuma empresa encontrada.</div>
                      ) : (
                        denEmpresaSugestoes.map((emp) => (
                          <button
                            key={`den-empresa-opt-${emp.id}`}
                            type="button"
                            className="flex w-full flex-col items-start rounded-lg bg-transparent px-3 py-2 text-left transition hover:bg-transparent focus:bg-transparent active:bg-transparent"
                            onMouseDown={(ev) => ev.preventDefault()}
                            onClick={() => selectDenEmpresaBuscaOption(emp)}
                          >
                            <span className="text-sm font-medium text-slate-800">{emp.company_name}</span>
                            <span className="text-xs text-slate-500">{emp.document_number || "Sem documento"}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
              {denErr && <p className="error config-full-row">{denErr}</p>}
              <div className="config-actions config-full-row">
                <button type="button" onClick={() => loadOrGenerateDenunciaLink(false)} disabled={!denEmpresaFiltro || denLoad}>
                  {denLoad ? "Carregando..." : "Gerar / Buscar link"}
                </button>
                <button type="button" className="secondary" onClick={() => openRegenerateLinkConfirm("denuncia")} disabled={!denEmpresaFiltro || denLoad}>
                  Regenerar link
                </button>
              </div>
            </div>
          </section>

          {denLinkData?.url && (
            <section className="config-card">
              <div className="config-card-header">
                <h2>Link gerado</h2>
                <p>{denLinkData.empresa_name}</p>
              </div>
              <div className="empresas-toolbar">
                <input value={denLinkData.url} readOnly />
                <div className="empresas-pagination-actions">
                  <button type="button" className="secondary" onClick={async () => { try { await copyText(denLinkData.url); } catch (err) { setDenErr(err.message); } }}>
                    Copiar
                  </button>
                  <button type="button" onClick={() => window.open(denLinkData.url, "_blank", "noopener,noreferrer")}>
                    Abrir
                  </button>
                </div>
              </div>
              {denErr && <p className="error">{denErr}</p>}
            </section>
          )}
        </section>
      );
    }
    if (section === "denuncias-empresa" && canEmp(user)) {
      const termoDenListEmpresa = denListEmpresaBusca.trim().toLowerCase();
      const denListEmpresaSugestoes = (denListEmpresaBusca.trim()
        ? empresas.filter((emp) => (
          String(emp.company_name || "").toLowerCase().includes(termoDenListEmpresa)
          || String(emp.document_number || "").toLowerCase().includes(termoDenListEmpresa)
        ))
        : empresas
      ).slice(0, 8);
      const denuncias = denListData?.results || [];
      const denunciasFiltradas = denListStatusFiltro === "TODAS"
        ? denuncias
        : denuncias.filter((d) => String(d.status || "") === denListStatusFiltro);
      return (
        <section className="admin-panel">
          <div className="setor-hero">
            <div>
              <h2>Denuncias por Empresa</h2>
              <p>Visualize as denuncias recebidas no canal por empresa.</p>
            </div>
            <div className="setor-hero-right">
              <label htmlFor="den-list-empresa-search">Empresa</label>
              <div className="relative w-full">
                <input
                  id="den-list-empresa-search"
                  placeholder="Buscar empresa..."
                  autoComplete="off"
                  className="w-full"
                  value={denListEmpresaBusca}
                  onFocus={() => setDenListEmpresaMenuOpen(true)}
                  onBlur={() => setTimeout(() => setDenListEmpresaMenuOpen(false), 120)}
                  onChange={(e) => { onDenListEmpresaBuscaChange(e.target.value); setDenListEmpresaMenuOpen(true); }}
                />
                {denListEmpresaMenuOpen && (
                  <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                    {denListEmpresaSugestoes.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-slate-500">Nenhuma empresa encontrada.</div>
                    ) : (
                      denListEmpresaSugestoes.map((emp) => (
                        <button
                          key={`den-list-empresa-opt-${emp.id}`}
                          type="button"
                          className="flex w-full flex-col items-start rounded-lg bg-transparent px-3 py-2 text-left transition hover:bg-transparent focus:bg-transparent active:bg-transparent"
                          onMouseDown={(ev) => ev.preventDefault()}
                          onClick={() => selectDenListEmpresaBuscaOption(emp)}
                        >
                          <span className="text-sm font-medium text-slate-800">{emp.company_name}</span>
                          <span className="text-xs text-slate-500">{emp.document_number || "Sem documento"}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="admin-header">
            <h2>Lista de denuncias</h2>
            <button type="button" onClick={loadDenunciasEmpresa} disabled={!denListEmpresaFiltro || denListLoad}>
              {denListLoad ? "Carregando..." : "Carregar denuncias"}
            </button>
          </div>
          {denListErr && <p className="error">{denListErr}</p>}

          {denListData && (
            <section className="config-card denuncias-list-card">
              <div className="config-card-header">
                <h2>Denuncias recebidas</h2>
                <p>{denListData.empresa_name} • {Number(denListData.count || 0)} registro(s)</p>
              </div>
              <div className="empresas-toolbar">
                <div className="empresas-page-size">
                  <label>Status:</label>
                  <select value={denListStatusFiltro} onChange={(e) => setDenListStatusFiltro(e.target.value)}>
                    <option value="TODAS">Todas</option>
                    <option value="ABERTA">Abertas</option>
                    <option value="EM_ANALISE">Em analise</option>
                    <option value="RESOLVIDA">Resolvidas</option>
                  </select>
                </div>
              </div>
              {denunciasFiltradas.length === 0 ? (
                <p className="empty-state">Nenhuma denuncia registrada para esta empresa.</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Data</th>
                        <th>Origem</th>
                        <th>Status</th>
                        <th>Vinculo</th>
                        <th>Identificacao</th>
                        <th>Tipo</th>
                        <th>GHE</th>
                        <th>Funcao</th>
                        <th>Devolutiva</th>
                        <th>Acoes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {denunciasFiltradas.map((d) => (
                        <tr key={`den-admin-${d.id}`}>
                          <td>{d.id}</td>
                          <td>{fDate(d.created_at)}</td>
                          <td>{d.origem_label || (d.origem === "TOTEM" ? "Totem" : "Link de denuncia")}</td>
                          <td>
                            <span className={`denuncia-status-pill ${String(d.status || "").toLowerCase()}`}>
                              {d.status === "EM_ANALISE" ? "Em analise" : d.status === "RESOLVIDA" ? "Resolvida" : "Aberta"}
                            </span>
                          </td>
                          <td>{d.possui_vinculo ? "Sim" : "Nao"}</td>
                          <td title={d.contato_identificacao || ""}>
                            {d.deseja_identificar ? (d.contato_identificacao || "Sim") : "Nao"}
                          </td>
                          <td>{d.tipo_label || "-"}</td>
                          <td>{d.ghe_name || "-"}</td>
                          <td>{d.cargo_name || "-"}</td>
                          <td title={d.email_devolutiva || ""}>
                            {d.aceita_devolutiva ? (d.email_devolutiva || "Sim") : "Nao"}
                          </td>
                          <td className="actions">
                              <button
                              type="button"
                              className="campanha-icon-btn"
                              title="Ver relato"
                              aria-label="Ver relato"
                              onClick={() => setDenViewModal(d)}
                            >
                              {I.rpt}
                            </button>
                            <button
                              type="button"
                              className="campanha-icon-btn"
                              title="Adicionar atualizacao"
                              aria-label="Adicionar atualizacao"
                              onClick={() => openDenunciaAtualizacaoModal(d)}
                            >
                              {I.edit}
                            </button>
                            <button
                              type="button"
                              className="campanha-icon-btn"
                              title="Historico de atualizacoes"
                              aria-label="Historico de atualizacoes"
                              onClick={() => setDenHistModal(d)}
                            >
                              {I.cad}
                            </button>
                            {d.status !== "RESOLVIDA" && (
                              <button
                                type="button"
                                className="campanha-icon-btn"
                                title="Marcar como resolvida"
                                aria-label="Marcar como resolvida"
                                onClick={() => openResolveDenunciaModal(d)}
                              >
                                {I.power}
                              </button>
                            )}
                            {d.status === "ABERTA" && (
                              <button
                                type="button"
                                className="campanha-icon-btn"
                                title="Marcar em analise"
                                aria-label="Marcar em analise"
                                onClick={() => openAnalyzeDenunciaModal(d)}
                              >
                                {I.cmp}
                              </button>
                            )}
                            {d.evidencia_url ? (
                              <>
                                <a
                                  href={d.evidencia_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="campanha-icon-btn"
                                  title="Abrir evidencia"
                                  aria-label="Abrir evidencia"
                                >
                                  {I.img}
                                </a>
                              </>
                            ) : (
                              <span className="denuncia-no-evidence">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </section>
      );
    }
    if (section === "totem" && canEmp(user)) {
      return (
        <section className="admin-panel">
          <div className="setor-hero">
            <div>
              <h2>Totem</h2>
              <p>Configure e gerencie o modo totem.</p>
            </div>
            <div className="setor-hero-right">
              <label htmlFor="totem-empresa-search">Empresa</label>
              <input
                id="totem-empresa-search"
                list="totem-empresas-list"
                placeholder="Digite para buscar"
                value={totemEmpresaBusca}
                onChange={(e) => onTotemEmpresaBuscaChange(e.target.value)}
              />
              <datalist id="totem-empresas-list">
                {empresas.map((emp) => (
                  <option key={`totem-emp-${emp.id}`} value={`${emp.id} - ${emp.company_name}`} />
                ))}
              </datalist>
            </div>
          </div>

          <section className="config-card">
            <div className="config-card-header">
              <h2>Link do Totem</h2>
              <p>Selecione a empresa e gere o link para uso no totem.</p>
            </div>
            <div className="config-form-grid">
              {totemErr && <p className="error config-full-row">{totemErr}</p>}
              <div className="config-actions config-full-row">
                <button type="button" onClick={() => loadOrGenerateTotemLink(false)} disabled={!totemEmpresaFiltro || totemLoad}>
                  {totemLoad ? "Carregando..." : "Gerar / Buscar link"}
                </button>
                <button type="button" className="secondary" onClick={() => openRegenerateLinkConfirm("totem")} disabled={!totemEmpresaFiltro || totemLoad}>
                  Regenerar link
                </button>
              </div>
            </div>
          </section>

          {!totemEmpresaFiltro && <p className="empty-state">Selecione uma empresa para continuar.</p>}

          {totemLinkData?.url && (
            <section className="config-card">
              <div className="config-card-header">
                <h2>Link gerado</h2>
                <p>{totemLinkData.empresa_name}</p>
              </div>
              <div className="empresas-toolbar">
                <input value={totemLinkData.url} readOnly />
                <div className="empresas-pagination-actions">
                  <button type="button" className="secondary" onClick={async () => { try { await copyText(totemLinkData.url); } catch (err) { setTotemErr(err.message); } }}>
                    Copiar
                  </button>
                  <button type="button" onClick={() => window.open(totemLinkData.url, "_blank", "noopener,noreferrer")}>
                    Abrir
                  </button>
                </div>
              </div>
              {totemErr && <p className="error">{totemErr}</p>}
            </section>
          )}
        </section>
      );
    }
    return <section className="placeholder-card"><h2>Modulo</h2><p>Em preparacao.</p></section>;
  }

  if (isPublicTotem) {
    const totemGhes = totemPubData?.ghes || [];
    const totemCargos = totemPubData?.cargos || [];
    const totemCargosFiltrados = denGhe ? totemCargos.filter((c) => (c.ghe_ids || []).includes(Number(denGhe))) : [];
    return (
      <main className="app-shell public-shell">
        {toastViewport}
        <section className="card public-card totem-public-card">
          <h1>Totem de Atendimento</h1>
          <p className="subtitle">
            {totemPubData?.empresa_name ? `Empresa: ${totemPubData.empresa_name}` : "Canal publico de atendimento"}
          </p>

          {totemPubLoad && <LoadingSpinner label="Carregando totem..." />}
          {totemPubErr && <p className="error">{totemPubErr}</p>}

          {!totemPubLoad && totemPubData && !totemConsentAccepted && (
            <div className="totem-consent-card">
              <h2>Termo de consentimento</h2>
              <p>
                Ao prosseguir, voce concorda em utilizar este totem para registrar informacoes de forma responsavel. Seus dados
                serao tratados com confidencialidade, conforme a finalidade do atendimento.
              </p>
              <p>
                Caso escolha seguir com uma denuncia ou pedido de ajuda, as informacoes enviadas poderao ser analisadas pela equipe
                responsavel da empresa.
              </p>
              <div className="totem-actions-row">
                <button type="button" onClick={() => { setTotemConsentAccepted(true); setTotemPubActionMsg(""); }}>
                  Aceito
                </button>
              </div>
            </div>
          )}

          {!totemPubLoad && totemPubData && totemConsentAccepted && totemPubScreen === "menu" && (
            <div className="totem-menu-grid">
              <button type="button" className="totem-menu-btn" onClick={() => { setTotemPubScreen("denuncia"); setTotemPubActionMsg(""); setTotemDenErr(""); setTotemDenOk(""); }}>
                <span className="totem-menu-title">Fazer denuncia</span>
                <span className="totem-menu-desc">Registrar uma denuncia com sigilo.</span>
              </button>
              <button type="button" className="totem-menu-btn" onClick={() => setTotemPubActionMsg("Fluxo de registro de humor sera conectado aqui.")}>
                <span className="totem-menu-title">Registrar humor</span>
                <span className="totem-menu-desc">Informar como voce esta se sentindo hoje.</span>
              </button>
              <button type="button" className="totem-menu-btn" onClick={() => setTotemPubActionMsg("Fluxo de pedido de ajuda sera conectado aqui.")}>
                <span className="totem-menu-title">Pedido de ajuda</span>
                <span className="totem-menu-desc">Solicitar apoio ou acolhimento.</span>
              </button>
            </div>
          )}

          {!totemPubLoad && totemPubData && totemConsentAccepted && totemPubScreen === "denuncia" && (
            <form onSubmit={submitDenunciaTotemPublica} className="denuncia-form totem-denuncia-form">
              <div className="denuncia-intro-box">
                <div className="denuncia-intro-title">Denuncia pelo Totem</div>
                <p>
                  Preencha as informacoes abaixo para registrar sua denuncia para <strong>{totemPubData.empresa_name}</strong>.
                </p>
              </div>

              <div className="denuncia-question">
                <label>1. Voce possui vinculo com a empresa {totemPubData.empresa_name}?</label>
                <div className="denuncia-radio-row">
                  <label className="checkbox-line"><input type="radio" name="totem-den-vinculo" checked={denVinculo === "SIM"} onChange={() => setDenVinculo("SIM")} />Sim</label>
                  <label className="checkbox-line"><input type="radio" name="totem-den-vinculo" checked={denVinculo === "NAO"} onChange={() => setDenVinculo("NAO")} />Nao</label>
                </div>
              </div>

              <div className="denuncia-question">
                <label>2. Voce gostaria de se identificar? Lembre-se que essa informacao e opcional!</label>
                <div className="denuncia-radio-row">
                  <label className="checkbox-line"><input type="radio" name="totem-den-identificar" checked={denIdentificar === "SIM"} onChange={() => setDenIdentificar("SIM")} />Sim</label>
                  <label className="checkbox-line"><input type="radio" name="totem-den-identificar" checked={denIdentificar === "NAO"} onChange={() => { setDenIdentificar("NAO"); setDenContatoIdentificacao(""); }} />Nao</label>
                </div>
                {denIdentificar === "SIM" && (
                  <input
                    type="text"
                    placeholder="Informe seu e-mail ou WhatsApp"
                    value={denContatoIdentificacao}
                    onChange={(e) => setDenContatoIdentificacao(e.target.value)}
                  />
                )}
              </div>

              <div className="denuncia-question">
                <label>GHE</label>
                <select value={denGhe} onChange={(e) => { setDenGhe(e.target.value); setDenCargo(""); }}>
                  <option value="">Selecione um GHE (opcional)</option>
                  {totemGhes.map((g) => <option key={`totem-den-ghe-${g.id}`} value={g.id}>{g.name}</option>)}
                </select>
              </div>

              <div className="denuncia-question">
                <label>Funcao</label>
                <select value={denCargo} onChange={(e) => setDenCargo(e.target.value)} disabled={!denGhe}>
                  <option value="">{denGhe ? "Selecione uma funcao" : "Selecione um GHE primeiro"}</option>
                  {totemCargosFiltrados.map((c) => <option key={`totem-den-cargo-${c.id}`} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="denuncia-question">
                <label>Tipo da denuncia</label>
                <select value={denTipo} onChange={(e) => setDenTipo(e.target.value)} required>
                  <option value="">Selecione o tipo</option>
                  {DENUNCIA_TIPOS.map(([value, label]) => <option key={`totem-den-tipo-${value}`} value={value}>{label}</option>)}
                </select>
              </div>

              <div className="denuncia-question">
                <label>3. Relate aqui a sua denuncia com todas as informacoes disponiveis.</label>
                <textarea
                  className="text-area denuncia-textarea"
                  placeholder="Descreva em detalhes o que aconteceu..."
                  value={denRelato}
                  onChange={(e) => setDenRelato(e.target.value)}
                  required
                />
              </div>

              <div className="denuncia-question">
                <label>5. Existem testemunhas?</label>
                <textarea
                  className="text-area"
                  placeholder="Informe nomes, cargos ou formas de contato, se estiverem disponiveis."
                  value={denTestemunhas}
                  onChange={(e) => setDenTestemunhas(e.target.value)}
                />
              </div>

              <div className="denuncia-question">
                <label>6. Voce aceita receber uma devolutiva para a denuncia realizada? Se sim, insira o seu e-mail:</label>
                <div className="denuncia-radio-row">
                  <label className="checkbox-line"><input type="radio" name="totem-den-devolutiva" checked={denAceitaDevolutiva === "SIM"} onChange={() => setDenAceitaDevolutiva("SIM")} />Sim</label>
                  <label className="checkbox-line"><input type="radio" name="totem-den-devolutiva" checked={denAceitaDevolutiva === "NAO"} onChange={() => { setDenAceitaDevolutiva("NAO"); setDenEmailDevolutiva(""); }} />Nao</label>
                </div>
                <input
                  type="email"
                  placeholder="seuemail@exemplo.com"
                  value={denEmailDevolutiva}
                  onChange={(e) => setDenEmailDevolutiva(e.target.value)}
                  disabled={denAceitaDevolutiva !== "SIM"}
                />
              </div>

              {totemDenOk && <p className="ok-message">{totemDenOk}</p>}
              {totemDenErr && <p className="error">{totemDenErr}</p>}

              <div className="totem-actions-row totem-denuncia-actions">
                <button type="button" className="secondary" onClick={() => { setTotemPubScreen("menu"); setTotemPubActionMsg(""); setTotemDenErr(""); }}>
                  Voltar ao menu
                </button>
                <button type="submit" disabled={totemDenSaving}>
                  {totemDenSaving ? "Enviando..." : "Enviar denuncia"}
                </button>
              </div>
            </form>
          )}

          {!!totemPubActionMsg && <p className="muted">{totemPubActionMsg}</p>}

          {!totemPubLoad && totemPubData && totemConsentAccepted && totemPubScreen === "menu" && (
            <div className="totem-actions-row">
              <button type="button" className="secondary" onClick={() => { setTotemConsentAccepted(false); setTotemPubActionMsg(""); setTotemPubScreen("menu"); }}>
                Voltar
              </button>
            </div>
          )}
        </section>
      </main>
    );
  }

  if (isPublicCanalDenuncias) {
    const denGhes = denPubData?.ghes || [];
    const denCargos = denPubData?.cargos || [];
    const denCargosFiltrados = denGhe ? denCargos.filter((c) => (c.ghe_ids || []).includes(Number(denGhe))) : [];
    return (
      <main className="app-shell public-shell">
        {toastViewport}
        <section className="card public-card denuncia-public-card">
          <h1>Canal de Denuncias</h1>
          <p className="subtitle">Envie sua denuncia com sigilo. A identificacao e opcional.</p>

          {denPubLoad && <LoadingSpinner label="Carregando canal de denuncias..." />}
          {denPubErr && <p className="error">{denPubErr}</p>}

          {!denPubLoad && denPubData && (
            <form onSubmit={submitDenunciaPublica} className="denuncia-form">
              <div className="denuncia-intro-box">
                <div className="denuncia-intro-title">Sobre este canal</div>
                <p>
                  Este e um canal de comunicacao disponibilizado para colaboradores e demais interessados que queiram relatar situacoes que violem a legislacao ou as normas internas da empresa <strong>{denPubData.empresa_name}</strong>. Podem ser encaminhadas denuncias relacionadas a assedio moral, sexual ou organizacional, ma gestao de mudancas, falta de clareza nas funcoes, ausencia de recompensas ou reconhecimento, carencia de suporte no ambiente de trabalho, baixa autonomia, sensacao de injustica organizacional, exposicao a eventos traumaticos, sobrecarga ou subcarga de tarefas, conflitos interpessoais, isolamento no trabalho remoto, dificuldades de comunicacao interna, bem como casos de discriminacao por raca, cor, religiao, sexo, condicao fisica ou social.
                </p>
                <p className="denuncia-intro-highlight">O objetivo e garantir um ambiente de trabalho seguro, saudavel e respeitoso para todos.</p>
              </div>

              <div className="denuncia-question">
                <label>1. Voce possui vinculo com a empresa {denPubData.empresa_name}?</label>
                <div className="denuncia-radio-row">
                  <label className="checkbox-line"><input type="radio" name="den-vinculo" checked={denVinculo === "SIM"} onChange={() => setDenVinculo("SIM")} />Sim</label>
                  <label className="checkbox-line"><input type="radio" name="den-vinculo" checked={denVinculo === "NAO"} onChange={() => setDenVinculo("NAO")} />Nao</label>
                </div>
              </div>

              <div className="denuncia-question">
                <label>2. Voce gostaria de se identificar? Lembre-se que essa informacao e opcional!</label>
                <div className="denuncia-radio-row">
                  <label className="checkbox-line"><input type="radio" name="den-identificar" checked={denIdentificar === "SIM"} onChange={() => setDenIdentificar("SIM")} />Sim</label>
                  <label className="checkbox-line"><input type="radio" name="den-identificar" checked={denIdentificar === "NAO"} onChange={() => { setDenIdentificar("NAO"); setDenContatoIdentificacao(""); }} />Nao</label>
                </div>
                {denIdentificar === "SIM" && (
                  <input
                    type="text"
                    placeholder="Informe seu e-mail ou WhatsApp"
                    value={denContatoIdentificacao}
                    onChange={(e) => setDenContatoIdentificacao(e.target.value)}
                  />
                )}
              </div>

              <div className="denuncia-question">
                <label>GHE</label>
                <select value={denGhe} onChange={(e) => { setDenGhe(e.target.value); setDenCargo(""); }}>
                  <option value="">Selecione um GHE (opcional)</option>
                  {denGhes.map((g) => <option key={`den-ghe-${g.id}`} value={g.id}>{g.name}</option>)}
                </select>
              </div>

              <div className="denuncia-question">
                <label>Funcao</label>
                <select value={denCargo} onChange={(e) => setDenCargo(e.target.value)} disabled={!denGhe}>
                  <option value="">{denGhe ? "Selecione uma funcao" : "Selecione um GHE primeiro"}</option>
                  {denCargosFiltrados.map((c) => <option key={`den-cargo-${c.id}`} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="denuncia-question">
                <label>Tipo da denuncia</label>
                <select value={denTipo} onChange={(e) => setDenTipo(e.target.value)} required>
                  <option value="">Selecione o tipo</option>
                  {DENUNCIA_TIPOS.map(([value, label]) => <option key={`den-tipo-${value}`} value={value}>{label}</option>)}
                </select>
              </div>

              <div className="denuncia-question">
                <label>3. Relate aqui a sua denuncia com todas as informacoes disponiveis.</label>
                <textarea
                  className="text-area denuncia-textarea"
                  placeholder="Descreva em detalhes o que aconteceu..."
                  value={denRelato}
                  onChange={(e) => setDenRelato(e.target.value)}
                  required
                />
              </div>

              <div className="denuncia-question">
                <label>4. Voce possui evidencias? Anexe no campo abaixo um arquivo contendo as evidencias.</label>
                <div className="denuncia-file-row">
                  <label className="secondary file-upload-btn">
                    Selecionar arquivo
                    <input
                      id="denuncia-evidencia-file"
                      type="file"
                      onChange={(e) => setDenArquivo(e.target.files?.[0] || null)}
                    />
                  </label>
                  <span className="denuncia-file-name">{denArquivo ? denArquivo.name : "Nenhum arquivo selecionado"}</span>
                </div>
                <small className="denuncia-file-help">Tamanho maximo do arquivo: 20 MB.</small>
              </div>

              <div className="denuncia-question">
                <label>5. Existem testemunhas?</label>
                <textarea
                  className="text-area"
                  placeholder="Informe nomes, cargos ou formas de contato, se estiverem disponiveis."
                  value={denTestemunhas}
                  onChange={(e) => setDenTestemunhas(e.target.value)}
                />
              </div>

              <div className="denuncia-question">
                <label>6. Voce aceita receber uma devolutiva para a denuncia realizada? Se sim, insira o seu e-mail:</label>
                <div className="denuncia-radio-row">
                  <label className="checkbox-line"><input type="radio" name="den-devolutiva" checked={denAceitaDevolutiva === "SIM"} onChange={() => setDenAceitaDevolutiva("SIM")} />Sim</label>
                  <label className="checkbox-line"><input type="radio" name="den-devolutiva" checked={denAceitaDevolutiva === "NAO"} onChange={() => { setDenAceitaDevolutiva("NAO"); setDenEmailDevolutiva(""); }} />Nao</label>
                </div>
                <input
                  type="email"
                  placeholder="seuemail@exemplo.com"
                  value={denEmailDevolutiva}
                  onChange={(e) => setDenEmailDevolutiva(e.target.value)}
                  disabled={denAceitaDevolutiva !== "SIM"}
                />
              </div>

              {denPubOk && <p className="ok-message">{denPubOk}</p>}
              {denPubErr && <p className="error">{denPubErr}</p>}

              <div className="public-actions">
                <button type="submit" disabled={denPubSaving}>{denPubSaving ? "Enviando..." : "Enviar denuncia"}</button>
              </div>

              <div className="denuncia-thanks-note" aria-live="polite">
                <strong>A nossa equipe de Compliance agradece a sua denuncia.</strong>
                <p>Iremos analisar e apurar o seu relato e em breve entraremos em contato para demais esclarecimentos e tratativas.</p>
              </div>
            </form>
          )}
        </section>
      </main>
    );
  }

  if (isPublicQuestionario) {
    const refLabel = pubData?.evaluation_type === "SETOR" ? "Setor" : "GHE";
    const refs = pubData?.evaluation_type === "SETOR" ? (pubData?.setores || []) : (pubData?.ghes || []);
    const cargosOptions = publicCargoOptions();
    const step2Questions = pubData?.step2_questions || [];
    const step2Options = pubData?.step2_options || ["NUNCA", "RARAMENTE", "AS_VEZES", "FREQUENTEMENTE", "SEMPRE"];
    const step3Questions = pubData?.step3_questions || [];
    const step3Options = pubData?.step3_options || ["NUNCA", "RARAMENTE", "AS_VEZES", "FREQUENTEMENTE", "SEMPRE"];
    const step4Questions = pubData?.step4_questions || [];
    const step4Options = pubData?.step4_options || ["NUNCA", "RARAMENTE", "AS_VEZES", "FREQUENTEMENTE", "SEMPRE"];
    const step5Questions = pubData?.step5_questions || [];
    const step5Options = pubData?.step5_options || ["NUNCA", "RARAMENTE", "AS_VEZES", "FREQUENTEMENTE", "SEMPRE"];
    const step6Questions = pubData?.step6_questions || [];
    const step6Options = pubData?.step6_options || ["NUNCA", "RARAMENTE", "AS_VEZES", "FREQUENTEMENTE", "SEMPRE"];
    const step7Questions = pubData?.step7_questions || [];
    const step7Options = pubData?.step7_options || ["NUNCA", "RARAMENTE", "AS_VEZES", "FREQUENTEMENTE", "SEMPRE"];
    const step8Questions = pubData?.step8_questions || [];
    const step8Options = pubData?.step8_options || ["NUNCA", "RARAMENTE", "AS_VEZES", "FREQUENTEMENTE", "SEMPRE"];
    const step9Prompt = pubData?.step9_prompt || "Comentario adicional";
    const optionLabel = {
      NUNCA: "Nunca",
      RARAMENTE: "Raramente",
      AS_VEZES: "As vezes",
      FREQUENTEMENTE: "Frequentemente",
      SEMPRE: "Sempre",
    };

    return (
      <main className="app-shell public-shell">
        {toastViewport}
        <section className="card public-card">
          <h1>Questionario de Campanha</h1>
          {pubLoad && <LoadingSpinner label="Carregando..." />}
          {pubErr && <p className="error">{pubErr}</p>}
          {!pubLoad && pubData && (
            <>
              <p className="subtitle">{pubData.campaign?.title} | {pubData.empresa_name}</p>
              <div className="wizard-steps"><span className={pubStep === 1 ? "active" : ""}>Step 1</span><span className={pubStep === 2 ? "active" : ""}>Step 2</span><span className={pubStep === 3 ? "active" : ""}>Step 3</span><span className={pubStep === 4 ? "active" : ""}>Step 4</span><span className={pubStep === 5 ? "active" : ""}>Step 5</span><span className={pubStep === 6 ? "active" : ""}>Step 6</span><span className={pubStep === 7 ? "active" : ""}>Step 7</span><span className={pubStep === 8 ? "active" : ""}>Step 8</span><span className={pubStep === 9 ? "active" : ""}>Step 9</span></div>

              {pubStep === 1 && (
                <form onSubmit={submitPublicStep1} className="login-form">
                  <div className="info-block success">
                    <h3>✅ AVALIACAO VALIDADA</h3>
                    <p>Esta avaliacao integra uma campanha oficial. Seu CPF sera protegido por criptografia e utilizado exclusivamente para garantir que cada participante responda apenas uma vez. A empresa nao tera acesso ao seu CPF nem podera associar suas respostas a sua identidade.</p>
                  </div>

                  <div className="info-block neutral">
                    <h3>🔒 COMPROMISSO COM O ANONIMATO</h3>
                    <p>Todas as informacoes coletadas neste formulario sao totalmente confidenciais. Seus dados pessoais nao serao compartilhados com a empresa. As respostas serao utilizadas somente para analises estatisticas consolidadas, com o objetivo de contribuir para a melhoria do ambiente de trabalho.</p>
                    <p>O proposito desta avaliacao e compreender de forma mais ampla as condicoes de trabalho e identificar possiveis fatores de risco psicossocial que possam impactar a saude dos colaboradores, promovendo acoes de melhoria continua conforme previsto na NR 01.</p>
                  </div>

                  <div className="public-step1-grid">
                    <div className="public-field">
                      <label>CPF (obrigatorio)</label>
                      <input value={pubCpf} onChange={(e) => setPubCpf(e.target.value)} required />
                    </div>

                    <div className="public-field">
                      <label>Primeiro nome (opcional)</label>
                      <input value={pubNome} onChange={(e) => setPubNome(e.target.value)} />
                    </div>

                    <div className="public-field">
                      <label>Idade (obrigatorio)</label>
                      <input type="number" min="1" max="120" value={pubIdade} onChange={(e) => setPubIdade(e.target.value)} required />
                    </div>

                    <div className="public-field">
                      <label>Sexo</label>
                      <select value={pubSexo} onChange={(e) => setPubSexo(e.target.value)}>
                        <option value="">Selecione</option>
                        <option value="M">Masculino</option>
                        <option value="F">Feminino</option>
                        <option value="O">Outro</option>
                        <option value="N">Prefiro nao informar</option>
                      </select>
                    </div>

                    <div className="public-field">
                      <label>{refLabel} (obrigatorio)</label>
                      <select value={pubRef} onChange={(e) => onPublicRefChange(e.target.value)} required>
                        <option value="">Selecione</option>
                        {refs.map((r) => <option key={`pub-ref-${r.id}`} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>

                    <div className="public-field">
                      <label>Cargo (obrigatorio)</label>
                      <select value={pubCargo} onChange={(e) => setPubCargo(e.target.value)} disabled={!pubRef} required>
                        <option value="">{pubRef ? "Selecione" : `Selecione ${refLabel} primeiro`}</option>
                        {cargosOptions.map((c) => <option key={`pub-cargo-${c.id}`} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {pubOk && <p className="ok-message">{pubOk}</p>}
                  {pubErr && <p className="error">{pubErr}</p>}
                  <button disabled={pubSaving}>{pubSaving ? "Enviando..." : "Enviar Step 1"}</button>
                </form>
              )}

              {pubStep === 2 && (
                <form onSubmit={submitPublicStep2} className="login-form">
                  {step2Questions.map((question, idx) => {
                    const key = `q${idx + 1}`;
                    return (
                      <div key={`step2-q-${key}`} className="question-block">
                        <p>{question}</p>
                        <div className="radio-group">
                          {step2Options.map((opt) => (
                            <label key={`step2-${key}-${opt}`} className="radio-line">
                              <input type="radio" name={key} value={opt} checked={pubS2[key] === opt} onChange={(e) => setPublicStep2Answer(key, e.target.value)} />
                              {optionLabel[opt] || opt}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {pubErr && <p className="error">{pubErr}</p>}
                  <div className="public-actions"><button type="button" className="secondary" onClick={() => setPubStep(1)}>Voltar</button><button disabled={pubSaving}>{pubSaving ? "Enviando..." : "Enviar Step 2"}</button></div>
                </form>
              )}

              {pubStep === 3 && (
                <form onSubmit={submitPublicStep3} className="login-form">
                  {step3Questions.map((question, idx) => {
                    const key = `q${idx + 1}`;
                    return (
                      <div key={`step3-q-${key}`} className="question-block">
                        <p>{question}</p>
                        <div className="radio-group">
                          {step3Options.map((opt) => (
                            <label key={`step3-${key}-${opt}`} className="radio-line">
                              <input type="radio" name={`s3-${key}`} value={opt} checked={pubS3[key] === opt} onChange={(e) => setPublicStep3Answer(key, e.target.value)} />
                              {optionLabel[opt] || opt}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {pubErr && <p className="error">{pubErr}</p>}
                  <div className="public-actions"><button type="button" className="secondary" onClick={() => setPubStep(2)}>Voltar</button><button disabled={pubSaving}>{pubSaving ? "Enviando..." : "Enviar Step 3"}</button></div>
                </form>
              )}

              {pubStep === 4 && (
                <form onSubmit={submitPublicStep4} className="login-form">
                  {step4Questions.map((question, idx) => {
                    const key = `q${idx + 1}`;
                    return (
                      <div key={`step4-q-${key}`} className="question-block">
                        <p>{question}</p>
                        <div className="radio-group">
                          {step4Options.map((opt) => (
                            <label key={`step4-${key}-${opt}`} className="radio-line">
                              <input type="radio" name={`s4-${key}`} value={opt} checked={pubS4[key] === opt} onChange={(e) => setPublicStep4Answer(key, e.target.value)} />
                              {optionLabel[opt] || opt}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {pubErr && <p className="error">{pubErr}</p>}
                  <div className="public-actions"><button type="button" className="secondary" onClick={() => setPubStep(3)}>Voltar</button><button disabled={pubSaving}>{pubSaving ? "Enviando..." : "Enviar Step 4"}</button></div>
                </form>
              )}

              {pubStep === 5 && (
                <form onSubmit={submitPublicStep5} className="login-form">
                  {step5Questions.map((question, idx) => {
                    const key = `q${idx + 1}`;
                    return (
                      <div key={`step5-q-${key}`} className="question-block">
                        <p>{question}</p>
                        <div className="radio-group">
                          {step5Options.map((opt) => (
                            <label key={`step5-${key}-${opt}`} className="radio-line">
                              <input type="radio" name={`s5-${key}`} value={opt} checked={pubS5[key] === opt} onChange={(e) => setPublicStep5Answer(key, e.target.value)} />
                              {optionLabel[opt] || opt}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {pubErr && <p className="error">{pubErr}</p>}
                  <div className="public-actions"><button type="button" className="secondary" onClick={() => setPubStep(4)}>Voltar</button><button disabled={pubSaving}>{pubSaving ? "Enviando..." : "Enviar Step 5"}</button></div>
                </form>
              )}

              {pubStep === 6 && (
                <form onSubmit={submitPublicStep6} className="login-form">
                  {step6Questions.map((question, idx) => {
                    const key = `q${idx + 1}`;
                    return (
                      <div key={`step6-q-${key}`} className="question-block">
                        <p>{question}</p>
                        <div className="radio-group">
                          {step6Options.map((opt) => (
                            <label key={`step6-${key}-${opt}`} className="radio-line">
                              <input type="radio" name={`s6-${key}`} value={opt} checked={pubS6[key] === opt} onChange={(e) => setPublicStep6Answer(key, e.target.value)} />
                              {optionLabel[opt] || opt}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {pubErr && <p className="error">{pubErr}</p>}
                  <div className="public-actions"><button type="button" className="secondary" onClick={() => setPubStep(5)}>Voltar</button><button disabled={pubSaving}>{pubSaving ? "Enviando..." : "Enviar Step 6"}</button></div>
                </form>
              )}

              {pubStep === 7 && (
                <form onSubmit={submitPublicStep7} className="login-form">
                  {step7Questions.map((question, idx) => {
                    const key = `q${idx + 1}`;
                    return (
                      <div key={`step7-q-${key}`} className="question-block">
                        <p>{question}</p>
                        <div className="radio-group">
                          {step7Options.map((opt) => (
                            <label key={`step7-${key}-${opt}`} className="radio-line">
                              <input type="radio" name={`s7-${key}`} value={opt} checked={pubS7[key] === opt} onChange={(e) => setPublicStep7Answer(key, e.target.value)} />
                              {optionLabel[opt] || opt}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {pubErr && <p className="error">{pubErr}</p>}
                  <div className="public-actions"><button type="button" className="secondary" onClick={() => setPubStep(6)}>Voltar</button><button disabled={pubSaving}>{pubSaving ? "Enviando..." : "Enviar Step 7"}</button></div>
                </form>
              )}

              {pubStep === 8 && (
                <form onSubmit={submitPublicStep8} className="login-form">
                  {step8Questions.map((question, idx) => {
                    const key = `q${idx + 1}`;
                    return (
                      <div key={`step8-q-${key}`} className="question-block">
                        <p>{question}</p>
                        <div className="radio-group">
                          {step8Options.map((opt) => (
                            <label key={`step8-${key}-${opt}`} className="radio-line">
                              <input type="radio" name={`s8-${key}`} value={opt} checked={pubS8[key] === opt} onChange={(e) => setPublicStep8Answer(key, e.target.value)} />
                              {optionLabel[opt] || opt}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {pubErr && <p className="error">{pubErr}</p>}
                  <div className="public-actions"><button type="button" className="secondary" onClick={() => setPubStep(7)}>Voltar</button><button disabled={pubSaving}>{pubSaving ? "Enviando..." : "Enviar Step 8"}</button></div>
                </form>
              )}

              {pubStep === 9 && (
                <form onSubmit={submitPublicStep9} className="login-form">
                  <label>{step9Prompt}</label>
                  <textarea className="text-area" rows={5} value={pubS9Comment} onChange={(e) => setPubS9Comment(e.target.value)} placeholder="Escreva aqui (opcional)..." />
                  {pubErr && <p className="error">{pubErr}</p>}
                  <div className="public-actions"><button type="button" className="secondary" onClick={() => setPubStep(8)}>Voltar</button><button disabled={pubSaving}>{pubSaving ? "Enviando..." : "Finalizar questionario"}</button></div>
                </form>
              )}

              {pubStep === 10 && (
                <div className="public-finish">
                  <p className="ok-message">{pubOk || "Questionario enviado com sucesso."}</p>
                  <button type="button" className="secondary" onClick={restartPublicQuestionario}>Recomecar questionario</button>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className={`app-shell ${user ? "app-shell-auth" : ""}`}>
      {!user ? (
        <section className="card login-card">
          <h1>Plataforma NR01</h1><p className="subtitle">Levantamento e avaliacao de riscos ocupacionais</p>
          <form onSubmit={login} className="login-form">
            <label>E-mail</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <label>Senha</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            {error && <p className="error">{error}</p>}<button disabled={loading}>{loading ? "Entrando..." : "Entrar"}</button>
          </form>
        </section>
      ) : (
        <section className="dashboard-layout">
          <button className="mobile-menu-button" onClick={() => setSideOpen((p) => !p)}>{I.menu}</button>
          <aside className={`sidebar ${sideExpand ? "expanded" : "collapsed"} ${sideOpen ? "mobile-open" : ""}`}>
            <div className="sidebar-top">
              {sideExpand ? (
                <>
                  <div className="sidebar-brand" title={cfgData?.nome_consultoria || "NR01 Riscos"}>
                    <div className="sidebar-brand-logo" aria-hidden="true">
                      {cfgData?.logo_url ? (
                        <img src={cfgData.logo_url} alt="" />
                      ) : (
                        <strong>NR01</strong>
                      )}
                    </div>
                    <span className="sidebar-brand-text">{cfgData?.nome_consultoria || "Riscos"}</span>
                  </div>
                  <button className="icon-button collapse-btn" aria-label="Recolher menu lateral" onClick={() => setSideExpand((p) => !p)}>{I.menu}</button>
                </>
              ) : (
                <button className="icon-button collapse-btn sidebar-top-toggle-only" aria-label="Expandir menu lateral" onClick={() => setSideExpand((p) => !p)}>{I.menu}</button>
              )}
            </div>
            {sideExpand && <div className="sidebar-section-title">Navegacao</div>}
            <nav className="sidebar-nav">
              {menu.map((m) => <button key={m.key} className={`nav-item ${section === m.key ? "active" : ""}`} onClick={() => goSection(m.key)}><span className="nav-icon">{m.icon}</span>{sideExpand && <span>{m.label}</span>}</button>)}
              <button className={`nav-item nav-group-toggle ${cadOpen ? "open" : ""}`} onClick={() => setCadOpen((v) => !v)}>
                <span className="nav-icon">{I.cad}</span>
                {sideExpand && <span>Cadastro</span>}
                {sideExpand && <span className="nav-caret">{I.down}</span>}
              </button>
              {cadOpen && sideExpand && (
                <div className="nav-sublist">
                  <button className={`nav-subitem ${section === "setor" ? "active" : ""}`} onClick={() => goSection("setor")}>Setor</button>
                  <button className={`nav-subitem ${section === "ghe" ? "active" : ""}`} onClick={() => goSection("ghe")}>GHE</button>
                  <button className={`nav-subitem ${section === "cargos" ? "active" : ""}`} onClick={() => goSection("cargos")}>Cargos</button>
                </div>
              )}
            </nav>
            {sideExpand && (
              <div className="sidebar-user-card">
                <button type="button" className="sidebar-user-avatar sidebar-user-avatar-btn" onClick={() => setSideUserMenuOpen((v) => !v)}>
                  {(user.full_name || user.email || "U").trim().charAt(0).toUpperCase()}
                </button>
                <div className="sidebar-user-meta">
                  <strong>{(user.full_name || user.email || "Usuario").slice(0, 26)}</strong>
                  <span>{isAdm(user) ? "Administrador" : user?.user_type === "CONSULTOR" ? "Consultor" : "Empresa"}</span>
                </div>
                {sideUserMenuOpen && (
                  <div className="sidebar-user-menu">
                    <button type="button" className="sidebar-user-menu-item" onClick={() => goSection("configuracoes")}>Configuracoes</button>
                    <button type="button" className="sidebar-user-menu-item danger" onClick={logout}>Sair</button>
                  </div>
                )}
              </div>
            )}
          </aside>
          {sideOpen && <div className="sidebar-overlay" onClick={() => setSideOpen(false)} />}
          <section className="content-area">
            <header className="content-header"><div><h1>{currentPageTitle}</h1></div></header>
            {renderContent()}
          </section>
        </section>
      )}

      {cModal.type && <div className="modal-backdrop"><div className="modal-card"><h3>{cModal.type === "delete" ? "Excluir consultor" : cModal.type === "edit" ? "Editar consultor" : "Novo consultor"}</h3>{cModal.type === "delete" ? <><p>Deseja realmente excluir {cModal.item?.email}?</p>{cErr && <p className="error">{cErr}</p>}<div className="modal-actions"><button className="secondary" onClick={closeC}>Cancelar</button><button className="danger" onClick={delConsultor} disabled={cSaving}>{cSaving ? "Excluindo..." : "Excluir"}</button></div></> : <form onSubmit={saveConsultor} className="login-form"><label>E-mail</label><input type="email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} required /><label>Senha {cModal.type === "edit" ? "(opcional)" : ""}</label><input type="password" value={cPass} onChange={(e) => setCPass(e.target.value)} /><label className="checkbox-line"><input type="checkbox" checked={cActive} onChange={(e) => setCActive(e.target.checked)} />Ativo</label>{cErr && <p className="error">{cErr}</p>}<div className="modal-actions"><button type="button" className="secondary" onClick={closeC}>Cancelar</button><button disabled={cSaving}>{cSaving ? "Salvando..." : "Salvar"}</button></div></form>}</div></div>}

      {sModal.type && <div className="modal-backdrop"><div className="modal-card"><h3>{sModal.type === "delete" ? "Excluir setor" : sModal.type === "edit" ? "Editar setor" : "Novo setor"}</h3>{sModal.type === "delete" ? <><p>Deseja realmente excluir o setor {sModal.item?.name}?</p>{sErr && <p className="error">{sErr}</p>}<div className="modal-actions"><button className="secondary" onClick={closeSetor}>Cancelar</button><button className="danger" onClick={delSetor} disabled={sSaving}>{sSaving ? "Excluindo..." : "Excluir"}</button></div></> : <form onSubmit={saveSetor} className="login-form"><label>Empresa selecionada</label><input value={empresas.find((emp) => String(emp.id) === String(sEmpresa || setorEmpresaFiltro))?.company_name || sModal.item?.empresa_name || ""} disabled readOnly /><label>Nome do setor</label><input value={sNome} onChange={(e) => setSNome(e.target.value)} required /><label>Descricao (opcional)</label><input value={sDesc} onChange={(e) => setSDesc(e.target.value)} /><label className="checkbox-line"><input type="checkbox" checked={sAtivo} onChange={(e) => setSAtivo(e.target.checked)} />Ativo</label>{sErr && <p className="error">{sErr}</p>}<div className="modal-actions"><button type="button" className="secondary" onClick={closeSetor}>Cancelar</button><button type="submit" disabled={sSaving}>{sSaving ? "Salvando..." : "Salvar"}</button></div></form>}</div></div>}
      {setorInativarModal.item && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Inativar setor</h3>
            <p>Deseja realmente inativar o setor {setorInativarModal.item?.name}?</p>
            {setorInativarModal.err && <p className="error">{setorInativarModal.err}</p>}
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={closeSetorInativarConfirm} disabled={setorInativarModal.saving}>Cancelar</button>
              <button type="button" onClick={confirmSetorInativar} disabled={setorInativarModal.saving}>
                {setorInativarModal.saving ? "Inativando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {gModal.type && <div className="modal-backdrop"><div className="modal-card"><h3>{gModal.type === "delete" ? "Excluir GHE" : gModal.type === "edit" ? "Editar GHE" : "Novo GHE"}</h3>{gModal.type === "delete" ? <><p>Deseja realmente excluir o GHE {gModal.item?.name}?</p>{gErr && <p className="error">{gErr}</p>}<div className="modal-actions"><button className="secondary" onClick={closeGhe}>Cancelar</button><button className="danger" onClick={delGhe} disabled={gSaving}>{gSaving ? "Excluindo..." : "Excluir"}</button></div></> : <form onSubmit={saveGhe} className="login-form"><label>Empresa selecionada</label><input value={empresas.find((emp) => String(emp.id) === String(gEmpresa || gheEmpresaFiltro))?.company_name || gModal.item?.empresa_name || ""} disabled readOnly /><label>Nome do GHE</label><input value={gNome} onChange={(e) => setGNome(e.target.value)} required /><label>Descricao (opcional)</label><input value={gDesc} onChange={(e) => setGDesc(e.target.value)} /><label className="checkbox-line"><input type="checkbox" checked={gAtivo} onChange={(e) => setGAtivo(e.target.checked)} />Ativo</label>{gErr && <p className="error">{gErr}</p>}<div className="modal-actions"><button type="button" className="secondary" onClick={closeGhe}>Cancelar</button><button type="submit" disabled={gSaving}>{gSaving ? "Salvando..." : "Salvar"}</button></div></form>}</div></div>}

      {cgModal.type && <div className="modal-backdrop"><div className="modal-card"><h3>{cgModal.type === "delete" ? "Excluir cargo" : cgModal.type === "edit" ? "Editar cargo" : "Novo cargo"}</h3>{cgModal.type === "delete" ? <><p>Deseja realmente excluir o cargo {cgModal.item?.name}?</p>{cgErr && <p className="error">{cgErr}</p>}<div className="modal-actions"><button className="secondary" onClick={closeCargo}>Cancelar</button><button className="danger" onClick={delCargo} disabled={cgSaving}>{cgSaving ? "Excluindo..." : "Excluir"}</button></div></> : <form onSubmit={saveCargo} className="login-form"><label>Empresa selecionada</label><input value={empresas.find((emp) => String(emp.id) === String(cgEmpresa || cargoEmpresaFiltro))?.company_name || cgModal.item?.empresa_name || ""} disabled readOnly /><label>Nome do cargo</label><input value={cgNome} onChange={(e) => setCgNome(e.target.value)} required /><label>Descricao (opcional)</label><input value={cgDesc} onChange={(e) => setCgDesc(e.target.value)} /><label>Setores</label><div className="multi-pick">{setores.filter((s) => String(s.empresa) === String(cgEmpresa || cargoEmpresaFiltro)).map((s) => <label key={`cargo-setor-${s.id}`} className="checkbox-line"><input type="checkbox" checked={cgSetores.includes(s.id)} onChange={() => toggleCargoSetor(s.id)} />{s.name}</label>)}</div><label>GHEs</label><div className="multi-pick">{ghes.filter((g) => String(g.empresa) === String(cgEmpresa || cargoEmpresaFiltro)).map((g) => <label key={`cargo-ghe-${g.id}`} className="checkbox-line"><input type="checkbox" checked={cgGhes.includes(g.id)} onChange={() => toggleCargoGhe(g.id)} />{g.name}</label>)}</div><label className="checkbox-line"><input type="checkbox" checked={cgAtivo} onChange={(e) => setCgAtivo(e.target.checked)} />Ativo</label>{cgErr && <p className="error">{cgErr}</p>}<div className="modal-actions"><button type="button" className="secondary" onClick={closeCargo}>Cancelar</button><button type="submit" disabled={cgSaving}>{cgSaving ? "Salvando..." : "Salvar"}</button></div></form>}</div></div>}

      {cpModal.type && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>
              {cpModal.type === "delete"
                ? "Excluir campanha"
                : cpModal.type === "edit"
                  ? "Editar campanha"
                  : cpModal.type === "qr"
                    ? "QR Code da campanha"
                    : "Nova campanha"}
            </h3>

            {cpModal.type === "delete" ? (
              <>
                <p>Deseja realmente excluir a campanha {cpModal.item?.title}?</p>
                {cpErr && <p className="error">{cpErr}</p>}
                <div className="modal-actions">
                  <button className="secondary" onClick={closeCampanha}>Cancelar</button>
                  <button className="danger" onClick={delCampanha} disabled={cpSaving}>{cpSaving ? "Excluindo..." : "Excluir"}</button>
                </div>
              </>
            ) : cpModal.type === "qr" ? (
              <>
                <p><strong>{cpModal.item?.title}</strong></p>
                <div className="qr-wrap">
                  {cpModal.item?.qr_code_data ? (
                    <img src={cpModal.item.qr_code_data} alt={`QR Code da campanha ${cpModal.item?.title || ""}`} />
                  ) : (
                    <p className="error">QR Code indisponivel. Atualize as dependencias do backend.</p>
                  )}
                </div>
                <label>Link publico</label>
                <input value={cpModal.item?.public_url || ""} readOnly />
                {cpErr && <p className="error">{cpErr}</p>}
                <div className="modal-actions">
                  <button type="button" className="secondary" onClick={closeCampanha}>Fechar</button>
                  <button
                    type="button"
                    onClick={async () => {
                      setCpErr("");
                      try {
                        await copyText(cpModal.item?.public_url || "");
                      } catch (err) {
                        setCpErr(err.message);
                      }
                    }}
                  >
                    Copiar link
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={saveCampanha} className="login-form">
                <label>Empresa selecionada</label>
                <input value={empresas.find((emp) => String(emp.id) === String(cpEmpresa || campEmpresaFiltro))?.company_name || cpModal.item?.empresa_name || ""} disabled readOnly />
                <label>Titulo da campanha</label>
                <input value={cpTitulo} onChange={(e) => setCpTitulo(e.target.value)} required />
                <label>Data de inicio</label>
                <input type="date" value={cpInicio} onChange={(e) => setCpInicio(e.target.value)} required />
                <label>Data de fim</label>
                <input type="date" value={cpFim} onChange={(e) => setCpFim(e.target.value)} required />
                <label>Status</label>
                <button type="button" className={`toggle-button ${cpStatus === "ATIVO" ? "on" : "off"}`} onClick={() => setCpStatus((s) => s === "ATIVO" ? "ENCERRADO" : "ATIVO")}>
                  {cpStatus === "ATIVO" ? "Ativo" : "Encerrado"}
                </button>
                {cpErr && <p className="error">{cpErr}</p>}
                <div className="modal-actions">
                  <button type="button" className="secondary" onClick={closeCampanha}>Cancelar</button>
                  <button type="submit" disabled={cpSaving}>{cpSaving ? "Salvando..." : "Salvar"}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {eModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card modal-card-large empresa-wizard-modal">
            <div className="empresa-wizard-header">
              <div>
                <h3>{eMode === "create" ? "Cadastrar Nova Empresa" : "Editar Empresa"}</h3>
                <p>{eMode === "create" ? "Preencha os dados para cadastrar uma nova empresa no sistema." : "Atualize os dados da empresa selecionada."}</p>
              </div>
              <button type="button" className="empresa-wizard-close" onClick={closeEmpresa}>x</button>
            </div>

            <div className="empresa-wizard-progress" aria-label="Etapas do cadastro">
              {[1, 2, 3].map((n) => (
                <div key={`ew-step-${n}`} className={`empresa-wizard-progress-item ${eStep === n ? "active" : ""} ${eStep > n ? "done" : ""}`}>
                  <span>{eStep > n ? "✓" : n}</span>
                </div>
              ))}
            </div>

            <form onSubmit={saveEmpresa} className="login-form">
              {eStep === 1 && (
                <div className="empresa-step1">
                  <h4>1. Para comecar, selecione o tipo de documento</h4>
                  <div className="empresa-doc-options">
                    <button type="button" className={`empresa-doc-option ${eForm.document_type === "CNPJ" ? "active" : ""}`} onClick={() => eChange("document_type", "CNPJ")}>
                      <span className="empresa-doc-option-icon" aria-hidden="true">{I.emp}</span>
                      <span className="empresa-doc-option-text">
                        <strong>CNPJ</strong>
                        <small>Pessoa juridica</small>
                      </span>
                      {eForm.document_type === "CNPJ" && <span className="empresa-doc-option-check" aria-hidden="true">✓</span>}
                    </button>
                    <button type="button" className={`empresa-doc-option ${eForm.document_type === "CPF" ? "active" : ""}`} onClick={() => eChange("document_type", "CPF")}>
                      <span className="empresa-doc-option-icon" aria-hidden="true">{I.con}</span>
                      <span className="empresa-doc-option-text">
                        <strong>CPF</strong>
                        <small>Pessoa fisica</small>
                      </span>
                      {eForm.document_type === "CPF" && <span className="empresa-doc-option-check" aria-hidden="true">✓</span>}
                    </button>
                  </div>
                </div>
              )}

              {eStep === 2 && (
                <div className="empresa-step2">
                  <h4>2. Selecione o tipo de unidade</h4>
                  <div className="empresa-unit-options">
                    {[
                      { value: "MATRIZ", title: "Matriz", desc: "Sede principal da empresa" },
                      { value: "FILIAL", title: "Filial", desc: "Unidade secundaria" },
                      { value: "UNIDADE", title: "Unidade", desc: "Unidade operacional" },
                      { value: "OUTRO", title: "Outro", desc: "Tipo personalizado" },
                    ].map((opt) => (
                      <button
                        key={`unit-${opt.value}`}
                        type="button"
                        className={`empresa-doc-option empresa-unit-option ${eForm.establishment_type === opt.value ? "active" : ""}`}
                        onClick={() => eChange("establishment_type", opt.value)}
                      >
                        <span className="empresa-doc-option-icon" aria-hidden="true">{opt.value === "MATRIZ" ? I.emp : opt.value === "FILIAL" ? I.cad : opt.value === "UNIDADE" ? I.camp : I.edit}</span>
                        <span className="empresa-doc-option-text">
                          <strong>{opt.title}</strong>
                          <small>{opt.desc}</small>
                        </span>
                        {eForm.establishment_type === opt.value && <span className="empresa-doc-option-check" aria-hidden="true">✓</span>}
                      </button>
                    ))}
                  </div>
                  {["FILIAL", "UNIDADE", "OUTRO"].includes(eForm.establishment_type) && (
                    <div className="empresa-step2-custom">
                      <label>Nome complementar (opcional)</label>
                      <input value={eForm.establishment_custom_name} onChange={(e) => eChange("establishment_custom_name", e.target.value)} placeholder="Ex.: Unidade Centro" />
                    </div>
                  )}
                </div>
              )}

              {eStep === 3 && <div className="wizard-grid">
                <div><label>Nome da empresa</label><input value={eForm.company_name} onChange={(e) => eChange("company_name", e.target.value)} /></div>
                <div><label>CNAE</label><input value={eForm.cnae} onChange={(e) => eChange("cnae", e.target.value)} placeholder="Ex.: 47.11-3-02" /></div>
                <div><label>{eForm.document_type}</label><input value={eForm.document_number} onChange={(e) => eChange("document_number", e.target.value)} /></div>
                <div><label>Nome do responsavel</label><input value={eForm.responsible_name} onChange={(e) => eChange("responsible_name", e.target.value)} /></div>
                <div><label>E-mail do responsavel</label><input type="email" value={eForm.responsible_email} onChange={(e) => eChange("responsible_email", e.target.value)} /></div>
                <div><label>Senha do responsavel {eMode === "edit" ? "(opcional)" : ""}</label><input type="password" value={eForm.responsible_password} onChange={(e) => eChange("responsible_password", e.target.value)} /></div>
                <div><label>Nome do estabelecimento</label><input value={eForm.establishment_name} onChange={(e) => eChange("establishment_name", e.target.value)} /></div>
                <div><label>Tipo de avaliacao</label><select value={eForm.evaluation_type} onChange={(e) => eChange("evaluation_type", e.target.value)}><option value="SETOR">Setor</option><option value="GHE">GHE</option></select></div>
                <div><label>Grau de risco</label><select value={eForm.risk_level} onChange={(e) => eChange("risk_level", e.target.value)}><option value="">Selecione</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></div>
                <div><label>Numero de funcionarios</label><input type="number" min="0" value={eForm.employee_count} onChange={(e) => eChange("employee_count", e.target.value)} /></div>
                <div><label>CEP</label><input value={eForm.postal_code} onChange={(e) => eChange("postal_code", e.target.value)} /></div>
                <div><label>UF</label><input maxLength={2} value={eForm.state} onChange={(e) => eChange("state", e.target.value.toUpperCase())} /></div>
                <div><label>Cidade</label><input value={eForm.city} onChange={(e) => eChange("city", e.target.value)} /></div>
                <div><label>Bairro</label><input value={eForm.neighborhood} onChange={(e) => eChange("neighborhood", e.target.value)} /></div>
                <div><label>Rua</label><input value={eForm.street} onChange={(e) => eChange("street", e.target.value)} /></div>
                <div><label>Numero</label><input value={eForm.number} onChange={(e) => eChange("number", e.target.value)} /></div>
                <div><label>Complemento</label><input value={eForm.complement} onChange={(e) => eChange("complement", e.target.value)} /></div>
              </div>}

              {eErr && <p className="error">{eErr}</p>}
              <div className="modal-actions">
                <button type="button" className="secondary" onClick={closeEmpresa}>Cancelar</button>
                {eStep > 1 && <button type="button" className="secondary" onClick={prevStep}>Voltar</button>}
                {eStep < 3 ? <button type="button" onClick={nextStep}>Proximo</button> : <button type="submit" disabled={eSaving}>{eSaving ? "Salvando..." : eMode === "create" ? "Criar empresa" : "Salvar"}</button>}
              </div>
            </form>
          </div>
        </div>
      )}

      {toastViewport}
      {eInactivate && <div className="modal-backdrop"><div className="modal-card"><h3>Inativar empresa</h3><p>Deseja inativar {eInactivate.company_name}?</p>{eErr && <p className="error">{eErr}</p>}<div className="modal-actions"><button className="secondary" onClick={() => setEInactivate(null)}>Cancelar</button><button className="danger" onClick={inativarEmpresa} disabled={eActing}>{eActing ? "Inativando..." : "Inativar"}</button></div></div></div>}
      {denHistModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Historico da denuncia #{denHistModal.id}</h3>
            <p className="subtitle">Atualizacoes registradas para esta denuncia.</p>
            <div className="denuncia-history-list">
              {(denHistModal.atualizacoes || []).length === 0 ? (
                <p className="empty-state">Nenhuma atualizacao registrada.</p>
              ) : (
                (denHistModal.atualizacoes || []).map((a) => (
                  <div key={`den-hist-${a.id}`} className="denuncia-history-item">
                    <div className="denuncia-history-meta">
                      <strong>{fDate(a.created_at)}</strong>
                      {a.criado_por && <span>{a.criado_por}</span>}
                    </div>
                    <p>{a.texto}</p>
                  </div>
                ))
              )}
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setDenHistModal(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
      {denViewModal && (
        <div className="modal-backdrop">
          <div className="modal-card modal-card-large">
            <h3>Detalhes da denuncia #{denViewModal.id}</h3>
            <p className="subtitle">{fDate(denViewModal.created_at)}</p>
            <div className="denuncia-detail-grid">
              <div className="info-block">
                <h3>Dados gerais</h3>
                <p><strong>Status:</strong> {denViewModal.status === "EM_ANALISE" ? "Em analise" : denViewModal.status === "RESOLVIDA" ? "Resolvida" : "Aberta"}</p>
                <p><strong>Vinculo com a empresa:</strong> {denViewModal.possui_vinculo ? "Sim" : "Nao"}</p>
                <p><strong>Deseja se identificar:</strong> {denViewModal.deseja_identificar ? "Sim" : "Nao"}</p>
                {denViewModal.contato_identificacao && <p><strong>Contato:</strong> {denViewModal.contato_identificacao}</p>}
                <p><strong>Tipo da denuncia:</strong> {denViewModal.tipo_label || "-"}</p>
                <p><strong>GHE:</strong> {denViewModal.ghe_name || "-"}</p>
                <p><strong>Funcao:</strong> {denViewModal.cargo_name || "-"}</p>
                <p><strong>Aceita devolutiva:</strong> {denViewModal.aceita_devolutiva ? "Sim" : "Nao"}</p>
                {denViewModal.email_devolutiva && <p><strong>E-mail devolutiva:</strong> {denViewModal.email_devolutiva}</p>}
              </div>
              <div className="info-block">
                <h3>Relato</h3>
                <p className="denuncia-detail-text">{denViewModal.relato || "-"}</p>
              </div>
              <div className="info-block">
                <h3>Testemunhas</h3>
                <p className="denuncia-detail-text">{denViewModal.testemunhas || "Nao informado."}</p>
              </div>
              <div className="info-block">
                <h3>Atualizacoes</h3>
                {(denViewModal.atualizacoes || []).length === 0 ? (
                  <p>Nenhuma atualizacao registrada.</p>
                ) : (
                  <div className="denuncia-history-list">
                    {(denViewModal.atualizacoes || []).map((a) => (
                      <div key={`den-view-hist-${a.id}`} className="denuncia-history-item">
                        <div className="denuncia-history-meta">
                          <strong>{fDate(a.created_at)}</strong>
                          {a.criado_por && <span>{a.criado_por}</span>}
                        </div>
                        <p>{a.texto}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setDenViewModal(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
      {denUpdModal.item && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Adicionar atualizacao</h3>
            <p className="subtitle">Denuncia #{denUpdModal.item.id}</p>
            <form onSubmit={submitDenunciaAtualizacaoModal} className="login-form">
              <label>Atualizacao</label>
              <textarea
                className="text-area"
                value={denUpdModal.text}
                onChange={(e) => setDenUpdModal((p) => ({ ...p, text: e.target.value, err: "" }))}
                placeholder="Descreva a atualizacao desta denuncia..."
                required
              />
              {denUpdModal.err && <p className="error">{denUpdModal.err}</p>}
              <div className="modal-actions">
                <button type="button" className="secondary" onClick={closeDenunciaAtualizacaoModal} disabled={denUpdModal.saving}>Cancelar</button>
                <button type="submit" disabled={denUpdModal.saving}>{denUpdModal.saving ? "Salvando..." : "Salvar atualizacao"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {denResolveModal.item && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Marcar denuncia como resolvida</h3>
            <p>Deseja marcar a denuncia #{denResolveModal.item.id} como resolvida?</p>
            {denResolveModal.err && <p className="error">{denResolveModal.err}</p>}
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={closeResolveDenunciaModal} disabled={denResolveModal.saving}>Cancelar</button>
              <button type="button" onClick={confirmResolveDenuncia} disabled={denResolveModal.saving}>
                {denResolveModal.saving ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
      {denAnalyzeModal.item && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Mudar status para Em analise</h3>
            <p>Deseja marcar a denuncia #{denAnalyzeModal.item.id} como em analise?</p>
            {denAnalyzeModal.err && <p className="error">{denAnalyzeModal.err}</p>}
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={closeAnalyzeDenunciaModal} disabled={denAnalyzeModal.saving}>Cancelar</button>
              <button type="button" onClick={confirmAnalyzeDenuncia} disabled={denAnalyzeModal.saving}>
                {denAnalyzeModal.saving ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
      {linkRegenModal.open && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Confirmar regeneracao de link</h3>
            <p>
              Ao regenerar, o link antigo sera desabilitado e ninguem podera mais acessa-lo.
            </p>
            <p>
              Deseja continuar?
            </p>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={closeRegenerateLinkConfirm}>Cancelar</button>
              <button
                type="button"
                onClick={confirmRegenerateLink}
                disabled={(linkRegenModal.target === "denuncia" && denLoad) || (linkRegenModal.target === "totem" && totemLoad)}
              >
                {(linkRegenModal.target === "denuncia" && denLoad) || (linkRegenModal.target === "totem" && totemLoad) ? "Regenerando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
