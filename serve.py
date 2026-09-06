#!/usr/bin/env python3
"""Локальный сервер для просмотра сайта. Запрещает кэширование,
чтобы правки в CSS/HTML были видны сразу после обычного обновления страницы.

Запуск:  python3 serve.py     →  http://localhost:8420
"""

import http.server
import socketserver
import os

PORT = 8420


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), NoCacheHandler) as httpd:
        print(f"Сайт открыт: http://localhost:{PORT}")
        httpd.serve_forever()
