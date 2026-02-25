import type { FormEventHandler, ReactNode } from "react";

export type ConsultorModalType = "" | "create" | "edit" | "delete";

export interface ConsultorItem {
  id: number;
  email: string;
  is_active: boolean;
  access_expires_on?: string | null;
}

interface ConsultoresSectionProps {
  consultores: ConsultorItem[];
  consLoad: boolean;
  consErr: string;
  loadingNode?: ReactNode;
  formatDate: (value: string) => string;
  openCreate: () => void;
  openEdit: (item: ConsultorItem) => void;
  openDelete: (item: ConsultorItem) => void;
  cModal: { type: ConsultorModalType | string; item: ConsultorItem | null };
  cErr: string;
  cSaving: boolean;
  cEmail: string;
  cPass: string;
  cActive: boolean;
  cAccessExpiresOn: string;
  setCEmail: (value: string) => void;
  setCPass: (value: string) => void;
  setCActive: (value: boolean) => void;
  setCAccessExpiresOn: (value: string) => void;
  closeC: () => void;
  saveConsultor: FormEventHandler<HTMLFormElement>;
  delConsultor: () => void;
}

function statusBadge(active: boolean) {
  return active
    ? "inline-flex items-center rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700"
    : "inline-flex items-center rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700";
}

export default function ConsultoresSection(props: ConsultoresSectionProps) {
  const {
    consultores,
    consLoad,
    consErr,
    loadingNode,
    formatDate,
    openCreate,
    openEdit,
    openDelete,
    cModal,
    cErr,
    cSaving,
    cEmail,
    cPass,
    cActive,
    cAccessExpiresOn,
    setCEmail,
    setCPass,
    setCActive,
    setCAccessExpiresOn,
    closeC,
    saveConsultor,
    delConsultor,
  } = props;

  const isDelete = cModal.type === "delete";
  const isEdit = cModal.type === "edit";
  const isCreate = cModal.type === "create";
  const showModal = Boolean(cModal.type);

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Consultores</h2>
            <p className="text-sm text-slate-500">Gerencie acesso e validade de uso do sistema.</p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Novo consultor
          </button>
        </div>

        {consLoad && loadingNode}
        {!!consErr && <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{consErr}</p>}

        {!consLoad && (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">E-mail</th>
                  <th className="px-4 py-3 font-semibold">Limite acesso</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {consultores.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      Nenhum consultor cadastrado.
                    </td>
                  </tr>
                ) : (
                  consultores.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 text-slate-700">{c.id}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{c.email}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {c.access_expires_on ? formatDate(c.access_expires_on) : "Sem limite"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={statusBadge(c.is_active)}>{c.is_active ? "Ativo" : "Inativo"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(c)}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition hover:bg-slate-100"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => openDelete(c)}
                            className="rounded-lg border border-rose-300 px-3 py-1.5 font-medium text-rose-700 transition hover:bg-rose-50"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">
              {isDelete ? "Excluir consultor" : isEdit ? "Editar consultor" : "Novo consultor"}
            </h3>

            {isDelete ? (
              <>
                <p className="text-sm text-slate-700">
                  Deseja realmente excluir <strong>{cModal.item?.email}</strong>?
                </p>
                {!!cErr && <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{cErr}</p>}
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                    onClick={closeC}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={delConsultor}
                    disabled={cSaving}
                  >
                    {cSaving ? "Excluindo..." : "Excluir"}
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={saveConsultor} className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">E-mail</label>
                  <input
                    type="email"
                    value={cEmail}
                    onChange={(e) => setCEmail(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-0 transition focus:border-slate-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Senha {isEdit ? "(opcional)" : ""}
                  </label>
                  <input
                    type="password"
                    value={cPass}
                    onChange={(e) => setCPass(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-0 transition focus:border-slate-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Data limite de acesso (opcional)</label>
                  <input
                    type="date"
                    value={cAccessExpiresOn}
                    onChange={(e) => setCAccessExpiresOn(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-0 transition focus:border-slate-500"
                  />
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={cActive}
                    onChange={(e) => setCActive(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Ativo
                </label>

                {!!cErr && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{cErr}</p>}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                    onClick={closeC}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={cSaving}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {cSaving ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
