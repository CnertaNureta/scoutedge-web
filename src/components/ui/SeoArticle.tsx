interface SeoArticleProps {
  html: string
}

export default function SeoArticle({ html }: SeoArticleProps) {
  return (
    <section className="page-container mb-16">
      <article
        className="prose prose-invert prose-lg max-w-none bg-surface-container-low p-8 md:p-12 rounded-2xl border border-white/[0.06]"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  )
}
