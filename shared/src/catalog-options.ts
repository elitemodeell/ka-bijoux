export function readOptionAttributes(name?: string, value?: string) {
  const names = (name ?? "").trim().split(/\s+\+\s+/);
  const values = (value ?? "").trim().split(/\s+\/\s+/);
  if (names.length < 2 || names.length !== values.length || values.some((part) => !part.trim())) return null;
  if (names.some((part) => !part.trim()) || new Set(names.map((part) => part.toLowerCase())).size !== names.length) return null;
  return { names, values };
}

export function catalogOptionMatrix<T>(
  options: readonly T[],
  identity: (option: T) => { name?: string; value?: string },
) {
  const rows = options.map((option) => {
    const { name, value } = identity(option);
    return { option, attributes: readOptionAttributes(name, value) };
  });
  const names = rows[0]?.attributes?.names;
  if (!names || rows.some(({ attributes }) => !attributes || attributes.names.length !== names.length ||
    attributes.names.some((name, index) => name.toLowerCase() !== names[index].toLowerCase()))) return null;
  const knownValues = names.map(() => new Map<string, string>());
  const matrix = rows.flatMap(({ option, attributes }) => attributes ? [{
    option,
    values: attributes.values.map((value, axis) => {
      const key = value.toLowerCase();
      const canonical = knownValues[axis].get(key) ?? value;
      knownValues[axis].set(key, canonical);
      return canonical;
    }),
  }] : []);
  const keys = new Set(matrix.map(({ values }) => JSON.stringify(values.map((value) => value.toLowerCase()))));
  if (keys.size !== matrix.length) return null;
  return { names, rows: matrix };
}

export function chooseCatalogAttribute<T>(
  matrix: NonNullable<ReturnType<typeof catalogOptionMatrix<T>>>,
  current: readonly (string | null)[],
  index: number,
  value: string,
  available: (option: T) => boolean = () => true,
) {
  const matching = matrix.rows.filter((row) => row.values[index] === value);
  const sellable = matching.filter(({ option }) => available(option));
  const preferred = sellable.length ? sellable : matching;
  const next: (string | null)[] = matrix.names.map(() => null);
  next[index] = value;
  for (let axis = 0; axis < matrix.names.length; axis++) {
    if (axis === index || !current[axis]) continue;
    if (preferred.some((row) => row.values[axis] === current[axis] &&
      next.every((chosen, other) => !chosen || row.values[other] === chosen))) next[axis] = current[axis];
  }
  return next;
}

export function resolveCatalogCombination<T>(
  matrix: NonNullable<ReturnType<typeof catalogOptionMatrix<T>>>,
  values: readonly (string | null)[],
) {
  if (values.length !== matrix.names.length || values.some((value) => !value)) return null;
  return matrix.rows.find((row) => row.values.every((value, index) => value === values[index]))?.option ?? null;
}

export function catalogSelectionPhoto<T>(
  matrix: NonNullable<ReturnType<typeof catalogOptionMatrix<T>>>,
  values: readonly (string | null)[],
  photo: (option: T) => string | null | undefined,
) {
  if (!values.some(Boolean)) return null;
  const matching = matrix.rows.filter((row) => values.every((value, axis) => !value || row.values[axis] === value));
  const first = matching.length ? photo(matching[0].option) : null;
  return first && matching.every(({ option }) => photo(option) === first) ? first : null;
}

export function catalogAttributeChoices<T>(
  matrix: NonNullable<ReturnType<typeof catalogOptionMatrix<T>>>,
  axis: number,
  available: (option: T) => boolean,
  photo: (option: T) => string | null | undefined,
) {
  return [...new Set(matrix.rows.map(({ values }) => values[axis]))].map((value) => {
    const matching = matrix.rows.filter(({ values }) => values[axis] === value);
    const photos = new Set(matching.map(({ option }) => photo(option) || null));
    return { value, available: matching.some(({ option }) => available(option)), photo: photos.size === 1 ? [...photos][0] : null };
  });
}

export function catalogOptionLabel(name: string, value: string) {
  const attributes = readOptionAttributes(name, value);
  return attributes ? attributes.names.map((axis, index) => `${axis}: ${attributes.values[index]}`).join(" · ") : `${name}: ${value}`;
}
