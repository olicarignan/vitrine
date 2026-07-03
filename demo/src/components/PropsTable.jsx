/**
 * Small prop-reference table for the docs pages.
 * Rows: { prop, def, desc }.
 */
export function PropsTable({ rows }) {
  return (
    <div className="props-table">
      <table>
        <thead>
          <tr>
            <th>Prop</th>
            <th>Default</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.prop}>
              <td>
                <code>{row.prop}</code>
              </td>
              <td>{row.def != null ? <code>{row.def}</code> : "—"}</td>
              <td>{row.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
