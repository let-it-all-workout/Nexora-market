import { useMemo, useState } from 'react';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'red', label: 'Hard to sell' },
  { id: 'amber', label: 'Slow to sell' },
  { id: 'ok', label: 'Easy to sell' },
];

export function LiquidityBoard({ rows, onPick, emptyText, listKey = 0 }) {
  const [filterState, setFilterState] = useState({ key: listKey, value: 'all' });
  const filter = filterState.key === listKey ? filterState.value : 'all';
  const setFilter = (value) => setFilterState({ key: listKey, value });
  const counts = useMemo(() => ({
    all: rows?.length || 0,
    red: rows?.filter((row) => row.tone === 'red').length || 0,
    amber: rows?.filter((row) => row.tone === 'amber').length || 0,
    ok: rows?.filter((row) => row.tone === 'ok').length || 0,
  }), [rows]);
  const shown = useMemo(() => {
    if (!rows?.length) return [];
    if (filter === 'all') {
      return [...rows].sort((a, b) => {
        const tradedA = Number.isFinite(a.valueTraded) ? a.valueTraded : (Number(a.volume) || 0);
        const tradedB = Number.isFinite(b.valueTraded) ? b.valueTraded : (Number(b.volume) || 0);
        return tradedB - tradedA;
      });
    }
    return rows.filter((row) => row.tone === filter);
  }, [rows, filter]);

  if (!rows?.length) {
    return <p className="subtle">{emptyText || 'No trading numbers yet. They show up once the list has loaded.'}</p>;
  }

  return (
    <div className="liquidityBoard">
      <div className="liquidityLegend">
        <p><span className="tag liquidityTag liquidityTag--red">Hard to sell</span> the reason is no demand, very low demand, a low free float, a wide spread, or a halt.</p>
        <p><span className="tag liquidityTag liquidityTag--amber">Slow to sell</span> the reason is low demand, or a free float or spread that is tight but not shut.</p>
        <p><span className="tag liquidityTag liquidityTag--ok">Easy to sell</span> the reason is that demand covers a normal sale.</p>
      </div>
      <div className="timeframeBar liquidityFilters">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={filter === item.id ? `tfBtn liquidityFilter liquidityFilter--${item.id} active` : `tfBtn liquidityFilter liquidityFilter--${item.id}`}
            onClick={() => setFilter(item.id)}
          >
            {item.label} ({counts[item.id]})
          </button>
        ))}
      </div>
      {!shown.length ? (
        <p className="subtle">Nothing in this group.</p>
      ) : (
        <div className="ngxTable liquidityTable">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Selling</th>
                <th>Traded</th>
                <th>In plain words</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => (
                <tr
                  key={row.id || row.symbol}
                  className={`ngxRow liquidityRow liquidityRow--${row.tone}${onPick ? ' isPickable' : ''}`}
                  tabIndex={onPick ? 0 : undefined}
                  onClick={() => onPick?.(row)}
                  onKeyDown={(event) => {
                    if (!onPick) return;
                    if (event.key === 'Enter' || event.key === ' ') onPick(row);
                  }}
                >
                  <td>
                    <strong className="monoNum">{row.symbol}</strong>
                    <span className="liquidityName">{row.name}</span>
                  </td>
                  <td>
                    <span className={`tag liquidityTag liquidityTag--${row.tone}`}>{row.label}</span>
                    {row.reason ? <span className="liquidityReason">{row.reason}</span> : null}
                    {row.marketClosed ? <span className="liquidityLimit">Market closed</span> : null}
                  </td>
                  <td className="monoNum">{row.tradedLabel || '—'}</td>
                  <td>{row.tableLine || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
