import { POSTURE_GROUPS, POSTURE_TAGS, type PostureTag } from "../types";

interface PostureTagPickerProps {
  value: PostureTag[];
  onChange: (tags: PostureTag[]) => void;
}

export function PostureTagPicker({ value, onChange }: PostureTagPickerProps) {
  function toggle(tag: PostureTag) {
    if (value.includes(tag)) {
      onChange(value.filter((t) => t !== tag));
    } else {
      onChange([...value, tag]);
    }
  }

  return (
    <div className="posture-picker-groups">
      {POSTURE_GROUPS.map((group) => {
        const tagsInGroup = POSTURE_TAGS.filter((t) => t.group === group);
        return (
          <div key={group} className="posture-group">
            <span className="posture-group-label">{group}</span>
            <div className="posture-picker">
              {tagsInGroup.map((tag) => (
                <label
                  key={tag.id}
                  className={`posture-tag ${value.includes(tag.id) ? "is-checked" : ""}`}
                  title={tag.generalMeaning}
                >
                  <input
                    type="checkbox"
                    checked={value.includes(tag.id)}
                    onChange={() => toggle(tag.id)}
                  />
                  <span className="posture-emoji">{tag.emoji}</span> {tag.label}
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
