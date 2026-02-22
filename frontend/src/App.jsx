import { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
const TOKEN_KEY = "nr01_token";
const USER_CACHE_KEY = "nr01_user";
const SECTION_CACHE_KEY = "nr01_section";

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
const INIT_EMPRESA = {
  document_type: "CNPJ",
  establishment_type: "MATRIZ",
  establishment_custom_name: "",
  company_name: "",
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
};

export default function App() {
  const publicToken = getPublicQuestionarioToken();
  const isPublicQuestionario = Boolean(publicToken);

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
  const [cadOpen, setCadOpen] = useState(true);

  const [consultores, setConsultores] = useState([]), [consErr, setConsErr] = useState(""), [consLoad, setConsLoad] = useState(false);
  const [cModal, setCModal] = useState({ type: "", item: null }), [cEmail, setCEmail] = useState(""), [cPass, setCPass] = useState(""), [cActive, setCActive] = useState(true), [cErr, setCErr] = useState(""), [cSaving, setCSaving] = useState(false);

  const [empresas, setEmpresas] = useState([]), [empErr, setEmpErr] = useState(""), [empLoad, setEmpLoad] = useState(false);
  const [eModalOpen, setEModalOpen] = useState(false), [eMode, setEMode] = useState("create"), [eStep, setEStep] = useState(1), [eForm, setEForm] = useState(INIT_EMPRESA), [eEdit, setEEdit] = useState(null), [eErr, setEErr] = useState(""), [eSaving, setESaving] = useState(false), [eInactivate, setEInactivate] = useState(null), [eActing, setEActing] = useState(false);
  const [setores, setSetores] = useState([]), [setorErr, setSetorErr] = useState(""), [setorLoad, setSetorLoad] = useState(false);
  const [sModal, setSModal] = useState({ type: "", item: null }), [sEmpresa, setSEmpresa] = useState(""), [sNome, setSNome] = useState(""), [sDesc, setSDesc] = useState(""), [sAtivo, setSAtivo] = useState(true), [sErr, setSErr] = useState(""), [sSaving, setSSaving] = useState(false);
  const [setorEmpresaBusca, setSetorEmpresaBusca] = useState(""), [setorEmpresaFiltro, setSetorEmpresaFiltro] = useState("");
  const [ghes, setGhes] = useState([]), [gheErr, setGheErr] = useState(""), [gheLoad, setGheLoad] = useState(false);
  const [gModal, setGModal] = useState({ type: "", item: null }), [gEmpresa, setGEmpresa] = useState(""), [gNome, setGNome] = useState(""), [gDesc, setGDesc] = useState(""), [gAtivo, setGAtivo] = useState(true), [gErr, setGErr] = useState(""), [gSaving, setGSaving] = useState(false);
  const [gheEmpresaBusca, setGheEmpresaBusca] = useState(""), [gheEmpresaFiltro, setGheEmpresaFiltro] = useState("");
  const [cargos, setCargos] = useState([]), [cargoErr, setCargoErr] = useState(""), [cargoLoad, setCargoLoad] = useState(false);
  const [cgModal, setCgModal] = useState({ type: "", item: null }), [cgEmpresa, setCgEmpresa] = useState(""), [cgNome, setCgNome] = useState(""), [cgDesc, setCgDesc] = useState(""), [cgAtivo, setCgAtivo] = useState(true), [cgSetores, setCgSetores] = useState([]), [cgGhes, setCgGhes] = useState([]), [cgErr, setCgErr] = useState(""), [cgSaving, setCgSaving] = useState(false);
  const [cargoEmpresaBusca, setCargoEmpresaBusca] = useState(""), [cargoEmpresaFiltro, setCargoEmpresaFiltro] = useState("");
  const [campanhas, setCampanhas] = useState([]), [campErr, setCampErr] = useState(""), [campLoad, setCampLoad] = useState(false);
  const [cpModal, setCpModal] = useState({ type: "", item: null }), [cpEmpresa, setCpEmpresa] = useState(""), [cpTitulo, setCpTitulo] = useState(""), [cpInicio, setCpInicio] = useState(""), [cpFim, setCpFim] = useState(""), [cpStatus, setCpStatus] = useState("ATIVO"), [cpErr, setCpErr] = useState(""), [cpSaving, setCpSaving] = useState(false);
  const [campEmpresaBusca, setCampEmpresaBusca] = useState(""), [campEmpresaFiltro, setCampEmpresaFiltro] = useState("");
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

  useEffect(() => { if (user && isAdm(user) && section === "consultores") loadConsultores(); }, [user, section]);
  useEffect(() => { if (user && canEmp(user) && section === "empresas") loadEmpresas(); }, [user, section]);
  useEffect(() => { if (user && canEmp(user) && section === "setor") { loadEmpresas(); loadSetores(); } }, [user, section]);
  useEffect(() => { if (user && canEmp(user) && section === "ghe") { loadEmpresas(); loadGhes(); } }, [user, section]);
  useEffect(() => { if (user && canEmp(user) && section === "cargos") { loadEmpresas(); loadSetores(); loadGhes(); loadCargos(); } }, [user, section]);
  useEffect(() => { if (user && canEmp(user) && section === "campanhas") { loadEmpresas(); loadCampanhas(); } }, [user, section]);
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

  const menu = useMemo(() => {
    const m = [{ key: "dashboard", label: "Dashboard", icon: I.dash }];
    if (user && isAdm(user)) m.push({ key: "consultores", label: "Consultores", icon: I.con });
    if (user && canEmp(user)) m.push({ key: "empresas", label: "Empresas", icon: I.emp });
    if (user && canEmp(user)) m.push({ key: "campanhas", label: "Campanhas", icon: I.camp });
    return m;
  }, [user]);

  function isAdm(u) { return u?.is_superuser || u?.user_type === "ADM"; }
  function canEmp(u) { return isAdm(u) || u?.user_type === "CONSULTOR"; }
  function goSection(s) { setSection(s); setSideOpen(false); }

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
    const dt = new Date(`${value}T00:00:00`);
    if (Number.isNaN(dt.getTime())) return value;
    return dt.toLocaleDateString("pt-BR");
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
    } catch (err) { setSetorErr(err.message); }
  }

  function onSetorEmpresaBuscaChange(value) {
    setSetorEmpresaBusca(value);
    const found = empresas.find((emp) => `${emp.id} - ${emp.company_name}` === value);
    setSetorEmpresaFiltro(found ? String(found.id) : "");
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
    try {
      const nextStatus = item.status === "ATIVO" ? "ENCERRADO" : "ATIVO";
      const r = await fetch(`${API}/campanhas/${item.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Token ${token}` },
        body: JSON.stringify({ status: nextStatus }),
      });
      const d = await r.json(); if (!r.ok) throw new Error(pErr(d));
      setCampanhas((prev) => prev.map((x) => x.id === d.id ? d : x));
    } catch (err) { setCampErr(err.message); }
  }

  function onCampEmpresaBuscaChange(value) {
    setCampEmpresaBusca(value);
    const found = empresas.find((emp) => `${emp.id} - ${emp.company_name}` === value);
    setCampEmpresaFiltro(found ? String(found.id) : "");
  }

  function openEmpresaCreate() { setEMode("create"); setEEdit(null); setEForm(INIT_EMPRESA); setEStep(1); setEErr(""); setEModalOpen(true); }
  function openEmpresaEdit(x) {
    setEMode("edit"); setEEdit(x); setEStep(1); setEErr(""); setEModalOpen(true);
    setEForm({ ...INIT_EMPRESA, document_type: x.document_type, establishment_type: x.establishment_type, establishment_custom_name: x.establishment_custom_name || "", company_name: x.company_name || "", document_number: x.document_number || "", responsible_name: x.responsible_name || "", responsible_email: x.responsible_user_email || "", responsible_password: "", establishment_name: x.establishment_name || "", evaluation_type: x.evaluation_type || "SETOR", risk_level: x.risk_level || "", employee_count: String(x.employee_count ?? ""), postal_code: x.postal_code || "", state: x.state || "", city: x.city || "", neighborhood: x.neighborhood || "", street: x.street || "", number: x.number || "", complement: x.complement || "", is_active: Boolean(x.is_active) });
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
    const p = { document_type: eForm.document_type, document_number: eForm.document_number, company_name: eForm.company_name, establishment_type: eForm.establishment_type, establishment_custom_name: eForm.establishment_custom_name, establishment_name: eForm.establishment_name, evaluation_type: eForm.evaluation_type, responsible_name: eForm.responsible_name, responsible_email: eForm.responsible_email, risk_level: eForm.risk_level, employee_count: Number(eForm.employee_count || 0), postal_code: eForm.postal_code, state: eForm.state, city: eForm.city, neighborhood: eForm.neighborhood, street: eForm.street, number: eForm.number, complement: eForm.complement, is_active: eForm.is_active };
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
    if (section === "dashboard") return <section className="placeholder-card"><h2>Visao Geral</h2><p>Usuario: {user?.full_name || user?.email}</p><p>Perfil: {user?.user_type}</p></section>;
    if (section === "consultores" && isAdm(user)) return (
      <section className="admin-panel">
        <div className="admin-header"><h2>Consultores</h2><button onClick={() => openC("create")}>Novo consultor</button></div>
        {consLoad && <p>Carregando consultores...</p>}{consErr && <p className="error">{consErr}</p>}
        {!consLoad && <div className="table-wrap"><table><thead><tr><th>ID</th><th>E-mail</th><th>Status</th><th>Acoes</th></tr></thead><tbody>{consultores.length === 0 ? <tr><td colSpan={4}>Nenhum consultor cadastrado.</td></tr> : consultores.map((c) => <tr key={c.id}><td>{c.id}</td><td>{c.email}</td><td>{c.is_active ? "Ativo" : "Inativo"}</td><td className="actions"><button onClick={() => openC("edit", c)}>Editar</button><button className="danger" onClick={() => openC("delete", c)}>Excluir</button></td></tr>)}</tbody></table></div>}
      </section>
    );
    if (section === "empresas" && canEmp(user)) return (
      <section className="admin-panel">
        <div className="admin-header"><h2>Empresas</h2><button onClick={openEmpresaCreate}>Nova empresa</button></div>
        {empLoad && <p>Carregando empresas...</p>}{empErr && <p className="error">{empErr}</p>}
        {!empLoad && (
          <div className="empresa-grid">
            {empresas.length === 0 ? (
              <p className="empty-state">Nenhuma empresa cadastrada.</p>
            ) : (
              empresas.map((e) => (
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
                    <span className={`status-pill ${e.is_active ? "active" : "inactive"}`}>
                      {e.is_active ? "Ativa" : "Inativa"}
                    </span>
                  </div>

                  <p><strong>{e.document_type === "CNPJ" ? "CNPJ" : "CPF"}:</strong> {e.document_number}</p>
                  <p><strong>Avaliacao:</strong> {e.evaluation_type}</p>

                  <div className="card-actions">
                    <button onClick={() => openEmpresaEdit(e)}>Editar</button>
                    {e.is_active ? (
                      <button className="danger" onClick={() => setEInactivate(e)}>Inativar</button>
                    ) : (
                      <button className="secondary" onClick={() => reativarEmpresa(e)}>Reativar</button>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        )}
      </section>
    );
    if (section === "setor") {
      const termoEmpresa = setorEmpresaBusca.trim().toLowerCase();
      const empresasPorBusca = termoEmpresa
        ? empresas.filter((emp) => String(emp.company_name || "").toLowerCase().includes(termoEmpresa)).map((emp) => String(emp.id))
        : [];
      const setoresFiltrados = setorEmpresaFiltro
        ? setores.filter((s) => String(s.empresa) === String(setorEmpresaFiltro))
        : termoEmpresa
          ? setores.filter((s) => empresasPorBusca.includes(String(s.empresa)))
          : setores;
      return (
        <section className="admin-panel">
          <div className="setor-hero">
            <div>
              <h2>Cadastro de Setor</h2>
              <p>Gerencie os setores por empresa.</p>
            </div>
            <div className="setor-hero-right">
              <label htmlFor="empresa-search">Empresa</label>
              <input
                id="empresa-search"
                list="empresa-options"
                placeholder="Buscar empresa..."
                value={setorEmpresaBusca}
                onChange={(e) => onSetorEmpresaBuscaChange(e.target.value)}
              />
              <datalist id="empresa-options">
                {empresas.map((emp) => <option key={emp.id} value={`${emp.id} - ${emp.company_name}`} />)}
              </datalist>
            </div>
          </div>

          <div className="admin-header">
            <h2>Setores</h2>
            <button disabled={!setorEmpresaFiltro} title={!setorEmpresaFiltro ? "Selecione uma empresa para continuar." : ""} onClick={() => openSetor("create")}>Novo setor</button>
          </div>

          {setorLoad && <p>Carregando setores...</p>}
          {setorErr && <p className="error">{setorErr}</p>}
          {!setorLoad && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Setor</th>
                    <th>Empresa</th>
                    <th>Status</th>
                    <th>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {setoresFiltrados.length === 0 ? (
                    <tr><td colSpan={5}>Nenhum setor encontrado.</td></tr>
                  ) : (
                    setoresFiltrados.map((s) => (
                      <tr key={s.id}>
                        <td>{s.id}</td>
                        <td>{s.name}</td>
                        <td>{s.empresa_name}</td>
                        <td>{s.is_active ? "Ativo" : "Inativo"}</td>
                        <td className="actions">
                          <button onClick={() => openSetor("edit", s)}>Editar</button>
                          {s.is_active ? (
                            <button className="secondary" onClick={() => toggleSetorAtivo(s, false)}>Inativar</button>
                          ) : (
                            <button className="secondary" onClick={() => toggleSetorAtivo(s, true)}>Reativar</button>
                          )}
                          <button className="danger" onClick={() => openSetor("delete", s)}>Excluir</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      );
    }
    if (section === "ghe") {
      const termoEmpresa = gheEmpresaBusca.trim().toLowerCase();
      const empresasPorBusca = termoEmpresa
        ? empresas.filter((emp) => String(emp.company_name || "").toLowerCase().includes(termoEmpresa)).map((emp) => String(emp.id))
        : [];
      const ghesFiltrados = gheEmpresaFiltro
        ? ghes.filter((g) => String(g.empresa) === String(gheEmpresaFiltro))
        : termoEmpresa
          ? ghes.filter((g) => empresasPorBusca.includes(String(g.empresa)))
          : ghes;

      return (
        <section className="admin-panel">
          <div className="setor-hero">
            <div>
              <h2>Cadastro de GHE</h2>
              <p>Gerencie os GHEs por empresa.</p>
            </div>
            <div className="setor-hero-right">
              <label htmlFor="ghe-empresa-search">Empresa</label>
              <input
                id="ghe-empresa-search"
                list="ghe-empresa-options"
                placeholder="Buscar empresa..."
                value={gheEmpresaBusca}
                onChange={(e) => onGheEmpresaBuscaChange(e.target.value)}
              />
              <datalist id="ghe-empresa-options">
                {empresas.map((emp) => <option key={emp.id} value={`${emp.id} - ${emp.company_name}`} />)}
              </datalist>
            </div>
          </div>

          <div className="admin-header">
            <h2>GHEs</h2>
            <button disabled={!gheEmpresaFiltro} title={!gheEmpresaFiltro ? "Selecione uma empresa para continuar." : ""} onClick={() => openGhe("create")}>Novo GHE</button>
          </div>

          {gheLoad && <p>Carregando GHEs...</p>}
          {gheErr && <p className="error">{gheErr}</p>}
          {!gheLoad && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>GHE</th>
                    <th>Empresa</th>
                    <th>Status</th>
                    <th>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {ghesFiltrados.length === 0 ? (
                    <tr><td colSpan={5}>Nenhum GHE encontrado.</td></tr>
                  ) : (
                    ghesFiltrados.map((g) => (
                      <tr key={g.id}>
                        <td>{g.id}</td>
                        <td>{g.name}</td>
                        <td>{g.empresa_name}</td>
                        <td>{g.is_active ? "Ativo" : "Inativo"}</td>
                        <td className="actions">
                          <button onClick={() => openGhe("edit", g)}>Editar</button>
                          {g.is_active ? (
                            <button className="secondary" onClick={() => toggleGheAtivo(g, false)}>Inativar</button>
                          ) : (
                            <button className="secondary" onClick={() => toggleGheAtivo(g, true)}>Reativar</button>
                          )}
                          <button className="danger" onClick={() => openGhe("delete", g)}>Excluir</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      );
    }
    if (section === "cargos") {
      const termoEmpresa = cargoEmpresaBusca.trim().toLowerCase();
      const empresasPorBusca = termoEmpresa
        ? empresas.filter((emp) => String(emp.company_name || "").toLowerCase().includes(termoEmpresa)).map((emp) => String(emp.id))
        : [];
      const cargosFiltrados = cargoEmpresaFiltro
        ? cargos.filter((cg) => String(cg.empresa) === String(cargoEmpresaFiltro))
        : termoEmpresa
          ? cargos.filter((cg) => empresasPorBusca.includes(String(cg.empresa)))
          : cargos;

      return (
        <section className="admin-panel">
          <div className="setor-hero">
            <div>
              <h2>Cadastro de Cargos</h2>
              <p>Gerencie os cargos por empresa.</p>
            </div>
            <div className="setor-hero-right">
              <label htmlFor="cargo-empresa-search">Empresa</label>
              <input
                id="cargo-empresa-search"
                list="cargo-empresa-options"
                placeholder="Buscar empresa..."
                value={cargoEmpresaBusca}
                onChange={(e) => onCargoEmpresaBuscaChange(e.target.value)}
              />
              <datalist id="cargo-empresa-options">
                {empresas.map((emp) => <option key={emp.id} value={`${emp.id} - ${emp.company_name}`} />)}
              </datalist>
            </div>
          </div>

          <div className="admin-header">
            <h2>Cargos</h2>
            <button disabled={!cargoEmpresaFiltro} title={!cargoEmpresaFiltro ? "Selecione uma empresa para continuar." : ""} onClick={() => openCargo("create")}>Novo cargo</button>
          </div>

          {cargoLoad && <p>Carregando cargos...</p>}
          {cargoErr && <p className="error">{cargoErr}</p>}
          {!cargoLoad && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Cargo</th>
                    <th>Empresa</th>
                    <th>Status</th>
                    <th>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {cargosFiltrados.length === 0 ? (
                    <tr><td colSpan={5}>Nenhum cargo encontrado.</td></tr>
                  ) : (
                    cargosFiltrados.map((cg) => (
                      <tr key={cg.id}>
                        <td>{cg.id}</td>
                        <td>{cg.name}</td>
                        <td>{cg.empresa_name}</td>
                        <td>{cg.is_active ? "Ativo" : "Inativo"}</td>
                        <td className="actions">
                          <button onClick={() => openCargo("edit", cg)}>Editar</button>
                          {cg.is_active ? (
                            <button className="secondary" onClick={() => toggleCargoAtivo(cg, false)}>Inativar</button>
                          ) : (
                            <button className="secondary" onClick={() => toggleCargoAtivo(cg, true)}>Reativar</button>
                          )}
                          <button className="danger" onClick={() => openCargo("delete", cg)}>Excluir</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      );
    }
    if (section === "campanhas") {
      const termoEmpresa = campEmpresaBusca.trim().toLowerCase();
      const empresasPorBusca = termoEmpresa
        ? empresas.filter((emp) => String(emp.company_name || "").toLowerCase().includes(termoEmpresa)).map((emp) => String(emp.id))
        : [];
      const campanhasFiltradas = campEmpresaFiltro
        ? campanhas.filter((cp) => String(cp.empresa) === String(campEmpresaFiltro))
        : termoEmpresa
          ? campanhas.filter((cp) => empresasPorBusca.includes(String(cp.empresa)))
          : campanhas;

      return (
        <section className="admin-panel">
          <div className="setor-hero">
            <div>
              <h2>Campanhas</h2>
              <p>Crie e gerencie campanhas por empresa.</p>
            </div>
            <div className="setor-hero-right">
              <label htmlFor="camp-empresa-search">Empresa</label>
              <input
                id="camp-empresa-search"
                list="camp-empresa-options"
                placeholder="Buscar empresa..."
                value={campEmpresaBusca}
                onChange={(e) => onCampEmpresaBuscaChange(e.target.value)}
              />
              <datalist id="camp-empresa-options">
                {empresas.map((emp) => <option key={emp.id} value={`${emp.id} - ${emp.company_name}`} />)}
              </datalist>
            </div>
          </div>

          <div className="admin-header">
            <h2>Lista de campanhas</h2>
            <button disabled={!campEmpresaFiltro} title={!campEmpresaFiltro ? "Selecione uma empresa para continuar." : ""} onClick={() => openCampanha("create")}>Nova campanha</button>
          </div>

          {campLoad && <p>Carregando campanhas...</p>}
          {campErr && <p className="error">{campErr}</p>}
          {!campLoad && (
            campanhasFiltradas.length === 0 ? (
              <p className="empty-state">Nenhuma campanha encontrada.</p>
            ) : (
              <div className="campanha-list">
                {campanhasFiltradas.map((cp) => (
                  <article key={cp.id} className="campanha-row">
                    <div className="campanha-main">
                      <div className="campanha-top">
                        <h3>{cp.title}</h3>
                        <button className={`campanha-status ${cp.status === "ATIVO" ? "on" : "off"}`} onClick={() => toggleCampanhaStatus(cp)}>
                          {cp.status === "ATIVO" ? "Ativa" : "Encerrada"}
                        </button>
                      </div>
                      <p className="campanha-meta">
                        <span>{fDate(cp.start_date)} - {fDate(cp.end_date)}</span>
                        <span>{cp.empresa_name}</span>
                      </p>
                    </div>
                    <div className="campanha-actions">
                      <button onClick={() => openCampanha("qr", cp)}>QR Code</button>
                      <button className="secondary" onClick={() => openCampanha("edit", cp)}>Editar</button>
                      <button className="danger" onClick={() => openCampanha("delete", cp)}>Excluir</button>
                    </div>
                  </article>
                ))}
              </div>
            )
          )}
        </section>
      );
    }
    return <section className="placeholder-card"><h2>Modulo</h2><p>Em preparacao.</p></section>;
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
        <section className="card public-card">
          <h1>Questionario de Campanha</h1>
          {pubLoad && <p>Carregando...</p>}
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

                  <label>CPF (obrigatorio)</label>
                  <input value={pubCpf} onChange={(e) => setPubCpf(e.target.value)} required />

                  <label>Primeiro nome (opcional)</label>
                  <input value={pubNome} onChange={(e) => setPubNome(e.target.value)} />

                  <label>Idade (obrigatorio)</label>
                  <input type="number" min="1" max="120" value={pubIdade} onChange={(e) => setPubIdade(e.target.value)} required />

                  <label>Sexo</label>
                  <select value={pubSexo} onChange={(e) => setPubSexo(e.target.value)}>
                    <option value="">Selecione</option>
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                    <option value="O">Outro</option>
                    <option value="N">Prefiro nao informar</option>
                  </select>

                  <label>{refLabel} (obrigatorio)</label>
                  <select value={pubRef} onChange={(e) => onPublicRefChange(e.target.value)} required>
                    <option value="">Selecione</option>
                    {refs.map((r) => <option key={`pub-ref-${r.id}`} value={r.id}>{r.name}</option>)}
                  </select>

                  <label>Cargo (obrigatorio)</label>
                  <select value={pubCargo} onChange={(e) => setPubCargo(e.target.value)} disabled={!pubRef} required>
                    <option value="">{pubRef ? "Selecione" : `Selecione ${refLabel} primeiro`}</option>
                    {cargosOptions.map((c) => <option key={`pub-cargo-${c.id}`} value={c.id}>{c.name}</option>)}
                  </select>

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
    <main className="app-shell">
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
            <div className="sidebar-top"><div className="sidebar-brand"><strong>NR01</strong>{sideExpand && <span>Riscos</span>}</div><button className="icon-button collapse-btn" onClick={() => setSideExpand((p) => !p)}>{I.col}</button></div>
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
          </aside>
          {sideOpen && <div className="sidebar-overlay" onClick={() => setSideOpen(false)} />}
          <section className="content-area">
            <header className="content-header"><div><h1>{section === "dashboard" ? "Dashboard" : "Gestao da Plataforma"}</h1><p className="subtitle">Usuario: {user.full_name || user.email}</p></div><button onClick={logout}>Sair</button></header>
            {renderContent()}
          </section>
        </section>
      )}

      {cModal.type && <div className="modal-backdrop"><div className="modal-card"><h3>{cModal.type === "delete" ? "Excluir consultor" : cModal.type === "edit" ? "Editar consultor" : "Novo consultor"}</h3>{cModal.type === "delete" ? <><p>Deseja realmente excluir {cModal.item?.email}?</p>{cErr && <p className="error">{cErr}</p>}<div className="modal-actions"><button className="secondary" onClick={closeC}>Cancelar</button><button className="danger" onClick={delConsultor} disabled={cSaving}>{cSaving ? "Excluindo..." : "Excluir"}</button></div></> : <form onSubmit={saveConsultor} className="login-form"><label>E-mail</label><input type="email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} required /><label>Senha {cModal.type === "edit" ? "(opcional)" : ""}</label><input type="password" value={cPass} onChange={(e) => setCPass(e.target.value)} /><label className="checkbox-line"><input type="checkbox" checked={cActive} onChange={(e) => setCActive(e.target.checked)} />Ativo</label>{cErr && <p className="error">{cErr}</p>}<div className="modal-actions"><button type="button" className="secondary" onClick={closeC}>Cancelar</button><button disabled={cSaving}>{cSaving ? "Salvando..." : "Salvar"}</button></div></form>}</div></div>}

      {sModal.type && <div className="modal-backdrop"><div className="modal-card"><h3>{sModal.type === "delete" ? "Excluir setor" : sModal.type === "edit" ? "Editar setor" : "Novo setor"}</h3>{sModal.type === "delete" ? <><p>Deseja realmente excluir o setor {sModal.item?.name}?</p>{sErr && <p className="error">{sErr}</p>}<div className="modal-actions"><button className="secondary" onClick={closeSetor}>Cancelar</button><button className="danger" onClick={delSetor} disabled={sSaving}>{sSaving ? "Excluindo..." : "Excluir"}</button></div></> : <form onSubmit={saveSetor} className="login-form"><label>Empresa selecionada</label><input value={empresas.find((emp) => String(emp.id) === String(sEmpresa || setorEmpresaFiltro))?.company_name || sModal.item?.empresa_name || ""} disabled readOnly /><label>Nome do setor</label><input value={sNome} onChange={(e) => setSNome(e.target.value)} required /><label>Descricao (opcional)</label><input value={sDesc} onChange={(e) => setSDesc(e.target.value)} /><label className="checkbox-line"><input type="checkbox" checked={sAtivo} onChange={(e) => setSAtivo(e.target.checked)} />Ativo</label>{sErr && <p className="error">{sErr}</p>}<div className="modal-actions"><button type="button" className="secondary" onClick={closeSetor}>Cancelar</button><button type="submit" disabled={sSaving}>{sSaving ? "Salvando..." : "Salvar"}</button></div></form>}</div></div>}

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

      {eModalOpen && <div className="modal-backdrop"><div className="modal-card modal-card-large"><h3>{eMode === "create" ? "Nova empresa" : "Editar empresa"}</h3><div className="wizard-steps"><span className={eStep === 1 ? "active" : ""}>1. Documento</span><span className={eStep === 2 ? "active" : ""}>2. Estabelecimento</span><span className={eStep === 3 ? "active" : ""}>3. Dados gerais</span></div><form onSubmit={saveEmpresa} className="login-form">
        {eStep === 1 && <><label>CPF ou CNPJ</label><select value={eForm.document_type} onChange={(e) => eChange("document_type", e.target.value)}><option value="CPF">CPF</option><option value="CNPJ">CNPJ</option></select></>}
        {eStep === 2 && <><label>Tipo do estabelecimento</label><select value={eForm.establishment_type} onChange={(e) => eChange("establishment_type", e.target.value)}><option value="FILIAL">Filial</option><option value="UNIDADE">Unidade</option><option value="MATRIZ">Matriz</option><option value="OUTRO">Outro</option></select>{["FILIAL", "UNIDADE", "OUTRO"].includes(eForm.establishment_type) && <><label>Nome complementar (opcional)</label><input value={eForm.establishment_custom_name} onChange={(e) => eChange("establishment_custom_name", e.target.value)} /></>}</>}
        {eStep === 3 && <div className="wizard-grid">
          <div><label>Nome da empresa</label><input value={eForm.company_name} onChange={(e) => eChange("company_name", e.target.value)} /></div>
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
        <div className="modal-actions"><button type="button" className="secondary" onClick={closeEmpresa}>Cancelar</button>{eStep > 1 && <button type="button" className="secondary" onClick={prevStep}>Voltar</button>}{eStep < 3 ? <button type="button" onClick={nextStep}>Proximo</button> : <button type="submit" disabled={eSaving}>{eSaving ? "Salvando..." : eMode === "create" ? "Criar empresa" : "Salvar"}</button>}</div>
      </form></div></div>}

      {eInactivate && <div className="modal-backdrop"><div className="modal-card"><h3>Inativar empresa</h3><p>Deseja inativar {eInactivate.company_name}?</p>{eErr && <p className="error">{eErr}</p>}<div className="modal-actions"><button className="secondary" onClick={() => setEInactivate(null)}>Cancelar</button><button className="danger" onClick={inativarEmpresa} disabled={eActing}>{eActing ? "Inativando..." : "Inativar"}</button></div></div></div>}
    </main>
  );
}
