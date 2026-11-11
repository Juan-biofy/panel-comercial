#!/usr/bin/env python3
"""
Lee el Excel GLOBAL del mes (p. ej. «10. GLOBAL OCTUBRE.xlsm») y saca, por comercial,
las cifras de venta del Informe Comercial. No escribe nombres ni DNI de clientes.

Uso:
    python3 global_ventas.py GLOBAL.xlsm salida.json [--hasta 23] [--csv salida.csv]

  --hasta N   solo cuenta ventas con «día de producción» <= N (los retrocesos, que no
              llevan día, se cuentan siempre).
  --csv       además guarda una tabla CSV por comercial.

Requiere: pip install openpyxl

Reglas (las mismas del Informe Comercial de octubre):
  * Hojas: todas las que terminan en «-BIO» (una por comercial) + «OFERTA RECU».
    Nunca las hojas «… C» (BIO C, CT C) ni «EN BLANCO-BIO».
  * Hoja -BIO: comercial en C1. Filas de venta: 1ª quincena 4–28, 2ª quincena 44–68.
    Columnas: B día producción · C producción · E DNI · M confirmada · O CONF/NUL ·
    P estado · V origen · W importe.
  * OFERTA RECU: 1ª quincena filas 4–38, 2ª quincena 49–83. Columnas: B día · E DNI ·
    I comercial · J oferta (producción) · K confirmada · M CONF/NUL · N estado · T origen.
    Cada fila se suma al comercial de la columna I.
  * producida   = filas con producción > 0
  * confirmadas = filas CONFIRMADO;  nulas = filas NULO;  retrocesos = filas RETROCESO
  * por confirmar = filas producidas sin CONF/NUL
  * neta    = suma de «confirmada» en filas CONFIRMADO + RETROCESO, con cada retroceso = −1
              (es la fórmula del propio GLOBAL, corrigiendo retrocesos escritos con +1)
  * abonada = suma de «confirmada» en filas con estado ABONADO, retrocesos = −1
  * Todo se cuenta tal cual está en el Excel. Las filas que parecen duplicadas solo se
    avisan en «avisos»; no se descuentan.
"""
import argparse, csv, json, re, sys, unicodedata
from collections import defaultdict

try:
    import openpyxl
except ImportError:
    sys.exit("Falta openpyxl: pip install openpyxl")

BIO_ROWS = [(4, 28, "1ª quincena"), (44, 68, "2ª quincena")]
RECU_ROWS = [(4, 38, "1ª quincena"), (49, 83, "2ª quincena")]
# índices de columna (A=0)
B, C, E, I, J, K, M, N, O, P, T, V, W = 1, 2, 4, 8, 9, 10, 12, 13, 14, 15, 19, 21, 22


def norm(s):
    s = unicodedata.normalize("NFD", str(s or "")).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", s).strip().upper()


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def new_rep():
    return {"producida": 0, "confirmadas": 0, "nulas": 0, "retrocesos": 0,
            "por_confirmar": 0, "neta": 0, "abonada": 0,
            "origen": defaultdict(int), "hojas": set()}


def add_row(rep, prod, conf, estado_cn, estado_pago, origen):
    estado_cn, estado_pago = norm(estado_cn), norm(estado_pago)
    retro = estado_cn == "RETROCESO"
    m = -1 if retro else (num(conf) or 0)   # un retroceso siempre resta 1
    if not retro and (num(prod) or 0) > 0:
        rep["producida"] += 1
        if origen:
            rep["origen"][norm(origen)] += 1
        if estado_cn == "":
            rep["por_confirmar"] += 1
    if estado_cn == "CONFIRMADO":
        rep["confirmadas"] += 1
        rep["neta"] += m
    elif estado_cn == "NULO":
        rep["nulas"] += 1
    elif retro:
        rep["retrocesos"] += 1
        rep["neta"] += m
    if estado_pago == "ABONADO":
        rep["abonada"] += m


def leer(path, hasta=None):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    reps, avisos, vistos, otros = {}, [], defaultdict(list), defaultdict(int)

    def dentro(dia):
        d = num(dia)
        return hasta is None or d is None or d <= hasta

    bio = [s for s in wb.sheetnames
           if s.upper().endswith("-BIO") and not s.upper().startswith("EN BLANCO")]
    for sh in bio:
        ws = wb[sh]
        rows = list(ws.iter_rows(min_row=1, max_row=70, max_col=31, values_only=True))
        nombre = norm(rows[0][2]) if rows and len(rows[0]) > 2 else ""
        if not nombre:
            continue
        rep = reps.setdefault(nombre, new_rep())
        rep["hojas"].add(sh)
        for a, b, q in BIO_ROWS:
            for r in range(a, b + 1):
                row = rows[r - 1] if r - 1 < len(rows) else None
                if not row or (row[C] in (None, "") and row[O] in (None, "")):
                    continue
                if norm(row[O]) != "RETROCESO" and not dentro(row[B]):
                    continue
                add_row(rep, row[C], row[M], row[O], row[P], row[V])
                if norm(row[O]) == "RETROCESO" and (num(row[M]) or 0) > 0:
                    avisos.append(f"{sh} fila {r}: retroceso escrito con +1 (se cuenta como −1)")
                clave = (norm(row[E]), row[B], row[W], norm(row[O]))
                if clave[0]:
                    vistos[clave].append(f"{sh} fila {r}")

    if "OFERTA RECU" in wb.sheetnames:
        ws = wb["OFERTA RECU"]
        rows = list(ws.iter_rows(min_row=1, max_row=90, max_col=22, values_only=True))
        for a, b, q in RECU_ROWS:
            for r in range(a, b + 1):
                row = rows[r - 1] if r - 1 < len(rows) else None
                if not row or not norm(row[I]) or norm(row[I]) in ("-", "TOTAL"):
                    continue
                if norm(row[M]) != "RETROCESO" and not dentro(row[B]):
                    continue
                quien = norm(row[I])
                nombre = next((n for n in reps if n == quien or n.startswith(quien) or quien.startswith(n)), None)
                if not nombre:
                    otros[quien] += 1
                    continue
                add_row(reps[nombre], row[J], row[K], row[M], row[N], row[T])
                reps[nombre]["hojas"].add("OFERTA RECU")
                clave = (norm(row[E]), None, None, norm(row[M]))
                if clave[0] and norm(row[M]) == "RETROCESO":
                    vistos[("RETRO", clave[0])].append(f"OFERTA RECU fila {r}")

    # posibles duplicados (mismo cliente, mismo día, mismo importe y estado)
    for clave, donde in vistos.items():
        if len(donde) > 1:
            avisos.append("Posible fila duplicada: " + " y ".join(donde))
    # retroceso de un mismo cliente en la hoja -BIO y en RECU
    retro_bio = defaultdict(list)
    for clave, donde in vistos.items():
        if clave[0] != "RETRO" and clave[3] == "RETROCESO":
            retro_bio[clave[0]] += donde
    for clave, donde in vistos.items():
        if clave[0] == "RETRO" and clave[1] in retro_bio:
            avisos.append("Mismo retroceso en la hoja del comercial y en RECU: "
                          + " y ".join(retro_bio[clave[1]] + donde))

    salida = {}
    for n, x in sorted(reps.items()):
        if not any(x[k] for k in ("producida", "confirmadas", "nulas", "retrocesos", "abonada")):
            continue
        x["origen"] = dict(x["origen"])
        x["hojas"] = sorted(x["hojas"])
        salida[n] = x
    return {"fichero": path.split("/")[-1], "hasta_dia": hasta, "comerciales": salida,
            "recu_sin_comercial": dict(otros), "avisos": avisos}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("xlsm")
    ap.add_argument("salida")
    ap.add_argument("--hasta", type=int, help="último día de producción a contar")
    ap.add_argument("--csv", help="guardar también una tabla CSV")
    a = ap.parse_args()
    res = leer(a.xlsm, a.hasta)
    with open(a.salida, "w", encoding="utf-8") as f:
        json.dump(res, f, ensure_ascii=False, indent=1)
    cols = ["producida", "confirmadas", "nulas", "retrocesos", "por_confirmar", "neta", "abonada"]
    if a.csv:
        with open(a.csv, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["comercial"] + cols)
            for n, x in res["comerciales"].items():
                w.writerow([n] + [x[c] for c in cols])
    print(f"{'COMERCIAL':24}" + "".join(f"{c[:9]:>10}" for c in cols))
    for n, x in res["comerciales"].items():
        print(f"{n[:24]:24}" + "".join(f"{x[c]:>10g}" for c in cols))
    for av in res["avisos"]:
        print("AVISO:", av)


if __name__ == "__main__":
    main()
