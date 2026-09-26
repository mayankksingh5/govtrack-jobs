import { Fragment } from 'react';
import { Link } from 'react-router-dom';

export default function Breadcrumbs({ items = [] }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <Link to="/">Home</Link>
      {items.map((item) => (
        <Fragment key={item.label}>
          <span aria-hidden="true">/</span>
          {item.to ? <Link to={item.to}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
        </Fragment>
      ))}
    </nav>
  );
}
