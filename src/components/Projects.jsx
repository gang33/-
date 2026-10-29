import SectionHead from './SectionHead.jsx'
import { projects } from '../data.js'

function FeaturedProject({ project }) {
  return (
    <article className={`project project--${project.layout}`} data-reveal>
      <div className="project__head">
        <span className="project__idx mono">{project.idx}</span>
        <span className="project__cat mono">{project.category}</span>
        <span className="project__year mono">{project.year}</span>
      </div>

      <div className="project__media">
        <img src={project.image} alt={`${project.title} 品牌视觉`} loading="lazy" />
        <span className="project__media-tag mono">{project.role}</span>
      </div>

      <div className="project__body">
        <h3 className="project__title">
          {project.title}
          <span className="mono">{project.titleEn}</span>
        </h3>
        <p className="project__desc">{project.desc}</p>
        <ul className="project__tags">
          {project.tags.map((tag) => (
            <li key={tag} className="mono">
              {tag}
            </li>
          ))}
        </ul>
      </div>

      <div className="project__metric">
        <span className="project__metric-num">
          {project.metric.value}
          <i>{project.metric.unit}</i>
        </span>
        <span className="project__metric-cap mono">{project.metric.cap}</span>
      </div>
    </article>
  )
}

function CompactProject({ project }) {
  return (
    <article className="pcard" data-reveal>
      <div className="pcard__head mono">
        <span className="pcard__idx">{project.idx}</span>
        <span>{project.year}</span>
      </div>

      <div className="pcard__media">
        <img src={project.image} alt={`${project.title} 品牌视觉`} loading="lazy" />
      </div>

      <div className="pcard__info">
        <h3 className="pcard__title">
          {project.title}
          <span className="mono">{project.titleEn}</span>
        </h3>
        <p className="pcard__cat mono">{project.category}</p>
        <p className="pcard__desc">{project.desc}</p>
        <ul className="pcard__tags">
          {project.tags.map((tag) => (
            <li key={tag} className="mono">
              {tag}
            </li>
          ))}
        </ul>
        <div className="pcard__metric">
          <span className="pcard__metric-num">
            {project.metric.value}
            <i>{project.metric.unit}</i>
          </span>
          <span className="pcard__metric-cap mono">{project.metric.cap}</span>
        </div>
      </div>
    </article>
  )
}

export default function Projects() {
  const featured = projects.filter((p) => p.layout !== 'compact')
  const compact = projects.filter((p) => p.layout === 'compact')

  return (
    <section className="projects" id="work">
      <div className="shell">
        <SectionHead
          index="02"
          en="SELECTED WORK"
          cn="精选项目"
          note="6 个品牌全案：从策略、视觉到门店落地，以及长期的年度运营设计。"
        />

        <div className="projects__list">
          {featured.map((project) => (
            <FeaturedProject key={project.id} project={project} />
          ))}
        </div>

        <div className="projects__more mono">
          <span>MORE WORK / 其他项目</span>
          <span>2025 — 2026</span>
        </div>

        <div className="projects__row">
          {compact.map((project) => (
            <CompactProject key={project.id} project={project} />
          ))}
        </div>
      </div>
    </section>
  )
}
