import { DEFAULT_CATEGORIES, POSTURE_GROUPS, POSTURE_TAGS } from "../../types";

export function LibraryScreen() {
  return (
    <div className="screen">
      <h2>🐾 Dog Behavior Library</h2>
      <p className="hint">
        General canine body-language knowledge, built in as a starting point — not learned from any
        dataset. Use it to spot signals while you label barks in Training Mode; your dog's own data is
        always what actually drives the translations.
      </p>

      <section className="card">
        <h3>Mood categories</h3>
        <div className="library-category-grid">
          {DEFAULT_CATEGORIES.map((cat) => (
            <div key={cat.id} className="library-category">
              <span className="library-category-emoji">{cat.emoji}</span>
              <span>{cat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {POSTURE_GROUPS.map((group) => (
        <section className="card" key={group}>
          <h3>{group}</h3>
          <ul className="library-list">
            {POSTURE_TAGS.filter((t) => t.group === group).map((tag) => (
              <li key={tag.id} className="library-item">
                <div className="library-item-head">
                  <span className="library-item-emoji">{tag.emoji}</span>
                  <strong>{tag.label}</strong>
                </div>
                <p className="hint">{tag.generalMeaning}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="hint">
        This is general reference info, not veterinary advice — always consult a vet or certified
        trainer for real behavioral or health concerns.
      </p>
    </div>
  );
}
