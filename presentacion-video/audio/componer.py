"""Música original y épica para el video de presentación (sin licencias de terceros).

Se compone por código para que cada golpe caiga exactamente en los cortes de escena
de index.html. Determinista: semilla fija → el mismo WAV en cada ejecución.

Uso:  python audio/componer.py assets/audio/musica.wav
"""
import sys
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile

SR = 44100
DUR = 33.0
BPM = 120
BEAT = 60 / BPM            # 0.5 s
BAR = BEAT * 4             # 2 s
CORTES = [8.0, 11.0, 14.5, 20.5, 25.0]   # cambios de escena (golpes medianos)
INICIO, CLIMAX = 4.0, 28.0                # golpes grandes
rng = np.random.default_rng(20261007)

N = int(SR * (DUR + 0.5))
L = np.zeros(N)
R = np.zeros(N)


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, 'low', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, 'high', fs=SR, output='sos'), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], 'band', fs=SR, output='sos'), x)


def poner(x, t, gl=1.0, gr=None):
    gr = gl if gr is None else gr
    i = int(t * SR)
    if i >= N:
        return
    n = min(len(x), N - i)
    L[i:i + n] += x[:n] * gl
    R[i:i + n] += x[:n] * gr


def saw(f, n, fase=0.0):
    t = np.arange(n) / SR
    return 2 * ((f * t + fase) % 1.0) - 1


def supersaw(f, n, voces=5, detune=0.012):
    out = np.zeros(n)
    for k in range(voces):
        d = 1 + detune * (k - (voces - 1) / 2) / ((voces - 1) / 2)
        out += saw(f * d, n, rng.random())
    return out / voces


def env(n, a, r, sustain=True):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4))
    if sustain:
        tail = np.clip((n / SR - t) / max(r, 1e-4), 0, 1)
        e = e * tail
    else:
        e = e * np.exp(-t / r)
    return e


# ── Progresión: i – VI – III – VII (Rem – Sib – Fa – Do), un acorde por compás ──
ACORDES = {
    'Dm': [38, 50, 53, 57, 62],
    'Bb': [34, 46, 50, 53, 58],
    'F':  [41, 48, 53, 57, 60],
    'C':  [36, 48, 52, 55, 60],
    'D':  [38, 50, 54, 57, 62],   # final en mayor (picardía)
}
CICLO = ['Dm', 'Bb', 'F', 'C']


def acorde_en(t):
    if t < INICIO:
        return 'Dm'
    if t >= CLIMAX + BAR:
        return 'D'
    return CICLO[int((t - INICIO) // BAR) % 4]


# ── 1 · Colchón de cuerdas (pad) ──
def pad(t0, t1, nombre, vol):
    n = int((t1 - t0 + 0.8) * SR)
    sig_l = np.zeros(n)
    sig_r = np.zeros(n)
    for m in ACORDES[nombre]:
        sig_l += supersaw(hz(m), n, 5, 0.010)
        sig_r += supersaw(hz(m), n, 5, 0.014)
    e = env(n, 0.35, 0.8)
    corte = 900 if t0 < INICIO else 1800
    poner(lp(sig_l * e, corte) * vol, t0, 1, 0)
    poner(lp(sig_r * e, corte) * vol, t0, 0, 1)


t = 0.0
while t < DUR:
    paso = INICIO if t < INICIO else BAR
    fin = min(t + paso, DUR)
    vol = 0.05 if t < INICIO else (0.07 if t < 14.5 else 0.085)
    if t >= CLIMAX:
        vol = 0.11
    pad(t, fin, acorde_en(t), vol)
    t = fin

# ── 2 · Ostinato de cuerdas en corcheas (desde el primer golpe) ──
for i in range(int((CLIMAX - INICIO) / (BEAT / 2))):
    tt = INICIO + i * BEAT / 2
    raiz = ACORDES[acorde_en(tt)][1]
    patron = [0, 12, 7, 12, 0, 12, 7, 15 if acorde_en(tt) in ('Dm',) else 12]
    nota = raiz + patron[i % 8] + (12 if tt >= 14.5 else 0)
    n = int(0.22 * SR)
    x = supersaw(hz(nota), n, 3, 0.006) * env(n, 0.004, 0.09, sustain=False)
    x = lp(x, 3200 if tt >= 14.5 else 2200)
    acento = 1.0 if i % 4 == 0 else 0.7
    vol = (0.05 if tt < 14.5 else 0.065) * acento
    pan = 0.35 * np.sin(i * 0.9)
    poner(x * vol, tt, 1 - pan, 1 + pan)


# ── 3 · Percusión ──
def taiko(vol, f0=140, f1=48, dec=0.5):
    n = int(1.2 * SR)
    t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t / 0.035)
    tono = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / dec)
    golpe = lp(rng.standard_normal(n), 900) * np.exp(-t / 0.03) * 0.6
    return np.tanh((tono + golpe) * 1.6) * vol


def caja(vol):
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    ruido = bp(rng.standard_normal(n), 900, 6000) * np.exp(-t / 0.11)
    cuerpo = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.06)
    return (ruido * 0.8 + cuerpo * 0.5) * vol


def platillo(vol, dec=1.8):
    n = int((dec * 2.2) * SR)
    t = np.arange(n) / SR
    return hp(rng.standard_normal(n), 5000) * np.exp(-t / dec) * vol


for b in range(int((CLIMAX - INICIO) / BAR)):
    t0 = INICIO + b * BAR
    fuerte = t0 >= 14.5
    golpes = [0, 3, 4, 6] if not fuerte else [0, 2, 3, 4, 6, 7]
    for g in golpes:
        v = 0.55 if g == 0 else 0.38
        poner(taiko(v * (1.15 if fuerte else 1)), t0 + g * BEAT / 2, 1.0, 0.9)
    if fuerte:
        for g in (2, 6):
            poner(caja(0.22), t0 + g * BEAT / 2, 0.9, 1.0)
    # toms agudos de relleno al final de cada compás par
    if b % 2 == 1:
        for k in range(4):
            poner(taiko(0.22 + 0.05 * k, 220, 110, 0.18), t0 + 1.5 + k * BEAT / 4, 0.7 + 0.1 * k, 1.0 - 0.1 * k)

# Latido inicial (intro) y redoble de timbal que crece hacia el primer golpe
for k, tt in enumerate([0.0, 1.0, 2.0, 2.5, 3.0]):
    poner(taiko(0.35 + 0.08 * k, 90, 40, 0.7), tt)
for k in range(16):
    tt = 3.0 + k * (1.0 / 16)
    poner(taiko(0.08 + 0.025 * k, 120, 60, 0.15), tt, 0.9, 1.0)

# Redoble de construcción antes del clímax (26 → 28), acelerando
tt, paso, k = 26.0, 0.25, 0
while tt < CLIMAX - 0.02:
    poner(taiko(0.2 + 0.03 * k, 180, 70, 0.2), tt, 1.0, 0.95)
    poner(caja(0.06 + 0.012 * k), tt, 0.95, 1.0)
    tt += paso
    paso = max(0.0625, paso * 0.86)
    k += 1


# ── 4 · Golpes cinematográficos, braams, subidas y barridos ──
def boom(vol, dec=2.2):
    n = int((dec * 2) * SR)
    t = np.arange(n) / SR
    f = 26 + 70 * np.exp(-t / 0.08)
    return np.tanh(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / dec) * 2.2) * vol


def braam(vol, dur=2.6, notas=(26, 38, 45, 50)):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = sum(supersaw(hz(m), n, 5, 0.008) for m in notas) / len(notas)
    x = np.tanh(x * 3.0)
    # filtro que se abre y se cierra (efecto «braam»), por bloques
    out = np.zeros(n)
    bloque = 2048
    for i in range(0, n, bloque):
        tc = t[i]
        fc = 180 + 2600 * np.exp(-((tc - 0.18) ** 2) / 0.08) + 600 * np.exp(-tc / 1.2)
        seg = x[max(0, i - 512):i + bloque]
        y = lp(seg, min(fc, 8000))
        out[i:i + bloque] = y[-len(out[i:i + bloque]):]
    return out * env(n, 0.03, 1.1) * vol


def subida(dur, vol):
    n = int(dur * SR)
    t = np.arange(n) / SR
    ruido = rng.standard_normal(n)
    out = np.zeros(n)
    bloque = 1024
    for i in range(0, n, bloque):
        fc = 300 + 7000 * (t[i] / dur) ** 2
        seg = ruido[max(0, i - 256):i + bloque]
        y = bp(seg, fc * 0.6, min(fc * 1.6, 18000))
        out[i:i + bloque] = y[-len(out[i:i + bloque]):]
    tono = np.sin(2 * np.pi * np.cumsum(200 + 900 * (t / dur) ** 2) / SR) * 0.15
    return (out + tono) * (t / dur) ** 2.2 * vol


def barrido(vol):
    # whoosh centrado en el corte (acompaña el barrido de luz del video)
    n = int(0.9 * SR)
    t = np.arange(n) / SR
    ruido = rng.standard_normal(n)
    out = np.zeros(n)
    for i in range(0, n, 1024):
        fc = 400 + 3800 * np.sin(np.pi * t[i] / 0.9)
        seg = ruido[max(0, i - 256):i + 1024]
        y = bp(seg, fc * 0.7, min(fc * 1.4, 16000))
        out[i:i + 1024] = y[-len(out[i:i + 1024]):]
    return out * np.sin(np.pi * t / 0.9) ** 2 * vol


# Primer golpe (4 s): subida + boom + braam + platillo
poner(subida(2.0, 0.22), INICIO - 2.0)
poner(boom(0.75), INICIO)
poner(braam(0.32), INICIO)
poner(platillo(0.10), INICIO, 0.8, 1.0)

# Cortes de escena: whoosh + golpe medio
for c in CORTES:
    poner(barrido(0.10), c - 0.45, 1.0, 0.7)
    poner(barrido(0.10), c - 0.40, 0.7, 1.0)
    poner(boom(0.42, 1.2), c)
    poner(platillo(0.05, 1.0), c, 1.0, 0.8)
poner(braam(0.18, 1.6, (26, 38, 45)), 14.5)   # entra la segunda parte, más fuerte

# Clímax (28 s): subida larga + gran golpe + braam + acorde final mayor
poner(subida(2.0, 0.28), CLIMAX - 2.0)
poner(boom(0.9, 2.8), CLIMAX)
poner(braam(0.40, 3.2), CLIMAX)
poner(platillo(0.14, 2.6), CLIMAX, 1.0, 0.85)
poner(platillo(0.14, 2.6), CLIMAX + 0.01, 0.85, 1.0)
# campanas/brillo en el cierre
for k, m in enumerate([74, 81, 86, 90]):
    n = int(2.5 * SR)
    tt = np.arange(n) / SR
    campana = (np.sin(2 * np.pi * hz(m) * tt) + 0.3 * np.sin(2 * np.pi * hz(m) * 2.76 * tt)) * np.exp(-tt / 0.9)
    poner(campana * 0.035, 28.6 + k * 0.25, 1 - 0.2 * (k - 1.5), 1 + 0.2 * (k - 1.5))

# ── 5 · Reverberación de sala, mezcla y masterización ──
def ir(seg, sem):
    r = np.random.default_rng(sem)
    n = int(seg * SR)
    t = np.arange(n) / SR
    x = r.standard_normal(n) * np.exp(-t / (seg / 6.0))
    return lp(x, 6000) / np.sqrt(np.sum(x ** 2))


wet_l = fftconvolve(L, ir(2.6, 1))[:N]
wet_r = fftconvolve(R, ir(2.6, 2))[:N]
L2 = L + wet_l * 0.9
R2 = R + wet_r * 0.9

# graves limpios y aire
L2 = hp(L2, 28)
R2 = hp(R2, 28)

mezcla = np.stack([L2, R2], axis=1)[: int(DUR * SR)]
mezcla /= np.max(np.abs(mezcla)) + 1e-9
mezcla = np.tanh(mezcla * 1.6) / np.tanh(1.6)          # limitador suave
# fundido de entrada corto y de salida al final del video
n = len(mezcla)
t = np.arange(n) / SR
fade = np.minimum(1, t / 0.05) * np.clip((DUR - t) / 1.6, 0, 1) ** 1.5
mezcla *= fade[:, None]
mezcla *= 10 ** (-1.0 / 20) / (np.max(np.abs(mezcla)) + 1e-9)

wavfile.write(sys.argv[1], SR, (mezcla * 32767).astype(np.int16))
print('ok', sys.argv[1], f'{n / SR:.2f}s')
