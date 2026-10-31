/**
 * 本地试跑（不装进 DSH 也能看效果）：
 *   node tools/standalone.mjs [port]
 * 然后用浏览器打开 http://127.0.0.1:4199/memory-galaxy/
 *
 * 它用一个假的 ctx 模拟 DSH 注入的 webServer，路由逻辑与插件完全一致。
 */
import http from 'node:http';
import { apply } from '../lib/index.js';

const port = Number(process.argv[2] || 4199);
const routes = [];

const ctx = {
  inject: (names, cb) => {
    const webServer = {
      register: (route) => {
        routes.push(route);
        return () => {};
      },
    };
    cb({ webServer });
  },
  logger: console,
  on: () => {},
};

apply(ctx, {});

const server = http.createServer((req, res) => {
  const hit = routes.find((r) => req.url.startsWith(r.path));
  if (hit) return hit.handler(req, res);
  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('not found (routes: ' + routes.map((r) => r.path).join(', ') + ')');
});

server.listen(port, '127.0.0.1', () => {
  console.log(`standalone -> http://127.0.0.1:${port}/memory-galaxy/`);
});
