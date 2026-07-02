import { DEFAULT_CATEGORIES, type MoodCategory } from "../types";

interface SingleSelectProps {
  value: MoodCategory | null;
  onChange: (category: MoodCategory) => void;
  multiSelect?: false;
  suggested?: MoodCategory | null;
}

interface MultiSelectProps {
  value: MoodCategory[];
  onChange: (categories: MoodCategory[]) => void;
  multiSelect: true;
  suggested?: MoodCategory | null;
}

type CategoryPickerProps = SingleSelectProps | MultiSelectProps;

export function CategoryPicker(props: CategoryPickerProps) {
  const { suggested } = props;

  function isSelected(id: MoodCategory): boolean {
    if (props.multiSelect) return props.value.includes(id);
    return props.value === id;
  }

  function toggle(id: MoodCategory) {
    if (props.multiSelect) {
      const current = props.value;
      props.onChange(
        current.includes(id) ? current.filter((c) => c !== id) : [...current, id],
      );
    } else {
      props.onChange(id);
    }
  }

  return (
    <div className={`category-picker ${props.multiSelect ? "is-multi" : ""}`}>
      {DEFAULT_CATEGORIES.map((cat) => {
        const selected = isSelected(cat.id);
        const isSuggested = suggested === cat.id && !selected;
        return (
          <button
            key={cat.id}
            type="button"
            className={`category-chip ${selected ? "is-selected" : ""} ${isSuggested ? "is-suggested" : ""}`}
            onClick={() => toggle(cat.id)}
          >
            <span className="category-emoji">{cat.emoji}</span> {cat.label}
            {isSuggested && <span className="suggested-spark">✨</span>}
            {props.multiSelect && selected && <span className="multi-check">✓</span>}
          </button>
        );
      })}
    </div>
  );
}
