// Editor: el simulador del diseño con los agentes al lado (solo el dueño lo edita).
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api.js';
import { AppShell, Loading, ErrorNote } from '../ui.jsx';
import Simulator from '../sim/Simulator.jsx';

export default function Editor() {
  const { id } = useParams();
  const [d, setD] = useState(null), [err, setErr] = useState(null);
  const load = () => api(`/designs/${id}`).then(setD).catch(e => setErr(e.message));
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (err) return <AppShell><ErrorNote error={err} /></AppShell>;
  if (!d) return <Loading />;
  // solo se fusionan los campos cambiados: así el 3D no se vuelve a montar al renombrar o cambiar la visibilidad
  const patch = async body => { await api(`/designs/${d.id}`, { method: 'PUT', body }); setD(x => ({ ...x, ...body })); };
  return <Simulator design={d} mine={d.mine} onPatch={patch} onReload={load} backTo="/app" />;
}
