import SectionHead from './SectionHead.jsx'
import { aiWorkflow } from '../data.js'

export default function AiWorkflow() {
  return (
    <section className="ai" id="aigc">
      <div className="shell">
        <SectionHead index="04" en="AIGC WORKFLOW" cn="AI 工作流" note={aiWorkflow.intro} />

        <div className="ai__grid">
          {aiWorkflow.steps.map((step) => (
            <article className="ai__step" key={step.num} data-reveal>
              <span className="ai__num mono">{step.num}</span>
              <h3 className="ai__title">{step.title}</h3>
              <p className="ai__desc">{step.desc}</p>
            </article>
          ))}
        </div>

        <blockquote className="ai__quote" data-reveal>
          <p>{aiWorkflow.quote}</p>
          <cite className="mono">林增宇 — AIGC 辅助设计实践</cite>
        </blockquote>
      </div>
    </section>
  )
}
