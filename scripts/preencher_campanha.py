"""
Automação para preencher respostas de campanha para testes.

Uso:
    python scripts/preencher_campanha.py <share_token> [--qtd N] [--base-url URL]

Exemplos:
    python scripts/preencher_campanha.py xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    python scripts/preencher_campanha.py xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx --qtd 10
    python scripts/preencher_campanha.py xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx --qtd 5 --base-url http://localhost:8000/api
"""

import argparse
import random
import string
import sys
import time

try:
    import requests
except ImportError:
    print("Erro: biblioteca 'requests' nao instalada. Execute: pip install requests")
    sys.exit(1)

DEFAULT_BASE_URL = "http://localhost:8000/api"

FREQUENCY_CHOICES = ["NUNCA", "RARAMENTE", "AS_VEZES", "FREQUENTEMENTE", "SEMPRE"]

NOMES = [
    "Ana", "Bruno", "Carlos", "Daniela", "Eduardo", "Fernanda", "Gustavo",
    "Helena", "Igor", "Juliana", "Leonardo", "Mariana", "Nicolas", "Olivia",
    "Pedro", "Quezia", "Rafael", "Sabrina", "Thiago", "Ursula", "Vitor",
    "Wanda", "Xavier", "Yasmin", "Zeca",
]

SEXOS = ["M", "F"]


def rand_cpf():
    """Gera CPF numerico de 11 digitos unico (sem validacao real)."""
    return "".join(random.choices(string.digits, k=11))


def rand_freq():
    return random.choice(FREQUENCY_CHOICES)


def rand_freq_dict(keys):
    return {k: rand_freq() for k in keys}


def buscar_campanha(base_url, share_token):
    url = f"{base_url}/campanhas/public/{share_token}/"
    resp = requests.get(url, timeout=15)
    if resp.status_code == 200:
        return resp.json()
    print(f"  [ERRO] GET campanha -> HTTP {resp.status_code}: {resp.text}")
    return None


def submeter_step1(base_url, share_token, dados):
    url = f"{base_url}/campanhas/public/{share_token}/step1/"
    resp = requests.post(url, json=dados, timeout=15)
    if resp.status_code == 201:
        return resp.json().get("response_id")
    print(f"  [ERRO] Step1 -> HTTP {resp.status_code}: {resp.text}")
    return None


def submeter_step(base_url, share_token, step_num, payload):
    url = f"{base_url}/campanhas/public/{share_token}/step{step_num}/"
    resp = requests.post(url, json=payload, timeout=15)
    if resp.status_code == 201:
        return True
    print(f"  [ERRO] Step{step_num} -> HTTP {resp.status_code}: {resp.text}")
    return False


def preencher_resposta(base_url, share_token, campanha_data, indice):
    evaluation_type = campanha_data.get("evaluation_type", "SETOR")
    setores = campanha_data.get("setores", [])
    ghes = campanha_data.get("ghes", [])
    cargos = campanha_data.get("cargos", [])

    if not cargos:
        print("  [ERRO] Nenhum cargo disponivel na campanha.")
        return False

    # Escolhe cargo aleatorio e unidade compativel (setor ou ghe)
    cargo = random.choice(cargos)

    setor_id = None
    ghe_id = None

    if evaluation_type == "SETOR":
        ids_compativeis = cargo.get("setor_ids", [])
        if not ids_compativeis and setores:
            ids_compativeis = [s["id"] for s in setores]
        if not ids_compativeis:
            print("  [ERRO] Cargo sem setores vinculados e empresa sem setores.")
            return False
        setor_id = random.choice(ids_compativeis)
    else:
        ids_compativeis = cargo.get("ghe_ids", [])
        if not ids_compativeis and ghes:
            ids_compativeis = [g["id"] for g in ghes]
        if not ids_compativeis:
            print("  [ERRO] Cargo sem GHEs vinculados e empresa sem GHEs.")
            return False
        ghe_id = random.choice(ids_compativeis)

    # Step 1 — dados pessoais
    step1_dados = {
        "cpf": rand_cpf(),
        "first_name": random.choice(NOMES),
        "age": random.randint(18, 65),
        "sex": random.choice(SEXOS),
        "cargo_id": cargo["id"],
    }
    if setor_id is not None:
        step1_dados["setor_id"] = setor_id
    if ghe_id is not None:
        step1_dados["ghe_id"] = ghe_id

    response_id = submeter_step1(base_url, share_token, step1_dados)
    if not response_id:
        return False

    base_payload = {"step1_response_id": response_id}

    # Step 2 — 8 questoes
    if not submeter_step(base_url, share_token, 2, {
        **base_payload,
        **rand_freq_dict([f"q{i}" for i in range(1, 9)]),
    }):
        return False

    # Step 3 — 6 questoes
    if not submeter_step(base_url, share_token, 3, {
        **base_payload,
        **rand_freq_dict([f"q{i}" for i in range(1, 7)]),
    }):
        return False

    # Step 4 — 5 questoes
    if not submeter_step(base_url, share_token, 4, {
        **base_payload,
        **rand_freq_dict([f"q{i}" for i in range(1, 6)]),
    }):
        return False

    # Step 5 — 4 questoes
    if not submeter_step(base_url, share_token, 5, {
        **base_payload,
        **rand_freq_dict([f"q{i}" for i in range(1, 5)]),
    }):
        return False

    # Step 6 — 4 questoes
    if not submeter_step(base_url, share_token, 6, {
        **base_payload,
        **rand_freq_dict([f"q{i}" for i in range(1, 5)]),
    }):
        return False

    # Step 7 — 5 questoes
    if not submeter_step(base_url, share_token, 7, {
        **base_payload,
        **rand_freq_dict([f"q{i}" for i in range(1, 6)]),
    }):
        return False

    # Step 8 — 3 questoes
    if not submeter_step(base_url, share_token, 8, {
        **base_payload,
        **rand_freq_dict([f"q{i}" for i in range(1, 4)]),
    }):
        return False

    # Step 9 — comentario opcional (finaliza a resposta)
    if not submeter_step(base_url, share_token, 9, {
        **base_payload,
        "comment": "",
    }):
        return False

    print(f"  [OK] Resposta {indice} enviada (response_id={response_id}, nome={step1_dados['first_name']}, cargo_id={cargo['id']})")
    return True


def main():
    parser = argparse.ArgumentParser(description="Preenche respostas de campanha para testes.")
    parser.add_argument("share_token", help="UUID share_token da campanha")
    parser.add_argument("--qtd", type=int, default=5, help="Quantidade de respostas a enviar (default: 5)")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help=f"URL base da API (default: {DEFAULT_BASE_URL})")
    parser.add_argument("--delay", type=float, default=0.3, help="Segundos de espera entre respostas (default: 0.3)")
    args = parser.parse_args()

    print(f"Campanha: {args.share_token}")
    print(f"Base URL: {args.base_url}")
    print(f"Quantidade: {args.qtd}")
    print()

    print("Buscando dados da campanha...")
    campanha_data = buscar_campanha(args.base_url, args.share_token)
    if not campanha_data:
        sys.exit(1)

    empresa_name = campanha_data.get("empresa_name", "?")
    eval_type = campanha_data.get("evaluation_type", "?")
    n_cargos = len(campanha_data.get("cargos", []))
    n_setores = len(campanha_data.get("setores", []))
    n_ghes = len(campanha_data.get("ghes", []))
    print(f"Empresa: {empresa_name} | Tipo: {eval_type} | Cargos: {n_cargos} | Setores: {n_setores} | GHEs: {n_ghes}")
    print()

    sucesso = 0
    falha = 0

    for i in range(1, args.qtd + 1):
        print(f"Enviando resposta {i}/{args.qtd}...")
        ok = preencher_resposta(args.base_url, args.share_token, campanha_data, i)
        if ok:
            sucesso += 1
        else:
            falha += 1
        if i < args.qtd:
            time.sleep(args.delay)

    print()
    print(f"Concluido: {sucesso} enviadas com sucesso, {falha} com erro.")


if __name__ == "__main__":
    main()
