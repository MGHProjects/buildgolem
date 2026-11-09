"""Sirve el visor en http://localhost:8777 sin caché: cada cambio en los diseños o en app/ se ve con solo recargar.
Uso: python servir.py [puerto]
"""
import functools, http.server, pathlib, sys


class SinCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8777
handler = functools.partial(SinCache, directory=str(pathlib.Path(__file__).parent))
print(f"Visor en http://localhost:{port}  (Ctrl+C para parar)")
http.server.ThreadingHTTPServer(("", port), handler).serve_forever()
