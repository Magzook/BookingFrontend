import { useState, useEffect } from 'react'
import { getResources, getProperties } from '../api/client'
import ResourceCard from '../components/ResourceCard'
import styles from './CatalogPage.module.css'

export default function CatalogPage() {
  const [resources, setResources]     = useState([])
  const [propertiesMap, setPropertiesMap] = useState({})
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)

  useEffect(() => {
    Promise.all([getResources(), getProperties()])
      .then(([res, props]) => {
        setResources(res)
        setPropertiesMap(Object.fromEntries(props.map(p => [p.id, p.name])))
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1 className={styles.title}>Наши помещения</h1>
        <p className={styles.subtitle}>Выберите подходящее пространство для отдыха</p>
      </div>

      <div className={styles.content}>
        {loading && (
          <div className={styles.state}>
            <span className={styles.spinner} />
            <p>Загружаем помещения…</p>
          </div>
        )}

        {error && (
          <div className={styles.state}>
            <span className={styles.stateIcon}>✕</span>
            <p>Не удалось загрузить помещения</p>
            <p className={styles.stateDetail}>{error}</p>
          </div>
        )}

        {!loading && !error && resources.length === 0 && (
          <div className={styles.state}>
            <span className={styles.stateIcon}>♨</span>
            <p>Помещения пока не добавлены</p>
          </div>
        )}

        {!loading && !error && resources.length > 0 && (
          <div className={styles.grid}>
            {resources.map(r => (
              <ResourceCard key={r.id} resource={r} propertiesMap={propertiesMap} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}