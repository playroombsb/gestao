"""Coleta métricas públicas de um perfil do Instagram e grava em studio_sm.instagram.

Ordem de tentativa (para na primeira que trouxer os seguidores):
  1. api     -> /api/v1/users/web_profile_info/ com o Fetcher (curl_cffi imitando o Chrome).
                Traz seguidores, seguindo, total de posts e os últimos ~12 posts.
  2. html    -> página do perfil, meta og:description ("X Followers, Y Following, Z Posts").
                Traz só os três totais.
  3. stealth -> mesma página aberta num Chromium furtivo (StealthyFetcher), lendo a mesma meta.

Variáveis de ambiente:
  INSTAGRAM_PERFIL           perfil a coletar (padrão: playroombsb)
  INSTAGRAM_METODOS          ordem dos métodos, separados por vírgula (padrão: api,html,stealth)
  INSTAGRAM_PROXY            proxy opcional (ex: http://usuario:senha@host:porta). O Instagram bloqueia
                             perfis para IP de datacenter (HTTP 429 / login), então na VPS só funciona com
                             um proxy residencial ou móvel.
  SUPABASE_URL               URL do projeto Supabase
  SUPABASE_SERVICE_ROLE_KEY  chave service_role (nunca é impressa)
  INSTAGRAM_SEM_GRAVAR=1     só coleta e imprime, sem gravar no banco

Sai com código 0 quando grava; código 1 quando não consegue coletar; código 2 quando falha ao gravar.
"""

from __future__ import annotations

import json
import logging
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

APP_ID = "936619743392459"


def proxy() -> dict:
    p = os.environ.get("INSTAGRAM_PROXY", "").strip()
    return {"proxy": p} if p else {}
TRINTA_DIAS = 30 * 24 * 3600


def log(msg: str) -> None:
    agora = datetime.now(timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M:%S %z")
    print(f"[{agora}] {msg}", flush=True)


def carregar_env_local() -> None:
    """Em execução local, lê o .env.local do projeto se as variáveis não estiverem no ambiente."""
    if os.environ.get("SUPABASE_URL") and os.environ.get("SUPABASE_SERVICE_ROLE_KEY"):
        return
    arquivo = Path(__file__).resolve().parent.parent / ".env.local"
    if not arquivo.exists():
        return
    for linha in arquivo.read_text(encoding="utf-8").splitlines():
        linha = linha.strip()
        if not linha or linha.startswith("#") or "=" not in linha:
            continue
        nome, valor = linha.split("=", 1)
        os.environ.setdefault(nome.strip(), valor.strip().strip('"').strip("'"))


# ---------------------------------------------------------------- leitura dos números

def numero(texto: str) -> int:
    """Converte '1,782', '1.782', '12.5K', '1,2 mil', '3M' em inteiro."""
    t = texto.strip().lower().replace(" ", " ")
    multiplicadores = {"k": 1_000, "mil": 1_000, "m": 1_000_000, "mi": 1_000_000, "b": 1_000_000_000}
    m = re.fullmatch(r"([\d.,]+)\s*(k|mil|mi|m|b)?", t)
    if not m:
        raise ValueError(f"número não reconhecido: {texto!r}")
    base, sufixo = m.group(1), m.group(2)
    if sufixo:
        return round(float(base.replace(",", ".")) * multiplicadores[sufixo])
    return int(re.sub(r"[.,]", "", base))


def totais_da_descricao(descricao: str | None) -> dict | None:
    """Lê seguidores, seguindo e posts do og:description (em inglês ou português)."""
    if not descricao:
        return None
    num = r"([\d.,]+(?:\s*(?:K|M|B|mil|mi))?)"
    padroes = {
        "seguidores": num + r"\s+(?:followers?|seguidores?)",
        "seguindo": num + r"\s+(?:following|seguindo)",
        "posts": num + r"\s+(?:posts?|publica[çc][õo]es|publica[çc][ãa]o)",
    }
    out = {}
    for campo, padrao in padroes.items():
        m = re.search(padrao, descricao, re.IGNORECASE)
        if not m:
            return None
        out[campo] = numero(m.group(1))
    return out


# ---------------------------------------------------------------- métodos de coleta

def via_api(perfil: str) -> dict:
    from scrapling.fetchers import Fetcher

    r = Fetcher.get(
        f"https://www.instagram.com/api/v1/users/web_profile_info/?username={perfil}",
        headers={
            "x-ig-app-id": APP_ID,
            "accept": "*/*",
            "referer": f"https://www.instagram.com/{perfil}/",
        },
        impersonate="chrome",
        timeout=30,
        **proxy(),
    )
    if r.status != 200:
        raise RuntimeError(f"api respondeu HTTP {r.status}: {r.body[:160]!r}")
    user = (json.loads(r.body).get("data") or {}).get("user")
    if not user:
        raise RuntimeError("api respondeu sem 'data.user'")

    midia = user.get("edge_owner_to_timeline_media") or {}
    posts = []
    for edge in midia.get("edges") or []:
        n = edge.get("node") or {}
        curtidas = (n.get("edge_liked_by") or n.get("edge_media_preview_like") or {}).get("count")
        comentarios = (n.get("edge_media_to_comment") or {}).get("count")
        posts.append({
            # Instagram devolve -1 quando o perfil esconde as curtidas
            "curtidas": curtidas if isinstance(curtidas, int) and curtidas >= 0 else None,
            "comentarios": comentarios if isinstance(comentarios, int) and comentarios >= 0 else None,
            "timestamp": n.get("taken_at_timestamp"),
        })
    return {
        "seguidores": (user.get("edge_followed_by") or {}).get("count"),
        "seguindo": (user.get("edge_follow") or {}).get("count"),
        "posts": midia.get("count"),
        "ultimos_posts": posts,
    }


def via_html(perfil: str) -> dict:
    from scrapling.fetchers import Fetcher

    r = Fetcher.get(
        f"https://www.instagram.com/{perfil}/",
        headers={"accept-language": "en-US,en;q=0.9"},
        impersonate="chrome",
        timeout=30,
        **proxy(),
    )
    if r.status != 200:
        raise RuntimeError(f"página do perfil respondeu HTTP {r.status}")
    descricao = r.css('meta[property="og:description"]::attr(content)').get() or \
        r.css('meta[name="description"]::attr(content)').get()
    totais = totais_da_descricao(descricao)
    if not totais:
        raise RuntimeError(f"og:description sem os totais: {descricao!r}")
    return totais


def via_stealth(perfil: str) -> dict:
    from scrapling.fetchers import StealthyFetcher

    r = StealthyFetcher.fetch(
        f"https://www.instagram.com/{perfil}/",
        headless=True,
        network_idle=True,
        locale="en-US",
        timeout=60_000,
        **proxy(),
    )
    if r.status != 200:
        raise RuntimeError(f"navegador recebeu HTTP {r.status}")
    descricao = r.css('meta[property="og:description"]::attr(content)').get() or \
        r.css('meta[name="description"]::attr(content)').get()
    totais = totais_da_descricao(descricao)
    if not totais:
        raise RuntimeError(f"og:description sem os totais: {descricao!r}")
    return totais


METODOS = {"api": via_api, "html": via_html, "stealth": via_stealth}


# ---------------------------------------------------------------- cálculo e gravação

def media(valores: list) -> float | None:
    v = [x for x in valores if isinstance(x, (int, float))]
    return round(sum(v) / len(v), 2) if v else None


def montar_linha(perfil: str, dados: dict) -> dict:
    posts = dados.get("ultimos_posts") or []
    media_curtidas = media([p["curtidas"] for p in posts])
    media_comentarios = media([p["comentarios"] for p in posts])
    seguidores = dados.get("seguidores")

    engajamento = None
    if seguidores and (media_curtidas is not None or media_comentarios is not None):
        engajamento = round(((media_curtidas or 0) + (media_comentarios or 0)) / seguidores * 100, 3)

    posts_30d = None
    if posts:
        limite = time.time() - TRINTA_DIAS
        posts_30d = sum(1 for p in posts if (p.get("timestamp") or 0) >= limite)

    return {
        "perfil": perfil,
        "seguidores": seguidores,
        "seguindo": dados.get("seguindo"),
        "posts": dados.get("posts"),
        "media_curtidas": media_curtidas,
        "media_comentarios": media_comentarios,
        "engajamento": engajamento,
        "posts_30d": posts_30d,
    }


def gravar(linha: dict) -> None:
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    chave = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not chave:
        raise RuntimeError("faltam SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no ambiente")
    req = urllib.request.Request(
        f"{url}/rest/v1/instagram",
        data=json.dumps(linha).encode(),
        method="POST",
        headers={
            "apikey": chave,
            "Authorization": f"Bearer {chave}",
            "Content-Profile": "studio_sm",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            if resp.status not in (200, 201, 204):
                raise RuntimeError(f"Supabase respondeu HTTP {resp.status}")
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"Supabase respondeu HTTP {e.code}: {e.read()[:300]!r}") from None


def main() -> int:
    # O Scrapling registra cada requisição e cada nova tentativa; as falhas já aparecem
    # resumidas nas linhas "aviso" abaixo. Importar o módulo antes, porque ele fixa o nível ao carregar.
    import scrapling.core.utils  # noqa: F401
    logging.getLogger("scrapling").setLevel(logging.CRITICAL)
    carregar_env_local()
    perfil = os.environ.get("INSTAGRAM_PERFIL", "playroombsb").strip().lstrip("@") or "playroombsb"
    ordem = [m.strip() for m in os.environ.get("INSTAGRAM_METODOS", "api,html,stealth").split(",") if m.strip()]

    dados, metodo_ok, falhas = None, None, []
    for nome in ordem:
        funcao = METODOS.get(nome)
        if not funcao:
            falhas.append(f"{nome}: método desconhecido")
            continue
        try:
            resultado = funcao(perfil)
            if not isinstance(resultado.get("seguidores"), int):
                raise RuntimeError("resposta sem número de seguidores")
            dados, metodo_ok = resultado, nome
            break
        except Exception as e:  # segue para o próximo método
            primeira_linha = (str(e).strip().splitlines() or [type(e).__name__])[0]
            falhas.append(f"{nome}: {primeira_linha}")

    for f in falhas:
        log(f"aviso @{perfil} {f}")

    if not dados:
        log(f"ERRO @{perfil}: nenhum método conseguiu coletar; nada foi gravado")
        return 1

    linha = montar_linha(perfil, dados)
    resumo = " ".join(f"{k}={v}" for k, v in linha.items() if k != "perfil")
    amostra = len(dados.get("ultimos_posts") or [])
    log(f"@{perfil} via {metodo_ok} ({amostra} posts na amostra): {resumo}")

    if os.environ.get("INSTAGRAM_SEM_GRAVAR") == "1":
        log("INSTAGRAM_SEM_GRAVAR=1, nada gravado")
        return 0
    try:
        gravar(linha)
    except Exception as e:
        log(f"ERRO ao gravar no Supabase: {e}")
        return 2
    log("gravado em studio_sm.instagram")
    return 0


if __name__ == "__main__":
    sys.exit(main())
