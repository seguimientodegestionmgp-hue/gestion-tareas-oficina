'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://qhkzmiceieeiwxxcxwua.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoa3ptaWNlaWVlaXd4eGN4d3VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NjU1MjUsImV4cCI6MjA5NjA0MTUyNX0.Z3rLYpHJ8R8EZYRpuFGQVd3kxKR_5u4CWf-3LeYcb0E'
)

const PRIORIDADES = ['Alta', 'Media', 'Baja']
const ESTADOS = ['Pendiente', 'En curso', 'Realizada', 'Bloqueada']

const ESTADO_COLORS = {
  'Pendiente':  'bg-yellow-100 text-yellow-800',
  'En curso':   'bg-blue-100 text-blue-800',
  'Realizada':  'bg-green-100 text-green-800',
  'Bloqueada':  'bg-red-100 text-red-800',
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

export default function Home() {
  const [tareas, setTareas] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchCol, setSearchCol] = useState('todas')
  const [filterEstado, setFilterEstado] = useState('')
  const [filterPrio, setFilterPrio] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editTarea, setEditTarea] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('tareas')
  const [expandedObs, setExpandedObs] = useState(null)
  const [error, setError] = useState(null)

  const fetchTareas = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('tareas')
      .select('*')
      .order('id', { ascending: true })
    if (error) {
      console.error('Error fetching:', error)
      setError(error.message)
    } else {
      setTareas(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchTareas() }, [fetchTareas])

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
    const matchEstado = !filterEstado || t.estado === filterEstado
    const matchPrio = !filterPrio || t.prioridad === filterPrio
    return matchSearch && matchEstado && matchPrio
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

  const openNew = () => { setForm(emptyForm); setEditTarea(null); setError(null); setShowModal(true) }
  const openEdit = (t) => { setForm({...t, fecha_venc: t.fecha_venc||'', fecha_real: t.fecha_real||''}); setEditTarea(t.id); setError(null); setShowModal(true) }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const data = { ...form }
      if (!data.fecha_venc) delete data.fecha_venc
      if (!data.fecha_real) delete data.fecha_real
      if (data.estado === 'Realizada' && !data.fecha_real) {
        data.fecha_real = new Date().toISOString().split('T')[0]
      }
      delete data.id
      delete data.created_at
      delete data.updated_at

      let result
      if (editTarea) {
        result = await supabase.from('tareas').update(data).eq('id', editTarea)
      } else {
        result = await supabase.from('tareas').insert([data])
      }

      if (result.error) {
        console.error('Save error:', result.error)
        setError(result.error.message)
      } else {
        setShowModal(false)
        fetchTareas()
      }
    } catch (e) {
      console.error('Exception:', e)
      setError(e.message)
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta tarea?')) return
    await supabase.from('tareas').delete().eq('id', id)
    fetchTareas()
  }

  const handleEstadoChange = async (id, estado) => {
    const upd = { estado }
    if (estado === 'Realizada') upd.fecha_real = new Date().toISOString().split('T')[0]
    else upd.fecha_real = null
    await supabase.from('tareas').update(upd).eq('id', id)
    fetchTareas()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-700 text-white px-6 py-4 shadow sticky top-0 z-40">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">📋 Gestión de Tareas y Reuniones</h1>
            <p className="text-blue-200 text-sm">Sistema de seguimiento de oficina</p>
          </div>
          <button onClick={openNew}
            className="bg-white text-blue-700 font-semibold px-4 py-2 rounded-lg hover:bg-blue-50 transition text-sm">
            + Nueva tarea
          </button>
        </div>
      </div>

      <div className="bg-white border-b sticky top-16 z-30">
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
              <select value={searchCol} onChange={e => setSearchCol(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm bg-yellow-50">
                <option value="todas">Todas las columnas</option>
                <option value="reunion">Reunión</option>
                <option value="tarea">Tarea</option>
                <option value="responsable">Responsable</option>
                <option value="area">Área</option>
              </select>
              <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm">
                <option value="">Todos los estados</option>
                {ESTADOS.map(e => <option key={e}>{e}</option>)}
              </select>
              <select value={filterPrio} onChange={e => setFilterPrio(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm">
                <option value="">Todas las prioridades</option>
                {PRIORIDADES.map(p => <option key={p}>{p}</option>)}
              </select>
              {(search || filterEstado || filterPrio) && (
                <button onClick={() => { setSearch(''); setFilterEstado(''); setFilterPrio('') }}
                  className="text-sm text-gray-500 hover:text-red-500 border rounded-lg px-3 py-2">
                  ✕ Limpiar
                </button>
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
                    {['#','Reunión','Tarea','Responsable','Prioridad','Estado','F.Venc','F.Real','Observaciones','Área',''].map((h,i) => (
                      <th key={i} className="px-3 py-3 text-left font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t, idx) => (
                    <tr key={t.id} onClick={() => openEdit(t)} className={`border-t hover:bg-gray-50 cursor-pointer ${t.estado==='Realizada' ? 'opacity-60' : ''}`}>
                      <td className="px-3 py-2 text-gray-400 text-xs">{idx+1}</td>
                      <td className="px-3 py-2 whitespace-nowrap max-w-32 truncate">{t.reunion}</td>
                      <td className="px-3 py-2 max-w-56">
                        <div className={t.estado==='Realizada' ? 'line-through text-gray-400' : ''}>{t.tarea}</div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{t.responsable}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${PRIO_COLORS[t.prioridad]||''}`}>{t.prioridad}</span>
                      </td>
                      <td className="px-3 py-2">
                        <select value={t.estado||''} onChange={e => handleEstadoChange(t.id, e.target.value)}
                          className={`text-xs font-semibold rounded-full px-2 py-0.5 border-0 cursor-pointer ${ESTADO_COLORS[t.estado]||''}`}>
                          {ESTADOS.map(e => <option key={e}>{e}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">{t.fecha_venc ? new Date(t.fecha_venc+'T00:00:00').toLocaleDateString('es-AR') : '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">{t.fecha_real ? new Date(t.fecha_real+'T00:00:00').toLocaleDateString('es-AR') : '—'}</td>
                      <td className="px-3 py-2 max-w-48">
                        {t.observaciones ? (
                          <div>
                            <span className={expandedObs===t.id ? '' : 'line-clamp-2'}>{t.observaciones}</span>
                            {t.observaciones.length > 0 && (
                              <button onClick={() => setExpandedObs(expandedObs===t.id ? null : t.id)}
                                className="text-blue-500 text-xs mt-0.5 hover:underline">
                                {expandedObs===t.id ? 'Ver menos' : 'Ver más'}
                              </button>
                            )}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">{t.area}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
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

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="bg-blue-700 text-white px-6 py-4 rounded-t-2xl flex justify-between items-center">
              <h2 className="font-bold text-lg">{editTarea ? '✏️ Editar tarea' : '+ Nueva tarea'}</h2>
              <button onClick={() => setShowModal(false)} className="text-white hover:text-blue-200 text-xl">✕</button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                ['reunion','Reunión','text'],
                ['tarea','Tarea / Descripción','text'],
                ['responsable','Responsable','text'],
                ['area','Área / Dpto.','text'],
                ['fecha_venc','Fecha Vencimiento','date'],
                ['fecha_real','Fecha Realización','date'],
              ].map(([field, label, type]) => (
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
              {error && (
                <div className="md:col-span-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                  Error: {error}
                </div>
              )}
            </div>
            <div className="px-6 pb-6 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)}
                className="border rounded-lg px-5 py-2 text-sm hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                className="bg-blue-700 text-white rounded-lg px-5 py-2 text-sm font-semibold hover:bg-blue-800 disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
