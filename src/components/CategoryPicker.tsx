import { DEFAULT_CATEGORIES, type MoodCategory } from "../types";

interface CategoryPickerProps {
  value: MoodCategory | null;
  onChange: (category: MoodCategory) => void;
  suggested?: MoodCategory | null;
}

export function CategoryPicker({ value, onChange, suggested }: CategoryPickerProps) {
  return (
    <div className="category-picker">
      {DEFAULT_CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          type="button"
          className={`category-chip ${value === cat.id ? "is-selected" : ""} ${
            suggested === cat.id && value !== cat.id ? "is-suggested" : ""
          }`}
          onClick={() => onChange(cat.id)}
        >
          <span className="category-emoji">{cat.emoji}</span> {cat.label}
          {suggested === cat.id && value !== cat.id && <span className="suggested-spark">✨</span>}
        </button>
      ))}
    </div>
  );
}
