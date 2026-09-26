/* Page numbers shown around the current page, with ellipses for gaps. */
function pageList(page, pages) {
  const wanted = new Set([1, pages, page - 1, page, page + 1]);
  const list = [...wanted].filter((value) => value >= 1 && value <= pages).sort((a, b) => a - b);
  return list.flatMap((value, index) => (index && value - list[index - 1] > 1 ? ['…', value] : [value]));
}

export default function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button>
      {pageList(page, pages).map((value, index) =>
        value === '…' ? (
          <span key={`gap-${index}`}>…</span>
        ) : (
          <button
            key={value}
            className={value === page ? 'active' : ''}
            aria-current={value === page ? 'page' : undefined}
            onClick={() => onChange(value)}
          >
            {value}
          </button>
        )
      )}
      <button disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</button>
    </nav>
  );
}
