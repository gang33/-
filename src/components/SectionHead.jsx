export default function SectionHead({ index, en, cn, note, variant, bare }) {
  return (
    <header className={`sec-head${variant ? ` sec-head--${variant}` : ''}`} data-reveal>
      {bare ? null : (
        <div className="sec-head__meta mono">
          <span className="sec-head__index">{index}</span>
          <span className="sec-head__en">{en}</span>
        </div>
      )}
      <div className="sec-head__main">
        {/* 和「个人优势」同一套：大英文在上、中文反白块在下，
            块的字号、内边距、行高都跟英文同一档，所以两者是一个整体 */}
        <p className="sec-head__big">{en}</p>
        {/* 中文反白块：外面套一层遮罩，入场跟「个人优势」完全同款 ——
            块从上方一个块高处落下、被遮罩裁掉超出的部分，形成「印章落下」。
            遮罩高度由块自己撑起，落到位时整块完整露出，不会切字。
            非 bare 的标题（AI 工作流）不套遮罩，保持原来的位移 + 淡入。 */}
        {bare ? (
          // 移动模式的拖拽点放在遮罩上（而不是里面那块）：一块拖动时遮罩跟着走，
          // 裁切窗口和字始终是同一个整体，不会把字拖出遮罩裁掉。
          <div className="sec-head__mask" data-reveal data-reveal-loop data-move>
            <div className="sec-head__block" data-editor-original={cn}>
              <span>{cn}</span>
            </div>
          </div>
        ) : (
          <div className="sec-head__block" data-move data-editor-original={cn}>
            <span>{cn}</span>
          </div>
        )}
        {bare || !note ? null : <p className="sec-head__note">{note}</p>}
      </div>
    </header>
  )
}
