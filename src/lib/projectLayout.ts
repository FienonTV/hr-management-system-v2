export type ProjectLayoutTab = {
  id: string;
  title: string;
  sortOrder: number;
  cards: ProjectLayoutCard[];
};

export type ProjectLayoutCard = {
  id: string;
  title: string;
  columns: 1 | 2 | 3;
  sortOrder: number;
  fields: ProjectLayoutField[];
};

export type ProjectLayoutField = {
  id: string;
  definitionId: string; // CustomFieldDefinition.key
  columnIndex: number;
  sortOrder: number;
};

export const DEFAULT_PROJECT_LAYOUT: ProjectLayoutTab[] = [
  {
    id: "default",
    title: "Allgemein",
    sortOrder: 0,
    cards: [
      {
        id: "core",
        title: "Projekt",
        columns: 1,
        sortOrder: 0,
        fields: [
          { id: "f-code", definitionId: "code", columnIndex: 0, sortOrder: 0 },
          { id: "f-name", definitionId: "name", columnIndex: 0, sortOrder: 1 },
          { id: "f-description", definitionId: "description", columnIndex: 0, sortOrder: 2 },
        ],
      },
    ],
  },
];

export function layoutContainsField(layout: ProjectLayoutTab[], definitionId: string): boolean {
  return layout.some((tab) =>
    tab.cards.some((card) => card.fields.some((field) => field.definitionId === definitionId))
  );
}
