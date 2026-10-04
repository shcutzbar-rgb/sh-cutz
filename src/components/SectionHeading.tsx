type Props = {
  eyebrow: string;
  id?: string;
  as?: "h1" | "h2";
  children: React.ReactNode;
  className?: string;
};

export function SectionHeading({ eyebrow, id, as: Tag = "h2", children, className = "" }: Props) {
  return (
    <div className={className}>
      <p className="eyebrow">{eyebrow}</p>
      <Tag id={id} className="display mt-4 text-4xl sm:text-5xl">
        {children}
      </Tag>
    </div>
  );
}
