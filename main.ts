// Tiny stack VM: faithful interpreter of make.fun's tiny stack ISA v1.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function run(p, inp) {
  const n = p.length;
  const op = new Uint8Array(n);
  const im = new Int32Array(n);
  const md = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const b = p[i];
    let L = 0, P = 0, Q = 0, v = 0;
    if (b < 8) {
      if (b === 1) { L = 1; Q = 1; }
      else if (b === 2) { L = 4; Q = 1; }
      else if (b === 3) P = 1;
      else if (b === 4) { P = 1; Q = 2; }
      else if (b === 5) { P = 2; Q = 2; }
      else if (b === 6) { P = 2; Q = 3; }
      else if (b === 7) P = 3;
    } else if (b >= 0x10 && b <= 0x22 && b !== 0x1f) {
      if (b === 0x17 || b === 0x1b) { P = 1; Q = 1; } else { P = 2; Q = 1; }
    } else if (b >= 0x30 && b <= 0x34) {
      if (b < 0x34) { L = 2; if (b === 0x31 || b === 0x32) P = 1; }
    } else if (b === 0x40) { P = 1; Q = 1; }
    else if (b === 0x41) P = 2;
    else if (b >= 0x50 && b <= 0x53) {
      if (b === 0x52) Q = 1; else P = 1;
    } else { op[i] = 255; continue; }
    if (i + L >= n) { op[i] = 254; continue; }
    if (L === 1) v = (p[i + 1] << 24) >> 24;
    else if (L === 4) v = p[i + 1] | (p[i + 2] << 8) | (p[i + 3] << 16) | (p[i + 4] << 24);
    else if (L === 2) v = b === 0x33 ? p[i + 1] | (p[i + 2] << 8) : ((p[i + 1] | (p[i + 2] << 8)) << 16) >> 16;
    op[i] = b; im[i] = v; md[i] = (P << 5) | (Q << 3) | L;
  }
  const D = new Int32Array(256), C = new Int32Array(64), M = new Int32Array(256);
  const out = new Uint8Array(65536), sc = new Uint8Array(12);
  let pc = 0, sp = 0, csp = 0, ip = 0, olen = 0, s = 0;
  const done = (c) => ({ o: out.slice(0, olen), c });
  for (;;) {
    if (s === 1000000) return done(10);
    if (pc < 0 || pc >= n) return done(9);
    const o = op[pc];
    if (o === 255) return done(5);
    if (o === 254) return done(9);
    const m = md[pc], P = m >> 5, Q = (m >> 3) & 3, L = m & 7;
    s++;
    const q = pc, nx = q + 1 + L;
    if (sp < P) return done(2);
    if (sp - P + Q > 256) return done(3);
    pc = nx;
    if (o < 8) {
      if (o === 0) return done(0);
      if (o === 1 || o === 2) D[sp++] = im[q];
      else if (o === 3) sp--;
      else if (o === 4) { D[sp] = D[sp - 1]; sp++; }
      else if (o === 5) { const t = D[sp - 1]; D[sp - 1] = D[sp - 2]; D[sp - 2] = t; }
      else if (o === 6) { D[sp] = D[sp - 2]; sp++; }
      else { const a = D[sp - 3]; D[sp - 3] = D[sp - 2]; D[sp - 2] = D[sp - 1]; D[sp - 1] = a; }
    } else if (o >= 0x10 && o <= 0x22) {
      if (o === 0x17) D[sp - 1] = -D[sp - 1] | 0;
      else if (o === 0x1b) D[sp - 1] = ~D[sp - 1];
      else {
        const b = D[sp - 1], a = D[sp - 2];
        let r;
        if (o === 0x10) r = (a + b) | 0;
        else if (o === 0x11) r = (a - b) | 0;
        else if (o === 0x12) r = Math.imul(a, b);
        else if (o === 0x13) { if (b === 0) return done(4); r = (a / b) | 0; }
        else if (o === 0x14) { if (b === 0) return done(4); r = (a % b) | 0; }
        else if (o === 0x15) { if (b === 0) return done(4); r = Math.floor((a >>> 0) / (b >>> 0)) | 0; }
        else if (o === 0x16) { if (b === 0) return done(4); r = ((a >>> 0) % (b >>> 0)) | 0; }
        else if (o === 0x18) r = a & b;
        else if (o === 0x19) r = a | b;
        else if (o === 0x1a) r = a ^ b;
        else if (o === 0x1c) r = a << (b & 31);
        else if (o === 0x1d) r = a >> (b & 31);
        else if (o === 0x1e) r = (a >>> (b & 31)) | 0;
        else if (o === 0x20) r = a === b ? 1 : 0;
        else if (o === 0x21) r = a < b ? 1 : 0;
        else r = (a >>> 0) < (b >>> 0) ? 1 : 0;
        sp -= 2; D[sp++] = r;
      }
    } else if (o >= 0x30 && o <= 0x34) {
      if (o === 0x30) pc = nx + im[q];
      else if (o === 0x31) { if (D[--sp] === 0) pc = nx + im[q]; }
      else if (o === 0x32) { if (D[--sp] !== 0) pc = nx + im[q]; }
      else if (o === 0x33) { if (csp === 64) return done(7); C[csp++] = nx; pc = im[q]; }
      else { if (csp === 0) return done(8); pc = C[--csp]; }
    } else if (o === 0x40) {
      const a = D[sp - 1];
      if (a < 0 || a > 255) return done(6);
      D[sp - 1] = M[a];
    } else if (o === 0x41) {
      const a = D[sp - 1], v = D[sp - 2];
      if (a < 0 || a > 255) return done(6);
      sp -= 2; M[a] = v;
    } else if (o === 0x50) {
      const v = D[sp - 1];
      let e = 12;
      if (v === 0) sc[--e] = 48;
      else {
        const g = v < 0;
        let u = g ? -v : v;
        while (u > 0) { sc[--e] = 48 + (u % 10); u = (u / 10) | 0; }
        if (g) sc[--e] = 45;
      }
      const l = 12 - e;
      if (olen + l > 65536) return done(11);
      sp--; out.set(sc.subarray(e, 12), olen); olen += l;
    } else if (o === 0x51) {
      if (olen + 1 > 65536) return done(11);
      out[olen++] = D[--sp] & 255;
    } else if (o === 0x52) {
      D[sp++] = ip < inp.length ? inp[ip++] : -1;
    } else {
      return done(D[--sp] & 255);
    }
  }
}

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of readdirSync(I).sort()) {
  const r = run(readFileSync(join(I, id, 'program.bin')), readFileSync(join(I, id, 'input.bin')));
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'stdout.bin'), r.o);
  writeFileSync(join(O, id, 'exit.txt'), `${r.c}\n`);
}
