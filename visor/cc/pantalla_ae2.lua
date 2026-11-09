-- Gran pantalla del Centro AE2 · CC: Tweaked + Advanced Peripherals (Minecraft 1.21.1)
-- Necesita, tocando el ordenador: un ME Bridge, el muro de Advanced Monitors y (para el almacen) un Wireless Modem.
--
-- Modo "almacen": % de objetos, fluidos y energia; % de cada sector de discos; top de objetos.
--                 Envia el % de cada sector por rednet a las pantallas de los racks (sector_ae2.lua).
-- Modo "fabricacion": cada CPU de crafteo (libre o que fabrica, cuanto y su progreso), lo que mas sube y lo que mas
--                     baja en el ultimo minuto (produccion y consumo por minuto) y la energia.
--
-- Instalacion: arrastra este archivo a la ventana del ordenador, guardalo como startup.lua y escribe:
--   set ae2.modo almacen              (o: set ae2.modo fabricacion)
--   set ae2.centro 1234,64,-567       (solo en el del almacen: X,Y,Z del ascensor central, con F3)
-- Despues reinicia el ordenador (Ctrl+R mantenido).
-- Los textos de la pantalla van sin tildes: la fuente de CC no las dibuja bien.

local MODO = settings.get("ae2.modo", "almacen")
local REFRESCO = 2                -- segundos entre lecturas
local PROTOCOLO = "ae2_sectores"
local SECTORES = { "L1 NO", "L1 NE", "L1 SO", "L1 SE", "L2 NO", "L2 NE", "L2 SO", "L2 SE" }

local bridge = peripheral.find("me_bridge") or error("No encuentro el ME Bridge: tiene que tocar el ordenador", 0)
local mon = peripheral.find("monitor") or error("No encuentro el monitor", 0)
local modem = peripheral.find("modem", function(_, m) return m.isWireless() end)
if modem then rednet.open(peripheral.getName(modem)) end

mon.setTextScale(1)
local W, H = mon.getSize()
local win = window.create(mon, 1, 1, W, H, false)   -- se dibuja aqui y se vuelca de golpe: sin parpadeo

-- llamada al ME Bridge que no rompe el programa si la red se reinicia o la funcion no existe en tu version
local function call(name, ...)
  local f = bridge[name]
  if not f then return nil end
  local ok, v = pcall(f, ...)
  if ok then return v end
  return nil
end

local function corto(n)
  n = tonumber(n) or 0
  if n >= 1e12 then return string.format("%.1fT", n / 1e12) end
  if n >= 1e9 then return string.format("%.1fG", n / 1e9) end
  if n >= 1e6 then return string.format("%.1fM", n / 1e6) end
  if n >= 1e4 then return string.format("%.1fk", n / 1e3) end
  return tostring(math.floor(n))
end
local function pct(u, t) if not t or t <= 0 then return 0 end return math.max(0, math.min(1, (u or 0) / t)) end
local function colorDe(p) if p >= 0.9 then return colors.red elseif p >= 0.75 then return colors.orange end return colors.lime end

local function texto(x, y, s, fg, bg)
  win.setCursorPos(x, y)
  win.setTextColor(fg or colors.white)
  win.setBackgroundColor(bg or colors.black)
  win.write(s)
end
local function barra(x, y, ancho, p, col)
  local lleno = math.floor(ancho * p + 0.5)
  win.setCursorPos(x, y)
  win.setBackgroundColor(col or colorDe(p)); win.write(string.rep(" ", lleno))
  win.setBackgroundColor(colors.gray); win.write(string.rep(" ", ancho - lleno))
  win.setBackgroundColor(colors.black)
end
local function cabecera(titulo)
  win.setBackgroundColor(colors.black); win.clear()
  win.setCursorPos(1, 1); win.setBackgroundColor(colors.blue); win.clearLine()
  texto(2, 1, titulo, colors.white, colors.blue)
  local hora = textutils.formatTime(os.time(), true)
  texto(W - #hora, 1, hora, colors.lightBlue, colors.blue)
end
local function seccion(y, s) texto(2, y, s, colors.yellow) end
local function recorta(s, n) s = tostring(s or "?"); if #s > n then return s:sub(1, n - 1) .. "." end return s end

-- sector de cada ME Drive por su posicion respecto al ascensor central: L1 o L2, y cuadrante (N = -Z, O = -X)
local function centro()
  local s = settings.get("ae2.centro")
  local x, y, z = tostring(s or ""):match("(-?%d+)%s*,%s*(-?%d+)%s*,%s*(-?%d+)")
  if not x then return nil end
  return { x = tonumber(x), y = tonumber(y), z = tonumber(z) }
end
local function sectores(drives, c)
  local r = {}
  for _, k in ipairs(SECTORES) do r[k] = { usados = 0, total = 0, drives = 0 } end
  if not c then return r end
  for _, d in ipairs(drives or {}) do
    local p = d.position
    if p and p.x then
      local k = ((p.y - c.y) < 12 and "L1" or "L2") .. " " .. ((p.z < c.z) and "N" or "S") .. ((p.x < c.x) and "O" or "E")
      local s = r[k]
      if s then s.usados = s.usados + (d.usedBytes or 0); s.total = s.total + (d.totalBytes or 0); s.drives = s.drives + 1 end
    end
  end
  return r
end

local function almacen()
  local c = centro()
  local sec = sectores(call("getDrives"), c)
  if modem then rednet.broadcast({ sectores = sec }, PROTOCOLO) end
  local items = call("getItems") or {}

  cabecera("CENTRO AE2  -  ALMACEN")
  local bw = W - 42
  local function fila(y, nombre, u, t, unidad)
    local p = pct(u, t)
    texto(2, y, nombre, colors.lightGray)
    barra(11, y, bw, p)
    texto(12 + bw, y, string.format("%5.1f%%  %s / %s %s", p * 100, corto(u), corto(t), unidad))
  end
  fila(3, "Objetos", call("getUsedItemStorage"), call("getTotalItemStorage"), "bytes")
  fila(4, "Fluidos", call("getUsedFluidStorage"), call("getTotalFluidStorage"), "bytes")
  fila(5, "Energia", call("getStoredEnergy"), call("getEnergyCapacity"), "AE")
  texto(12 + bw, 6, "uso " .. corto(call("getEnergyUsage")) .. " AE/t", colors.lightGray)

  seccion(8, c and "DISCOS POR SECTOR" or "DISCOS POR SECTOR  (falta: set ae2.centro X,Y,Z)")
  local cw = math.floor((W - 3) / 2)
  for i, k in ipairs(SECTORES) do
    local s, col, fil = sec[k], (i - 1) % 2, math.floor((i - 1) / 2)
    local x, y, p = 2 + col * (cw + 1), 9 + fil, pct(sec[k].usados, sec[k].total)
    texto(x, y, k, colors.lightGray)
    barra(x + 6, y, cw - 22, p)
    texto(x + cw - 15, y, s.total > 0 and string.format("%5.1f%%  %2d dr", p * 100, s.drives) or "   sin drives")
  end

  table.sort(items, function(a, b) return (a.count or a.amount or 0) > (b.count or b.amount or 0) end)
  seccion(14, "TOP OBJETOS  (" .. #items .. " tipos)")
  local filas, colw = H - 15, math.floor((W - 3) / 2)
  for i = 1, math.min(#items, filas * 2) do
    local it, col = items[i], math.floor((i - 1) / filas)
    local x, y = 2 + col * (colw + 1), 15 + (i - 1) % filas
    local n = corto(it.count or it.amount)
    texto(x, y, string.format("%2d ", i), colors.gray)
    texto(x + 3, y, recorta(it.displayName or it.name, colw - 4 - #n), colors.white)
    texto(x + colw - #n, y, n, colors.lime)
  end
end

-- produccion y consumo por minuto: compara las cantidades con una foto de hace 1 minuto
local foto, fotoT, ritmo = nil, 0, {}
local function produccion()
  local ahora, actual = os.epoch("utc") / 1000, {}
  for _, it in ipairs(call("getItems") or {}) do
    actual[it.name or "?"] = { n = it.count or it.amount or 0, d = it.displayName or it.name or "?" }
  end
  if not foto then foto, fotoT = actual, ahora; return end
  if ahora - fotoT < 60 then return end
  local m = (ahora - fotoT) / 60
  ritmo = {}
  for k, v in pairs(actual) do
    local r = (v.n - (foto[k] and foto[k].n or 0)) / m
    if r ~= 0 then ritmo[#ritmo + 1] = { d = v.d, r = r } end
  end
  for k, v in pairs(foto) do if not actual[k] then ritmo[#ritmo + 1] = { d = v.d, r = -v.n / m } end end
  table.sort(ritmo, function(a, b) return a.r > b.r end)
  foto, fotoT = actual, ahora
end

local function fabricacion()
  produccion()
  local cpus = call("getCraftingCPUs") or {}
  local fabricables = call("getCraftableItems") or {}
  cabecera("CENTRO AE2  -  FABRICACION")
  local ocupadas = 0
  for _, cpu in ipairs(cpus) do if cpu.isBusy then ocupadas = ocupadas + 1 end end
  texto(2, 3, string.format("CPUs: %d    ocupadas: %d    objetos con patron: %d", #cpus, ocupadas, #fabricables))
  seccion(5, "CPU             MEMORIA    ESTADO")
  local y = 6
  for i, cpu in ipairs(cpus) do
    if i > 10 then break end
    local nombre = (cpu.name and cpu.name ~= "Unnamed") and cpu.name or ("CPU " .. i)
    texto(2, y, recorta(nombre, 15), colors.lightGray)
    texto(18, y, corto(cpu.storage) .. " x" .. (cpu.coProcessors or 0), colors.gray)
    local job = cpu.craftingJob
    if cpu.isBusy and type(job) == "table" then
      local r = type(job.resource) == "table" and job.resource or {}
      local p = tonumber(job.completion) or 0
      if p > 1 then p = p / 100 end
      texto(29, y, recorta((r.displayName or r.name or "?") .. " x" .. corto(job.quantity or r.count or 0), W - 29 - 18))
      barra(W - 16, y, 10, math.max(0, math.min(1, p)), colors.lightBlue)
      texto(W - 5, y, string.format("%3d%%", math.floor(p * 100 + 0.5)))
    elseif cpu.isBusy then
      texto(29, y, "fabricando", colors.orange)
    else
      texto(29, y, "libre", colors.lime)
    end
    y = y + 1
  end
  -- lo que mas sube (se esta fabricando o entrando) y lo que mas baja (se esta gastando) en el ultimo minuto
  local y0, colw = y + 1, math.floor((W - 3) / 2)
  seccion(y0, "PRODUCCION / min"); texto(3 + colw, y0, "CONSUMO / min", colors.yellow)
  local filas = H - 4 - y0
  if #ritmo == 0 then texto(2, y0 + 1, "midiendo... (1 minuto)", colors.gray) end
  for i = 1, filas do
    local sube, baja = ritmo[i], ritmo[#ritmo + 1 - i]
    if sube and sube.r > 0 then
      local n = "+" .. corto(sube.r)
      texto(2, y0 + i, recorta(sube.d, colw - 2 - #n), colors.white); texto(1 + colw - #n, y0 + i, n, colors.lime)
    end
    if baja and baja.r < 0 then
      local n = "-" .. corto(-baja.r)
      texto(3 + colw, y0 + i, recorta(baja.d, colw - 2 - #n), colors.white); texto(2 + 2 * colw - #n, y0 + i, n, colors.red)
    end
  end

  local e, ec = call("getStoredEnergy"), call("getEnergyCapacity")
  seccion(H - 2, "ENERGIA")
  barra(11, H - 2, W - 48, pct(e, ec))
  texto(W - 36, H - 2, string.format("%s / %s AE  uso %s AE/t", corto(e), corto(ec), corto(call("getEnergyUsage"))))
end

local dibuja = MODO == "fabricacion" and fabricacion or almacen
while true do
  local ok, err = pcall(dibuja)
  if not ok then cabecera("CENTRO AE2"); texto(2, 3, "Error: " .. tostring(err), colors.red) end
  win.setVisible(true); win.setVisible(false)
  sleep(REFRESCO)
end
