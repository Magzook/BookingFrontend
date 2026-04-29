import { useNavigate } from 'react-router-dom'
import { getImageUrl } from '../api/client'
import styles from './ResourceCard.module.css'

export default function ResourceCard({ resource, propertiesMap = {} }) {
  const { id, name, shortDescription, pricePerHour, firstImageId, propertiesIds = [] } = resource
  const navigate = useNavigate()

  return (
    <article className={styles.card} onClick={() => navigate(`/resources/${id}`)} role="button">
      <div className={styles.imageWrap}>
        {firstImageId
          ? <img src={getImageUrl(firstImageId)} alt={name} className={styles.image} />
          : <div className={styles.imagePlaceholder}>
              <span className={styles.placeholderIcon}>♨</span>
            </div>
        }
        <div className={styles.priceTag}>
          {pricePerHour.toLocaleString('ru-RU')} ₽/час
        </div>
      </div>

      <div className={styles.body}>
        <h3 className={styles.name}>{name}</h3>
        {shortDescription && (
          <p className={styles.desc}>{shortDescription}</p>
        )}
        {propertiesIds.length > 0 && (
          <div className={styles.tags}>
            {propertiesIds.map(id => (
              <span key={id} className={styles.tag}>
                {propertiesMap[id] ?? '…'}
              </span>
            ))}
          </div>
        )}
        <button className={styles.bookBtn} onClick={e => { e.stopPropagation(); navigate(`/resources/${id}`) }}>Забронировать</button>
      </div>
    </article>
  )
}