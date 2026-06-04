'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://qhkzmiceieeiwxxcxwua.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoa3ptaWNlaWVlaXd4eGN4d3VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NjU1MjUsImV4cCI6MjA5NjA0MTUyNX0.Z3rLYpHJ8R8EZYRpuFGQVd3kxKR_5u4CWf-3LeYcb0E'
)

const PRIORIDADES = ['Alta', 'Media', 'Baja']
const ESTADOS = ['Pendiente', 'En curso', 'Realizada', 'Bloqueada']
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

const ESTADO_COLORS = {
  'Pendiente': 'bg-yellow-100 text-yellow-800',
  'En curso':  'bg-blue-100 text-blue-800',
  'Realizada': 'bg-green-100 text-green-800',
  'Bloqueada': 'bg-red-100 text-red-800',
}
const PRIO_COLORS = {
  'Alta':  'bg-red-100 text-red-800',
  'Media': 'bg-yellow-100 text-yellow-800',
  'Baja':  'bg-green-100 text-green-800',
}

const emptyForm = {
  reunion: '', tarea: '', responsable: '', prioridad: 'Media',
  estado: 'Pendiente', fecha_venc: '', fecha_real: '', observaciones: '', area: '', extra: ''
}

const emptyReunionForm = {
  fecha: new Date().toISOString().split('T')[0],
  hora: '', tema: '', descripcion: '', participantes: '', lugar: ''
}

export default function Home() {
  const [tareas, setTareas] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchCol, setSearchCol] = useState('todas')
  const [filterEstados, setFilterEstados] = useState([])
  const [filterPrios, setFilterPrios] = useState([])
  const [ocultarRealizadas, setOcultarRealizadas] = useState(false)
  const [showEstadoMenu, setShowEstadoMenu] = useState(false)
  const [showPrioMenu, setShowPrioMenu] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showDetalle, setShowDetalle] = useState(false)
  const [showAvancesModal, setShowAvancesModal] = useState(false)
  const [showCalendario, setShowCalendario] = useState(false)
  const [showReunionModal, setShowReunionModal] = useState(false)
  const [showReunionDetalle, setShowReunionDetalle] = useState(false)
  const [editTarea, setEditTarea] = useState(null)
  const [tareaActual, setTareaActual] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('tareas')
  const [error, setError] = useState(null)
  const [avances, setAvances] = useState([])
  const [loadingAvances, setLoadingAvances] = useState(false)
  const [nuevoAvance, setNuevoAvance] = useState({ fecha: new Date().toISOString().split('T')[0], descripcion: '' })
  const [savingAvance, setSavingAvance] = useState(false)
  const [conteoAvances, setConteoAvances] = useState({})
  const [reuniones, setReuniones] = useState([])
  const [mesActual, setMesActual] = useState(new Date().getMonth())
  const [anioActual, setAnioActual] = useState(new Date().getFullYear())
  const [reunionForm, setReunionForm] = useState(emptyReunionForm)
  const [editReunion, setEditReunion] = useState(null)
  const [reunionSeleccionada, setReunionSeleccionada] = useState(null)
  const [diaSeleccionado, setDiaSeleccionado] = useState(null)
  const [savingReunion, setSavingReunion] = useState(false)

  const fetchTareas = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('tareas').select('*').order('id', { ascending: true })
    if (error) setError(error.message)
    else {
      setTareas(data || [])
      const { data: avData } = await supabase.from('avances').select('tarea_id')
      if (avData) {
        const conteo = avData.reduce((acc, a) => {
          acc[a.tarea_id] = (acc[a.tarea_id] || 0) + 1
          return acc
        }, {})
        setConteoAvances(conteo)
      }
    }
    setLoading(false)
  }, [])

  const fetchReuniones = useCallback(async () => {
    const { data } = await supabase.from('reuniones').select('*').order('fecha').order('hora')
    setReuniones(data || [])
  }, [])

  useEffect(() => { fetchTareas() }, [fetchTareas])
  useEffect(() => { if (showCalendario) fetchReuniones() }, [showCalendario, fetchReuniones])

  const fetchAvances = async (tareaId) => {
    setLoadingAvances(true)
    const { data } = await supabase.from('avances').select('*').eq('tarea_id', tareaId).order('fecha', { ascending: false })
    setAvances(data || [])
    setLoadingAvances(false)
  }

  const filtered = tareas.filter(t => {
    const q = search.toLowerCase()
    const matchSearch = !q || (
      searchCol === 'todas' ? (
        (t.reunion||'').toLowerCase().includes(q) ||
        (t.tarea||'').toLowerCase().includes(q) ||
        (t.responsable||'').toLowerCase().includes(q) ||
        (t.observaciones||'').toLowerCase().includes(q) ||
        (t.area||'').toLowerCase().includes(q)
      ) :
      searchCol === 'reunion' ? (t.reunion||'').toLowerCase().includes(q) :
      searchCol === 'tarea' ? (t.tarea||'').toLowerCase().includes(q) :
      searchCol === 'responsable' ? (t.responsable||'').toLowerCase().includes(q) :
      searchCol === 'area' ? (t.area||'').toLowerCase().includes(q) :
      (t[searchCol]||'').toLowerCase().includes(q)
    )
    const matchEstado = filterEstados.length === 0 || filterEstados.includes(t.estado)
    const matchPrio = filterPrios.length === 0 || filterPrios.includes(t.prioridad)
    const matchOcultar = !ocultarRealizadas || t.estado !== 'Realizada'
    return matchSearch && matchEstado && matchPrio && matchOcultar
  })

  const total = tareas.length
  const pendientes = tareas.filter(t => t.estado === 'Pendiente').length
  const enCurso = tareas.filter(t => t.estado === 'En curso').length
  const realizadas = tareas.filter(t => t.estado === 'Realizada').length
  const bloqueadas = tareas.filter(t => t.estado === 'Bloqueada').length
  const pct = total ? Math.round(realizadas / total * 100) : 0

  const porReunion = tareas.reduce((acc, t) => {
    if (!t.reunion) return acc
    if (!acc[t.reunion]) acc[t.reunion] = { total:0, pendiente:0, enCurso:0, realizada:0, bloqueada:0 }
    acc[t.reunion].total++
    if (t.estado === 'Pendiente') acc[t.reunion].pendiente++
    if (t.estado === 'En curso') acc[t.reunion].enCurso++
    if (t.estado === 'Realizada') acc[t.reunion].realizada++
    if (t.estado === 'Bloqueada') acc[t.reunion].bloqueada++
    return acc
  }, {})

  const porResponsable = tareas.reduce((acc, t) => {
    if (!t.responsable) return acc
    if (!acc[t.responsable]) acc[t.responsable] = { total:0, pendiente:0, enCurso:0, realizada:0, bloqueada:0 }
    acc[t.responsable].total++
    if (t.estado === 'Pendiente') acc[t.responsable].pendiente++
    if (t.estado === 'En curso') acc[t.responsable].enCurso++
    if (t.estado === 'Realizada') acc[t.responsable].realizada++
    if (t.estado === 'Bloqueada') acc[t.responsable].bloqueada++
    return acc
  }, {})

  const getDiasDelMes = () => {
    const primerDia = new Date(anioActual, mesActual, 1).getDay()
    const diasEnMes = new Date(anioActual, mesActual + 1, 0).getDate()
    return { primerDia, diasEnMes }
  }

  const getReunionesDelDia = (dia) => {
    const fechaStr = `${anioActual}-${String(mesActual+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`
    return reuniones.filter(r => r.fecha === fechaStr)
  }

  const openNew = () => { setForm(emptyForm); setEditTarea(null); setError(null); setShowModal(true) }

  const openDetalle = (t) => {
    setTareaActual(t)
    fetchAvances(t.id)
    setNuevoAvance({ fecha: new Date().toISOString().split('T')[0], descripcion: '' })
    setShowDetalle(true)
  }

  const openEdit = (t) => {
    setForm({...t, fecha_venc: t.fecha_venc||'', fecha_real: t.fecha_real||''})
    setEditTarea(t.id)
    setError(null)
    setShowDetalle(false)
    setShowModal(true)
  }

  const openAvances = (e, t) => {
    e.stopPropagation()
    setTareaActual(t)
    setNuevoAvance({ fecha: new Date().toISOString().split('T')[0], descripcion: '' })
    fetchAvances(t.id)
    setShowAvancesModal(true)
  }

  const openNuevaReunion = (dia = null) => {
    const fecha = dia
      ? `${anioActual}-${String(mesActual+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`
      : new Date().toISOString().split('T')[0]
    setReunionForm({...emptyReunionForm, fecha})
    setEditReunion(null)
    setShowReunionModal(true)
  }

  const openEditReunion = (r) => {
    setReunionForm({...r, hora: r.hora||'', descripcion: r.descripcion||'', participantes: r.participantes||'', lugar: r.lugar||''})
    setEditReunion(r.id)
    setShowReunionDetalle(false)
    setShowReunionModal(true)
  }

  const handleSave = async () => {
    setSaving(true); setError(null)
    try {
      const data = { ...form }
      if (!data.fecha_venc) delete data.fecha_venc
      if (!data.fecha_real) delete data.fecha_real
      if (data.estado === 'Realizada' && !data.fecha_real) data.fecha_real = new Date().toISOString().split('T')[0]
      delete data.id; delete data.created_at; delete data.updated_at
      const result = editTarea
        ? await supabase.from('tareas').update(data).eq('id', editTarea)
        : await supabase.from('tareas').insert([data])
      if (result.error) setError(result.error.message)
      else { setShowModal(false); fetchTareas() }
    } catch (e) { setError(e.message) }
    setSaving(false)
  }

  const handleSaveReunion = async () => {
    if (!reunionForm.tema.trim() || !reunionForm.fecha) return
    setSavingReunion(true)
    const data = { ...reunionForm }
    if (!data.hora) delete data.hora
    const result = editReunion
      ? await supabase.from('reuniones').update(data).eq('id', editReunion)
      : await supabase.from('reuniones').insert([data])
    if (!result.error) { setShowReunionModal(false); fetchReuniones() }
    setSavingReunion(false)
  }

  const handleDeleteReunion = async (id) => {
    if (!confirm('¿Eliminar esta reunión?')) return
    await supabase.from('reuniones').delete().eq('id', id)
    setShowReunionDetalle(false)
    fetchReuniones()
  }

  const handleSaveAvance = async () => {
    if (!nuevoAvance.descripcion.trim()) return
    setSavingAvance(true)
    const { error } = await supabase.from('avances').insert([{
      tarea_id: tareaActual.id, fecha: nuevoAvance.fecha, descripcion: nuevoAvance.descripcion.trim()
    }])
    if (!error) {
      setNuevoAvance({ fecha: new Date().toISOString().split('T')[0], descripcion: '' })
      fetchAvances(tareaActual.id)
      setConteoAvances(prev => ({...prev, [tareaActual.id]: (prev[tareaActual.id] || 0) + 1}))
    }
    setSavingAvance(false)
  }

  const handleDeleteAvance = async (id) => {
    if (!confirm('¿Eliminar este avance?')) return
    await supabase.from('avances').delete().eq('id', id)
    fetchAvances(tareaActual.id)
    setConteoAvances(prev => ({...prev, [tareaActual.id]: Math.max((prev[tareaActual.id] || 1) - 1, 0)}))
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta tarea?')) return
    await supabase.from('tareas').delete().eq('id', id)
    fetchTareas()
  }

  const handleEstadoChange = async (e, id, estado) => {
    e.stopPropagation()
    const upd = { estado }
    if (estado === 'Realizada') upd.fecha_real = new Date().toISOString().split('T')[0]
    else upd.fecha_real = null
    await supabase.from('tareas').update(upd).eq('id', id)
    fetchTareas()
  }

  const formatFecha = (f) => f ? new Date(f+'T00:00:00').toLocaleDateString('es-AR') : '—'
  const { primerDia, diasEnMes } = getDiasDelMes()
  const hoy = new Date()

  const proximasReuniones = reuniones
    .filter(r => r.fecha >= new Date().toISOString().split('T')[0])
    .slice(0, 5)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-700 text-white px-6 py-4 shadow" style={{position:'sticky',top:0,zIndex:40}}>
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">📋 Gestión de Tareas y Reuniones</h1>
            <p className="text-blue-200 text-sm">Sistema de seguimiento de oficina</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowCalendario(true)}
              className="bg-blue-600 border border-blue-400 text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-500 transition text-sm">
              📅 Calendario
            </button>
            <button onClick={openNew}
              className="bg-white text-blue-700 font-semibold px-4 py-2 rounded-lg hover:bg-blue-50 transition text-sm">
              + Nueva tarea
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border-b" style={{position:'sticky',top:'64px',zIndex:30}}>
        <div className="max-w-screen-xl mx-auto px-6 flex gap-1">
          {[['tareas','📋 Tareas'],['resumen','📊 Resumen']].map(([key,label]) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition ${activeTab===key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6">
        {activeTab === 'tareas' && (<>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-5">
            {[
              ['Total', total, 'bg-blue-50 text-blue-800'],
              ['Pendientes', pendientes, 'bg-yellow-50 text-yellow-800'],
              ['En curso', enCurso, 'bg-blue-50 text-blue-700'],
              ['Realizadas', realizadas, 'bg-green-50 text-green-800'],
              ['Bloqueadas', bloqueadas, 'bg-red-50 text-red-800'],
              [`${pct}% completado`, '', 'bg-indigo-50 text-indigo-800'],
            ].map(([label, val, cls], i) => (
              <div key={i} className={`rounded-xl p-3 text-center ${cls}`}>
                {i < 5 && <div className="text-2xl font-bold">{val}</div>}
                <div className="text-xs font-medium mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-4 mb-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex-1 min-w-48">
                <input type="text" placeholder="🔍 Buscar..." value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <select value={searchCol} onChange={e => setSearchCol(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-yellow-50">
                <option value="todas">Todas las columnas</option>
                <option value="reunion">Reunión</option>
                <option value="tarea">Tarea</option>
                <option value="responsable">Responsable</option>
                <option value="area">Área</option>
              </select>
              {/* Filtro estados multiselect */}
              <div className="relative">
                <button onClick={() => { setShowEstadoMenu(v => !v); setShowPrioMenu(false) }}
                  className={`border rounded-lg px-3 py-2 text-sm flex items-center gap-2 ${filterEstados.length > 0 ? 'border-blue-400 bg-blue-50 text-blue-700' : ''}`}>
                  Estado {filterEstados.length > 0 ? `(${filterEstados.length})` : ''} ▾
                </button>
                {showEstadoMenu && (
                  <div className="absolute top-10 left-0 bg-white border rounded-xl shadow-lg z-20 min-w-44 py-2">
                    {ESTADOS.map(e => (
                      <label key={e} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                        <input type="checkbox" checked={filterEstados.includes(e)}
                          onChange={() => setFilterEstados(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e])} />
                        {e}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {/* Filtro prioridad multiselect */}
              <div className="relative">
                <button onClick={() => { setShowPrioMenu(v => !v); setShowEstadoMenu(false) }}
                  className={`border rounded-lg px-3 py-2 text-sm flex items-center gap-2 ${filterPrios.length > 0 ? 'border-blue-400 bg-blue-50 text-blue-700' : ''}`}>
                  Prioridad {filterPrios.length > 0 ? `(${filterPrios.length})` : ''} ▾
                </button>
                {showPrioMenu && (
                  <div className="absolute top-10 left-0 bg-white border rounded-xl shadow-lg z-20 min-w-36 py-2">
                    {PRIORIDADES.map(p => (
                      <label key={p} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                        <input type="checkbox" checked={filterPrios.includes(p)}
                          onChange={() => setFilterPrios(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])} />
                        {p}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {/* Toggle ocultar realizadas */}
              <button onClick={() => setOcultarRealizadas(v => !v)}
                className={`border rounded-lg px-3 py-2 text-sm flex items-center gap-2 ${ocultarRealizadas ? 'border-green-400 bg-green-50 text-green-700' : 'text-gray-500'}`}>
                {ocultarRealizadas ? '👁 Mostrar realizadas' : '🙈 Ocultar realizadas'}
              </button>
              {(search || filterEstados.length > 0 || filterPrios.length > 0) && (
                <button onClick={() => { setSearch(''); setFilterEstados([]); setFilterPrios([]) }}
                  className="text-sm text-gray-500 hover:text-red-500 border rounded-lg px-3 py-2">✕ Limpiar</button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
            {loading ? (
              <div className="text-center py-16 text-gray-400">Cargando...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                {tareas.length === 0 ? 'No hay tareas. ¡Agregá la primera!' : 'No hay resultados.'}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-blue-700 text-white">
                  <tr>
                    {['#','Reunión','Tarea','Responsable','Prioridad','Estado','F.Venc','F.Real','Observaciones','Área','Avances',''].map((h,i) => (
                      <th key={i} className="px-3 py-3 text-left font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t, idx) => (
                    <tr key={t.id} onClick={() => openDetalle(t)}
                      className={`border-t hover:bg-gray-50 cursor-pointer ${t.estado==='Realizada' ? 'opacity-60' : ''}`}>
                      <td className="px-3 py-2 text-gray-400 text-xs">{idx+1}</td>
                      <td className="px-3 py-2 max-w-44">{t.reunion}</td>
                      <td className="px-3 py-2 max-w-56">
                        <div className={t.estado==='Realizada' ? 'line-through text-gray-400' : ''}>{t.tarea}</div>
                      </td>
                      <td className="px-3 py-2 max-w-28">{t.responsable}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${PRIO_COLORS[t.prioridad]||''}`}>{t.prioridad}</span>
                      </td>
                      <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                        <select value={t.estado||''} onChange={e => handleEstadoChange(e, t.id, e.target.value)}
                          className={`text-xs font-semibold rounded-full px-2 py-0.5 border-0 cursor-pointer ${ESTADO_COLORS[t.estado]||''}`}>
                          {ESTADOS.map(e => <option key={e}>{e}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">{formatFecha(t.fecha_venc)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">{formatFecha(t.fecha_real)}</td>
                      <td className="px-3 py-2 max-w-48 text-xs text-gray-600">
                        {t.observaciones ? t.observaciones.slice(0, 60) + (t.observaciones.length > 60 ? '...' : '') : '—'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">{t.area}</td>
                      <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                        <button onClick={e => openAvances(e, t)}
                          className="bg-green-100 hover:bg-green-200 text-green-700 font-bold rounded-full px-2 py-1 flex items-center gap-1 text-xs"
                          title="Ver/agregar avances">
                          <span className="text-base leading-none">+</span>
                          {conteoAvances[t.id] > 0 && <span className="bg-green-600 text-white rounded-full px-1.5 py-0.5 text-xs">{conteoAvances[t.id]}</span>}
                        </button>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(t)} className="text-blue-500 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 text-xs">✏️</button>
                          <button onClick={() => handleDelete(t.id)} className="text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 text-xs">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="text-xs text-gray-400 mt-2 text-right">{filtered.length} de {tareas.length} tareas</div>
        </>)}

        {activeTab === 'resumen' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                ['Total', total, 'bg-blue-50','text-blue-700'],
                ['Pendientes', pendientes, 'bg-yellow-50','text-yellow-700'],
                ['En curso', enCurso, 'bg-blue-50','text-blue-600'],
                ['Realizadas', realizadas, 'bg-green-50','text-green-700'],
                ['Bloqueadas', bloqueadas, 'bg-red-50','text-red-700'],
                ['% Completadas', `${pct}%`, 'bg-indigo-50','text-indigo-700'],
              ].map(([label, val, bg, tc]) => (
                <div key={label} className={`${bg} rounded-xl p-4 text-center`}>
                  <div className={`text-3xl font-bold ${tc}`}>{val}</div>
                  <div className="text-xs text-gray-500 mt-1">{label}</div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="bg-blue-700 text-white px-4 py-3 font-semibold">Tareas por Reunión</div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>{['Reunión','Total','Pendiente','En curso','Realizada','Bloqueada'].map(h => <th key={h} className="px-4 py-2 text-left font-medium">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {Object.entries(porReunion).map(([reunion, d], i) => (
                    <tr key={reunion} className={`border-t ${i%2===0?'bg-white':'bg-gray-50'}`}>
                      <td className="px-4 py-2 font-medium">{reunion}</td>
                      <td className="px-4 py-2 font-bold">{d.total}</td>
                      <td className="px-4 py-2"><span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs">{d.pendiente}</span></td>
                      <td className="px-4 py-2"><span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">{d.enCurso}</span></td>
                      <td className="px-4 py-2"><span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs">{d.realizada}</span></td>
                      <td className="px-4 py-2"><span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-xs">{d.bloqueada}</span></td>
                    </tr>
                  ))}
                  {Object.keys(porReunion).length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">Sin datos</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="bg-blue-700 text-white px-4 py-3 font-semibold">Tareas por Responsable</div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>{['Responsable','Total','Pendiente','En curso','Realizada','Bloqueada'].map(h => <th key={h} className="px-4 py-2 text-left font-medium">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {Object.entries(porResponsable).map(([resp, d], i) => (
                    <tr key={resp} className={`border-t ${i%2===0?'bg-white':'bg-gray-50'}`}>
                      <td className="px-4 py-2 font-medium">{resp}</td>
                      <td className="px-4 py-2 font-bold">{d.total}</td>
                      <td className="px-4 py-2"><span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs">{d.pendiente}</span></td>
                      <td className="px-4 py-2"><span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">{d.enCurso}</span></td>
                      <td className="px-4 py-2"><span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs">{d.realizada}</span></td>
                      <td className="px-4 py-2"><span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-xs">{d.bloqueada}</span></td>
                    </tr>
                  ))}
                  {Object.keys(porResponsable).length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">Sin datos</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL DETALLE TAREA ── */}
      {showDetalle && tareaActual && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className={`text-white px-6 py-4 rounded-t-2xl flex justify-between items-start
              ${tareaActual.estado==='Realizada' ? 'bg-green-700' :
                tareaActual.estado==='Bloqueada' ? 'bg-red-700' :
                tareaActual.estado==='En curso' ? 'bg-blue-700' : 'bg-yellow-600'}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-white bg-opacity-20`}>
                    {tareaActual.estado}
                  </span>
                  <span className="text-xs opacity-75">{tareaActual.reunion}</span>
                </div>
                <h2 className="font-bold text-lg leading-tight">{tareaActual.tarea}</h2>
              </div>
              <button onClick={() => setShowDetalle(false)} className="text-white hover:opacity-75 text-xl ml-4">✕</button>
            </div>

            <div className="p-6">
              {/* Info principal */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {[
                  ['👤 Responsable', tareaActual.responsable],
                  ['🏢 Área', tareaActual.area],
                  ['⚡ Prioridad', tareaActual.prioridad],
                  ['📅 Fecha venc.', formatFecha(tareaActual.fecha_venc)],
                  ['✅ Fecha realiz.', formatFecha(tareaActual.fecha_real)],
                  ['📌 Extra', tareaActual.extra],
                ].filter(([,v]) => v).map(([label, val]) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                    <p className="text-sm font-medium text-gray-800">{val}</p>
                  </div>
                ))}
              </div>

              {/* Observaciones */}
              {tareaActual.observaciones && (
                <div className="bg-blue-50 rounded-xl p-4 mb-6">
                  <p className="text-xs font-semibold text-blue-700 mb-2">📝 Observaciones</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{tareaActual.observaciones}</p>
                </div>
              )}

              {/* Nuevo avance */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                <h3 className="font-semibold text-green-800 mb-3 text-sm">+ Agregar avance</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha</label>
                    <input type="date" value={nuevoAvance.fecha}
                      onChange={e => setNuevoAvance({...nuevoAvance, fecha: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Descripción</label>
                    <div className="flex gap-2">
                      <input type="text" value={nuevoAvance.descripcion}
                        onChange={e => setNuevoAvance({...nuevoAvance, descripcion: e.target.value})}
                        onKeyDown={e => e.key === 'Enter' && handleSaveAvance()}
                        placeholder="Describí el avance..."
                        className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
                      <button onClick={handleSaveAvance} disabled={savingAvance || !nuevoAvance.descripcion.trim()}
                        className="bg-green-700 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-green-800 disabled:opacity-50">
                        {savingAvance ? '...' : 'Agregar'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Historial avances */}
              <h3 className="font-semibold text-gray-700 mb-3 text-sm">📈 Historial de avances {avances.length > 0 && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">{avances.length}</span>}</h3>
              {loadingAvances ? (
                <div className="text-center py-6 text-gray-400">Cargando avances...</div>
              ) : avances.length === 0 ? (
                <div className="text-center py-6 text-gray-400 border rounded-xl text-sm">Sin avances registrados aún.</div>
              ) : (
                <div className="space-y-3">
                  {avances.map((a, i) => (
                    <div key={a.id} className="flex gap-3 items-start">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full mt-1 flex-shrink-0"></div>
                        {i < avances.length - 1 && <div className="w-0.5 bg-green-200 flex-1 mt-1" style={{minHeight:'24px'}}></div>}
                      </div>
                      <div className="flex-1 bg-gray-50 rounded-xl p-3 border">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">{formatFecha(a.fecha)}</span>
                          <button onClick={() => handleDeleteAvance(a.id)} className="text-gray-300 hover:text-red-500 text-xs ml-2">🗑️</button>
                        </div>
                        <p className="text-sm text-gray-700 mt-2">{a.descripcion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex justify-between items-center border-t pt-4">
              <button onClick={() => handleDelete(tareaActual.id)}
                className="text-red-500 hover:text-red-700 text-sm border border-red-200 rounded-lg px-4 py-2 hover:bg-red-50">
                🗑️ Eliminar tarea
              </button>
              <div className="flex gap-2">
                <button onClick={() => setShowDetalle(false)}
                  className="border rounded-lg px-4 py-2 text-sm hover:bg-gray-50">Cerrar</button>
                <button onClick={() => openEdit(tareaActual)}
                  className="bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-blue-800">
                  ✏️ Editar tarea
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal calendario */}
      {showCalendario && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl mt-4">
            <div className="bg-blue-700 text-white px-6 py-4 rounded-t-2xl flex justify-between items-center">
              <h2 className="font-bold text-lg">📅 Calendario de Reuniones</h2>
              <div className="flex gap-2 items-center">
                <button onClick={() => openNuevaReunion()} className="bg-white text-blue-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-50 text-sm">+ Nueva reunión</button>
                <button onClick={() => setShowCalendario(false)} className="text-white hover:text-blue-200 text-xl ml-2">✕</button>
              </div>
            </div>
            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => { if (mesActual === 0) { setMesActual(11); setAnioActual(a => a-1) } else setMesActual(m => m-1) }} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">◀</button>
                  <h3 className="font-bold text-lg text-gray-800">{MESES[mesActual]} {anioActual}</h3>
                  <button onClick={() => { if (mesActual === 11) { setMesActual(0); setAnioActual(a => a+1) } else setMesActual(m => m+1) }} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">▶</button>
                </div>
                <div className="grid grid-cols-7 mb-2">
                  {DIAS.map(d => <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({length: primerDia}).map((_, i) => <div key={`e${i}`} />)}
                  {Array.from({length: diasEnMes}).map((_, i) => {
                    const dia = i + 1
                    const reunionesDia = getReunionesDelDia(dia)
                    const esHoy = dia === hoy.getDate() && mesActual === hoy.getMonth() && anioActual === hoy.getFullYear()
                    return (
                      <div key={dia} onClick={() => { setDiaSeleccionado(dia); if (reunionesDia.length === 0) openNuevaReunion(dia) }}
                        className={`min-h-16 p-1 rounded-lg border cursor-pointer hover:bg-blue-50 transition ${esHoy ? 'border-blue-500 bg-blue-50' : 'border-gray-100'} ${diaSeleccionado === dia ? 'ring-2 ring-blue-400' : ''}`}>
                        <div className={`text-xs font-semibold mb-1 ${esHoy ? 'text-blue-700' : 'text-gray-700'}`}>{dia}</div>
                        {reunionesDia.map(r => (
                          <div key={r.id} onClick={e => { e.stopPropagation(); setReunionSeleccionada(r); setShowReunionDetalle(true) }}
                            className="bg-blue-600 text-white text-xs rounded px-1 py-0.5 mb-0.5 truncate hover:bg-blue-700">
                            {r.hora ? r.hora.slice(0,5)+' ' : ''}{r.tema}
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </div>
              <div>
                <h3 className="font-bold text-gray-700 mb-3">📌 Próximas reuniones</h3>
                {proximasReuniones.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 border rounded-xl text-sm">No hay reuniones próximas</div>
                ) : (
                  <div className="space-y-3">
                    {proximasReuniones.map(r => (
                      <div key={r.id} onClick={() => { setReunionSeleccionada(r); setShowReunionDetalle(true) }}
                        className="border rounded-xl p-3 hover:bg-blue-50 cursor-pointer transition">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">{formatFecha(r.fecha)}</span>
                          {r.hora && <span className="text-xs text-gray-500">🕐 {r.hora.slice(0,5)}</span>}
                        </div>
                        <p className="font-semibold text-sm text-gray-800">{r.tema}</p>
                        {r.lugar && <p className="text-xs text-gray-500 mt-0.5">📍 {r.lugar}</p>}
                      </div>
                    ))}
                  </div>
                )}
                <h3 className="font-bold text-gray-700 mb-3 mt-6">📋 Este mes</h3>
                {reuniones.filter(r => { const f = new Date(r.fecha+'T00:00:00'); return f.getMonth() === mesActual && f.getFullYear() === anioActual }).length === 0 ? (
                  <div className="text-center py-4 text-gray-400 border rounded-xl text-sm">Sin reuniones este mes</div>
                ) : (
                  <div className="space-y-2">
                    {reuniones.filter(r => { const f = new Date(r.fecha+'T00:00:00'); return f.getMonth() === mesActual && f.getFullYear() === anioActual }).map(r => (
                      <div key={r.id} onClick={() => { setReunionSeleccionada(r); setShowReunionDetalle(true) }}
                        className="border rounded-lg p-2 hover:bg-blue-50 cursor-pointer transition flex justify-between items-center">
                        <div>
                          <p className="text-xs font-semibold text-gray-800">{r.tema}</p>
                          <p className="text-xs text-gray-500">{formatFecha(r.fecha)}{r.hora ? ' · '+r.hora.slice(0,5) : ''}</p>
                        </div>
                        <span className="text-gray-400 text-xs">▶</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal detalle reunión */}
      {showReunionDetalle && reunionSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="bg-blue-700 text-white px-6 py-4 rounded-t-2xl flex justify-between items-center">
              <h2 className="font-bold text-lg">📅 Detalle de reunión</h2>
              <button onClick={() => setShowReunionDetalle(false)} className="text-white hover:text-blue-200 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-3">
              <div><p className="text-xs text-gray-500 font-semibold">TEMA</p><p className="text-lg font-bold text-gray-800">{reunionSeleccionada.tema}</p></div>
              <div className="flex gap-4">
                <div><p className="text-xs text-gray-500 font-semibold">FECHA</p><p className="text-sm text-gray-700">{formatFecha(reunionSeleccionada.fecha)}</p></div>
                {reunionSeleccionada.hora && <div><p className="text-xs text-gray-500 font-semibold">HORA</p><p className="text-sm text-gray-700">{reunionSeleccionada.hora.slice(0,5)}</p></div>}
              </div>
              {reunionSeleccionada.lugar && <div><p className="text-xs text-gray-500 font-semibold">LUGAR</p><p className="text-sm text-gray-700">📍 {reunionSeleccionada.lugar}</p></div>}
              {reunionSeleccionada.participantes && <div><p className="text-xs text-gray-500 font-semibold">PARTICIPANTES</p><p className="text-sm text-gray-700">👥 {reunionSeleccionada.participantes}</p></div>}
              {reunionSeleccionada.descripcion && <div><p className="text-xs text-gray-500 font-semibold">DESCRIPCIÓN</p><p className="text-sm text-gray-700">{reunionSeleccionada.descripcion}</p></div>}
            </div>
            <div className="px-6 pb-6 flex justify-between">
              <button onClick={() => handleDeleteReunion(reunionSeleccionada.id)} className="text-red-500 hover:text-red-700 text-sm border border-red-200 rounded-lg px-4 py-2 hover:bg-red-50">🗑️ Eliminar</button>
              <div className="flex gap-2">
                <button onClick={() => setShowReunionDetalle(false)} className="border rounded-lg px-4 py-2 text-sm hover:bg-gray-50">Cerrar</button>
                <button onClick={() => openEditReunion(reunionSeleccionada)} className="bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-blue-800">✏️ Editar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal nueva/editar reunión */}
      {showReunionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="bg-blue-700 text-white px-6 py-4 rounded-t-2xl flex justify-between items-center">
              <h2 className="font-bold text-lg">{editReunion ? '✏️ Editar reunión' : '+ Nueva reunión'}</h2>
              <button onClick={() => setShowReunionModal(false)} className="text-white hover:text-blue-200 text-xl">✕</button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Tema *</label>
                <input type="text" value={reunionForm.tema} onChange={e => setReunionForm({...reunionForm, tema: e.target.value})}
                  placeholder="Ej: Reunión semanal de gestión"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha *</label>
                <input type="date" value={reunionForm.fecha} onChange={e => setReunionForm({...reunionForm, fecha: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Hora</label>
                <input type="time" value={reunionForm.hora} onChange={e => setReunionForm({...reunionForm, hora: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Lugar</label>
                <input type="text" value={reunionForm.lugar} onChange={e => setReunionForm({...reunionForm, lugar: e.target.value})}
                  placeholder="Ej: Sala de reuniones"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Participantes</label>
                <input type="text" value={reunionForm.participantes} onChange={e => setReunionForm({...reunionForm, participantes: e.target.value})}
                  placeholder="Ej: Juan, María, Pedro"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Descripción</label>
                <textarea value={reunionForm.descripcion} onChange={e => setReunionForm({...reunionForm, descripcion: e.target.value})}
                  rows={3} placeholder="Agenda o notas previas..."
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
              </div>
            </div>
            <div className="px-6 pb-6 flex justify-end gap-3">
              <button onClick={() => setShowReunionModal(false)} className="border rounded-lg px-5 py-2 text-sm hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSaveReunion} disabled={savingReunion || !reunionForm.tema.trim()}
                className="bg-blue-700 text-white rounded-lg px-5 py-2 text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">
                {savingReunion ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nueva/editar tarea */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="bg-blue-700 text-white px-6 py-4 rounded-t-2xl flex justify-between items-center">
              <h2 className="font-bold text-lg">{editTarea ? '✏️ Editar tarea' : '+ Nueva tarea'}</h2>
              <button onClick={() => setShowModal(false)} className="text-white hover:text-blue-200 text-xl">✕</button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {[['reunion','Reunión','text'],['tarea','Tarea / Descripción','text'],['responsable','Responsable','text'],['area','Área / Dpto.','text'],['fecha_venc','Fecha Vencimiento','date'],['fecha_real','Fecha Realización','date']].map(([field, label, type]) => (
                <div key={field}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
                  <input type={type} value={form[field]||''} onChange={e => setForm({...form,[field]:e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Prioridad</label>
                <select value={form.prioridad} onChange={e => setForm({...form,prioridad:e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  {PRIORIDADES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Estado</label>
                <select value={form.estado} onChange={e => setForm({...form,estado:e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  {ESTADOS.map(e => <option key={e}>{e}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Observaciones</label>
                <textarea value={form.observaciones||''} onChange={e => setForm({...form,observaciones:e.target.value})}
                  rows={3} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Extra</label>
                <input type="text" value={form.extra||''} onChange={e => setForm({...form,extra:e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              {error && <div className="md:col-span-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">Error: {error}</div>}
            </div>
            <div className="px-6 pb-6 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="border rounded-lg px-5 py-2 text-sm hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                className="bg-blue-700 text-white rounded-lg px-5 py-2 text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal avances (desde botón +) */}
      {showAvancesModal && tareaActual && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="bg-green-700 text-white px-6 py-4 rounded-t-2xl flex justify-between items-center">
              <div>
                <h2 className="font-bold text-lg">📈 Avances</h2>
                <p className="text-green-200 text-sm truncate max-w-sm">{tareaActual.tarea}</p>
              </div>
              <button onClick={() => setShowAvancesModal(false)} className="text-white hover:text-green-200 text-xl">✕</button>
            </div>
            <div className="p-6">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                <h3 className="font-semibold text-green-800 mb-3 text-sm">+ Agregar nuevo avance</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha</label>
                    <input type="date" value={nuevoAvance.fecha} onChange={e => setNuevoAvance({...nuevoAvance, fecha: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Descripción</label>
                    <div className="flex gap-2">
                      <input type="text" value={nuevoAvance.descripcion}
                        onChange={e => setNuevoAvance({...nuevoAvance, descripcion: e.target.value})}
                        onKeyDown={e => e.key === 'Enter' && handleSaveAvance()}
                        placeholder="Describí el avance..."
                        className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
                      <button onClick={handleSaveAvance} disabled={savingAvance || !nuevoAvance.descripcion.trim()}
                        className="bg-green-700 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-green-800 disabled:opacity-50">
                        {savingAvance ? '...' : 'Agregar'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <h3 className="font-semibold text-gray-700 mb-3 text-sm">Historial de avances</h3>
              {loadingAvances ? (
                <div className="text-center py-8 text-gray-400">Cargando...</div>
              ) : avances.length === 0 ? (
                <div className="text-center py-8 text-gray-400 border rounded-xl">Sin avances registrados.</div>
              ) : (
                <div className="space-y-3">
                  {avances.map((a, i) => (
                    <div key={a.id} className="flex gap-3 items-start">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full mt-1 flex-shrink-0"></div>
                        {i < avances.length - 1 && <div className="w-0.5 bg-green-200 flex-1 mt-1" style={{minHeight:'24px'}}></div>}
                      </div>
                      <div className="flex-1 bg-gray-50 rounded-xl p-3 border">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">{formatFecha(a.fecha)}</span>
                          <button onClick={() => handleDeleteAvance(a.id)} className="text-gray-300 hover:text-red-500 text-xs ml-2">🗑️</button>
                        </div>
                        <p className="text-sm text-gray-700 mt-2">{a.descripcion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
