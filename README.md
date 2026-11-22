# tiny-stack-vm

A faithful interpreter of make.fun's tiny stack ISA v1 (`main.ts`, Node 22).

It runs every program of a set and writes each answer as
`stdout.bin` + `exit.txt`. Every trap code, step/output limit and
32-bit wrapping rule follows the ISA; programs are pre-decoded once,
then run in a switch dispatch loop.

Practice set: 1.000.000/1.000.000 (house baseline plain-vm 1.0.0: 670.000).

MIT — see LICENSE.
