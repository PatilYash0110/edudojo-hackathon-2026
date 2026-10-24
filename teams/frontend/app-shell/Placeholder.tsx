/** FRONTEND TEAM. Temporary panel for skeleton pages; delete when unused. */
export function Placeholder({ title, todo }: { title: string; todo: string[] }) {
  return (
    <section className="rounded-lg border border-dashed p-4">
      <p className="text-xs uppercase text-muted-foreground">Frontend Team · placeholder</p>
      <h2 className="text-lg font-semibold">{title}</h2>
      <ul className="list-disc pl-5 text-sm text-muted-foreground">
        {todo.map((item) => (
          <li key={item}>TODO: {item}</li>
        ))}
      </ul>
    </section>
  );
}
