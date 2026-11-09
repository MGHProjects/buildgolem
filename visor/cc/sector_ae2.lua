-- Pantalla de un sector de discos del Centro AE2 · CC: Tweaked (Minecraft 1.21.1)
-- Necesita, tocando el ordenador: el monitor de 1 x 2 y un Wireless Modem. No lleva ME Bridge: recibe los datos por
-- rednet de la gran pantalla del almacen (pantalla_ae2.lua en modo almacen).
--
-- Instalacion: arrastra este archivo a la ventana del ordenador, guardalo como startup.lua y escribe:
--   set ae2.sector "L1 NO"      (L1 o L2, y NO, NE, SO o SE: el que pone en el visor)
-- Despues reinicia el ordenador (Ctrl+R mantenido).

local SECTOR = settings.get("ae2.sector", "L1 NO")
local PROTOCOLO = "ae2_sectores"

local mon = peripheral.find("monitor") or error("No encuentro el monitor", 0)
local modem = peripheral.find("modem", function(_, m) return m.isWireless() end) or error("Falta el Wireless Modem", 0)
rednet.open(peripheral.getName(modem))
mon.setTextScale(0.5)
local W, H = mon.getSize()
local win = window.create(mon, 1, 1, W, H, false)

local function corto(n)
  n = tonumber(n) or 0
  if n >= 1e12 then return string.format("%.1fT", n / 1e12) end
  if n >= 1e9 then return string.format("%.1fG", n / 1e9) end
  if n >= 1e6 then return string.format("%.1fM", n / 1e6) end
  if n >= 1e4 then return string.format("%.1fk", n / 1e3) end
  return tostring(math.floor(n))
end
local function centrado(y, s, fg, bg)
  win.setCursorPos(math.max(1, math.floor((W - #s) / 2) + 1), y)
  win.setTextColor(fg or colors.white); win.setBackgroundColor(bg or colors.black); win.write(s)
end

local function dibuja(s)
  win.setBackgroundColor(colors.black); win.clear()
  win.setCursorPos(1, 1); win.setBackgroundColor(colors.blue); win.clearLine()
  centrado(1, SECTOR, colors.white, colors.blue)
  if not s or (s.total or 0) <= 0 then
    centrado(math.floor(H / 2), "SIN DATOS", colors.orange)
    centrado(math.floor(H / 2) + 2, "almacen?", colors.gray)
    return
  end
  local p = math.max(0, math.min(1, s.usados / s.total))
  local col = p >= 0.9 and colors.red or p >= 0.75 and colors.orange or colors.lime
  centrado(3, string.format("%.1f%%", p * 100), col)
  -- barra vertical que se llena desde abajo
  local alto, ancho = H - 10, 7
  local x0, y0 = math.floor((W - ancho) / 2) + 1, 5
  local lleno = math.floor(alto * p + 0.5)
  for i = 0, alto - 1 do
    win.setCursorPos(x0, y0 + i)
    win.setBackgroundColor(i >= alto - lleno and col or colors.gray)
    win.write(string.rep(" ", ancho))
  end
  centrado(H - 3, corto(s.usados) .. "/" .. corto(s.total), colors.white)
  centrado(H - 2, s.drives .. " drives", colors.lightGray)
  centrado(H, textutils.formatTime(os.time(), true), colors.gray)
end

while true do
  local _, msg = rednet.receive(PROTOCOLO, 10)
  dibuja(type(msg) == "table" and msg.sectores and msg.sectores[SECTOR] or nil)
  win.setVisible(true); win.setVisible(false)
end
