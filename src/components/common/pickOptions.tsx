// Drop-down options for a Settings-managed pick list; a stored value no longer in the list stays selectable
export function pickOptions(values: string[], current: string | null | undefined) {
  const all = current && !values.includes(current) ? [current, ...values] : values;
  return (
    <>
      <option value="">—</option>
      {all.map((v) => <option key={v} value={v}>{v}</option>)}
    </>
  );
}
