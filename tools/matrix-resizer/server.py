import http.server
import socketserver
import os
import sys
import json
import base64
import asyncio
from pathlib import Path

PORT = 8085
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

# Check if pypixelcolor is available
try:
    from pypixelcolor.commands.send_image import _build_send_plan, _process_loaded_bytes
    from pypixelcolor.client import AsyncClient
    import bleak
    PYPIXEL_AVAILABLE = True
except Exception as e:
    PYPIXEL_AVAILABLE = False
    pypixel_err = str(e)

class MatrixHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/status':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            data = {
                'status': 'online',
                'pypixelcolor': PYPIXEL_AVAILABLE,
                'target': '64x16',
                'ble_supported': True
            }
            self.wfile.write(json.dumps(data).encode())
            return
        elif self.path == '/api/ble/scan':
            # Scan for nearby BLE devices
            devices = self.scan_ble()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'devices': devices}).encode())
            return

        super().do_GET()

    def do_POST(self):
        if self.path == '/api/ipixel/send':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                payload = json.loads(body)
                address = payload.get('address')
                image_base64 = payload.get('image_base64') # Base64 GIF or PNG data
                file_ext = payload.get('extension', '.gif')
                save_slot = int(payload.get('save_slot', 0))

                if not address:
                    self.send_error(400, "Missing 'address' parameter")
                    return

                if not image_base64:
                    self.send_error(400, "Missing 'image_base64' parameter")
                    return

                # Decode base64
                if ',' in image_base64:
                    image_base64 = image_base64.split(',', 1)[1]
                raw_bytes = base64.b64decode(image_base64)

                result = self.send_to_ipixel(address, raw_bytes, file_ext, save_slot)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(result).encode())
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode())
            return
            
        super().do_POST()

    def scan_ble(self):
        try:
            async def _scan():
                scanner = bleak.BleakScanner()
                devices = await scanner.discover(timeout=4.0)
                found = []
                for d in devices:
                    name = d.name or "Unknown"
                    if "LED" in name or "PIXEL" in name or "ipixel" in name.lower() or d.name:
                        found.append({
                            'name': name,
                            'address': d.address,
                            'rssi': getattr(d, 'rssi', None)
                        })
                return found

            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            return loop.run_until_complete(_scan())
        except Exception as e:
            return [{'error': str(e)}]

    def send_to_ipixel(self, address: str, file_bytes: bytes, extension: str, save_slot: int = 0):
        if not PYPIXEL_AVAILABLE:
            return {'success': False, 'error': 'pypixelcolor library not loaded'}

        try:
            from pypixelcolor.commands.send_image import _process_loaded_bytes, _build_send_plan
            processed_bytes, is_gif = _process_loaded_bytes(file_bytes, extension)
            send_plan = _build_send_plan(processed_bytes, is_gif, save_slot=save_slot)

            async def _transmit():
                client = AsyncClient(address)
                await client.connect()
                try:
                    for i, window in enumerate(send_plan.windows):
                        await client._session._transport.send_frame(window.data, requires_ack=window.requires_ack)
                    return True
                finally:
                    await client.disconnect()

            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            success = loop.run_until_complete(_transmit())
            return {'success': success, 'frames_sent': len(send_plan.windows)}
        except Exception as e:
            return {'success': False, 'error': str(e)}

if __name__ == '__main__':
    # Allow address reuse
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), MatrixHandler) as httpd:
        print(f"Matrix Image & GIF Resizer Server running at http://localhost:{PORT}")
        print(f"iPIXEL BLE support: {'ENABLED' if PYPIXEL_AVAILABLE else 'DISABLED'}")
        sys.stdout.flush()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
