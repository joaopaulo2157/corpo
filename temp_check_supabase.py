#!/usr/bin/env python3
"""Teste de leitura do Data API sem credenciais fixadas no repositório."""

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request


def main() -> int:
    base_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    publishable_key = os.environ.get("SUPABASE_PUBLISHABLE_KEY", "")
    if not base_url or not publishable_key:
        print("Defina SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY antes do teste.", file=sys.stderr)
        return 2

    query = urllib.parse.urlencode({"select": "id,nome,ordem", "order": "ordem.asc", "limit": "5"})
    request = urllib.request.Request(
        f"{base_url}/rest/v1/parceiros?{query}",
        headers={"apikey": publishable_key, "Accept": "application/json"},
    )

    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            payload = json.load(response)
            print(json.dumps({"status": response.status, "rows": len(payload)}, ensure_ascii=False))
            return 0
    except urllib.error.HTTPError as error:
        print(f"HTTP {error.code}: {error.read().decode('utf-8', errors='replace')}", file=sys.stderr)
    except (urllib.error.URLError, TimeoutError) as error:
        print(f"Falha de conexão: {error}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
