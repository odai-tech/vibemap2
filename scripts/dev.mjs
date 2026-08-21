#!/usr/bin/env node
/**
 * Dev orchestrator: runs the API server and the Vite client together
 * with prefixed, colorized output. No dependencies.
 */
import { spawn } from 'node:child_process';

const procs = [];

function run(name, color, command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, FORCE_COLOR: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  procs.push(child);

  const prefix = `\x1b[${color}m[${name}]\x1b[0m `;
  const pipe = (stream, out) => {
    let buf = '';
    stream.on('data', (chunk) => {
      buf += chunk.toString();
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) out.write(prefix + line + '\n');
    });
  };
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);

  child.on('exit', (code) => {
    if (code !== null && code !== 0) {
      console.error(`${prefix}exited with code ${code}`);
      shutdown(code);
    }
  });
  return child;
}

function shutdown(code = 0) {
  for (const p of procs) {
    if (!p.killed) p.kill('SIGTERM');
  }
  setTimeout(() => process.exit(code), 200);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

run('api', '35', 'npm', ['run', 'dev', '--silent', '-w', 'server'], process.cwd());
run('web', '36', 'npm', ['run', 'dev', '--silent', '-w', 'client'], process.cwd());
