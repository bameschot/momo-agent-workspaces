#!/usr/bin/env python3
"""Serve this workspace locally to test index.html and the apps in it.

Standard library only. Serves the folder this script is in (wherever you run
it from), with caching turned off so an edited page shows on a normal reload.

    python3 serve.py                 # http://localhost:8000
    python3 serve.py --port 9000
    python3 serve.py --open          # also open the index in your browser
    python3 serve.py --lan           # reachable from other devices (see below)

localhost counts as a secure context, so WebGPU, WebCodecs, service workers and
the file-save dialog work there. Over --lan (plain http to this machine's IP)
browsers turn those features off.
"""

import argparse
import errno
import functools
import http.server
import socket
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.js': 'text/javascript',
        '.mjs': 'text/javascript',
        '.json': 'application/json',
        '.webmanifest': 'application/manifest+json',
        '.wasm': 'application/wasm',
        '.svg': 'image/svg+xml',
        '.param': 'text/plain',              # AI model files (lumity-gallery/models)
        '.bin': 'application/octet-stream',
    }

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, fmt, *args):
        print('  ' + fmt % args)


def apps():
    """Folders that hold an .html page, with the page to open."""
    for d in sorted(p for p in ROOT.iterdir() if p.is_dir() and not p.name.startswith('.')):
        pages = sorted(d.glob('*.html'))
        if pages:
            index = d / 'index.html'
            yield d.name, (index if index in pages else pages[0]).relative_to(ROOT).as_posix()


def lan_ip():
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
        try:
            s.connect(('192.0.2.1', 9))      # no traffic is sent; just picks the outgoing interface
            return s.getsockname()[0]
        except OSError:
            return '127.0.0.1'


def main():
    ap = argparse.ArgumentParser(description='Serve this workspace locally.')
    ap.add_argument('--port', type=int, default=8000, help='first port to try (default 8000; the next free one is used if taken)')
    ap.add_argument('--lan', action='store_true', help='listen on all interfaces, not just this machine')
    ap.add_argument('--open', action='store_true', help='open the index in the default browser')
    args = ap.parse_args()

    host = '0.0.0.0' if args.lan else '127.0.0.1'
    handler = functools.partial(Handler, directory=str(ROOT))
    for port in range(args.port, args.port + 20):
        try:
            server = http.server.ThreadingHTTPServer((host, port), handler)
            break
        except OSError as e:
            if e.errno != errno.EADDRINUSE:
                raise
    else:
        raise SystemExit(f'No free port between {args.port} and {args.port + 19}.')

    base = f'http://localhost:{port}/'
    print(f'Serving {ROOT}')
    print(f'  Index: {base}')
    for name, page in apps():
        print(f'  {name + ":":22} {base}{page}')
    if args.lan:
        print(f'  From other devices: http://{lan_ip()}:{port}/ (no WebGPU, WebCodecs or service workers over plain http)')
    print('Ctrl+C to stop.\n')
    if args.open:
        webbrowser.open(base)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nStopped.')
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
