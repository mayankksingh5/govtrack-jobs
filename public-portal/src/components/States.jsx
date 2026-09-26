import Icon from './Icon.jsx';

export function PageSkeleton() {
  return (
    <div className="container skeleton-stack" aria-busy="true" aria-label="Loading">
      {[140, 190, 190, 190].map((height, index) => <div key={index} style={{ height }} />)}
    </div>
  );
}

export function ErrorState({ message, retry }) {
  return (
    <div className="empty-state error-state" role="alert">
      <span><Icon name="clock" /></span>
      <h3>Something went wrong</h3>
      <p>{message}</p>
      {retry && <button className="button primary" onClick={retry}>Try again</button>}
    </div>
  );
}

export function EmptyState({
  title = 'No updates match this filter',
  description = 'Try another status or check back soon for verified updates.',
}) {
  return (
    <div className="empty-state">
      <span><Icon name="search" /></span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

export function DataUnavailable({ label = 'Data unavailable' }) {
  return <span className="form-message">{label}</span>;
}
