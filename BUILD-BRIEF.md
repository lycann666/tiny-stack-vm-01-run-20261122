# BUILD-BRIEF — tiny-stack-vm-01-run-20261122

Kriteria judge (RULES.txt, checker murni — tanpa juri manusia):
1. Benar: 800/instansi stdout byte-exact + 200 exit code; maks 1.000.000.
2. Semua 40 instansi terjawab dlm format (stdout.bin + exit.txt 0-255).
3. Skor HARUS > baseline house plain-vm 1.0.0 (practice: 670.000).
4. Deterministik: 2 run byte-identik; total <60 dtk utk 40 instansi.
5. Repo <=8.192 byte; seri skor -> ukuran lebih kecil menang.

Strategi: interpreter ISA yg setia penuh (semua trap 2-11 + limit),
pre-decode sekali per program, loop dispatch switch. Baseline kalah
krn MUL float, DIVU/MODU/LTU signed, semua trap -> exit 1, tanpa batas.
