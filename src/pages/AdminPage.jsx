import { useState, useEffect } from 'react'
import { getWorkingDays, addWorkingDay, deleteWorkingDay, getProperties, getResources, getResource, createResource, updateResource, deleteResource, uploadImage, deleteImageApi, getImageUrl } from '../api/client'
import styles from './AdminPage.module.css'

// ── Mini calendar ──────────────────────────────────────────────────────────

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь',
                'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
const DAYS   = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

function toISO(year, month, day) {
  return `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
}

function Calendar({ workingDays, onAdd, onRemove }) {
  const today = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const workingSet = new Set(workingDays)

  // First day of month (0=Sun … 6=Sat → convert to Mon-based)
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  function prev() { month === 0 ? (setMonth(11), setYear(y => y - 1)) : setMonth(m => m - 1) }
  function next() { month === 11 ? (setMonth(0),  setYear(y => y + 1)) : setMonth(m => m + 1) }

  function toggle(day) {
    const iso = toISO(year, month, day)
    workingSet.has(iso) ? onRemove(iso) : onAdd(iso)
  }

  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className={styles.cal}>
      <div className={styles.calHeader}>
        <button className={styles.calNav} onClick={prev}>‹</button>
        <span className={styles.calMonth}>{MONTHS[month]} {year}</span>
        <button className={styles.calNav} onClick={next}>›</button>
      </div>

      <div className={styles.calGrid}>
        {DAYS.map(d => <div key={d} className={styles.calDow}>{d}</div>)}
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />
          const iso     = toISO(year, month, day)
          const isWork  = workingSet.has(iso)
          const isPast  = new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate())
          return (
            <button
              key={day}
              className={`${styles.calDay} ${isWork ? styles.calDayWork : ''} ${isPast ? styles.calDayPast : ''}`}
              onClick={() => toggle(day)}
              title={isWork ? 'Удалить из рабочих' : 'Добавить рабочий день'}
            >
              {day}
            </button>
          )
        })}
      </div>

      <div className={styles.calLegend}>
        <span className={styles.legendWork} /> Рабочий день
        <span style={{marginLeft:16, color:'var(--ash)', fontSize:13}}>Клик — переключить</span>
      </div>
    </div>
  )
}

// ── Working days list ──────────────────────────────────────────────────────

function WorkingDaysList({ workingDays, onRemove }) {
  const sorted = [...workingDays].sort()
  if (!sorted.length) return <p className={styles.empty}>Рабочие дни не добавлены</p>

  return (
    <div className={styles.daysList}>
      {sorted.map(d => {
        const [y, m, day] = d.split('-')
        const label = new Date(y, m - 1, day).toLocaleDateString('ru-RU', { weekday:'short', day:'numeric', month:'long', year:'numeric' })
        return (
          <div key={d} className={styles.dayRow}>
            <span className={styles.dayLabel}>{label}</span>
            <button className={styles.removeBtn} onClick={() => onRemove(d)} title="Удалить">✕</button>
          </div>
        )
      })}
    </div>
  )
}

// ── Section wrapper ────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </div>
  )
}

// ── Resources section ──────────────────────────────────────────────────────

function ResourcesSection({ flash }) {
  const [resources, setResources]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  
  // Form state
  const [name, setName]             = useState('')
  const [shortDescription, setShortDescription] = useState('')
  const [fullDescription, setFullDescription]   = useState('')
  const [pricePerHour, setPricePerHour]         = useState('')
  const [propertiesIds, setPropertiesIds]       = useState([])
  const [allProperties, setAllProperties]       = useState([])
  const [imagesIds, setImagesIds]               = useState([])
  const [uploading, setUploading]               = useState(false)
  
  // Edit state
  const [editId, setEditId]         = useState(null)
  const [editName, setEditName]     = useState('')
  const [editShortDesc, setEditShortDesc] = useState('')
  const [editFullDesc, setEditFullDesc]   = useState('')
  const [editPrice, setEditPrice]         = useState('')
  const [editImagesIds, setEditImagesIds] = useState([])
  const [editPropertiesIds, setEditPropertiesIds] = useState([])

  async function load() {
    getResources().then(setResources).finally(() => setLoading(false))
    getProperties().then(setAllProperties)
  }
  useEffect(() => { load() }, [])

  async function handleImageUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const data = await uploadImage(file)
      setImagesIds(prev => [...prev, data.id])
      flash('Изображение загружено')
    } catch (err) {
      flash(err.msg ?? 'Ошибка загрузки изображения', false)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  function removeImage(index) {
    setImagesIds(prev => prev.filter((_, i) => i !== index))
  }

  function moveImage(index, direction) {
    const newImages = [...imagesIds]
    const temp = newImages[index]
    newImages[index] = newImages[index + direction]
    newImages[index + direction] = temp
    setImagesIds(newImages)
  }

  async function handleCreate(e) {
    e.preventDefault()
    try {
      const data = await createResource({
        name,
        shortDescription,
        fullDescription,
        pricePerHour: parseInt(pricePerHour, 10),
        imagesIds,
        propertiesIds
      })
      setResources(prev => [...prev, { id: data.id, name, shortDescription, fullDescription, pricePerHour: parseInt(pricePerHour, 10), imagesIds }])
      resetForm()
      flash('Помещение создано')
    } catch (err) {
      const ERRORS = {
        '-1': 'Неверный формат названия',
        '-2': 'Неверный формат краткого описания',
        '-3': 'Неверный формат полного описания',
        '-4': 'Неверный формат цены',
        '-5': 'Изображение не найдено',
        '-6': 'Свойство не найдено',
        '-7': 'Помещение с таким названием уже существует'
      }
      flash(ERRORS[String(err.status)] ?? err.msg ?? 'Ошибка', false)
    }
  }

  function resetForm() {
    setName('')
    setShortDescription('')
    setFullDescription('')
    setPricePerHour('')
    setPropertiesIds([])
    setImagesIds([])
    setShowForm(false)
  }

  function toggleProperty(id) {
    setPropertiesIds(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  async function handleEdit(id) {
    try {
      const res = await getResource(id)
      if (!res) return
      setEditId(id)
      setEditName(res.name)
      setEditShortDesc(res.shortDescription || '')
      setEditFullDesc(res.fullDescription || '')
      setEditPrice(String(res.pricePerHour || ''))
      setEditImagesIds(res.imagesIds || [])
      setEditPropertiesIds(res.propertiesIds || [])
    } catch (err) {
      flash('Ошибка загрузки данных помещения', false)
    }
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    try {
      await updateResource(editId, {
        newname: editName,
        shortDescription: editShortDesc,
        fullDescription: editFullDesc,
        pricePerHour: editPrice ? parseInt(editPrice, 10) : undefined,
        imagesIds: editImagesIds,
        propertiesIds: editPropertiesIds
      })
      setResources(prev => prev.map(r => 
        r.id === editId 
          ? { ...r, name: editName, shortDescription: editShortDesc, fullDescription: editFullDesc, pricePerHour: editPrice ? parseInt(editPrice, 10) : r.pricePerHour, imagesIds: editImagesIds, propertiesIds: editPropertiesIds }
          : r
      ))
      setEditId(null)
      flash('Помещение обновлено')
    } catch (err) {
      const ERRORS = {
        '-1': 'Неверный формат названия',
        '-2': 'Неверный формат краткого описания',
        '-3': 'Неверный формат полного описания',
        '-4': 'Неверный формат цены',
        '-7': 'Помещение с таким названием уже существует'
      }
      flash(ERRORS[String(err.status)] ?? err.msg ?? 'Ошибка', false)
    }
  }

  function removeEditImage(index) {
    const imgId = editImagesIds[index]
    deleteImageApi(imgId).then(() => {
      setEditImagesIds(prev => prev.filter((_, i) => i !== index))
      flash('Изображение удалено')
    }).catch(() => {
      flash('Ошибка удаления изображения', false)
    })
  }

  function moveEditImage(index, direction) {
    const newImages = [...editImagesIds]
    const temp = newImages[index]
    newImages[index] = newImages[index + direction]
    newImages[index + direction] = temp
    setEditImagesIds(newImages)
  }

  async function handleEditImageUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const data = await uploadImage(file)
      setEditImagesIds(prev => [...prev, data.id])
      flash('Изображение загружено')
    } catch (err) {
      flash(err.msg ?? 'Ошибка загрузки изображения', false)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleDelete(id, resName) {
    if (!confirm(`Удалить помещение «${resName}»?`)) return
    try {
      await deleteResource(id)
      setResources(prev => prev.filter(r => r.id !== id))
      flash('Помещение удалено')
    } catch (err) {
      const ERRORS = {
        '-1': 'На это помещение есть брони — сначала отмените их'
      }
      flash(ERRORS[String(err.status)] ?? err.msg ?? 'Ошибка', false)
    }
  }

  function cancelEdit() {
    setEditId(null)
  }

  if (loading) return <div className={styles.spinWrap}><span className={styles.spinner} /></div>

  return (
    <div>
      {/* Header with Add button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 className={styles.listTitle}>Список помещений</h3>
        {!showForm && (
          <button className={styles.addBtn} onClick={() => setShowForm(true)}>
            + Добавить помещение
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleCreate} className={styles.resourceForm}>
          <input
            className={styles.formInput}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Название помещения"
            required
          />
          <input
            className={styles.formInput}
            value={shortDescription}
            onChange={e => setShortDescription(e.target.value)}
            placeholder="Краткое описание"
            required
          />
          <textarea
            className={styles.formTextarea}
            value={fullDescription}
            onChange={e => setFullDescription(e.target.value)}
            placeholder="Полное описание"
            rows={3}
            required
          />
          <input
            type="number"
            className={styles.formInput}
            value={pricePerHour}
            onChange={e => setPricePerHour(e.target.value)}
            placeholder="Цена в час"
            min="0"
            required
          />
          
          <div className={styles.propSelectWrap}>
            <span className={styles.propSelectLabel}>Свойства:</span>
            <div className={styles.propCheckList}>
              {allProperties.map(p => (
                <label key={p.id} className={styles.propCheck}>
                  <input
                    type="checkbox"
                    checked={propertiesIds.includes(p.id)}
                    onChange={() => toggleProperty(p.id)}
                  />
                  <span>{p.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Images section */}
          <div className={styles.imagesSection}>
            <span className={styles.propSelectLabel}>Изображения:</span>
            <div className={styles.imagesList}>
              {imagesIds.map((imgId, idx) => (
                <div key={imgId} className={styles.imageItem}>
                  <img src={getImageUrl(imgId)} alt="" className={styles.imagePreview} />
                  <div className={styles.imageControls}>
                    <button
                      type="button"
                      className={styles.moveBtn}
                      onClick={() => moveImage(idx, -1)}
                      disabled={idx === 0}
                      title="Вверх"
                    >↑</button>
                    <button
                      type="button"
                      className={styles.moveBtn}
                      onClick={() => moveImage(idx, 1)}
                      disabled={idx === imagesIds.length - 1}
                      title="Вниз"
                    >↓</button>
                    <button
                      type="button"
                      className={styles.removeImgBtn}
                      onClick={() => removeImage(idx)}
                      title="Удалить"
                    >✕</button>
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.uploadWrap}>
              <label className={styles.uploadBtn}>
                {uploading ? 'Загрузка...' : '+ Добавить изображение'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="submit" className={styles.saveBtn}>Создать</button>
            <button type="button" className={styles.cancelBtn} onClick={resetForm}>Отмена</button>
          </div>
        </form>
      )}

      {/* Resources list */}
      {resources.length === 0
        ? <p className={styles.empty}>Помещения не добавлены</p>
        : <div className={styles.resourceList}>
            {resources.map(r => (
              <div key={r.id} className={styles.resourceRow}>
                {editId === r.id
                  ? <form onSubmit={handleSaveEdit} className={styles.editResourceForm}>
                      <input
                        className={styles.editInput}
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        placeholder="Название"
                        required
                      />
                      <input
                        className={styles.editInput}
                        value={editShortDesc}
                        onChange={e => setEditShortDesc(e.target.value)}
                        placeholder="Краткое описание"
                      />
                      <textarea
                        className={styles.editTextarea}
                        value={editFullDesc}
                        onChange={e => setEditFullDesc(e.target.value)}
                        placeholder="Полное описание"
                        rows={2}
                      />
                      <input
                        type="number"
                        className={styles.editInput}
                        value={editPrice}
                        onChange={e => setEditPrice(e.target.value)}
                        placeholder="Цена"
                        min="0"
                      />
                      
                      {/* Properties selection in edit mode */}
                      <div className={styles.propSelectWrap}>
                        <span className={styles.propSelectLabel}>Свойства:</span>
                        <div className={styles.propCheckList}>
                          {allProperties.map(p => (
                            <label key={p.id} className={styles.propCheck}>
                              <input
                                type="checkbox"
                                checked={editPropertiesIds.includes(p.id)}
                                onChange={() => setEditPropertiesIds(prev => 
                                  prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                                )}
                              />
                              <span>{p.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Edit images section */}
                      <div className={styles.imagesSection}>
                        <span className={styles.propSelectLabel}>Изображения:</span>
                        <div className={styles.imagesList}>
                          {editImagesIds.map((imgId, idx) => (
                            <div key={imgId} className={styles.imageItem}>
                              <img src={getImageUrl(imgId)} alt="" className={styles.imagePreview} />
                              <div className={styles.imageControls}>
                                <button
                                  type="button"
                                  className={styles.moveBtn}
                                  onClick={() => moveEditImage(idx, -1)}
                                  disabled={idx === 0}
                                  title="Вверх"
                                >↑</button>
                                <button
                                  type="button"
                                  className={styles.moveBtn}
                                  onClick={() => moveEditImage(idx, 1)}
                                  disabled={idx === editImagesIds.length - 1}
                                  title="Вниз"
                                >↓</button>
                                <button
                                  type="button"
                                  className={styles.removeImgBtn}
                                  onClick={() => removeEditImage(idx)}
                                  title="Удалить"
                                >✕</button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className={styles.uploadWrap}>
                          <label className={styles.uploadBtn}>
                            {uploading ? 'Загрузка...' : '+ Добавить изображение'}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleEditImageUpload}
                              disabled={uploading}
                              style={{ display: 'none' }}
                            />
                          </label>
                        </div>
                      </div>

                      <button type="submit" className={styles.saveBtnSmall}>✓</button>
                      <button type="button" className={styles.cancelEditBtn} onClick={cancelEdit}>✕</button>
                    </form>
                  : <>
                      <div className={styles.resourceInfo}>
                        <span className={styles.resourceName}>{r.name}</span>
                        {r.shortDescription && <span className={styles.resourceShortDesc}>{r.shortDescription}</span>}
                        <span className={styles.resourcePrice}>{r.pricePerHour} ₽/час</span>
                      </div>
                      <div className={styles.propActions}>
                        <button className={styles.editBtn} onClick={() => handleEdit(r.id)}>
                          Редактировать
                        </button>
                        <button className={styles.deleteBtn} onClick={() => handleDelete(r.id, r.name)}>
                          Удалить
                        </button>
                      </div>
                    </>
                }
              </div>
            ))}
          </div>
      }
    </div>
  )
}

function PropertiesSection({ flash }) {
  const [properties, setProperties]   = useState([])
  const [loading, setLoading]         = useState(true)
  const [newName, setNewName]         = useState('')
  const [adding, setAdding]           = useState(false)
  const [editId, setEditId]           = useState(null)
  const [editName, setEditName]       = useState('')
  const [saving, setSaving]           = useState(false)

  async function load() {
    getProperties().then(setProperties).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  async function handleAdd(e) {
    e.preventDefault()
    setAdding(true)
    try {
      const res = await fetch('/api/properties', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      })
      const data = await res.json()
      if (!res.ok) {
        const ERRORS = { '-1': 'Неверный формат названия', '-2': 'Свойство с таким названием уже существует' }
        flash(ERRORS[String(data.status)] ?? data.msg ?? 'Ошибка', false); return
      }
      setProperties(prev => [...prev, { id: data.id, name: newName }])
      setNewName('')
      flash('Свойство добавлено')
    } finally { setAdding(false) }
  }

  async function handleRename(id) {
    setSaving(true)
    try {
      const res = await fetch(`/api/properties/${id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName: editName })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const ERRORS = { '-1': 'Неверный формат названия', '-2': 'Свойство с таким названием уже существует' }
        flash(ERRORS[String(data.status)] ?? data.msg ?? 'Ошибка', false); return
      }
      setProperties(prev => prev.map(p => p.id === id ? { ...p, name: editName } : p))
      setEditId(null)
      flash('Свойство переименовано')
    } finally { setSaving(false) }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Удалить свойство «${name}»?`)) return
    try {
      const res = await fetch(`/api/properties/${id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) { flash('Ошибка при удалении', false); return }
      setProperties(prev => prev.filter(p => p.id !== id))
      flash('Свойство удалено')
    } catch { flash('Ошибка при удалении', false) }
  }

  if (loading) return <div className={styles.spinWrap}><span className={styles.spinner} /></div>

  return (
    <div>
      {/* Add form */}
      <form onSubmit={handleAdd} className={styles.addForm}>
        <input
          className={styles.addInput}
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Название нового свойства"
          required
        />
        <button className={styles.addBtn} disabled={adding}>
          {adding ? '…' : '+ Добавить'}
        </button>
      </form>

      {/* List */}
      {properties.length === 0
        ? <p className={styles.empty}>Свойства не добавлены</p>
        : <div className={styles.propList}>
            {properties.map(p => (
              <div key={p.id} className={styles.propRow}>
                {editId === p.id
                  ? <form onSubmit={e => { e.preventDefault(); handleRename(p.id) }} className={styles.editForm}>
                      <input
                        className={styles.editInput}
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        autoFocus
                        required
                      />
                      <button className={styles.saveBtn} disabled={saving}>✓</button>
                      <button type="button" className={styles.cancelEditBtn} onClick={() => setEditId(null)}>✕</button>
                    </form>
                  : <>
                      <span className={styles.propName}>{p.name}</span>
                      <div className={styles.propActions}>
                        <button className={styles.editBtn} onClick={() => { setEditId(p.id); setEditName(p.name) }}>
                          Переименовать
                        </button>
                        <button className={styles.deleteBtn} onClick={() => handleDelete(p.id, p.name)}>
                          Удалить
                        </button>
                      </div>
                    </>
                }
              </div>
            ))}
          </div>
      }
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [workingDays, setWorkingDays] = useState([])
  const [loading, setLoading]         = useState(true)
  const [msg, setMsg]                 = useState(null)
  const [msgOk, setMsgOk]             = useState(false)

  function load() {
    getWorkingDays()
      .then(setWorkingDays)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function flash(text, ok = true) {
    setMsg(text); setMsgOk(ok)
    setTimeout(() => setMsg(null), 3000)
  }

  async function handleAdd(iso) {
    try {
      await addWorkingDay(iso)
      setWorkingDays(prev => [...prev, iso])
      flash('День добавлен')
    } catch (err) {
      flash(err.status === undefined ? 'Этот день уже добавлен' : (err.msg ?? 'Ошибка'), false)
    }
  }

  async function handleRemove(iso) {
    try {
      await deleteWorkingDay(iso)
      setWorkingDays(prev => prev.filter(d => d !== iso))
      flash('День удалён')
    } catch (err) {
      const ERRORS = { '-1': 'На этот день есть брони — сначала отмените их' }
      flash(ERRORS[String(err.status)] ?? err.msg ?? 'Ошибка', false)
    }
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>Панель администратора</h1>

        {msg && <div className={`${styles.toast} ${msgOk ? styles.toastOk : styles.toastErr}`}>{msg}</div>}

        <Section title="Помещения">
          <ResourcesSection flash={flash} />
        </Section>

        <Section title="Рабочие дни">
          {loading
            ? <div className={styles.spinWrap}><span className={styles.spinner} /></div>
            : <>
                <Calendar workingDays={workingDays} onAdd={handleAdd} onRemove={handleRemove} />
                <h3 className={styles.listTitle}>Список рабочих дней</h3>
                <WorkingDaysList workingDays={workingDays} onRemove={handleRemove} />
              </>
          }
        </Section>

        <Section title="Свойства помещений">
          <PropertiesSection flash={flash} />
        </Section>
      </div>
    </main>
  )
}