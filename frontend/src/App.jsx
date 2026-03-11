import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
const TOKEN_KEY = "nr01_token";
const USER_CACHE_KEY = "nr01_user";
const SECTION_CACHE_KEY = "nr01_section";
const REPORT_CAMPANHA_ID_KEY = "nr01_report_campanha_id";
const REPORT_REF_ID_KEY = "nr01_report_ref_id";
const HUMOR_OPTIONS = [
  { key: "feliz",          label: "Feliz",          emoji: "😊" },
  { key: "motivado",       label: "Motivado",       emoji: "💪" },
  { key: "tranquilo",      label: "Tranquilo",      emoji: "😌" },
  { key: "cansado",        label: "Cansado",        emoji: "😴" },
  { key: "estressado",     label: "Estressado",     emoji: "😤" },
  { key: "triste",         label: "Triste",         emoji: "😢" },
  { key: "ansioso",        label: "Ansioso",        emoji: "😰" },
  { key: "sobrecarregado", label: "Sobrecarregado", emoji: "😵" },
];

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

function getPasswordResetParams() {
  const path = window.location.pathname || "";
  const hash = window.location.hash || "";
  const search = window.location.search || "";
  const hashPath = hash.split("?")[0] || "";
  const hashSearch = hash.includes("?") ? hash.slice(hash.indexOf("?")) : "";
  const isResetPath = /^\/reset-password\/?$/.test(path) || /^#\/reset-password\/?$/.test(hashPath);

  if (!isResetPath) return { uid: "", token: "" };

  const params = new URLSearchParams(hashSearch || search);
  return {
    uid: params.get("uid") || "",
    token: params.get("token") || "",
  };
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
  hand: <svg viewBox="0 0 24 24"><path d="M18 11V8a2 2 0 00-4 0M14 8V6a2 2 0 00-4 0v2M10 7v1a2 2 0 00-4 0V12a8 8 0 008 8 8 8 0 008-8v-3a2 2 0 00-4 0" /></svg>,
  rpt: <svg viewBox="0 0 24 24"><path d="M7 3h8l4 4v14H7zM15 3v5h4M10 12h6M10 16h6M10 8h2" /></svg>,
  link: <svg viewBox="0 0 24 24"><path d="M10 14l4-4M7 17a4 4 0 010-6l2-2a4 4 0 016 0M17 7a4 4 0 010 6l-2 2a4 4 0 01-6 0" /></svg>,
  copy: <svg viewBox="0 0 24 24"><path d="M9 9h10v12H9zM5 3h10v12" /></svg>,
  x: <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg>,
  edit: <svg viewBox="0 0 24 24"><path d="M4 20l4.5-1 9-9-3.5-3.5-9 9L4 20zM13.5 6.5l3.5 3.5M4 20h6" /></svg>,
  del: <svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>,
  power: <svg viewBox="0 0 24 24"><path d="M12 3v8M7.8 5.8a9 9 0 101.4-1.1M16.2 4.7a9 9 0 011.4 1.1" /></svg>,
  moreV: <svg viewBox="0 0 24 24"><path d="M12 5h.01M12 12h.01M12 19h.01" /></svg>,
  pdf: <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M10 13h4M10 17h4M10 9h1" /></svg>,
};

const PLANOS_ACAO = {
  step2: {
    q1: [
      "Mapear e documentar os conflitos de demandas entre áreas, definindo prioridades claras e critérios de resolução.",
      "Implantar reuniões periódicas de alinhamento interdepartamental para coordenar exigências conflitantes.",
      "Capacitar lideranças em gestão de conflitos de demanda e em técnicas de negociação de prioridades.",
      "Criar comitê de gestão de demandas com representantes de cada área para arbitrar conflitos recorrentes.",
    ],
    q2: [
      "Revisar a metodologia de definição de prazos, adotando estimativas realistas baseadas em capacidade de trabalho.",
      "Capacitar gestores em planejamento e em técnicas de estimativa de tempo para tarefas e projetos.",
      "Criar espaço formal para negociação de prazos entre colaboradores e lideranças antes da definição final.",
      "Monitorar indicadores de cumprimento de prazos e utilizar os dados para ajustar a distribuição de demandas.",
    ],
    q3: [
      "Realizar análise de carga de trabalho por colaborador e redistribuir tarefas para menor intensidade.",
      "Implantar pausas regulares programadas na jornada e garantir que sejam respeitadas.",
      "Avaliar necessidade de contratação ou redistribuição de pessoal para equilibrar a intensidade do trabalho.",
      "Revisar processos de trabalho para identificar e eliminar etapas desnecessárias que elevam a intensidade.",
    ],
    q4: [
      "Realizar diagnóstico de carga de trabalho por colaborador e ajustar a distribuição de demandas.",
      "Priorizar e eliminar tarefas de baixo valor agregado, reduzindo o volume total de demandas.",
      "Avaliar contratação de apoio, terceirização ou automação de atividades para aliviar sobrecarga.",
      "Implantar gestão visual (Kanban ou similar) para tornar visível a fila de trabalho e evitar acúmulo.",
    ],
    q5: [
      "Formalizar política de pausas programadas, incluindo horários definidos e respaldo da liderança.",
      "Sensibilizar lideranças sobre a importância legal e ergonômica das pausas para saúde e produtividade.",
      "Monitorar cumprimento das pausas obrigatórias conforme NR-17 e acionar correções quando necessário.",
      "Adequar os espaços de descanso para torná-los confortáveis e acolhedores para as pausas durante o trabalho.",
    ],
    q6: [
      "Monitorar sistematicamente banco de horas e horas extras, com alertas para excessos recorrentes.",
      "Sensibilizar gestores sobre o impacto negativo do excesso de horas extras na saúde e na produtividade.",
      "Revisar o dimensionamento de equipe para garantir que o volume de trabalho seja compatível com o horário normal.",
      "Estabelecer política clara de horas extras, com limites, critérios de autorização e contrapartidas adequadas.",
    ],
    q7: [
      "Realizar mapeamento e otimização de processos para eliminar gargalos que impõem ritmo acelerado.",
      "Conduzir Análise Ergonômica do Trabalho (AET) para avaliar exigências de ritmo e propor melhorias.",
      "Redistribuir tarefas e revisar metas, tornando-as compatíveis com o ritmo saudável de trabalho.",
      "Capacitar lideranças em gestão humanizada, promovendo desempenho sustentável sem ritmo acelerado excessivo.",
    ],
    q8: [
      "Rever a organização do trabalho para viabilizar a realização efetiva das pausas previstas.",
      "Capacitar supervisores sobre as exigências da NR-17 e as consequências do descumprimento das pausas.",
      "Implantar controle de pausas nas escalas de trabalho, garantindo cumprimento operacional.",
      "Adequar a demanda ao tempo disponível, eliminando excesso de tarefas que inviabilizam as pausas.",
    ],
  },
  step3: {
    q1: [
      "Flexibilizar os horários de pausa, permitindo que o colaborador escolha o melhor momento dentro da jornada.",
      "Capacitar lideranças em gestão com autonomia, reduzindo o controle excessivo sobre as pausas.",
      "Revisar rotinas organizacionais que impeçam ou dificultem a realização de pausas autônomas.",
      "Implantar modelo de trabalho por entregas, dando ao colaborador mais liberdade para gerir seu tempo.",
    ],
    q2: [
      "Revisar o nível de controle sobre o ritmo de trabalho, identificando microgestão desnecessária.",
      "Implantar gestão por objetivos e resultados (OKR/MBO) em substituição ao controle de ritmo.",
      "Mapear gargalos externos que impõem ritmo acelerado ao colaborador e eliminá-los.",
      "Capacitar gestores em liderança delegativa e em confiança no desempenho da equipe.",
    ],
    q3: [
      "Ampliar a margem de decisão dos colaboradores nos processos de trabalho, reduzindo padronização excessiva.",
      "Revisar práticas de microgestão e reduzir o controle sobre o como as atividades são realizadas.",
      "Capacitar equipes em autogestão e em técnicas de organização pessoal do trabalho.",
      "Implantar metodologias ágeis que aumentem a autonomia das equipes na execução de tarefas.",
    ],
    q4: [
      "Revisar processos de priorização de tarefas, transferindo mais autonomia para o colaborador.",
      "Implantar gestão por resultados, focando no que deve ser entregue e não em como cada passo é feito.",
      "Ampliar a delegação de responsabilidades, desenvolvendo a capacidade decisória das equipes.",
      "Oferecer treinamento em gestão do próprio trabalho e em técnicas de priorização pessoal.",
    ],
    q5: [
      "Criar canais formais para sugestões e melhorias de processos, valorizando a voz do colaborador.",
      "Envolver equipes na revisão e redesenho dos fluxos de trabalho que os afetam diretamente.",
      "Capacitar gestores em liderança participativa que incorpora a contribuição dos colaboradores.",
      "Implantar grupos de melhoria contínua com participação ativa dos colaboradores nas decisões.",
    ],
    q6: [
      "Avaliar a possibilidade de implementação de horário flexível ou banco de horas conforme perfil da função.",
      "Mapear funções com potencial de flexibilidade de horário e criar projeto-piloto de flextime.",
      "Sensibilizar gestores sobre os benefícios do trabalho flexível para engajamento e qualidade de vida.",
      "Criar política formal de flexibilidade de horário, com regras claras e critérios por cargo e área.",
    ],
  },
  step4: {
    q1: [
      "Melhorar o fluxo de comunicação interna, garantindo que informações essenciais cheguem a tempo a todos.",
      "Criar base de conhecimento centralizada e acessível com procedimentos, orientações e materiais de apoio.",
      "Capacitar líderes em comunicação clara e assertiva para suporte efetivo às equipes.",
      "Estabelecer rotinas regulares de briefing de equipe para garantir alinhamento e suporte contínuo.",
    ],
    q2: [
      "Capacitar líderes em gestão de pessoas, desenvolvendo habilidades de suporte e apoio em situações difíceis.",
      "Implantar reuniões regulares de acompanhamento individual (one-on-one) entre líder e colaborador.",
      "Criar política formal de portas abertas, incentivando colaboradores a buscar a liderança quando necessário.",
      "Treinar lideranças em escuta ativa e em técnicas de apoio emocional no contexto de trabalho.",
    ],
    q3: [
      "Promover cultura de segurança psicológica, onde colaboradores se sintam seguros para dialogar sobre problemas.",
      "Capacitar líderes em escuta ativa, empatia e em técnicas de feedback construtivo.",
      "Criar fóruns regulares de diálogo aberto entre equipes e lideranças para tratar situações incômodas.",
      "Implantar pesquisa de clima periódica e compartilhar ações derivadas com toda a equipe.",
    ],
    q4: [
      "Implantar programa de apoio psicossocial, com acesso a profissionais capacitados para suporte emocional.",
      "Capacitar líderes a identificar sinais de sobrecarga emocional e oferecer apoio preventivo às equipes.",
      "Criar grupos de suporte entre pares para troca de experiências em atividades emocionalmente exigentes.",
      "Oferecer acesso a acompanhamento psicológico como benefício corporativo para colaboradores.",
    ],
    q5: [
      "Capacitar líderes em técnicas de reconhecimento, feedback positivo e incentivo ao desenvolvimento.",
      "Implantar programa formal de reconhecimento que valorize conquistas individuais e coletivas.",
      "Criar cultura de valorização de conquistas com rituais regulares de celebração de resultados.",
      "Desenvolver competências de liderança motivacional por meio de treinamentos e coaching.",
    ],
  },
  step5: {
    q1: [
      "Promover cultura de colaboração com atividades e rituais de equipe que incentivem a ajuda mútua.",
      "Implantar programas de mentoria entre pares, conectando colaboradores experientes a novos membros.",
      "Criar dinâmicas regulares de integração de equipe para fortalecer vínculos e disposição de apoio.",
      "Capacitar equipes em comunicação colaborativa e em práticas de trabalho conjunto eficaz.",
    ],
    q2: [
      "Promover gestão do conhecimento compartilhado, criando espaços para troca de saberes entre colegas.",
      "Criar rituais de cooperação (reuniões de apoio, revisões em par) que estimulem o suporte mútuo.",
      "Mapear gargalos de colaboração entre equipes e eliminar barreiras organizacionais à cooperação.",
      "Estabelecer indicadores de trabalho colaborativo e reconhecer equipes pelo desempenho coletivo.",
    ],
    q3: [
      "Implantar código de conduta e convivência, com regras claras de respeito mútuo no ambiente de trabalho.",
      "Promover treinamento em respeito, diversidade e inclusão para todos os colaboradores.",
      "Criar canal seguro e sigiloso para relato de comportamentos inadequados entre colegas.",
      "Desenvolver programa de cultura organizacional positiva com foco em relações respeitosas.",
    ],
    q4: [
      "Criar espaços formais de escuta entre pares, como rodas de conversa e grupos de apoio.",
      "Promover treinamento em comunicação empática e não violenta para toda a equipe.",
      "Implementar cultura psicologicamente segura onde é natural e esperado pedir ajuda aos colegas.",
      "Desenvolver competências de inteligência emocional nas equipes por meio de treinamentos e vivências.",
    ],
  },
  step6: {
    q1: [
      "Implementar canal de denúncias seguro, sigiloso e acessível para relatos de perseguição e assédio.",
      "Capacitar lideranças em prevenção ao assédio moral e em condução de investigações internas.",
      "Investigar e tratar com rigor todos os casos de perseguição relatados, com consequências claras.",
      "Promover política formal de tolerância zero ao assédio, comunicada a todos os colaboradores.",
    ],
    q2: [
      "Implantar processo estruturado de mediação de conflitos com apoio de profissional qualificado.",
      "Capacitar lideranças em gestão e resolução de conflitos interpessoais no ambiente de trabalho.",
      "Promover dinâmicas de integração e de resolução coletiva para prevenir e tratar conflitos.",
      "Mapear causas recorrentes dos conflitos e tratar as origens estruturais e organizacionais.",
    ],
    q3: [
      "Implantar código de conduta com regras claras e sanções proporcionais para comportamentos rudes.",
      "Capacitar gestores e colaboradores em comunicação não violenta e em relações interpessoais saudáveis.",
      "Criar mecanismo seguro de relato de condutas inadequadas com apuração transparente.",
      "Promover campanha interna de cultura de respeito, reforçando valores e comportamentos esperados.",
    ],
    q4: [
      "Promover atividades de integração e fortalecimento de equipe para restaurar vínculos desgastados.",
      "Implantar pesquisa de clima periódica e criar ciclos de feedback para acompanhar a evolução.",
      "Contratar facilitação externa de dinâmicas de grupo para apoio em equipes com conflitos estabelecidos.",
      "Revisar carga de trabalho e outros fatores geradores de estresse que contribuem para o desgaste relacional.",
    ],
  },
  step7: {
    q1: [
      "Revisar, atualizar e comunicar formalmente as descrições de cargo a todos os colaboradores.",
      "Realizar reuniões regulares de alinhamento de expectativas entre líderes e suas equipes.",
      "Implantar sistema de gestão por objetivos (OKR ou MBO) para tornar expectativas mensuráveis e claras.",
      "Capacitar líderes em comunicação clara de metas, papéis e expectativas de desempenho.",
    ],
    q2: [
      "Criar manuais e procedimentos operacionais claros e acessíveis para guiar a execução das atividades.",
      "Implantar programa estruturado de integração e onboarding com foco em capacitação prática.",
      "Oferecer treinamentos técnicos específicos para as atividades de cada função.",
      "Criar sistema de mentoria que conecte colaboradores mais experientes a quem precisa de orientação.",
    ],
    q3: [
      "Revisar e distribuir formalmente descrições de cargo atualizadas para todos os colaboradores.",
      "Criar mapa visual de responsabilidades por função e torná-lo acessível a toda a equipe.",
      "Realizar conversas individuais de alinhamento entre líderes e cada membro da equipe.",
      "Implantar avaliação de desempenho com ciclos regulares de feedback sobre papéis e responsabilidades.",
    ],
    q4: [
      "Realizar reuniões de desdobramento estratégico para comunicar objetivos departamentais à equipe.",
      "Tornar metas e objetivos do departamento visíveis por meio de painéis ou comunicação recorrente.",
      "Capacitar líderes em comunicação estratégica para conectar o trabalho da equipe aos objetivos maiores.",
      "Implantar indicadores de desempenho departamental compartilhados e acompanhados em equipe.",
    ],
    q5: [
      "Promover comunicação regular sobre a estratégia organizacional e como cada área contribui para ela.",
      "Criar narrativa de propósito que conecte as funções individuais aos objetivos gerais da organização.",
      "Implantar reuniões amplas (town hall) com a liderança sênior para comunicação de estratégia e resultados.",
      "Desenvolver programa de integração estratégica que mostre a cada colaborador o impacto do seu trabalho.",
    ],
  },
  step8: {
    q1: [
      "Criar fóruns formais de perguntas e respostas durante processos de mudança, com lideranças disponíveis.",
      "Capacitar líderes em comunicação bidirecional, incentivando e respondendo questões da equipe.",
      "Implantar canal digital (FAQ, fórum online) para registro e resposta de perguntas sobre mudanças.",
      "Treinar gestores em gestão transparente de mudanças, compartilhando o máximo de informações possível.",
    ],
    q2: [
      "Implantar processo participativo de gestão de mudanças, envolvendo colaboradores na concepção das soluções.",
      "Criar comitês ou grupos representativos de colaboradores para consulta antes de decisões de mudança.",
      "Realizar consultas formais com as equipes afetadas antes de implementar mudanças significativas.",
      "Desenvolver cultura de co-construção onde mudanças são projetadas com as pessoas, não apenas para elas.",
    ],
    q3: [
      "Melhorar a comunicação de mudanças com planos detalhados, exemplos práticos e cronogramas claros.",
      "Criar materiais explicativos (guias, tutoriais, FAQ) sobre como cada mudança será aplicada na prática.",
      "Oferecer treinamentos e capacitações antes da implantação das mudanças para preparar a equipe.",
      "Designar ponto focal por equipe para esclarecer dúvidas e apoiar a transição durante as mudanças.",
    ],
  },
};

function LoadingSpinner({ label = "Carregando..." }) {
  return (
    <div className="loading-wrap" role="status" aria-live="polite">
      <span className="loading-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

function ReportDomainsRadar({ domains = [], fmtPct, fmtScore }) {
  const items = (domains || []).map((d, idx) => ({
    key: d?.key || `domain-${idx}`,
    domain: String(d?.domain || d?.label || `Domínio ${idx + 1}`),
    percent: Math.max(0, Math.min(100, Number(d?.percent || 0))),
    avg_score: Number(d?.avg_score || 0),
    zoneKey: String(d?.zone?.key || "red").toLowerCase(),
  }));

  if (!items.length) {
    return <p className="empty-state">Nenhum domínio disponível.</p>;
  }

  const size = 530;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 138;
  const labelRadius = radius + 32;
  const levels = [20, 40, 60, 80, 100];
  const zoneColor = (zoneKey) => {
    if (zoneKey === "green") return "#22c55e";
    if (zoneKey === "yellow") return "#f59e0b";
    return "#ef4444";
  };

  const pointAt = (index, pct, rOffset = 0) => {
    const angle = (-Math.PI / 2) + (2 * Math.PI * index) / items.length;
    const r = ((Math.max(0, Math.min(100, pct)) / 100) * radius) + rOffset;
    return {
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
      angle,
    };
  };

  const polygonPoints = (pct) => items.map((_, idx) => {
    const p = pointAt(idx, pct);
    return `${p.x},${p.y}`;
  }).join(" ");

  const dataPolygonPoints = items.map((item, idx) => {
    const p = pointAt(idx, item.percent);
    return `${p.x},${p.y}`;
  }).join(" ");

  return (
    <div className="report-domain-radar-wrap">
      <div className="report-domain-radar-canvas" aria-label="Radar de média por domínio">
        <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-hidden="true">
          <defs>
            <linearGradient id="reportDomainRadarFill" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.14" />
            </linearGradient>
          </defs>

          {levels.map((lvl) => (
            <polygon
              key={`ring-${lvl}`}
              points={polygonPoints(lvl)}
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="1"
              strokeDasharray={lvl === 100 ? undefined : "3 4"}
            />
          ))}

          {items.map((_, idx) => {
            const p = pointAt(idx, 100);
            return <line key={`axis-${idx}`} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#cbd5e1" strokeWidth="1" />;
          })}

          <polygon points={dataPolygonPoints} fill="url(#reportDomainRadarFill)" stroke="#2563eb" strokeWidth="2" />

          {items.map((item, idx) => {
            const p = pointAt(idx, item.percent);
            return (
              <g key={`point-${item.key}`}>
                <circle cx={p.x} cy={p.y} r="4.5" fill={zoneColor(item.zoneKey)} stroke="#fff" strokeWidth="1.5" />
              </g>
            );
          })}

          {levels.map((lvl) => (
            <text
              key={`tick-${lvl}`}
              x={cx + 6}
              y={cy - ((lvl / 100) * radius) + 4}
              fontSize="12"
              fontWeight="500"
              fill="#6b7280"
              stroke="none"
            >
              {lvl}%
            </text>
          ))}

          {items.map((item, idx) => {
            const p = pointAt(idx, 100, 24);
            const anchor = p.x > cx + 8 ? "start" : (p.x < cx - 8 ? "end" : "middle");
            const dy = p.y > cy + 6 ? 12 : (p.y < cy - 6 ? -6 : 4);
            return (
              <text
                key={`label-${item.key}`}
                x={p.x}
                y={p.y + dy}
                textAnchor={anchor}
                fontSize="12"
                fontWeight="500"
                fill="#334155"
                stroke="none"
              >
                {item.domain}
              </text>
            );
          })}
        </svg>
      </div>

      <div className="report-domain-radar-legend">
        {items.map((item) => (
          <div key={`legend-${item.key}`} className="report-domain-radar-legend-item">
            <span className={`report-domain-radar-dot ${item.zoneKey}`} aria-hidden="true" />
            <span className="report-domain-radar-label">{item.domain}</span>
            <span className="report-domain-values">{fmtPct(item.percent)} | {fmtScore(item.avg_score)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardSegmentsRadar({ domains = [], fmtPct }) {
  const items = (domains || []).map((d, idx) => ({
    key: d?.key || `seg-${idx}`,
    label: String(d?.label || d?.domain || `Segmento ${idx + 1}`),
    percent: Math.max(0, Math.min(100, Number(d?.percent || 0))),
    zoneKey: String(d?.zone?.key || "red").toLowerCase(),
  }));

  if (!items.length) {
    return <p className="empty-state">Sem dados suficientes.</p>;
  }

  const size = 760;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 305;
  const levels = [20, 40, 60, 80, 100];
  const zoneColor = (zoneKey) => {
    if (zoneKey === "green") return "#22c55e";
    if (zoneKey === "yellow") return "#f59e0b";
    return "#ef4444";
  };
  const pointAt = (index, pct, extra = 0) => {
    const angle = (-Math.PI / 2) + (2 * Math.PI * index) / items.length;
    const r = ((Math.max(0, Math.min(100, pct)) / 100) * radius) + extra;
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
  };
  const polyPoints = (pct) => items.map((_, idx) => {
    const p = pointAt(idx, pct);
    return `${p.x},${p.y}`;
  }).join(" ");
  const dataPoints = items.map((it, idx) => {
    const p = pointAt(idx, it.percent);
    return `${p.x},${p.y}`;
  }).join(" ");

  return (
    <div className="dash-radar-wrap">
      <div className="dash-radar-canvas" aria-label="Radar de distribuição por segmento">
        <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-hidden="true">
          {levels.map((lvl) => (
            <polygon
              key={`dash-ring-${lvl}`}
              points={polyPoints(lvl)}
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="1"
              strokeDasharray={lvl === 100 ? undefined : "3 4"}
            />
          ))}
          {items.map((_, idx) => {
            const p = pointAt(idx, 100);
            return <line key={`dash-axis-${idx}`} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#cbd5e1" strokeWidth="1" />;
          })}
          <polygon points={dataPoints} fill="none" stroke="#60a5fa" strokeWidth="2" />
          {items.map((it, idx) => {
            const p = pointAt(idx, it.percent);
            return <circle key={`dash-point-${it.key}`} cx={p.x} cy={p.y} r="4.5" fill={zoneColor(it.zoneKey)} stroke="#fff" strokeWidth="1.5" />;
          })}
          {levels.map((lvl) => (
            <text key={`dash-tick-${lvl}`} x={cx + 6} y={cy - ((lvl / 100) * radius) + 4} fontSize="10" fill="#6b7280" stroke="none">
              {lvl}%
            </text>
          ))}
          {items.map((it, idx) => {
            const p = pointAt(idx, 100, 18);
            const anchor = p.x > cx + 8 ? "start" : (p.x < cx - 8 ? "end" : "middle");
            const dy = p.y > cy + 6 ? 12 : (p.y < cy - 6 ? -6 : 4);
            return (
              <text
                key={`dash-label-${it.key}`}
                x={p.x}
                y={p.y + dy}
                textAnchor={anchor}
                fontSize="11"
                fontWeight="500"
                fill="#334155"
                stroke="none"
              >
                {it.label}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function DashboardOverviewModern({
  cards = [],
  domains = [],
  histLabels = [],
  histValues = [],
  maxHist = 1,
  dashEmpresaBusca = "",
  dashEmpresaSugestoes = [],
  dashEmpresa = "",
  dashData = {},
  dashEmpresaMenuOpen = false,
  setDashEmpresaMenuOpen,
  onDashboardEmpresaBuscaChange,
  onDashboardEmpresaChange,
  selectDashEmpresaBuscaOption,
  dashDateFrom = "",
  dashDateTo = "",
  onDashboardDateChange,
  canFilter = false,
  dashLoad = false,
  dashErr = "",
  loadDashboardOverview,
  userName = "Usuario",
  userRoleLabel = "Usuario",
  goSection,
  fmtPct,
  reportZoneClass,
}) {
  const canal = dashData?.canal_overview || {};
  const denPorStatus = canal.den_por_status || [];
  const denPorTipo = canal.den_por_tipo || [];
  const denPorGhe = canal.den_por_ghe || [];
  const humorPorTipo = canal.humor_por_tipo || [];
  const humorTrendLabels = canal.humor_trend?.labels || [];
  const humorTrendValues = canal.humor_trend?.values || [];
  const maxHumorTrend = Math.max(1, ...humorTrendValues.map((v) => Number(v || 0)));
  const empresaSelecionada = dashEmpresa
    ? (dashData?.empresas || []).find((emp) => String(emp.id) === String(dashEmpresa))
    : null;
  const HUMOR_COLORS = {
    feliz: "#22c55e", motivado: "#3b82f6", tranquilo: "#06b6d4",
    cansado: "#f59e0b", estressado: "#ef4444", triste: "#6366f1",
    ansioso: "#8b5cf6", sobrecarregado: "#f97316",
  };
  const HUMOR_EMOJI = {
    feliz: "Feliz", motivado: "Motivado", tranquilo: "Tranquilo",
    cansado: "Cansado", estressado: "Estressado", triste: "Triste",
    ansioso: "Ansioso", sobrecarregado: "Sobrecarregado",
  };
  const DEN_STATUS_COLORS = { ABERTA: "#ef4444", EM_ANALISE: "#f59e0b", RESOLVIDA: "#22c55e" };
  const maxDenStatus = Math.max(1, ...denPorStatus.map((d) => Number(d.value || 0)));
  const maxDenTipo = Math.max(1, ...denPorTipo.map((d) => Number(d.value || 0)));
  const maxDenGhe = Math.max(1, ...denPorGhe.map((d) => Number(d.value || 0)));
  const maxHumorTipo = Math.max(1, ...humorPorTipo.map((d) => Number(d.value || 0)));
  const totalSummary = cards.reduce((acc, card) => acc + Number(card.value || 0), 0);
  const avgDomain = domains.length ? Math.round(domains.reduce((acc, d) => acc + Number(d.percent || 0), 0) / domains.length) : 0;
  const topDomain = [...domains].sort((a, b) => Number(b.percent || 0) - Number(a.percent || 0))[0];
  const openStatus = denPorStatus.find((item) => item.key === "ABERTA")?.value || 0;
  const resolvedStatus = denPorStatus.find((item) => item.key === "RESOLVIDA")?.value || 0;
  const topTipo = [...denPorTipo].sort((a, b) => Number(b.value || 0) - Number(a.value || 0))[0];
  const topHumor = [...humorPorTipo].sort((a, b) => Number(b.value || 0) - Number(a.value || 0))[0];
  const overviewCards = [
    {
      key: "summary-total",
      title: cards[0]?.label || "Indicadores gerais",
      value: cards[0]?.value ?? totalSummary,
      detail: totalSummary > 0 ? `${totalSummary} leituras agregadas no panorama` : "Dados consolidados do período selecionado",
      tone: "featured",
    },
    {
      key: "summary-domain",
      title: "Média de segmentos",
      value: `${avgDomain}%`,
      detail: topDomain ? `Maior peso atual em ${topDomain.label}` : "Sem distribuição registrada",
      tone: "soft",
    },
    {
      key: "summary-denuncias",
      title: "Canal de denúncias",
      value: canal.total_denuncias ?? 0,
      detail: `${openStatus} em aberto • ${resolvedStatus} resolvidas`,
      tone: "soft",
    },
    {
      key: "summary-humor",
      title: "Humor monitorado",
      value: canal.total_humor ?? 0,
      detail: topHumor ? `Predomínio de ${topHumor.label}` : "Sem registros de humor",
      tone: "soft",
    },
  ];
  const reminders = [
    topTipo ? { title: topTipo.label, meta: `${topTipo.value} ocorrências no canal`, accent: "orange" } : null,
    topDomain ? { title: topDomain.label, meta: `${fmtPct(topDomain.percent)} do total segmentado`, accent: reportZoneClass(topDomain.zone) } : null,
    { title: "Pedidos de ajuda", meta: `${canal.total_pedidos_ajuda ?? 0} registros no período`, accent: "teal" },
  ].filter(Boolean);

  return (
    <section className="dashboard-analytics dashboard-analytics-modern">
      <div className="dashboard-topbar">
        <div className="dashboard-topbar-search">
          <span className="dashboard-topbar-search-icon" aria-hidden="true">⌕</span>
          <input
            id="dash-empresa-search"
            placeholder="Buscar empresa ou filtrar visão..."
            autoComplete="off"
            value={dashEmpresaBusca}
            onFocus={() => setDashEmpresaMenuOpen(true)}
            onBlur={() => setTimeout(() => setDashEmpresaMenuOpen(false), 120)}
            onChange={(e) => { onDashboardEmpresaBuscaChange(e.target.value); setDashEmpresaMenuOpen(true); }}
          />
          {dashEmpresaMenuOpen && canFilter && (
            <div className="dashboard-topbar-menu">
              <button type="button" className="dashboard-topbar-menu-item" onMouseDown={(ev) => ev.preventDefault()} onClick={() => { setDashEmpresaMenuOpen(false); onDashboardEmpresaChange(""); }}>
                <span>Todas as empresas</span>
              </button>
              {dashEmpresaSugestoes.length === 0 ? (
                <div className="dashboard-topbar-empty">Nenhuma empresa encontrada.</div>
              ) : (
                dashEmpresaSugestoes.map((emp) => (
                  <button key={`dash-emp-opt-${emp.id}`} type="button" className="dashboard-topbar-menu-item" onMouseDown={(ev) => ev.preventDefault()} onClick={() => selectDashEmpresaBuscaOption(emp)}>
                    <span>{emp.name}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="dashboard-topbar-actions">
          <button type="button" className="dashboard-ghost-btn" onClick={() => loadDashboardOverview()}>
            Atualizar
          </button>
          {(dashDateFrom || dashDateTo) && (
            <button type="button" className="dashboard-ghost-btn" onClick={() => onDashboardDateChange("", "")}>
              Limpar período
            </button>
          )}
          {/* <div className="dashboard-profile-badge">
            <span className="dashboard-profile-avatar">{String(userName || "U").trim().charAt(0).toUpperCase()}</span>
            <div>
              <strong>{userName}</strong>
              <span>{userRoleLabel}</span>
            </div>
          </div> */}
        </div>
      </div>

      <div className="dashboard-hero dashboard-hero-modern">
        <div className="dashboard-hero-main">
          <span className="dashboard-kicker">Central analítica</span>
          <h2>Dashboard</h2>
          <p className="subtitle">Visualize indicadores operacionais, evolução do ambiente ocupacional e sinais de atenção em uma única tela.</p>
          {/* <div className="dashboard-hero-pills">
            <span className="dashboard-pill dashboard-pill-strong">{empresaSelecionada?.name || "Visão consolidada"}</span>
            <span className="dashboard-pill">{dashDateFrom || "Início livre"}</span>
            <span className="dashboard-pill">{dashDateTo || "Até hoje"}</span>
          </div> */}
        </div>
        {canFilter && (
          <div className="dashboard-hero-filter dashboard-hero-filter-modern">
            <div className="dash-date-range">
              <input type="date" value={dashDateFrom} max={dashDateTo || undefined} onChange={(e) => onDashboardDateChange(e.target.value, dashDateTo)} title="Data inicial" />
              <span className="dash-date-range-sep">—</span>
              <input type="date" value={dashDateTo} min={dashDateFrom || undefined} onChange={(e) => onDashboardDateChange(dashDateFrom, e.target.value)} title="Data final" />
            </div>
            <button type="button" className="dashboard-primary-btn" onClick={() => loadDashboardOverview()}>
              Aplicar visão
            </button>
          </div>
        )}
      </div>

      {dashLoad && <LoadingSpinner label="Carregando dashboard..." />}
      {dashErr && <p className="error">{dashErr}</p>}

      {!dashLoad && (
        <div className="dashboard-showcase">
          <div className="dashboard-stat-grid">
            {overviewCards.map((card) => (
              <article key={card.key} className={`dashboard-stat-card ${card.tone === "featured" ? "featured" : ""}`}>
                <div className="dashboard-stat-head">
                  <p>{card.title}</p>
                  <span>↗</span>
                </div>
                <strong>{card.value}</strong>
                <small>{card.detail}</small>
              </article>
            ))}
          </div>

          <div className="dashboard-showcase-grid">
            <div className="dashboard-showcase-main">
              <article className="dashboard-panel dashboard-panel-large dashboard-panel-spotlight">
                <div className="dashboard-panel-header-modern">
                  <div>
                    <span className="dashboard-panel-kicker">Mapa executivo</span>
                    <h3>Distribuição por segmento</h3>
                  </div>
                  <span className="dashboard-panel-badge">{domains.length} frentes</span>
                </div>
                {domains.length === 0 ? (
                  <p className="empty-state">Sem dados suficientes.</p>
                ) : (
                  <div className="dashboard-segment-layout">
                    <div className="dashboard-segment-bars">
                      {domains.map((d) => (
                        <div key={`dash-domain-${d.key}`} className="dashboard-segment-row">
                          <div>
                            <strong>{d.label}</strong>
                            <span>{fmtPct(d.percent)}</span>
                          </div>
                          <div className="dashboard-segment-track">
                            <i className={`dashboard-segment-fill ${reportZoneClass(d.zone)}`} style={{ width: `${Math.max(0, Math.min(100, Number(d.percent || 0)))}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="dashboard-progress-dial">
                      <div className="dashboard-progress-ring" style={{ "--progress": avgDomain }}>
                        <div className="dashboard-progress-ring-inner">
                          <strong>{avgDomain}%</strong>
                          <span>média geral</span>
                        </div>
                      </div>
                      <p>{topDomain ? `${topDomain.label} lidera a composição atual.` : "A distribuição aparecerá aqui quando houver dados."}</p>
                    </div>
                  </div>
                )}
              </article>

              <div className="dashboard-double-grid">
                <article className="dashboard-panel">
                  <div className="dashboard-panel-header-modern">
                    <div>
                      <span className="dashboard-panel-kicker">Evolução</span>
                      <h3>Histórico de avaliações</h3>
                    </div>
                    <span className="dashboard-panel-badge">6 meses</span>
                  </div>
                  {histValues.length === 0 ? (
                    <p className="empty-state">Sem histórico.</p>
                  ) : (
                    <div className="dashboard-chart-modern">
                      {histValues.map((v, idx) => {
                        const heightPct = Math.max(8, (Number(v || 0) / maxHist) * 100);
                        return (
                          <div key={`dash-hist-${idx}`} className="dashboard-chart-modern-col">
                            <span className="dashboard-chart-modern-value">{v > 0 ? v : "\u200b"}</span>
                            <div className="dashboard-chart-modern-bar-wrap">
                              <div className="dashboard-chart-modern-bar" style={{ height: `${heightPct}%` }} title={`${histLabels[idx]}: ${v}`} />
                            </div>
                            <span className="dashboard-chart-modern-label">{histLabels[idx]}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </article>

                <article className="dashboard-panel">
                  <div className="dashboard-panel-header-modern">
                    <div>
                      <span className="dashboard-panel-kicker">Canal</span>
                      <h3>Denúncias por status</h3>
                    </div>
                    <span className="dashboard-panel-badge">{canal.total_denuncias ?? 0} registros</span>
                  </div>
                  {denPorStatus.every((d) => d.value === 0) ? (
                    <p className="empty-state">Nenhuma denúncia registrada.</p>
                  ) : (
                    <div className="dashboard-list-stack">
                      {denPorStatus.map((d) => (
                        <div key={`den-status-${d.key}`} className="dashboard-list-row">
                          <div className="dashboard-list-title">
                            <strong>{d.label}</strong>
                            <span>{d.value} casos</span>
                          </div>
                          <div className="dashboard-list-track">
                            <i style={{ width: `${(d.value / maxDenStatus) * 100}%`, background: DEN_STATUS_COLORS[d.key] || "#94a3b8" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              </div>

              <div className="dashboard-double-grid">
                <article className="dashboard-panel">
                  <div className="dashboard-panel-header-modern">
                    <div>
                      <span className="dashboard-panel-kicker">Classificação</span>
                      <h3>Denúncias por tipo</h3>
                    </div>
                  </div>
                  {denPorTipo.length === 0 ? (
                    <p className="empty-state">Nenhuma denúncia registrada.</p>
                  ) : (
                    <div className="dashboard-list-stack">
                      {denPorTipo.map((d, i) => (
                        <div key={`den-tipo-${i}`} className="dashboard-list-row">
                          <div className="dashboard-list-title">
                            <strong>{d.label}</strong>
                            <span>{d.value} ocorrências</span>
                          </div>
                          <div className="dashboard-list-track">
                            <i style={{ width: `${(d.value / maxDenTipo) * 100}%`, background: "linear-gradient(90deg, #0ea5e9, #0369a1)" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>

                <article className="dashboard-panel">
                  <div className="dashboard-panel-header-modern">
                    <div>
                      <span className="dashboard-panel-kicker">Humor</span>
                      <h3>Humor por tipo</h3>
                    </div>
                  </div>
                  {humorPorTipo.length === 0 ? (
                    <p className="empty-state">Nenhum registro de humor.</p>
                  ) : (
                    <div className="dashboard-list-stack">
                      {humorPorTipo.map((d) => (
                        <div key={`humor-tipo-${d.key}`} className="dashboard-list-row">
                          <div className="dashboard-list-title">
                            <strong>{HUMOR_EMOJI[d.key] || ""}</strong>
                            <span>{d.value} registros</span>
                          </div>
                          <div className="dashboard-list-track">
                            <i style={{ width: `${(d.value / maxHumorTipo) * 100}%`, background: HUMOR_COLORS[d.key] || "#94a3b8" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              </div>

              <article className="dashboard-panel dashboard-panel-wide">
                <div className="dashboard-panel-header-modern">
                  <div>
                    <span className="dashboard-panel-kicker">Ritmo do período</span>
                    <h3>Histórico de humor</h3>
                  </div>
                  <span className="dashboard-panel-badge">Últimos 6 meses</span>
                </div>
                {humorTrendValues.every((v) => v === 0) ? (
                  <p className="empty-state">Nenhum registro de humor no período.</p>
                ) : (
                  <div className="dashboard-chart-modern dashboard-chart-modern-green">
                    {humorTrendValues.map((v, idx) => {
                      const heightPct = Math.max(8, (Number(v || 0) / maxHumorTrend) * 100);
                      return (
                        <div key={`humor-trend-${idx}`} className="dashboard-chart-modern-col">
                          <span className="dashboard-chart-modern-value">{v > 0 ? v : "\u200b"}</span>
                          <div className="dashboard-chart-modern-bar-wrap">
                            <div className="dashboard-chart-modern-bar" style={{ height: `${heightPct}%`, background: "linear-gradient(180deg,#34d399,#047857)" }} title={`${humorTrendLabels[idx]}: ${v}`} />
                          </div>
                          <span className="dashboard-chart-modern-label">{humorTrendLabels[idx]}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>
            </div>

            <aside className="dashboard-showcase-side">
              <article className="dashboard-panel dashboard-side-panel">
                <div className="dashboard-panel-header-modern">
                  <div>
                    <span className="dashboard-panel-kicker">Resumo rápido</span>
                    <h3>Prioridades do período</h3>
                  </div>
                  <span className="dashboard-panel-badge">Agora</span>
                </div>
                <div className="dashboard-reminder-list">
                  {reminders.map((item, index) => (
                    <button key={`dashboard-reminder-${index}`} type="button" className="dashboard-reminder-item" style={{ minHeight: 0 }}>
                      <span className={`dashboard-reminder-dot ${item.accent || ""}`} />
                      <div>
                        <strong>{item.title}</strong>
                        <span>{item.meta}</span>
                      </div>
                    </button>
                  ))}
                </div>
                {/* <button type="button" className="dashboard-primary-btn dashboard-primary-btn-block" onClick={() => goSection("configuracoes")}>
                  Abrir configurações
                </button> */}
              </article>

              <article className="dashboard-panel dashboard-side-panel">
                <div className="dashboard-panel-header-modern">
                  <div>
                    <span className="dashboard-panel-kicker">Radar de GHE</span>
                    <h3>Denúncias por GHE</h3>
                  </div>
                </div>
                {denPorGhe.length === 0 ? (
                  <p className="empty-state">Nenhuma denúncia com GHE informado.</p>
                ) : (
                  <div className="dashboard-list-stack compact">
                    {denPorGhe.slice(0, 5).map((d, i) => (
                      <div key={`den-ghe-${i}`} className="dashboard-list-row">
                        <div className="dashboard-list-title">
                          <strong>{d.label}</strong>
                          <span>{d.value} relatos</span>
                        </div>
                        <div className="dashboard-list-track">
                          <i style={{ width: `${(d.value / maxDenGhe) * 100}%`, background: "linear-gradient(90deg, #8b5cf6, #6d28d9)" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>

              <article className="dashboard-panel dashboard-panel-timer">
                <span className="dashboard-panel-kicker">Monitor</span>
                <h3>{canal.total_pedidos_ajuda ?? 0}</h3>
                <p>Pedidos de ajuda acompanhados no período selecionado.</p>
              </article>
            </aside>
          </div>
        </div>
      )}
    </section>
  );
}

const BRAZIL_STATE_CODES = {
  acre: "AC",
  alagoas: "AL",
  amapa: "AP",
  amazonas: "AM",
  bahia: "BA",
  ceara: "CE",
  "distrito federal": "DF",
  "espirito santo": "ES",
  goias: "GO",
  maranhao: "MA",
  "mato grosso": "MT",
  "mato grosso do sul": "MS",
  "minas gerais": "MG",
  para: "PA",
  paraiba: "PB",
  parana: "PR",
  pernambuco: "PE",
  piaui: "PI",
  "rio de janeiro": "RJ",
  "rio grande do norte": "RN",
  "rio grande do sul": "RS",
  rondonia: "RO",
  roraima: "RR",
  "santa catarina": "SC",
  "sao paulo": "SP",
  sergipe: "SE",
  tocantins: "TO",
};

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function resolveBrazilStateCode(address = {}) {
  const direct = String(address.state_code || "").trim().toUpperCase();
  if (direct && direct.length === 2) return direct;

  const iso = String(address["ISO3166-2-lvl4"] || address["ISO3166-2-lvl3"] || "").trim();
  if (iso.includes("-")) {
    const suffix = iso.split("-").pop().toUpperCase();
    if (suffix.length === 2) return suffix;
  }

  return BRAZIL_STATE_CODES[normalizeText(address.state)] || "";
}

export default function App() {
  const publicToken = getPublicQuestionarioToken();
  const isPublicQuestionario = Boolean(publicToken);
  const denunciaToken = getPublicCanalDenunciasToken();
  const isPublicCanalDenuncias = Boolean(denunciaToken) && !isPublicQuestionario;
  const totemPublicToken = getPublicTotemToken();
  const isPublicTotem = Boolean(totemPublicToken) && !isPublicQuestionario && !isPublicCanalDenuncias;
  const passwordResetParams = getPasswordResetParams();
  const isPasswordReset = Boolean(passwordResetParams.uid && passwordResetParams.token);

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
  const [forgotOpen, setForgotOpen] = useState(false), [forgotEmail, setForgotEmail] = useState(""), [forgotLoading, setForgotLoading] = useState(false), [forgotErr, setForgotErr] = useState(""), [forgotOk, setForgotOk] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState(""), [resetConfirmPassword, setResetConfirmPassword] = useState(""), [resetLoading, setResetLoading] = useState(false), [resetErr, setResetErr] = useState(""), [resetOk, setResetOk] = useState("");
  function getCachedSection() {
    return localStorage.getItem(SECTION_CACHE_KEY) || "dashboard";
  }

  const [sideOpen, setSideOpen] = useState(false), [sideExpand, setSideExpand] = useState(true), [section, setSection] = useState(getCachedSection());
  const [sideUserMenuOpen, setSideUserMenuOpen] = useState(false);
  const [cadOpen, setCadOpen] = useState(() => ["setor", "ghe", "cargos"].includes(getCachedSection()));
  const [dashData, setDashData] = useState(null), [dashLoad, setDashLoad] = useState(false), [dashErr, setDashErr] = useState(""), [dashEmpresa, setDashEmpresa] = useState(""), [dashDateFrom, setDashDateFrom] = useState(""), [dashDateTo, setDashDateTo] = useState("");
  const [dashEmpresaBusca, setDashEmpresaBusca] = useState(""), [dashEmpresaMenuOpen, setDashEmpresaMenuOpen] = useState(false);
  const [cfgData, setCfgData] = useState(null), [cfgLoad, setCfgLoad] = useState(false), [cfgErr, setCfgErr] = useState(""), [cfgSaving, setCfgSaving] = useState(false);
  const [cfgForm, setCfgForm] = useState({ cnpj: "", nome_consultoria: "", responsavel_legal: "", representante_legal_relatorio: "", cidade: "", uf: "" });
  const [cfgLogoFile, setCfgLogoFile] = useState(null);
  const [cfgTecs, setCfgTecs] = useState([]), [cfgTecErr, setCfgTecErr] = useState(""), [cfgTecSaving, setCfgTecSaving] = useState(false);
  const [cfgTecForm, setCfgTecForm] = useState({ id: null, nome: "", formacao: "", registro: "" });
  const [cfgTecModalOpen, setCfgTecModalOpen] = useState(false);
  const [cfgTecDeleteModal, setCfgTecDeleteModal] = useState({ item: null, saving: false, err: "" });
  const [sysAccounts, setSysAccounts] = useState([]), [sysAccLoad, setSysAccLoad] = useState(false), [sysAccErr, setSysAccErr] = useState("");
  const [sysModal, setSysModal] = useState({ type: "", item: null }), [sysName, setSysName] = useState(""), [sysEmail, setSysEmail] = useState(""), [sysPass, setSysPass] = useState(""), [sysActive, setSysActive] = useState(true), [sysSaving, setSysSaving] = useState(false), [sysModalErr, setSysModalErr] = useState("");

  const [consultores, setConsultores] = useState([]), [consErr, setConsErr] = useState(""), [consLoad, setConsLoad] = useState(false);
  const [cModal, setCModal] = useState({ type: "", item: null }), [cEmail, setCEmail] = useState(""), [cPass, setCPass] = useState(""), [cActive, setCActive] = useState(true), [cErr, setCErr] = useState(""), [cSaving, setCSaving] = useState(false);

  const [empresas, setEmpresas] = useState([]), [empErr, setEmpErr] = useState(""), [empLoad, setEmpLoad] = useState(false);
  const [empBusca, setEmpBusca] = useState(""), [empPageSize, setEmpPageSize] = useState("6"), [empPage, setEmpPage] = useState(1);
  const [eModalOpen, setEModalOpen] = useState(false), [eMode, setEMode] = useState("create"), [eStep, setEStep] = useState(1), [eForm, setEForm] = useState(INIT_EMPRESA), [eEdit, setEEdit] = useState(null), [eErr, setEErr] = useState(""), [eSaving, setESaving] = useState(false), [eInactivate, setEInactivate] = useState(null), [eActing, setEActing] = useState(false);
  const [eCepLoading, setECepLoading] = useState(false), [eCepErr, setECepErr] = useState("");
  const [setores, setSetores] = useState([]), [setorErr, setSetorErr] = useState(""), [setorLoad, setSetorLoad] = useState(false);
  const [sModal, setSModal] = useState({ type: "", item: null }), [sEmpresa, setSEmpresa] = useState(""), [sNome, setSNome] = useState(""), [sDesc, setSDesc] = useState(""), [sAtivo, setSAtivo] = useState(true), [sErr, setSErr] = useState(""), [sSaving, setSSaving] = useState(false);
  const [setorInativarModal, setSetorInativarModal] = useState({ item: null, saving: false, err: "" });
  const [setorEmpresaBusca, setSetorEmpresaBusca] = useState(""), [setorEmpresaFiltro, setSetorEmpresaFiltro] = useState(""), [setorPage, setSetorPage] = useState(1), [setorEmpresaMenuOpen, setSetorEmpresaMenuOpen] = useState(false);
  const [ghes, setGhes] = useState([]), [gheErr, setGheErr] = useState(""), [gheLoad, setGheLoad] = useState(false);
  const [gModal, setGModal] = useState({ type: "", item: null }), [gEmpresa, setGEmpresa] = useState(""), [gNome, setGNome] = useState(""), [gDesc, setGDesc] = useState(""), [gAtivo, setGAtivo] = useState(true), [gSetores, setGSetores] = useState([]), [gErr, setGErr] = useState(""), [gSaving, setGSaving] = useState(false);
  const [gheEmpresaBusca, setGheEmpresaBusca] = useState(""), [gheEmpresaFiltro, setGheEmpresaFiltro] = useState(""), [ghePage, setGhePage] = useState(1), [gheEmpresaMenuOpen, setGheEmpresaMenuOpen] = useState(false);
  const [cargos, setCargos] = useState([]), [cargoErr, setCargoErr] = useState(""), [cargoLoad, setCargoLoad] = useState(false);
  const [cgModal, setCgModal] = useState({ type: "", item: null }), [cgEmpresa, setCgEmpresa] = useState(""), [cgNome, setCgNome] = useState(""), [cgDesc, setCgDesc] = useState(""), [cgAtivo, setCgAtivo] = useState(true), [cgSetores, setCgSetores] = useState([]), [cgGhes, setCgGhes] = useState([]), [cgErr, setCgErr] = useState(""), [cgSaving, setCgSaving] = useState(false);
  const [gSetorBusca, setGSetorBusca] = useState("");
  const [cgSetorBusca, setCgSetorBusca] = useState("");
  const [cgGheBusca, setCgGheBusca] = useState("");
  const [cargoEmpresaBusca, setCargoEmpresaBusca] = useState(""), [cargoEmpresaFiltro, setCargoEmpresaFiltro] = useState(""), [cargoPage, setCargoPage] = useState(1), [cargoEmpresaMenuOpen, setCargoEmpresaMenuOpen] = useState(false);
  const [campanhas, setCampanhas] = useState([]), [campErr, setCampErr] = useState(""), [campLoad, setCampLoad] = useState(false), [campStatusLoadingId, setCampStatusLoadingId] = useState(null);
  const [cpModal, setCpModal] = useState({ type: "", item: null }), [cpEmpresa, setCpEmpresa] = useState(""), [cpTitulo, setCpTitulo] = useState(""), [cpInicio, setCpInicio] = useState(""), [cpFim, setCpFim] = useState(""), [cpStatus, setCpStatus] = useState("ATIVO"), [cpErr, setCpErr] = useState(""), [cpSaving, setCpSaving] = useState(false);
  const [campEmpresaBusca, setCampEmpresaBusca] = useState(""), [campEmpresaFiltro, setCampEmpresaFiltro] = useState(""), [campPage, setCampPage] = useState(1), [campStatusFiltro, setCampStatusFiltro] = useState("TODAS"), [campEmpresaMenuOpen, setCampEmpresaMenuOpen] = useState(false);
  const [denEmpresaBusca, setDenEmpresaBusca] = useState(""), [denEmpresaFiltro, setDenEmpresaFiltro] = useState(""), [denLinkData, setDenLinkData] = useState(null), [denLoad, setDenLoad] = useState(false), [denErr, setDenErr] = useState(""), [denEmpresaMenuOpen, setDenEmpresaMenuOpen] = useState(false);
  const [denListEmpresaBusca, setDenListEmpresaBusca] = useState(""), [denListEmpresaFiltro, setDenListEmpresaFiltro] = useState(""), [denListLoad, setDenListLoad] = useState(false), [denListErr, setDenListErr] = useState(""), [denListData, setDenListData] = useState(null), [denListStatusFiltro, setDenListStatusFiltro] = useState("TODAS"), [denListEmpresaMenuOpen, setDenListEmpresaMenuOpen] = useState(false);
  const [ajudaListEmpresaBusca, setAjudaListEmpresaBusca] = useState(""), [ajudaListEmpresaFiltro, setAjudaListEmpresaFiltro] = useState(""), [ajudaListLoad, setAjudaListLoad] = useState(false), [ajudaListErr, setAjudaListErr] = useState(""), [ajudaListData, setAjudaListData] = useState(null), [ajudaListEmpresaMenuOpen, setAjudaListEmpresaMenuOpen] = useState(false);
  const [ajudaListStatusFiltro, setAjudaListStatusFiltro] = useState("TODOS");
  const [ajudaRowMenuOpenId, setAjudaRowMenuOpenId] = useState(null);
  const [ajudaPdfLoadingId, setAjudaPdfLoadingId] = useState(null);
  const [ajudaRowMenuItem, setAjudaRowMenuItem] = useState(null);
  const [ajudaRowMenuPos, setAjudaRowMenuPos] = useState({ top: 0, left: 0, openUp: false });
  const [ajudaHistModal, setAjudaHistModal] = useState(null);
  const [ajudaUpdModal, setAjudaUpdModal] = useState({ item: null, text: "", saving: false, err: "" });
  const [ajudaAtendModal, setAjudaAtendModal] = useState({ item: null, saving: false, err: "" });
  const [ajudaResolveModal, setAjudaResolveModal] = useState({ item: null, saving: false, err: "" });
  const [ajudaViewModal, setAjudaViewModal] = useState(null);
  const [denRowMenuOpenId, setDenRowMenuOpenId] = useState(null);
  const [denPdfLoadingId, setDenPdfLoadingId] = useState(null);
  const [denRowMenuItem, setDenRowMenuItem] = useState(null);
  const [denRowMenuPos, setDenRowMenuPos] = useState({ top: 0, left: 0, openUp: false });
  const [denHistModal, setDenHistModal] = useState(null);
  const [denUpdModal, setDenUpdModal] = useState({ item: null, text: "", saving: false, err: "" });
  const [denResolveModal, setDenResolveModal] = useState({ item: null, saving: false, err: "" });
  const [denAnalyzeModal, setDenAnalyzeModal] = useState({ item: null, saving: false, err: "" });
  const [denViewModal, setDenViewModal] = useState(null);
  const [cmpEmpresaBusca, setCmpEmpresaBusca] = useState(""), [cmpEmpresaFiltro, setCmpEmpresaFiltro] = useState(""), [cmpCamp1, setCmpCamp1] = useState(""), [cmpCamp2, setCmpCamp2] = useState(""), [cmpErr, setCmpErr] = useState(""), [cmpSubmitted, setCmpSubmitted] = useState(false), [cmpLoading, setCmpLoading] = useState(false), [cmpResult, setCmpResult] = useState(null), [cmpEmpresaMenuOpen, setCmpEmpresaMenuOpen] = useState(false), [cmpPdfLoading, setCmpPdfLoading] = useState(false);
  const [totemEmpresaBusca, setTotemEmpresaBusca] = useState(""), [totemEmpresaFiltro, setTotemEmpresaFiltro] = useState(""), [totemEmpresaMenuOpen, setTotemEmpresaMenuOpen] = useState(false);
  const [totemLinkData, setTotemLinkData] = useState(null), [totemLoad, setTotemLoad] = useState(false), [totemErr, setTotemErr] = useState("");
  const [linkRegenModal, setLinkRegenModal] = useState({ target: "", open: false });
  const [campRelatorio, setCampRelatorio] = useState(null), [campRelErr, setCampRelErr] = useState(""), [campRelLoad, setCampRelLoad] = useState(false);
  const [campRelCampanha, setCampRelCampanha] = useState(null), [campRelRefId, setCampRelRefId] = useState("");
  const [campMeasureDrafts, setCampMeasureDrafts] = useState({}), [campMeasureSavingKey, setCampMeasureSavingKey] = useState(""), [campWhenSavingKey, setCampWhenSavingKey] = useState(""), [campMeasureErr, setCampMeasureErr] = useState("");
  const [campAttachUploading, setCampAttachUploading] = useState(false), [campAttachErr, setCampAttachErr] = useState("");
  const [campPdfLoading, setCampPdfLoading] = useState(false), [campPdfErr, setCampPdfErr] = useState("");
  const [campPdfProgress, setCampPdfProgress] = useState(0), [campPdfProgressEstimated, setCampPdfProgressEstimated] = useState(false);
  const [campReviewMonths, setCampReviewMonths] = useState("3"), [campReviewSaving, setCampReviewSaving] = useState(false);
  const [planosAcaoAtivos, setPlanosAcaoAtivos] = useState({}), [planosAcaoSaving, setPlanosAcaoSaving] = useState(false);
  const planosAcaoPendingRef = useRef(0);
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
  const [totemHumorSelected, setTotemHumorSelected] = useState(""), [totemHumorModal, setTotemHumorModal] = useState(false), [totemHumorGhe, setTotemHumorGhe] = useState(""), [totemHumorSetor, setTotemHumorSetor] = useState(""), [totemHumorSaving, setTotemHumorSaving] = useState(false), [totemHumorOk, setTotemHumorOk] = useState(""), [totemHumorErr, setTotemHumorErr] = useState("");
  const [totemAjudaNome, setTotemAjudaNome] = useState(""), [totemAjudaContato, setTotemAjudaContato] = useState(""), [totemAjudaGhe, setTotemAjudaGhe] = useState(""), [totemAjudaFuncao, setTotemAjudaFuncao] = useState(""), [totemAjudaSaving, setTotemAjudaSaving] = useState(false), [totemAjudaOk, setTotemAjudaOk] = useState(""), [totemAjudaErr, setTotemAjudaErr] = useState("");
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

  function closeDenunciaRowMenu() {
    setDenRowMenuOpenId(null);
    setDenRowMenuItem(null);
  }

  function toggleDenunciaRowMenu(e, item) {
    if (denRowMenuOpenId === item.id) {
      closeDenunciaRowMenu();
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 240;
    const gap = 2;
    const left = Math.max(8, Math.min(window.innerWidth - menuWidth - 8, rect.right - menuWidth));
    const openUp = window.innerHeight - rect.bottom < 260;
    const top = openUp ? rect.top - gap : rect.bottom + gap;
    setDenRowMenuPos({ top: Math.max(8, top), left, openUp });
    setDenRowMenuItem(item);
    setDenRowMenuOpenId(item.id);
  }

  useEffect(() => {
    if (!denRowMenuOpenId) return;
    function onPointerDown(ev) {
      const target = ev.target;
      if (target instanceof Element && (target.closest(".denuncia-row-menu-list") || target.closest(".denuncia-row-menu-trigger"))) return;
      closeDenunciaRowMenu();
    }
    function onKeyDown(ev) {
      if (ev.key === "Escape") closeDenunciaRowMenu();
    }
    function onViewportChange() {
      closeDenunciaRowMenu();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [denRowMenuOpenId]);

  function toastTitleForMethod(method) {
    if (method === "POST") return "Criado com sucesso";
    if (method === "PATCH" || method === "PUT") return "Atualizado com sucesso";
    if (method === "DELETE") return "Excluído com sucesso";
    return "Operação concluída";
  }

  function isPublicQuestionarioStepMutation(url, method) {
    if (!["POST", "PATCH", "PUT"].includes(method)) return false;
    return /\/api\/campanhas\/public\/[^/]+\/step\d+\/?$/i.test(String(url || ""));
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
          if (isPublicQuestionarioStepMutation(url, method)) {
            pushToast("success", "Informação salva!");
          } else {
            pushToast("success", toastTitleForMethod(method));
          }
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
  useEffect(() => { if (user && isAdm(user) && section === "configuracoes") loadSystemAccounts(); }, [user, section]);
  useEffect(() => {
    if (user && canEmp(user) && !cfgData && !cfgLoad) loadConsultoriaConfig();
  }, [user]);
  useEffect(() => { if (user && canEmp(user) && section === "empresas") loadEmpresas(); }, [user, section]);
  useEffect(() => { if (user && canEmp(user) && section === "setor") { loadEmpresas(); loadSetores(); } }, [user, section]);
  useEffect(() => { if (user && canEmp(user) && section === "ghe") { loadEmpresas(); loadSetores(); loadGhes(); } }, [user, section]);
  useEffect(() => { if (user && canEmp(user) && section === "cargos") { loadEmpresas(); loadSetores(); loadGhes(); loadCargos(); } }, [user, section]);
  useEffect(() => { if (user && canEmp(user) && section === "campanhas") { loadEmpresas(); loadCampanhas(); } }, [user, section]);
  useEffect(() => { if (user && canEmp(user) && section === "comparar-campanhas") { loadEmpresas(); loadCampanhas(); } }, [user, section]);
  useEffect(() => { if (user && canEmp(user) && section === "canal-denuncias") loadEmpresas(); }, [user, section]);
  useEffect(() => { if (user && canEmp(user) && section === "denuncias-empresa") loadEmpresas(); }, [user, section]);
  useEffect(() => { if (user && canEmp(user) && section === "pedidos-ajuda") loadEmpresas(); }, [user, section]);
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
    if (!isPublicQuestionario) return;
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isPublicQuestionario]);

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
    // if (user && isAdm(user)) m.push({ key: "consultores", label: "Consultores", icon: I.con });
    if (user && canEmp(user)) m.push({ key: "empresas", label: "Empresas", icon: I.emp });
    if (user && canEmp(user)) m.push({ key: "campanhas", label: "Campanhas", icon: I.camp });
    if (user && canEmp(user)) m.push({ key: "comparar-campanhas", label: "Comparar campanhas", icon: I.cmp });
    if (user && canEmp(user)) m.push({ key: "canal-denuncias", label: "Canal de denúncias", icon: I.link });
    if (user && canEmp(user)) m.push({ key: "denuncias-empresa", label: "Ver denúncias", icon: I.rpt });
    if (user && canEmp(user)) m.push({ key: "pedidos-ajuda", label: "Pedidos de ajuda", icon: I.hand });
    if (user && canEmp(user)) m.push({ key: "totem", label: "Totem", icon: I.tot });
    return m;
  }, [user]);
  const currentPageTitle = useMemo(() => {
    if (section === "campanhas-relatorio") return "Relatório";
    if (section === "comparar-campanhas") return "Comparar campanhas";
    if (section === "canal-denuncias") return "Canal de denúncias";
    if (section === "denuncias-empresa") return "Denúncias por empresa";
    if (section === "pedidos-ajuda") return "Pedidos de ajuda";
    if (section === "totem") return "Totem";
    if (section === "configuracoes") return "Configurações";
    if (section === "setor") return "Setor";
    if (section === "ghe") return "GHE";
    if (section === "cargos") return "Cargos";
    const found = menu.find((m) => m.key === section);
    return found?.label || "Dashboard";
  }, [menu, section]);

  useEffect(() => {
    const baseTitle = "CISS Consultoria";
    if (isPublicQuestionario) {
      document.title = `${baseTitle} | Questionário`;
      return;
    }
    if (isPublicCanalDenuncias) {
      document.title = `${baseTitle} | Canal de denúncias`;
      return;
    }
    if (isPublicTotem) {
      document.title = `${baseTitle} | Totem`;
      return;
    }
    document.title = `${baseTitle} | ${currentPageTitle}`;
  }, [currentPageTitle, isPublicQuestionario, isPublicCanalDenuncias, isPublicTotem]);

  function isAdm(u) { return u?.is_superuser || u?.user_type === "ADM"; }
  function canEmp(u) { return isAdm(u) || u?.user_type === "CONSULTOR"; }
  function goSection(s) { setSection(s); setSideOpen(false); setSideUserMenuOpen(false); }

  useEffect(() => {
    localStorage.setItem(SECTION_CACHE_KEY, section);
  }, [section]);

  useEffect(() => {
    if (section !== "campanhas-relatorio") return;
    if (!token || !canEmp(user)) return;
    if (campRelCampanha?.id) return;
    const cachedIdRaw = localStorage.getItem(REPORT_CAMPANHA_ID_KEY) || "";
    const cachedId = Number(cachedIdRaw);
    if (!Number.isFinite(cachedId) || cachedId <= 0) {
      setSection("campanhas");
      return;
    }
    setCampRelCampanha({ id: cachedId });
    const cachedRef = localStorage.getItem(REPORT_REF_ID_KEY) || "";
    loadCampanhaRelatorio(cachedId, cachedRef);
    loadPlanosAcao(cachedId);
  }, [section, token, user, campRelCampanha]);

  useEffect(() => {
    if (["setor", "ghe", "cargos"].includes(section)) setCadOpen(true);
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
    return "Ação corretiva imediata recomendada.";
  }

  function questionarioBlockName(step) {
    const key = String(step?.key || "").toLowerCase();
    const num = Number(step?.step || String(key).replace(/\D/g, ""));
    const byNum = {
      2: "Demandas",
      3: "Controle",
      4: "Apoio da Gestão",
      5: "Suporte dos Colegas",
      6: "Relacionamentos",
      7: "Clareza de Papel | Função",
      8: "Gerenciamento de Mudanças",
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
    return "Estável";
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      pushToast("success", "Sucesso", "Link copiado com sucesso");
    } catch {
      throw new Error("Não foi possível copiar o link.");
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

  async function loadDashboardOverview(empresaId = dashEmpresa, dateFrom = dashDateFrom, dateTo = dashDateTo) {
    if (!token) return;
    setDashLoad(true); setDashErr("");
    try {
      const params = new URLSearchParams();
      if (empresaId) params.set("empresa_id", empresaId);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      const qs = params.toString() ? `?${params.toString()}` : "";
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

  async function submitTotemHumor() {
    setTotemHumorSaving(true);
    setTotemHumorErr("");
    try {
      const token = totemPubData?.token;
      const body = {
        humor: totemHumorSelected,
        ghe: totemHumorGhe ? Number(totemHumorGhe) : null,
        setor: totemHumorSetor ? Number(totemHumorSetor) : null,
      };
      const r = await fetch(`${API}/totem/public/${token}/humor/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.detail || data?.humor?.[0] || "Erro ao registrar humor.");
      setTotemHumorOk("Humor registrado com sucesso! Obrigado.");
      setTimeout(() => {
        setTotemHumorModal(false);
        setTotemHumorSelected("");
        setTotemHumorGhe("");
        setTotemHumorSetor("");
        setTotemHumorOk("");
        setTotemPubScreen("menu");
        setTotemConsentAccepted(false);
      }, 1600);
    } catch (err) {
      setTotemHumorErr(err.message);
    } finally {
      setTotemHumorSaving(false);
    }
  }

  async function submitTotemAjuda(e) {
    e.preventDefault();
    const totemToken = totemPubData?.token;
    setTotemAjudaSaving(true); setTotemAjudaErr(""); setTotemAjudaOk("");
    try {
      const res = await fetch(`${API}/totem/public/${totemToken}/ajuda/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: totemAjudaNome, contato: totemAjudaContato, ghe: totemAjudaGhe ? Number(totemAjudaGhe) : null, funcao: totemAjudaFuncao ? Number(totemAjudaFuncao) : null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || "Erro ao enviar pedido.");
      setTotemAjudaOk("Pedido enviado! Entraremos em contato em breve.");
      setTotemAjudaNome(""); setTotemAjudaContato(""); setTotemAjudaGhe(""); setTotemAjudaFuncao("");
      setTimeout(() => { setTotemAjudaOk(""); setTotemPubScreen("menu"); setTotemConsentAccepted(false); }, 2000);
    } catch (err) {
      setTotemAjudaErr(err.message);
    } finally {
      setTotemAjudaSaving(false);
    }
  }

  async function loadConsultoriaConfig() {
    if (!token) return;
    setCfgLoad(true); setCfgErr(""); setCfgTecErr("");
    try {
      // Evita concorrencia de dois get_or_create simultaneos na mesma configuracao
      // (pode travar/lockar em bancos locais como SQLite).
      const cfgResp = await fetch(`${API}/consultoria-configuracao/`, { headers: { Authorization: `Token ${token}` } });
      const cfgJson = await cfgResp.json();
      if (!cfgResp.ok) throw new Error(pErr(cfgJson));

      const tecResp = await fetch(`${API}/consultoria-configuracao/responsaveis-tecnicos/`, { headers: { Authorization: `Token ${token}` } });
      const tecJson = await tecResp.json();
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

  function openCfgTecnicoModal(item = null) {
    setCfgTecErr("");
    if (item) {
      setCfgTecForm({ id: item.id, nome: item.nome || "", formacao: item.formacao || "", registro: item.registro || "" });
    } else {
      resetCfgTecForm();
    }
    setCfgTecModalOpen(true);
  }

  function closeCfgTecnicoModal() {
    setCfgTecModalOpen(false);
    setCfgTecErr("");
    setCfgTecSaving(false);
    resetCfgTecForm();
  }

  function editCfgTecnico(item) {
    openCfgTecnicoModal(item);
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
      closeCfgTecnicoModal();
    } catch (err) {
      setCfgTecErr(err.message);
    } finally {
      setCfgTecSaving(false);
    }
  }

  async function toggleCfgTecnicoTotem(item) {
    try {
      const r = await fetch(`${API}/consultoria-configuracao/responsaveis-tecnicos/${item.id}/`, {
        method: "PATCH",
        headers: { Authorization: `Token ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ responsavel_totem: !item.responsavel_totem }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(pErr(d));
      setCfgTecs((prev) => prev.map((x) => (x.id === d.id ? d : x)));
    } catch (err) {
      pushToast("error", "Erro", err.message);
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
      if (cfgTecForm.id === id) closeCfgTecnicoModal();
    } catch (err) {
      setCfgTecErr(err.message);
      throw err;
    }
  }

  function openDeleteCfgTecnicoConfirm(item) {
    setCfgTecDeleteModal({ item, saving: false, err: "" });
  }

  function closeDeleteCfgTecnicoConfirm() {
    setCfgTecDeleteModal({ item: null, saving: false, err: "" });
  }

  async function confirmDeleteCfgTecnico() {
    if (!cfgTecDeleteModal.item) return;
    setCfgTecDeleteModal((prev) => ({ ...prev, saving: true, err: "" }));
    try {
      await deleteCfgTecnico(cfgTecDeleteModal.item.id);
      closeDeleteCfgTecnicoConfirm();
    } catch (err) {
      setCfgTecDeleteModal((prev) => ({ ...prev, saving: false, err: err.message || "Nao foi possivel excluir tecnico." }));
    }
  }

  function onDashboardEmpresaChange(value) {
    setDashEmpresa(value);
    loadDashboardOverview(value, dashDateFrom, dashDateTo);
  }
  function onDashboardEmpresaBuscaChange(value) {
    setDashEmpresaBusca(value);
    if (!value.trim()) {
      onDashboardEmpresaChange("");
    }
  }
  function selectDashEmpresaBuscaOption(emp) {
    setDashEmpresaBusca(String(emp.name || ""));
    setDashEmpresaMenuOpen(false);
    onDashboardEmpresaChange(String(emp.id));
  }

  function onDashboardDateChange(from, to) {
    setDashDateFrom(from);
    setDashDateTo(to);
    loadDashboardOverview(dashEmpresa, from, to);
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
      setPubOk("Questionário enviado com sucesso.");
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
      localStorage.setItem(SECTION_CACHE_KEY, "dashboard"); setSection("dashboard");
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  function openForgotPassword() {
    setForgotOpen(true);
    setForgotEmail(email || "");
    setForgotErr("");
    setForgotOk("");
  }

  function closeForgotPassword() {
    setForgotOpen(false);
    setForgotLoading(false);
    setForgotErr("");
    setForgotOk("");
  }

  async function submitForgotPassword(e) {
    e.preventDefault();
    setForgotLoading(true);
    setForgotErr("");
    setForgotOk("");
    try {
      const r = await fetch(`${API}/auth/password-reset/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(pErr(d));
      setForgotOk(d?.detail || "Se o e-mail estiver cadastrado, enviaremos o link de redefinicao.");
    } catch (err) {
      setForgotErr(err.message);
    } finally {
      setForgotLoading(false);
    }
  }

  async function submitPasswordReset(e) {
    e.preventDefault();
    setResetLoading(true);
    setResetErr("");
    setResetOk("");
    try {
      if (!resetNewPassword || !resetConfirmPassword) throw new Error("Preencha a nova senha e a confirmacao.");
      if (resetNewPassword.length < 8) throw new Error("A nova senha deve ter pelo menos 8 caracteres.");
      if (resetNewPassword !== resetConfirmPassword) throw new Error("As senhas informadas nao coincidem.");
      const r = await fetch(`${API}/auth/password-reset/confirm/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: passwordResetParams.uid,
          token: passwordResetParams.token,
          password: resetNewPassword,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(pErr(d));
      setResetOk(d?.detail || "Senha redefinida com sucesso.");
      setResetNewPassword("");
      setResetConfirmPassword("");
      window.setTimeout(() => {
        window.location.href = "/";
      }, 1200);
    } catch (err) {
      setResetErr(err.message);
    } finally {
      setResetLoading(false);
    }
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

  async function loadSystemAccounts() {
    setSysAccLoad(true); setSysAccErr("");
    try {
      const r = await fetch(`${API}/system-accounts/`, { headers: { Authorization: `Token ${token}` } });
      if (!r.ok) throw new Error("Nao foi possivel carregar contas do sistema.");
      setSysAccounts(await r.json());
    } catch (err) { setSysAccErr(err.message); } finally { setSysAccLoad(false); }
  }

  function openC(type, item = null) {
    setCModal({ type, item }); setCErr("");
    setCEmail(item?.email || ""); setCPass(""); setCActive(item?.is_active ?? true);
  }
  function closeC() { setCModal({ type: "", item: null }); setCErr(""); setCSaving(false); }
  function openSysModal(type, item = null) {
    setSysModal({ type, item }); setSysModalErr("");
    setSysName(item?.full_name || ""); setSysEmail(item?.email || ""); setSysPass(""); setSysActive(item?.is_active ?? true);
  }
  function closeSysModal() { setSysModal({ type: "", item: null }); setSysModalErr(""); setSysSaving(false); }

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

  async function saveSystemAccount(e) {
    e.preventDefault(); setSysSaving(true); setSysModalErr("");
    try {
      const isEdit = sysModal.type === "edit" && sysModal.item;
      const payload = { full_name: sysName, email: sysEmail, is_active: sysActive }; if (sysPass) payload.password = sysPass;
      if (!isEdit && !sysPass) throw new Error("Senha obrigatoria.");
      const r = await fetch(isEdit ? `${API}/system-accounts/${sysModal.item.id}/` : `${API}/system-accounts/`, { method: isEdit ? "PATCH" : "POST", headers: { "Content-Type": "application/json", Authorization: `Token ${token}` }, body: JSON.stringify(payload) });
      const d = await r.json(); if (!r.ok) throw new Error(pErr(d));
      setSysAccounts((prev) => isEdit ? prev.map((x) => x.id === d.id ? d : x) : [...prev, d]);
      closeSysModal();
    } catch (err) { setSysModalErr(err.message); } finally { setSysSaving(false); }
  }

  async function delSystemAccount() {
    if (!sysModal.item) return; setSysSaving(true); setSysModalErr("");
    try {
      const r = await fetch(`${API}/system-accounts/${sysModal.item.id}/`, { method: "DELETE", headers: { Authorization: `Token ${token}` } });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d?.detail || "Nao foi possivel excluir a conta do sistema.");
      }
      setSysAccounts((prev) => prev.filter((x) => x.id !== sysModal.item.id)); closeSysModal();
    } catch (err) { setSysModalErr(err.message); } finally { setSysSaving(false); }
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
    setGSetorBusca("");
    setGEmpresa(type === "create" ? String(gheEmpresaFiltro || "") : (item?.empresa ? String(item.empresa) : ""));
    setGNome(item?.name || "");
    setGDesc(item?.description || "");
    setGAtivo(item?.is_active ?? true);
    setGSetores((item?.setores_data || []).map((s) => s.id));
  }
  function closeGhe() { setGModal({ type: "", item: null }); setGErr(""); setGSaving(false); setGSetores([]); setGSetorBusca(""); }

  async function saveGhe(e) {
    e.preventDefault(); setGSaving(true); setGErr("");
    try {
      if (!gEmpresa) throw new Error("Selecione a empresa.");
      if (!gNome.trim()) throw new Error("Informe o nome do GHE.");
      const isEdit = gModal.type === "edit" && gModal.item;
      const payload = { empresa_id: Number(gEmpresa), name: gNome.trim(), description: gDesc, is_active: gAtivo, setor_ids: gSetores };
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

  function toggleGheSetor(id) {
    setGSetores((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
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
    setCgSetorBusca(""); setCgGheBusca("");
    setCgEmpresa(type === "create" ? String(cargoEmpresaFiltro || "") : (item?.empresa ? String(item.empresa) : ""));
    setCgNome(item?.name || "");
    setCgDesc(item?.description || "");
    setCgAtivo(item?.is_active ?? true);
    setCgSetores((item?.setores_data || []).map((s) => s.id));
    setCgGhes((item?.ghes_data || []).map((g) => g.id));
  }
  function closeCargo() { setCgModal({ type: "", item: null }); setCgErr(""); setCgSaving(false); setCgSetores([]); setCgGhes([]); setCgSetorBusca(""); setCgGheBusca(""); }

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
      localStorage.setItem(REPORT_CAMPANHA_ID_KEY, String(campanhaId));
      localStorage.setItem(REPORT_REF_ID_KEY, d?.filters?.selected_ref_id ? String(d.filters.selected_ref_id) : "");
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
    setPlanosAcaoAtivos({});
    localStorage.setItem(REPORT_CAMPANHA_ID_KEY, String(item.id || ""));
    localStorage.setItem(REPORT_REF_ID_KEY, "");
    setSection("campanhas-relatorio");
    await loadCampanhaRelatorio(item.id, "");
    loadPlanosAcao(item.id);
  }

  async function onCampRelatorioRefChange(value) {
    setCampRelRefId(value);
    localStorage.setItem(REPORT_REF_ID_KEY, String(value || ""));
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
    setCampPdfLoading(true); setCampPdfErr(""); setCampPdfProgress(0); setCampPdfProgressEstimated(false);
    let progressTimer = null;
    let usingRealDownloadProgress = false;
    const startProgress = () => {
      setCampPdfProgressEstimated(true);
      setCampPdfProgress(2);
      progressTimer = window.setInterval(() => {
        setCampPdfProgress((prev) => {
          // Durante processamento/geracao no servidor, avanca gradualmente sem chegar em 100%.
          if (usingRealDownloadProgress) return prev;
          if (prev >= 90) return prev;
          if (prev < 20) return prev + 4;
          if (prev < 55) return prev + 2;
          return prev + 1;
        });
      }, 280);
    };
    startProgress();
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
      const totalBytes = Number(r.headers.get("content-length") || 0);
      let blob;
      if (r.body && Number.isFinite(totalBytes) && totalBytes > 0) {
        usingRealDownloadProgress = true;
        setCampPdfProgressEstimated(false);
        const reader = r.body.getReader();
        const chunks = [];
        let loaded = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!value) continue;
          chunks.push(value);
          loaded += value.length;
          const pct = Math.max(5, Math.min(99, Math.round((loaded / totalBytes) * 100)));
          setCampPdfProgress((prev) => Math.max(prev, pct));
        }
        blob = new Blob(chunks, { type: r.headers.get("content-type") || "application/pdf" });
      } else {
        blob = await r.blob();
      }
      setCampPdfProgress(100);
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
      if (progressTimer) window.clearInterval(progressTimer);
      setCampPdfLoading(false);
      window.setTimeout(() => {
        setCampPdfProgress(0);
        setCampPdfProgressEstimated(false);
      }, 700);
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

  async function loadPlanosAcao(campanhaId) {
    if (!campanhaId) return;
    try {
      const r = await fetch(`${API}/campanhas/${campanhaId}/planos-acao/`, {
        headers: { Authorization: `Token ${token}` },
      });
      if (!r.ok) return;
      const data = await r.json();
      const map = {};
      (data || []).forEach((p) => {
        if (p.ativo) map[`${p.step_key}_${p.question_field}_${p.plano_index}`] = true;
      });
      setPlanosAcaoAtivos(map);
    } catch (_) {
      // silently ignore
    }
  }

  async function togglePlanoAcao(stepKey, questionField, planoIndex) {
    const key = `${stepKey}_${questionField}_${planoIndex}`;
    const newAtivo = !planosAcaoAtivos[key];
    const newAtivos = { ...planosAcaoAtivos, [key]: newAtivo };
    setPlanosAcaoAtivos(newAtivos);
    if (!campRelCampanha?.id) return;
    planosAcaoPendingRef.current += 1;
    setPlanosAcaoSaving(true);
    let timeoutId = null;
    try {
      const controller = new AbortController();
      timeoutId = window.setTimeout(() => controller.abort(), 12000);
      const payload = [{
        step_key: stepKey,
        question_field: questionField,
        plano_index: planoIndex,
        ativo: newAtivo,
      }];
      const r = await fetch(`${API}/campanhas/${campRelCampanha.id}/planos-acao/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Token ${token}` },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!r.ok) throw new Error("Nao foi possivel salvar o plano de acao.");
    } catch (_) {
      // Rollback otimista se persistencia falhar.
      setPlanosAcaoAtivos((prev) => ({ ...prev, [key]: !newAtivo }));
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
      planosAcaoPendingRef.current = Math.max(0, planosAcaoPendingRef.current - 1);
      setPlanosAcaoSaving(planosAcaoPendingRef.current > 0);
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

  function onAjudaListEmpresaBuscaChange(value) {
    setAjudaListEmpresaBusca(value);
    const found = empresas.find((emp) => `${emp.id} - ${emp.company_name}` === value);
    setAjudaListEmpresaFiltro(found ? String(found.id) : "");
    setAjudaListData(null);
    setAjudaListErr("");
  }
  function selectAjudaListEmpresaBuscaOption(emp) {
    setAjudaListEmpresaBusca(String(emp.company_name || ""));
    setAjudaListEmpresaFiltro(String(emp.id));
    setAjudaListData(null);
    setAjudaListErr("");
    setAjudaListEmpresaMenuOpen(false);
  }
  async function loadAjudaEmpresa() {
    if (!ajudaListEmpresaFiltro) return setAjudaListErr("Selecione uma empresa.");
    setAjudaListLoad(true); setAjudaListErr("");
    try {
      const r = await fetch(`${API}/empresas/${ajudaListEmpresaFiltro}/pedidos-ajuda/`, { headers: { Authorization: `Token ${token}` } });
      const d = await r.json();
      if (!r.ok) throw new Error(pErr(d));
      setAjudaListData(d);
    } catch (err) {
      setAjudaListErr(err.message);
    } finally {
      setAjudaListLoad(false);
    }
  }

  function closeAjudaRowMenu() {
    setAjudaRowMenuOpenId(null);
    setAjudaRowMenuItem(null);
  }

  function toggleAjudaRowMenu(e, item) {
    if (ajudaRowMenuOpenId === item.id) { closeAjudaRowMenu(); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 240;
    const gap = 2;
    const left = Math.max(8, Math.min(window.innerWidth - menuWidth - 8, rect.right - menuWidth));
    const openUp = window.innerHeight - rect.bottom < 240;
    const top = openUp ? rect.top - gap : rect.bottom + gap;
    setAjudaRowMenuPos({ top: Math.max(8, top), left, openUp });
    setAjudaRowMenuItem(item);
    setAjudaRowMenuOpenId(item.id);
  }

  useEffect(() => {
    if (!ajudaRowMenuOpenId) return;
    function onPointerDown(ev) {
      const target = ev.target;
      if (target instanceof Element && (target.closest(".ajuda-row-menu-list") || target.closest(".ajuda-row-menu-trigger"))) return;
      closeAjudaRowMenu();
    }
    function onKeyDown(ev) { if (ev.key === "Escape") closeAjudaRowMenu(); }
    function onViewportChange() { closeAjudaRowMenu(); }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [ajudaRowMenuOpenId]);

  async function updateAjudaStatus(pedidoId, statusValue) {
    if (!ajudaListEmpresaFiltro) return;
    setAjudaListErr("");
    try {
      const r = await fetch(`${API}/empresas/${ajudaListEmpresaFiltro}/pedidos-ajuda/${pedidoId}/`, {
        method: "PATCH",
        headers: { Authorization: `Token ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusValue }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(pErr(d));
      setAjudaListData((prev) => prev ? ({ ...prev, results: (prev.results || []).map((x) => x.id === d.id ? d : x) }) : prev);
    } catch (err) {
      setAjudaListErr(err.message);
      throw err;
    }
  }

  function openAjudaAtendModal(item) { setAjudaAtendModal({ item, saving: false, err: "" }); }
  function closeAjudaAtendModal() { setAjudaAtendModal({ item: null, saving: false, err: "" }); }
  async function confirmAjudaAtend() {
    if (!ajudaAtendModal.item?.id) return;
    setAjudaAtendModal((p) => ({ ...p, saving: true, err: "" }));
    try {
      await updateAjudaStatus(ajudaAtendModal.item.id, "EM_ATENDIMENTO");
      closeAjudaAtendModal();
    } catch (err) {
      setAjudaAtendModal((p) => ({ ...p, saving: false, err: err.message || "Erro ao atualizar status." }));
    }
  }

  function openAjudaResolveModal(item) { setAjudaResolveModal({ item, saving: false, err: "" }); }
  function closeAjudaResolveModal() { setAjudaResolveModal({ item: null, saving: false, err: "" }); }
  async function confirmAjudaResolve() {
    if (!ajudaResolveModal.item?.id) return;
    setAjudaResolveModal((p) => ({ ...p, saving: true, err: "" }));
    try {
      await updateAjudaStatus(ajudaResolveModal.item.id, "ATENDIDO");
      closeAjudaResolveModal();
    } catch (err) {
      setAjudaResolveModal((p) => ({ ...p, saving: false, err: err.message || "Erro ao atualizar status." }));
    }
  }

  function openAjudaAtualizacaoModal(item) { setAjudaUpdModal({ item, text: "", saving: false, err: "" }); }
  function closeAjudaAtualizacaoModal() { setAjudaUpdModal({ item: null, text: "", saving: false, err: "" }); }

  async function addAjudaAtualizacao(pedidoId, texto) {
    if (!ajudaListEmpresaFiltro || !String(texto || "").trim()) return;
    setAjudaListErr("");
    try {
      const r = await fetch(`${API}/empresas/${ajudaListEmpresaFiltro}/pedidos-ajuda/${pedidoId}/atualizacoes/`, {
        method: "POST",
        headers: { Authorization: `Token ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(pErr(d));
      setAjudaListData((prev) => prev ? ({ ...prev, results: (prev.results || []).map((x) => x.id === d.id ? d : x) }) : prev);
    } catch (err) {
      setAjudaListErr(err.message);
      throw err;
    }
  }

  async function submitAjudaAtualizacaoModal(e) {
    e.preventDefault();
    if (!ajudaUpdModal.item?.id) return;
    const text = String(ajudaUpdModal.text || "").trim();
    if (!text) return setAjudaUpdModal((p) => ({ ...p, err: "Digite a atualizacao." }));
    setAjudaUpdModal((p) => ({ ...p, saving: true, err: "" }));
    try {
      await addAjudaAtualizacao(ajudaUpdModal.item.id, text);
      closeAjudaAtualizacaoModal();
    } catch (err) {
      setAjudaUpdModal((p) => ({ ...p, saving: false, err: err.message || "Erro ao salvar atualizacao." }));
    }
  }

  async function exportAjudaPdf(p) {
    if (!ajudaListEmpresaFiltro || !p?.id) return;
    setAjudaPdfLoadingId(p.id);
    try {
      const r = await fetch(`${API}/empresas/${ajudaListEmpresaFiltro}/pedidos-ajuda/${p.id}/pdf/`, {
        headers: { Authorization: `Token ${token}` },
      });
      if (!r.ok) throw new Error("Não foi possível gerar o PDF.");
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pedido-ajuda-${p.id}-auditoria.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message);
    } finally {
      setAjudaPdfLoadingId(null);
    }
  }

  function onTotemEmpresaBuscaChange(value) {
    setTotemEmpresaBusca(value);
    const found = empresas.find((emp) => `${emp.id} - ${emp.company_name}` === value);
    setTotemEmpresaFiltro(found ? String(found.id) : "");
    setTotemLinkData(null);
    setTotemErr("");
  }
  function selectTotemEmpresaBuscaOption(emp) {
    setTotemEmpresaBusca(String(emp.company_name || ""));
    setTotemEmpresaFiltro(String(emp.id));
    setTotemLinkData(null);
    setTotemErr("");
    setTotemEmpresaMenuOpen(false);
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

  async function exportDenunciaPdf(d) {
    if (!denListEmpresaFiltro || !d?.id) return;
    setDenPdfLoadingId(d.id);
    try {
      const r = await fetch(`${API}/empresas/${denListEmpresaFiltro}/canal-denuncias/${d.id}/pdf/`, {
        headers: { Authorization: `Token ${token}` },
      });
      if (!r.ok) throw new Error("Não foi possível gerar o PDF.");
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `denuncia-${d.id}-auditoria.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message);
    } finally {
      setDenPdfLoadingId(null);
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

  async function exportComparativoPdf() {
    if (!cmpCamp1 || !cmpCamp2) return;
    setCmpPdfLoading(true);
    try {
      const r = await fetch(`${API}/campanhas/comparativo/pdf/?camp1_id=${cmpCamp1}&camp2_id=${cmpCamp2}`, {
        headers: { Authorization: `Token ${token}` },
      });
      if (!r.ok) throw new Error("Não foi possível gerar o PDF comparativo.");
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `comparativo-campanhas.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message);
    } finally {
      setCmpPdfLoading(false);
    }
  }

  function openEmpresaCreate() { setEMode("create"); setEEdit(null); setEForm(INIT_EMPRESA); setEStep(1); setEErr(""); setEModalOpen(true); }
  function openEmpresaEdit(x) {
    setEMode("edit"); setEEdit(x); setEStep(1); setEErr(""); setEModalOpen(true);
    setEForm({ ...INIT_EMPRESA, document_type: x.document_type, establishment_type: x.establishment_type, establishment_custom_name: x.establishment_custom_name || "", company_name: x.company_name || "", cnae: x.cnae || "", document_number: x.document_number || "", responsible_name: x.responsible_name || "", responsible_email: x.responsible_user_email || "", responsible_password: "", establishment_name: x.establishment_name || "", evaluation_type: x.evaluation_type || "SETOR", risk_level: x.risk_level || "", employee_count: String(x.employee_count ?? ""), postal_code: x.postal_code || "", state: x.state || "", city: x.city || "", neighborhood: x.neighborhood || "", street: x.street || "", number: x.number || "", complement: x.complement || "", is_active: Boolean(x.is_active) });
  }
  function closeEmpresa() { setEModalOpen(false); setEEdit(null); setEErr(""); setECepErr(""); setECepLoading(false); setESaving(false); setEInactivate(null); setEActing(false); setEForm(INIT_EMPRESA); }
  function eChange(k, v) {
    if (k === "postal_code") {
      const cep = String(v || "").replace(/\D/g, "").slice(0, 8);
      setECepErr("");
      setEForm((p) => ({ ...p, postal_code: cep }));
      return;
    }
    setEForm((p) => ({ ...p, [k]: v }));
  }

  useEffect(() => {
    const cep = String(eForm.postal_code || "").replace(/\D/g, "");
    if (eStep !== 3 || cep.length !== 8) {
      setECepLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setECepLoading(true);
      setECepErr("");
      try {
        const normalizedQuery = `${cep}, Brazil`;
        const url = new URL("https://nominatim.openstreetmap.org/search");
        url.searchParams.set("format", "json");
        url.searchParams.set("q", normalizedQuery);
        url.searchParams.set("countrycodes", "br");
        url.searchParams.set("addressdetails", "1");
        url.searchParams.set("limit", "15");

        const r = await fetch(url.toString(), {
          headers: {
            "Accept": "application/json",
          },
        });
        if (!r.ok) throw new Error("Nao foi possivel consultar o CEP.");
        const data = await r.json();
        const item = Array.isArray(data) ? data[0] : null;
        const address = item?.address || {};
        if (!item) throw new Error("CEP nao encontrado.");

        setEForm((prev) => ({
          ...prev,
          state: resolveBrazilStateCode(address) || prev.state || "",
          city: address.city || address.town || address.village || address.municipality || prev.city || "",
          neighborhood: address.suburb || address.neighbourhood || address.quarter || address.city_district || prev.neighborhood || "",
          street: address.road || address.pedestrian || address.footway || address.residential || prev.street || "",
        }));
      } catch (err) {
        setECepErr(err.message || "Nao foi possivel preencher o endereco automaticamente.");
      } finally {
        setECepLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [eForm.postal_code, eStep]);

  function checkStep(s) {
    if (s === 1 && !eForm.document_type) return "Selecione CPF ou CNPJ.";
    if (s === 2 && !eForm.establishment_type) return "Selecione o tipo do estabelecimento.";
    if (s === 3) {
      const req = [["company_name", "Nome da empresa"], ["document_number", eForm.document_type], ["responsible_name", "Nome do responsável"], ["responsible_email", "E-mail do responsavel"], ["establishment_name", "Nome do estabelecimento"], ["evaluation_type", "Tipo de avaliacao"], ["risk_level", "Grau de risco"], ["employee_count", "Numero de funcionarios"], ["postal_code", "CEP"], ["state", "UF"], ["city", "Cidade"], ["neighborhood", "Bairro"]];
      for (const [k, l] of req) if (!String(eForm[k] || "").trim()) return `Preencha: ${l}.`;
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
      const termoDash = dashEmpresaBusca.trim().toLowerCase();
      const dashEmpresaSugestoes = (termoDash
        ? (dashData?.empresas || []).filter((emp) => String(emp.name || "").toLowerCase().includes(termoDash))
        : (dashData?.empresas || [])
      ).slice(0, 8);
      return <DashboardOverviewModern
        cards={cards}
        domains={domains}
        histLabels={histLabels}
        histValues={histValues}
        maxHist={maxHist}
        dashEmpresaBusca={dashEmpresaBusca}
        dashEmpresaSugestoes={dashEmpresaSugestoes}
        dashEmpresa={dashEmpresa}
        dashData={dashData}
        dashEmpresaMenuOpen={dashEmpresaMenuOpen}
        setDashEmpresaMenuOpen={setDashEmpresaMenuOpen}
        onDashboardEmpresaBuscaChange={onDashboardEmpresaBuscaChange}
        onDashboardEmpresaChange={onDashboardEmpresaChange}
        selectDashEmpresaBuscaOption={selectDashEmpresaBuscaOption}
        dashDateFrom={dashDateFrom}
        dashDateTo={dashDateTo}
        onDashboardDateChange={onDashboardDateChange}
        canFilter={canEmp(user)}
        dashLoad={dashLoad}
        dashErr={dashErr}
        loadDashboardOverview={loadDashboardOverview}
        userName={(user.full_name || user.email || "Usuario").slice(0, 22)}
        userRoleLabel={isAdm(user) ? "Administrador" : user?.user_type === "CONSULTOR" ? "Consultor" : "Empresa"}
        goSection={goSection}
        fmtPct={fmtPct}
        reportZoneClass={reportZoneClass}
      />;
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
              <p>Informações da consultoria para uso interno e no relatório.</p>
            </div>
            {cfgLoad && <LoadingSpinner label="Carregando configurações..." />}
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
                  <label>Representante legal (relatório/PDF)</label>
                  <input value={cfgForm.responsavel_legal} onChange={(e) => setCfgForm((p) => ({ ...p, responsavel_legal: e.target.value }))} />
                </div>
                {/* <div>
                  <label>Representante legal (relatório/PDF)</label>
                  <input value={cfgForm.representante_legal_relatorio} onChange={(e) => setCfgForm((p) => ({ ...p, representante_legal_relatorio: e.target.value }))} />
                </div> */}
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
            <div className="config-card-header config-card-header-split">
              <div>
                <h2>Responsáveis técnicos</h2>
                <p>Configure nome, formação, registro e assinatura do representante legal.</p>
              </div>
              <button type="button" className="config-card-header-action-btn" onClick={() => openCfgTecnicoModal()}>Adicionar responsável</button>
            </div>

            <div className="table-wrap config-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Formação</th>
                    <th>Registro</th>
                    <th>Totem</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {cfgTecs.length === 0 ? (
                    <tr><td colSpan={5}>Nenhum responsavel tecnico cadastrado.</td></tr>
                  ) : (
                    cfgTecs.map((t) => (
                      <tr key={`cfg-tec-${t.id}`}>
                        <td>{t.nome}</td>
                        <td>{t.formacao}</td>
                        <td>{t.registro}</td>
                        <td>
                          <button
                            type="button"
                            className={`toggle-btn${t.responsavel_totem ? " toggle-btn-on" : ""}`}
                            onClick={() => toggleCfgTecnicoTotem(t)}
                            title={t.responsavel_totem ? "Visível no totem" : "Oculto no totem"}
                          >
                            {t.responsavel_totem ? "Ativo" : "Inativo"}
                          </button>
                        </td>
                        <td className="actions">
                          <button type="button" className="campanha-icon-btn" title="Editar" onClick={() => editCfgTecnico(t)}>{I.edit}</button>
                          <button type="button" className="campanha-icon-btn danger" title="Excluir" onClick={() => openDeleteCfgTecnicoConfirm(t)}>{I.del}</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {isAdm(user) && (
            <section className="config-card">
              <div className="config-card-header config-card-header-split">
                <div>
                  <h2>Contas do sistema</h2>
                  <p>Gerencie acessos administrativos. Todas as contas criadas aqui são super usuários.</p>
                </div>
                <button type="button" className="config-card-header-action-btn" onClick={() => openSysModal("create")}>Adicionar conta</button>
              </div>

              {sysAccLoad && <LoadingSpinner label="Carregando contas do sistema..." />}
              {sysAccErr && <p className="error">{sysAccErr}</p>}

              {!sysAccLoad && (
                <div className="table-wrap config-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Nome</th>
                        <th>E-mail</th>
                        <th>Status</th>
                        <th>Perfil</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sysAccounts.length === 0 ? (
                        <tr><td colSpan={6}>Nenhuma conta do sistema cadastrada.</td></tr>
                      ) : (
                        sysAccounts.map((acc) => (
                          <tr key={`sys-acc-${acc.id}`}>
                            <td>{acc.id}</td>
                            <td>{acc.full_name || "-"}</td>
                            <td>{acc.email}</td>
                            <td>{acc.is_active ? "Ativo" : "Inativo"}</td>
                            <td>{acc.is_superuser ? "Super usuário" : "Administrador"}</td>
                            <td className="actions">
                              <button type="button" onClick={() => openSysModal("edit", acc)}>Editar</button>
                              <button type="button" className="danger" onClick={() => openSysModal("delete", acc)}>Excluir</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {cfgTecDeleteModal.item && (
            <div className="modal-backdrop">
              <div className="modal-card">
                <h3>Excluir responsável técnico</h3>
                <p>Deseja realmente excluir {cfgTecDeleteModal.item.nome}?</p>
                {cfgTecDeleteModal.err && <p className="error">{cfgTecDeleteModal.err}</p>}
                <div className="modal-actions">
                  <button type="button" className="secondary" onClick={closeDeleteCfgTecnicoConfirm} disabled={cfgTecDeleteModal.saving}>Cancelar</button>
                  <button type="button" className="danger" onClick={confirmDeleteCfgTecnico} disabled={cfgTecDeleteModal.saving}>
                    {cfgTecDeleteModal.saving ? "Excluindo..." : "Confirmar"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {cfgTecModalOpen && (
            <div className="modal-backdrop">
              <div className="modal-card">
                <h3>{cfgTecForm.id ? "Editar representante técnico" : "Novo representante técnico"}</h3>
                <form onSubmit={saveCfgTecnico} className="login-form">
                  <label>Nome</label>
                  <input value={cfgTecForm.nome} onChange={(e) => setCfgTecForm((p) => ({ ...p, nome: e.target.value }))} required />
                  <label>Formação</label>
                  <input value={cfgTecForm.formacao} onChange={(e) => setCfgTecForm((p) => ({ ...p, formacao: e.target.value }))} required />
                  <label>Registro</label>
                  <input value={cfgTecForm.registro} onChange={(e) => setCfgTecForm((p) => ({ ...p, registro: e.target.value }))} required />
                  {cfgTecErr && <p className="error">{cfgTecErr}</p>}
                  <div className="modal-actions">
                    <button type="button" className="secondary" onClick={closeCfgTecnicoModal} disabled={cfgTecSaving}>Cancelar</button>
                    <button type="submit" disabled={cfgTecSaving}>{cfgTecSaving ? "Salvando..." : "Salvar"}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </section>
    );
    if (section === "empresas" && canEmp(user)) return (
      <section className="admin-panel empresas-panel">
        <div className="empresas-hero">
          <div>
            {/* <h2>Empresas Cadastradas</h2>
            <p>Gerencie todas as empresas do sistema</p> */}
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
                  <p className="empresa-doc-row"><strong>Criada em:</strong> {e.created_at ? fDate(e.created_at) : "-"}</p>

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
                {/* <h2 className="mb-1 text-2xl font-semibold tracking-tight text-slate-900">Cadastro de Setor</h2> */}
                <p className="text-sm font-medium text-slate-500">Gerencie os setores por empresa.</p>
              </div>
              <div className="w-full md:max-w-sm">
                {/* <label htmlFor="empresa-search" className="mb-1.5 block text-sm font-semibold text-slate-600">Empresa</label> */}
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
            <h2 className="m-0 text-lg font-semibold text-slate-900"></h2>
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
              {setoresFiltrados.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-slate-500">Nenhum setor encontrado.</p>
              ) : (
                <>
                  <div className="space-y-3 sm:hidden">
                    {setoresVisiveis.map((s) => (
                      <article key={`setor-card-${s.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Setor #{s.id}</p>
                            <h3 className="text-base font-semibold text-slate-900">{s.name}</h3>
                            <p className="text-sm text-slate-500">{s.empresa_name}</p>
                          </div>
                          <span className={`inline-flex min-h-6 items-center justify-center rounded-full border px-2 py-0.5 text-xs font-semibold ${s.is_active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}>
                            {s.is_active ? "Ativo" : "Inativo"}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <button className="campanha-icon-btn" title="Editar setor" aria-label="Editar setor" onClick={() => openSetor("edit", s)}>{I.edit}</button>
                          {s.is_active ? (
                            <button className="campanha-icon-btn" title="Inativar setor" aria-label="Inativar setor" onClick={() => openSetorInativarConfirm(s)}>{I.power}</button>
                          ) : (
                            <button className="campanha-icon-btn" title="Reativar setor" aria-label="Reativar setor" onClick={() => { toggleSetorAtivo(s, true).catch(() => {}); }}>{I.power}</button>
                          )}
                          <button className="campanha-icon-btn danger" title="Excluir setor" aria-label="Excluir setor" onClick={() => openSetor("delete", s)}>{I.del}</button>
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm sm:block">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead className="bg-slate-50">
                        <tr className="text-left">
                          <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">ID</th>
                          <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Setor</th>
                          <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Empresa</th>
                          <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                          <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {setoresVisiveis.map((s) => (
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
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
                {/* <h2 className="mb-1 text-2xl font-semibold tracking-tight text-slate-900">Cadastro de GHE</h2> */}
                <p className="text-sm font-medium text-slate-500">Gerencie os GHEs por empresa.</p>
              </div>
              <div className="w-full md:max-w-sm">
                {/* <label htmlFor="ghe-empresa-search" className="mb-1.5 block text-sm font-semibold text-slate-600">Empresa</label> */}
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
            <h2 className="m-0 text-lg font-semibold text-slate-900"></h2>
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
              {ghesFiltrados.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-slate-500">Nenhum GHE encontrado.</p>
              ) : (
                <>
                  <div className="space-y-3 sm:hidden">
                    {ghesVisiveis.map((g) => (
                      <article key={`ghe-card-${g.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">GHE #{g.id}</p>
                            <h3 className="text-base font-semibold text-slate-900">{g.name}</h3>
                            <p className="text-sm text-slate-500">{g.empresa_name}</p>
                          </div>
                          <span className={`inline-flex min-h-6 items-center justify-center rounded-full border px-2 py-0.5 text-xs font-semibold ${g.is_active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}>
                            {g.is_active ? "Ativo" : "Inativo"}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <button className="campanha-icon-btn" title="Editar GHE" aria-label="Editar GHE" onClick={() => openGhe("edit", g)}>{I.edit}</button>
                          {g.is_active ? (
                            <button className="campanha-icon-btn" title="Inativar GHE" aria-label="Inativar GHE" onClick={() => toggleGheAtivo(g, false)}>{I.power}</button>
                          ) : (
                            <button className="campanha-icon-btn" title="Reativar GHE" aria-label="Reativar GHE" onClick={() => toggleGheAtivo(g, true)}>{I.power}</button>
                          )}
                          <button className="campanha-icon-btn danger" title="Excluir GHE" aria-label="Excluir GHE" onClick={() => openGhe("delete", g)}>{I.del}</button>
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm sm:block">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead className="bg-slate-50">
                        <tr className="text-left">
                          <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">ID</th>
                          <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">GHE</th>
                          <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Empresa</th>
                          <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                          <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Acões</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {ghesVisiveis.map((g) => (
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
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
                {/* <h2 className="mb-1 text-2xl font-semibold tracking-tight text-slate-900">Cadastro de Cargos</h2> */}
                <p className="text-sm font-medium text-slate-500">Gerencie os cargos por empresa.</p>
              </div>
              <div className="w-full md:max-w-sm">
                {/* <label htmlFor="cargo-empresa-search" className="mb-1.5 block text-sm font-semibold text-slate-600">Empresa</label> */}
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
            <h2 className="m-0 text-lg font-semibold text-slate-900"></h2>
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
              {cargosFiltrados.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-slate-500">Nenhum cargo encontrado.</p>
              ) : (
                <>
                  <div className="space-y-3 sm:hidden">
                    {cargosVisiveis.map((cg) => (
                      <article key={`cargo-card-${cg.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Cargo #{cg.id}</p>
                            <h3 className="text-base font-semibold text-slate-900">{cg.name}</h3>
                            <p className="text-sm text-slate-500">{cg.empresa_name}</p>
                          </div>
                          <span className={`inline-flex min-h-6 items-center justify-center rounded-full border px-2 py-0.5 text-xs font-semibold ${cg.is_active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}>
                            {cg.is_active ? "Ativo" : "Inativo"}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <button className="campanha-icon-btn" title="Editar cargo" aria-label="Editar cargo" onClick={() => openCargo("edit", cg)}>{I.edit}</button>
                          {cg.is_active ? (
                            <button className="campanha-icon-btn" title="Inativar cargo" aria-label="Inativar cargo" onClick={() => toggleCargoAtivo(cg, false)}>{I.power}</button>
                          ) : (
                            <button className="campanha-icon-btn" title="Reativar cargo" aria-label="Reativar cargo" onClick={() => toggleCargoAtivo(cg, true)}>{I.power}</button>
                          )}
                          <button className="campanha-icon-btn danger" title="Excluir cargo" aria-label="Excluir cargo" onClick={() => openCargo("delete", cg)}>{I.del}</button>
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm sm:block">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead className="bg-slate-50">
                        <tr className="text-left">
                          <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">ID</th>
                          <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Cargo</th>
                          <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Empresa</th>
                          <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                          <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Acões</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {cargosVisiveis.map((cg) => (
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
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
          </div>
          <div className="report-subcard-summary">
            <span className="report-subcard-summary-label">Media geral</span>
            <div className="report-step-summary">
              <div className="report-progress compact">
                <span className={`report-progress-fill ${reportZoneClass(step.zone)}`} style={{ width: `${Math.max(0, Math.min(100, Number(step.percent || 0)))}%` }} />
              </div>
              <span>{fmtPct(step.percent)} | {fmtScore(step.avg_score)} / 5 | {reportZoneLabel(step.zone)}</span>
            </div>
          </div>
          <p className="report-step-legend">
            {step.response_count || 0} respostas | {step.orientation === "negative" ? "domínio com perguntas negativas" : "domínio com perguntas positivas"}
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
          <div className="report-floating-actions">
            <button type="button" className="floating-back-button" onClick={() => goSection("campanhas")}>
              Voltar para campanhas
            </button>
            <div className="floating-pdf-wrap">
              <button type="button" className="floating-pdf-button" onClick={exportCampanhaRelatorioPdf} disabled={campPdfLoading || planosAcaoSaving}>
                {planosAcaoSaving ? "Salvando ações..." : campPdfLoading ? "Gerando PDF..." : "Exportar PDF"}
              </button>
              {campPdfLoading && (
                <div className="pdf-progress-card" aria-live="polite">
                  <div className="pdf-progress-top">
                    <span>{campPdfProgressEstimated ? "Progresso" : "Progresso do download"}</span>
                    <strong>{Math.max(0, Math.min(100, campPdfProgress))}%</strong>
                  </div>
                  <div className="pdf-progress-track">
                    <span className="pdf-progress-fill" style={{ width: `${Math.max(0, Math.min(100, campPdfProgress))}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* <div className="report-header">
            <div>
              <h2>Relatorio da campanha</h2>
              <p>{rel?.campaign?.title || campRelCampanha?.title || "-"} | {rel?.empresa?.name || campRelCampanha?.empresa_name || "-"}</p>
            </div>
            <div className="report-header-meta">
              <span className="subtitle">Visao geral e por {String(filtros.ref_label || "Setor/GHE").toLowerCase()}</span>
            </div>
          </div> */}

          {campRelLoad && <LoadingSpinner label="Montando relatório..." />}
          {campRelErr && <p className="error">{campRelErr}</p>}
          {campPdfErr && <p className="error">{campPdfErr}</p>}

          {!campRelLoad && rel && (
            <>
              {/* <div className="report-card report-section-title">
                <div>
                  <h2>Resultados Gerais</h2>
                  <p className="subtitle">Total de respostas concluidas na campanha: {rel?.summary?.total_completed_all_filters || 0}</p>
                </div>
              </div> */}

              <div className="report-summary-grid">
                <article className="report-summary-card">
                  <p className="report-summary-label">Média geral</p>
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
                  <h2>Média por domínio (percentual | score 1-5)</h2>
                </div>
                <ReportDomainsRadar domains={overallDomains} fmtPct={fmtPct} fmtScore={fmtScore} />
                <div className="report-zones">
                  <div className="report-zone-box red"><strong>Zona Vermelha (0% a 39,9%)</strong><span>Risco elevado: ação corretiva imediata</span></div>
                  <div className="report-zone-box yellow"><strong>Zona Amarela (40% a 74,9%)</strong><span>Atenção: possível risco psicossocial</span></div>
                  <div className="report-zone-box green"><strong>Zona Verde (75% a 100%)</strong><span>Boa percepção e manutenção recomendada</span></div>
                </div>
              </div>

              {overallSteps.map((step) => {
                const refsForStep = porRef
                  .map((item) => ({ item, step: (item.steps || []).find((s) => s.key === step.key) }))
                  .filter((x) => x.step);
                return (
                  <div key={`step-group-${step.key}`} className="report-step-group">
                    {renderStepAnalysis(step, "overall", "Analise Geral")}
                    {refsForStep.length > 0 && (
                      <div className="report-step-subresults">
                        <h4>Resultado por {filtros.ref_label || "Setor/GHE"}</h4>
                        {refsForStep.map(({ item, step: refStep }) => (
                          <div key={`ref-step-${item.ref?.id}-${step.key}`} className="report-subcard">
                            <div className="report-subcard-header">
                              <strong>{item.ref?.name || "-"}</strong>
                            </div>
                            <div className="report-subcard-summary">
                              <span className="report-subcard-summary-label">
                                Média por {String(filtros.ref_label || "Setor/GHE").toLowerCase()}
                              </span>
                              <div className="report-step-summary">
                                <div className="report-progress compact">
                                  <span
                                    className={`report-progress-fill ${reportZoneClass(refStep.zone)}`}
                                    style={{ width: `${Math.max(0, Math.min(100, Number(refStep.percent || 0)))}%` }}
                                  />
                                </div>
                                <span>{fmtPct(refStep.percent)} | {fmtScore(refStep.avg_score)} / 5 | {reportZoneLabel(refStep.zone)}</span>
                              </div>
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
                  <h2>Comentários (Geral)</h2>
                  <span className="subtitle">{overallComments.length} comentários exibidos</span>
                </div>
                {overallComments.length === 0 ? (
                  <p className="empty-state">Nenhum comentário informado.</p>
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
                  <h2>CONCLUSÕES E RECOMENDAÇÕES PRELIMINARES</h2>
                  <span className="subtitle">Perguntas com score abaixo de 4.0</span>
                </div>
                <div className="conclusion-intro">
                  <ul>
                    <li>Priorizar os domínios que apresentem maior nível de risco.</li>
                    <li className="conclusion-review-line">
                      <span>Realizar nova avaliação em até</span>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={campReviewMonths}
                        onChange={(e) => setCampReviewMonths(e.target.value)}
                      />
                      <span>meses.</span>
                      <button
                        type="button"
                        className="secondary"
                        disabled={campReviewSaving}
                        onClick={saveCampanhaReviewMonths}
                      >
                        {campReviewSaving ? "Salvando..." : "Salvar"}
                      </button>
                    </li>
                    <li>Implementar ações de capacitação sobre saúde mental e fatores psicossociais.</li>
                    <li>Quando aplicável, conduzir Análise Ergonômica do Trabalho (AET) detalhada, conforme a NR-17.</li>                  </ul>
                  <p>Plano de Ação Recomendado</p>
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
                                      <strong>Ação Recomendada:</strong> {reportRecommendedAction(item.zone)}
                                    </p>
                                    <p className="conclusion-section-label">Medidas de Prevenção/Controle:</p>
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

                                {PLANOS_ACAO[step.key]?.[item.question_field] && (
                                  <div className="action-plans-block">
                                    <p className="action-plans-title">Planos de ação sugeridos</p>
                                    <p className="action-plans-subtitle">Selecione um ou mais planos relevantes para esta questão.</p>
                                    {PLANOS_ACAO[step.key][item.question_field].map((plano, pi) => {
                                      const pKey = `${step.key}_${item.question_field}_${pi}`;
                                      const isAtivo = !!planosAcaoAtivos[pKey];
                                      return (
                                        <div key={pi} className="action-plan-item">
                                          <button
                                            type="button"
                                            className={`action-plan-toggle${isAtivo ? " active" : ""}`}
                                            onClick={() => togglePlanoAcao(step.key, item.question_field, pi)}
                                            title={isAtivo ? "Desativar plano" : "Ativar plano"}
                                          >
                                            <span className="action-plan-toggle-thumb" />
                                          </button>
                                          <span className="action-plan-text">{plano}</span>
                                        </div>
                                      );
                                    })}
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
                                        {campWhenSavingKey === key ? "Salvando..." : "Salvar"}
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
                                        <button
                                          type="button"
                                          className="campanha-icon-btn"
                                          title="Cancelar"
                                          aria-label="Cancelar"
                                          onClick={() => closeMeasureDraft(item)}
                                        >
                                          {I.x}
                                        </button>
                                        <button
                                          type="button"
                                          className="campanha-icon-btn danger"
                                          title={campMeasureSavingKey === key ? "Salvando..." : "Salvar medida"}
                                          aria-label={campMeasureSavingKey === key ? "Salvando medida" : "Salvar medida"}
                                          disabled={campMeasureSavingKey === key}
                                          onClick={() => addPreliminaryMeasure(item)}
                                        >
                                          {I.del}
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
                {/* <h2 className="mb-1 text-2xl font-semibold tracking-tight text-slate-900">Campanhas</h2> */}
                <p className="text-sm font-medium text-slate-500">Crie e gerencie campanhas por empresa.</p>
              </div>
              <div className="w-full md:max-w-sm">
                {/* <label htmlFor="camp-empresa-search" className="mb-1.5 block text-sm font-semibold text-slate-600">Empresa</label> */}
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
              {/* <h2 className="m-0 text-lg font-semibold text-slate-900">Lista de campanhas</h2> */}
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
                      {(() => {
                        const empresaCampanha = empresas.find((emp) => String(emp.id) === String(cp.empresa));
                        const campanhaEvaluationType = String(empresaCampanha?.evaluation_type || "").toUpperCase() === "SETOR" ? "SETOR" : "GHE";
                        const totalRespostasEsperadas = Number(empresaCampanha?.employee_count || 0);
                        const totalRespostasRecebidas = Number(cp.completed_count || 0);
                        return (
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="mb-2">
                            {empresaCampanha && (
                              <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-slate-400">{empresaCampanha.company_name}</p>
                            )}
                            <h3 className="truncate pr-2 text-base font-semibold text-slate-900">{cp.title}</h3>
                          </div>
                          <div className="flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
                            <span>{fDate(cp.start_date)} - {fDate(cp.end_date)}</span>
                            <span>{totalRespostasRecebidas}/{totalRespostasEsperadas || 0} respostas</span>
                            <span className={`empresa-type-pill ${campanhaEvaluationType === "SETOR" ? "setor" : "ghe"}`}>
                              {campanhaEvaluationType === "SETOR" ? "Por Setor" : "Por GHE"}
                            </span>
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
                            style={{ minHeight: 0, marginTop: 0 }}
                            className={`relative inline-flex h-5 w-12 shrink-0 self-center items-center rounded-full p-0 align-middle transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              cp.status === "ATIVO"
                                ? "bg-emerald-700"
                                : "bg-slate-300"
                            }`}
                          >
                            <span
                              aria-hidden="true"
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition ${
                                cp.status === "ATIVO" ? "translate-x-7" : "translate-x-0.5"
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
                        );
                      })()}
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
      );
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
          <div className="mb-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                {/* <h2 className="mb-1 text-2xl font-semibold tracking-tight text-slate-900">Comparar Campanhas</h2> */}
                <p className="text-sm font-medium text-slate-500">Selecione campanhas para comparar resultados e indicadores.</p>
              </div>
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
              <div className="config-card-header config-card-header-split">
                <div>
                  <h2>Comparação selecionada</h2>
                  <p>Setas mostram o que melhorou (↑) ou piorou (↓) da Campanha 1 para a Campanha 2.</p>
                </div>
                <button
                  type="button"
                  className="config-card-header-action-btn"
                  onClick={exportComparativoPdf}
                  disabled={cmpPdfLoading}
                  title="Exportar relatório comparativo em PDF"
                >
                  {cmpPdfLoading ? "Gerando PDF…" : "Exportar PDF"}
                </button>
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
                      <th>Variação</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Média geral (0-5)</td>
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
                      <td>Avaliações concluidas</td>
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
                            {cmpStatusText(otherStep.avg_score, step.avg_score)} no resultado
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
                          <summary>Estáveis ({stable.length})</summary>
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
          <div className="mb-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                {/* <h2 className="mb-1 text-2xl font-semibold tracking-tight text-slate-900">Canal de Denuncias</h2> */}
                <p className="text-sm font-medium text-slate-500">Gere um link único para a empresa compartilhar com os colaboradores.</p>
              </div>
            </div>
          </div>

          <section className="config-card">
            <div className="config-card-header">
              <h2>Gerar Link</h2>
              <p>Selecione a empresa e gere/copiei o link do canal de denúncias.</p>
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
          <div className="mb-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              {/* <h2 className="mb-1 text-2xl font-semibold tracking-tight text-slate-900">Denuncias por Empresa</h2> */}
              <p className="text-sm font-medium text-slate-500">Visualize as denúncias recebidas no canal por empresa.</p>
            </div>
            <div className="w-full md:max-w-sm">
              {/* <label htmlFor="den-list-empresa-search" className="mb-1.5 block text-sm font-semibold text-slate-600">Empresa</label> */}
              <div className="relative w-full">
                <input
                  id="den-list-empresa-search"
                  placeholder="Buscar empresa..."
                  autoComplete="off"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
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
          </div>

          <div className="admin-header">
            <h2>Lista de denúncias</h2>
            <button type="button" className="denuncias-load-btn" onClick={loadDenunciasEmpresa} disabled={!denListEmpresaFiltro || denListLoad}>
              {denListLoad ? "Carregando..." : "Carregar denuncias"}
            </button>
          </div>
          {denListErr && <p className="error">{denListErr}</p>}

          {denListData && (
            <section className="config-card denuncias-list-card">
              <div className="config-card-header">
                {/* <h2>Denúncias recebidas</h2> */}
                {/* <p>{denListData.empresa_name} • {Number(denListData.count || 0)} registro(s)</p> */}
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
                <p className="empty-state">Nenhuma denúncia registrada para esta empresa.</p>
              ) : (
                <>
                  <div className="denuncias-mobile-list">
                    {denunciasFiltradas.map((d) => (
                      <article key={`den-admin-mobile-${d.id}`} className="denuncia-mobile-card">
                        <div className="denuncia-mobile-card-top">
                          <strong>Denúncia #{d.id}</strong>
                          <div className="denuncia-row-menu">
                            <button
                              type="button"
                              className="campanha-icon-btn denuncia-row-menu-trigger"
                              title="Opções"
                              aria-label={`Opções da denúncia ${d.id}`}
                              aria-haspopup="menu"
                              aria-expanded={denRowMenuOpenId === d.id}
                              onClick={(e) => toggleDenunciaRowMenu(e, d)}
                            >
                              {I.moreV}
                            </button>
                          </div>
                        </div>
                        <div className="denuncia-mobile-card-grid">
                          <p><span>Data:</span> {fDate(d.created_at)}</p>
                          <p><span>Origem:</span> {d.origem_label || (d.origem === "TOTEM" ? "Totem" : "Link de denúncia")}</p>
                          <p><span>Status:</span> <span className={`denuncia-status-pill ${String(d.status || "").toLowerCase()}`}>{d.status === "EM_ANALISE" ? "Em analise" : d.status === "RESOLVIDA" ? "Resolvida" : "Aberta"}</span></p>
                          <p><span>Vínculo:</span> {d.possui_vinculo ? "Sim" : "Nao"}</p>
                          <p title={d.contato_identificacao || ""}><span>Identificação:</span> {d.deseja_identificar ? (d.contato_identificacao || "Sim") : "Não"}</p>
                          <p><span>Tipo:</span> {d.tipo_label || "-"}</p>
                          <p><span>GHE:</span> {d.ghe_name || "-"}</p>
                          <p><span>Função:</span> {d.cargo_name || "-"}</p>
                          <p title={d.email_devolutiva || ""}><span>Devolutiva:</span> {d.aceita_devolutiva ? (d.email_devolutiva || "Sim") : "Não"}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className="table-wrap denuncias-desktop-table">
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Data</th>
                          <th>Origem</th>
                          <th>Status</th>
                          <th>Vínculo</th>
                          <th>Identificação</th>
                          <th>Tipo</th>
                          <th>GHE</th>
                          <th>Função</th>
                          <th>Devolutiva</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {denunciasFiltradas.map((d) => (
                          <tr key={`den-admin-${d.id}`}>
                            <td>{d.id}</td>
                            <td>{fDate(d.created_at)}</td>
                            <td>{d.origem_label || (d.origem === "TOTEM" ? "Totem" : "Link de denúncia")}</td>
                            <td>
                              <span className={`denuncia-status-pill ${String(d.status || "").toLowerCase()}`}>
                                {d.status === "EM_ANALISE" ? "Em analise" : d.status === "RESOLVIDA" ? "Resolvida" : "Aberta"}
                              </span>
                            </td>
                            <td>{d.possui_vinculo ? "Sim" : "Nao"}</td>
                            <td title={d.contato_identificacao || ""}>
                              {d.deseja_identificar ? (d.contato_identificacao || "Sim") : "Não"}
                            </td>
                            <td>{d.tipo_label || "-"}</td>
                            <td>{d.ghe_name || "-"}</td>
                            <td>{d.cargo_name || "-"}</td>
                            <td title={d.email_devolutiva || ""}>
                              {d.aceita_devolutiva ? (d.email_devolutiva || "Sim") : "Não"}
                            </td>
                            <td className="actions denuncia-row-actions-cell">
                              <div className="denuncia-row-menu">
                                <button
                                  type="button"
                                  className="campanha-icon-btn denuncia-row-menu-trigger"
                                  title="Opções"
                                  aria-label={`Opções da denúncia ${d.id}`}
                                  aria-haspopup="menu"
                                  aria-expanded={denRowMenuOpenId === d.id}
                                  onClick={(e) => toggleDenunciaRowMenu(e, d)}
                                >
                                  {I.moreV}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              {denRowMenuOpenId && denRowMenuItem && typeof document !== "undefined" && createPortal(
                <div
                  className="denuncia-row-menu-list"
                  role="menu"
                  aria-label={`Ações da denúncia ${denRowMenuItem.id}`}
                  style={{
                    position: "fixed",
                    top: denRowMenuPos.top,
                    left: denRowMenuPos.left,
                    transform: denRowMenuPos.openUp ? "translateY(-100%)" : "none",
                  }}
                >
                  <button
                    type="button"
                    className="denuncia-row-menu-item"
                    role="menuitem"
                    onClick={() => { setDenViewModal(denRowMenuItem); closeDenunciaRowMenu(); }}
                  >
                    {I.rpt}<span>Ver relato</span>
                  </button>
                  <button
                    type="button"
                    className="denuncia-row-menu-item"
                    role="menuitem"
                    onClick={() => { openDenunciaAtualizacaoModal(denRowMenuItem); closeDenunciaRowMenu(); }}
                  >
                    {I.edit}<span>Adicionar atualização</span>
                  </button>
                  <button
                    type="button"
                    className="denuncia-row-menu-item"
                    role="menuitem"
                    onClick={() => { setDenHistModal(denRowMenuItem); closeDenunciaRowMenu(); }}
                  >
                    {I.cad}<span>Histórico de atualizações</span>
                  </button>
                  {denRowMenuItem.status !== "RESOLVIDA" && (
                    <button
                      type="button"
                      className="denuncia-row-menu-item"
                      role="menuitem"
                      onClick={() => { openResolveDenunciaModal(denRowMenuItem); closeDenunciaRowMenu(); }}
                    >
                      {I.power}<span>Marcar como resolvida</span>
                    </button>
                  )}
                  {denRowMenuItem.status === "ABERTA" && (
                    <button
                      type="button"
                      className="denuncia-row-menu-item"
                      role="menuitem"
                      onClick={() => { openAnalyzeDenunciaModal(denRowMenuItem); closeDenunciaRowMenu(); }}
                    >
                      {I.cmp}<span>Marcar em análise</span>
                    </button>
                  )}
                  {denRowMenuItem.evidencia_url ? (
                    <a
                      href={denRowMenuItem.evidencia_url}
                      target="_blank"
                      rel="noreferrer"
                      className="denuncia-row-menu-item"
                      role="menuitem"
                      onClick={() => closeDenunciaRowMenu()}
                    >
                      {I.img}<span>Abrir evidência</span>
                    </a>
                  ) : (
                    <span className="denuncia-row-menu-item is-disabled" role="note">
                      {I.img}<span>Sem evidência</span>
                    </span>
                  )}
                  <button
                    type="button"
                    className="denuncia-row-menu-item"
                    role="menuitem"
                    disabled={denPdfLoadingId === denRowMenuItem.id}
                    onClick={() => { exportDenunciaPdf(denRowMenuItem); closeDenunciaRowMenu(); }}
                  >
                    {I.pdf}<span>{denPdfLoadingId === denRowMenuItem.id ? "Gerando PDF..." : "Exportar PDF"}</span>
                  </button>
                </div>,
                document.body
              )}
            </section>
          )}
        </section>
      );
    }
    if (section === "pedidos-ajuda" && canEmp(user)) {
      const termoAjudaEmpresa = ajudaListEmpresaBusca.trim().toLowerCase();
      const ajudaEmpresaSugestoes = (ajudaListEmpresaBusca.trim()
        ? empresas.filter((emp) => (
          String(emp.company_name || "").toLowerCase().includes(termoAjudaEmpresa)
          || String(emp.document_number || "").toLowerCase().includes(termoAjudaEmpresa)
        ))
        : empresas
      ).slice(0, 8);
      const pedidos = ajudaListData?.results || [];
      const pedidosFiltrados = ajudaListStatusFiltro === "TODOS"
        ? pedidos
        : pedidos.filter((p) => String(p.status || "") === ajudaListStatusFiltro);
      return (
        <section className="admin-panel">
          <div className="mb-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Visualize os pedidos de ajuda recebidos pelo totem por empresa.</p>
              </div>
              <div className="w-full md:max-w-sm">
                <div className="relative w-full">
                  <input
                    id="ajuda-list-empresa-search"
                    placeholder="Buscar empresa..."
                    autoComplete="off"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                    value={ajudaListEmpresaBusca}
                    onFocus={() => setAjudaListEmpresaMenuOpen(true)}
                    onBlur={() => setTimeout(() => setAjudaListEmpresaMenuOpen(false), 120)}
                    onChange={(e) => { onAjudaListEmpresaBuscaChange(e.target.value); setAjudaListEmpresaMenuOpen(true); }}
                  />
                  {ajudaListEmpresaMenuOpen && (
                    <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                      {ajudaEmpresaSugestoes.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-500">Nenhuma empresa encontrada.</div>
                      ) : (
                        ajudaEmpresaSugestoes.map((emp) => (
                          <button
                            key={`ajuda-list-empresa-opt-${emp.id}`}
                            type="button"
                            className="flex w-full flex-col items-start rounded-lg bg-transparent px-3 py-2 text-left transition hover:bg-slate-50"
                            onMouseDown={(ev) => ev.preventDefault()}
                            onClick={() => selectAjudaListEmpresaBuscaOption(emp)}
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

          <div className="admin-header">
            <h2>Lista de pedidos de ajuda</h2>
            <button type="button" className="denuncias-load-btn" onClick={loadAjudaEmpresa} disabled={!ajudaListEmpresaFiltro || ajudaListLoad}>
              {ajudaListLoad ? "Carregando..." : "Carregar pedidos"}
            </button>
          </div>
          {ajudaListErr && <p className="error">{ajudaListErr}</p>}

          {ajudaListData && (
            <section className="config-card denuncias-list-card">
              <div className="empresas-toolbar">
                <div className="empresas-page-size">
                  <label>Status:</label>
                  <select value={ajudaListStatusFiltro} onChange={(e) => setAjudaListStatusFiltro(e.target.value)}>
                    <option value="TODOS">Todos</option>
                    <option value="ABERTO">Abertos</option>
                    <option value="EM_ATENDIMENTO">Em atendimento</option>
                    <option value="ATENDIDO">Atendidos</option>
                  </select>
                </div>
              </div>
              {pedidosFiltrados.length === 0 ? (
                <p className="empty-state">Nenhum pedido de ajuda para este filtro.</p>
              ) : (
                <>
                  <div className="space-y-3 sm:hidden">
                    {pedidosFiltrados.map((p) => (
                      <article key={`ajuda-admin-card-${p.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Pedido #{p.id}</p>
                            <h3 className="truncate text-base font-semibold text-slate-900">{p.nome}</h3>
                            <p className="text-xs text-slate-500">{fDate(p.created_at)}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className={`denuncia-status-pill ${p.status === "ATENDIDO" ? "resolvida" : p.status === "EM_ATENDIMENTO" ? "em_analise" : "aberta"}`}>
                              {p.status === "ATENDIDO" ? "Atendido" : p.status === "EM_ATENDIMENTO" ? "Em atendimento" : "Aberto"}
                            </span>
                            <div className="denuncia-row-menu">
                              <button
                                type="button"
                                className="campanha-icon-btn denuncia-row-menu-trigger ajuda-row-menu-trigger"
                                title="Opções"
                                aria-label={`Opções do pedido ${p.id}`}
                                aria-haspopup="menu"
                                aria-expanded={ajudaRowMenuOpenId === p.id}
                                onClick={(e) => toggleAjudaRowMenu(e, p)}
                              >
                                {I.moreV}
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                          <p><strong>Contato:</strong> {p.contato || "—"}</p>
                          <p><strong>GHE:</strong> {p.ghe_name || "—"}</p>
                          <p className="col-span-2"><strong>Função:</strong> {p.funcao_name || "—"}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className="table-wrap hidden sm:block">
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Data</th>
                          <th>Nome</th>
                          <th>Contato</th>
                          <th>GHE</th>
                          <th>Função</th>
                          <th>Status</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pedidosFiltrados.map((p) => (
                          <tr key={`ajuda-admin-${p.id}`}>
                            <td>{p.id}</td>
                            <td>{fDate(p.created_at)}</td>
                            <td>{p.nome}</td>
                            <td>{p.contato || <span className="muted">—</span>}</td>
                            <td>{p.ghe_name || <span className="muted">—</span>}</td>
                            <td>{p.funcao_name || <span className="muted">—</span>}</td>
                            <td>
                              <span className={`denuncia-status-pill ${p.status === "ATENDIDO" ? "resolvida" : p.status === "EM_ATENDIMENTO" ? "em_analise" : "aberta"}`}>
                                {p.status === "ATENDIDO" ? "Atendido" : p.status === "EM_ATENDIMENTO" ? "Em atendimento" : "Aberto"}
                              </span>
                            </td>
                            <td className="actions denuncia-row-actions-cell">
                              <div className="denuncia-row-menu">
                                <button
                                  type="button"
                                  className="campanha-icon-btn denuncia-row-menu-trigger ajuda-row-menu-trigger"
                                  title="Opções"
                                  aria-label={`Opções do pedido ${p.id}`}
                                  aria-haspopup="menu"
                                  aria-expanded={ajudaRowMenuOpenId === p.id}
                                  onClick={(e) => toggleAjudaRowMenu(e, p)}
                                >
                                  {I.moreV}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              {ajudaRowMenuOpenId && ajudaRowMenuItem && typeof document !== "undefined" && createPortal(
                <div
                  className="denuncia-row-menu-list ajuda-row-menu-list"
                  role="menu"
                  aria-label={`Ações do pedido ${ajudaRowMenuItem.id}`}
                  style={{
                    position: "fixed",
                    top: ajudaRowMenuPos.top,
                    left: ajudaRowMenuPos.left,
                    transform: ajudaRowMenuPos.openUp ? "translateY(-100%)" : "none",
                  }}
                >
                  <button
                    type="button"
                    className="denuncia-row-menu-item"
                    role="menuitem"
                    onClick={() => { setAjudaViewModal(ajudaRowMenuItem); closeAjudaRowMenu(); }}
                  >
                    {I.rpt}<span>Ver detalhes</span>
                  </button>
                  <button
                    type="button"
                    className="denuncia-row-menu-item"
                    role="menuitem"
                    onClick={() => { openAjudaAtualizacaoModal(ajudaRowMenuItem); closeAjudaRowMenu(); }}
                  >
                    {I.edit}<span>Adicionar atualização</span>
                  </button>
                  <button
                    type="button"
                    className="denuncia-row-menu-item"
                    role="menuitem"
                    onClick={() => { setAjudaHistModal(ajudaRowMenuItem); closeAjudaRowMenu(); }}
                  >
                    {I.cad}<span>Histórico de atualizações</span>
                  </button>
                  {ajudaRowMenuItem.status !== "ATENDIDO" && (
                    <button
                      type="button"
                      className="denuncia-row-menu-item"
                      role="menuitem"
                      onClick={() => { openAjudaResolveModal(ajudaRowMenuItem); closeAjudaRowMenu(); }}
                    >
                      {I.power}<span>Marcar como atendido</span>
                    </button>
                  )}
                  {ajudaRowMenuItem.status === "ABERTO" && (
                    <button
                      type="button"
                      className="denuncia-row-menu-item"
                      role="menuitem"
                      onClick={() => { openAjudaAtendModal(ajudaRowMenuItem); closeAjudaRowMenu(); }}
                    >
                      {I.cmp}<span>Marcar em atendimento</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="denuncia-row-menu-item"
                    role="menuitem"
                    disabled={ajudaPdfLoadingId === ajudaRowMenuItem.id}
                    onClick={() => { exportAjudaPdf(ajudaRowMenuItem); closeAjudaRowMenu(); }}
                  >
                    {I.pdf}<span>{ajudaPdfLoadingId === ajudaRowMenuItem.id ? "Gerando PDF..." : "Exportar PDF"}</span>
                  </button>
                </div>,
                document.body
              )}
            </section>
          )}
        </section>
      );
    }
    if (section === "totem" && canEmp(user)) {
      const termoTotemEmpresa = totemEmpresaBusca.trim().toLowerCase();
      const totemEmpresaSugestoes = (totemEmpresaBusca.trim()
        ? empresas.filter((emp) => (
          String(emp.company_name || "").toLowerCase().includes(termoTotemEmpresa)
          || String(emp.document_number || "").toLowerCase().includes(termoTotemEmpresa)
        ))
        : empresas
      ).slice(0, 8);
      return (
        <section className="admin-panel">
          <div className="mb-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="mb-1 text-2xl font-semibold tracking-tight text-slate-900">Totem</h2>
                <p className="text-sm font-medium text-slate-500">Configure e gerencie o modo totem.</p>
              </div>
              <div className="w-full md:max-w-sm">
                <div className="relative w-full">
                  <input
                    id="totem-empresa-search"
                    placeholder="Buscar empresa..."
                    autoComplete="off"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                    value={totemEmpresaBusca}
                    onFocus={() => setTotemEmpresaMenuOpen(true)}
                    onBlur={() => setTimeout(() => setTotemEmpresaMenuOpen(false), 120)}
                    onChange={(e) => { onTotemEmpresaBuscaChange(e.target.value); setTotemEmpresaMenuOpen(true); }}
                  />
                  {totemEmpresaMenuOpen && (
                    <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                      {totemEmpresaSugestoes.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-500">Nenhuma empresa encontrada.</div>
                      ) : (
                        totemEmpresaSugestoes.map((emp) => (
                          <button
                            key={`totem-empresa-opt-${emp.id}`}
                            type="button"
                            className="flex w-full flex-col items-start rounded-lg bg-transparent px-3 py-2 text-left transition hover:bg-slate-50"
                            onMouseDown={(ev) => ev.preventDefault()}
                            onClick={() => selectTotemEmpresaBuscaOption(emp)}
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
    const totemSetores = totemPubData?.setores || [];
    const totemCargos = totemPubData?.cargos || [];
    const totemCargosFiltrados = denGhe ? totemCargos.filter((c) => (c.ghe_ids || []).includes(Number(denGhe))) : [];
    const selectedHumorGheData = totemGhes.find((g) => String(g.id) === String(totemHumorGhe));
    const totemSetoresFiltrados = selectedHumorGheData
      ? totemSetores.filter((s) => (selectedHumorGheData.setor_ids || []).includes(s.id))
      : [];
    const totemAjudaCargosFiltrados = totemAjudaGhe
      ? totemCargos.filter((c) => (c.ghe_ids || []).includes(Number(totemAjudaGhe)))
      : [];
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
                Ao prosseguir, você concorda em utilizar este totem para registrar informações de forma responsável. Seus dados
                serão tratados com confidencialidade, conforme a finalidade do atendimento.
              </p>
              <p>
                Caso escolha seguir com uma denúncia ou pedido de ajuda, as informações enviadas poderão ser analisadas pela equipe
                responsavel da empresa.
              </p>
              {totemPubData.responsaveis_tecnicos?.length > 0 && (
                <div className="totem-resp-tecnico-block">
                  {totemPubData.responsaveis_tecnicos.map((rt, i) => (
                    <div key={i} className="totem-resp-tecnico-item">
                      <span className="totem-resp-tecnico-label">Responsável técnico</span>
                      <span className="totem-resp-tecnico-nome">{rt.nome}</span>
                      <span className="totem-resp-tecnico-formacao">{rt.formacao}</span>
                      <span className="totem-resp-tecnico-registro">{rt.registro}</span>
                    </div>
                  ))}
                </div>
              )}
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
                <span className="totem-menu-title">Fazer denúncia</span>
                <span className="totem-menu-desc">Registrar uma denúncia com sigilo.</span>
              </button>
              <button type="button" className="totem-menu-btn" onClick={() => { setTotemPubScreen("humor"); setTotemHumorSelected(""); setTotemHumorGhe(""); setTotemHumorSetor(""); setTotemHumorOk(""); setTotemHumorErr(""); }}>
                <span className="totem-menu-title">Registrar humor</span>
                <span className="totem-menu-desc">Informar como você está se sentindo hoje.</span>
              </button>
              <button type="button" className="totem-menu-btn" onClick={() => { setTotemPubScreen("ajuda"); setTotemAjudaNome(""); setTotemAjudaContato(""); setTotemAjudaGhe(""); setTotemAjudaFuncao(""); setTotemAjudaOk(""); setTotemAjudaErr(""); }}>
                <span className="totem-menu-title">Pedido de ajuda</span>
                <span className="totem-menu-desc">Solicitar apoio ou acolhimento.</span>
              </button>
            </div>
          )}

          {!totemPubLoad && totemPubData && totemConsentAccepted && totemPubScreen === "denuncia" && (
            <form onSubmit={submitDenunciaTotemPublica} className="denuncia-form totem-denuncia-form">
              <div className="denuncia-intro-box">
                <div className="denuncia-intro-title">Denúncia pelo Totem</div>
                <p>
                  Preencha as informações abaixo para registrar sua denúncia para <strong>{totemPubData.empresa_name}</strong>.
                </p>
              </div>

              <div className="denuncia-question">
                <label>1. Você possui vínculo com a empresa {totemPubData.empresa_name}?</label>
                <div className="denuncia-radio-row">
                  <label className="checkbox-line"><input type="radio" name="totem-den-vinculo" checked={denVinculo === "SIM"} onChange={() => setDenVinculo("SIM")} />Sim</label>
                  <label className="checkbox-line"><input type="radio" name="totem-den-vinculo" checked={denVinculo === "NAO"} onChange={() => setDenVinculo("NAO")} />Nao</label>
                </div>
              </div>

              <div className="denuncia-question">
                <label>2. Você gostaria de se identificar? Lembre-se que essa informação e opcional!</label>
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
                <label>Função</label>
                <select value={denCargo} onChange={(e) => setDenCargo(e.target.value)} disabled={!denGhe}>
                  <option value="">{denGhe ? "Selecione uma função" : "Selecione um GHE primeiro"}</option>
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
                <label>3. Relate aqui a sua denúncia com todas as informações disponíveis.</label>
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
                  placeholder="Informe nomes, cargos ou formas de contato, se estiverem disponíveis."
                  value={denTestemunhas}
                  onChange={(e) => setDenTestemunhas(e.target.value)}
                />
              </div>

              <div className="denuncia-question">
                <label>6. Você aceita receber uma devolutiva para a denúncia realizada? Se sim, insira o seu e-mail:</label>
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

              <div className="totem-actions-row totem-actions-row-split totem-denuncia-actions">
                <button type="button" className="secondary" onClick={() => { setTotemPubScreen("menu"); setTotemPubActionMsg(""); setTotemDenErr(""); }}>
                  Voltar
                </button>
                <button type="submit" disabled={totemDenSaving}>
                  {totemDenSaving ? "Enviando..." : "Enviar"}
                </button>
              </div>
            </form>
          )}

          {!!totemPubActionMsg && <p className="muted">{totemPubActionMsg}</p>}

          {!totemPubLoad && totemPubData && totemConsentAccepted && totemPubScreen === "humor" && (
            <div className="totem-humor-screen">
              <h2 className="totem-humor-title">Como você está se sentindo?</h2>
              <p className="totem-humor-subtitle">Selecione a opção que melhor descreve seu humor hoje.</p>
              <div className="totem-humor-grid">
                {HUMOR_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    className={`totem-humor-card${totemHumorSelected === opt.key ? " selected" : ""}`}
                    onClick={() => setTotemHumorSelected(opt.key)}
                  >
                    <span className="totem-humor-emoji">{opt.emoji}</span>
                    <span className="totem-humor-label">{opt.label}</span>
                  </button>
                ))}
              </div>
              <div className="totem-actions-row totem-actions-row-split">
                <button type="button" className="secondary" onClick={() => { setTotemPubScreen("menu"); setTotemHumorSelected(""); }}>
                  Voltar
                </button>
                <button type="button" onClick={() => setTotemHumorModal(true)} disabled={!totemHumorSelected}>
                  Seguir
                </button>
              </div>
            </div>
          )}

          {!totemPubLoad && totemPubData && totemConsentAccepted && totemPubScreen === "ajuda" && (
            <form onSubmit={submitTotemAjuda} className="denuncia-form totem-denuncia-form">
              <div className="totem-ajuda-atencao">
                <span className="totem-ajuda-atencao-icon">🤝</span>
                <p>Não se preocupe, entraremos em contato com você.</p>
              </div>
              <div className="denuncia-question">
                <label>Nome <span style={{color:"#e53e3e"}}>*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Seu nome completo"
                  value={totemAjudaNome}
                  onChange={(e) => setTotemAjudaNome(e.target.value)}
                />
              </div>
              <div className="denuncia-question">
                <label>E-mail ou telefone <span className="muted" style={{fontWeight:400,fontSize:"0.85em"}}>(opcional)</span></label>
                <input
                  type="text"
                  placeholder="exemplo@email.com ou (11) 99999-9999"
                  value={totemAjudaContato}
                  onChange={(e) => setTotemAjudaContato(e.target.value)}
                />
              </div>
              <div className="denuncia-question">
                <label>GHE <span className="muted" style={{fontWeight:400,fontSize:"0.85em"}}>(opcional)</span></label>
                <select value={totemAjudaGhe} onChange={(e) => { setTotemAjudaGhe(e.target.value); setTotemAjudaFuncao(""); }}>
                  <option value="">Selecione um GHE</option>
                  {totemGhes.map((g) => <option key={`ajuda-ghe-${g.id}`} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div className="denuncia-question">
                <label>Função <span className="muted" style={{fontWeight:400,fontSize:"0.85em"}}>(opcional)</span></label>
                <select value={totemAjudaFuncao} onChange={(e) => setTotemAjudaFuncao(e.target.value)} disabled={!totemAjudaGhe}>
                  <option value="">{totemAjudaGhe ? (totemAjudaCargosFiltrados.length > 0 ? "Selecione uma funcao" : "Nenhuma funcao vinculada") : "Selecione um GHE primeiro"}</option>
                  {totemAjudaCargosFiltrados.map((c) => <option key={`ajuda-cargo-${c.id}`} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {totemAjudaErr && <p className="error">{totemAjudaErr}</p>}
              {totemAjudaOk && <p className="ok-message">{totemAjudaOk}</p>}
              <div className="totem-actions-row totem-actions-row-split">
                <button type="button" className="secondary" onClick={() => setTotemPubScreen("menu")} disabled={totemAjudaSaving}>Voltar</button>
                <button type="submit" disabled={totemAjudaSaving}>{totemAjudaSaving ? "Enviando..." : "Enviar"}</button>
              </div>
            </form>
          )}

          {totemHumorModal && (
            <div className="totem-humor-overlay" onClick={() => { if (!totemHumorSaving) setTotemHumorModal(false); }}>
              <div className="totem-humor-modal" onClick={(e) => e.stopPropagation()}>
                <div className="totem-humor-modal-header">
                  <h3>Identificação</h3>
                  <p>Informe seu GHE e Setor para registrar o humor.</p>
                </div>
                <div className="totem-humor-modal-form">
                  <label>GHE</label>
                  <select value={totemHumorGhe} onChange={(e) => { setTotemHumorGhe(e.target.value); setTotemHumorSetor(""); }}>
                    <option value="">Selecione um GHE (opcional)</option>
                    {totemGhes.map((g) => <option key={`humor-ghe-${g.id}`} value={g.id}>{g.name}</option>)}
                  </select>
                  <label>Setor</label>
                  <select value={totemHumorSetor} onChange={(e) => setTotemHumorSetor(e.target.value)} disabled={!totemHumorGhe}>
                    <option value="">{totemHumorGhe ? (totemSetoresFiltrados.length > 0 ? "Selecione um setor (opcional)" : "Nenhum setor vinculado") : "Selecione um GHE primeiro"}</option>
                    {totemSetoresFiltrados.map((s) => <option key={`humor-setor-${s.id}`} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                {totemHumorErr && <p className="error">{totemHumorErr}</p>}
                {totemHumorOk && <p className="ok-message">{totemHumorOk}</p>}
                <div className="totem-humor-modal-actions">
                  <button type="button" className="secondary" onClick={() => setTotemHumorModal(false)} disabled={totemHumorSaving}>Cancelar</button>
                  <button type="button" onClick={submitTotemHumor} disabled={totemHumorSaving}>
                    {totemHumorSaving ? "Registrando..." : "Confirmar"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {!totemPubLoad && totemPubData && totemConsentAccepted && totemPubScreen === "menu" && (
            <div className="totem-actions-row totem-actions-row-left">
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
          <h1>Canal de Denúncias</h1>
          <p className="subtitle">Envie sua denúncia com sigilo. A identificação é opcional.</p>

          {denPubLoad && <LoadingSpinner label="Carregando canal de denúncias..." />}
          {denPubErr && <p className="error">{denPubErr}</p>}

          {!denPubLoad && denPubData && (
            <form onSubmit={submitDenunciaPublica} className="denuncia-form">
              <div className="denuncia-intro-box">
                <div className="denuncia-intro-title">Sobre este canal</div>
                <p>
                  Este é um canal de comunicação disponibilizado para colaboradores e demais interessados que queiram relatar situações que violem a legislação ou as normas internas da empresa <strong>{denPubData.empresa_name}</strong>. Podem ser encaminhadas denúncias relacionadas a assédio moral, sexual ou organizacional, má gestão de mudanças, falta de clareza nas funções, ausência de recompensas ou reconhecimento, carência de suporte no ambiente de trabalho, baixa autonomia, sensação de injustiça organizacional, exposição a eventos traumáticos, sobrecarga ou subcarga de tarefas, conflitos interpessoais, isolamento no trabalho remoto, dificuldades de comunicação interna, bem como casos de discriminação por raça, cor, religião, sexo, condição física ou social.
                </p>
                <p className="denuncia-intro-highlight">O objetivo é garantir um ambiente de trabalho seguro, saudável e respeitoso para todos.</p>
              </div>

              <div className="denuncia-question">
                <label>1. Você possui vínculo com a empresa {denPubData.empresa_name}?</label>
                <div className="denuncia-radio-row">
                  <label className="checkbox-line"><input type="radio" name="den-vinculo" checked={denVinculo === "SIM"} onChange={() => setDenVinculo("SIM")} />Sim</label>
                  <label className="checkbox-line"><input type="radio" name="den-vinculo" checked={denVinculo === "NAO"} onChange={() => setDenVinculo("NAO")} />Nao</label>
                </div>
              </div>

              <div className="denuncia-question">
                <label>2. Você gostaria de se identificar? Lembre-se que essa informação é opcional!</label>
                <div className="denuncia-radio-row">
                  <label className="checkbox-line"><input type="radio" name="den-identificar" checked={denIdentificar === "SIM"} onChange={() => setDenIdentificar("SIM")} />Sim</label>
                  <label className="checkbox-line"><input type="radio" name="den-identificar" checked={denIdentificar === "NAO"} onChange={() => { setDenIdentificar("NAO"); setDenContatoIdentificacao(""); }} />Não</label>
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
                <button type="submit" disabled={denPubSaving}>{denPubSaving ? "Enviando..." : "Enviar denúncia"}</button>
              </div>

              <div className="denuncia-thanks-note" aria-live="polite">
                <strong>A nossa equipe de Compliance agradece a sua denúncia.</strong>
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
    const publicStepLabels = [
      "Identificação",
      "Demandas",
      "Controle",
      "Apoio da Gestão",
      "Suporte dos Colegas",
      "Relacionamentos",
      "Clareza de Papel | Função",
      "Gerenciamento de Mudanças",
      "Comentário",
    ];
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
          <h1>Questionário de Campanha</h1>
          {pubLoad && <LoadingSpinner label="Carregando..." />}
          {pubErr && <p className="error">{pubErr}</p>}
          {!pubLoad && pubData && (
            <>
              <p className="subtitle">{pubData.campaign?.title} | {pubData.empresa_name}</p>
              <div className="wizard-steps">
                {publicStepLabels.map((label, idx) => (
                  <span key={`pub-step-label-${idx + 1}`} className={pubStep === (idx + 1) ? "active" : ""}>{label}</span>
                ))}
              </div>

              {pubStep === 1 && (
                <form onSubmit={submitPublicStep1} className="login-form">
                  <div className="info-block success">
                    <h3>✅ AVALIAÇÃO VALIDADA</h3>
                    <p>Esta avaliação integra uma campanha oficial. Seu CPF será protegido por criptografia e utilizado exclusivamente para garantir que cada participante responda apenas uma vez. A empresa não terá acesso ao seu CPF nem poderá associar suas respostas à sua identidade.</p>
                  </div>

                  <div className="info-block neutral">
                    <h3>🔒 COMPROMISSO COM O ANONIMATO</h3>
                    <p>Todas as informações coletadas neste formulário são totalmente confidenciais. Seus dados pessoais não serão compartilhados com a empresa. As respostas serão utilizadas somente para análises estatísticas consolidadas, com o objetivo de contribuir para a melhoria do ambiente de trabalho.</p>
                    <p>O propósito desta avaliação é compreender de forma mais ampla as condições de trabalho e identificar possíveis fatores de risco psicossocial que possam impactar a saúde dos colaboradores, promovendo ações de melhoria contínua conforme previsto na NR 01.</p>
                  </div>

                  <div className="public-step1-grid">
                    <div className="public-field">
                      <label>CPF (obrigatório)</label>
                      <input value={pubCpf} onChange={(e) => setPubCpf(e.target.value)} required />
                    </div>

                    <div className="public-field">
                      <label>Primeiro nome (opcional)</label>
                      <input value={pubNome} onChange={(e) => setPubNome(e.target.value)} />
                    </div>

                    <div className="public-field">
                      <label>Idade (obrigatório)</label>
                      <input type="number" min="1" max="120" value={pubIdade} onChange={(e) => setPubIdade(e.target.value)} required />
                    </div>

                    <div className="public-field">
                      <label>Sexo</label>
                      <select value={pubSexo} onChange={(e) => setPubSexo(e.target.value)}>
                        <option value="">Selecione</option>
                        <option value="M">Masculino</option>
                        <option value="F">Feminino</option>
                        <option value="O">Outro</option>
                        <option value="N">Prefiro não informar</option>
                      </select>
                    </div>

                    <div className="public-field">
                      <label>{refLabel} (obrigatório)</label>
                      <select value={pubRef} onChange={(e) => onPublicRefChange(e.target.value)} required>
                        <option value="">Selecione</option>
                        {refs.map((r) => <option key={`pub-ref-${r.id}`} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>

                    <div className="public-field">
                      <label>Cargo (obrigatório)</label>
                      <select value={pubCargo} onChange={(e) => setPubCargo(e.target.value)} disabled={!pubRef} required>
                        <option value="">{pubRef ? "Selecione" : `Selecione ${refLabel} primeiro`}</option>
                        {cargosOptions.map((c) => <option key={`pub-cargo-${c.id}`} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {pubOk && <p className="ok-message">{pubOk}</p>}
                  {pubErr && <p className="error">{pubErr}</p>}
                  <button disabled={pubSaving}>{pubSaving ? "Enviando..." : "Seguir"}</button>
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
                  <div className="public-actions"><button type="button" className="secondary" onClick={() => setPubStep(1)}>Voltar</button><button disabled={pubSaving}>{pubSaving ? "Enviando..." : "Seguir"}</button></div>
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
                  <div className="public-actions"><button type="button" className="secondary" onClick={() => setPubStep(2)}>Voltar</button><button disabled={pubSaving}>{pubSaving ? "Enviando..." : "Seguir"}</button></div>
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
                  <div className="public-actions"><button type="button" className="secondary" onClick={() => setPubStep(3)}>Voltar</button><button disabled={pubSaving}>{pubSaving ? "Enviando..." : "Seguir"}</button></div>
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
                  <div className="public-actions"><button type="button" className="secondary" onClick={() => setPubStep(4)}>Voltar</button><button disabled={pubSaving}>{pubSaving ? "Enviando..." : "Seguir"}</button></div>
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
                  <div className="public-actions"><button type="button" className="secondary" onClick={() => setPubStep(5)}>Voltar</button><button disabled={pubSaving}>{pubSaving ? "Enviando..." : "Seguir"}</button></div>
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
                  <div className="public-actions"><button type="button" className="secondary" onClick={() => setPubStep(6)}>Voltar</button><button disabled={pubSaving}>{pubSaving ? "Enviando..." : "Seguir"}</button></div>
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
                  <div className="public-actions"><button type="button" className="secondary" onClick={() => setPubStep(7)}>Voltar</button><button disabled={pubSaving}>{pubSaving ? "Enviando..." : "Seguir"}</button></div>
                </form>
              )}

              {pubStep === 9 && (
                <form onSubmit={submitPublicStep9} className="login-form">
                  <label>{step9Prompt}</label>
                  <textarea className="text-area" rows={5} value={pubS9Comment} onChange={(e) => setPubS9Comment(e.target.value)} placeholder="Escreva aqui (opcional)..." />
                  {pubErr && <p className="error">{pubErr}</p>}
                  <div className="public-actions"><button type="button" className="secondary" onClick={() => setPubStep(8)}>Voltar</button><button disabled={pubSaving}>{pubSaving ? "Enviando..." : "Finalizar"}</button></div>
                </form>
              )}

              {pubStep === 10 && (
                <div className="public-finish">
                  <p className="ok-message">{pubOk || "Questionário enviado com sucesso."}</p>
                  <button type="button" className="secondary" onClick={restartPublicQuestionario}>Recomeçãr questionário</button>
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
      {isPasswordReset ? (
        <div className="login-page">
          <div className="login-panel-left">
            <div className="login-brand">
              <span className="login-brand-chip">CISS Consultoria</span>
              <div className="login-logo-wrap">
                <div className="login-logo-ring" />
                <img src="/logo.png" alt="Logo" className="login-logo" />
              </div>
              <div className="login-brand-copy">
                <p className="login-brand-kicker">Centro integrado em saúde e segurança do trabalho</p>
                <h1 className="login-brand-title">Redefina sua senha</h1>
                <p className="login-brand-sub">Cadastre uma nova senha para voltar ao sistema com o mesmo acesso administrativo.</p>
              </div>
            </div>
            <p className="login-panel-footer">© {new Date().getFullYear()} Ciss Consultoria. Todos os direitos reservados.</p>
          </div>
          <div className="login-panel-right">
            <div className="login-form-wrap">
              <span className="login-form-chip">Recuperação de acesso</span>
              <h2 className="login-form-title">Nova senha</h2>
              <p className="login-form-sub">Use uma senha com pelo menos 8 caracteres. Esse link pode ser usado apenas enquanto estiver valido.</p>
              <form onSubmit={submitPasswordReset} className="login-form-main">
                <div className="login-field">
                  <label htmlFor="reset-password">Nova senha</label>
                  <input id="reset-password" type="password" value={resetNewPassword} onChange={(e) => setResetNewPassword(e.target.value)} placeholder="••••••••" required />
                </div>
                <div className="login-field">
                  <label htmlFor="reset-password-confirm">Confirmar senha</label>
                  <input id="reset-password-confirm" type="password" value={resetConfirmPassword} onChange={(e) => setResetConfirmPassword(e.target.value)} placeholder="••••••••" required />
                </div>
                {resetErr && <p className="error">{resetErr}</p>}
                {resetOk && <p className="login-inline-note login-inline-note-success">{resetOk}</p>}
                <button type="submit" className="login-submit-btn" disabled={resetLoading}>
                  {resetLoading ? "Salvando..." : "Redefinir senha"}
                </button>
                <button
                  type="button"
                  className="login-secondary-action"
                  onClick={() => {
                    window.location.href = "/";
                  }}
                >
                  Voltar para o login
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : !user ? (
        <div className="login-page">
          <div className="login-panel-left">
            <div className="login-brand">
              <span className="login-brand-chip">CISS Consultoria</span>
              <div className="login-logo-wrap">
                <div className="login-logo-ring" />
                <img src="/logo.png" alt="Logo" className="login-logo" />
              </div>
              <div className="login-brand-copy">
                <p className="login-brand-kicker">Centro integrado em saúde e segurança do trabalho</p>
                <h1 className="login-brand-title">Plataforma de gestão ocupacional</h1>
                <p className="login-brand-sub">Acesse um ambiente pensado para acompanhamento técnico, operação segura e comunicação clara com sua equipe.</p>
              </div>
            </div>
            <p className="login-panel-footer">© {new Date().getFullYear()} Ciss Consultoria. Todos os direitos reservados.</p>
          </div>
          <div className="login-panel-right">
            <div className="login-form-wrap">
              <span className="login-form-chip">Acesso seguro</span>
              <h2 className="login-form-title">Bem-vindo</h2>
              <p className="login-form-sub">Faça login para acessar o sistema e continuar sua operação com agilidade.</p>
              <form onSubmit={login} className="login-form-main">
                <div className="login-field">
                  <label htmlFor="login-email">E-mail</label>
                  <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required />
                </div>
                <div className="login-field">
                  <label htmlFor="login-password">Senha</label>
                  <input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
                </div>
                {error && <p className="error">{error}</p>}
                <button type="button" className="login-secondary-action" onClick={openForgotPassword}>
                  Esqueci a senha
                </button>
                <button type="submit" className="login-submit-btn" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar"}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        <section className="dashboard-layout">
          <button className="mobile-menu-button" onClick={() => setSideOpen((p) => !p)}>{I.menu}</button>
          <aside className={`sidebar ${sideExpand ? "expanded" : "collapsed"} ${sideOpen ? "mobile-open" : ""}`}>
            <div className="sidebar-top">
              {sideExpand ? (
                <>
                  <div className="sidebar-brand" title={cfgData?.nome_consultoria || "{logo_consultoria} {nome_consultoria}"}>
                    <div className="sidebar-brand-logo" aria-hidden="true">
                      {cfgData?.logo_url ? (
                        <img src={cfgData.logo_url} alt="" />
                      ) : (
                        <strong>{cfgData?.nome_consultoria || "{logo_consultoria}"}</strong>
                      )}
                    </div>
                    <span className="sidebar-brand-text">{cfgData?.nome_consultoria || "{nome_consultoria}"}</span>
                  </div>
                  <button className="icon-button collapse-btn" aria-label="Recolher menu lateral" onClick={() => setSideExpand((p) => !p)}>{I.menu}</button>
                </>
              ) : (
                <button className="icon-button collapse-btn sidebar-top-toggle-only" aria-label="Expandir menu lateral" onClick={() => setSideExpand((p) => !p)}>{I.menu}</button>
              )}
            </div>
            <nav className="sidebar-nav">
              {sideExpand && <div className="sidebar-section-title">Principal</div>}
              {menu.map((m, idx) => (
                <button key={m.key} className={`nav-item ${section === m.key ? "active" : ""}`} onClick={() => goSection(m.key)}>
                  <span className="nav-icon">{m.icon}</span>
                  {sideExpand && <span className="nav-label">{m.label}</span>}
                  {sideExpand && idx === 0 && <span className="nav-badge">Novo</span>}
                </button>
              ))}
              {sideExpand && <div className="sidebar-section-title sidebar-section-title-spaced">Cadastros</div>}
              <button className={`nav-item nav-group-toggle ${cadOpen ? "open" : ""}`} onClick={() => setCadOpen((v) => !v)}>
                <span className="nav-icon">{I.cad}</span>
                {sideExpand && <span className="nav-label">Cadastro</span>}
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
                <button type="button" className="sidebar-user-status-btn" aria-label="Menu do usuário" onClick={() => setSideUserMenuOpen((v) => !v)}>
                  <span className="sidebar-user-status-dot" aria-hidden="true" />
                </button>
                {sideUserMenuOpen && (
                  <div className="sidebar-user-menu">
                    <button type="button" className="sidebar-user-menu-item" onClick={() => goSection("configuracoes")}>Configurações</button>
                    <button type="button" className="sidebar-user-menu-item danger" onClick={logout}>Sair</button>
                  </div>
                )}
              </div>
            )}
          </aside>
          {sideOpen && <div className="sidebar-overlay" onClick={() => setSideOpen(false)} />}
          <section className={`content-area ${section === "dashboard" ? "content-area-dashboard" : ""}`}>
            {section !== "dashboard" && <header className="content-header"><div><h1>{currentPageTitle}</h1></div></header>}
            {renderContent()}
          </section>
        </section>
      )}

      {forgotOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Esqueci minha senha</h3>
            <p>Informe o e-mail da sua conta. Se ele estiver cadastrado, enviaremos um link para redefinicao.</p>
            <form onSubmit={submitForgotPassword} className="login-form">
              <label htmlFor="forgot-email">E-mail</label>
              <input id="forgot-email" type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="seu@email.com" required />
              {forgotErr && <p className="error">{forgotErr}</p>}
              {forgotOk && <p className="login-inline-note login-inline-note-success">{forgotOk}</p>}
              <div className="modal-actions">
                <button type="button" className="secondary" onClick={closeForgotPassword} disabled={forgotLoading}>Cancelar</button>
                <button type="submit" disabled={forgotLoading}>{forgotLoading ? "Enviando..." : "Enviar link"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cModal.type && <div className="modal-backdrop"><div className="modal-card"><h3>{cModal.type === "delete" ? "Excluir consultor" : cModal.type === "edit" ? "Editar consultor" : "Novo consultor"}</h3>{cModal.type === "delete" ? <><p>Deseja realmente excluir {cModal.item?.email}?</p>{cErr && <p className="error">{cErr}</p>}<div className="modal-actions"><button className="secondary" onClick={closeC}>Cancelar</button><button className="danger" onClick={delConsultor} disabled={cSaving}>{cSaving ? "Excluindo..." : "Excluir"}</button></div></> : <form onSubmit={saveConsultor} className="login-form"><label>E-mail</label><input type="email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} required /><label>Senha {cModal.type === "edit" ? "(opcional)" : ""}</label><input type="password" value={cPass} onChange={(e) => setCPass(e.target.value)} /><label className="checkbox-line"><input type="checkbox" checked={cActive} onChange={(e) => setCActive(e.target.checked)} />Ativo</label>{cErr && <p className="error">{cErr}</p>}<div className="modal-actions"><button type="button" className="secondary" onClick={closeC}>Cancelar</button><button disabled={cSaving}>{cSaving ? "Salvando..." : "Salvar"}</button></div></form>}</div></div>}
      {sysModal.type && <div className="modal-backdrop"><div className="modal-card"><h3>{sysModal.type === "delete" ? "Excluir conta do sistema" : sysModal.type === "edit" ? "Editar conta do sistema" : "Nova conta do sistema"}</h3>{sysModal.type === "delete" ? <><p>Deseja realmente excluir {sysModal.item?.email}?</p>{sysModalErr && <p className="error">{sysModalErr}</p>}<div className="modal-actions"><button className="secondary" onClick={closeSysModal}>Cancelar</button><button className="danger" onClick={delSystemAccount} disabled={sysSaving}>{sysSaving ? "Excluindo..." : "Excluir"}</button></div></> : <form onSubmit={saveSystemAccount} className="login-form"><label>Nome</label><input value={sysName} onChange={(e) => setSysName(e.target.value)} placeholder="Nome do usuário" /><label>E-mail</label><input type="email" value={sysEmail} onChange={(e) => setSysEmail(e.target.value)} required /><label>Senha {sysModal.type === "edit" ? "(opcional)" : ""}</label><input type="password" value={sysPass} onChange={(e) => setSysPass(e.target.value)} /><label className="checkbox-line"><input type="checkbox" checked={sysActive} onChange={(e) => setSysActive(e.target.checked)} />Ativo</label>{sysModalErr && <p className="error">{sysModalErr}</p>}<div className="modal-actions"><button type="button" className="secondary" onClick={closeSysModal}>Cancelar</button><button disabled={sysSaving}>{sysSaving ? "Salvando..." : "Salvar"}</button></div></form>}</div></div>}

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

      {gModal.type && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>{gModal.type === "delete" ? "Excluir GHE" : gModal.type === "edit" ? "Editar GHE" : "Novo GHE"}</h3>
            {gModal.type === "delete" ? (
              <>
                <p>Deseja realmente excluir o GHE {gModal.item?.name}?</p>
                {gErr && <p className="error">{gErr}</p>}
                <div className="modal-actions">
                  <button className="secondary" onClick={closeGhe}>Cancelar</button>
                  <button className="danger" onClick={delGhe} disabled={gSaving}>{gSaving ? "Excluindo..." : "Excluir"}</button>
                </div>
              </>
            ) : (
              <form onSubmit={saveGhe} className="login-form">
                <label>Empresa selecionada</label>
                <input value={empresas.find((emp) => String(emp.id) === String(gEmpresa || gheEmpresaFiltro))?.company_name || gModal.item?.empresa_name || ""} disabled readOnly />
                <label>Nome do GHE</label>
                <input value={gNome} onChange={(e) => setGNome(e.target.value)} required />
                <label>Descricao (opcional)</label>
                <input value={gDesc} onChange={(e) => setGDesc(e.target.value)} />
                <label>Setores vinculados</label>
                <input
                  className="multi-pick-search"
                  type="text"
                  placeholder="Buscar setor..."
                  value={gSetorBusca}
                  onChange={(e) => setGSetorBusca(e.target.value)}
                />
                <div className="multi-pick">
                  {setores
                    .filter((s) => String(s.empresa) === String(gEmpresa || gheEmpresaFiltro))
                    .filter((s) => String(s.name || "").toLowerCase().includes(gSetorBusca.trim().toLowerCase()))
                    .map((s) => (
                      <label key={`ghe-setor-${s.id}`} className="checkbox-line">
                        <input type="checkbox" checked={gSetores.includes(s.id)} onChange={() => toggleGheSetor(s.id)} />
                        {s.name}
                      </label>
                    ))}
                </div>
                <label className="checkbox-line"><input type="checkbox" checked={gAtivo} onChange={(e) => setGAtivo(e.target.checked)} />Ativo</label>
                {gErr && <p className="error">{gErr}</p>}
                <div className="modal-actions">
                  <button type="button" className="secondary" onClick={closeGhe}>Cancelar</button>
                  <button type="submit" disabled={gSaving}>{gSaving ? "Salvando..." : "Salvar"}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {cgModal.type && <div className="modal-backdrop"><div className="modal-card"><h3>{cgModal.type === "delete" ? "Excluir cargo" : cgModal.type === "edit" ? "Editar cargo" : "Novo cargo"}</h3>{cgModal.type === "delete" ? <><p>Deseja realmente excluir o cargo {cgModal.item?.name}?</p>{cgErr && <p className="error">{cgErr}</p>}<div className="modal-actions"><button className="secondary" onClick={closeCargo}>Cancelar</button><button className="danger" onClick={delCargo} disabled={cgSaving}>{cgSaving ? "Excluindo..." : "Excluir"}</button></div></> : <form onSubmit={saveCargo} className="login-form"><label>Empresa selecionada</label><input value={empresas.find((emp) => String(emp.id) === String(cgEmpresa || cargoEmpresaFiltro))?.company_name || cgModal.item?.empresa_name || ""} disabled readOnly /><label>Nome do cargo</label><input value={cgNome} onChange={(e) => setCgNome(e.target.value)} required /><label>Descricao (opcional)</label><input value={cgDesc} onChange={(e) => setCgDesc(e.target.value)} /><label>Setores</label><input className="multi-pick-search" type="text" placeholder="Buscar setor..." value={cgSetorBusca} onChange={(e) => setCgSetorBusca(e.target.value)} /><div className="multi-pick">{setores.filter((s) => String(s.empresa) === String(cgEmpresa || cargoEmpresaFiltro)).filter((s) => String(s.name || "").toLowerCase().includes(cgSetorBusca.trim().toLowerCase())).map((s) => <label key={`cargo-setor-${s.id}`} className="checkbox-line"><input type="checkbox" checked={cgSetores.includes(s.id)} onChange={() => toggleCargoSetor(s.id)} />{s.name}</label>)}</div><label>GHEs</label><input className="multi-pick-search" type="text" placeholder="Buscar GHE..." value={cgGheBusca} onChange={(e) => setCgGheBusca(e.target.value)} /><div className="multi-pick">{ghes.filter((g) => String(g.empresa) === String(cgEmpresa || cargoEmpresaFiltro)).filter((g) => String(g.name || "").toLowerCase().includes(cgGheBusca.trim().toLowerCase())).map((g) => <label key={`cargo-ghe-${g.id}`} className="checkbox-line"><input type="checkbox" checked={cgGhes.includes(g.id)} onChange={() => toggleCargoGhe(g.id)} />{g.name}</label>)}</div><label className="checkbox-line"><input type="checkbox" checked={cgAtivo} onChange={(e) => setCgAtivo(e.target.checked)} />Ativo</label>{cgErr && <p className="error">{cgErr}</p>}<div className="modal-actions"><button type="button" className="secondary" onClick={closeCargo}>Cancelar</button><button type="submit" disabled={cgSaving}>{cgSaving ? "Salvando..." : "Salvar"}</button></div></form>}</div></div>}

      {cpModal.type && (
        <div className="modal-backdrop campanha-modal-backdrop">
          <div className="modal-card campanha-modal-card">
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
                <div><label>Nome da empresa (Obrigatório)</label><input value={eForm.company_name} onChange={(e) => eChange("company_name", e.target.value)} /></div>
                <div><label>CNAE (Opcional)</label><input value={eForm.cnae} onChange={(e) => eChange("cnae", e.target.value)} placeholder="Ex.: 47.11-3-02" /></div>
                <div><label>{eForm.document_type} (Obrigatório)</label><input value={eForm.document_number} onChange={(e) => eChange("document_number", e.target.value)} /></div>
                <div><label>Nome do responsável (Obrigatório)</label><input value={eForm.responsible_name} onChange={(e) => eChange("responsible_name", e.target.value)} /></div>
                <div><label>E-mail do responsável (Obrigatório)</label><input type="email" value={eForm.responsible_email} onChange={(e) => eChange("responsible_email", e.target.value)} /></div>
                {/* <div><label>Senha do responsável {eMode === "edit" ? "(opcional)" : ""}</label><input type="password" value={eForm.responsible_password} onChange={(e) => eChange("responsible_password", e.target.value)} /></div> */}
                <div><label>Nome do estabelecimento (Obrigatório)</label><input value={eForm.establishment_name} onChange={(e) => eChange("establishment_name", e.target.value)} /></div>
                <div><label>Tipo de avaliação (Obrigatório)</label><select value={eForm.evaluation_type} onChange={(e) => eChange("evaluation_type", e.target.value)}><option value="SETOR">Setor</option><option value="GHE">GHE</option></select></div>
                <div><label>Grau de risco (Obrigatório)</label><select value={eForm.risk_level} onChange={(e) => eChange("risk_level", e.target.value)}><option value="">Selecione</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></div>
                <div><label>Número de funcionários (Obrigatório)</label><input type="number" min="0" value={eForm.employee_count} onChange={(e) => eChange("employee_count", e.target.value)} /></div>
                <div>
                  <label>CEP (Obrigatório)</label>
                  <input value={eForm.postal_code} onChange={(e) => eChange("postal_code", e.target.value)} placeholder="Somente numeros" />
                  {eCepLoading && <small>Buscando endereço automaticamente...</small>}
                  {!eCepLoading && eCepErr && <small className="error">{eCepErr}</small>}
                </div>
                <div><label>UF (Obrigatório)</label><input maxLength={2} value={eForm.state} disabled readOnly /></div>
                <div><label>Cidade (Obrigatório)</label><input value={eForm.city} disabled readOnly /></div>
                <div><label>Bairro (Obrigatório)</label><input value={eForm.neighborhood} disabled readOnly /></div>
                <div><label>Rua (Opcional)</label><input value={eForm.street} disabled readOnly /></div>
                <div><label>Número (Opcional)</label><input value={eForm.number} onChange={(e) => eChange("number", e.target.value)} /></div>
                <div><label>Complemento (Opcional)</label><input value={eForm.complement} onChange={(e) => eChange("complement", e.target.value)} /></div>
              </div>}

              {eErr && <p className="error">{eErr}</p>}
              <div className="modal-actions">
                {/* <button type="button" className="secondary" onClick={closeEmpresa}>Cancelar</button> */}
                {eStep > 1 && <button type="button" className="secondary" onClick={prevStep}>Voltar</button>}
                {eStep < 3 ? <button type="button" onClick={nextStep}>Próximo</button> : <button type="submit" disabled={eSaving}>{eSaving ? "Salvando..." : eMode === "create" ? "Criar empresa" : "Salvar"}</button>}
              </div>
            </form>
          </div>
        </div>
      )}

      {toastViewport}
      {eInactivate && <div className="modal-backdrop"><div className="modal-card"><h3>Inativar empresa</h3><p>Deseja inativar {eInactivate.company_name}?</p>{eErr && <p className="error">{eErr}</p>}<div className="modal-actions"><button className="secondary" onClick={() => setEInactivate(null)}>Cancelar</button><button className="danger" onClick={inativarEmpresa} disabled={eActing}>{eActing ? "Inativando..." : "Inativar"}</button></div></div></div>}

      {/* ── Pedidos de Ajuda modals ── */}
      {ajudaHistModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Histórico do pedido #{ajudaHistModal.id}</h3>
            <p className="subtitle">Atualizações registradas para este pedido.</p>
            <div className="denuncia-history-list">
              {(ajudaHistModal.atualizacoes || []).length === 0 ? (
                <p className="empty-state">Nenhuma atualização registrada.</p>
              ) : (
                (ajudaHistModal.atualizacoes || []).map((a) => (
                  <div key={`ajuda-hist-${a.id}`} className="denuncia-history-item">
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
              <button type="button" className="secondary" onClick={() => setAjudaHistModal(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
      {ajudaViewModal && (
        <div className="modal-backdrop">
          <div className="modal-card modal-card-large">
            <h3>Detalhes do pedido #{ajudaViewModal.id}</h3>
            <p className="subtitle">{fDate(ajudaViewModal.created_at)}</p>
            <div className="denuncia-detail-grid">
              <div className="info-block">
                <h3>Dados gerais</h3>
                <p><strong>Status:</strong> {ajudaViewModal.status === "ATENDIDO" ? "Atendido" : ajudaViewModal.status === "EM_ATENDIMENTO" ? "Em atendimento" : "Aberto"}</p>
                <p><strong>Nome:</strong> {ajudaViewModal.nome || "—"}</p>
                <p><strong>Contato:</strong> {ajudaViewModal.contato || "—"}</p>
                <p><strong>GHE:</strong> {ajudaViewModal.ghe_name || "—"}</p>
                <p><strong>Função:</strong> {ajudaViewModal.funcao_name || "—"}</p>
              </div>
              <div className="info-block">
                <h3>Atualizações</h3>
                {(ajudaViewModal.atualizacoes || []).length === 0 ? (
                  <p>Nenhuma atualização registrada.</p>
                ) : (
                  <div className="denuncia-history-list">
                    {(ajudaViewModal.atualizacoes || []).map((a) => (
                      <div key={`ajuda-view-hist-${a.id}`} className="denuncia-history-item">
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
              <button type="button" className="secondary" onClick={() => setAjudaViewModal(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
      {ajudaUpdModal.item && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Adicionar atualização</h3>
            <p className="subtitle">Pedido #{ajudaUpdModal.item.id} — {ajudaUpdModal.item.nome}</p>
            <form onSubmit={submitAjudaAtualizacaoModal} className="login-form">
              <label>Atualização</label>
              <textarea
                className="text-area"
                value={ajudaUpdModal.text}
                onChange={(e) => setAjudaUpdModal((p) => ({ ...p, text: e.target.value, err: "" }))}
                placeholder="Descreva a atualização deste pedido de ajuda..."
                required
              />
              {ajudaUpdModal.err && <p className="error">{ajudaUpdModal.err}</p>}
              <div className="modal-actions">
                <button type="button" className="secondary" onClick={closeAjudaAtualizacaoModal} disabled={ajudaUpdModal.saving}>Cancelar</button>
                <button type="submit" disabled={ajudaUpdModal.saving}>{ajudaUpdModal.saving ? "Salvando..." : "Salvar atualização"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {ajudaAtendModal.item && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Marcar pedido em atendimento</h3>
            <p>Deseja marcar o pedido #{ajudaAtendModal.item.id} como em atendimento?</p>
            {ajudaAtendModal.err && <p className="error">{ajudaAtendModal.err}</p>}
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={closeAjudaAtendModal} disabled={ajudaAtendModal.saving}>Cancelar</button>
              <button type="button" onClick={confirmAjudaAtend} disabled={ajudaAtendModal.saving}>
                {ajudaAtendModal.saving ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
      {ajudaResolveModal.item && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Marcar pedido como atendido</h3>
            <p>Deseja marcar o pedido #{ajudaResolveModal.item.id} como atendido?</p>
            {ajudaResolveModal.err && <p className="error">{ajudaResolveModal.err}</p>}
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={closeAjudaResolveModal} disabled={ajudaResolveModal.saving}>Cancelar</button>
              <button type="button" onClick={confirmAjudaResolve} disabled={ajudaResolveModal.saving}>
                {ajudaResolveModal.saving ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

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
                <p><strong>Vínculo com a empresa:</strong> {denViewModal.possui_vinculo ? "Sim" : "Nao"}</p>
                <p><strong>Deseja se identificar:</strong> {denViewModal.deseja_identificar ? "Sim" : "Nao"}</p>
                {denViewModal.contato_identificacao && <p><strong>Contato:</strong> {denViewModal.contato_identificacao}</p>}
                <p><strong>Tipo da denúncia:</strong> {denViewModal.tipo_label || "-"}</p>
                <p><strong>GHE:</strong> {denViewModal.ghe_name || "-"}</p>
                <p><strong>Função:</strong> {denViewModal.cargo_name || "-"}</p>
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
                <h3>Atualizações</h3>
                {(denViewModal.atualizacoes || []).length === 0 ? (
                  <p>Nenhuma atualização registrada.</p>
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
            <h3>Adicionar atualização</h3>
            <p className="subtitle">Denúncia #{denUpdModal.item.id}</p>
            <form onSubmit={submitDenunciaAtualizacaoModal} className="login-form">
              <label>Atualização</label>
              <textarea
                className="text-area"
                value={denUpdModal.text}
                onChange={(e) => setDenUpdModal((p) => ({ ...p, text: e.target.value, err: "" }))}
                placeholder="Descreva a atualização desta denúncia..."
                required
              />
              {denUpdModal.err && <p className="error">{denUpdModal.err}</p>}
              <div className="modal-actions">
                <button type="button" className="secondary" onClick={closeDenunciaAtualizacaoModal} disabled={denUpdModal.saving}>Cancelar</button>
                <button type="submit" disabled={denUpdModal.saving}>{denUpdModal.saving ? "Salvando..." : "Salvar atualização"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {denResolveModal.item && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Marcar denúncia como resolvida</h3>
            <p>Deseja marcar a denúncia #{denResolveModal.item.id} como resolvida?</p>
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
            <h3>Mudar status para Em análise</h3>
            <p>Deseja marcar a denúncia #{denAnalyzeModal.item.id} como em análise?</p>
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
            <h3>Confirmar regeneração de link</h3>
            <p>
              Ao regenerar, o link antigo será desabilitado e ninguém poderá mais acessá-lo.
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
