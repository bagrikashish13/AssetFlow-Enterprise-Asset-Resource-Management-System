/**
 * Definition of a category-specific custom field (stored as JSONB on
 * asset_categories.fields). Mirrors the frozen client contract:
 * docs/DESIGN-PROMPT.md §9 CategoryField.
 */
export interface CategoryField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date';
  required: boolean;
}
