const fs = require('fs');
let css = fs.readFileSync('index.css', 'utf8');

css = css.replace(/grid-template-columns: 350px 1fr;/, 'grid-template-columns: 460px 1fr;');

const newCardCss = `
.result-item-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  color: var(--text-primary);
  padding: 1rem;
  border-radius: var(--radius);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: 0.2s ease;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  margin-bottom: 0.75rem;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}

.result-item-card:hover {
  background: var(--bg-subtle);
  border-color: var(--text-secondary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.result-item-card.active {
  background: var(--accent-fade);
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}

.result-item-card .card-img-wrapper {
  width: 80px;
  height: 80px;
  flex-shrink: 0;
  border-radius: 6px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid var(--border);
}

.result-item-card .card-img-wrapper img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.result-item-card .card-img-wrapper .placeholder-icon {
  font-size: 2rem;
  color: #ccc;
}

.result-item-card .result-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.result-item-card .result-info strong {
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.3;
}

.result-item-card .result-meta {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.result-item-card .finish-artnr {
  font-family: monospace;
  background: var(--bg-base);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  color: var(--text-secondary);
  align-self: flex-start;
  margin-top: 0.5rem;
}
`;

css += '\n' + newCardCss;
fs.writeFileSync('index.css', css);
