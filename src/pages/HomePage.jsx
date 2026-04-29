import styles from './HomePage.module.css'

export default function HomePage() {
  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <p className={styles.heroEyebrow}>Добро пожаловать</p>
          <h1 className={styles.heroTitle}>Место, где<br />тело отдыхает,<br />душа оживает</h1>
          <p className={styles.heroSub}>
            Традиционная русская баня, финская сауна и хаммам —<br />
            выберите своё пространство тепла и покоя
          </p>
          <button className={styles.heroBtn}>Посмотреть помещения</button>
        </div>
        <div className={styles.steamParticles}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className={styles.steam} style={{ '--i': i }} />
          ))}
        </div>
      </section>

      <section className={styles.features}>
        <div className={styles.featuresInner}>
          {[
            { icon: '🔥', title: 'Жар и пар', text: 'Парные протоплены до нужной температуры и готовы к вашему приходу' },
            { icon: '🌿', title: 'Банные ритуалы', text: 'Веники, ароматные масла и профессиональные банщики' },
            { icon: '❄️', title: 'Контрастные процедуры', text: 'Бассейн с ледяной водой и зоны отдыха после парной' },
            { icon: '🍵', title: 'Чайная комната', text: 'Травяные сборы, мёд и варенье в уютном чайном зале' },
          ].map(f => (
            <div key={f.title} className={styles.featureCard}>
              <span className={styles.featureIcon}>{f.icon}</span>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureText}>{f.text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}